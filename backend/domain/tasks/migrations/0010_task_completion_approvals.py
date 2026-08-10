from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0009_normalize_subscription_plan_feature_flags'),
        ('tasks', '0009_project_teams'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='requires_completion_approval',
            field=models.BooleanField(
                default=False,
                help_text="Exige la validation d'un responsable avant la clôture par un collaborateur.",
            ),
        ),
        migrations.CreateModel(
            name='ApprovalRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('task_completion', 'Clôture de tâche')], default='task_completion', max_length=40)),
                ('status', models.CharField(choices=[('pending', 'En attente'), ('approved', 'Approuvée'), ('rejected', 'Refusée')], default='pending', max_length=20)),
                ('reason', models.TextField()),
                ('review_comment', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='approval_requests', to='companies.company')),
                ('requested_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='submitted_approval_requests', to=settings.AUTH_USER_MODEL)),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_approval_requests', to=settings.AUTH_USER_MODEL)),
                ('task', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='approval_requests', to='tasks.task')),
            ],
            options={
                'db_table': 'approval_requests',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['company', 'status'], name='approval_re_company_1b48c3_idx'),
                    models.Index(fields=['task', 'status'], name='approval_re_task_id_6f67f2_idx'),
                    models.Index(fields=['requested_by', 'status'], name='approval_re_request_5440d5_idx'),
                ],
            },
        ),
        migrations.AddConstraint(
            model_name='approvalrequest',
            constraint=models.UniqueConstraint(
                condition=models.Q(('status', 'pending')),
                fields=('task', 'action'),
                name='uniq_pending_task_approval',
            ),
        ),
    ]
