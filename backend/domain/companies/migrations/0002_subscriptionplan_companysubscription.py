import django.db.models.deletion
from django.db import migrations, models


def create_plans_and_subscriptions(apps, schema_editor):
    SubscriptionPlan = apps.get_model('companies', 'SubscriptionPlan')
    CompanySubscription = apps.get_model('companies', 'CompanySubscription')
    Company = apps.get_model('companies', 'Company')

    plans = {
        'free': SubscriptionPlan.objects.create(
            name='Gratuit',
            code='free',
            description='Pour tester les fonctionnalités de base avec une petite équipe.',
            price=0.00,
            billing_period='monthly',
            max_users=5,
            max_teams=2,
            storage_limit_mb=500,
            feature_flags={'calendar_view': True, 'advanced_export': False},
            is_active=True,
        ),
        'starter': SubscriptionPlan.objects.create(
            name='Starter',
            code='starter',
            description='Idéal pour les PME en pleine croissance.',
            price=15000.00,
            billing_period='monthly',
            max_users=20,
            max_teams=5,
            storage_limit_mb=5000,
            feature_flags={'calendar_view': True, 'advanced_export': True},
            is_active=True,
        ),
        'business': SubscriptionPlan.objects.create(
            name='Business',
            code='business',
            description='Pour les organisations structurées exigeant un pilotage avancé.',
            price=45000.00,
            billing_period='monthly',
            max_users=100,
            max_teams=20,
            storage_limit_mb=50000,
            feature_flags={'calendar_view': True, 'advanced_export': True, 'audit_logs': True},
            is_active=True,
        ),
        'enterprise': SubscriptionPlan.objects.create(
            name='Enterprise',
            code='enterprise',
            description='Sur mesure sans limites de ressources avec support dédié.',
            price=120000.00,
            billing_period='monthly',
            max_users=0,
            max_teams=0,
            storage_limit_mb=0,
            feature_flags={'calendar_view': True, 'advanced_export': True, 'audit_logs': True, 'custom_branding': True},
            is_active=True,
        ),
    }

    for company in Company.objects.all():
        if not hasattr(company, 'subscription'):
            plan = plans['business'] if company.slug == 'sahel-digital-solutions' else plans['free']
            status = 'active' if company.slug == 'sahel-digital-solutions' else 'trial'
            CompanySubscription.objects.create(
                company=company,
                plan=plan,
                status=status,
            )


def reverse_plans_and_subscriptions(apps, schema_editor):
    CompanySubscription = apps.get_model('companies', 'CompanySubscription')
    SubscriptionPlan = apps.get_model('companies', 'SubscriptionPlan')
    CompanySubscription.objects.all().delete()
    SubscriptionPlan.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='SubscriptionPlan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('code', models.SlugField(unique=True)),
                ('description', models.TextField(blank=True, null=True)),
                ('price', models.DecimalField(decimal_places=2, default=0.0, max_digits=10)),
                ('billing_period', models.CharField(choices=[('monthly', 'Mensuel'), ('yearly', 'Annuel')], default='monthly', max_length=20)),
                ('max_users', models.PositiveIntegerField(default=5, help_text='0 pour illimité')),
                ('max_teams', models.PositiveIntegerField(default=2, help_text='0 pour illimité')),
                ('storage_limit_mb', models.PositiveIntegerField(default=500, help_text='0 pour illimité')),
                ('feature_flags', models.JSONField(blank=True, default=dict)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'subscription_plans',
                'ordering': ['price', 'created_at'],
            },
        ),
        migrations.CreateModel(
            name='CompanySubscription',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('trial', 'Essai'), ('active', 'Actif'), ('past_due', 'Paiement en retard'), ('suspended', 'Suspendu'), ('cancelled', 'Annulé')], default='trial', max_length=20)),
                ('starts_at', models.DateTimeField(auto_now_add=True)),
                ('ends_at', models.DateTimeField(blank=True, null=True)),
                ('trial_ends_at', models.DateTimeField(blank=True, null=True)),
                ('seats_override', models.PositiveIntegerField(blank=True, help_text='Accorde une limite personnalisée de comptes si spécifié.', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('company', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='subscription', to='companies.company')),
                ('plan', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='company_subscriptions', to='companies.subscriptionplan')),
            ],
            options={
                'db_table': 'company_subscriptions',
                'ordering': ['-created_at'],
            },
        ),
        migrations.RunPython(
            create_plans_and_subscriptions,
            reverse_plans_and_subscriptions,
        ),
    ]
