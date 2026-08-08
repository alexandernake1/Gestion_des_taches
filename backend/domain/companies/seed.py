from django.utils import timezone
from datetime import timedelta

def seed_company_data(company, owner):
    from domain.users.models import User, Role
    from domain.teams.models import Team
    from domain.tasks.models import Task, Status, Priority, TaskHistory

    # Create dummy users
    users = []
    for i in range(1, 4):
        email = f"employee{i}@{company.id}.com"
        if not User.objects.filter(email=email).exists():
            u = User.objects.create_user(
                email=email,
                password="password123",
                first_name=f"Employe",
                last_name=f"{i}",
                company=company,
                role=Role.EMPLOYEE,
                must_change_password=False
            )
            users.append(u)
    
    if not users:
        users = list(User.objects.filter(company=company).exclude(id=owner.id)[:3])

    # Create a team
    team = Team.objects.create(
        name="Equipe Projet Alpha",
        description="L equipe principale pour la demo",
        company=company,
        leader=owner
    )
    for u in users:
        team.members.add(u)

    # Create dummy tasks
    now = timezone.now()
    
    t1 = Task.objects.create(
        title="Bienvenue dans votre nouvel espace",
        description="Ceci est une tache de demonstration.",
        priority=Priority.HIGH,
        status=Status.IN_PROGRESS,
        company=company,
        creator=owner,
        assigned_to=owner,
        due_date=now.date() + timedelta(days=2)
    )
    TaskHistory.objects.create(task=t1, changed_by=owner, field_name="status", new_value="Task created")

    if users:
        t2 = Task.objects.create(
            title="Premiere tache d equipe",
            description="Tache assignee a un membre de l equipe",
            priority=Priority.NORMAL,
            status=Status.TODO,
            company=company,
            creator=owner,
            assigned_to=users[0],
            team=team,
            due_date=now.date() + timedelta(days=5)
        )
        TaskHistory.objects.create(task=t2, changed_by=owner, field_name="status", new_value="Task created")
