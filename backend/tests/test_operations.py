from unittest.mock import Mock, patch

import pytest
import redis
from rest_framework.test import APIClient


@pytest.mark.django_db
@patch('api.views.redis.Redis.from_url')
def test_health_check_reports_ready_dependencies(redis_from_url):
    redis_from_url.return_value = Mock(ping=Mock(return_value=True))

    response = APIClient().get('/api/health/')

    assert response.status_code == 200
    assert response.data == {'status': 'ok'}


@pytest.mark.django_db
@patch('api.views.redis.Redis.from_url')
def test_health_check_returns_503_when_redis_is_unavailable(redis_from_url):
    redis_from_url.return_value = Mock(
        ping=Mock(side_effect=redis.RedisError('Redis unavailable')),
    )

    response = APIClient().get('/api/health/')

    assert response.status_code == 503
    assert response.data == {'status': 'unavailable'}


def test_celery_discovers_scheduled_tasks():
    from config.celery import app

    app.loader.import_default_modules()

    assert 'domain.companies.tasks.process_subscription_lifecycle' in app.tasks
    assert 'domain.notifications.tasks.process_smart_notifications' in app.tasks
    assert 'process-subscription-lifecycle-hourly' in app.conf.beat_schedule
    assert 'process-smart-notifications-hourly' in app.conf.beat_schedule
