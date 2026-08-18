from datetime import date, timedelta
from io import BytesIO

import openpyxl
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core import mail
from django.contrib.auth.tokens import default_token_generator
from django.test import override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
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
    WorkspaceType,
)
from domain.tasks.models import (
    ApprovalRequest,
    ApprovalStatus,
    Project,
    Status,
    Task,
    TaskComment,
    TaskHistory,
    TaskReport,
    TaskTemplate,
)
from domain.teams.models import Team
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
def test_assignment_notifications_are_worded_for_employee_and_manager(tenant_data):
    Notification.objects.all().delete()
    team = Team.objects.create(
        name='Équipe du dossier client',
        company=tenant_data['company_a'],
        leader=tenant_data['employee_a'],
    )
    team.members.add(tenant_data['employee_a'])
    task = Task.objects.create(
        title='Préparer le dossier client',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['employee_a'],
        team=team,
    )

    employee_notifications = Notification.objects.filter(
        recipient=tenant_data['employee_a'],
        type=NotificationType.NEW_ASSIGNMENT,
        task=task,
    )
    assert employee_notifications.count() == 1
    employee_notification = employee_notifications.get()
    manager_notification = Notification.objects.get(
        recipient=tenant_data['manager_a'],
        type=NotificationType.NEW_ASSIGNMENT,
        task=task,
    )
    assert employee_notification.message == (
        'La tâche « Préparer le dossier client » vous a été assignée.'
    )
    assert "La tâche « Préparer le dossier client » a été assignée à" in manager_notification.message
    assert tenant_data['employee_a'].full_name in manager_notification.message


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
def test_user_can_reply_to_a_task_comment_and_parent_author_is_notified(api_client, tenant_data):
    task = tenant_data['task_a']
    original_author = tenant_data['employee_a']
    responder = tenant_data['manager_a']
    original_comment = TaskComment.objects.create(
        task=task,
        author=original_author,
        content='Peux-tu confirmer la date de livraison ?',
    )

    Notification.objects.all().delete()
    api_client.force_authenticate(responder)
    response = api_client.post(
        f'/api/tasks/{task.id}/comments/',
        {
            'content': 'Oui, la livraison est prévue vendredi.',
            'parent_comment': original_comment.id,
        },
        format='json',
    )

    assert response.status_code == 201
    reply = TaskComment.objects.get(parent_comment=original_comment)
    assert reply.author == responder

    comments = api_client.get(f'/api/tasks/{task.id}/comments/')
    serialized_reply = next(
        item for item in comments.data['results'] if item['id'] == reply.id
    )
    assert serialized_reply['parent_comment'] == original_comment.id
    assert serialized_reply['parent_comment_author_name'] == original_author.full_name
    assert serialized_reply['parent_comment_content'] == original_comment.content

    notification = Notification.objects.get(recipient=original_author, type=NotificationType.COMMENT)
    assert notification.title == 'Réponse à votre commentaire'
    assert 'vous a répondu' in notification.message


@pytest.mark.django_db
def test_reply_must_target_a_top_level_comment_from_the_same_task(api_client, tenant_data):
    task = tenant_data['task_a']
    original_comment = TaskComment.objects.create(
        task=task,
        author=tenant_data['employee_a'],
        content='Commentaire initial',
    )
    reply = TaskComment.objects.create(
        task=task,
        author=tenant_data['manager_a'],
        content='Première réponse',
        parent_comment=original_comment,
    )
    foreign_comment = TaskComment.objects.create(
        task=tenant_data['task_b'],
        author=tenant_data['employee_b'],
        content='Autre tâche',
    )

    api_client.force_authenticate(tenant_data['manager_a'])
    nested_response = api_client.post(
        f'/api/tasks/{task.id}/comments/',
        {'content': 'Réponse imbriquée', 'parent_comment': reply.id},
        format='json',
    )
    foreign_response = api_client.post(
        f'/api/tasks/{task.id}/comments/',
        {'content': 'Mauvais commentaire parent', 'parent_comment': foreign_comment.id},
        format='json',
    )

    assert nested_response.status_code == 400
    assert 'parent_comment' in nested_response.data
    assert foreign_response.status_code == 400
    assert 'parent_comment' in foreign_response.data


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
    assert set(detail.data['members']) == {tenant_data['manager_a'].id, tenant_data['employee_a'].id}
    assert any(m['full_name'] == tenant_data['employee_a'].full_name for m in detail.data['member_details'])

    update = api_client.patch(
        f"/api/teams/{create.data['id']}/",
        {'is_active': False},
        format='json',
    )
    assert update.status_code == 200


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
def test_public_registration_creates_personal_account_without_company(api_client):
    response = api_client.post(
        '/api/auth/register/',
        {
            'email': 'public@example.com',
            'first_name': 'Public',
            'last_name': 'User',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'accept_terms': True,
        },
        format='json',
    )

    assert response.status_code == 201
    user = User.objects.get(email='public@example.com')
    assert user.company is None
    assert user.role == Role.EMPLOYEE
    assert user.terms_accepted_at is not None
    assert user.terms_version == '2026-08-13'
    assert user.privacy_version == '2026-08-13'
    assert response.data['user']['company'] is None


@pytest.mark.django_db
def test_personal_account_can_complete_company_onboarding(api_client):
    plan = SubscriptionPlan.objects.create(
        name='Gratuit',
        code='company-onboarding-free',
        price=0,
        audience=WorkspaceType.COMPANY,
    )
    user = User.objects.create_user(
        email='personal@example.com',
        password='StrongPass123!',
        first_name='Compte',
        last_name='Personnel',
    )
    api_client.force_authenticate(user)

    response = api_client.post(
        '/api/auth/onboarding/company/',
        {
            'company_name': 'Nouvelle structure',
            'contact_email': 'contact@structure.test',
            'contact_phone': '+22670000000',
            'plan_code': plan.code,
        },
        format='json',
    )

    assert response.status_code == 201
    user.refresh_from_db()
    assert user.company.name == 'Nouvelle structure'
    assert user.role == Role.OWNER
    assert user.company.subscription.plan == plan


@pytest.mark.django_db
def test_personal_onboarding_creates_private_workspace_and_self_assigned_tasks(api_client):
    plan = SubscriptionPlan.objects.create(
        name='Personnel Test',
        code='personal-test',
        price=0,
        audience=WorkspaceType.PERSONAL,
        max_users=1,
        max_teams=0,
    )
    user = User.objects.create_user(
        email='solo@example.com',
        password='StrongPass123!',
        first_name='Solo',
        last_name='User',
    )
    api_client.force_authenticate(user)

    onboarding = api_client.post(
        '/api/auth/onboarding/personal/',
        {'plan_code': plan.code},
        format='json',
    )

    assert onboarding.status_code == 201
    user.refresh_from_db()
    workspace = user.company
    assert workspace.workspace_type == WorkspaceType.PERSONAL
    assert workspace.subscription.plan == plan
    assert onboarding.data['user']['is_personal_workspace'] is True
    assert onboarding.data['user']['company_name'] == 'Mon espace personnel'

    other_user = User.objects.create_user(
        email='other-solo@example.com',
        password='StrongPass123!',
        first_name='Other',
        last_name='User',
        company=workspace,
    )
    team = Team.objects.create(
        name='Équipe interdite',
        company=workspace,
        leader=user,
    )
    task_response = api_client.post(
        '/api/tasks/',
        {
            'title': 'Ma tâche personnelle',
            'status': 'todo',
            'priority': 'normal',
            'assigned_to': other_user.id,
            'team': team.id,
            'requires_completion_approval': True,
        },
        format='json',
    )

    assert task_response.status_code == 201
    task = Task.objects.get(pk=task_response.data['id'])
    assert task.assigned_to == user
    assert task.team is None
    assert task.requires_completion_approval is False

    team_response = api_client.post(
        '/api/teams/',
        {'name': 'Nouvelle équipe', 'leader': user.id},
        format='json',
    )
    assert team_response.status_code == 403

    project_response = api_client.post(
        '/api/projects/',
        {
            'name': 'Objectif personnel',
            'status': 'in_progress',
            'health': 'on_track',
            'manager': other_user.id,
            'members': [other_user.id],
            'teams': [team.id],
        },
        format='json',
    )
    assert project_response.status_code == 201
    project = Project.objects.get(pk=project_response.data['id'])
    assert project.manager == user
    assert not project.members.exists()
    assert not project.teams.exists()

    template_response = api_client.post(
        '/api/tasks/templates/',
        {
            'name': 'Routine personnelle',
            'title': 'Ma routine',
            'priority': 'normal',
            'is_shared': True,
        },
        format='json',
    )
    assert template_response.status_code == 201
    assert template_response.data['is_shared'] is False

    task.due_date = date.today() + timedelta(days=2)
    task.save(update_fields=['due_date', 'updated_at'])
    report_response = api_client.post(
        f'/api/tasks/{task.id}/reports/',
        {
            'new_due_date': date.today() + timedelta(days=4),
            'reason': 'Je réorganise mon planning personnel.',
        },
        format='json',
    )
    assert report_response.status_code == 403

    approval_response = api_client.post(
        f'/api/tasks/{task.id}/approvals/',
        {
            'action': 'task_completion',
            'reason': 'La tâche est terminée.',
        },
        format='json',
    )
    assert approval_response.status_code == 403

    bulk_assignment = api_client.post(
        '/api/tasks/bulk/',
        {
            'task_ids': [task.id],
            'action': 'assign',
            'assigned_to': other_user.id,
        },
        format='json',
    )
    assert bulk_assignment.status_code == 403


@pytest.mark.django_db
def test_plan_catalog_and_changes_respect_workspace_type(api_client):
    personal_plan = SubscriptionPlan.objects.create(
        name='Personnel Filtré',
        code='personal-filtered',
        price=0,
        audience=WorkspaceType.PERSONAL,
    )
    company_plan = SubscriptionPlan.objects.create(
        name='Entreprise Filtrée',
        code='company-filtered',
        price=0,
        audience=WorkspaceType.COMPANY,
    )

    catalog = api_client.get('/api/companies/plans/', {'audience': 'personal'})
    assert catalog.status_code == 200
    assert personal_plan.code in {plan['code'] for plan in catalog.data}
    assert company_plan.code not in {plan['code'] for plan in catalog.data}

    user = User.objects.create_user(
        email='personal-plan@example.com',
        password='StrongPass123!',
        first_name='Plan',
        last_name='Personnel',
    )
    api_client.force_authenticate(user)
    assert api_client.post(
        '/api/auth/onboarding/personal/',
        {'plan_code': personal_plan.code},
        format='json',
    ).status_code == 201

    rejected = api_client.post(
        '/api/companies/subscription/change-plan/',
        {'plan_code': company_plan.code},
        format='json',
    )
    assert rejected.status_code == 404


@pytest.mark.django_db
def test_personal_workspace_can_be_converted_to_company_without_losing_tasks(api_client):
    personal_plan = SubscriptionPlan.objects.create(
        name='Personnel Conversion',
        code='personal-conversion',
        price=0,
        audience=WorkspaceType.PERSONAL,
    )
    company_plan = SubscriptionPlan.objects.create(
        name='Entreprise Conversion',
        code='company-conversion',
        price=0,
        audience=WorkspaceType.COMPANY,
    )
    user = User.objects.create_user(
        email='conversion@example.com',
        password='StrongPass123!',
        first_name='Compte',
        last_name='Conversion',
    )
    api_client.force_authenticate(user)
    api_client.post(
        '/api/auth/onboarding/personal/',
        {'plan_code': personal_plan.code},
        format='json',
    )
    user.refresh_from_db()
    original_workspace_id = user.company_id
    task = Task.objects.create(
        title='Tâche à conserver',
        company=user.company,
        creator=user,
        assigned_to=user,
    )

    conversion = api_client.post(
        '/api/auth/onboarding/company/',
        {
            'company_name': 'Ma nouvelle entreprise',
            'company_slug': 'ma-nouvelle-entreprise',
            'contact_email': user.email,
            'contact_phone': '+22670000000',
            'plan_code': company_plan.code,
        },
        format='json',
    )

    assert conversion.status_code == 201
    user.refresh_from_db()
    task.refresh_from_db()
    assert user.company_id == original_workspace_id
    assert user.company.workspace_type == WorkspaceType.COMPANY
    assert user.company.name == 'Ma nouvelle entreprise'
    assert user.company.subscription.plan == company_plan
    assert task.company_id == original_workspace_id


@pytest.mark.django_db
def test_password_reset_is_non_enumerating_and_changes_password(api_client):
    user = User.objects.create_user(
        email='reset@example.com',
        password='StrongPass123!',
        first_name='Reset',
        last_name='User',
    )
    known = api_client.post('/api/auth/password-reset/', {'email': user.email}, format='json')
    unknown = api_client.post('/api/auth/password-reset/', {'email': 'unknown@example.com'}, format='json')

    assert known.status_code == unknown.status_code == 200
    assert known.data == unknown.data
    assert len(mail.outbox) == 1
    message = mail.outbox[0]
    assert message.subject == '[Activity Control] Réinitialisez votre mot de passe'
    assert '/reset-password?uid=' in message.body
    assert len(message.alternatives) == 1
    assert 'Choisir un nouveau mot de passe' in message.alternatives[0][0]

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    confirmed = api_client.post(
        '/api/auth/password-reset/confirm/',
        {
            'uid': uid,
            'token': token,
            'new_password': 'AnotherStrong123!',
            'new_password_confirm': 'AnotherStrong123!',
        },
        format='json',
    )
    assert confirmed.status_code == 200
    user.refresh_from_db()
    assert user.check_password('AnotherStrong123!')


@pytest.mark.django_db
def test_password_reset_keeps_generic_response_when_email_delivery_fails(api_client, monkeypatch):
    user = User.objects.create_user(
        email='delivery-failure@example.com',
        password='StrongPass123!',
        first_name='Delivery',
        last_name='Failure',
    )

    def smtp_failure(*args, **kwargs):
        raise OSError('SMTP unavailable')

    monkeypatch.setattr('domain.users.emails.send_mail', smtp_failure)
    response = api_client.post('/api/auth/password-reset/', {'email': user.email}, format='json')

    assert response.status_code == 200
    assert response.data == {
        'detail': "Si un compte correspond à cette adresse, un email a été envoyé."
    }


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
    assert owner.terms_accepted_at is not None
    assert owner.terms_version == '2026-08-13'
    assert owner.company.contact_phone == '+22670000000'
    assert owner.company.subscription.status == 'active'
    assert response.data['access']
    assert response.data['payment'] is None


@pytest.mark.django_db
def test_company_email_is_checked_before_registration(api_client):
    Company.objects.create(
        name='Entreprise existante',
        slug='entreprise-existante',
        contact_email='contact@existing.test',
    )

    unavailable = api_client.get(
        '/api/auth/register/company/email-availability/',
        {'email': 'CONTACT@existing.test'},
    )
    available = api_client.get(
        '/api/auth/register/company/email-availability/',
        {'email': 'nouveau@example.test'},
    )

    assert unavailable.status_code == 200
    assert unavailable.data == {
        'available': False,
        'message': "Cet email d'entreprise est déjà utilisé.",
    }
    assert available.status_code == 200
    assert available.data['available'] is True


@pytest.mark.django_db
def test_company_registration_rejects_duplicate_company_email(api_client):
    Company.objects.create(
        name='Entreprise existante',
        slug='entreprise-existante',
        contact_email='contact@existing.test',
    )
    plan = SubscriptionPlan.objects.create(name='Gratuit', code='duplicate-email-free', price=0)

    response = api_client.post(
        '/api/auth/register/company/',
        {
            'company_name': 'Nouvelle entreprise',
            'contact_email': 'CONTACT@existing.test',
            'contact_phone': '+22670000000',
            'plan_code': plan.code,
            'first_name': 'Owner',
            'last_name': 'Test',
            'email': 'owner-duplicate-check@example.test',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'accept_terms': True,
        },
        format='json',
    )

    assert response.status_code == 400
    assert "structure est déjà utilisé" in response.data['contact_email'][0] or "entreprise est déjà utilisé" in response.data['contact_email'][0]


@pytest.mark.django_db
def test_task_export_uses_scope_filters_and_custom_title(api_client, tenant_data):
    manager = tenant_data['manager_a']
    Task.objects.create(
        title='Tâche du manager',
        company=tenant_data['company_a'],
        creator=manager,
        assigned_to=manager,
    )
    api_client.force_authenticate(manager)

    response = api_client.get(
        '/api/tasks/export/',
        {'scope': 'mine', 'title': 'Mes tâches prioritaires'},
    )

    assert response.status_code == 200
    assert 'Mes_taches_prioritaires_' in response['Content-Disposition']
    workbook = openpyxl.load_workbook(BytesIO(response.content), read_only=True)
    worksheet = workbook.active
    assert worksheet.title == 'Mes tâches prioritaires'
    exported_titles = [row[1] for row in worksheet.iter_rows(min_row=2, values_only=True)]
    assert exported_titles == ['Tâche du manager']


@pytest.mark.django_db
def test_project_can_include_multiple_company_teams(api_client, tenant_data):
    manager = tenant_data['manager_a']
    team_one = Team.objects.create(
        name='Équipe Produit',
        company=tenant_data['company_a'],
        leader=manager,
    )
    team_two = Team.objects.create(
        name='Équipe Technique',
        company=tenant_data['company_a'],
        leader=manager,
    )
    api_client.force_authenticate(manager)

    response = api_client.post(
        '/api/projects/',
        {
            'name': 'Projet transverse',
            'status': 'in_progress',
            'health': 'on_track',
            'teams': [team_one.id, team_two.id],
        },
        format='json',
    )

    assert response.status_code == 201
    project = Project.objects.get(id=response.data['id'])
    assert set(project.teams.values_list('id', flat=True)) == {team_one.id, team_two.id}
    assert {team['name'] for team in response.data['team_details']} == {
        'Équipe Produit',
        'Équipe Technique',
    }


@pytest.mark.django_db
def test_project_rejects_team_from_another_company(api_client, tenant_data):
    foreign_team = Team.objects.create(
        name='Équipe externe',
        company=tenant_data['company_b'],
        leader=tenant_data['employee_b'],
    )
    api_client.force_authenticate(tenant_data['manager_a'])

    response = api_client.post(
        '/api/projects/',
        {
            'name': 'Projet invalide',
            'status': 'in_progress',
            'health': 'on_track',
            'teams': [foreign_team.id],
        },
        format='json',
    )

    assert response.status_code == 400
    assert 'teams' in response.data


@pytest.mark.django_db
def test_employee_can_view_project_api_but_cannot_manage_projects(api_client, tenant_data):
    project = Project.objects.create(
        name='Projet réservé au pilotage',
        company=tenant_data['company_a'],
        manager=tenant_data['manager_a'],
    )
    api_client.force_authenticate(tenant_data['employee_a'])

    list_response = api_client.get('/api/projects/')
    detail_response = api_client.get(f'/api/projects/{project.id}/')

    assert list_response.status_code == 200
    assert detail_response.status_code == 200
    project_list = (
        list_response.data['results']
        if isinstance(list_response.data, dict)
        else list_response.data
    )
    assert [item['id'] for item in project_list] == [project.id]
    assert detail_response.data['id'] == project.id

    create_response = api_client.post(
        '/api/projects/',
        {'name': 'Projet non autorisé', 'status': 'in_progress', 'health': 'on_track'},
        format='json',
    )
    update_response = api_client.patch(
        f'/api/projects/{project.id}/',
        {'name': 'Modification non autorisée'},
        format='json',
    )

    assert create_response.status_code == 403
    assert update_response.status_code == 403


@pytest.mark.django_db
def test_project_detail_does_not_cross_tenants(api_client, tenant_data):
    foreign_project = Project.objects.create(
        name='Projet société B',
        company=tenant_data['company_b'],
        manager=tenant_data['employee_b'],
    )
    api_client.force_authenticate(tenant_data['manager_a'])

    response = api_client.get(f'/api/projects/{foreign_project.id}/')

    assert response.status_code == 404


@pytest.mark.django_db
def test_task_assignment_links_person_for_an_existing_project_team(api_client, tenant_data):
    manager = tenant_data['manager_a']
    employee = tenant_data['employee_a']
    team = Team.objects.create(
        name='Équipe Livraison',
        company=tenant_data['company_a'],
        leader=manager,
    )
    team.members.add(employee)
    project = Project.objects.create(
        name='Projet Livraison',
        company=tenant_data['company_a'],
        manager=manager,
    )
    project.teams.add(team)
    api_client.force_authenticate(manager)

    response = api_client.post(
        '/api/tasks/',
        {
            'title': 'Préparer la livraison',
            'project': project.id,
            'assigned_to': employee.id,
            'team': team.id,
            'status': 'todo',
            'priority': 'normal',
        },
        format='json',
    )

    assert response.status_code == 201
    project.refresh_from_db()
    assert project.members.filter(id=employee.id).exists()
    assert project.teams.filter(id=team.id).exists()


@pytest.mark.django_db
def test_project_task_inherits_single_team_and_its_leader(api_client, tenant_data):
    manager = tenant_data['manager_a']
    team = Team.objects.create(
        name='Équipe projet unique',
        company=tenant_data['company_a'],
        leader=manager,
    )
    project = Project.objects.create(
        name='Projet hérité',
        company=tenant_data['company_a'],
        manager=manager,
    )
    project.teams.add(team)
    api_client.force_authenticate(manager)

    response = api_client.post(
        '/api/tasks/',
        {'title': 'Tâche héritée', 'project': project.id, 'priority': 'normal'},
        format='json',
    )

    assert response.status_code == 201
    task = Task.objects.get(id=response.data['id'])
    assert task.team == team
    assert task.assigned_to == manager


@pytest.mark.django_db
def test_project_task_rejects_team_outside_project(api_client, tenant_data):
    manager = tenant_data['manager_a']
    allowed_team = Team.objects.create(name='Équipe autorisée', company=tenant_data['company_a'])
    other_team = Team.objects.create(name='Équipe externe au projet', company=tenant_data['company_a'])
    project = Project.objects.create(name='Projet cadré', company=tenant_data['company_a'], manager=manager)
    project.teams.add(allowed_team)
    api_client.force_authenticate(manager)

    response = api_client.post(
        '/api/tasks/',
        {
            'title': 'Tâche incohérente',
            'project': project.id,
            'team': other_team.id,
            'priority': 'normal',
        },
        format='json',
    )

    assert response.status_code == 400
    assert 'team' in response.data


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
@override_settings(PAYMENT_PROVIDER='disabled')
def test_disabled_payment_provider_does_not_create_fake_transaction(api_client, tenant_data):
    plan = SubscriptionPlan.objects.create(
        name='Paiement désactivé',
        code='disabled-payment',
        price=15000,
    )
    api_client.force_authenticate(tenant_data['owner_a'])

    response = api_client.post(
        '/api/companies/subscription/payments/start/',
        {'plan_code': plan.code},
        format='json',
    )

    assert response.status_code == 503
    assert not PaymentTransaction.objects.filter(company=tenant_data['company_a']).exists()


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
    assert response.data['code'] == 'company_inactive'
    assert response.data['detail'] == (
        "L'espace de travail de votre entreprise a été désactivé. Contactez l'assistance."
    )


@pytest.mark.django_db
def test_login_returns_targeted_french_error_without_exposing_accounts(api_client, tenant_data):
    wrong_password = api_client.post(
        '/api/auth/login/',
        {
            'email': tenant_data['employee_a'].email,
            'password': 'MotDePasseIncorrect123!',
        },
        format='json',
    )
    unknown_email = api_client.post(
        '/api/auth/login/',
        {
            'email': 'compte-inexistant@example.com',
            'password': 'MotDePasseIncorrect123!',
        },
        format='json',
    )

    assert wrong_password.status_code == 401
    assert unknown_email.status_code == 401
    assert wrong_password.data['code'] == 'invalid_credentials'
    assert unknown_email.data['code'] == 'invalid_credentials'
    assert wrong_password.data['detail'] == 'Adresse e-mail ou mot de passe incorrect.'
    assert unknown_email.data['detail'] == wrong_password.data['detail']


@pytest.mark.django_db
def test_login_remember_me_controls_cookie_persistence(api_client, tenant_data):
    credentials = {
        'email': tenant_data['employee_a'].email,
        'password': 'StrongPass123!',
    }

    session_response = api_client.post('/api/auth/login/', credentials, format='json')

    assert session_response.status_code == 200
    assert session_response.cookies['access_token']['max-age'] == ''
    assert session_response.cookies['refresh_token']['max-age'] == ''
    assert session_response.cookies['refresh_token']['httponly'] is True
    assert session_response.cookies['refresh_token']['samesite'] == 'Lax'
    assert RefreshToken(session_response.cookies['refresh_token'].value)['remember_me'] is False

    persistent_response = api_client.post(
        '/api/auth/login/',
        {**credentials, 'remember_me': True},
        format='json',
    )

    assert persistent_response.status_code == 200
    assert persistent_response.cookies['access_token']['max-age'] == 3600
    assert persistent_response.cookies['refresh_token']['max-age'] == 604800
    assert RefreshToken(persistent_response.cookies['refresh_token'].value)['remember_me'] is True


@pytest.mark.django_db
def test_refresh_preserves_remember_me_cookie_policy(api_client, tenant_data):
    login_response = api_client.post(
        '/api/auth/login/',
        {
            'email': tenant_data['employee_a'].email,
            'password': 'StrongPass123!',
            'remember_me': True,
        },
        format='json',
    )
    api_client.cookies['refresh_token'] = login_response.cookies['refresh_token'].value

    response = api_client.post('/api/auth/refresh/', {}, format='json')

    assert response.status_code == 200
    assert response.cookies['access_token']['max-age'] == 3600
    assert response.cookies['refresh_token']['max-age'] == 604800


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
    create1 = api_client.post('/api/teams/', {'name': 'Team 1', 'leader': tenant_data['owner_a'].id, 'member_ids': [tenant_data['employee_a'].id]}, format='json')
    assert create1.status_code == 201

    create2 = api_client.post('/api/teams/', {'name': 'Team 2', 'leader': tenant_data['owner_a'].id, 'member_ids': [tenant_data['employee_a'].id]}, format='json')
    assert create2.status_code == 400
    assert 'Company team limit' in create2.data['detail'] or 'limite' in create2.data['detail'].lower() or 'maximal' in create2.data['detail'].lower()


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


@pytest.mark.django_db
def test_user_invitation_sends_email(api_client, tenant_data, mailoutbox):
    api_client.force_authenticate(tenant_data['owner_a'])
    resp = api_client.post(
        '/api/auth/users/invite/',
        {
            'email': 'new-member@example.com',
            'first_name': 'Jean',
            'last_name': 'Dupont',
            'role': Role.EMPLOYEE,
        },
        format='json',
    )
    assert resp.status_code == 201
    assert resp.data['email_sent'] is True
    assert len(mailoutbox) == 1
    mail = mailoutbox[0]
    assert mail.to == ['new-member@example.com']
    assert 'Bienvenue chez' in mail.subject
    assert 'Jean' in mail.body
    assert resp.data['temporary_password'] in mail.body


@pytest.mark.django_db
def test_employee_requests_completion_and_manager_approves(api_client, tenant_data):
    task = Task.objects.create(
        title='Livrable à valider',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['employee_a'],
        status=Status.IN_PROGRESS,
        requires_completion_approval=True,
    )
    Notification.objects.all().delete()

    api_client.force_authenticate(tenant_data['employee_a'])
    direct_completion = api_client.patch(
        f'/api/tasks/{task.id}/',
        {'status': Status.COMPLETED},
        format='json',
    )
    assert direct_completion.status_code == 400
    task.refresh_from_db()
    assert task.status == Status.IN_PROGRESS

    requested = api_client.post(
        f'/api/tasks/{task.id}/approvals/',
        {
            'action': 'task_completion',
            'reason': 'Le livrable est terminé et les contrôles ont été effectués.',
        },
        format='json',
    )
    assert requested.status_code == 201
    approval_id = requested.data['id']
    assert requested.data['status'] == ApprovalStatus.PENDING
    assert Notification.objects.filter(
        recipient=tenant_data['manager_a'],
        type=NotificationType.APPROVAL_REQUESTED,
        task=task,
    ).exists()
    duplicate = api_client.post(
        f'/api/tasks/{task.id}/approvals/',
        {'action': 'task_completion', 'reason': 'Seconde demande.'},
        format='json',
    )
    assert duplicate.status_code == 400

    api_client.force_authenticate(tenant_data['manager_a'])
    pending = api_client.get('/api/tasks/approvals/?status=pending')
    assert pending.status_code == 200
    pending_results = pending.data.get('results', pending.data)
    assert approval_id in [item['id'] for item in pending_results]

    reviewed = api_client.patch(
        f'/api/tasks/approvals/{approval_id}/',
        {'status': ApprovalStatus.APPROVED, 'review_comment': 'Livrable conforme.'},
        format='json',
    )
    assert reviewed.status_code == 200
    assert reviewed.data['reviewed_by'] == tenant_data['manager_a'].id

    task.refresh_from_db()
    assert task.status == Status.COMPLETED
    assert task.completed_at is not None
    assert TaskHistory.objects.filter(
        task=task,
        field_name='approval_approved',
        changed_by=tenant_data['manager_a'],
    ).exists()
    assert Notification.objects.filter(
        recipient=tenant_data['employee_a'],
        type=NotificationType.APPROVAL_APPROVED,
        task=task,
    ).exists()


@pytest.mark.django_db
def test_task_exposes_pending_approval_and_no_fake_subtask_progress(api_client, tenant_data):
    task = Task.objects.create(
        title='Livrable en validation',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['employee_a'],
        status=Status.IN_PROGRESS,
        requires_completion_approval=True,
    )
    ApprovalRequest.objects.create(
        company=tenant_data['company_a'],
        task=task,
        requested_by=tenant_data['employee_a'],
        reason='Livrable prêt.',
    )
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.get(f'/api/tasks/{task.id}/')

    assert response.status_code == 200
    assert response.data['approval_pending'] is True
    assert response.data['status_display'] == 'En attente de validation'
    assert response.data['progress_percent'] is None


@pytest.mark.django_db
def test_completed_late_task_preserves_deadline_information(api_client, tenant_data):
    task = Task.objects.create(
        title='Livraison tardive',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['employee_a'],
        status=Status.COMPLETED,
        due_date=date.today() - timedelta(days=2),
        completed_at=timezone.now(),
    )
    api_client.force_authenticate(tenant_data['manager_a'])

    response = api_client.get(f'/api/tasks/{task.id}/')

    assert response.status_code == 200
    assert response.data['is_overdue'] is False
    assert response.data['deadline_status'] == 'completed_late'
    assert response.data['status_display'] == 'Terminée en retard'


@pytest.mark.django_db
def test_deferred_task_becomes_overdue_after_its_new_deadline(api_client, tenant_data):
    task = Task.objects.create(
        title='Report arrivé à échéance',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['employee_a'],
        status=Status.DEFERRED,
        due_date=date.today() - timedelta(days=1),
    )
    api_client.force_authenticate(tenant_data['employee_a'])

    response = api_client.get(f'/api/tasks/{task.id}/')

    assert response.status_code == 200
    assert response.data['is_overdue'] is True
    assert response.data['deadline_status'] == 'overdue'
    assert response.data['status_display'] == 'En retard'


@pytest.mark.django_db
def test_rejected_completion_requires_comment_and_preserves_task(api_client, tenant_data):
    task = Task.objects.create(
        title='Livrable incomplet',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['employee_a'],
        status=Status.IN_PROGRESS,
        requires_completion_approval=True,
    )
    approval = ApprovalRequest.objects.create(
        company=tenant_data['company_a'],
        task=task,
        requested_by=tenant_data['employee_a'],
        reason='Travail présenté pour contrôle.',
    )

    api_client.force_authenticate(tenant_data['manager_a'])
    missing_reason = api_client.patch(
        f'/api/tasks/approvals/{approval.id}/',
        {'status': ApprovalStatus.REJECTED},
        format='json',
    )
    assert missing_reason.status_code == 400

    rejected = api_client.patch(
        f'/api/tasks/approvals/{approval.id}/',
        {
            'status': ApprovalStatus.REJECTED,
            'review_comment': 'Le procès-verbal de recette est manquant.',
        },
        format='json',
    )
    assert rejected.status_code == 200
    assert rejected.data['status'] == ApprovalStatus.REJECTED
    task.refresh_from_db()
    assert task.status == Status.IN_PROGRESS
    assert Notification.objects.filter(
        recipient=tenant_data['employee_a'],
        type=NotificationType.APPROVAL_REJECTED,
        task=task,
    ).exists()


@pytest.mark.django_db
def test_approval_requests_are_tenant_scoped(api_client, tenant_data):
    task = Task.objects.create(
        title='Validation interne A',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['employee_a'],
        requires_completion_approval=True,
    )
    approval = ApprovalRequest.objects.create(
        company=tenant_data['company_a'],
        task=task,
        requested_by=tenant_data['employee_a'],
        reason='Prêt pour validation.',
    )

    api_client.force_authenticate(tenant_data['employee_b'])
    detail = api_client.get(f'/api/tasks/approvals/{approval.id}/')
    assert detail.status_code == 404
    listing = api_client.get('/api/tasks/approvals/')
    assert listing.status_code == 200
    assert listing.data.get('results', listing.data) == []


@pytest.mark.django_db
def test_report_request_notifies_reviewers_and_rejection_requires_reason(api_client, tenant_data):
    task = Task.objects.create(
        title='Échéance à arbitrer',
        company=tenant_data['company_a'],
        creator=tenant_data['manager_a'],
        assigned_to=tenant_data['employee_a'],
        due_date=date.today() + timedelta(days=2),
    )
    Notification.objects.all().delete()

    api_client.force_authenticate(tenant_data['employee_a'])
    requested = api_client.post(
        f'/api/tasks/{task.id}/reports/',
        {
            'new_due_date': date.today() + timedelta(days=5),
            'reason': 'Une dépendance externe retarde la livraison.',
        },
        format='json',
    )
    assert requested.status_code == 201
    report_id = requested.data['id']
    assert Notification.objects.filter(
        recipient=tenant_data['manager_a'],
        type=NotificationType.APPROVAL_REQUESTED,
        task=task,
    ).exists()

    api_client.force_authenticate(tenant_data['manager_a'])
    missing_reason = api_client.patch(
        f'/api/tasks/{task.id}/reports/{report_id}/',
        {'status': 'rejected'},
        format='json',
    )
    assert missing_reason.status_code == 400

    rejected = api_client.patch(
        f'/api/tasks/{task.id}/reports/{report_id}/',
        {'status': 'rejected', 'review_comment': 'Le délai contractuel doit être maintenu.'},
        format='json',
    )
    assert rejected.status_code == 200
    assert Notification.objects.filter(
        recipient=tenant_data['employee_a'],
        type=NotificationType.REPORT_REJECTED,
        task=task,
    ).exists()
