from django.db import migrations, models


def promote_primary_administrators(apps, schema_editor):
    Company = apps.get_model('companies', 'Company')
    User = apps.get_model('users', 'User')

    # Promote primary administrator of each company to owner
    for company in Company.objects.all():
        primary_admin = (
            User.objects.filter(company=company, role='administrator')
            .order_by('created_at')
            .first()
        )
        if primary_admin:
            primary_admin.role = 'owner'
            primary_admin.save(update_fields=['role'])

    # Ensure demo user is owner
    demo_user = User.objects.filter(email='demo@local.test').first()
    if demo_user:
        demo_user.role = 'owner'
        demo_user.save(update_fields=['role'])


def reverse_promote_primary_administrators(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(role='owner').update(role='administrator')


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_userauditlog'),
        ('companies', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('owner', 'Owner'),
                    ('administrator', 'Administrator'),
                    ('manager', 'Manager'),
                    ('employee', 'Employee'),
                ],
                default='employee',
                max_length=20,
            ),
        ),
        migrations.RunPython(
            promote_primary_administrators,
            reverse_promote_primary_administrators,
        ),
    ]
