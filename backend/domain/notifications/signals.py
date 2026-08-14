from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from domain.tasks.models import Task, Status, TaskComment, TaskReport
from domain.notifications.models import NotificationType
from domain.notifications.services import create_smart_notification
from domain.users.models import Role, User


def notify_managers_of_assignment(instance, event_key):
    """Give managers the assignment context that differs from the assignee copy."""
    if instance.assigned_to:
        target = instance.assigned_to.full_name or instance.assigned_to.email
    elif instance.team:
        target = f"l'équipe {instance.team.name}"
    else:
        return

    reviewers = User.objects.filter(
        company=instance.company,
        role__in=[Role.OWNER, Role.MANAGER],
        is_active=True,
    )
    if instance.assigned_to_id:
        reviewers = reviewers.exclude(pk=instance.assigned_to_id)
    for reviewer in reviewers:
        create_smart_notification(
            recipient=reviewer,
            notification_type=NotificationType.NEW_ASSIGNMENT,
            title="Affectation d'une tâche",
            message=f"La tâche « {instance.title} » a été assignée à {target}.",
            task=instance,
            dedupe_key=f'manager-assignment:{instance.id}:{event_key}:{reviewer.id}',
        )

@receiver(pre_save, sender=Task)
def task_pre_save(sender, instance, **kwargs):
    """Capture the current state before the save so we can detect transitions."""
    if instance.pk:
        try:
            old_task = Task.objects.filter(pk=instance.pk).values('status', 'assigned_to_id', 'team_id').get()
            instance._previous_status = old_task['status']
            instance._previous_assigned_to_id = old_task['assigned_to_id']
            instance._previous_team_id = old_task['team_id']
        except Task.DoesNotExist:
            pass


@receiver(post_save, sender=Task)
def task_post_save(sender, instance, created, **kwargs):
    """Generate notifications on task creation or assignment/status changes."""
    if created:
        # Notify individual assignee (if different from creator).
        if instance.assigned_to and instance.assigned_to != instance.creator:
            create_smart_notification(
                recipient=instance.assigned_to,
                notification_type=NotificationType.NEW_ASSIGNMENT,
                title="Nouvelle tâche assignée",
                message=f"La tâche « {instance.title} » vous a été assignée.",
                task=instance,
                dedupe_key=f'assignment:{instance.id}:{instance.assigned_to_id}',
            )

        # Notify all members of the assigned team (if any).
        if instance.team:
            excluded_ids = [instance.creator_id, instance.assigned_to_id]
            for member in instance.team.members.exclude(pk__in=[pk for pk in excluded_ids if pk]):
                create_smart_notification(
                    recipient=member,
                    notification_type=NotificationType.NEW_ASSIGNMENT,
                    title="Nouvelle tâche d'équipe",
                    message=f"La tâche « {instance.title} » a été assignée à votre équipe « {instance.team.name} ».",
                    task=instance,
                    dedupe_key=f'team-assignment:{instance.id}:{member.id}',
                )
        notify_managers_of_assignment(instance, 'created')
    else:
        # Check if the task was reassigned
        prev_assigned = getattr(instance, '_previous_assigned_to_id', None)
        if instance.assigned_to_id and instance.assigned_to_id != prev_assigned and instance.assigned_to != instance.creator:
            create_smart_notification(
                recipient=instance.assigned_to,
                notification_type=NotificationType.NEW_ASSIGNMENT,
                title="Nouvelle tâche assignée",
                message=f"La tâche « {instance.title} » vous a été assignée.",
                task=instance,
                dedupe_key=f'assignment:{instance.id}:{instance.assigned_to_id}',
            )
            notify_managers_of_assignment(instance, f'user-{instance.assigned_to_id}')

        # Check if the task team was changed
        prev_team = getattr(instance, '_previous_team_id', None)
        if instance.team_id and instance.team_id != prev_team:
            excluded_ids = [instance.creator_id, instance.assigned_to_id]
            for member in instance.team.members.exclude(pk__in=[pk for pk in excluded_ids if pk]):
                create_smart_notification(
                    recipient=member,
                    notification_type=NotificationType.NEW_ASSIGNMENT,
                    title="Nouvelle tâche d'équipe",
                    message=f"La tâche « {instance.title} » a été assignée à votre équipe « {instance.team.name} ».",
                    task=instance,
                    dedupe_key=f'team-assignment:{instance.id}:{member.id}',
                )
            if not instance.assigned_to_id or instance.assigned_to_id == prev_assigned:
                notify_managers_of_assignment(instance, f'team-{instance.team_id}')

        # Only notify when the status *transitions* to COMPLETED (not on repeated saves).
        prev = getattr(instance, '_previous_status', None)
        if (
            prev is not None
            and prev != Status.COMPLETED
            and instance.status == Status.COMPLETED
            and instance.creator
            and instance.assigned_to
            and instance.assigned_to != instance.creator
        ):
            create_smart_notification(
                recipient=instance.creator,
                notification_type=NotificationType.TASK_COMPLETED,
                title="Tâche terminée",
                message=f"La tâche '{instance.title}' a été marquée comme terminée par {instance.assigned_to.full_name}.",
                task=instance,
                dedupe_key=f'completed:{instance.id}',
            )


@receiver(post_save, sender=TaskComment)
def comment_post_save(sender, instance, created, **kwargs):
    """Generate notification when a comment is added to a task."""
    if created and instance.task:
        task = instance.task
        recipients = set()

        if task.creator and task.creator != instance.author:
            recipients.add(task.creator)
        if task.assigned_to and task.assigned_to != instance.author:
            recipients.add(task.assigned_to)

        author_name = instance.author.full_name if instance.author else "Un utilisateur"
        for recipient in recipients:
            create_smart_notification(
                recipient=recipient,
                notification_type=NotificationType.COMMENT,
                title="Nouveau commentaire",
                message=f"{author_name} a commenté la tâche '{task.title}'.",
                task=task,
                dedupe_key=f'comment:{instance.id}:{recipient.id}',
            )


@receiver(pre_save, sender=TaskReport)
def report_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._previous_status = (
                TaskReport.objects.filter(pk=instance.pk)
                .values_list('status', flat=True)
                .get()
            )
        except TaskReport.DoesNotExist:
            pass


@receiver(post_save, sender=TaskReport)
def report_post_save(sender, instance, created, **kwargs):
    """Generate notification when a task report is reviewed."""
    previous = getattr(instance, '_previous_status', None)
    if (
        not created
        and previous == 'pending'
        and instance.status in ['approved', 'rejected']
        and instance.requested_by
    ):
        notif_type = (
            NotificationType.REPORT_APPROVED
            if instance.status == 'approved'
            else NotificationType.REPORT_REJECTED
        )
        status_label = "acceptée" if instance.status == 'approved' else "refusée"

        create_smart_notification(
            recipient=instance.requested_by,
            notification_type=notif_type,
            title=f"Demande de report {status_label}",
            message=f"Votre demande de report pour la tâche '{instance.task.title}' a été {status_label}.",
            task=instance.task,
            dedupe_key=f'report:{instance.id}:{instance.status}',
        )

from domain.notifications.models import Notification

@receiver(post_save, sender=Notification)
def send_websocket_notification(sender, instance, created, **kwargs):
    if created:
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            from domain.notifications.serializers import NotificationSerializer
            
            channel_layer = get_channel_layer()
            if channel_layer:
                group_name = f"user_{instance.recipient.id}"
                data = NotificationSerializer(instance).data
                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        'type': 'send_notification',
                        'message': data
                    }
                )
        except Exception:
            # Channels or Redis not available
            pass
