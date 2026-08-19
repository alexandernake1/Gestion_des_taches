from rest_framework import serializers
from .models import (
    Company,
    SubscriptionPlan,
    CompanySubscription,
    PaymentTransaction,
    PlatformAuditLog,
)


class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model."""

    workspace_type_display = serializers.CharField(
        source='get_workspace_type_display',
        read_only=True,
    )
    is_personal = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'slug', 'logo', 'description', 'website',
            'contact_email', 'contact_phone', 'address',
            'timezone', 'language', 'workspace_type', 'workspace_type_display',
            'is_personal', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CompanyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a company."""
    
    class Meta:
        model = Company
        fields = [
            'name', 'slug', 'logo', 'description', 'website',
            'contact_email', 'contact_phone', 'address',
            'timezone', 'language', 'workspace_type'
        ]
    
    def validate_slug(self, value):
        if Company.objects.filter(slug=value).exists():
            raise serializers.ValidationError("Une entreprise utilise déjà cet identifiant.")
        return value

    def validate_contact_email(self, value):
        normalized_email = value.strip().lower()
        if Company.objects.filter(contact_email__iexact=normalized_email).exists():
            raise serializers.ValidationError("Cet email d'entreprise est déjà utilisé.")
        return normalized_email


class CompanyUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a company."""
    
    class Meta:
        model = Company
        fields = [
            'name', 'logo', 'description', 'website',
            'contact_email', 'contact_phone', 'address',
            'timezone', 'language', 'is_active'
        ]


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    billing_period_display = serializers.CharField(source='get_billing_period_display', read_only=True)
    audience_display = serializers.CharField(source='get_audience_display', read_only=True)

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'code', 'description', 'price', 'billing_period',
            'billing_period_display', 'audience', 'audience_display',
            'max_users', 'max_teams', 'storage_limit_mb',
            'feature_flags', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CompanySubscriptionSerializer(serializers.ModelSerializer):
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    effective_max_users = serializers.IntegerField(read_only=True)
    effective_max_teams = serializers.IntegerField(read_only=True)
    is_suspended = serializers.BooleanField(read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    # Usage metrics
    active_users_count = serializers.SerializerMethodField()
    active_teams_count = serializers.SerializerMethodField()

    class Meta:
        model = CompanySubscription
        fields = [
            'id', 'company', 'company_name', 'plan', 'plan_details', 'status',
            'status_display', 'starts_at', 'ends_at', 'trial_ends_at',
            'grace_ends_at',
            'seats_override', 'effective_max_users', 'effective_max_teams',
            'is_suspended', 'active_users_count', 'active_teams_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def get_active_users_count(self, obj) -> int:
        from domain.users.models import User
        return User.objects.filter(company=obj.company, is_active=True).count()

    def get_active_teams_count(self, obj) -> int:
        from domain.teams.models import Team
        return Team.objects.filter(company=obj.company, is_active=True).count()

    def to_representation(self, instance):
        from .services import synchronize_subscription_status
        return super().to_representation(
            synchronize_subscription_status(instance)
        )


class ChangePlanSerializer(serializers.Serializer):
    plan_code = serializers.CharField(required=True)


class SubscriptionQuoteRequestSerializer(serializers.Serializer):
    plan_code = serializers.CharField(required=True)


class PaymentTransactionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'reference', 'provider', 'amount', 'currency', 'status',
            'status_display', 'plan', 'plan_name', 'company', 'company_name',
            'paid_at', 'created_at',
            'failure_reason',
        ]
        read_only_fields = fields


class StartTestPaymentSerializer(serializers.Serializer):
    plan_code = serializers.SlugField()


class CompleteTestPaymentSerializer(serializers.Serializer):
    outcome = serializers.ChoiceField(
        choices=['succeeded', 'failed', 'cancelled', 'pending'],
    )


class AdminCompanySubscriptionUpdateSerializer(serializers.ModelSerializer):
    """Serializer used by super-admin to update subscription limits (overrides)."""
    class Meta:
        model = CompanySubscription
        fields = ['seats_override']


class SystemAnnouncementSerializer(serializers.ModelSerializer):
    """Serializer for SystemAnnouncement model."""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    target_audience_display = serializers.CharField(source='get_target_audience_display', read_only=True)

    class Meta:
        from .models import SystemAnnouncement
        model = SystemAnnouncement
        fields = ['id', 'message', 'type', 'type_display', 'target_audience', 'target_audience_display', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class PlatformAuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.full_name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = PlatformAuditLog
        fields = [
            'id', 'actor', 'actor_name', 'company', 'company_name', 'category',
            'action', 'entity_label', 'details', 'created_at',
        ]
        read_only_fields = fields
