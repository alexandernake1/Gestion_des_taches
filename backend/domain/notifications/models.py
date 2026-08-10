from django.db import models
from domain.users.models import User
from domain.tasks.models import Task


class NotificationType(models.TextChoices):
    NEW_TASK = 'new_task', 'Nouvelle tâche'
    COMMENT = 'comment', 'Commentaire'
    REPORT_APPROVED = 'report_approved', 'Report accepté'
    REPORT_REJECTED = 'report_rejected', 'Report refusé'
    NEW_ASSIGNMENT = 'new_assignment', 'Nouvelle assignation'
    TASK_COMPLETED = 'task_completed', 'Tâche terminée'
    SUBSCRIPTION_REMINDER = 'subscription_reminder', 'Rappel d’abonnement'
    PAYMENT_SUCCEEDED = 'payment_succeeded', 'Paiement réussi'
    PAYMENT_FAILED = 'payment_failed', 'Paiement échoué'
    SUBSCRIPTION_SUSPENDED = 'subscription_suspended', 'Abonnement suspendu'
    TASK_DUE_SOON = 'task_due_soon', 'Échéance proche'
    TASK_OVERDUE = 'task_overdue', 'Tâche en retard'
    DAILY_DIGEST = 'daily_digest', 'Résumé quotidien'


class Notification(models.Model):
    """Notification model for user alerts."""
    
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    type = models.CharField(
        max_length=50,
        choices=NotificationType.choices
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    # Optional related objects
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True
    )
    
    is_read = models.BooleanField(default=False)
    dedupe_key = models.CharField(max_length=160, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient']),
            models.Index(fields=['is_read']),
            models.Index(fields=['type']),
            models.Index(fields=['-created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['recipient', 'dedupe_key'],
                condition=~models.Q(dedupe_key=''),
                name='unique_notification_dedupe_per_recipient',
            ),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.recipient.email}"


class NotificationPreference(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='notification_preferences',
    )
    assignments_enabled = models.BooleanField(default=True)
    comments_enabled = models.BooleanField(default=True)
    task_reminders_enabled = models.BooleanField(default=True)
    overdue_alerts_enabled = models.BooleanField(default=True)
    daily_digest_enabled = models.BooleanField(default=True)
    subscription_alerts_enabled = models.BooleanField(default=True)
    reminder_days_before = models.PositiveSmallIntegerField(default=2)
    digest_hour = models.PositiveSmallIntegerField(default=8)
    last_digest_sent_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notification_preferences'

    def __str__(self):
        return f"Preferences - {self.user.email}"
