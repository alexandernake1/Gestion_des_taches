"""Security helpers shared by public authentication endpoints."""

import json
from urllib import parse, request

from django.conf import settings
from rest_framework.exceptions import ValidationError


TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'


def verify_captcha(token: str | None, remote_ip: str | None = None) -> None:
    """Validate a Cloudflare Turnstile proof when the feature is configured.

    Local and test environments can omit ``TURNSTILE_SECRET_KEY``. Production
    enables fail-closed verification simply by defining the secret.
    """

    secret = getattr(settings, 'TURNSTILE_SECRET_KEY', '')
    if not secret:
        return
    if not token:
        raise ValidationError({'captcha_token': "Confirmez que vous n'êtes pas un robot."})

    payload = {'secret': secret, 'response': token}
    if remote_ip:
        payload['remoteip'] = remote_ip

    try:
        encoded = parse.urlencode(payload).encode()
        verification_request = request.Request(
            TURNSTILE_VERIFY_URL,
            data=encoded,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
        )
        with request.urlopen(verification_request, timeout=5) as response:
            result = json.loads(response.read().decode())
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        raise ValidationError({
            'captcha_token': "La vérification anti-robot est temporairement indisponible."
        }) from exc

    if not result.get('success'):
        raise ValidationError({'captcha_token': "La vérification anti-robot a échoué."})
