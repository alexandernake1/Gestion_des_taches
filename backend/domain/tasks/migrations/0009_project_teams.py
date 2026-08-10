from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('tasks', '0008_project_task_project_and_more'),
        ('teams', '0003_team_name_constraint'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='teams',
            field=models.ManyToManyField(blank=True, related_name='projects', to='teams.team'),
        ),
    ]
