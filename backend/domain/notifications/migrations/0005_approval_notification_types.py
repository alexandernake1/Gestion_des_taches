from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0004_notificationpreference_notification_dedupe_key_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='type',
            field=models.CharField(
                choices=[
                    ('new_task', 'Nouvelle tâche'),
                    ('comment', 'Commentaire'),
                    ('report_approved', 'Report accepté'),
                    ('report_rejected', 'Report refusé'),
                    ('new_assignment', 'Nouvelle assignation'),
                    ('task_completed', 'Tâche terminée'),
                    ('subscription_reminder', 'Rappel d’abonnement'),
                    ('payment_succeeded', 'Paiement réussi'),
                    ('payment_failed', 'Paiement échoué'),
                    ('subscription_suspended', 'Abonnement suspendu'),
                    ('task_due_soon', 'Échéance proche'),
                    ('task_overdue', 'Tâche en retard'),
                    ('daily_digest', 'Résumé quotidien'),
                    ('approval_requested', 'Validation demandée'),
                    ('approval_approved', 'Validation approuvée'),
                    ('approval_rejected', 'Validation refusée'),
                ],
                max_length=50,
            ),
        ),
    ]
