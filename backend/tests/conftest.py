from datetime import date, timedelta
import pytest
from rest_framework.test import APIClient

from domain.companies.models import Company
from domain.tasks.models import Task
from domain.users.models import Role, User


@pytest.fixture(autouse=True)
def disable_external_captcha_verification(settings):
    """Unit tests do not call Cloudflare; focused tests can override this setting."""
    settings.TURNSTILE_SECRET_KEY = ''


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def tenant_data(db):
    company_a = Company.objects.create(name='Company A', slug='company-a')
    company_b = Company.objects.create(name='Company B', slug='company-b')

    employee_a = User.objects.create_user(
        username='employee-a',
        email='employee-a@example.com',
        password='StrongPass123!',
        first_name='Employee',
        last_name='A',
        company=company_a,
        role=Role.EMPLOYEE,
    )
    manager_a = User.objects.create_user(
        username='manager-a',
        email='manager-a@example.com',
        password='StrongPass123!',
        first_name='Manager',
        last_name='A',
        company=company_a,
        role=Role.MANAGER,
    )
    administrator_a = User.objects.create_user(
        username='administrator-a',
        email='administrator-a@example.com',
        password='StrongPass123!',
        first_name='Administrator',
        last_name='A',
        company=company_a,
        role=Role.MANAGER,
    )
    owner_a = User.objects.create_user(
        username='owner-a',
        email='owner-a@example.com',
        password='StrongPass123!',
        first_name='Owner',
        last_name='A',
        company=company_a,
        role=Role.OWNER,
    )
    owner_b = User.objects.create_user(
        username='owner-b',
        email='owner-b@example.com',
        password='StrongPass123!',
        first_name='Owner',
        last_name='B',
        company=company_b,
        role=Role.OWNER,
    )
    manager_b = User.objects.create_user(
        username='manager-b',
        email='manager-b@example.com',
        password='StrongPass123!',
        first_name='Manager',
        last_name='B',
        company=company_b,
        role=Role.MANAGER,
    )
    superuser = User.objects.create_superuser(
        username='superuser@platform.test',
        email='superuser@platform.test',
        password='StrongPass123!',
        first_name='Super',
        last_name='Admin',
    )
    employee_b = User.objects.create_user(
        username='employee-b',
        email='employee-b@example.com',
        password='StrongPass123!',
        first_name='Employee',
        last_name='B',
        company=company_b,
        role=Role.EMPLOYEE,
    )

    task_a = Task.objects.create(
        title='Task A',
        company=company_a,
        creator=employee_a,
        assigned_to=employee_a,
        due_date=date.today() + timedelta(days=3),
    )
    task_b = Task.objects.create(
        title='Task B',
        company=company_b,
        creator=employee_b,
        assigned_to=employee_b,
        due_date=date.today() + timedelta(days=3),
    )

    return {
        'company_a': company_a,
        'company_b': company_b,
        'employee_a': employee_a,
        'manager_a': manager_a,
        'administrator_a': administrator_a,
        'owner_a': owner_a,
        'owner_b': owner_b,
        'manager_b': manager_b,
        'superuser': superuser,
        'employee_b': employee_b,
        'task_a': task_a,
        'task_b': task_b,
    }
