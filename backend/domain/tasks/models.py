from django.db import models
from domain.companies.models import Company
from domain.users.models import User
from domain.teams.models import Team


class Status(models.TextChoices):
    TODO = 'todo', 'À faire'
    IN_PROGRESS = 'in_progress', 'En cours'
    ON_HOLD = 'on_hold', 'En pause'
    DEFERRED = 'deferred', 'Reportée'
    COMPLETED = 'completed', 'Terminée'


class Priority(models.TextChoices):
    LOW = 'low', 'Faible'
    NORMAL = 'normal', 'Normale'
    HIGH = 'high', 'Haute'
    URGENT = 'urgent', 'Urgente'


class ReportStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'


class ApprovalAction(models.TextChoices):
    TASK_COMPLETION = 'task_completion', 'Clôture de tâche'


class ApprovalStatus(models.TextChoices):
    PENDING = 'pending', 'En attente'
    APPROVED = 'approved', 'Approuvée'
    REJECTED = 'rejected', 'Refusée'


class RecurrenceFrequency(models.TextChoices):
    DAILY = 'daily', 'Quotidienne'
    WEEKLY = 'weekly', 'Hebdomadaire'
    MONTHLY = 'monthly', 'Mensuelle'


class ProjectStatus(models.TextChoices):
    IN_PROGRESS = 'in_progress', 'En cours'
    ON_HOLD = 'on_hold', 'En pause'
    COMPLETED = 'completed', 'Terminé'
    CANCELLED = 'cancelled', 'Annulé'


class ProjectHealth(models.TextChoices):
    ON_TRACK = 'on_track', 'Sur les rails 🟢'
    AT_RISK = 'at_risk', 'En risque 🟠'
    OFF_TRACK = 'off_track', 'En retard 🔴'


class Project(models.Model):
    """Project model for grouping tasks and tracking business initiatives."""

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='projects'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=ProjectStatus.choices,
        default=ProjectStatus.IN_PROGRESS
    )
    health = models.CharField(
        max_length=20,
        choices=ProjectHealth.choices,
        default=ProjectHealth.ON_TRACK
    )
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    manager = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_projects'
    )
    members = models.ManyToManyField(
        User,
        blank=True,
        related_name='joined_projects'
    )
    teams = models.ManyToManyField(
        Team,
        blank=True,
        related_name='projects'
    )
    budget_hours = models.PositiveIntegerField(default=0, help_text="Volume d'heures estimé")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', 'health']),
        ]

    def __str__(self):
        return f"{self.name} ({self.company.name})"

    @property
    def total_tasks_count(self) -> int:
        return self.tasks.filter(is_active=True).count()

    @property
    def completed_tasks_count(self) -> int:
        return self.tasks.filter(is_active=True, status=Status.COMPLETED).count()

    @property
    def progress_percent(self) -> int:
        total = self.total_tasks_count
        if total == 0:
            return 100 if self.status == ProjectStatus.COMPLETED else 0
        return round((self.completed_tasks_count / total) * 100)


class Task(models.Model):
    """Task model for activity tracking."""
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    # Relationships
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='tasks'
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        related_name='tasks',
        null=True,
        blank=True
    )
    creator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='created_tasks',
        null=True
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='assigned_tasks',
        null=True,
        blank=True
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        related_name='tasks',
        null=True,
        blank=True
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        related_name='subtasks',
        null=True,
        blank=True,
    )
    dependencies = models.ManyToManyField(
        'self',
        symmetrical=False,
        related_name='dependent_tasks',
        blank=True,
    )
    
    # Task properties
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TODO
    )
    
    # Dates
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    is_active = models.BooleanField(default=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    recurrence_frequency = models.CharField(
        max_length=20,
        choices=RecurrenceFrequency.choices,
        blank=True,
    )
    recurrence_interval = models.PositiveSmallIntegerField(default=1)
    estimated_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=1,
    )
    requires_completion_approval = models.BooleanField(
        default=False,
        help_text="Exige la validation d'un responsable avant la clôture par un collaborateur.",
    )
    recurrence_end_date = models.DateField(null=True, blank=True)
    next_occurrence = models.OneToOneField(
        'self',
        on_delete=models.SET_NULL,
        related_name='previous_occurrence',
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tasks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company']),
            models.Index(fields=['creator']),
            models.Index(fields=['assigned_to']),
            models.Index(fields=['team']),
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
            models.Index(fields=['due_date']),
            models.Index(fields=['parent']),
        ]
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(start_date__isnull=True)
                    | models.Q(due_date__isnull=True)
                    | models.Q(due_date__gte=models.F('start_date'))
                ),
                name='task_due_date_not_before_start_date',
            ),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"
    
    @property
    def is_overdue(self):
        if self.due_date and self.status != Status.COMPLETED:
            from django.utils import timezone
            return timezone.now().date() > self.due_date
        return False

    @property
    def approval_pending(self):
        annotated = getattr(self, 'pending_approval_flag', None)
        if annotated is not None:
            return annotated
        return self.approval_requests.filter(status=ApprovalStatus.PENDING).exists()

    @property
    def deadline_status(self):
        """State of the deadline, kept separate from the work lifecycle."""
        if self.status == Status.COMPLETED:
            if self.due_date and self.completed_at:
                from django.utils import timezone
                if timezone.localtime(self.completed_at).date() > self.due_date:
                    return 'completed_late'
            return 'completed_on_time'
        if self.is_overdue:
            return 'overdue'
        if self.status == Status.DEFERRED:
            return 'deferred'
        return 'on_time'

    @property
    def deadline_status_display(self):
        return {
            'deferred': 'Reportée',
            'completed_late': 'Terminée en retard',
            'completed_on_time': 'Terminée dans les délais',
            'overdue': 'En retard',
            'on_time': 'Dans les délais',
        }[self.deadline_status]

    @property
    def effective_status_display(self):
        if self.approval_pending:
            return 'En attente de validation'
        if self.deadline_status == 'overdue':
            return 'En retard'
        if self.deadline_status == 'completed_late':
            return 'Terminée en retard'
        return self.get_status_display()

    @property
    def is_blocked(self):
        return (
            self.dependencies.exclude(status=Status.COMPLETED).exists()
            or self.subtasks.filter(is_active=True).exclude(status=Status.COMPLETED).exists()
        )

    @property
    def progress_percent(self) -> int | None:
        total = self.subtasks.filter(is_active=True).count()
        if total == 0:
            return None
        completed = self.subtasks.filter(
            is_active=True,
            status=Status.COMPLETED,
        ).count()
        return round(completed * 100 / total)


class ApprovalRequest(models.Model):
    """Trace a sensitive task action submitted for managerial approval."""

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='approval_requests',
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='approval_requests',
    )
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='submitted_approval_requests',
        null=True,
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='reviewed_approval_requests',
        null=True,
        blank=True,
    )
    action = models.CharField(
        max_length=40,
        choices=ApprovalAction.choices,
        default=ApprovalAction.TASK_COMPLETION,
    )
    status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
    )
    reason = models.TextField()
    review_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'approval_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['task', 'status']),
            models.Index(fields=['requested_by', 'status']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['task', 'action'],
                condition=models.Q(status=ApprovalStatus.PENDING),
                name='uniq_pending_task_approval',
            ),
        ]

    def __str__(self):
        return f"{self.get_action_display()} - {self.task.title} ({self.status})"


class TaskTemplate(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='task_templates',
    )
    creator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='task_templates',
        null=True,
    )
    name = models.CharField(max_length=120)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL,
    )
    default_duration_days = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )
    estimated_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=1,
    )
    is_active = models.BooleanField(default=True)
    is_shared = models.BooleanField(
        default=True,
        help_text="True if shared with company, False if personal to creator",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'task_templates'
        ordering = ['name']

    def __str__(self):
        return self.name


class TaskHistory(models.Model):
    """History tracking for task changes."""
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='history'
    )
    changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True
    )
    field_name = models.CharField(max_length=100)
    old_value = models.TextField(blank=True, null=True)
    new_value = models.TextField(blank=True, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'task_history'
        ordering = ['-changed_at']
        indexes = [
            models.Index(fields=['task']),
            models.Index(fields=['changed_by']),
        ]
    
    def __str__(self):
        return f"{self.task.title} - {self.field_name} changed by {self.changed_by}"


class TaskComment(models.Model):
    """Comments on tasks."""
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'task_comments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['task']),
            models.Index(fields=['author']),
        ]
    
    def __str__(self):
        return f"Comment on {self.task.title} by {self.author}"


class TaskAttachment(models.Model):
    """File attachments for tasks."""
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True
    )
    file = models.FileField(upload_to='task_attachments/')
    filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()
    mime_type = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'task_attachments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['task']),
            models.Index(fields=['uploaded_by']),
        ]
    
    def __str__(self):
        return f"{self.filename} attached to {self.task.title}"


class TaskReport(models.Model):
    """Task延期 (report/de延期) requests."""
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='reports'
    )
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='requested_reports',
        null=True
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='reviewed_reports',
        null=True,
        blank=True
    )
    
    old_due_date = models.DateField()
    new_due_date = models.DateField()
    reason = models.TextField()
    
    status = models.CharField(
        max_length=20,
        choices=ReportStatus.choices,
        default=ReportStatus.PENDING,
    )
    review_comment = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'task_reports'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['task']),
            models.Index(fields=['requested_by']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Report for {self.task.title} - {self.status}"
