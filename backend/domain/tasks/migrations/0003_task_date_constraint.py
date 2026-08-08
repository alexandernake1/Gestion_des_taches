from django.db import migrations, models


def normalize_invalid_task_dates(apps, schema_editor):
    task_model = apps.get_model('tasks', 'Task')
    task_model.objects.filter(
        start_date__isnull=False,
        due_date__isnull=False,
        due_date__lt=models.F('start_date'),
    ).update(start_date=models.F('due_date'))


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0002_initial'),
    ]

    operations = [
        migrations.RunPython(
            normalize_invalid_task_dates,
            migrations.RunPython.noop,
        ),
        migrations.AddConstraint(
            model_name='task',
            constraint=models.CheckConstraint(
                check=(
                    models.Q(start_date__isnull=True)
                    | models.Q(due_date__isnull=True)
                    | models.Q(due_date__gte=models.F('start_date'))
                ),
                name='task_due_date_not_before_start_date',
            ),
        ),
    ]
