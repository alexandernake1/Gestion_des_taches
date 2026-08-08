from celery import shared_task
from django.utils import timezone

from domain.users.models import User

from .services import process_user_notifications


@shared_task
def process_smart_notifications():
    created = 0
    now = timezone.localtime()
    for user in User.objects.filter(is_active=True, company__isnull=False).iterator():
        created += process_user_notifications(user, now)
    return created

