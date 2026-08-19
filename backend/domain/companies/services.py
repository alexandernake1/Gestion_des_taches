from datetime import timedelta

from django.utils import timezone

import uuid

from decimal import Decimal
from .models import (
    BillingPeriod,
    Company,
    CompanySubscription,
    PaymentStatus,
    PaymentTransaction,
    SubscriptionPlan,
    SubscriptionStatus,
)


def _notify_owners(subscription, notification_type, title, message):
    from domain.notifications.services import create_smart_notification
    from domain.users.models import Role, User

    owners = User.objects.filter(
        company=subscription.company,
        role=Role.OWNER,
        is_active=True,
    )
    for owner in owners:
        create_smart_notification(
            recipient=owner,
            notification_type=notification_type,
            title=title,
            message=message,
            dedupe_key=f'subscription:{subscription.id}:{notification_type}:{subscription.updated_at.date()}',
        )


def _period_end(plan, start):
    return start + timedelta(
        days=365 if plan.billing_period == BillingPeriod.YEARLY else 30,
    )


def calculate_subscription_quote(
    company: Company,
    target_plan: SubscriptionPlan,
    now=None,
) -> dict:
    """Calculate the remaining prorata credit and generate a formal quote preview before plan switch."""
    if now is None:
        now = timezone.now()

    subscription = CompanySubscription.objects.filter(company=company).select_related('plan').first()
    current_plan = subscription.plan if subscription else None
    current_status = subscription.status if subscription else None
    current_price = current_plan.price if (current_plan and current_status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]) else Decimal('0.00')

    ends_at = subscription.ends_at if subscription else None
    starts_at = subscription.starts_at if subscription else None

    credit = Decimal('0.00')
    remaining_days = 0
    total_days = 0
    consumed_days = 0

    if (
        current_plan
        and current_status == SubscriptionStatus.ACTIVE
        and current_price > Decimal('0.00')
        and ends_at
        and ends_at > now
    ):
        nominal_days = 365 if current_plan.billing_period == BillingPeriod.YEARLY else 30
        remaining_seconds = max(0.0, (ends_at - now).total_seconds())
        remaining_days = max(0, int(round(remaining_seconds / 86400)))

        if starts_at and starts_at < ends_at and (ends_at - starts_at).total_seconds() >= nominal_days * 86400 * 0.9:
            total_days = max(remaining_days, int(round((ends_at - starts_at).total_seconds() / 86400)))
        else:
            total_days = max(remaining_days, nominal_days)

        remaining_ratio = min(Decimal('1.00'), max(Decimal('0.00'), Decimal(str(remaining_days)) / Decimal(str(total_days))))
        credit = round(remaining_ratio * current_price, 2)
        consumed_days = max(0, total_days - remaining_days)

    gross_amount = target_plan.price
    credit_applied = min(credit, gross_amount)
    net_amount_due = max(Decimal('0.00'), gross_amount - credit)
    unused_credit = max(Decimal('0.00'), credit - gross_amount)

    return {
        'company_id': company.id,
        'company_name': company.name,
        'workspace_type': company.workspace_type,
        'current_plan': {
            'id': current_plan.id if current_plan else None,
            'name': current_plan.name if current_plan else 'Aucun',
            'code': current_plan.code if current_plan else None,
            'price': float(current_plan.price) if current_plan else 0.0,
            'billing_period': current_plan.billing_period if current_plan else None,
            'status': current_status or 'none',
            'ends_at': ends_at.isoformat() if ends_at else None,
        },
        'target_plan': {
            'id': target_plan.id,
            'name': target_plan.name,
            'code': target_plan.code,
            'price': float(target_plan.price),
            'billing_period': target_plan.billing_period,
            'audience': target_plan.audience,
            'max_users': target_plan.max_users,
            'max_teams': target_plan.max_teams,
        },
        'prorata_details': {
            'remaining_days': remaining_days,
            'total_days': total_days,
            'consumed_days': consumed_days,
            'credit_amount': float(credit),
        },
        'gross_amount': float(gross_amount),
        'credit_applied': float(credit_applied),
        'net_amount_due': float(net_amount_due),
        'unused_credit': float(unused_credit),
        'currency': 'XOF',
        'quote_date': now.isoformat(),
        'is_free_upgrade': net_amount_due == Decimal('0.00'),
    }


def start_test_payment(company, plan: SubscriptionPlan, custom_amount: Decimal = None) -> PaymentTransaction:
    quote = calculate_subscription_quote(company, plan)
    amount = Decimal(str(quote['net_amount_due'])) if custom_amount is None else custom_amount

    subscription, _ = CompanySubscription.objects.get_or_create(
        company=company,
        defaults={'plan': plan, 'status': SubscriptionStatus.PENDING_VERIFICATION},
    )
    pending = PaymentTransaction.objects.filter(
        company=company,
        plan=plan,
        status=PaymentStatus.PENDING,
    ).first()
    if pending:
        if pending.amount != amount:
            pending.amount = amount
            pending.provider_payload = {
                **pending.provider_payload,
                'quote': quote,
            }
            pending.save(update_fields=['amount', 'provider_payload', 'updated_at'])
        return pending

    subscription.plan = plan
    subscription.status = SubscriptionStatus.PENDING_VERIFICATION
    subscription.save(update_fields=['plan', 'status', 'updated_at'])
    return PaymentTransaction.objects.create(
        company=company,
        subscription=subscription,
        plan=plan,
        reference=f"TEST-{uuid.uuid4().hex[:20].upper()}",
        amount=amount,
        status=PaymentStatus.PENDING,
        provider_payload={'mode': 'simulation', 'quote': quote},
    )


def complete_test_payment(payment: PaymentTransaction, outcome: str):
    if payment.status != PaymentStatus.PENDING:
        return payment

    now = timezone.now()
    subscription = payment.subscription
    payment.provider_payload = {
        **payment.provider_payload,
        'result': outcome,
    }
    if outcome == PaymentStatus.SUCCEEDED:
        payment.status = PaymentStatus.SUCCEEDED
        payment.paid_at = now
        payment.failure_reason = ''
        subscription.plan = payment.plan
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.ends_at = _period_end(payment.plan, now)
        subscription.grace_ends_at = None
        subscription.renewal_reminder_sent_at = None
        subscription.save(update_fields=[
            'plan', 'status', 'ends_at', 'grace_ends_at',
            'renewal_reminder_sent_at', 'updated_at',
        ])
        _notify_owners(
            subscription,
            'payment_succeeded',
            'Paiement confirmé',
            f"Le paiement {payment.reference} a été confirmé. Votre forfait {payment.plan.name} est actif.",
        )
    elif outcome == PaymentStatus.FAILED:
        payment.status = PaymentStatus.FAILED
        payment.failure_reason = 'Transaction refusée par le simulateur.'
        _notify_owners(
            subscription,
            'payment_failed',
            'Paiement refusé',
            f"Le paiement {payment.reference} a échoué. Vous pouvez relancer une nouvelle transaction.",
        )
    elif outcome == PaymentStatus.CANCELLED:
        payment.status = PaymentStatus.CANCELLED
        payment.failure_reason = 'Transaction annulée par le client.'
    else:
        return payment

    payment.save(update_fields=[
        'status', 'paid_at', 'failure_reason', 'provider_payload', 'updated_at',
    ])
    return payment


def synchronize_subscription_status(
    subscription: CompanySubscription,
) -> CompanySubscription:
    """Derive lifecycle state from payment/result dates instead of manual edits."""

    now = timezone.now()
    next_status = subscription.status
    changed = False

    if (
        subscription.status == SubscriptionStatus.TRIAL
        and subscription.trial_ends_at
        and subscription.trial_ends_at <= now
    ):
        next_status = SubscriptionStatus.SUSPENDED
    elif (
        subscription.status in {
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
        }
        and subscription.ends_at
        and subscription.ends_at <= now
    ):
        grace_end = subscription.grace_ends_at or subscription.ends_at + timedelta(days=7)
        if subscription.grace_ends_at is None:
            subscription.grace_ends_at = grace_end
            changed = True
        next_status = SubscriptionStatus.SUSPENDED if grace_end <= now else SubscriptionStatus.PAST_DUE

    if (
        subscription.status == SubscriptionStatus.ACTIVE
        and subscription.ends_at
        and subscription.ends_at - timedelta(days=5) <= now < subscription.ends_at
        and subscription.renewal_reminder_sent_at is None
    ):
        _notify_owners(
            subscription,
            'subscription_reminder',
            'Échéance de votre abonnement',
            f"Votre forfait {subscription.plan.name} arrive à échéance le {subscription.ends_at:%d/%m/%Y}.",
        )
        subscription.renewal_reminder_sent_at = now
        changed = True

    if next_status != subscription.status:
        previous_status = subscription.status
        subscription.status = next_status
        changed = True
        if next_status == SubscriptionStatus.SUSPENDED and previous_status != next_status:
            _notify_owners(
                subscription,
                'subscription_suspended',
                'Abonnement suspendu',
                "Le délai de grâce est terminé. Les modifications sont suspendues jusqu’au prochain paiement.",
            )
    if changed:
        subscription.save(update_fields=[
            'status', 'grace_ends_at', 'renewal_reminder_sent_at', 'updated_at',
        ])
    return subscription
