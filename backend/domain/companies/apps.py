from django.apps import AppConfig


class CompaniesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'domain.companies'
    verbose_name = 'Companies'

    def ready(self):
        import domain.companies.signals  # noqa: F401
