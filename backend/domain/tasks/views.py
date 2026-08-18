from datetime import timedelta
import re
import unicodedata

from rest_framework import generics, permissions, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import Case, Count, DecimalField, Exists, IntegerField, OuterRef, Q, Sum, Value, When
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import FileResponse, HttpResponse
import openpyxl
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from common.permissions.permissions import IsCompanyMember, IsTaskCreatorOrAssigneeOrManager, IsOwnerOrCompanyManager, IsCompanyOperational, IsManagerOrAdministrator
from common.utils import get_requested_company
from domain.users.models import Role, User
from .models import (
    ApprovalAction,
    ApprovalRequest,
    ApprovalStatus,
    Task,
    TaskTemplate,
    Status,
    TaskComment,
    TaskAttachment,
    TaskReport,
    Project,
)
from .serializers import (
    TaskSerializer,
    TaskListSerializer,
    TaskCreateSerializer,
    TaskUpdateSerializer,
    TaskHistorySerializer,
    TaskCommentSerializer,
    TaskCommentCreateSerializer,
    TaskCommentUpdateSerializer,
    TaskAttachmentSerializer,
    TaskAttachmentCreateSerializer,
    TaskReportSerializer,
    TaskReportCreateSerializer,
    TaskReportReviewSerializer,
    TaskTemplateSerializer,
    TaskTemplateInstantiateSerializer,
    TaskBulkActionSerializer,
    ProjectSerializer,
    ApprovalRequestSerializer,
    ApprovalRequestCreateSerializer,
    ApprovalRequestReviewSerializer,
)


def accessible_tasks_for(user, company, include_inactive=False):
    """Return only tasks the user is allowed to access within the specified company."""
    if not company:
        return Task.objects.none()
    
    queryset = Task.objects.filter(company=company)
    if not include_inactive:
        queryset = queryset.filter(is_active=True)
    if user.is_manager() or user.is_superuser:
        return queryset
    # Employees see tasks they created, tasks assigned to them directly,
    # or tasks assigned to a team they are a member of.
    return queryset.filter(
        Q(creator=user) | Q(assigned_to=user) | Q(team__members=user)
    ).distinct()


def get_accessible_task(request, task_id, include_inactive=False):
    company = get_requested_company(request)
    return get_object_or_404(
        accessible_tasks_for(request.user, company, include_inactive),
        id=task_id,
    )


def link_task_participants_to_project(task):
    """Keep project participants in sync when a task is assigned in context."""
    if not task.project_id:
        return
    if task.assigned_to_id:
        task.project.members.add(task.assigned_to)
    if task.team_id:
        task.project.teams.add(task.team)


def notify_company_reviewers(task, *, title, message, dedupe_prefix):
    """Notify active managers and owners who may review a request."""
    from domain.notifications.models import NotificationType
    from domain.notifications.services import create_smart_notification

    reviewers = User.objects.filter(
        company=task.company,
        is_active=True,
        role__in=[Role.MANAGER, Role.OWNER],
    )
    for reviewer in reviewers:
        create_smart_notification(
            recipient=reviewer,
            notification_type=NotificationType.APPROVAL_REQUESTED,
            title=title,
            message=message,
            task=task,
            dedupe_key=f'{dedupe_prefix}:{reviewer.id}',
        )


def apply_task_filters(request, queryset):
    status_filter = request.query_params.get('status')
    priority_filter = request.query_params.get('priority')
    search = request.query_params.get('search')
    scope = request.query_params.get('scope')
    project_filter = request.query_params.get('project')
    team_filter = request.query_params.get('team')
    assigned_filter = request.query_params.get('assigned_to')

    if scope == 'mine':
        queryset = queryset.filter(creator=request.user)
    elif scope == 'assigned':
        queryset = queryset.filter(assigned_to=request.user)
    elif scope == 'team':
        queryset = queryset.filter(team__isnull=False)
    if project_filter:
        queryset = queryset.filter(project_id=project_filter)
    if team_filter:
        queryset = queryset.filter(team_id=team_filter)
    if assigned_filter:
        queryset = queryset.filter(assigned_to_id=assigned_filter)
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    if priority_filter:
        queryset = queryset.filter(priority=priority_filter)
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search) | Q(description__icontains=search)
        )
    today = timezone.localdate()
    queryset = queryset.annotate(
        attention_rank=Case(
            When(status=Status.COMPLETED, then=Value(6)),
            When(due_date__lt=today, then=Value(0)),
            When(due_date=today, then=Value(1)),
            When(status=Status.IN_PROGRESS, then=Value(2)),
            When(due_date__isnull=False, then=Value(3)),
            When(status=Status.DEFERRED, then=Value(5)),
            default=Value(4),
            output_field=IntegerField(),
        ),
        is_completed_rank=Case(
            When(status=Status.COMPLETED, then=Value(1)),
            default=Value(0),
            output_field=IntegerField(),
        ),
        priority_rank=Case(
            When(priority='urgent', then=Value(0)),
            When(priority='high', then=Value(1)),
            When(priority='normal', then=Value(2)),
            default=Value(3),
            output_field=IntegerField(),
        ),
    )
    queryset = queryset.annotate(
        pending_approval_flag=Exists(
            ApprovalRequest.objects.filter(
                task_id=OuterRef('pk'),
                status=ApprovalStatus.PENDING,
            )
        )
    )
    return queryset.select_related(
        'creator', 'assigned_to', 'team', 'project'
    ).order_by('is_completed_rank', 'priority_rank', 'attention_rank', 'due_date', '-created_at')


class TaskListCreateView(generics.ListCreateAPIView):
    """List and create tasks."""
    
    permission_classes = [IsAuthenticated, IsCompanyOperational]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'priority', 'assigned_to', 'team', 'parent', 'project']
    search_fields = ['title', 'description']
    
    def get_queryset(self):
        company = get_requested_company(self.request)
        queryset = accessible_tasks_for(self.request.user, company)
        return apply_task_filters(self.request, queryset)
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TaskCreateSerializer
        return TaskListSerializer
    
    @transaction.atomic
    def perform_create(self, serializer):
        # NOTE: la création réelle est implémentée dans la méthode `post` ci-dessous
        # car elle nécessite une logique d'assignation conditionelle qui dépend du rôle.
        # Cette méthode est conservée pour la compatibilité DRF mais ne devrait pas être appelée directement.
        company = get_requested_company(self.request)
        if not company:
            raise PermissionDenied("Vous devez sélectionner une entreprise ou appartenir à une entreprise pour créer une tâche.")
        serializer.save(
            company=company,
            creator=self.request.user,
        )
    
    @extend_schema(
        description="List tasks (filtered by user role)",
        responses=TaskListSerializer(many=True)
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        description="Create a new task",
        request=TaskCreateSerializer,
        responses=TaskSerializer
    )
    def post(self, request, *args, **kwargs):
        serializer = TaskCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        company = get_requested_company(request)
        if not company:
            return Response(
                {"detail": "Vous devez sélectionner une entreprise ou appartenir à une entreprise pour créer une tâche."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Only managers and above can assign tasks to other users.
        # Employees who are team leaders of the parent task can assign subtasks to team members.
        # Other employees are always auto-assigned to themselves.
        parent = serializer.validated_data.get('parent')
        is_team_leader_for_parent = bool(parent and parent.team and parent.team.leader == request.user)

        personal_workspace = company.is_personal
        if personal_workspace:
            assigned_to = request.user
        elif request.user.is_superuser:
            team = serializer.validated_data.get('team')
            assigned_to = (
                serializer.validated_data.get('assigned_to')
                or (team.leader if team else None)
            )
        elif request.user.is_manager() or is_team_leader_for_parent:
            team = serializer.validated_data.get('team')
            assigned_to = (
                serializer.validated_data.get('assigned_to')
                or (team.leader if team else None)
                or request.user
            )

            # Validate assignee is in the same company.
            if assigned_to and getattr(assigned_to, 'company', None) != company:
                return Response(
                    {"detail": "Vous ne pouvez pas attribuer une tâche à un utilisateur d'une autre entreprise."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # If team leader but not manager, assignee must be a team member (or self).
            if not request.user.is_manager() and is_team_leader_for_parent:
                if assigned_to and assigned_to != request.user and not parent.team.members.filter(id=assigned_to.id).exists():
                    return Response(
                        {"detail": "Vous ne pouvez assigner une sous-tâche qu'aux membres de l'équipe."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Validate team is in the same company.
            team = serializer.validated_data.get('team')
            if team and getattr(team, 'company', None) != company:
                return Response(
                    {"detail": "Vous ne pouvez pas attribuer une tâche à une équipe d'une autre entreprise."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Employee: always assigned to themselves, ignore any submitted assigned_to.
            assigned_to = request.user

        task = serializer.save(
            company=company,
            creator=request.user,
            assigned_to=assigned_to,
            team=None if personal_workspace else serializer.validated_data.get('team'),
            requires_completion_approval=(
                False
                if personal_workspace
                else serializer.validated_data.get('requires_completion_approval', False)
            ),
        )
        link_task_participants_to_project(task)

        # Create history entry
        from .models import TaskHistory
        TaskHistory.objects.create(
            task=task,
            changed_by=request.user,
            field_name='created',
            new_value='Tâche créée'
        )

        return Response(
            TaskSerializer(task).data,
            status=status.HTTP_201_CREATED
        )


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update and delete a task."""
    
    permission_classes = [IsAuthenticated, IsCompanyOperational, IsTaskCreatorOrAssigneeOrManager]
    lookup_field = 'id'

    def get_queryset(self):
        company = get_requested_company(self.request)
        return accessible_tasks_for(
            self.request.user,
            company,
            include_inactive=True,
        )
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return TaskSerializer
        return TaskUpdateSerializer
    
    @transaction.atomic
    def perform_update(self, serializer):
        # Track changes in history
        task = self.get_object()
        user = self.request.user

        if task.company.is_personal:
            serializer.validated_data['assigned_to'] = user
            serializer.validated_data['team'] = None
            serializer.validated_data['requires_completion_approval'] = False

        # An assignee who is not the creator (and not a manager) may only update
        # the status field.  Structural changes (title, description, priority, etc.)
        # are reserved for the creator and managers.
        is_only_assignee = (
            not user.is_manager()
            and task.creator != user
            and (task.assigned_to == user or (task.team and (task.team.members.filter(pk=user.pk).exists() or task.team.leader == user)))
        )
        if is_only_assignee:
            ALLOWED_FIELDS = {'status'}
            incoming = set(serializer.validated_data.keys())
            disallowed = incoming - ALLOWED_FIELDS
            if disallowed:
                raise PermissionDenied(
                    "Vous pouvez uniquement modifier le statut des tâches qui vous sont attribuées. "
                    f"Champs non autorisés : {', '.join(sorted(disallowed))}"
                )
            # Fix #14: Prevent status change if the task is blocked
            if task.is_blocked and 'status' in serializer.validated_data and serializer.validated_data['status'] != task.status:
                raise PermissionDenied("Vous ne pouvez pas modifier le statut d'une tâche bloquée. Veuillez d'abord résoudre la dépendance bloquante.")

        old_values = {
            'title': task.title,
            'description': task.description,
            'assigned_to': task.assigned_to_id,
            'team': task.team_id,
            'priority': task.priority,
            'status': task.status,
            'start_date': task.start_date,
            'due_date': task.due_date,
        }
        
        serializer.save()
        
        # Create history entries for changed fields
        from .models import TaskHistory
        new_task = serializer.instance
        link_task_participants_to_project(new_task)
        
        for field, old_value in old_values.items():
            if field in {'assigned_to', 'team'}:
                new_value = getattr(new_task, f'{field}_id')
            else:
                new_value = getattr(new_task, field)
            if old_value != new_value:
                TaskHistory.objects.create(
                    task=new_task,
                    changed_by=self.request.user,
                    field_name=field,
                    old_value=str(old_value) if old_value else None,
                    new_value=str(new_value) if new_value else None
                )
        
        # Set completed_at when status changes to completed
        if old_values['status'] != Status.COMPLETED and new_task.status == Status.COMPLETED:
            from django.utils import timezone
            new_task.completed_at = timezone.now()
            new_task.save(update_fields=['completed_at', 'updated_at'])
            from .services import generate_next_occurrence
            generate_next_occurrence(new_task)
        elif old_values['status'] == Status.COMPLETED and new_task.status != Status.COMPLETED:
            new_task.completed_at = None
            new_task.save(update_fields=['completed_at', 'updated_at'])
    
    @extend_schema(
        description="Get task details",
        responses=TaskSerializer
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        description="Update task details",
        request=TaskUpdateSerializer,
        responses=TaskSerializer
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)
    
    @extend_schema(
        description="Partially update task details",
        request=TaskUpdateSerializer,
        responses=TaskSerializer
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)
    
    @extend_schema(
        description="Delete a task (soft delete by setting is_active=False)",
        responses={204: OpenApiResponse(description="Task archived")}
    )
    def delete(self, request, *args, **kwargs):
        task = self.get_object()
        task.is_active = False
        task.archived_at = timezone.now()
        task.save(update_fields=['is_active', 'archived_at', 'updated_at'])
        task.history.create(
            changed_by=request.user,
            field_name='archived',
            new_value='Tâche archivée',
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    description="Duplicate a task and its active subtasks",
    request=None,
    responses={201: TaskSerializer},
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCompanyOperational])
@transaction.atomic
def duplicate_task(request, task_id):
    source = get_accessible_task(request, task_id)
    if not (request.user.is_manager() or source.creator == request.user):
        raise PermissionDenied("Vous ne pouvez pas dupliquer cette tâche.")

    personal_workspace = source.company.is_personal
    clone = Task.objects.create(
        title=f"Copie de {source.title}",
        description=source.description,
        company=source.company,
        creator=request.user,
        assigned_to=request.user if personal_workspace else source.assigned_to,
        team=None if personal_workspace else source.team,
        priority=source.priority,
        status=Status.TODO,
        start_date=source.start_date,
        due_date=source.due_date,
        estimated_hours=source.estimated_hours,
    )
    clone.dependencies.set(source.dependencies.all())
    for subtask in source.subtasks.filter(is_active=True):
        Task.objects.create(
            title=subtask.title,
            description=subtask.description,
            company=source.company,
            creator=request.user,
            assigned_to=request.user if personal_workspace else subtask.assigned_to,
            team=None if personal_workspace else subtask.team,
            parent=clone,
            priority=subtask.priority,
            status=Status.TODO,
            start_date=subtask.start_date,
            due_date=subtask.due_date,
            estimated_hours=subtask.estimated_hours,
        )
    clone.history.create(
        changed_by=request.user,
        field_name='duplicated_from',
        new_value=str(source.id),
    )
    return Response(TaskSerializer(clone).data, status=status.HTTP_201_CREATED)


@extend_schema(
    description="Restore an archived task",
    request=None,
    responses={200: TaskSerializer},
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCompanyOperational])
def restore_task(request, task_id):
    task = get_accessible_task(request, task_id, include_inactive=True)
    if not (request.user.is_manager() or task.creator == request.user):
        raise PermissionDenied("Vous ne pouvez pas restaurer cette tâche.")
    task.is_active = True
    task.archived_at = None
    task.save(update_fields=['is_active', 'archived_at', 'updated_at'])
    task.history.create(
        changed_by=request.user,
        field_name='restored',
        new_value='Task restored',
    )
    return Response(TaskSerializer(task).data)


class TaskTemplateListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsCompanyOperational]
    serializer_class = TaskTemplateSerializer
    pagination_class = None

    def get_queryset(self):
        company = get_requested_company(self.request)
        return TaskTemplate.objects.filter(
            Q(company=company, is_active=True) & (Q(is_shared=True) | Q(creator=self.request.user))
        )

    def perform_create(self, serializer):
        company = get_requested_company(self.request)
        if not company:
            raise PermissionDenied("Le contexte d'une entreprise est obligatoire.")
        is_shared = serializer.validated_data.get('is_shared', True)
        if company.is_personal or self.request.user.role == 'employee':
            is_shared = False
        serializer.save(company=company, creator=self.request.user, is_shared=is_shared)


class TaskTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsCompanyOperational]
    serializer_class = TaskTemplateSerializer
    lookup_field = 'id'

    def get_queryset(self):
        company = get_requested_company(self.request)
        return TaskTemplate.objects.filter(
            Q(company=company) & (Q(is_shared=True) | Q(creator=self.request.user))
        )

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


@extend_schema(
    request=TaskTemplateInstantiateSerializer,
    responses={201: TaskSerializer},
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCompanyOperational])
def instantiate_template(request, template_id):
    company = get_requested_company(request)
    template = get_object_or_404(
        TaskTemplate,
        Q(id=template_id, company=company, is_active=True) & (Q(is_shared=True) | Q(creator=request.user)),
    )
    serializer = TaskTemplateInstantiateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    assigned_to = serializer.validated_data.get('assigned_to')
    team = serializer.validated_data.get('team')
    if company.is_personal or request.user.role == 'employee':
        assigned_to = request.user
        team = None
    elif assigned_to is None:
        assigned_to = request.user
    if assigned_to and assigned_to.company != company:
        raise ValidationError({'assigned_to': "L'utilisateur sélectionné n'appartient pas à cette entreprise."})
    if team and team.company != company:
        raise ValidationError({'team': "L'équipe sélectionnée n'appartient pas à cette entreprise."})

    start_date = serializer.validated_data.get('start_date') or timezone.localdate()
    due_date = (
        start_date + timedelta(days=template.default_duration_days)
        if template.default_duration_days is not None
        else None
    )
    task = Task.objects.create(
        title=template.title,
        description=template.description,
        company=company,
        creator=request.user,
        assigned_to=assigned_to,
        team=team,
        priority=template.priority,
        start_date=start_date,
        due_date=due_date,
        estimated_hours=template.estimated_hours,
    )
    task.history.create(
        changed_by=request.user,
        field_name='created_from_template',
        new_value=str(template.id),
    )
    return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)


@extend_schema(request=TaskTemplateSerializer, responses={201: TaskTemplateSerializer})
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCompanyOperational])
def save_task_as_template(request, task_id):
    task = get_accessible_task(request, task_id)
    name = request.data.get('name', '').strip()
    is_shared = request.data.get('is_shared', True)
    if task.company.is_personal or request.user.role == 'employee':
        is_shared = False
    if not name:
        raise ValidationError({'name': 'Le nom du modèle est obligatoire.'})
    duration = (
        (task.due_date - task.start_date).days
        if task.start_date and task.due_date else None
    )
    template_serializer = TaskTemplateSerializer(
        data={
            'name': name,
            'title': task.title,
            'description': task.description or '',
            'priority': task.priority,
            'default_duration_days': duration,
            'estimated_hours': task.estimated_hours,
            'is_shared': is_shared,
        },
        context={'request': request},
    )
    template_serializer.is_valid(raise_exception=True)
    template = template_serializer.save(
        company=task.company,
        creator=request.user,
        is_shared=is_shared,
    )
    return Response(
        TaskTemplateSerializer(template).data,
        status=status.HTTP_201_CREATED,
    )


@extend_schema(request=TaskBulkActionSerializer, responses=TaskSerializer(many=True))
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCompanyOperational])
@transaction.atomic
def bulk_task_action(request):
    serializer = TaskBulkActionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    company = get_requested_company(request)
    tasks = list(
        accessible_tasks_for(
            request.user,
            company,
            include_inactive=True,
        ).filter(id__in=serializer.validated_data['task_ids'])
    )
    if len(tasks) != len(set(serializer.validated_data['task_ids'])):
        raise ValidationError({'task_ids': 'Une ou plusieurs tâches sont inaccessibles.'})

    action = serializer.validated_data['action']
    if company.is_personal and action == 'assign':
        raise PermissionDenied("L'assignation n'est pas disponible dans un espace personnel.")
    if action in {'assign', 'archive', 'restore'} and not request.user.is_manager():
        raise PermissionDenied("Cette action groupée nécessite le rôle de responsable.")

    if action == 'status':
        target_status = serializer.validated_data['status']
        for task in tasks:
            previous_status = task.status
            update = TaskUpdateSerializer(
                task,
                data={'status': target_status},
                partial=True,
                context={'request': request},
            )
            update.is_valid(raise_exception=True)
            updated_task = update.save()
            if target_status == Status.COMPLETED and previous_status != Status.COMPLETED:
                updated_task.completed_at = timezone.now()
                updated_task.save(update_fields=['completed_at', 'updated_at'])
                from .services import generate_next_occurrence
                generate_next_occurrence(updated_task)
            elif previous_status == Status.COMPLETED and target_status != Status.COMPLETED:
                updated_task.completed_at = None
                updated_task.save(update_fields=['completed_at', 'updated_at'])
    elif action == 'assign':
        assignee = get_object_or_404(
            request.user.__class__,
            id=serializer.validated_data['assigned_to'],
            company=company,
            is_active=True,
        )
        for task in tasks:
            old_assignee_id = task.assigned_to_id
            task.assigned_to = assignee
            task.save(update_fields=['assigned_to', 'updated_at'])
            from .models import TaskHistory
            TaskHistory.objects.create(
                task=task,
                changed_by=request.user,
                field_name='assigned_to',
                old_value=str(old_assignee_id) if old_assignee_id else None,
                new_value=str(assignee.id),
            )
    else:
        active = action == 'restore'
        for task in tasks:
            task.is_active = active
            task.archived_at = None if active else timezone.now()
            task.save(update_fields=['is_active', 'archived_at', 'updated_at'])
            from .models import TaskHistory
            TaskHistory.objects.create(
                task=task,
                changed_by=request.user,
                field_name='archived',
                new_value='Task restored' if active else 'Task archived',
            )

    return Response(TaskSerializer(tasks, many=True).data)


@extend_schema(
    description="Weekly workload and capacity planning for company managers",
    responses=OpenApiTypes.OBJECT,
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def workload_planning(request):
    if not (request.user.is_manager() or request.user.is_superuser):
        raise PermissionDenied("La planification de la charge nécessite le rôle de responsable.")
    company = get_requested_company(request)
    if not company:
        raise ValidationError({'company': "Le contexte d'une entreprise est obligatoire."})

    from domain.users.models import User

    try:
        week_start = timezone.datetime.strptime(
            request.query_params.get('week', ''),
            '%Y-%m-%d',
        ).date()
    except ValueError:
        today = timezone.localdate()
        week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    scheduled = Task.objects.filter(
        company=company,
        is_active=True,
        status__in=[Status.TODO, Status.IN_PROGRESS, Status.ON_HOLD],
        due_date__range=(week_start, week_end),
    )
    totals = {
        row['assigned_to']: float(row['hours'] or 0)
        for row in scheduled.values('assigned_to').annotate(
            hours=Sum(
                'estimated_hours',
                output_field=DecimalField(max_digits=10, decimal_places=2),
            ),
        )
    }
    overdue_counts = {
        row['assigned_to']: row['count']
        for row in Task.objects.filter(
            company=company,
            is_active=True,
            due_date__lt=timezone.localdate(),
        ).exclude(status=Status.COMPLETED).values('assigned_to').annotate(
            count=Count('id'),
        )
    }
    users = User.objects.filter(
        company=company,
        is_active=True,
    ).order_by('first_name', 'last_name')
    members = []
    for user in users:
        hours = totals.get(user.id, 0)
        capacity = user.weekly_capacity_hours
        utilization = round(hours * 100 / capacity) if capacity else 0
        members.append({
            'id': user.id,
            'name': user.full_name,
            'role': user.role,
            'capacity_hours': capacity,
            'scheduled_hours': hours,
            'remaining_hours': max(0, float(capacity) - hours),
            'utilization_percent': utilization,
            'overdue_tasks': overdue_counts.get(user.id, 0),
            'is_overloaded': utilization > 100,
        })
    unassigned = list(
        scheduled.filter(assigned_to__isnull=True).values(
            'id', 'title', 'priority', 'due_date', 'estimated_hours',
        )
    )
    return Response({
        'week_start': week_start,
        'week_end': week_end,
        'members': members,
        'unassigned_tasks': unassigned,
        'total_capacity_hours': sum(member['capacity_hours'] for member in members),
        'total_scheduled_hours': sum(member['scheduled_hours'] for member in members),
    })


class TaskHistoryListView(generics.ListAPIView):
    """List task history."""
    
    permission_classes = [IsAuthenticated, IsTaskCreatorOrAssigneeOrManager]
    serializer_class = TaskHistorySerializer
    ordering = ['-changed_at']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Task.objects.none()
        task_id = self.kwargs['task_id']
        task = get_accessible_task(self.request, task_id)
        self.check_object_permissions(self.request, task)
        return task.history.select_related('changed_by')


@extend_schema(
    description="Get tasks created by me",
    responses=TaskListSerializer(many=True)
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_tasks(request):
    """Get tasks created by the current user."""
    
    user = request.user
    company = get_requested_company(request)
    queryset = Task.objects.filter(
        company=company,
        creator=user,
        is_active=True,
    )
    queryset = apply_task_filters(request, queryset)
    serializer = TaskListSerializer(queryset, many=True)
    return Response(serializer.data)


@extend_schema(
    description="Get tasks assigned to me",
    responses=TaskListSerializer(many=True)
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def assigned_tasks(request):
    """Get tasks assigned to the current user."""
    
    user = request.user
    company = get_requested_company(request)
    queryset = Task.objects.filter(
        company=company,
        assigned_to=user,
        is_active=True
    )
    
    queryset = apply_task_filters(request, queryset)
    serializer = TaskListSerializer(queryset, many=True)
    return Response(serializer.data)


@extend_schema(
    description="Get the current user's daily focus",
    responses={200: OpenApiTypes.OBJECT},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def daily_focus(request):
    user = request.user
    company = get_requested_company(request)
    today = timezone.localdate()
    base = Task.objects.filter(
        company=company,
        is_active=True,
    ).filter(
        # Tasks I am directly responsible for:
        #   - assigned directly to me
        #   - created by me and not yet assigned to anyone
        # OR tasks assigned to one of my teams (collective responsibility)
        Q(assigned_to=user)
        | (Q(creator=user) & Q(assigned_to__isnull=True))
        | Q(team__members=user)
    ).distinct()
    incomplete = base.exclude(status=Status.COMPLETED)

    overdue = apply_task_filters(
        request,
        incomplete.filter(due_date__lt=today),
    )
    due_today = apply_task_filters(
        request,
        incomplete.filter(due_date=today),
    )
    in_progress = apply_task_filters(
        request,
        incomplete.filter(status=Status.IN_PROGRESS)
        .exclude(due_date__lte=today),
    )
    upcoming = apply_task_filters(
        request,
        incomplete.filter(
            due_date__gt=today,
            due_date__lte=today + timedelta(days=7),
        ).exclude(status=Status.IN_PROGRESS),
    )

    return Response({
        'date': today,
        'overdue': TaskListSerializer(overdue, many=True).data,
        'today': TaskListSerializer(due_today, many=True).data,
        'in_progress': TaskListSerializer(in_progress, many=True).data,
        'upcoming': TaskListSerializer(upcoming, many=True).data,
    })


class TaskCommentListCreateView(generics.ListCreateAPIView):
    """List and create task comments."""
    
    permission_classes = [IsAuthenticated, IsCompanyOperational]
    serializer_class = TaskCommentSerializer
    ordering = ['-created_at']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return TaskComment.objects.none()
        task_id = self.kwargs['task_id']
        task = get_accessible_task(self.request, task_id)
        return TaskComment.objects.filter(task=task).select_related(
            'author', 'parent_comment__author'
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.method == 'POST' and not getattr(self, 'swagger_fake_view', False):
            context['task'] = get_accessible_task(self.request, self.kwargs['task_id'])
        return context
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TaskCommentCreateSerializer
        return TaskCommentSerializer
    
    def perform_create(self, serializer):
        task_id = self.kwargs['task_id']
        task = get_accessible_task(self.request, task_id)
        serializer.save(task=task, author=self.request.user)


class TaskCommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update and delete a task comment."""
    
    permission_classes = [IsAuthenticated, IsCompanyOperational, IsOwnerOrCompanyManager]
    serializer_class = TaskCommentSerializer
    lookup_field = 'id'

    def get_queryset(self):
        task = get_accessible_task(self.request, self.kwargs['task_id'])
        return TaskComment.objects.filter(task=task).select_related(
            'author', 'parent_comment__author'
        )
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return TaskCommentUpdateSerializer
        return TaskCommentSerializer


class TaskAttachmentListCreateView(generics.ListCreateAPIView):
    """List and create task attachments."""
    
    permission_classes = [IsAuthenticated, IsCompanyOperational]
    parser_classes = [MultiPartParser, FormParser]
    serializer_class = TaskAttachmentSerializer
    ordering = ['-created_at']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return TaskAttachment.objects.none()
        task_id = self.kwargs['task_id']
        task = get_accessible_task(self.request, task_id)
        return TaskAttachment.objects.filter(task=task).select_related('uploaded_by')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TaskAttachmentCreateSerializer
        return TaskAttachmentSerializer
    
    def perform_create(self, serializer):
        task_id = self.kwargs['task_id']
        task = get_accessible_task(self.request, task_id)
        serializer.save(task=task, uploaded_by=self.request.user)


class TaskAttachmentDetailView(generics.RetrieveDestroyAPIView):
    """Retrieve and delete a task attachment."""
    
    permission_classes = [IsAuthenticated, IsCompanyOperational, IsOwnerOrCompanyManager]
    serializer_class = TaskAttachmentSerializer
    lookup_field = 'id'

    def get_queryset(self):
        task = get_accessible_task(self.request, self.kwargs['task_id'])
        return TaskAttachment.objects.filter(task=task)


@extend_schema(
    responses={(200, 'application/octet-stream'): OpenApiTypes.BINARY},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_attachment(request, task_id, attachment_id):
    task = get_accessible_task(request, task_id)
    attachment = get_object_or_404(
        TaskAttachment,
        id=attachment_id,
        task=task,
    )
    response = FileResponse(
        attachment.file.open('rb'),
        as_attachment=True,
        filename=attachment.filename,
        content_type=attachment.mime_type,
    )
    response['X-Content-Type-Options'] = 'nosniff'
    return response


class TaskReportListCreateView(generics.ListCreateAPIView):
    """List and create task reports."""
    
    permission_classes = [IsAuthenticated, IsCompanyOperational]
    serializer_class = TaskReportSerializer
    ordering = ['-created_at']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return TaskReport.objects.none()
        task_id = self.kwargs['task_id']
        task = get_accessible_task(self.request, task_id)
        if task.company.is_personal:
            return TaskReport.objects.none()
        return TaskReport.objects.filter(task=task).select_related(
            'requested_by', 'reviewed_by'
        )
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TaskReportCreateSerializer
        return TaskReportSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.method == 'POST':
            context['task'] = get_accessible_task(
                self.request,
                self.kwargs['task_id'],
            )
        return context
    
    def perform_create(self, serializer):
        task_id = self.kwargs['task_id']
        task = get_accessible_task(self.request, task_id)
        if task.company.is_personal:
            raise PermissionDenied(
                "Dans un espace personnel, modifiez directement la date d'échéance de la tâche."
            )
        if task.status == Status.COMPLETED:
            raise ValidationError({
                'task': "Vous ne pouvez pas demander le report d'une tâche déjà terminée."
            })
        if task.due_date is None:
            raise ValidationError({
                'task': "La tâche doit avoir une date d'échéance avant de demander un report."
            })
        if TaskReport.objects.filter(task=task, status='pending').exists():
            raise ValidationError({
                'task': 'Une demande de report est déjà en attente pour cette tâche.'
            })
        report = serializer.save(
            task=task,
            requested_by=self.request.user,
            old_due_date=task.due_date
        )
        notify_company_reviewers(
            task,
            title='Demande de report à valider',
            message=(
                f"{self.request.user.full_name} demande de reporter la tâche "
                f"« {task.title} » au {report.new_due_date:%d/%m/%Y}."
            ),
            dedupe_prefix=f'report-request:{report.id}',
        )


class TaskReportDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve and update a task report."""
    
    permission_classes = [IsAuthenticated, IsCompanyOperational]
    serializer_class = TaskReportSerializer
    lookup_field = 'id'

    def get_queryset(self):
        task = get_accessible_task(self.request, self.kwargs['task_id'])
        if task.company.is_personal:
            return TaskReport.objects.none()
        return TaskReport.objects.filter(task=task)
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return TaskReportReviewSerializer
        return TaskReportSerializer
    
    @transaction.atomic
    def perform_update(self, serializer):
        report = self.get_object()
        if report.task.company.is_personal:
            raise PermissionDenied("Les demandes de report ne sont pas utilisées dans un espace personnel.")
        
        # Only managers can review reports
        if not self.request.user.is_manager():
            raise PermissionDenied("Seuls les responsables peuvent examiner les demandes de report.")
        
        # Update reviewed_at and reviewed_by when status changes
        if report.status != 'pending':
            raise ValidationError({
                'status': 'Cette demande de report a déjà été examinée.'
            })

        if serializer.validated_data['status'] != 'pending':
            serializer.save(
                reviewed_by=self.request.user,
                reviewed_at=timezone.now()
            )

            # If approved, update the task due date and log the change
            if serializer.validated_data['status'] == 'approved':
                task = report.task
                old_due_date = task.due_date
                old_status = task.status
                task.due_date = report.new_due_date
                task.status = Status.DEFERRED
                task.save(update_fields=['due_date', 'status', 'updated_at'])

                # Trace the changes in TaskHistory
                from .models import TaskHistory
                if old_due_date != task.due_date:
                    TaskHistory.objects.create(
                        task=task,
                        changed_by=self.request.user,
                        field_name='due_date',
                        old_value=str(old_due_date) if old_due_date else None,
                        new_value=str(task.due_date),
                    )
                if old_status != task.status:
                    TaskHistory.objects.create(
                        task=task,
                        changed_by=self.request.user,
                        field_name='status',
                        old_value=old_status,
                        new_value=task.status,
                    )
        else:
            serializer.save()


@extend_schema(
    description="Get my pending reports",
    responses=TaskReportSerializer(many=True)
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_reports(request):
    """Get reports requested by the current user."""
    
    user = request.user
    queryset = TaskReport.objects.filter(requested_by=user)
    
    # Apply filters
    status_filter = request.query_params.get('status')
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    
    serializer = TaskReportSerializer(queryset, many=True)
    return Response(serializer.data)


@extend_schema(
    description="Get pending reports to review (managers only)",
    responses=TaskReportSerializer(many=True)
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_reports(request):
    """Get pending reports for managers to review."""
    
    if not request.user.is_manager():
        return Response(
            {"detail": "Seuls les responsables peuvent consulter les demandes de report en attente."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    company = get_requested_company(request)
    queryset = TaskReport.objects.filter(task__company=company).select_related(
        'task', 'requested_by', 'reviewed_by'
    )
    status_filter = request.query_params.get('status', 'pending')
    if status_filter != 'all':
        if status_filter not in {'pending', 'approved', 'rejected'}:
            raise ValidationError({'status': 'Le statut de la demande de report est invalide.'})
        queryset = queryset.filter(status=status_filter)
    
    serializer = TaskReportSerializer(queryset, many=True)
    return Response(serializer.data)


class ApprovalRequestListView(generics.ListAPIView):
    """List approval requests visible to the current company member."""

    permission_classes = [IsAuthenticated, IsCompanyOperational]
    serializer_class = ApprovalRequestSerializer

    def get_queryset(self):
        company = get_requested_company(self.request)
        if not company or company.is_personal:
            return ApprovalRequest.objects.none()
        queryset = ApprovalRequest.objects.filter(company=company).select_related(
            'task', 'requested_by', 'reviewed_by'
        )
        if not self.request.user.is_manager():
            queryset = queryset.filter(requested_by=self.request.user)
        status_filter = self.request.query_params.get('status')
        if status_filter in ApprovalStatus.values:
            queryset = queryset.filter(status=status_filter)
        return queryset


class TaskApprovalRequestListCreateView(generics.ListCreateAPIView):
    """List a task's approvals or request validation of a sensitive action."""

    permission_classes = [IsAuthenticated, IsCompanyOperational]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ApprovalRequestCreateSerializer
        return ApprovalRequestSerializer

    def get_queryset(self):
        task = get_accessible_task(self.request, self.kwargs['task_id'])
        if task.company.is_personal:
            return ApprovalRequest.objects.none()
        queryset = ApprovalRequest.objects.filter(task=task).select_related(
            'task', 'requested_by', 'reviewed_by'
        )
        if not self.request.user.is_manager():
            queryset = queryset.filter(requested_by=self.request.user)
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        task = get_accessible_task(self.request, self.kwargs['task_id'])
        if task.company.is_personal:
            raise PermissionDenied("La validation n'est pas nécessaire dans un espace personnel.")
        user = self.request.user
        action = serializer.validated_data.get('action', ApprovalAction.TASK_COMPLETION)

        if user.is_manager():
            raise ValidationError({
                'detail': "Un responsable peut clôturer directement la tâche sans demander de validation."
            })
        if action == ApprovalAction.TASK_COMPLETION:
            if not task.requires_completion_approval:
                raise ValidationError({
                    'detail': "Cette tâche ne nécessite pas de validation de clôture."
                })
            if task.status == Status.COMPLETED:
                raise ValidationError({'detail': "Cette tâche est déjà terminée."})
            if task.is_blocked:
                raise ValidationError({
                    'detail': "Terminez les dépendances et sous-tâches avant de demander la clôture."
                })
        if ApprovalRequest.objects.filter(
            task=task,
            action=action,
            status=ApprovalStatus.PENDING,
        ).exists():
            raise ValidationError({
                'detail': "Une demande de validation est déjà en attente pour cette tâche."
            })

        approval = serializer.save(
            company=task.company,
            task=task,
            requested_by=user,
        )
        task.history.create(
            changed_by=user,
            field_name='approval_requested',
            new_value=str(approval.id),
        )
        notify_company_reviewers(
            task,
            title='Clôture de tâche à valider',
            message=f"{user.full_name} demande la validation de la tâche « {task.title} ».",
            dedupe_prefix=f'approval-request:{approval.id}',
        )


class ApprovalRequestDetailView(generics.RetrieveAPIView):
    """Retrieve or review one approval request."""

    permission_classes = [IsAuthenticated, IsCompanyOperational]
    serializer_class = ApprovalRequestSerializer
    lookup_field = 'id'

    def get_queryset(self):
        company = get_requested_company(self.request)
        if not company or company.is_personal:
            return ApprovalRequest.objects.none()
        queryset = ApprovalRequest.objects.filter(company=company).select_related(
            'task', 'requested_by', 'reviewed_by'
        )
        if not self.request.user.is_manager():
            queryset = queryset.filter(requested_by=self.request.user)
        return queryset

    @transaction.atomic
    def patch(self, request, *args, **kwargs):
        if not request.user.is_manager():
            raise PermissionDenied("Seuls les responsables peuvent traiter une demande de validation.")

        company = get_requested_company(request)
        if company and company.is_personal:
            raise PermissionDenied("La validation n'est pas utilisée dans un espace personnel.")
        approval = get_object_or_404(
            # Lock only the approval row. Nullable user joins cannot be locked
            # by PostgreSQL and previously caused a 500 during review.
            ApprovalRequest.objects.select_for_update(),
            id=kwargs['id'],
            company=company,
        )
        if approval.status != ApprovalStatus.PENDING:
            raise ValidationError({'status': "Cette demande a déjà été traitée."})
        if approval.requested_by_id == request.user.id:
            raise ValidationError({
                'status': "Vous ne pouvez pas valider votre propre demande."
            })

        serializer = ApprovalRequestReviewSerializer(
            approval,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        decision = serializer.validated_data['status']

        if decision == ApprovalStatus.APPROVED:
            task = Task.objects.select_for_update().get(pk=approval.task_id)
            if task.status == Status.COMPLETED:
                raise ValidationError({'task': "Cette tâche est déjà terminée."})
            if task.is_blocked:
                raise ValidationError({
                    'task': "La tâche est bloquée par une dépendance ou une sous-tâche incomplète."
                })
            old_status = task.status
            task.status = Status.COMPLETED
            task.completed_at = timezone.now()
            task.save(update_fields=['status', 'completed_at', 'updated_at'])
            task.history.create(
                changed_by=request.user,
                field_name='status',
                old_value=old_status,
                new_value=Status.COMPLETED,
            )
            task.history.create(
                changed_by=request.user,
                field_name='approval_approved',
                old_value=str(approval.id),
                new_value=serializer.validated_data.get('review_comment', ''),
            )
            from .services import generate_next_occurrence
            generate_next_occurrence(task)
        else:
            approval.task.history.create(
                changed_by=request.user,
                field_name='approval_rejected',
                old_value=str(approval.id),
                new_value=serializer.validated_data.get('review_comment', ''),
            )

        approval.status = decision
        approval.review_comment = serializer.validated_data.get('review_comment', '')
        approval.reviewed_by = request.user
        approval.reviewed_at = timezone.now()
        approval.save(update_fields=[
            'status', 'review_comment', 'reviewed_by', 'reviewed_at'
        ])

        if approval.requested_by:
            from domain.notifications.models import NotificationType
            from domain.notifications.services import create_smart_notification
            approved = decision == ApprovalStatus.APPROVED
            create_smart_notification(
                recipient=approval.requested_by,
                notification_type=(
                    NotificationType.APPROVAL_APPROVED
                    if approved else NotificationType.APPROVAL_REJECTED
                ),
                title=f"Demande de clôture {'approuvée' if approved else 'refusée'}",
                message=(
                    f"Votre demande pour la tâche « {approval.task.title} » a été "
                    f"{'approuvée' if approved else 'refusée'} par {request.user.full_name}."
                ),
                task=approval.task,
                dedupe_key=f'approval-decision:{approval.id}:{decision}',
            )

        return Response(ApprovalRequestSerializer(approval, context={'request': request}).data)


@extend_schema(
    description="Export filtered tasks to Excel",
    responses={200: OpenApiResponse(response=OpenApiTypes.BINARY, description="Excel File")}
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsCompanyOperational])
def export_tasks_excel(request):
    """
    Exports the user's accessible tasks to an Excel file (.xlsx).
    Applies the same filters as the TaskListCreateView.
    """
    company = get_requested_company(request)
    queryset = accessible_tasks_for(request.user, company)
    queryset = apply_task_filters(request, queryset)

    # Safety limit: cap at 5 000 rows to prevent memory exhaustion.
    EXPORT_LIMIT = 5_000
    total_count = queryset.count()
    queryset = queryset[:EXPORT_LIMIT]

    scope_titles = {
        'mine': 'Tâches créées par moi',
        'assigned': 'Tâches assignées à moi',
        'team': "Tâches d'équipe",
        'all': 'Toutes les tâches',
    }
    status_titles = dict(Status.choices)
    priority_titles = dict(Task._meta.get_field('priority').choices)
    title_parts = [scope_titles.get(request.query_params.get('scope'), 'Export des tâches')]
    if request.query_params.get('status') in status_titles:
        title_parts.append(status_titles[request.query_params['status']])
    if request.query_params.get('priority') in priority_titles:
        title_parts.append(f"Priorité {priority_titles[request.query_params['priority']].lower()}")
    requested_title = request.query_params.get('title', '').strip()
    export_title = requested_title or ' - '.join(title_parts)
    export_title = export_title[:120]

    wb = openpyxl.Workbook()
    ws = wb.active
    worksheet_title = re.sub(r'[\\/*?:\[\]]', '-', export_title).strip()[:31]
    ws.title = worksheet_title or 'Export des tâches'

    # Define headers
    headers = ["ID", "Titre", "Statut", "Priorité", "Assigné à", "Équipe", "Échéance", "Créé le"]
    ws.append(headers)

    for task in queryset:
        ws.append([
            task.id,
            task.title,
            task.get_status_display(),
            task.get_priority_display(),
            task.assigned_to.full_name if task.assigned_to else "",
            task.team.name if task.team else "",
            task.due_date.strftime("%Y-%m-%d") if task.due_date else "",
            task.created_at.strftime("%Y-%m-%d %H:%M"),
        ])

    ascii_title = unicodedata.normalize('NFKD', export_title).encode('ascii', 'ignore').decode('ascii')
    safe_filename = re.sub(r'[^a-zA-Z0-9._-]+', '_', ascii_title).strip('._') or 'export_taches'
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="{safe_filename}_{timezone.localdate()}.xlsx"'
    if total_count > EXPORT_LIMIT:
        response['X-Export-Truncated'] = f'true; total={total_count}; exported={EXPORT_LIMIT}'
    wb.save(response)
    return response


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsCompanyOperational]

    def get_permissions(self):
        """Employees can consult projects, while management retains write access."""
        permission_classes = [
            IsAuthenticated,
            IsCompanyOperational,
            IsCompanyMember if self.request.method in permissions.SAFE_METHODS else IsManagerOrAdministrator,
        ]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        company = get_requested_company(self.request)
        if not company:
            return Project.objects.none()
        qs = Project.objects.filter(company=company).select_related('manager').prefetch_related('members', 'teams', 'teams__members')
        status_param = self.request.query_params.get('status')
        health_param = self.request.query_params.get('health')
        search_param = self.request.query_params.get('search')
        if status_param:
            qs = qs.filter(status=status_param)
        if health_param:
            qs = qs.filter(health=health_param)
        if search_param:
            qs = qs.filter(name__icontains=search_param)
        return qs

    def perform_create(self, serializer):
        company = get_requested_company(self.request)
        user = self.request.user
        if not (user.is_administrator() or user.is_owner() or user.role in ['manager', 'owner', 'administrator']):
            raise ValidationError("Seuls les managers et propriétaires peuvent créer des projets.")
        if company.is_personal:
            serializer.save(company=company, manager=user, members=[], teams=[])
        else:
            serializer.save(company=company, manager=serializer.validated_data.get('manager') or user)


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsCompanyOperational]

    def get_permissions(self):
        """Project information is shared with company members; only managers edit it."""
        permission_classes = [
            IsAuthenticated,
            IsCompanyOperational,
            IsCompanyMember if self.request.method in permissions.SAFE_METHODS else IsManagerOrAdministrator,
        ]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        company = get_requested_company(self.request)
        if not company:
            return Project.objects.none()
        return Project.objects.filter(company=company).select_related('manager').prefetch_related('members', 'teams', 'teams__members')

    @transaction.atomic
    def perform_update(self, serializer):
        company = get_requested_company(self.request)
        if company.is_personal:
            serializer.save(manager=self.request.user, members=[], teams=[])
        else:
            serializer.save()
