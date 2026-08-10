from django.db import migrations, models
from django.db.models.functions import Lower


class Migration(migrations.Migration):

    dependencies = [
        ('teams', '0002_initial'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='team',
            constraint=models.UniqueConstraint(
                Lower('name'),
                'company',
                name='unique_team_name_per_company_ci',
            ),
        ),
    ]
