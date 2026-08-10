from django.core.management.base import BaseCommand

from domain.notifications.tasks import process_smart_notifications


class Command(BaseCommand):
    help = "Generate reminders, overdue alerts and daily summaries."

    def handle(self, *args, **options):
        created = process_smart_notifications()
        self.stdout.write(self.style.SUCCESS(
            f"{created} notification(s) intelligente(s) créée(s)."
        ))
