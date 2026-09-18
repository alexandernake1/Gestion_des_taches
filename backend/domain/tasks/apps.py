from django.apps import AppConfig


class TasksConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'domain.tasks'
    verbose_name = 'Tasks'

    def ready(self):
        import domain.tasks.signals  # noqa: F401
