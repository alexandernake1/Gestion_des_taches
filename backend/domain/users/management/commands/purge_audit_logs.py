from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

from domain.companies.models import PlatformAuditLog
from domain.users.models import UserAuditLog


class Command(BaseCommand):
    help = "Purge les journaux d'audit (UserAuditLog et PlatformAuditLog) antérieurs à la période de rétention (365 jours par défaut)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=365,
            help="Nombre de jours de rétention glissante (défaut : 365).",
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Simule l'opération sans supprimer de données en base.",
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']

        if days < 1:
            self.stderr.write(self.style.ERROR("Le nombre de jours de rétention doit être supérieur ou égal à 1."))
            return

        cutoff = timezone.now() - timedelta(days=days)
        cutoff_str = cutoff.strftime('%Y-%m-%d %H:%M:%S %Z')

        user_logs_qs = UserAuditLog.objects.filter(created_at__lt=cutoff)
        platform_logs_qs = PlatformAuditLog.objects.filter(created_at__lt=cutoff)

        user_count = user_logs_qs.count()
        platform_count = platform_logs_qs.count()
        total_count = user_count + platform_count

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"[SIMULATION] Rétention : {days} jours (antérieur au {cutoff_str}).\n"
                    f"- {user_count} journal(aux) d'audit utilisateur à purger.\n"
                    f"- {platform_count} journal(aux) d'audit plateforme à purger.\n"
                    f"Total : {total_count} enregistrement(s) à supprimer."
                )
            )
            return

        user_deleted, _ = user_logs_qs.delete()
        platform_deleted, _ = platform_logs_qs.delete()
        total_deleted = user_deleted + platform_deleted

        self.stdout.write(
            self.style.SUCCESS(
                f"Purge des journaux d'audit effectuée avec succès (antérieurs au {cutoff_str}) :\n"
                f"- {user_deleted} journal(aux) d'audit utilisateur supprimé(s).\n"
                f"- {platform_deleted} journal(aux) d'audit plateforme supprimé(s).\n"
                f"Total : {total_deleted} enregistrement(s) supprimé(s)."
            )
        )
