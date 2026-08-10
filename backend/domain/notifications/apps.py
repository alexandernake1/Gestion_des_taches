from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'domain.notifications'
    verbose_name = 'Notifications'

    def ready(self):
        import domain.notifications.signals
