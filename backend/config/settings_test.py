from .settings import *  # noqa: F403


# Password strength is covered by validation; hashing speed must not dominate
# the API test suite.
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

SECURE_SSL_REDIRECT = False

