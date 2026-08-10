from datetime import date, timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

from domain.companies.models import (
    Company,
    CompanySubscription,
    PaymentStatus,
    PaymentTransaction,
    SubscriptionPlan,
)
from domain.tasks.models import Task, TaskHistory, TaskReport, TaskTemplate
from domain.users.models import Role, User, UserAuditLog
from domain.notifications.models import (
    Notification,
    NotificationPreference,
    NotificationType,
)
from domain.notifications.services import process_user_notifications


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
        'superuser': superuser,
        'employee_b': employee_b,
        'task_a': task_a,
        'task_b': task_b,
    }


@pytest.mark.django_db
def test_user_can_manage_notification_preferences(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.get('/api/notifications/preferences/')
    assert response.status_code == 200
    assert response.data['task_reminders_enabled'] is True
    assert response.data['reminder_days_before'] == 2

    response = api_client.patch(
        '/api/notifications/preferences/',
        {
            'task_reminders_enabled': False,
            'daily_digest_enabled': False,
            'reminder_days_before': 5,
            'digest_hour': 9,
        },
        format='json',
    )
    assert response.status_code == 200
    assert response.data['task_reminders_enabled'] is False
    assert response.data['reminder_days_before'] == 5


@pytest.mark.django_db
def test_due_and_overdue_notifications_are_deduplicated(tenant_data):
    employee = tenant_data['employee_a']
    today = timezone.localdate()
    preference, _ = NotificationPreference.objects.get_or_create(user=employee)
    preference.reminder_days_before = 2
    preference.daily_digest_enabled = False
    preference.save()
    due_task = Task.objects.create(
        title='Échéance test',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=employee,
        due_date=today + timedelta(days=2),
    )
    overdue_task = Task.objects.create(
        title='Retard test',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=employee,
        due_date=today - timedelta(days=1),
    )

    process_user_notifications(employee)
    process_user_notifications(employee)

    assert Notification.objects.filter(
        recipient=employee,
        task=due_task,
        type=NotificationType.TASK_DUE_SOON,
    ).count() == 1
    assert Notification.objects.filter(
        recipient=employee,
        task=overdue_task,
        type=NotificationType.TASK_OVERDUE,
    ).count() == 1


@pytest.mark.django_db
def test_disabled_reminders_and_assignments_are_respected(tenant_data):
    employee = tenant_data['employee_a']
    preference, _ = NotificationPreference.objects.get_or_create(user=employee)
    preference.assignments_enabled = False
    preference.task_reminders_enabled = False
    preference.daily_digest_enabled = False
    preference.save()
    task = Task.objects.create(
        title='Alerte désactivée',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=employee,
        due_date=timezone.localdate() + timedelta(days=2),
    )

    process_user_notifications(employee)

    assert not Notification.objects.filter(recipient=employee, task=task).exists()


@pytest.mark.django_db
def test_daily_digest_is_sent_once_per_day(tenant_data):
    employee = tenant_data['employee_a']
    now = timezone.localtime()
    preference, _ = NotificationPreference.objects.get_or_create(user=employee)
    preference.digest_hour = now.hour
    preference.last_digest_sent_date = None
    preference.save()

    process_user_notifications(employee, now)
    process_user_notifications(employee, now)

    assert Notification.objects.filter(
        recipient=employee,
        type=NotificationType.DAILY_DIGEST,
    ).count() == 1


@pytest.mark.django_db
@pytest.mark.parametrize('resource', ['history', 'comments', 'attachments', 'reports'])
def test_nested_resources_do_not_cross_tenants(api_client, tenant_data, resource):
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.get(
        f"/api/tasks/{tenant_data['task_b'].id}/{resource}/"
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_cannot_comment_on_another_tenant_task(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.post(
        f"/api/tasks/{tenant_data['task_b'].id}/comments/",
        {'content': 'Forbidden comment'},
        format='json',
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_team_rejects_leader_from_another_company(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['manager_a'])

    response = api_client.post(
        '/api/teams/',
        {
            'name': 'Invalid team',
            'leader': tenant_data['employee_b'].id,
            'member_ids': [tenant_data['employee_b'].id],
        },
        format='json',
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_team_members_can_be_managed_visually_through_member_ids(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['manager_a'])

    create = api_client.post(
        '/api/teams/',
        {
            'name': 'Delivery',
            'leader': tenant_data['manager_a'].id,
            'member_ids': [tenant_data['employee_a'].id],
        },
        format='json',
    )
    assert create.status_code == 201

    detail = api_client.get(f"/api/teams/{create.data['id']}/")
    assert detail.status_code == 200
    assert detail.data['members'] == [tenant_data['employee_a'].id]
    assert detail.data['member_details'][0]['full_name'] == tenant_data['employee_a'].full_name

    update = api_client.patch(
        f"/api/teams/{create.data['id']}/",
        {'member_ids': []},
        format='json',
    )
    assert update.status_code == 200
    assert update.data['members'] == []


@pytest.mark.django_db
def test_manager_cannot_create_any_account(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['manager_a'])

    response = api_client.post(
        '/api/auth/users/invite/',
        {
            'email': 'admin@example.com',
            'first_name': 'New',
            'last_name': 'Admin',
            'role': Role.MANAGER,
        },
        format='json',
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_public_registration_endpoint_is_closed(api_client):
    response = api_client.post(
        '/api/auth/register/',
        {
            'email': 'public@example.com',
            'first_name': 'Public',
            'last_name': 'User',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
        },
        format='json',
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_company_registration_creates_owner_and_free_subscription(api_client):
    plan = SubscriptionPlan.objects.create(
        name='Gratuit',
        code='public-free',
        price=0,
    )

    response = api_client.post(
        '/api/auth/register/company/',
        {
            'company_name': 'Nouvelle Société',
            'company_slug': 'nouvelle-societe',
            'website': 'https://example.com',
            'contact_email': 'contact@example.com',
            'contact_phone': '+22670000000',
            'address': 'Ouagadougou',
            'plan_code': plan.code,
            'first_name': 'Propriétaire',
            'last_name': 'Test',
            'email': 'owner-new@example.com',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'accept_terms': True,
        },
        format='json',
    )

    assert response.status_code == 201
    owner = User.objects.get(email='owner-new@example.com')
    assert owner.role == Role.OWNER
    assert owner.company.contact_phone == '+22670000000'
    assert owner.company.subscription.status == 'active'
    assert response.data['access']
    assert response.data['payment'] is None


@pytest.mark.django_db
def test_paid_company_registration_records_test_payment(api_client):
    plan = SubscriptionPlan.objects.create(
        name='Pro',
        code='public-pro',
        price=15000,
    )

    response = api_client.post(
        '/api/auth/register/company/',
        {
            'company_name': 'Entreprise Pro',
            'contact_email': 'billing@example.com',
            'contact_phone': '+22671111111',
            'plan_code': plan.code,
            'first_name': 'Owner',
            'last_name': 'Pro',
            'email': 'owner-pro@example.com',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'accept_terms': True,
        },
        format='json',
    )

    assert response.status_code == 201
    payment = PaymentTransaction.objects.get(company__slug='entreprise-pro')
    assert payment.status == PaymentStatus.SUCCEEDED
    assert payment.reference.startswith('TEST-')
    assert payment.subscription.status == 'active'
    assert response.data['payment']['reference'] == payment.reference


@pytest.mark.django_db
@override_settings(DEBUG=True)
def test_owner_can_complete_test_payment_and_receive_notification(api_client, tenant_data):
    plan = SubscriptionPlan.objects.create(
        name='Business',
        code='business-payment',
        price=25000,
    )
    api_client.force_authenticate(tenant_data['owner_a'])

    started = api_client.post(
        '/api/companies/subscription/payments/start/',
        {'plan_code': plan.code},
        format='json',
    )
    assert started.status_code == 201

    completed = api_client.post(
        f"/api/companies/subscription/payments/{started.data['reference']}/simulate/",
        {'outcome': 'succeeded'},
        format='json',
    )

    assert completed.status_code == 200
    assert completed.data['status'] == 'succeeded'
    subscription = CompanySubscription.objects.get(company=tenant_data['company_a'])
    assert subscription.status == 'active'
    assert subscription.ends_at is not None
    assert Notification.objects.filter(
        recipient=tenant_data['owner_a'],
        type='payment_succeeded',
    ).exists()


@pytest.mark.django_db
def test_manager_cannot_access_company_payment_history(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['manager_a'])
    response = api_client.get('/api/companies/subscription/payments/')
    assert response.status_code == 403


@pytest.mark.django_db
def test_subscription_lifecycle_applies_grace_then_suspension(tenant_data):
    from domain.companies.services import synchronize_subscription_status

    plan = SubscriptionPlan.objects.create(
        name='Lifecycle',
        code='lifecycle',
        price=10000,
    )
    subscription = CompanySubscription.objects.create(
        company=tenant_data['company_a'],
        plan=plan,
        status='active',
        ends_at=timezone.now() - timedelta(days=1),
    )

    synchronize_subscription_status(subscription)
    subscription.refresh_from_db()
    assert subscription.status == 'past_due'
    assert subscription.grace_ends_at is not None

    subscription.grace_ends_at = timezone.now() - timedelta(minutes=1)
    subscription.save(update_fields=['grace_ends_at'])
    synchronize_subscription_status(subscription)
    subscription.refresh_from_db()
    assert subscription.status == 'suspended'
    assert Notification.objects.filter(
        recipient=tenant_data['owner_a'],
        type='subscription_suspended',
    ).exists()


@pytest.mark.django_db
def test_administrator_can_create_employee_account(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['owner_a'])

    response = api_client.post(
        '/api/auth/users/invite/',
        {
            'email': 'new-employee@example.com',
            'first_name': 'New',
            'last_name': 'Employee',
            'role': Role.EMPLOYEE,
        },
        format='json',
    )

    assert response.status_code == 201
    assert response.data['temporary_password']
    assert response.data['must_change_password'] is True


@pytest.mark.django_db
def test_password_change_clears_temporary_password_requirement(api_client, tenant_data):
    employee = tenant_data['employee_a']
    employee.must_change_password = True
    employee.save(update_fields=['must_change_password'])
    api_client.force_authenticate(employee)

    response = api_client.post(
        '/api/auth/change-password/',
        {
            'old_password': 'StrongPass123!',
            'new_password': 'NewStrongPass456!',
            'new_password_confirm': 'NewStrongPass456!',
        },
        format='json',
    )

    assert response.status_code == 200
    employee.refresh_from_db()
    assert employee.must_change_password is False
    assert employee.check_password('NewStrongPass456!')


@pytest.mark.django_db
def test_administrator_can_reset_another_user_password(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['owner_a'])

    response = api_client.post(
        f"/api/auth/users/{tenant_data['employee_a'].id}/reset-password/",
        format='json',
    )

    assert response.status_code == 200
    assert response.data['temporary_password']
    tenant_data['employee_a'].refresh_from_db()
    assert tenant_data['employee_a'].must_change_password is True
    assert tenant_data['employee_a'].check_password(response.data['temporary_password'])


@pytest.mark.django_db
def test_manager_cannot_reset_user_password(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['manager_a'])

    response = api_client.post(
        f"/api/auth/users/{tenant_data['employee_a'].id}/reset-password/",
        format='json',
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_administrator_can_deactivate_and_reactivate_user_with_audit(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['owner_a'])
    employee = tenant_data['employee_a']

    deactivate = api_client.post(f'/api/auth/users/{employee.id}/deactivate/')
    assert deactivate.status_code == 200
    employee.refresh_from_db()
    assert employee.is_active is False

    activate = api_client.post(f'/api/auth/users/{employee.id}/activate/')
    assert activate.status_code == 200
    employee.refresh_from_db()
    assert employee.is_active is True
    assert list(
        UserAuditLog.objects.filter(target=employee).order_by('-id').values_list('action', flat=True)
    ) == ['account_activated', 'account_deactivated']


@pytest.mark.django_db
def test_manager_cannot_access_administrative_audit_log(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['manager_a'])

    response = api_client.get('/api/auth/users/audit-log/')

    assert response.status_code == 403



@pytest.mark.django_db
def test_employee_task_is_automatically_personal(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.post(
        '/api/tasks/',
        {'title': 'Personal task', 'priority': 'normal', 'status': 'todo'},
        format='json',
    )

    assert response.status_code == 201
    assert response.data['creator'] == tenant_data['employee_a'].id
    assert response.data['assigned_to'] == tenant_data['employee_a'].id
    assert response.data['team'] is None


@pytest.mark.django_db
def test_employee_cannot_assign_task_to_someone_else(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.post(
        '/api/tasks/',
        {
            'title': 'Forbidden assignment',
            'priority': 'normal',
            'status': 'todo',
            'assigned_to': tenant_data['manager_a'].id,
        },
        format='json',
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_employee_cannot_edit_task_only_assigned_to_them(api_client, tenant_data):
    assigned_task = Task.objects.create(
        title='Manager task',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['employee_a'],
    )
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.patch(
        f'/api/tasks/{assigned_task.id}/',
        {'title': 'Unauthorized change'},
        format='json',
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_my_and_assigned_task_scopes_are_distinct(api_client, tenant_data):
    assigned_only = Task.objects.create(
        title='Assigned by manager',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['employee_a'],
        priority='urgent',
    )
    api_client.force_authenticate(tenant_data['employee_a'])

    mine = api_client.get('/api/tasks/my/')
    assigned = api_client.get('/api/tasks/assigned/')

    assert mine.status_code == 200
    assert assigned.status_code == 200
    assert assigned_only.id not in [task['id'] for task in mine.data]
    assert assigned_only.id in [task['id'] for task in assigned.data]


@pytest.mark.django_db
def test_task_scope_endpoints_share_priority_and_search_filters(api_client, tenant_data):
    Task.objects.create(
        title='Urgent payroll review',
        company=tenant_data['company_a'],
        creator=tenant_data['employee_a'],
        assigned_to=tenant_data['employee_a'],
        priority='urgent',
    )
    Task.objects.create(
        title='Normal documentation',
        company=tenant_data['company_a'],
        creator=tenant_data['employee_a'],
        assigned_to=tenant_data['employee_a'],
        priority='normal',
    )
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.get('/api/tasks/my/?priority=urgent&search=payroll')

    assert response.status_code == 200
    assert [task['title'] for task in response.data] == ['Urgent payroll review']


@pytest.mark.django_db
def test_daily_focus_separates_overdue_today_and_upcoming(api_client, tenant_data):
    today = date.today()
    overdue = Task.objects.create(
        title='Overdue focus',
        company=tenant_data['company_a'],
        creator=tenant_data['employee_a'],
        assigned_to=tenant_data['employee_a'],
        priority='normal',
        due_date=today - timedelta(days=1),
    )
    due_today = Task.objects.create(
        title='Today focus',
        company=tenant_data['company_a'],
        creator=tenant_data['employee_a'],
        assigned_to=tenant_data['employee_a'],
        priority='urgent',
        due_date=today,
    )
    upcoming = Task.objects.create(
        title='Upcoming focus',
        company=tenant_data['company_a'],
        creator=tenant_data['employee_a'],
        assigned_to=tenant_data['employee_a'],
        due_date=today + timedelta(days=5),
    )
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.get('/api/tasks/daily-focus/')

    assert response.status_code == 200
    assert overdue.id in [task['id'] for task in response.data['overdue']]
    assert due_today.id in [task['id'] for task in response.data['today']]
    assert upcoming.id in [task['id'] for task in response.data['upcoming']]


@pytest.mark.django_db
def test_task_list_attention_order_puts_completed_tasks_last(api_client, tenant_data):
    today = date.today()
    overdue = Task.objects.create(
        title='First overdue',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        due_date=today - timedelta(days=2),
        priority='low',
    )
    completed = Task.objects.create(
        title='Completed old',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        due_date=today - timedelta(days=10),
        status='completed',
    )
    api_client.force_authenticate(tenant_data['manager_a'])

    response = api_client.get('/api/tasks/')

    assert response.status_code == 200
    ids = [task['id'] for task in response.data['results']]
    assert ids.index(overdue.id) < ids.index(completed.id)
    completed_index = ids.index(completed.id)
    assert all(
        task['status'] == 'completed'
        for task in response.data['results'][completed_index:]
    )


@pytest.mark.django_db
def test_employee_cannot_access_company_dashboard(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.get('/api/dashboard/company/')

    assert response.status_code == 403


@pytest.mark.django_db
def test_employee_dashboard_activity_is_limited_to_visible_tasks(api_client, tenant_data):
    own_history = TaskHistory.objects.create(
        task=tenant_data['task_a'],
        changed_by=tenant_data['employee_a'],
        field_name='status',
        old_value='todo',
        new_value='in_progress',
    )
    unrelated_task = Task.objects.create(
        title='Management only',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
    )
    TaskHistory.objects.create(
        task=unrelated_task,
        changed_by=tenant_data['manager_a'],
        field_name='priority',
        old_value='normal',
        new_value='urgent',
    )
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.get('/api/dashboard/activity/')

    assert response.status_code == 200
    assert [item['id'] for item in response.data] == [own_history.id]


@pytest.mark.django_db
def test_history_endpoint_returns_task_history(api_client, tenant_data):
    TaskHistory.objects.create(
        task=tenant_data['task_a'],
        changed_by=tenant_data['employee_a'],
        field_name='title',
        old_value='Old',
        new_value='Task A',
    )
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.get(
        f"/api/tasks/{tenant_data['task_a'].id}/history/"
    )

    assert response.status_code == 200
    assert response.data['count'] == 1


@pytest.mark.django_db
def test_attachment_upload_uses_authorized_parent_task(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['employee_a'])
    upload = SimpleUploadedFile('note.txt', b'hello', content_type='text/plain')

    response = api_client.post(
        f"/api/tasks/{tenant_data['task_a'].id}/attachments/",
        {'file': upload},
        format='multipart',
    )

    assert response.status_code == 201
    assert response.data['filename'] == 'note.txt'
    assert 'file' not in response.data
    assert response.data['file_url'].endswith(
        f"/api/tasks/{tenant_data['task_a'].id}/attachments/{response.data['id']}/download/"
    )


@pytest.mark.django_db
def test_attachment_rejects_unsafe_file_type(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['employee_a'])
    upload = SimpleUploadedFile(
        'payload.exe',
        b'MZ dangerous',
        content_type='application/octet-stream',
    )

    response = api_client.post(
        f"/api/tasks/{tenant_data['task_a'].id}/attachments/",
        {'file': upload},
        format='multipart',
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_attachment_download_is_tenant_scoped(api_client, tenant_data):
    from domain.tasks.models import TaskAttachment

    attachment = TaskAttachment.objects.create(
        task=tenant_data['task_b'],
        uploaded_by=tenant_data['employee_b'],
        file=SimpleUploadedFile('private.txt', b'private'),
        filename='private.txt',
        file_size=7,
        mime_type='text/plain',
    )
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.get(
        f"/api/tasks/{tenant_data['task_b'].id}/attachments/{attachment.id}/download/"
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_employee_cannot_review_report(api_client, tenant_data):
    report = TaskReport.objects.create(
        task=tenant_data['task_a'],
        requested_by=tenant_data['employee_a'],
        old_due_date=tenant_data['task_a'].due_date,
        new_due_date=tenant_data['task_a'].due_date + timedelta(days=2),
        reason='Need more time',
    )
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.patch(
        f"/api/tasks/{tenant_data['task_a'].id}/reports/{report.id}/",
        {'status': 'approved'},
        format='json',
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_employee_can_request_a_later_due_date(api_client, tenant_data):
    task = tenant_data['task_a']
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.post(
        f'/api/tasks/{task.id}/reports/',
        {
            'new_due_date': task.due_date + timedelta(days=2),
            'reason': 'A dependency was delivered late.',
        },
        format='json',
    )

    assert response.status_code == 201
    assert response.data['task'] == task.id
    assert response.data['status'] == 'pending'


@pytest.mark.django_db
def test_unchanged_assignment_does_not_create_false_history(api_client, tenant_data):
    task = tenant_data['task_a']
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.patch(
        f'/api/tasks/{task.id}/',
        {'title': 'Updated title'},
        format='json',
    )

    assert response.status_code == 200
    assert list(
        TaskHistory.objects.filter(task=task).values_list('field_name', flat=True)
    ) == ['title']


@pytest.mark.django_db
def test_task_due_date_cannot_precede_start_date(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.post(
        '/api/tasks/',
        {
            'title': 'Invalid dates',
            'priority': 'normal',
            'status': 'todo',
            'start_date': '2026-08-10',
            'due_date': '2026-08-01',
        },
        format='json',
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_task_cannot_complete_with_unfinished_dependency(api_client, tenant_data):
    prerequisite = Task.objects.create(
        title='Préparation',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['manager_a'],
    )
    task = Task.objects.create(
        title='Livraison',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['manager_a'],
    )
    task.dependencies.add(prerequisite)
    api_client.force_authenticate(tenant_data['manager_a'])

    blocked = api_client.patch(
        f'/api/tasks/{task.id}/',
        {'status': 'completed'},
        format='json',
    )
    assert blocked.status_code == 400

    prerequisite.status = 'completed'
    prerequisite.save(update_fields=['status'])
    completed = api_client.patch(
        f'/api/tasks/{task.id}/',
        {'status': 'completed'},
        format='json',
    )
    assert completed.status_code == 200


@pytest.mark.django_db
def test_task_cannot_complete_with_unfinished_subtask(api_client, tenant_data):
    parent = Task.objects.create(
        title='Projet',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['manager_a'],
    )
    Task.objects.create(
        title='Étape',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['manager_a'],
        parent=parent,
    )
    api_client.force_authenticate(tenant_data['manager_a'])

    response = api_client.patch(
        f'/api/tasks/{parent.id}/',
        {'status': 'completed'},
        format='json',
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_duplicate_task_copies_active_subtasks(api_client, tenant_data):
    source = Task.objects.create(
        title='Modèle opérationnel',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['manager_a'],
    )
    Task.objects.create(
        title='Contrôle',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['manager_a'],
        parent=source,
    )
    api_client.force_authenticate(tenant_data['manager_a'])

    response = api_client.post(f'/api/tasks/{source.id}/duplicate/')

    assert response.status_code == 201
    duplicate = Task.objects.get(id=response.data['id'])
    assert duplicate.title == 'Copie de Modèle opérationnel'
    assert duplicate.subtasks.count() == 1
    assert duplicate.subtasks.first().status == 'todo'


@pytest.mark.django_db
def test_archiving_task_is_reversible(api_client, tenant_data):
    task = tenant_data['task_a']
    api_client.force_authenticate(tenant_data['manager_a'])

    archived = api_client.delete(f'/api/tasks/{task.id}/')
    assert archived.status_code == 204
    task.refresh_from_db()
    assert task.is_active is False
    assert task.archived_at is not None

    restored = api_client.post(f'/api/tasks/{task.id}/restore/')
    assert restored.status_code == 200
    task.refresh_from_db()
    assert task.is_active is True
    assert task.archived_at is None


@pytest.mark.django_db
def test_completing_recurring_task_generates_one_next_occurrence(api_client, tenant_data):
    task = Task.objects.create(
        title='Contrôle hebdomadaire',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['manager_a'],
        start_date=date(2026, 8, 3),
        due_date=date(2026, 8, 4),
        recurrence_frequency='weekly',
        recurrence_interval=2,
    )
    api_client.force_authenticate(tenant_data['manager_a'])

    response = api_client.patch(
        f'/api/tasks/{task.id}/',
        {'status': 'completed'},
        format='json',
    )
    assert response.status_code == 200
    task.refresh_from_db()
    assert task.next_occurrence is not None
    assert task.next_occurrence.start_date == date(2026, 8, 17)
    assert task.next_occurrence.due_date == date(2026, 8, 18)
    assert task.next_occurrence.status == 'todo'

    api_client.patch(f'/api/tasks/{task.id}/', {'priority': 'high'}, format='json')
    task.refresh_from_db()
    assert Task.objects.filter(previous_occurrence=task).count() == 1


@pytest.mark.django_db
def test_template_can_instantiate_task_for_same_company(api_client, tenant_data):
    template = TaskTemplate.objects.create(
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        name='Onboarding',
        title='Préparer le nouvel arrivant',
        priority='high',
        default_duration_days=5,
    )
    api_client.force_authenticate(tenant_data['manager_a'])

    response = api_client.post(
        f'/api/tasks/templates/{template.id}/instantiate/',
        {'start_date': '2026-09-01'},
        format='json',
    )

    assert response.status_code == 201
    task = Task.objects.get(id=response.data['id'])
    assert task.company == tenant_data['company_a']
    assert task.due_date == date(2026, 9, 6)


@pytest.mark.django_db
def test_bulk_completion_respects_task_blockers(api_client, tenant_data):
    dependency = Task.objects.create(
        title='Prérequis groupé',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
    )
    task = Task.objects.create(
        title='Action groupée',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
    )
    task.dependencies.add(dependency)
    api_client.force_authenticate(tenant_data['manager_a'])

    response = api_client.post(
        '/api/tasks/bulk/',
        {
            'task_ids': [task.id],
            'action': 'status',
            'status': 'completed',
        },
        format='json',
    )

    assert response.status_code == 400
    task.refresh_from_db()
    assert task.status == 'todo'


@pytest.mark.django_db
def test_employee_cannot_bulk_archive_tasks(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['employee_a'])
    response = api_client.post(
        '/api/tasks/bulk/',
        {
            'task_ids': [tenant_data['task_a'].id],
            'action': 'archive',
        },
        format='json',
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_workload_planning_detects_overloaded_member(api_client, tenant_data):
    employee = tenant_data['employee_a']
    employee.weekly_capacity_hours = 40
    employee.save(update_fields=['weekly_capacity_hours'])
    today = timezone.localdate()
    week_start = today - timedelta(days=today.weekday())
    for index in range(2):
        Task.objects.create(
            title=f'Charge {index}',
            company=tenant_data['company_a'],
            creator=tenant_data['manager_a'],
            assigned_to=employee,
            due_date=week_start + timedelta(days=2 + index),
            estimated_hours=30,
        )
    api_client.force_authenticate(tenant_data['manager_a'])

    response = api_client.get(
        '/api/tasks/workload/',
        {'week': week_start.isoformat()},
    )

    assert response.status_code == 200
    member = next(
        item for item in response.data['members']
        if item['id'] == employee.id
    )
    assert member['scheduled_hours'] >= 60
    assert member['utilization_percent'] >= 150
    assert member['is_overloaded'] is True


@pytest.mark.django_db
def test_employee_cannot_access_workload_planning(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['employee_a'])
    response = api_client.get('/api/tasks/workload/')
    assert response.status_code == 403


@pytest.mark.django_db
def test_administrator_can_update_weekly_capacity(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['administrator_a'])
    response = api_client.patch(
        f"/api/auth/users/{tenant_data['employee_a'].id}/",
        {'weekly_capacity_hours': 32},
        format='json',
    )
    assert response.status_code == 200
    tenant_data['employee_a'].refresh_from_db()
    assert tenant_data['employee_a'].weekly_capacity_hours == 32


@pytest.mark.django_db
def test_platform_superadmin_can_create_companies_and_others_cannot(api_client, tenant_data):
    # Company admin cannot create company
    api_client.force_authenticate(tenant_data['administrator_a'])
    res_admin = api_client.post('/api/companies/', {'name': 'New Co', 'slug': 'new-co'}, format='json')
    assert res_admin.status_code == 403

    # Owner cannot create company
    api_client.force_authenticate(tenant_data['owner_a'])
    res_owner = api_client.post('/api/companies/', {'name': 'New Co 2', 'slug': 'new-co-2'}, format='json')
    assert res_owner.status_code == 403

    # Platform Super-admin can create company
    api_client.force_authenticate(tenant_data['superuser'])
    res_super = api_client.post('/api/companies/', {'name': 'Super Co', 'slug': 'super-co'}, format='json')
    assert res_super.status_code == 201


@pytest.mark.django_db
def test_platform_superadmin_can_suspend_company(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['superuser'])

    response = api_client.patch(
        f"/api/companies/{tenant_data['company_a'].id}/",
        {'is_active': False},
        format='json',
    )

    assert response.status_code == 200
    tenant_data['company_a'].refresh_from_db()
    assert tenant_data['company_a'].is_active is False


@pytest.mark.django_db
def test_deactivated_company_member_cannot_login(api_client, tenant_data):
    tenant_data['company_a'].is_active = False
    tenant_data['company_a'].save(update_fields=['is_active'])

    response = api_client.post(
        '/api/auth/login/',
        {
            'email': tenant_data['employee_a'].email,
            'password': 'StrongPass123!',
        },
        format='json',
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_logout_blacklists_refresh_token(api_client, tenant_data):
    user = tenant_data['employee_a']
    refresh = RefreshToken.for_user(user)
    api_client.force_authenticate(user)

    response = api_client.post(
        '/api/auth/logout/',
        {'refresh': str(refresh)},
        format='json',
    )

    assert response.status_code == 204
    assert BlacklistedToken.objects.filter(
        token__jti=refresh['jti'],
    ).exists()


@pytest.mark.django_db
def test_superadmin_task_creation_uses_selected_company(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['superuser'])
    api_client.credentials(
        HTTP_X_COMPANY_ID=str(tenant_data['company_a'].id)
    )

    response = api_client.post(
        '/api/tasks/',
        {
            'title': 'Platform support task',
            'priority': 'normal',
            'status': 'todo',
            'assigned_to': tenant_data['employee_a'].id,
        },
        format='json',
    )

    assert response.status_code == 201
    task = Task.objects.get(id=response.data['id'])
    assert task.company == tenant_data['company_a']
    assert task.assigned_to == tenant_data['employee_a']
    assert task.creator == tenant_data['superuser']


@pytest.mark.django_db
def test_superadmin_unassigned_task_is_not_assigned_to_platform_account(
    api_client,
    tenant_data,
):
    api_client.force_authenticate(tenant_data['superuser'])
    api_client.credentials(
        HTTP_X_COMPANY_ID=str(tenant_data['company_a'].id)
    )

    response = api_client.post(
        '/api/tasks/',
        {'title': 'Unassigned support task', 'priority': 'normal', 'status': 'todo'},
        format='json',
    )

    assert response.status_code == 201
    assert Task.objects.get(id=response.data['id']).assigned_to is None


@pytest.mark.django_db
def test_superadmin_task_detail_is_scoped_to_selected_company(
    api_client,
    tenant_data,
):
    api_client.force_authenticate(tenant_data['superuser'])
    api_client.credentials(
        HTTP_X_COMPANY_ID=str(tenant_data['company_a'].id)
    )

    response = api_client.get(f"/api/tasks/{tenant_data['task_b'].id}/")

    assert response.status_code == 404


@pytest.mark.django_db
def test_manager_cannot_change_company_settings(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['manager_a'])

    response = api_client.patch(
        f"/api/companies/{tenant_data['company_a'].id}/",
        {'name': 'Unauthorized rename'},
        format='json',
    )

    assert response.status_code == 403



@pytest.mark.django_db
def test_subscription_user_limit_enforced_on_invite(api_client, tenant_data):
    from domain.companies.models import SubscriptionPlan, CompanySubscription
    company = tenant_data['company_a']
    plan_free = SubscriptionPlan.objects.create(
        name='Free Test Plan',
        code='free-test',
        max_users=2,
        max_teams=1,
    )
    CompanySubscription.objects.update_or_create(
        company=company,
        defaults={'plan': plan_free, 'status': 'active'}
    )

    api_client.force_authenticate(tenant_data['owner_a'])
    response = api_client.post(
        '/api/auth/users/invite/',
        {'email': 'overflow@example.com', 'first_name': 'Over', 'last_name': 'Flow', 'role': Role.EMPLOYEE},
        format='json',
    )
    assert response.status_code == 400
    assert 'Company user limit' in response.data['detail']


@pytest.mark.django_db
def test_subscription_team_limit_enforced(api_client, tenant_data):
    from domain.companies.models import SubscriptionPlan, CompanySubscription
    company = tenant_data['company_a']
    plan_limited = SubscriptionPlan.objects.create(
        name='Limited Team Plan',
        code='limited-team',
        max_users=10,
        max_teams=1,
    )
    CompanySubscription.objects.update_or_create(
        company=company,
        defaults={'plan': plan_limited, 'status': 'active'}
    )

    api_client.force_authenticate(tenant_data['owner_a'])
    create1 = api_client.post('/api/teams/', {'name': 'Team 1', 'leader': tenant_data['owner_a'].id}, format='json')
    assert create1.status_code == 201

    create2 = api_client.post('/api/teams/', {'name': 'Team 2', 'leader': tenant_data['owner_a'].id}, format='json')
    assert create2.status_code == 400
    assert 'Company team limit' in create2.data['detail']


@pytest.mark.django_db
def test_owner_can_change_subscription_plan(api_client, tenant_data):
    api_client.force_authenticate(tenant_data['owner_a'])

    get_sub = api_client.get('/api/companies/subscription/')
    assert get_sub.status_code == 200

    change = api_client.post('/api/companies/subscription/change-plan/', {'plan_code': 'starter'}, format='json')
    assert change.status_code == 200
    assert change.data['plan_details']['code'] == 'starter'


@pytest.mark.django_db
def test_suspended_subscription_blocks_task_creation(api_client, tenant_data):
    from domain.companies.models import SubscriptionPlan, CompanySubscription

    plan = SubscriptionPlan.objects.create(
        name='Suspended test',
        code='suspended-test',
    )
    CompanySubscription.objects.update_or_create(
        company=tenant_data['company_a'],
        defaults={'plan': plan, 'status': 'suspended'},
    )
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.post(
        '/api/tasks/',
        {'title': 'Blocked task', 'priority': 'normal', 'status': 'todo'},
        format='json',
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_task_template_visibility_and_scoping(api_client, tenant_data):
    # 1. Employee creates a template -> must be forced to is_shared=False
    api_client.force_authenticate(tenant_data['employee_a'])
    resp = api_client.post(
        '/api/tasks/templates/',
        {
            'name': 'Employee Personal Template',
            'title': 'Personal Title',
            'priority': 'normal',
            'is_shared': True, # Employee tries to share, should be forced to False
        },
        format='json',
    )
    assert resp.status_code == 201
    assert resp.data['is_shared'] is False

    # 2. Manager creates a shared template
    api_client.force_authenticate(tenant_data['manager_a'])
    resp_mgr = api_client.post(
        '/api/tasks/templates/',
        {
            'name': 'Manager Shared Template',
            'title': 'Shared Title',
            'priority': 'high',
            'is_shared': True,
        },
        format='json',
    )
    assert resp_mgr.status_code == 201
    assert resp_mgr.data['is_shared'] is True

    # 3. Another employee in company_a lists templates -> sees Shared Manager template, but NOT employee_a's personal template
    other_emp = User.objects.create_user(
        username='other-employee',
        email='other-emp@example.com',
        password='StrongPass123!',
        company=tenant_data['company_a'],
        role=Role.EMPLOYEE,
    )
    api_client.force_authenticate(other_emp)
    list_resp = api_client.get('/api/tasks/templates/')
    assert list_resp.status_code == 200
    names = [t['name'] for t in list_resp.data]
    assert 'Manager Shared Template' in names
    assert 'Employee Personal Template' not in names

