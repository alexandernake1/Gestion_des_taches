from datetime import timedelta

from django.utils import timezone

import uuid

from .models import (
    BillingPeriod,
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


def start_test_payment(company, plan: SubscriptionPlan) -> PaymentTransaction:
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
        return pending

    subscription.plan = plan
    subscription.status = SubscriptionStatus.PENDING_VERIFICATION
    subscription.save(update_fields=['plan', 'status', 'updated_at'])
    return PaymentTransaction.objects.create(
        company=company,
        subscription=subscription,
        plan=plan,
        reference=f"TEST-{uuid.uuid4().hex[:20].upper()}",
        amount=plan.price,
        status=PaymentStatus.PENDING,
        provider_payload={'mode': 'simulation'},
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
