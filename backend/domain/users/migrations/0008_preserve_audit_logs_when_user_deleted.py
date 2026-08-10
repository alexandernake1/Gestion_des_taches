from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0007_remove_administrator_role'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userauditlog',
            name='target',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_history', to='users.user'),
        ),
    ]
