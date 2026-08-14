import os
from urllib.parse import urlparse

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Validate security and external-service settings before deployment.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--allow-http',
            action='store_true',
            help='Allow a temporary HTTP-only internal preproduction environment.',
        )
        parser.add_argument(
            '--require-external-services',
            action='store_true',
            help='Require production SMTP, Turnstile, Google OAuth and a real payment provider.',
        )

    def handle(self, *args, **options):
        errors = []
        warnings = []
        allow_http = options['allow_http']
        require_external = options['require_external_services']

        if settings.DEBUG:
            errors.append('DEBUG doit être désactivé.')
        secret = settings.SECRET_KEY or ''
        if len(secret) < 50 or 'your-secret' in secret or 'insecure' in secret:
            errors.append('SECRET_KEY doit être unique, non factice et contenir au moins 50 caractères.')
        if 'postgresql' not in settings.DATABASES['default']['ENGINE']:
            errors.append('La préproduction doit utiliser PostgreSQL, pas SQLite.')

        allowed_hosts = [host for host in settings.ALLOWED_HOSTS if host]
        if not allowed_hosts or '*' in allowed_hosts:
            errors.append('ALLOWED_HOSTS doit contenir uniquement les hôtes attendus, sans joker.')

        frontend_url = settings.APP_FRONTEND_URL.rstrip('/')
        frontend_origin = _origin(frontend_url)
        if not frontend_origin:
            errors.append('APP_FRONTEND_URL doit être une URL HTTP(S) valide.')
        elif not allow_http and not frontend_origin.startswith('https://'):
            errors.append('APP_FRONTEND_URL doit utiliser HTTPS.')

        cors_origins = [origin.rstrip('/') for origin in settings.CORS_ALLOWED_ORIGINS]
        if not cors_origins or '*' in cors_origins:
            errors.append('CORS_ALLOWED_ORIGINS doit être explicite et ne peut pas contenir de joker.')
        if frontend_origin and frontend_origin not in cors_origins:
            errors.append('L’origine de APP_FRONTEND_URL doit figurer dans CORS_ALLOWED_ORIGINS.')
        if not allow_http and any(not origin.startswith('https://') for origin in cors_origins):
            errors.append('Toutes les origines CORS doivent utiliser HTTPS.')

        trusted_origins = [origin.rstrip('/') for origin in settings.CSRF_TRUSTED_ORIGINS]
        if frontend_origin and frontend_origin not in trusted_origins:
            errors.append('L’origine de APP_FRONTEND_URL doit figurer dans CSRF_TRUSTED_ORIGINS.')

        if not allow_http:
            if not settings.JWT_COOKIE_SECURE:
                errors.append('JWT_COOKIE_SECURE doit être activé sous HTTPS.')
            if not getattr(settings, 'SESSION_COOKIE_SECURE', False):
                errors.append('SESSION_COOKIE_SECURE doit être activé sous HTTPS.')
            if not getattr(settings, 'CSRF_COOKIE_SECURE', False):
                errors.append('CSRF_COOKIE_SECURE doit être activé sous HTTPS.')
            if not getattr(settings, 'SECURE_SSL_REDIRECT', False):
                errors.append('SECURE_SSL_REDIRECT doit être activé sous HTTPS.')
        else:
            warnings.append('HTTP temporaire autorisé : les cookies et échanges ne sont pas protégés en transit.')

        if settings.WEBSOCKET_ALLOW_QUERY_TOKEN:
            errors.append('WEBSOCKET_ALLOW_QUERY_TOKEN doit rester désactivé pour éviter les jetons dans les journaux.')

        self._check_external_services(errors, warnings, require_external)

        for warning in warnings:
            self.stdout.write(self.style.WARNING(f'AVERTISSEMENT: {warning}'))
        if errors:
            for error in errors:
                self.stderr.write(self.style.ERROR(f'ERREUR: {error}'))
            raise CommandError(f'{len(errors)} contrôle(s) de préproduction ont échoué.')

        self.stdout.write(self.style.SUCCESS('Configuration de préproduction cohérente.'))

    def _check_external_services(self, errors, warnings, required):
        def report(message):
            (errors if required else warnings).append(message)

        email_backend = settings.EMAIL_BACKEND
        email_host = (settings.EMAIL_HOST or '').lower()
        if 'smtp' not in email_backend.lower() or email_host in {'', 'mailpit', 'localhost', '127.0.0.1'}:
            report('Un service SMTP transactionnel externe doit remplacer la console ou Mailpit.')
        if required and (not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD):
            errors.append('Les identifiants SMTP externes sont incomplets.')
        if '.local' in settings.DEFAULT_FROM_EMAIL.lower():
            report('DEFAULT_FROM_EMAIL doit utiliser un domaine vérifié, non un domaine .local.')

        turnstile_site_key = os.getenv('VITE_TURNSTILE_SITE_KEY', '')
        if not settings.TURNSTILE_SECRET_KEY or not turnstile_site_key:
            report('La paire Turnstile frontend/backend est incomplète.')

        google_frontend_id = os.getenv('VITE_GOOGLE_CLIENT_ID', '')
        if not settings.GOOGLE_OAUTH_CLIENT_ID or not google_frontend_id:
            report('La configuration Google OAuth frontend/backend est incomplète.')
        elif settings.GOOGLE_OAUTH_CLIENT_ID != google_frontend_id:
            errors.append('Les Client ID Google OAuth frontend et backend doivent être identiques.')

        payment_provider = settings.PAYMENT_PROVIDER.lower()
        if payment_provider not in {'disabled', 'test'}:
            errors.append(f'PAYMENT_PROVIDER={payment_provider!r} n’est pas pris en charge par cette version.')
        elif required:
            errors.append('Aucun fournisseur de paiement réel n’est encore intégré.')
        elif payment_provider == 'test' and not settings.DEBUG:
            warnings.append('Le fournisseur de test ne doit pas être présenté comme un paiement réel.')
        else:
            warnings.append('Les paiements réels restent désactivés.')


def _origin(value):
    parsed = urlparse(value)
    if parsed.scheme not in {'http', 'https'} or not parsed.netloc:
        return ''
    return f'{parsed.scheme}://{parsed.netloc}'
