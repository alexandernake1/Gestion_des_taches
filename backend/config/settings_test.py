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


