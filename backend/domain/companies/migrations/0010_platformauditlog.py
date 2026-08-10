from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('companies', '0009_normalize_subscription_plan_feature_flags'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PlatformAuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('category', models.CharField(max_length=40)),
                ('action', models.CharField(max_length=80)),
                ('entity_label', models.CharField(blank=True, max_length=255)),
                ('details', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='platform_audit_actions', to=settings.AUTH_USER_MODEL)),
                ('company', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='platform_audit_events', to='companies.company')),
            ],
            options={'db_table': 'platform_audit_logs', 'ordering': ['-created_at']},
        ),
        migrations.AddIndex(
            model_name='platformauditlog',
            index=models.Index(fields=['category', 'created_at'], name='platform_au_categor_dd069c_idx'),
        ),
        migrations.AddIndex(
            model_name='platformauditlog',
            index=models.Index(fields=['company', 'created_at'], name='platform_au_company_bb7bda_idx'),
        ),
    ]
