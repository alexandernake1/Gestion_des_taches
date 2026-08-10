from celery import shared_task

from .models import CompanySubscription
from .services import synchronize_subscription_status


@shared_task
def process_subscription_lifecycle():
    processed = 0
    for subscription in CompanySubscription.objects.select_related(
        'company',
        'plan',
    ).iterator():
        synchronize_subscription_status(subscription)
        processed += 1
    return processed

