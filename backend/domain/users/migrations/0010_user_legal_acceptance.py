from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0009_alter_user_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='privacy_version',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='user',
            name='terms_accepted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='terms_version',
            field=models.CharField(blank=True, max_length=20),
        ),
    ]
