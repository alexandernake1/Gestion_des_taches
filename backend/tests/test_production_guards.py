from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from domain.companies.models import Company, SubscriptionPlan, WorkspaceType
from domain.tasks.models import TaskAttachment
from domain.users.models import User


@pytest.mark.django_db
@override_settings(PAYMENT_PROVIDER='disabled', ALLOW_TEST_PAYMENT_SIMULATOR=False)
def test_paid_registration_is_blocked_when_real_payments_are_unavailable(api_client):
    plan = SubscriptionPlan.objects.create(
        name='Offre payante indisponible',
        code='paid-disabled-registration',
        price=15000,
        audience=WorkspaceType.COMPANY,
    )

    response = api_client.post(
        '/api/auth/register/company/',
        {
            'company_name': 'Entreprise non facturée',
            'contact_email': 'billing-disabled@example.com',
            'contact_phone': '+22671111111',
            'plan_code': plan.code,
            'first_name': 'Admin',
            'last_name': 'Test',
            'email': 'owner-disabled@example.com',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'accept_terms': True,
        },
        format='json',
    )

    assert response.status_code == 400
    assert 'plan_code' in response.data
    assert not Company.objects.filter(name='Entreprise non facturée').exists()
    assert not User.objects.filter(email='owner-disabled@example.com').exists()


@pytest.mark.django_db
@override_settings(PAYMENT_PROVIDER='disabled', ALLOW_TEST_PAYMENT_SIMULATOR=False)
def test_public_plan_catalog_hides_unavailable_paid_plans(api_client):
    SubscriptionPlan.objects.create(
        name='Gratuit public',
        code='free-public-catalog',
        price=0,
        audience=WorkspaceType.PERSONAL,
    )
    SubscriptionPlan.objects.create(
        name='Payant masqué',
        code='paid-hidden-catalog',
        price=5000,
        audience=WorkspaceType.PERSONAL,
    )

    response = api_client.get('/api/companies/plans/?audience=personal')

    assert response.status_code == 200
    returned_codes = {plan['code'] for plan in response.data}
    assert 'free-public-catalog' in returned_codes
    assert 'paid-hidden-catalog' not in returned_codes


@pytest.mark.django_db
@override_settings(PAYMENT_PROVIDER='test', ALLOW_TEST_PAYMENT_SIMULATOR=False)
def test_start_payment_is_blocked_when_simulator_is_disabled(api_client, tenant_data):
    paid_plan = SubscriptionPlan.objects.create(
        name='Payant non simulable',
        code='paid-no-simulator',
        price=1000,
        audience=WorkspaceType.COMPANY,
    )
    api_client.force_authenticate(tenant_data['owner_a'])

    response = api_client.post(
        '/api/companies/subscription/payments/start/',
        {'plan_code': paid_plan.code},
        format='json',
    )

    assert response.status_code == 503


@pytest.mark.django_db(transaction=True)
def test_deleting_attachment_removes_the_stored_file(settings, tmp_path, tenant_data):
    settings.MEDIA_ROOT = tmp_path
    attachment = TaskAttachment.objects.create(
        task=tenant_data['task_a'],
        uploaded_by=tenant_data['employee_a'],
        file=SimpleUploadedFile('preuve.txt', b'preuve'),
        filename='preuve.txt',
        file_size=6,
        mime_type='text/plain',
    )
    stored_path = Path(attachment.file.path)
    assert stored_path.exists()

    attachment.delete()

    assert not stored_path.exists()
