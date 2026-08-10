from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from datetime import timedelta
import uuid

from .models import User, Role, UserAuditLog
from domain.companies.models import (
    Company,
    CompanySubscription,
    PaymentStatus,
    PaymentTransaction,
    SubscriptionPlan,
    SubscriptionStatus,
)


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user profile."""
    
    full_name = serializers.CharField(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'avatar', 'company', 'company_name', 'role', 'role_display',
            'is_active', 'is_superuser', 'must_change_password', 'last_login',
            'created_at', 'updated_at', 'weekly_capacity_hours',
        ]
        read_only_fields = ['id', 'is_superuser', 'must_change_password', 'created_at', 'updated_at', 'company']


class UserListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for user lists."""
    
    full_name = serializers.CharField(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name', 'phone',
            'role', 'role_display',
            'is_active', 'must_change_password', 'last_login', 'created_at',
            'weekly_capacity_hours',
        ]


class RegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'password',
            'password_confirm', 'phone'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class CompanyRegistrationSerializer(serializers.Serializer):
    """Atomic public onboarding for a company and its first owner."""

    company_name = serializers.CharField(max_length=255)
    company_slug = serializers.SlugField(max_length=255, required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)
    contact_email = serializers.EmailField()
    contact_phone = serializers.CharField(max_length=30)
    address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    plan_code = serializers.SlugField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    accept_terms = serializers.BooleanField()

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un compte utilise déjà cette adresse email.")
        return value.lower()

    def validate_contact_email(self, value):
        normalized_email = value.lower()
        if Company.objects.filter(contact_email__iexact=normalized_email).exists():
            raise serializers.ValidationError("Cet email d'entreprise est déjà utilisé.")
        return normalized_email

    def validate_plan_code(self, value):
        try:
            return SubscriptionPlan.objects.get(code=value, is_active=True)
        except SubscriptionPlan.DoesNotExist as exc:
            raise serializers.ValidationError("Ce forfait n'est pas disponible.") from exc

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': "Les mots de passe ne correspondent pas.",
            })
        if not attrs['accept_terms']:
            raise serializers.ValidationError({
                'accept_terms': "Vous devez accepter les conditions d'utilisation.",
            })
        candidate = attrs.get('company_slug') or slugify(attrs['company_name'])
        if not candidate:
            raise serializers.ValidationError({'company_name': "Nom d'entreprise invalide."})
        if Company.objects.filter(slug=candidate).exists():
            raise serializers.ValidationError({
                'company_slug': "Cet identifiant d'espace est déjà utilisé.",
            })
        attrs['company_slug'] = candidate
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        plan = validated_data.pop('plan_code')
        validated_data.pop('password_confirm')
        validated_data.pop('accept_terms')
        password = validated_data.pop('password')

        company = Company.objects.create(
            name=validated_data.pop('company_name'),
            slug=validated_data.pop('company_slug'),
            website=validated_data.pop('website', ''),
            contact_email=validated_data.pop('contact_email'),
            contact_phone=validated_data.pop('contact_phone'),
            address=validated_data.pop('address', ''),
            language='fr',
        )
        now = timezone.now()
        is_free = plan.price == 0
        subscription = CompanySubscription.objects.create(
            company=company,
            plan=plan,
            status=SubscriptionStatus.ACTIVE if is_free else SubscriptionStatus.PENDING_VERIFICATION,
            ends_at=None if is_free else now + timedelta(days=30 if plan.billing_period == 'monthly' else 365),
        )
        payment = None
        if not is_free:
            payment = PaymentTransaction.objects.create(
                company=company,
                subscription=subscription,
                plan=plan,
                reference=f"TEST-{uuid.uuid4().hex[:20].upper()}",
                amount=plan.price,
                status=PaymentStatus.SUCCEEDED,
                paid_at=now,
                provider_payload={'mode': 'simulation', 'result': 'approved'},
            )
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.save(update_fields=['status', 'updated_at'])

        user = User.objects.create_user(
            company=company,
            role=Role.OWNER,
            password=password,
            **validated_data,
        )
        return {
            'user': user,
            'company': company,
            'subscription': subscription,
            'payment': payment,
        }


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change."""
    
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password]
    )
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                "new_password": "Password fields didn't match."
            })
        return attrs
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value


class UpdateProfileSerializer(serializers.ModelSerializer):
    """Serializer for profile update."""
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'avatar']


class UserManagementSerializer(serializers.ModelSerializer):
    """Serializer for user management (admin/manager)."""
    
    full_name = serializers.CharField(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'avatar', 'role', 'role_display', 'is_active'
            , 'weekly_capacity_hours'
        ]
        read_only_fields = ['id']

    def validate_role(self, value):
        requester = self.context['request'].user
        if value == Role.OWNER:
            raise serializers.ValidationError(
                "The Owner role cannot be assigned directly."
            )
        if not requester.is_administrator() and value != Role.EMPLOYEE:
            raise serializers.ValidationError(
                "Only administrators can assign manager roles."
            )
        return value

    def validate_weekly_capacity_hours(self, value):
        if value < 1 or value > 168:
            raise serializers.ValidationError(
                "Weekly capacity must be between 1 and 168 hours."
            )
        return value

    def validate(self, attrs):
        instance = self.instance
        requester = self.context['request'].user
        if instance:
            if instance.role == Role.OWNER:
                if not (requester.is_superuser or requester.is_owner()):
                    raise serializers.ValidationError(
                        "Only the company owner or super-administrator can modify this account."
                    )
                if (
                    attrs.get('role', instance.role) != Role.OWNER
                    or attrs.get('is_active', instance.is_active) is False
                ):
                    raise serializers.ValidationError(
                        "The company owner account cannot be deactivated or demoted."
                    )
        return attrs


class InviteUserSerializer(serializers.Serializer):
    """Serializer for inviting a user to a company."""
    
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    role = serializers.ChoiceField(choices=Role.choices, default=Role.EMPLOYEE)
    phone = serializers.CharField(required=False, allow_blank=True)
    weekly_capacity_hours = serializers.IntegerField(required=False, min_value=1, max_value=168, default=40)

    def validate_role(self, value):
        requester = self.context['request'].user
        if value == Role.OWNER:
            raise serializers.ValidationError(
                "The Owner role cannot be assigned via invitation."
            )
        if not requester.is_administrator() and value != Role.EMPLOYEE:
            raise serializers.ValidationError(
                "Only administrators can invite manager roles."
            )
        return value


class UserAuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.full_name', read_only=True)
    target_name = serializers.CharField(source='target.full_name', read_only=True)

    class Meta:
        model = UserAuditLog
        fields = [
            'id', 'actor', 'actor_name', 'target', 'target_name',
            'action', 'details', 'created_at',
        ]
