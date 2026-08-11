from http.cookies import SimpleCookie

from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from domain.users.models import User

@database_sync_to_async
def get_user_from_token(token_key):
    try:
        access_token = AccessToken(token_key)
        user_id = access_token['user_id']
        return User.objects.get(id=user_id)
    except (TokenError, InvalidToken, User.DoesNotExist):
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    """Authenticate same-origin WebSockets with the HttpOnly access cookie."""

    @staticmethod
    def get_access_token(scope):
        headers = dict(scope.get('headers', []))
        raw_cookie_header = headers.get(b'cookie', b'').decode('latin-1')
        cookies = SimpleCookie()
        cookies.load(raw_cookie_header)
        cookie_name = getattr(settings, 'JWT_COOKIE_NAME', 'access_token')
        access_cookie = cookies.get(cookie_name)
        return access_cookie.value if access_cookie else None

    async def __call__(self, scope, receive, send):
        token = self.get_access_token(scope)

        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
