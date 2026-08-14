from django.db import migrations, models


PERSONAL_PLAN_CODES = ('personal-free', 'personal-plus', 'personal-premium')


def create_personal_plans(apps, schema_editor):
    SubscriptionPlan = apps.get_model('companies', 'SubscriptionPlan')
    plans = (
        {
            'code': 'personal-free',
            'name': 'Personnel Gratuit',
            'description': 'Pour organiser ses tâches quotidiennes dans un espace privé.',
            'price': 0,
            'storage_limit_mb': 100,
            'feature_flags': {
                'has_kanban_view': True,
                'has_calendar_view': False,
                'has_timeline_view': False,
                'has_projects': False,
                'has_reports': False,
                'has_exports': False,
            },
        },
        {
            'code': 'personal-plus',
            'name': 'Personnel Plus',
            'description': 'Pour structurer ses projets, échéances et tâches récurrentes.',
            'price': 2500,
            'storage_limit_mb': 2000,
            'feature_flags': {
                'has_kanban_view': True,
                'has_calendar_view': True,
                'has_timeline_view': False,
                'has_projects': True,
                'has_reports': False,
                'has_exports': False,
                'recurring_tasks': True,
            },
        },
        {
            'code': 'personal-premium',
            'name': 'Personnel Premium',
            'description': 'Toutes les vues, statistiques et exports pour un suivi avancé.',
            'price': 5000,
            'storage_limit_mb': 10000,
            'feature_flags': {
                'has_kanban_view': True,
                'has_calendar_view': True,
                'has_timeline_view': True,
                'has_projects': True,
                'has_reports': True,
                'has_exports': True,
                'recurring_tasks': True,
            },
        },
    )
    for plan in plans:
        code = plan['code']
        defaults = {
            **plan,
            'audience': 'personal',
            'billing_period': 'monthly',
            'max_users': 1,
            'max_teams': 0,
            'is_active': True,
        }
        defaults.pop('code')
        SubscriptionPlan.objects.update_or_create(code=code, defaults=defaults)


def remove_personal_plans(apps, schema_editor):
    SubscriptionPlan = apps.get_model('companies', 'SubscriptionPlan')
    SubscriptionPlan.objects.filter(code__in=PERSONAL_PLAN_CODES).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('companies', '0010_platformauditlog'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='workspace_type',
            field=models.CharField(
                choices=[('company', 'Entreprise'), ('personal', 'Personnel')],
                default='company',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='subscriptionplan',
            name='audience',
            field=models.CharField(
                choices=[('company', 'Entreprise'), ('personal', 'Personnel')],
                default='company',
                max_length=20,
            ),
        ),
        migrations.RunPython(create_personal_plans, remove_personal_plans),
    ]
