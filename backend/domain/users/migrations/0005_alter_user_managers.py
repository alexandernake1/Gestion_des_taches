from django.db import migrations, models

import domain.users.models


def normalize_duplicate_owners(apps, schema_editor):
    user_model = apps.get_model('users', 'User')
    company_ids = (
        user_model.objects.filter(
            role='owner',
            is_active=True,
            company__isnull=False,
        )
        .values_list('company_id', flat=True)
        .distinct()
    )
    for company_id in company_ids:
        owners = user_model.objects.filter(
            company_id=company_id,
            role='owner',
            is_active=True,
        ).order_by('created_at', 'pk')
        keeper = owners.first()
        if keeper:
            owners.exclude(pk=keeper.pk).update(role='administrator')


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_add_owner_role_and_promote_admins'),
    ]

    operations = [
        migrations.AlterModelManagers(
            name='user',
            managers=[
                ('objects', domain.users.models.EmailUserManager()),
            ],
        ),
        migrations.RunPython(
            normalize_duplicate_owners,
            migrations.RunPython.noop,
        ),
        migrations.AddConstraint(
            model_name='user',
            constraint=models.UniqueConstraint(
                condition=models.Q(is_active=True, role='owner'),
                fields=('company',),
                name='one_active_owner_per_company',
            ),
        ),
    ]
