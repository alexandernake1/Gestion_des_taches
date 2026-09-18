from django.conf import settings
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication


def enforce_csrf(request):
    """Apply Django's CSRF validation to cookie-authenticated API requests."""

    def dummy_get_response(_request):
        return None

    check = CSRFCheck(dummy_get_response)
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        raise exceptions.PermissionDenied(
            'La vérification de sécurité de la requête a échoué.'
        )


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom authentication class that reads the JWT access token from an HttpOnly cookie.
    If the cookie is not present, it falls back to the standard Authorization header.
    """
    def authenticate(self, request):
        header = self.get_header(request)
        uses_cookie = header is None
        if header is None:
            raw_token = request.COOKIES.get(getattr(settings, 'JWT_COOKIE_NAME', 'access_token'))
        else:
            raw_token = self.get_raw_token(header)
            
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        if uses_cookie:
            enforce_csrf(request)
        return user, validated_token

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if (
            not user.is_superuser
            and user.company_id
            and not user.company.is_active
        ):
            raise exceptions.AuthenticationFailed(
                "L'espace de travail de votre entreprise a été désactivé.",
                code='company_inactive',
            )
        return user


class CookieJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = CookieJWTAuthentication
    name = 'cookieJwtAuth'

    def get_security_definition(self, auto_schema):
        return {
            'type': 'apiKey',
            'in': 'cookie',
            'name': settings.JWT_COOKIE_NAME,
        }
