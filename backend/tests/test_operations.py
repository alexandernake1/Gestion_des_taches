from io import StringIO
from unittest.mock import Mock, patch

import pytest
import redis
from django.conf import settings as django_settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings
from rest_framework.test import APIClient

from common.middlewares import get_scope_token


def test_liveness_endpoint_is_public():
    response = APIClient().get('/api/health/live/')

    assert response.status_code == 200
    assert response.data == {'status': 'ok'}


@pytest.mark.django_db
@patch('api.health._redis_health', return_value='ok')
def test_readiness_reports_dependencies_as_available(_redis_health):
    response = APIClient().get('/api/health/ready/')

    assert response.status_code == 200
    assert response.data == {
        'status': 'ok',
        'checks': {'database': 'ok', 'redis': 'ok'},
    }


@pytest.mark.django_db
@patch('api.health._redis_health', return_value='unavailable')
def test_readiness_returns_503_when_redis_is_unavailable(_redis_health):
    response = APIClient().get('/api/health/ready/')

    assert response.status_code == 503
    assert response.data['status'] == 'unavailable'
    assert response.data['checks']['redis'] == 'unavailable'


@pytest.mark.django_db
@patch('api.views.redis.Redis.from_url')
def test_legacy_health_check_reports_ready_dependencies(redis_from_url):
    redis_from_url.return_value = Mock(ping=Mock(return_value=True))

    response = APIClient().get('/api/health/')

    assert response.status_code == 200
    assert response.data == {'status': 'ok'}


@pytest.mark.django_db
@patch('api.views.redis.Redis.from_url')
def test_legacy_health_check_returns_503_when_redis_is_unavailable(redis_from_url):
    redis_from_url.return_value = Mock(
        ping=Mock(side_effect=redis.RedisError('Redis unavailable')),
    )

    response = APIClient().get('/api/health/')

    assert response.status_code == 503
    assert response.data == {'status': 'unavailable'}


@override_settings(JWT_COOKIE_NAME='access_token', WEBSOCKET_ALLOW_QUERY_TOKEN=False)
def test_websocket_token_comes_from_http_only_cookie_scope():
    scope = {
        'headers': [(b'cookie', b'access_token=cookie-token; other=value')],
        'query_string': b'token=query-token',
    }

    assert get_scope_token(scope) == 'cookie-token'


@override_settings(JWT_COOKIE_NAME='access_token', WEBSOCKET_ALLOW_QUERY_TOKEN=False)
def test_websocket_query_token_is_rejected_by_default():
    scope = {'headers': [], 'query_string': b'token=query-token'}

    assert get_scope_token(scope) is None


def test_celery_discovers_scheduled_tasks():
    from config.celery import app

    app.loader.import_default_modules()

    assert 'domain.companies.tasks.process_subscription_lifecycle' in app.tasks
    assert 'domain.notifications.tasks.process_smart_notifications' in app.tasks
    assert 'domain.users.tasks.purge_audit_logs_task' in app.tasks
    assert 'process-subscription-lifecycle-hourly' in app.conf.beat_schedule
    assert 'process-smart-notifications-hourly' in app.conf.beat_schedule
    assert 'purge-audit-logs-daily' in app.conf.beat_schedule


@override_settings(
    DEBUG=False,
    SECRET_KEY='a-secure-preproduction-key-with-more-than-fifty-characters-123456',
    ALLOWED_HOSTS=['preprod.example.test'],
    APP_FRONTEND_URL='https://preprod.example.test',
    CORS_ALLOWED_ORIGINS=['https://preprod.example.test'],
    CSRF_TRUSTED_ORIGINS=['https://preprod.example.test'],
    JWT_COOKIE_SECURE=True,
    SESSION_COOKIE_SECURE=True,
    CSRF_COOKIE_SECURE=True,
    SECURE_SSL_REDIRECT=True,
    WEBSOCKET_ALLOW_QUERY_TOKEN=False,
    PAYMENT_PROVIDER='disabled',
)
@patch.object(
    django_settings,
    'DATABASES',
    {'default': {'ENGINE': 'django.db.backends.postgresql'}},
)
def test_preproduction_configuration_check_accepts_secure_core_settings():
    output = StringIO()

    call_command('check_preproduction', stdout=output)

    assert 'Configuration de préproduction cohérente' in output.getvalue()


@override_settings(DEBUG=True)
def test_preproduction_configuration_check_rejects_debug():
    with pytest.raises(CommandError):
        call_command('check_preproduction', stderr=StringIO())
