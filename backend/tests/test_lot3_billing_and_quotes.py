from datetime import timedelta
from decimal import Decimal
import pytest
from django.utils import timezone

from domain.companies.models import (
    BillingPeriod,
    Company,
    CompanySubscription,
    PaymentStatus,
    PaymentTransaction,
    SubscriptionPlan,
    SubscriptionStatus,
    WorkspaceType,
)
from domain.companies.services import calculate_subscription_quote, start_test_payment


@pytest.mark.django_db
class TestLot3BillingAndQuotes:
    """Validation suite for Lot 3: prorata calculation, quotes, and plan changes."""

    @pytest.fixture(autouse=True)
    def clean_subscriptions(self, tenant_data):
        CompanySubscription.objects.filter(company__in=[tenant_data['company_a'], tenant_data['company_b']]).delete()
        PaymentTransaction.objects.filter(company__in=[tenant_data['company_a'], tenant_data['company_b']]).delete()

    def test_quote_for_new_paid_plan_without_previous_paid_subscription(self, api_client, tenant_data):
        company = tenant_data['company_a']
        paid_plan = SubscriptionPlan.objects.create(
            name='Forfait Entreprise',
            code='plan-pro-quote',
            price=Decimal('50000.00'),
            billing_period=BillingPeriod.MONTHLY,
            audience=WorkspaceType.COMPANY,
            max_users=20,
            max_teams=5,
        )

        api_client.force_authenticate(tenant_data['owner_a'])
        response = api_client.get(f'/api/companies/subscription/quote/?plan_code={paid_plan.code}')

        assert response.status_code == 200
        data = response.data
        assert data['target_plan']['code'] == paid_plan.code
        assert data['gross_amount'] == 50000.0
        assert data['credit_applied'] == 0.0
        assert data['net_amount_due'] == 50000.0
        assert data['is_free_upgrade'] is False
        assert data['currency'] == 'XOF'

    def test_quote_with_prorata_credit_during_active_paid_subscription(self, api_client, tenant_data):
        company = tenant_data['company_a']
        now = timezone.now()

        current_plan = SubscriptionPlan.objects.create(
            name='Forfait Starter',
            code='plan-starter-prorata',
            price=Decimal('30000.00'),
            billing_period=BillingPeriod.MONTHLY,
            audience=WorkspaceType.COMPANY,
            max_users=5,
            max_teams=2,
        )
        target_plan = SubscriptionPlan.objects.create(
            name='Forfait Scale',
            code='plan-scale-prorata',
            price=Decimal('60000.00'),
            billing_period=BillingPeriod.MONTHLY,
            audience=WorkspaceType.COMPANY,
            max_users=30,
            max_teams=10,
        )

        # 30-day cycle: started 10 days ago, ends in 20 days (2/3 remaining)
        starts_at = now - timedelta(days=10)
        ends_at = now + timedelta(days=20)

        subscription, _ = CompanySubscription.objects.update_or_create(
            company=company,
            defaults={
                'plan': current_plan,
                'status': SubscriptionStatus.ACTIVE,
                'ends_at': ends_at,
            },
        )
        CompanySubscription.objects.filter(id=subscription.id).update(starts_at=starts_at)

        # Direct service test
        quote = calculate_subscription_quote(company, target_plan, now=now)
        assert quote['gross_amount'] == 60000.0
        assert quote['prorata_details']['total_days'] == 30
        assert quote['prorata_details']['remaining_days'] == 20
        # 20/30 of 30,000 = 20,000 credit
        assert quote['credit_applied'] == 20000.0
        assert quote['net_amount_due'] == 40000.0

        # API endpoint test
        api_client.force_authenticate(tenant_data['owner_a'])
        response = api_client.post(
            '/api/companies/subscription/quote/',
            {'plan_code': target_plan.code},
            format='json',
        )
        assert response.status_code == 200
        assert response.data['net_amount_due'] == 40000.0
        assert response.data['credit_applied'] == 20000.0

    def test_plan_switch_fully_covered_by_prorata_credit_activates_immediately(self, api_client, tenant_data):
        company = tenant_data['company_a']
        now = timezone.now()

        current_plan = SubscriptionPlan.objects.create(
            name='Forfait Élite',
            code='plan-elite-prorata',
            price=Decimal('100000.00'),
            billing_period=BillingPeriod.MONTHLY,
            audience=WorkspaceType.COMPANY,
        )
        target_plan = SubscriptionPlan.objects.create(
            name='Forfait PME',
            code='plan-pme-prorata',
            price=Decimal('40000.00'),
            billing_period=BillingPeriod.MONTHLY,
            audience=WorkspaceType.COMPANY,
        )

        # 15 days remaining out of 30 -> 50,000 credit > 40,000 gross
        starts_at = now - timedelta(days=15)
        ends_at = now + timedelta(days=15)

        subscription = CompanySubscription.objects.create(
            company=company,
            plan=current_plan,
            status=SubscriptionStatus.ACTIVE,
            ends_at=ends_at,
        )
        CompanySubscription.objects.filter(id=subscription.id).update(starts_at=starts_at)

        api_client.force_authenticate(tenant_data['owner_a'])
        response = api_client.post(
            '/api/companies/subscription/change-plan/',
            {'plan_code': target_plan.code},
            format='json',
        )

        assert response.status_code == 200
        assert response.data['plan_details']['code'] == target_plan.code
        assert response.data['status'] == 'active'

        # Succeeded credit transaction recorded
        credit_tx = PaymentTransaction.objects.filter(company=company, status=PaymentStatus.SUCCEEDED).first()
        assert credit_tx is not None
        assert credit_tx.reference.startswith('CREDIT-')
        assert credit_tx.amount == Decimal('0.00')

    def test_start_payment_applies_prorata_net_amount_due(self, api_client, tenant_data):
        company = tenant_data['company_a']
        now = timezone.now()

        current_plan = SubscriptionPlan.objects.create(
            name='Base Plan',
            code='base-plan-prorata',
            price=Decimal('20000.00'),
            billing_period=BillingPeriod.MONTHLY,
            audience=WorkspaceType.COMPANY,
        )
        target_plan = SubscriptionPlan.objects.create(
            name='Premium Plan',
            code='premium-plan-prorata',
            price=Decimal('50000.00'),
            billing_period=BillingPeriod.MONTHLY,
            audience=WorkspaceType.COMPANY,
        )

        # 15 days remaining -> 10,000 credit -> 40,000 net due
        subscription = CompanySubscription.objects.create(
            company=company,
            plan=current_plan,
            status=SubscriptionStatus.ACTIVE,
            ends_at=now + timedelta(days=15),
        )
        CompanySubscription.objects.filter(id=subscription.id).update(starts_at=now - timedelta(days=15))

        api_client.force_authenticate(tenant_data['owner_a'])
        response = api_client.post(
            '/api/companies/subscription/payments/start/',
            {'plan_code': target_plan.code},
            format='json',
        )

        assert response.status_code == 201
        assert response.data['amount'] == '40000.00'
        assert response.data['status'] == 'pending'
