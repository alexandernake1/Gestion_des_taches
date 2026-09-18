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
            help='Require production SMTP and Turnstile for a public launch.',
        )

    def handle(self, *args, **options):
        errors = []
        warnings = []
        allow_http = options['allow_http']
        require_external = options['require_external_services']

        if settings.DEBUG:
            errors.append('DEBUG doit être désactivé.')
        secret = settings.SECRET_KEY or ''
        if (
            len(secret) < 50
            or any(marker in secret.lower() for marker in ('your-secret', 'insecure', 'replace-', 'change-this'))
        ):
            errors.append('SECRET_KEY doit être unique, non factice et contenir au moins 50 caractères.')
        if 'postgresql' not in settings.DATABASES['default']['ENGINE']:
            errors.append('La préproduction doit utiliser PostgreSQL, pas SQLite.')
        database_password = settings.DATABASES['default'].get('PASSWORD') or ''
        if (
            len(database_password) < 16
            or database_password.lower() in {'postgres', 'password', 'changeme'}
            or 'change-this' in database_password.lower()
        ):
            errors.append('DB_PASSWORD doit être unique et contenir au moins 16 caractères.')

        allowed_hosts = [host for host in settings.ALLOWED_HOSTS if host]
        if not allowed_hosts or '*' in allowed_hosts:
            errors.append('ALLOWED_HOSTS doit contenir uniquement les hôtes attendus, sans joker.')
        if any(_is_placeholder_host(host) for host in allowed_hosts):
            errors.append('ALLOWED_HOSTS contient encore un domaine d’exemple.')
        if not allow_http and any(_is_local_host(host) for host in allowed_hosts):
            errors.append('ALLOWED_HOSTS ne doit pas contenir une adresse locale sous HTTPS public.')

        site_addresses = [value.strip() for value in os.getenv('SITE_ADDRESS', '').split(',') if value.strip()]
        site_hosts = {_site_host(value) for value in site_addresses}
        site_hosts.discard('')
        if not site_addresses:
            errors.append('SITE_ADDRESS doit déclarer le ou les domaines servis par Caddy.')
        elif any(_is_placeholder_host(host) for host in site_hosts):
            errors.append('SITE_ADDRESS contient encore un domaine d’exemple.')
        elif not allow_http:
            if any(value.lower().startswith('http://') for value in site_addresses):
                errors.append('SITE_ADDRESS doit activer le HTTPS automatique de Caddy.')
            missing_hosts = set(allowed_hosts) - site_hosts
            if missing_hosts:
                errors.append(
                    'SITE_ADDRESS ne couvre pas tous les domaines de ALLOWED_HOSTS: '
                    + ', '.join(sorted(missing_hosts))
                )

        frontend_url = settings.APP_FRONTEND_URL.rstrip('/')
        frontend_origin = _origin(frontend_url)
        if not frontend_origin:
            errors.append('APP_FRONTEND_URL doit être une URL HTTP(S) valide.')
        elif _is_placeholder_host(urlparse(frontend_origin).hostname or ''):
            errors.append('APP_FRONTEND_URL contient encore un domaine d’exemple.')
        elif not allow_http and _is_local_host(urlparse(frontend_origin).hostname or ''):
            errors.append('APP_FRONTEND_URL ne doit pas utiliser une adresse locale sous HTTPS public.')
        elif not allow_http and not frontend_origin.startswith('https://'):
            errors.append('APP_FRONTEND_URL doit utiliser HTTPS.')
        elif not allow_http and (urlparse(frontend_origin).hostname or '') not in site_hosts:
            errors.append('Le domaine de APP_FRONTEND_URL doit être déclaré dans SITE_ADDRESS.')

        cors_origins = [origin.rstrip('/') for origin in settings.CORS_ALLOWED_ORIGINS]
        if not cors_origins or '*' in cors_origins:
            errors.append('CORS_ALLOWED_ORIGINS doit être explicite et ne peut pas contenir de joker.')
        if frontend_origin and frontend_origin not in cors_origins:
            errors.append('L’origine de APP_FRONTEND_URL doit figurer dans CORS_ALLOWED_ORIGINS.')
        if not allow_http and any(not origin.startswith('https://') for origin in cors_origins):
            errors.append('Toutes les origines CORS doivent utiliser HTTPS.')

        trusted_origins = [origin.rstrip('/') for origin in settings.CSRF_TRUSTED_ORIGINS]
        if not trusted_origins or '*' in trusted_origins:
            errors.append('CSRF_TRUSTED_ORIGINS doit être explicite et ne peut pas contenir de joker.')
        if frontend_origin and frontend_origin not in trusted_origins:
            errors.append('L’origine de APP_FRONTEND_URL doit figurer dans CSRF_TRUSTED_ORIGINS.')
        if not allow_http and any(not origin.startswith('https://') for origin in trusted_origins):
            errors.append('Toutes les origines CSRF doivent utiliser HTTPS.')

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
        if settings.REST_FRAMEWORK.get('NUM_PROXIES') != 2:
            errors.append('TRUSTED_PROXY_COUNT doit valoir 2 pour la chaîne Caddy → Nginx.')
        if not settings.DEBUG and settings.ALLOW_TEST_PAYMENT_SIMULATOR:
            errors.append('ALLOW_TEST_PAYMENT_SIMULATOR doit être désactivé hors développement.')

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
        if any(marker in settings.DEFAULT_FROM_EMAIL.lower() for marker in ('.local', 'example.com', 'example.test')):
            report('DEFAULT_FROM_EMAIL doit utiliser un domaine d’envoi vérifié, non une valeur d’exemple.')

        turnstile_site_key = os.getenv('VITE_TURNSTILE_SITE_KEY', '')
        if not settings.TURNSTILE_SECRET_KEY or not turnstile_site_key:
            report('La paire Turnstile frontend/backend est incomplète.')

        google_frontend_id = os.getenv('VITE_GOOGLE_CLIENT_ID', '')
        google_backend_id = settings.GOOGLE_OAUTH_CLIENT_ID
        if bool(google_backend_id) != bool(google_frontend_id):
            errors.append('La configuration Google OAuth doit être renseignée à la fois côté frontend et backend.')
        elif google_backend_id and google_backend_id != google_frontend_id:
            errors.append('Les Client ID Google OAuth frontend et backend doivent être identiques.')
        elif not google_backend_id:
            warnings.append('Google OAuth reste désactivé ; la connexion email demeure disponible.')

        payment_provider = settings.PAYMENT_PROVIDER.lower()
        if payment_provider not in {'disabled', 'test'}:
            errors.append(f'PAYMENT_PROVIDER={payment_provider!r} n’est pas pris en charge par cette version.')
        elif payment_provider == 'test' and not settings.DEBUG:
            errors.append('PAYMENT_PROVIDER=test est interdit hors développement.')
        else:
            warnings.append('Les paiements réels restent désactivés.')


def _origin(value):
    parsed = urlparse(value)
    if parsed.scheme not in {'http', 'https'} or not parsed.netloc:
        return ''
    return f'{parsed.scheme}://{parsed.netloc}'


def _is_placeholder_host(host):
    normalized = host.lower().split(':', 1)[0]
    return normalized == 'example.com' or normalized.endswith(('.example.com', '.example.test'))


def _is_local_host(host):
    normalized = host.lower().strip()
    if normalized.startswith('[') and ']' in normalized:
        normalized = normalized[1:normalized.index(']')]
    elif normalized.count(':') == 1:
        normalized = normalized.split(':', 1)[0]
    return normalized in {'localhost', '127.0.0.1', '::1'}


def _site_host(value):
    parsed = urlparse(value if '://' in value else f'//{value}')
    return (parsed.hostname or '').lower()
