import asyncio

import pytest
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import RefreshToken

from config.asgi import application
from domain.users.models import Role, User


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
        return connected

    assert asyncio.run(connect_and_disconnect()) is True


def test_websocket_rejects_a_connection_without_access_cookie():
    communicator = WebsocketCommunicator(
        application,
        '/ws/notifications/',
        headers=[(b'origin', b'http://localhost')],
    )

    async def connect():
        connected, _ = await communicator.connect()
        return connected

    assert asyncio.run(connect()) is False
