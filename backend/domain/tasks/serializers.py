from rest_framework import serializers
from common.utils import get_requested_company
from django.db.models import Sum
from pathlib import Path
import mimetypes
import zipfile
from domain.users.models import Role, User
from domain.teams.models import Team
from .models import (
    ApprovalAction,
    ApprovalRequest,
    ApprovalStatus,
    Status,
    Task,
    TaskTemplate,
    TaskHistory,
    TaskComment,
    TaskAttachment,
    TaskReport,
    Project,
    ProjectStatus,
    ProjectHealth,
)


class ProjectSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    health_display = serializers.CharField(source='get_health_display', read_only=True)
    manager_name = serializers.CharField(source='manager.full_name', read_only=True)
    progress_percent = serializers.IntegerField(read_only=True)
    total_tasks_count = serializers.IntegerField(read_only=True)
    completed_tasks_count = serializers.IntegerField(read_only=True)
    member_details = serializers.SerializerMethodField()
    team_details = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'company', 'status', 'status_display',
            'health', 'health_display', 'start_date', 'due_date',
            'manager', 'manager_name', 'members', 'member_details',
            'teams', 'team_details',
            'budget_hours', 'progress_percent', 'total_tasks_count',
            'completed_tasks_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def get_member_details(self, obj):
        return [
            {'id': m.id, 'full_name': m.full_name, 'email': m.email, 'role': m.role}
            for m in obj.members.all()
        ]

    def get_team_details(self, obj):
        return [
            {'id': team.id, 'name': team.name, 'member_count': team.members.count()}
            for team in obj.teams.all()
        ]

    def validate_manager(self, value):
        company = get_requested_company(self.context['request'])
        if value and value.company != company:
            raise serializers.ValidationError("Le responsable doit appartenir à votre entreprise.")
        return value

    def validate_members(self, value):
        company = get_requested_company(self.context['request'])
        if any(member.company != company for member in value):
            raise serializers.ValidationError("Tous les membres doivent appartenir à votre entreprise.")
        return value

    def validate_teams(self, value):
        company = get_requested_company(self.context['request'])
        if any(team.company != company for team in value):
            raise serializers.ValidationError("Toutes les équipes doivent appartenir à votre entreprise.")
        return value


def validate_task_dates(attrs, instance=None):
    start_date = attrs.get('start_date', getattr(instance, 'start_date', None))
    due_date = attrs.get('due_date', getattr(instance, 'due_date', None))
    if start_date and due_date and due_date < start_date:
        raise serializers.ValidationError({
            'due_date': "Due date cannot be before start date."
        })
    return attrs


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for Task model."""
    
    creator_name = serializers.CharField(source='creator.full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    team_leader_id = serializers.IntegerField(source='team.leader_id', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    is_blocked = serializers.BooleanField(read_only=True)
    progress_percent = serializers.IntegerField(read_only=True)
    subtask_count = serializers.IntegerField(source='subtasks.count', read_only=True)
    dependency_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'company', 'project', 'project_name', 'creator', 'creator_name',
            'assigned_to', 'assigned_to_name', 'team', 'team_name', 'team_leader_id', 'priority',
            'priority_display', 'status', 'status_display', 'start_date', 'due_date',
            'completed_at', 'is_overdue', 'is_blocked', 'progress_percent',
            'parent', 'dependencies', 'dependency_details', 'subtask_count',
            'is_active', 'archived_at', 'created_at', 'updated_at',
            'recurrence_frequency', 'recurrence_interval',
            'recurrence_end_date', 'next_occurrence',
            'estimated_hours', 'requires_completion_approval',
        ]
        extra_kwargs = {'recurrence_interval': {'min_value': 1, 'max_value': 365}}
        read_only_fields = [
            'id', 'company', 'creator', 'completed_at', 'archived_at',
            'next_occurrence', 'created_at', 'updated_at',
        ]

    def get_dependency_details(self, obj) -> list[dict]:
        return [
            {'id': dependency.id, 'title': dependency.title, 'status': dependency.status}
            for dependency in obj.dependencies.all()
        ]


class TaskCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a task."""
    
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'assigned_to', 'team', 'project', 'priority',
            'status', 'start_date', 'due_date', 'parent', 'dependencies',
            'recurrence_frequency', 'recurrence_interval',
            'recurrence_end_date', 'estimated_hours',
            'requires_completion_approval',
        ]
        extra_kwargs = {'recurrence_interval': {'min_value': 1, 'max_value': 365}}
    
    def validate_assigned_to(self, value):
        company = get_requested_company(self.context['request'])
        if value and value.company != company:
            raise serializers.ValidationError("You can only assign tasks to users in your company.")
        if value and not value.is_active:
            raise serializers.ValidationError("You cannot assign a task to an inactive user.")
        return value
    
    def validate_team(self, value):
        company = get_requested_company(self.context['request'])
        if value and value.company != company:
            raise serializers.ValidationError("You can only assign tasks to teams in your company.")
        if value and not value.is_active:
            raise serializers.ValidationError("You cannot assign a task to an inactive team.")
        return value

    def validate_project(self, value):
        company = get_requested_company(self.context['request'])
        if value and value.company != company:
            raise serializers.ValidationError("You can only link tasks to projects in your company.")
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        parent = attrs.get('parent')
        
        is_team_leader_for_parent = False
        if parent and parent.team and parent.team.leader == user:
            is_team_leader_for_parent = True

        if user.role == Role.EMPLOYEE and not is_team_leader_for_parent:
            if attrs.get('assigned_to') not in (None, user):
                raise serializers.ValidationError({
                    'assigned_to': "Employees cannot assign tasks to another user."
                })
            if attrs.get('team') is not None:
                raise serializers.ValidationError({
                    'team': "Employees cannot assign tasks to a team."
                })
            attrs.pop('assigned_to', None)
            attrs.pop('team', None)
            attrs['requires_completion_approval'] = False
            
        company = get_requested_company(self.context['request'])
        parent = attrs.get('parent')
        dependencies = attrs.get('dependencies', [])
        if parent and parent.company != company:
            raise serializers.ValidationError({'parent': "Invalid parent task."})
        if any(task.company != company for task in dependencies):
            raise serializers.ValidationError({'dependencies': "Dependencies must belong to the same company."})
        return validate_task_dates(attrs)


class TaskUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a task."""
    
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'assigned_to', 'team', 'project', 'priority',
            'status', 'start_date', 'due_date', 'parent', 'dependencies',
            'is_active', 'recurrence_frequency', 'recurrence_interval',
            'recurrence_end_date', 'estimated_hours',
            'requires_completion_approval',
        ]
        extra_kwargs = {'recurrence_interval': {'min_value': 1, 'max_value': 365}}
    
    def validate_assigned_to(self, value):
        company = get_requested_company(self.context['request'])
        if value and value.company != company:
            raise serializers.ValidationError("You can only assign tasks to users in your company.")
        if value and not value.is_active:
            raise serializers.ValidationError("You cannot assign a task to an inactive user.")
        return value
    
    def validate_team(self, value):
        company = get_requested_company(self.context['request'])
        if value and value.company != company:
            raise serializers.ValidationError("You can only assign tasks to teams in your company.")
        if value and not value.is_active:
            raise serializers.ValidationError("You cannot assign a task to an inactive team.")
        return value

    def validate_project(self, value):
        company = get_requested_company(self.context['request'])
        if value and value.company != company:
            raise serializers.ValidationError("You can only link tasks to projects in your company.")
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        if user.role == Role.EMPLOYEE:
            if 'assigned_to' in attrs or 'team' in attrs or 'requires_completion_approval' in attrs:
                raise serializers.ValidationError(
                    "Employees cannot change task assignment, team, or approval policy."
                )
        company = get_requested_company(self.context['request'])
        parent = attrs.get('parent', self.instance.parent)
        dependencies = attrs.get('dependencies')
        if parent:
            if parent == self.instance:
                raise serializers.ValidationError({'parent': "A task cannot be its own parent."})
            if parent.company != company:
                raise serializers.ValidationError({'parent': "Invalid parent task."})
        if dependencies is not None:
            if self.instance in dependencies:
                raise serializers.ValidationError({'dependencies': "A task cannot depend on itself."})
            if any(task.company != company for task in dependencies):
                raise serializers.ValidationError({'dependencies': "Dependencies must belong to the same company."})
        if attrs.get('status') == Status.COMPLETED:
            incomplete_dependencies = self.instance.dependencies.exclude(status=Status.COMPLETED)
            incomplete_subtasks = self.instance.subtasks.filter(is_active=True).exclude(status=Status.COMPLETED)
            if incomplete_dependencies.exists() or incomplete_subtasks.exists():
                raise serializers.ValidationError({
                    'status': "Complete all dependencies and subtasks before closing this task."
                })
            if (
                self.instance.requires_completion_approval
                and not user.is_manager()
            ):
                raise serializers.ValidationError({
                    'status': "Cette tâche exige une validation. Envoyez une demande de clôture à un responsable."
                })
        return validate_task_dates(attrs, self.instance)


class TaskListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for task lists."""
    
    creator_name = serializers.CharField(source='creator.full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    team_leader_id = serializers.IntegerField(source='team.leader_id', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    is_blocked = serializers.BooleanField(read_only=True)
    progress_percent = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'creator', 'creator_name',
            'assigned_to', 'assigned_to_name', 'team', 'team_name', 'team_leader_id', 'status',
            'status_display', 'priority', 'priority_display', 'start_date',
            'due_date', 'is_overdue', 'is_blocked', 'progress_percent',
            'parent', 'created_at', 'recurrence_frequency',
            'estimated_hours',
            'requires_completion_approval',
        ]


class ApprovalRequestSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True)

    class Meta:
        model = ApprovalRequest
        fields = [
            'id', 'company', 'task', 'task_title', 'requested_by',
            'requested_by_name', 'reviewed_by', 'reviewed_by_name',
            'action', 'action_display', 'status', 'status_display',
            'reason', 'review_comment', 'created_at', 'reviewed_at',
        ]
        read_only_fields = fields


class ApprovalRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalRequest
        fields = ['action', 'reason']

    def validate_action(self, value):
        if value != ApprovalAction.TASK_COMPLETION:
            raise serializers.ValidationError("Ce type de validation n'est pas encore pris en charge.")
        return value

    def validate_reason(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Précisez brièvement pourquoi la tâche peut être clôturée.")
        return value

    def to_representation(self, instance):
        return ApprovalRequestSerializer(instance, context=self.context).data


class ApprovalRequestReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalRequest
        fields = ['status', 'review_comment']

    def validate(self, attrs):
        decision = attrs.get('status')
        comment = attrs.get('review_comment', '').strip()
        if decision not in {ApprovalStatus.APPROVED, ApprovalStatus.REJECTED}:
            raise serializers.ValidationError({
                'status': "La décision doit être 'approved' ou 'rejected'."
            })
        if decision == ApprovalStatus.REJECTED and not comment:
            raise serializers.ValidationError({
                'review_comment': "Un motif est obligatoire pour refuser une demande."
            })
        attrs['review_comment'] = comment
        return attrs

    def to_representation(self, instance):
        return ApprovalRequestSerializer(instance, context=self.context).data


class TaskTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskTemplate
        fields = [
            'id', 'name', 'title', 'description', 'priority',
            'default_duration_days', 'is_active', 'is_shared',
            'created_at', 'updated_at', 'estimated_hours',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        user = self.context['request'].user
        # Employees cannot create shared company templates; their templates are always personal
        if user and getattr(user, 'role', None) == 'employee':
            attrs['is_shared'] = False
        return attrs

    def validate_name(self, value):
        user = self.context['request'].user
        company = get_requested_company(self.context['request'])
        queryset = TaskTemplate.objects.filter(company=company, name__iexact=value.strip(), is_active=True)
        if user and getattr(user, 'role', None) == 'employee':
            queryset = queryset.filter(creator=user)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A template with this name already exists.")
        return value.strip()


class TaskTemplateInstantiateSerializer(serializers.Serializer):
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    team = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(),
        required=False,
        allow_null=True,
    )
    start_date = serializers.DateField(required=False)


class TaskBulkActionSerializer(serializers.Serializer):
    task_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=100,
    )
    action = serializers.ChoiceField(
        choices=['status', 'archive', 'restore', 'assign'],
    )
    status = serializers.ChoiceField(choices=Status.choices, required=False)
    assigned_to = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        if attrs['action'] == 'status' and 'status' not in attrs:
            raise serializers.ValidationError({'status': 'This field is required.'})
        if attrs['action'] == 'assign' and 'assigned_to' not in attrs:
            raise serializers.ValidationError({'assigned_to': 'This field is required.'})
        return attrs


class TaskHistorySerializer(serializers.ModelSerializer):
    """Serializer for TaskHistory."""
    
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True)
    
    class Meta:
        model = TaskHistory
        fields = [
            'id', 'task', 'changed_by', 'changed_by_name', 'field_name',
            'old_value', 'new_value', 'changed_at'
        ]
        read_only_fields = ['id', 'changed_at']


class TaskCommentSerializer(serializers.ModelSerializer):
    """Serializer for TaskComment."""
    
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    
    class Meta:
        model = TaskComment
        fields = [
            'id', 'task', 'author', 'author_name', 'content',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']


class TaskCommentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a task comment."""
    
    class Meta:
        model = TaskComment
        fields = ['content']


class TaskCommentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a task comment."""
    
    class Meta:
        model = TaskComment
        fields = ['content']


class TaskAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for TaskAttachment."""
    
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskAttachment
        fields = [
            'id', 'task', 'uploaded_by', 'uploaded_by_name', 'file',
            'file_url', 'filename', 'file_size', 'mime_type', 'created_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'filename', 'file_size', 'mime_type', 'created_at']
        extra_kwargs = {'file': {'write_only': True}}
    
    def get_file_url(self, obj) -> str | None:
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(
                f'/api/tasks/{obj.task_id}/attachments/{obj.id}/download/'
            )
        return None


class TaskAttachmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a task attachment."""
    
    class Meta:
        model = TaskAttachment
        fields = ['file']
    
    def validate_file(self, value):
        allowed_extensions = {
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt',
            '.png', '.jpg', '.jpeg',
        }
        extension = Path(value.name).suffix.lower()
        if extension not in allowed_extensions:
            raise serializers.ValidationError(
                "This file type is not allowed."
            )

        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError("File size cannot exceed 10MB.")

        header = value.read(8)
        value.seek(0)
        if extension == '.pdf' and not header.startswith(b'%PDF-'):
            raise serializers.ValidationError("The PDF file is invalid.")
        if extension in {'.docx', '.xlsx'} and not zipfile.is_zipfile(value):
            value.seek(0)
            raise serializers.ValidationError("The Office document is invalid.")
        value.seek(0)

        company = get_requested_company(self.context['request'])
        if company and hasattr(company, 'subscription'):
            limit_mb = company.subscription.plan.storage_limit_mb
            if limit_mb > 0:
                used = (
                    TaskAttachment.objects.filter(task__company=company)
                    .aggregate(total=Sum('file_size'))['total']
                    or 0
                )
                if used + value.size > limit_mb * 1024 * 1024:
                    raise serializers.ValidationError(
                        "Your enterprise storage quota has been reached."
                    )
        return value
    
    def create(self, validated_data):
        file = validated_data['file']
        safe_name = Path(file.name).name
        mime_type = mimetypes.guess_type(safe_name)[0] or 'application/octet-stream'
        return TaskAttachment.objects.create(
            task=validated_data['task'],
            uploaded_by=validated_data['uploaded_by'],
            file=file,
            filename=safe_name,
            file_size=file.size,
            mime_type=mime_type,
        )

    def to_representation(self, instance):
        return TaskAttachmentSerializer(
            instance,
            context=self.context,
        ).data


class TaskReportSerializer(serializers.ModelSerializer):
    """Serializer for TaskReport."""
    
    requested_by_name = serializers.CharField(source='requested_by.full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = TaskReport
        fields = [
            'id', 'task', 'task_title', 'requested_by', 'requested_by_name',
            'reviewed_by', 'reviewed_by_name', 'old_due_date', 'new_due_date',
            'reason', 'status', 'status_display', 'review_comment',
            'created_at', 'reviewed_at'
        ]
        read_only_fields = [
            'id', 'task', 'requested_by', 'reviewed_by', 'created_at', 'reviewed_at'
        ]


class TaskReportCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a task report."""
    
    class Meta:
        model = TaskReport
        fields = ['new_due_date', 'reason']
    
    def validate_new_due_date(self, value):
        task = self.context['task']
        if task.due_date is None:
            raise serializers.ValidationError(
                "The task must have a due date before a report can be requested."
            )
        if value <= task.due_date:
            raise serializers.ValidationError("New due date must be after the current due date.")
        return value

    def to_representation(self, instance):
        return TaskReportSerializer(
            instance,
            context=self.context,
        ).data


class TaskReportReviewSerializer(serializers.ModelSerializer):
    """Serializer for reviewing a task report."""
    
    class Meta:
        model = TaskReport
        fields = ['status', 'review_comment']
    
    def validate_status(self, value):
        valid_statuses = ['approved', 'rejected']
        if value not in valid_statuses:
            raise serializers.ValidationError(f"Status must be one of: {', '.join(valid_statuses)}")
        return value

    def validate(self, attrs):
        comment = attrs.get('review_comment', '').strip()
        if attrs.get('status') == 'rejected' and not comment:
            raise serializers.ValidationError({
                'review_comment': "Un motif est obligatoire pour refuser une demande."
            })
        attrs['review_comment'] = comment
        return attrs
