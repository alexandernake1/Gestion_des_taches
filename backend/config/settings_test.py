from .settings import *  # noqa: F403

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Password strength is covered by validation; hashing speed must not dominate
# the API test suite.
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

SECURE_SSL_REDIRECT = False
USE_IN_MEMORY_CHANNEL_LAYER = True
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}
PAYMENT_PROVIDER = 'test'
ALLOW_TEST_PAYMENT_SIMULATOR = True

# Throttling is verified at view level; a shared in-memory counter must not make
# otherwise independent authentication tests order-dependent.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    'DEFAULT_THROTTLE_RATES': {
        **REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'],  # noqa: F405
        'login': '10000/minute',
    },
}


