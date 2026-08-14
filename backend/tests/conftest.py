import pytest


@pytest.fixture(autouse=True)
def disable_external_captcha_verification(settings):
    """Unit tests do not call Cloudflare; focused tests can override this setting."""

    settings.TURNSTILE_SECRET_KEY = ''
