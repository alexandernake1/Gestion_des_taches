import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_user_must_change_password'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserAuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=50)),
                ('details', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='administrative_actions', to='users.user')),
                ('target', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='audit_history', to='users.user')),
            ],
            options={
                'db_table': 'user_audit_logs',
                'ordering': ['-created_at'],
            },
        ),
    ]
