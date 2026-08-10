from django.core.management.base import BaseCommand

from domain.companies.models import CompanySubscription
from domain.companies.services import synchronize_subscription_status


class Command(BaseCommand):
    help = "Process reminders, grace periods and automated subscription statuses."

    def handle(self, *args, **options):
        processed = 0
        changed = 0
        queryset = CompanySubscription.objects.select_related('company', 'plan')
        for subscription in queryset.iterator():
            previous = (
                subscription.status,
                subscription.grace_ends_at,
                subscription.renewal_reminder_sent_at,
            )
            synchronize_subscription_status(subscription)
            current = (
                subscription.status,
                subscription.grace_ends_at,
                subscription.renewal_reminder_sent_at,
            )
            processed += 1
            changed += previous != current
        self.stdout.write(self.style.SUCCESS(
            f"{processed} abonnement(s) traité(s), {changed} modifié(s)."
        ))
