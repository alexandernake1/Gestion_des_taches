from datetime import timedelta
from decimal import Decimal
import pytest
from django.utils import timezone

from domain.tasks.models import Priority, Project, Status, Task
from domain.teams.models import Team
from domain.users.models import Role, User


@pytest.mark.django_db
class TestLot4DashboardAndPeriods:
    """Validation suite for Lot 4: period filters, dynamic metrics, and rich dashboard."""

    def test_task_filtering_by_period_due_date(self, api_client, tenant_data):
        company = tenant_data['company_a']
        today = timezone.localdate()

        # Create tasks with various due dates
        t1 = Task.objects.create(
            company=company,
            creator=tenant_data['owner_a'],
            assigned_to=tenant_data['employee_a'],
            title='Task Due Yesterday',
            due_date=today - timedelta(days=1),
        )
        t2 = Task.objects.create(
            company=company,
            creator=tenant_data['owner_a'],
            assigned_to=tenant_data['employee_a'],
            title='Task Due Today',
            due_date=today,
        )
        t3 = Task.objects.create(
            company=company,
            creator=tenant_data['owner_a'],
            assigned_to=tenant_data['employee_a'],
            title='Task Due Next Week',
            due_date=today + timedelta(days=7),
        )

        api_client.force_authenticate(tenant_data['owner_a'])

        # Filter for today only (due date)
        response = api_client.get(f'/api/tasks/?date_from={today}&date_to={today}&date_field=due')
        assert response.status_code == 200
        ids = [t['id'] for t in (response.data.get('results') or response.data)]
        assert t2.id in ids
        assert t1.id not in ids
        assert t3.id not in ids

        # Filter for past to today
        response = api_client.get(f'/api/tasks/?date_from={today - timedelta(days=2)}&date_to={today}&date_field=due')
        assert response.status_code == 200
        ids = [t['id'] for t in (response.data.get('results') or response.data)]
        assert t1.id in ids
        assert t2.id in ids
        assert t3.id not in ids

    def test_task_filtering_by_created_and_completed_date(self, api_client, tenant_data):
        company = tenant_data['company_a']
        today = timezone.localdate()
        now = timezone.now()

        t1 = Task.objects.create(
            company=company,
            creator=tenant_data['owner_a'],
            title='Completed Today',
            status=Status.COMPLETED,
            completed_at=now,
        )
        t2 = Task.objects.create(
            company=company,
            creator=tenant_data['owner_a'],
            title='Completed 10 Days Ago',
            status=Status.COMPLETED,
            completed_at=now - timedelta(days=10),
        )

        api_client.force_authenticate(tenant_data['owner_a'])

        # Filter by completed_at today
        response = api_client.get(f'/api/tasks/?date_from={today}&date_to={today}&date_field=completed')
        assert response.status_code == 200
        ids = [t['id'] for t in (response.data.get('results') or response.data)]
        assert t1.id in ids
        assert t2.id not in ids

    def test_task_filtering_invalid_dates_and_inverted_range(self, api_client, tenant_data):
        api_client.force_authenticate(tenant_data['owner_a'])

        # Inverted dates: date_from > date_to
        response = api_client.get('/api/tasks/?date_from=2026-08-20&date_to=2026-08-10')
        assert response.status_code == 400
        assert "postérieure" in str(response.data)

        # Invalid format
        response = api_client.get('/api/tasks/?date_from=invalid-date')
        assert response.status_code == 400

    def test_company_dashboard_with_period_and_team_filters(self, api_client, tenant_data):
        company = tenant_data['company_a']
        today = timezone.localdate()
        now = timezone.now()

        team = Team.objects.create(
            company=company,
            name='Équipe Alpha',
            leader=tenant_data['manager_a'],
        )
        team.members.add(tenant_data['manager_a'], tenant_data['employee_a'])

        # Create tasks
        t1 = Task.objects.create(
            company=company,
            team=team,
            creator=tenant_data['manager_a'],
            assigned_to=tenant_data['employee_a'],
            title='Task In Team Completed',
            status=Status.COMPLETED,
            due_date=today,
            completed_at=now,
        )
        t2 = Task.objects.create(
            company=company,
            team=team,
            creator=tenant_data['manager_a'],
            assigned_to=tenant_data['employee_a'],
            title='Task In Team Overdue',
            status=Status.IN_PROGRESS,
            due_date=today - timedelta(days=3),
        )

        api_client.force_authenticate(tenant_data['owner_a'])
        response = api_client.get(
            f'/api/dashboard/company/?date_from={today - timedelta(days=7)}&date_to={today}&team_id={team.id}'
        )

        assert response.status_code == 200
        data = response.data
        assert data['total_tasks'] >= 2
        assert data['completed_tasks'] >= 1
        assert data['overdue_tasks'] >= 1
        assert 'team_workload' in data
        assert 'trends' in data
        assert 'status_breakdown' in data
        assert 'priority_breakdown' in data

    def test_user_dashboard_with_my_day_metrics(self, api_client, tenant_data):
        company = tenant_data['company_a']
        today = timezone.localdate()

        # Create tasks for employee_a
        Task.objects.create(
            company=company,
            creator=tenant_data['owner_a'],
            assigned_to=tenant_data['employee_a'],
            title='Overdue Task',
            status=Status.TODO,
            due_date=today - timedelta(days=2),
        )
        Task.objects.create(
            company=company,
            creator=tenant_data['owner_a'],
            assigned_to=tenant_data['employee_a'],
            title='Today Task',
            status=Status.IN_PROGRESS,
            due_date=today,
        )

        api_client.force_authenticate(tenant_data['employee_a'])
        response = api_client.get(f'/api/dashboard/user/?date_from={today - timedelta(days=7)}&date_to={today}')

        assert response.status_code == 200
        data = response.data
        assert 'my_day' in data
        assert data['my_day']['overdue'] >= 1
        assert data['my_day']['today'] >= 1
        assert data['my_day']['in_progress'] >= 1
        assert 'trends' in data
        assert 'scope' in data
