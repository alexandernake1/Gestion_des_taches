from django.conf import settings
from django.db import models


class Company(models.Model):
    """Company model for multi-tenant architecture."""
    
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=255, blank=True)
    
    # Company settings
    timezone = models.CharField(max_length=50, default='UTC')
    language = models.CharField(max_length=10, default='en')
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'companies'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.name


class BillingPeriod(models.TextChoices):
    MONTHLY = 'monthly', 'Mensuel'
    YEARLY = 'yearly', 'Annuel'


class SubscriptionPlan(models.Model):
    """SaaS Subscription Plan definition."""
    
    name = models.CharField(max_length=100)
    code = models.SlugField(unique=True, max_length=50)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    billing_period = models.CharField(
        max_length=20,
        choices=BillingPeriod.choices,
        default=BillingPeriod.MONTHLY
    )
    max_users = models.PositiveIntegerField(default=5, help_text="0 pour illimité")
    max_teams = models.PositiveIntegerField(default=2, help_text="0 pour illimité")
    storage_limit_mb = models.PositiveIntegerField(default=500, help_text="0 pour illimité")
    feature_flags = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscription_plans'
        ordering = ['price', 'created_at']

    def __str__(self):
        return f"{self.name} ({self.code})"


class SubscriptionStatus(models.TextChoices):
    TRIAL = 'trial', 'Essai'
    ACTIVE = 'active', 'Actif'
    PENDING_VERIFICATION = 'pending_verification', 'En attente de vérification'
    PAST_DUE = 'past_due', 'Paiement en retard'
    SUSPENDED = 'suspended', 'Suspendu'
    CANCELLED = 'cancelled', 'Annulé'


class CompanySubscription(models.Model):
    """Active subscription associated with a company."""
    
    company = models.OneToOneField(
        Company,
        on_delete=models.CASCADE,
        related_name='subscription'
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='company_subscriptions'
    )
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.TRIAL
    )
    starts_at = models.DateTimeField(auto_now_add=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    grace_ends_at = models.DateTimeField(null=True, blank=True)
    renewal_reminder_sent_at = models.DateTimeField(null=True, blank=True)
    seats_override = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Accorde une limite personnalisée de comptes si spécifié."
    )
    teams_override = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Accorde une limite personnalisée d'équipes si spécifié."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'company_subscriptions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.company.name} - {self.plan.name} ({self.get_status_display()})"

    @property
    def effective_max_users(self):
        if self.seats_override is not None:
            return self.seats_override
        return self.plan.max_users

    @property
    def effective_max_teams(self):
        if self.teams_override is not None:
            return self.teams_override
        return self.plan.max_teams

    def is_suspended(self):
        return self.status == SubscriptionStatus.SUSPENDED


class PaymentStatus(models.TextChoices):
    PENDING = 'pending', 'En attente'
    SUCCEEDED = 'succeeded', 'Réussi'
    FAILED = 'failed', 'Échoué'
    CANCELLED = 'cancelled', 'Annulé'


class PaymentTransaction(models.Model):
    """Provider-neutral payment record; the test provider is used until Ligdicash."""

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='payments',
    )
    subscription = models.ForeignKey(
        CompanySubscription,
        on_delete=models.CASCADE,
        related_name='payments',
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='payments',
    )
    reference = models.CharField(max_length=64, unique=True)
    provider = models.CharField(max_length=30, default='test')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='XOF')
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    provider_payload = models.JSONField(default=dict, blank=True)
    failure_reason = models.CharField(max_length=255, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['reference']),
        ]

    def __str__(self):
        return f"{self.reference} - {self.get_status_display()}"


class AnnouncementType(models.TextChoices):
    INFO = 'info', 'Information'
    WARNING = 'warning', 'Avertissement'
    DANGER = 'danger', 'Maintenance / Urgent'


class AnnouncementTarget(models.TextChoices):
    ALL = 'all', 'Tous les utilisateurs'
    OWNERS = 'owners', 'Propriétaires uniquement'


class SystemAnnouncement(models.Model):
    """Global system announcements displayed to all users or specific roles."""
    message = models.TextField()
    type = models.CharField(
        max_length=20,
        choices=AnnouncementType.choices,
        default=AnnouncementType.INFO
    )
    target_audience = models.CharField(
        max_length=20,
        choices=AnnouncementTarget.choices,
        default=AnnouncementTarget.ALL
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'system_announcements'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_type_display()}: {self.message[:30]}"


class PlatformAuditLog(models.Model):
    """Trace readable of sensitive operations performed in the SaaS back-office."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='platform_audit_actions',
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='platform_audit_events',
    )
    category = models.CharField(max_length=40)
    action = models.CharField(max_length=80)
    entity_label = models.CharField(max_length=255, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'platform_audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category', 'created_at'], name='platform_au_categor_dd069c_idx'),
            models.Index(fields=['company', 'created_at'], name='platform_au_company_bb7bda_idx'),
        ]

    def __str__(self):
        return f"{self.category}: {self.action}"
