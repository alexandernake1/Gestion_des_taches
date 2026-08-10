from datetime import timedelta

from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import Case, Count, DecimalField, IntegerField, Q, Sum, Value, When
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import FileResponse, HttpResponse
import openpyxl
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from common.permissions.permissions import IsTaskCreatorOrAssigneeOrManager, IsOwnerOrCompanyManager, IsCompanyOperational
from common.utils import get_requested_company
from .models import Task, TaskTemplate, Status, TaskComment, TaskAttachment, TaskReport, Project
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


def apply_task_filters(request, queryset):
    status_filter = request.query_params.get('status')
    priority_filter = request.query_params.get('priority')
    search = request.query_params.get('search')
    scope = request.query_params.get('scope')

    if scope == 'team':
        queryset = queryset.filter(team__isnull=False)

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
    return queryset.select_related(
        'creator', 'assigned_to', 'team'
    ).order_by('is_completed_rank', 'priority_rank', 'attention_rank', 'due_date', '-created_at')


class TaskListCreateView(generics.ListCreateAPIView):
    """List and create tasks."""
    
    permission_classes = [IsAuthenticated, IsCompanyOperational]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'priority', 'assigned_to', 'team', 'parent']
    search_fields = ['title', 'description']
    
    def get_queryset(self):
        company = get_requested_company(self.request)
        queryset = accessible_tasks_for(self.request.user, company)
        return apply_task_filters(self.request, queryset)
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TaskCreateSerializer
        return TaskListSerializer
    
    def perform_create(self, serializer):
        # NOTE: la création réelle est implémentée dans la méthode `post` ci-dessous
        # car elle nécessite une logique d'assignation conditionelle qui dépend du rôle.
        # Cette méthode est conservée pour la compatibilité DRF mais ne devrait pas être appelée directement.
        company = get_requested_company(self.request)
        if not company:
            raise PermissionDenied("You must select or belong to a company to create a task.")
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
                {"detail": "You must select or belong to a company to create a task."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Only managers and above can assign tasks to other users.
        # Employees who are team leaders of the parent task can assign subtasks to team members.
        # Other employees are always auto-assigned to themselves.
        parent = serializer.validated_data.get('parent')
        is_team_leader_for_parent = bool(parent and parent.team and parent.team.leader == request.user)

        if request.user.is_superuser:
            assigned_to = serializer.validated_data.get('assigned_to')
        elif request.user.is_manager() or is_team_leader_for_parent:
            assigned_to = serializer.validated_data.get('assigned_to') or request.user

            # Validate assignee is in the same company.
            if assigned_to and getattr(assigned_to, 'company', None) != company:
                return Response(
                    {"detail": "You cannot assign a task to a user from a different company."},
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
                    {"detail": "You cannot assign a task to a team from a different company."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Employee: always assigned to themselves, ignore any submitted assigned_to.
            assigned_to = request.user

        task = serializer.save(
            company=company,
            creator=request.user,
            assigned_to=assigned_to,
        )

        # Create history entry
        from .models import TaskHistory
        TaskHistory.objects.create(
            task=task,
            changed_by=request.user,
            field_name='created',
            new_value='Task created'
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
                    f"You are only allowed to update the 'status' field on tasks assigned to you. "
                    f"Disallowed field(s): {', '.join(sorted(disallowed))}"
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
            new_value='Task archived',
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
        raise PermissionDenied("You cannot duplicate this task.")

    clone = Task.objects.create(
        title=f"Copie de {source.title}",
        description=source.description,
        company=source.company,
        creator=request.user,
        assigned_to=source.assigned_to,
        team=source.team,
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
            assigned_to=subtask.assigned_to,
            team=subtask.team,
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
        raise PermissionDenied("You cannot restore this task.")
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
            raise PermissionDenied("A company context is required.")
        is_shared = serializer.validated_data.get('is_shared', True)
        if self.request.user.role == 'employee':
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
    if request.user.role == 'employee':
        assigned_to = request.user
        team = None
    elif assigned_to is None:
        assigned_to = request.user
    if assigned_to and assigned_to.company != company:
        raise ValidationError({'assigned_to': 'Invalid company.'})
    if team and team.company != company:
        raise ValidationError({'team': 'Invalid company.'})

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
    if request.user.role == 'employee':
        is_shared = False
    if not name:
        raise ValidationError({'name': 'Template name is required.'})
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
        raise ValidationError({'task_ids': 'One or more tasks are inaccessible.'})

    action = serializer.validated_data['action']
    if action in {'assign', 'archive', 'restore'} and not request.user.is_manager():
        raise PermissionDenied("This bulk action requires a manager role.")

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
        raise PermissionDenied("Workload planning requires a manager role.")
    company = get_requested_company(request)
    if not company:
        raise ValidationError({'company': 'A company context is required.'})

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
        return TaskComment.objects.filter(task=task).select_related('author')
    
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
        return TaskComment.objects.filter(task=task)
    
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
        if task.status == Status.COMPLETED:
            raise ValidationError({
                'task': 'Cannot request a report for a task that is already completed.'
            })
        if task.due_date is None:
            raise ValidationError({
                'task': 'The task must have a due date before requesting a report.'
            })
        if TaskReport.objects.filter(task=task, status='pending').exists():
            raise ValidationError({
                'task': 'A pending report already exists for this task.'
            })
        serializer.save(
            task=task,
            requested_by=self.request.user,
            old_due_date=task.due_date
        )


class TaskReportDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve and update a task report."""
    
    permission_classes = [IsAuthenticated, IsCompanyOperational]
    serializer_class = TaskReportSerializer
    lookup_field = 'id'

    def get_queryset(self):
        task = get_accessible_task(self.request, self.kwargs['task_id'])
        return TaskReport.objects.filter(task=task)
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return TaskReportReviewSerializer
        return TaskReportSerializer
    
    def perform_update(self, serializer):
        report = self.get_object()
        
        # Only managers can review reports
        if not self.request.user.is_manager():
            raise PermissionDenied("Only managers can review reports.")
        
        # Update reviewed_at and reviewed_by when status changes
        if report.status != 'pending':
            raise ValidationError({
                'status': 'This report has already been reviewed.'
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
            {"detail": "Only managers can view pending reports."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    company = get_requested_company(request)
    queryset = TaskReport.objects.filter(
        status='pending',
        task__company=company
    )
    
    serializer = TaskReportSerializer(queryset, many=True)
    return Response(serializer.data)


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

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Tasks Export"

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

    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="export_taches_{timezone.localdate()}.xlsx"'
    if total_count > EXPORT_LIMIT:
        response['X-Export-Truncated'] = f'true; total={total_count}; exported={EXPORT_LIMIT}'
    wb.save(response)
    return response


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsCompanyOperational]

    def get_queryset(self):
        company = get_requested_company(self.request)
        if not company:
            return Project.objects.none()
        qs = Project.objects.filter(company=company)
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
        serializer.save(company=company, manager=serializer.validated_data.get('manager') or user)


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsCompanyOperational]

    def get_queryset(self):
        company = get_requested_company(self.request)
        if not company:
            return Project.objects.none()
        return Project.objects.filter(company=company)

