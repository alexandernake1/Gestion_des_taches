from datetime import timedelta

from django.utils import timezone

from domain.tasks.models import Status, Task

from .models import Notification, NotificationPreference, NotificationType


def get_preferences(user):
    preference, _ = NotificationPreference.objects.get_or_create(user=user)
    return preference


def create_smart_notification(
    *,
    recipient,
    notification_type,
    title,
    message,
    task=None,
    dedupe_key='',
):
    preferences = get_preferences(recipient)
    preference_map = {
        NotificationType.NEW_ASSIGNMENT: preferences.assignments_enabled,
        NotificationType.COMMENT: preferences.comments_enabled,
        NotificationType.TASK_DUE_SOON: preferences.task_reminders_enabled,
        NotificationType.TASK_OVERDUE: preferences.overdue_alerts_enabled,
        NotificationType.DAILY_DIGEST: preferences.daily_digest_enabled,
        NotificationType.SUBSCRIPTION_REMINDER: preferences.subscription_alerts_enabled,
        NotificationType.PAYMENT_SUCCEEDED: preferences.subscription_alerts_enabled,
        NotificationType.PAYMENT_FAILED: preferences.subscription_alerts_enabled,
        NotificationType.SUBSCRIPTION_SUSPENDED: preferences.subscription_alerts_enabled,
    }
    if preference_map.get(notification_type, True) is False:
        return None, False
    return Notification.objects.get_or_create(
        recipient=recipient,
        dedupe_key=dedupe_key,
        defaults={
            'type': notification_type,
            'title': title,
            'message': message,
            'task': task,
        },
    ) if dedupe_key else (
        Notification.objects.create(
            recipient=recipient,
            type=notification_type,
            title=title,
            message=message,
            task=task,
        ),
        True,
    )


def process_user_notifications(user, now=None):
    now = now or timezone.localtime()
    today = now.date()
    preferences = get_preferences(user)
    tasks = Task.objects.filter(
        assigned_to=user,
        is_active=True,
    ).exclude(status=Status.COMPLETED)
    created = 0

    if preferences.task_reminders_enabled:
        reminder_date = today + timedelta(days=preferences.reminder_days_before)
        for task in tasks.filter(due_date=reminder_date):
            _, was_created = create_smart_notification(
                recipient=user,
                notification_type=NotificationType.TASK_DUE_SOON,
                title='Échéance à venir',
                message=f"La tâche « {task.title} » arrive à échéance dans {preferences.reminder_days_before} jour(s).",
                task=task,
                dedupe_key=f'due:{task.id}:{task.due_date}',
            )
            created += was_created

    if preferences.overdue_alerts_enabled:
        for task in tasks.filter(due_date__lt=today):
            _, was_created = create_smart_notification(
                recipient=user,
                notification_type=NotificationType.TASK_OVERDUE,
                title='Tâche en retard',
                message=f"La tâche « {task.title} » est en retard depuis le {task.due_date:%d/%m/%Y}.",
                task=task,
                dedupe_key=f'overdue:{task.id}:{today}',
            )
            created += was_created

    if (
        preferences.daily_digest_enabled
        and now.hour == preferences.digest_hour
        and preferences.last_digest_sent_date != today
    ):
        due_today = tasks.filter(due_date=today).count()
        overdue = tasks.filter(due_date__lt=today).count()
        in_progress = tasks.filter(status=Status.IN_PROGRESS).count()
        create_smart_notification(
            recipient=user,
            notification_type=NotificationType.DAILY_DIGEST,
            title='Votre résumé du jour',
            message=f"{in_progress} tâche(s) en cours, {due_today} à terminer aujourd’hui et {overdue} en retard.",
            dedupe_key=f'digest:{today}',
        )
        preferences.last_digest_sent_date = today
        preferences.save(update_fields=['last_digest_sent_date', 'updated_at'])
        created += 1
    return created
