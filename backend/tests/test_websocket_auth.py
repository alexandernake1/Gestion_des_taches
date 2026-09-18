import asyncio

import pytest
from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.db import connections
from rest_framework_simplejwt.tokens import RefreshToken

from config.asgi import application
from domain.users.models import Role, User


@database_sync_to_async
def close_async_database_connections():
    """Close connections opened by the thread-sensitive ASGI test worker."""
    connections.close_all()


@pytest.mark.django_db(transaction=True)
def test_websocket_authenticates_http_only_access_cookie(db):
    user = User.objects.create_user(
        username='websocket-user',
        email='websocket@example.com',
        password='StrongPass123!',
        role=Role.EMPLOYEE,
    )
    access_token = str(RefreshToken.for_user(user).access_token)
    communicator = WebsocketCommunicator(
        application,
        '/ws/notifications/',
        headers=[
            (b'origin', b'http://localhost'),
            (b'cookie', f'access_token={access_token}'.encode()),
        ],
    )

    async def connect_and_disconnect():
        connected, _ = await communicator.connect()
        await communicator.disconnect()
        await communicator.wait(timeout=1)
        await close_async_database_connections()
        return connected

    assert asyncio.run(connect_and_disconnect()) is True


@pytest.mark.django_db(transaction=True)
def test_websocket_rejects_a_connection_without_access_cookie():
    communicator = WebsocketCommunicator(
        application,
        '/ws/notifications/',
        headers=[(b'origin', b'http://localhost')],
    )

    async def connect_and_wait_for_close():
        connected, _ = await communicator.connect()
        if connected:
            await communicator.disconnect()
        await communicator.wait(timeout=1)
        await close_async_database_connections()
        return connected

    assert asyncio.run(connect_and_wait_for_close()) is False
