from http.cookies import SimpleCookie
from urllib.parse import parse_qs

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
    """
    Authenticate WebSockets with the same HttpOnly JWT cookie as HTTP requests.
    Query-string tokens are disabled by default because URLs are commonly logged.
    """
    async def __call__(self, scope, receive, send):
        token = get_scope_token(scope)

        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)


def get_scope_token(scope):
    headers = dict(scope.get('headers', []))
    raw_cookie = headers.get(b'cookie', b'').decode('latin1')
    cookies = SimpleCookie()
    cookies.load(raw_cookie)
    cookie = cookies.get(settings.JWT_COOKIE_NAME)
    if cookie:
        return cookie.value

    if getattr(settings, 'WEBSOCKET_ALLOW_QUERY_TOKEN', False):
        query_string = scope.get('query_string', b'').decode()
        return parse_qs(query_string).get('token', [None])[0]
    return None
