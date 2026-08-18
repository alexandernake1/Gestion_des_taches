from celery import shared_task
from django.core.management import call_command


@shared_task
def purge_audit_logs_task(days=365):
    """Tâche périodique Celery Beat pour purger les logs d'audit datant de plus de 365 jours."""
    call_command('purge_audit_logs', days=days)
    return f"Audit logs purge executed for retention period of {days} days."
