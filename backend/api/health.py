import redis
from django.conf import settings
from django.db import connection
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@extend_schema(exclude=True)
@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([])
def liveness(request):
    return Response({'status': 'ok'})


@extend_schema(exclude=True)
@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([])
def readiness(request):
    checks = {
        'database': _database_health(),
        'redis': _redis_health(),
    }
    ready = all(value == 'ok' for value in checks.values())
    return Response(
        {'status': 'ok' if ready else 'unavailable', 'checks': checks},
        status=status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE,
    )


def _database_health():
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        return 'ok'
    except Exception:
        return 'unavailable'


def _redis_health():
    try:
        client = redis.Redis.from_url(
            settings.CELERY_BROKER_URL,
            socket_connect_timeout=1,
            socket_timeout=1,
        )
        return 'ok' if client.ping() else 'unavailable'
    except Exception:
        return 'unavailable'
