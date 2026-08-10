from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0002_subscriptionplan_companysubscription'),
    ]

    operations = [
        migrations.AlterField(
            model_name='companysubscription',
            name='status',
            field=models.CharField(
                choices=[
                    ('trial', 'Essai'),
                    ('active', 'Actif'),
                    ('pending_verification', 'En attente de vérification'),
                    ('past_due', 'Paiement en retard'),
                    ('suspended', 'Suspendu'),
                    ('cancelled', 'Annulé'),
                ],
                default='trial',
                max_length=20,
            ),
        ),
    ]
