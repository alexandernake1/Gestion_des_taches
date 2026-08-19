from decimal import Decimal
import uuid
from django.utils import timezone
from rest_framework import generics, serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.conf import settings
from drf_spectacular.utils import extend_schema
from common.permissions.permissions import IsAdministrator, IsSameCompany, IsSuperUser
from common.utils import get_requested_company
from .models import (
    Company,
    CompanySubscription,
    PaymentStatus,
    PaymentTransaction,
    PlatformAuditLog,
    SubscriptionPlan,
    SubscriptionStatus,
    SystemAnnouncement,
    WorkspaceType,
)
from .serializers import (
    CompanySerializer,
    CompanyCreateSerializer,
    CompanyUpdateSerializer,
    SubscriptionPlanSerializer,
    CompanySubscriptionSerializer,
    AdminCompanySubscriptionUpdateSerializer,
    ChangePlanSerializer,
    SubscriptionQuoteRequestSerializer,
    CompleteTestPaymentSerializer,
    PaymentTransactionSerializer,
    StartTestPaymentSerializer,
    SystemAnnouncementSerializer,
    PlatformAuditLogSerializer,
)
from .services import calculate_subscription_quote, complete_test_payment, start_test_payment, _period_end


def log_platform_audit(request, *, category, action, entity_label='', company=None, details=None):
    """Persist sensitive platform actions without exposing tenant data to other tenants."""
    if not request.user.is_authenticated or not request.user.is_superuser:
        return
    PlatformAuditLog.objects.create(
        actor=request.user,
        company=company,
        category=category,
        action=action,
        entity_label=entity_label,
        details=details or {},
    )


class CompanyListCreateView(generics.ListCreateAPIView):
    """List and create companies."""

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Company.objects.none()
        user = self.request.user
        if user.is_superuser:
            return Company.objects.all()
        if user.company:
            return Company.objects.filter(id=user.company.id)
        return Company.objects.none()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CompanyCreateSerializer
        return CompanySerializer

    @extend_schema(
        description="List companies (super-admin sees all, others see their own)",
        responses=CompanySerializer(many=True)
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        description="Create a new company (platform super-admin only)",
        request=CompanyCreateSerializer,
        responses=CompanySerializer
    )
    def post(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(
                {"detail": "Only platform super-administrators can create companies."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().post(request, *args, **kwargs)

    def perform_create(self, serializer):
        company = serializer.save()
        # Create seed data for the new company to make it look "plausible"
        from .seed import seed_company_data
        seed_company_data(company, self.request.user)
        log_platform_audit(
            self.request,
            category='company',
            action='company_created',
            entity_label=company.name,
            company=company,
            details={'slug': company.slug, 'contact_email': company.contact_email},
        )


class CompanyDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve and update a company."""

    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_permissions(self):
        if self.request.user.is_superuser:
            permission_classes = [IsAuthenticated]
        elif self.request.method in ['PUT', 'PATCH']:
            permission_classes = [IsAuthenticated, IsAdministrator, IsSameCompany]
        else:
            permission_classes = [IsAuthenticated, IsSameCompany]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Company.objects.all()
        if self.request.user.company_id:
            return Company.objects.filter(id=self.request.user.company_id)
        return Company.objects.none()

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return CompanyUpdateSerializer
        return CompanySerializer

    def perform_update(self, serializer):
        previous = {
            field: getattr(serializer.instance, field)
            for field in serializer.validated_data
        }
        company = serializer.save()
        changes = {
            field: {'from': previous[field], 'to': getattr(company, field)}
            for field in previous
            if previous[field] != getattr(company, field)
        }
        if changes:
            log_platform_audit(
                self.request,
                category='company',
                action='company_updated',
                entity_label=company.name,
                company=company,
                details={'changes': changes},
            )

    @extend_schema(description="Get company details", responses=CompanySerializer)
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(description="Update company details", request=CompanyUpdateSerializer, responses=CompanySerializer)
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(description="Partially update company details", request=CompanyUpdateSerializer, responses=CompanySerializer)
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


@extend_schema(description="Get current user's company", responses=CompanySerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_company(request):
    """Get the current user's company."""
    company = get_requested_company(request)
    if not company:
        return Response(
            {"detail": "You are not associated with any company or none selected."},
            status=status.HTTP_404_NOT_FOUND
        )
    serializer = CompanySerializer(company)
    return Response(serializer.data)


class SubscriptionPlanListView(generics.ListAPIView):
    """List available subscription plans."""
    permission_classes = [AllowAny]
    serializer_class = SubscriptionPlanSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = SubscriptionPlan.objects.filter(is_active=True)
        audience = self.request.query_params.get('audience')
        if audience in WorkspaceType.values:
            queryset = queryset.filter(audience=audience)
        return queryset


@extend_schema(
    description="Get current company's subscription",
    responses=CompanySubscriptionSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_subscription(request):
    """Get the subscription details for the current user's company."""
    company = get_requested_company(request)
    if not company:
        return Response(
            {"detail": "You are not associated with any company or none selected."},
            status=status.HTTP_404_NOT_FOUND
        )
    subscription, _ = CompanySubscription.objects.get_or_create(
        company=company,
        defaults={
            'plan': (
                SubscriptionPlan.objects.filter(
                    audience=company.workspace_type,
                    is_active=True,
                ).first()
                or SubscriptionPlan.objects.filter(is_active=True).first()
            ),
            'status': 'trial',
        }
    )
    serializer = CompanySubscriptionSerializer(subscription)
    return Response(serializer.data)


@extend_schema(
    description="Calculate subscription quote and prorata credit for plan switch",
    request=SubscriptionQuoteRequestSerializer,
    responses={200: serializers.DictField()}
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def subscription_quote_view(request):
    """Estimate remaining prorata credit and calculate a formal quote before upgrading/switching plans."""
    user = request.user
    if user.is_superuser:
        company_id = request.query_params.get('company_id') or (request.data.get('company_id') if hasattr(request, 'data') else None)
        if company_id:
            try:
                company = Company.objects.get(id=company_id)
            except Company.DoesNotExist:
                return Response({"detail": f"Company {company_id} not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            company = user.company
    else:
        company = user.company

    if not company:
        return Response(
            {"detail": "You are not associated with any company or none selected."},
            status=status.HTTP_404_NOT_FOUND
        )

    plan_code = request.query_params.get('plan_code') or (request.data.get('plan_code') if hasattr(request, 'data') else None)
    if not plan_code:
        return Response(
            {"detail": "Le paramètre 'plan_code' est obligatoire."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        target_plan = SubscriptionPlan.objects.get(
            code=plan_code,
            audience=company.workspace_type,
            is_active=True,
        )
    except SubscriptionPlan.DoesNotExist:
        return Response(
            {"detail": f"Subscription plan '{plan_code}' not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    quote = calculate_subscription_quote(company, target_plan)
    return Response(quote)


@extend_schema(
    description="Change company subscription plan (Owner or Super-admin)",
    request=ChangePlanSerializer,
    responses={200: CompanySubscriptionSerializer}
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_subscription_plan(request):
    """Change a company's subscription plan.
    - Company owner: changes their own company's plan.
    - Platform super-admin: can change any company's plan by passing ?company_id=<id>.
    """
    user = request.user

    if user.is_superuser:
        company_id = request.query_params.get('company_id') or request.data.get('company_id')
        if company_id:
            try:
                company = Company.objects.get(id=company_id)
            except Company.DoesNotExist:
                return Response(
                    {"detail": f"Company {company_id} not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif user.company:
            company = user.company
        else:
            return Response(
                {"detail": "Provide a company_id query parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        if not user.is_owner():
            return Response(
                {"detail": "Only the company owner can change the subscription plan."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not user.company:
            return Response(
                {"detail": "You are not associated with any company."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        company = user.company

    serializer = ChangePlanSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    plan_code = serializer.validated_data['plan_code']

    try:
        new_plan = SubscriptionPlan.objects.get(
            code=plan_code,
            audience=company.workspace_type,
            is_active=True,
        )
    except SubscriptionPlan.DoesNotExist:
        return Response(
            {"detail": f"Subscription plan '{plan_code}' not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    now = timezone.now()
    quote = calculate_subscription_quote(company, new_plan, now=now)

    subscription, _ = CompanySubscription.objects.get_or_create(
        company=company,
        defaults={'plan': new_plan, 'status': SubscriptionStatus.ACTIVE if new_plan.price == 0 else SubscriptionStatus.PENDING_VERIFICATION}
    )

    if new_plan.price == 0 or quote['net_amount_due'] == 0:
        subscription.plan = new_plan
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.ends_at = _period_end(new_plan, now) if new_plan.price > 0 else None
        subscription.grace_ends_at = None
        subscription.renewal_reminder_sent_at = None
        subscription.save(update_fields=['plan', 'status', 'ends_at', 'grace_ends_at', 'renewal_reminder_sent_at', 'updated_at'])

        if quote['credit_applied'] > 0:
            PaymentTransaction.objects.create(
                company=company,
                subscription=subscription,
                plan=new_plan,
                reference=f"CREDIT-{uuid.uuid4().hex[:20].upper()}",
                amount=Decimal('0.00'),
                status=PaymentStatus.SUCCEEDED,
                paid_at=now,
                provider_payload={'mode': 'prorata_credit', 'quote': quote},
            )
    else:
        if subscription.plan != new_plan:
            subscription.plan = new_plan
            subscription.status = SubscriptionStatus.PENDING_VERIFICATION
            subscription.save(update_fields=['plan', 'status', 'updated_at'])

    return Response(CompanySubscriptionSerializer(subscription).data)


class AdminSubscriptionPlanListCreateView(generics.ListCreateAPIView):
    """Platform super-admin endpoint to manage subscription plans."""
    permission_classes = [IsAuthenticated, IsSuperUser]
    serializer_class = SubscriptionPlanSerializer
    queryset = SubscriptionPlan.objects.all()

    def perform_create(self, serializer):
        plan = serializer.save()
        log_platform_audit(
            self.request,
            category='plan',
            action='plan_created',
            entity_label=plan.name,
            details={'code': plan.code, 'price': str(plan.price)},
        )


class AdminSubscriptionPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Platform super-admin endpoint to manage a specific subscription plan."""
    permission_classes = [IsAuthenticated, IsSuperUser]
    serializer_class = SubscriptionPlanSerializer
    queryset = SubscriptionPlan.objects.all()
    lookup_field = 'id'

    def perform_destroy(self, instance):
        # Soft delete: mark as inactive to preserve foreign key relations
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])
        log_platform_audit(
            self.request,
            category='plan',
            action='plan_archived',
            entity_label=instance.name,
            details={'code': instance.code},
        )

    def perform_update(self, serializer):
        previous = {field: getattr(serializer.instance, field) for field in serializer.validated_data}
        plan = serializer.save()
        changes = {
            field: {'from': str(previous[field]), 'to': str(getattr(plan, field))}
            for field in previous
            if previous[field] != getattr(plan, field)
        }
        if changes:
            log_platform_audit(
                self.request,
                category='plan',
                action='plan_updated',
                entity_label=plan.name,
                details={'changes': changes},
            )


class AdminCompanySubscriptionListView(generics.ListAPIView):
    """Platform super-admin endpoint to list all company subscriptions."""
    permission_classes = [IsAuthenticated, IsSuperUser]
    serializer_class = CompanySubscriptionSerializer
    queryset = CompanySubscription.objects.all()


class AdminCompanySubscriptionDetailView(generics.RetrieveUpdateAPIView):
    """Platform super-admin endpoint to inspect or update an automated subscription."""
    permission_classes = [IsAuthenticated, IsSuperUser]
    queryset = CompanySubscription.objects.all()
    lookup_field = 'id'
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return AdminCompanySubscriptionUpdateSerializer
        return CompanySubscriptionSerializer

    def perform_update(self, serializer):
        previous = {field: getattr(serializer.instance, field) for field in serializer.validated_data}
        subscription = serializer.save()
        changes = {
            field: {'from': previous[field], 'to': getattr(subscription, field)}
            for field in previous
            if previous[field] != getattr(subscription, field)
        }
        if changes:
            log_platform_audit(
                self.request,
                category='subscription',
                action='subscription_updated',
                entity_label=subscription.company.name,
                company=subscription.company,
                details={'changes': changes},
            )


@extend_schema(
    description="List payment history for the owner company or all companies for super-admin",
    responses=PaymentTransactionSerializer(many=True),
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_history(request):
    if request.user.is_superuser:
        queryset = PaymentTransaction.objects.select_related(
            'company', 'plan', 'subscription',
        )
    elif request.user.is_owner() and request.user.company_id:
        queryset = PaymentTransaction.objects.filter(
            company=request.user.company,
        ).select_related('company', 'plan', 'subscription')
    else:
        return Response(
            {'detail': "Seul le propriétaire peut consulter les paiements."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return Response(PaymentTransactionSerializer(queryset, many=True).data)


@extend_schema(
    request=StartTestPaymentSerializer,
    responses={201: PaymentTransactionSerializer},
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_payment(request):
    if not request.user.is_owner() or not request.user.company_id:
        return Response(
            {'detail': "Seul le propriétaire peut démarrer un paiement."},
            status=status.HTTP_403_FORBIDDEN,
        )
    if settings.PAYMENT_PROVIDER != 'test':
        return Response(
            {'detail': 'Le paiement en ligne n’est pas encore activé sur cet environnement.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    serializer = StartTestPaymentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        plan = SubscriptionPlan.objects.get(
            code=serializer.validated_data['plan_code'],
            audience=request.user.company.workspace_type,
            is_active=True,
        )
    except SubscriptionPlan.DoesNotExist:
        return Response({'detail': 'Forfait indisponible.'}, status=404)
    if plan.price == 0:
        return Response(
            {'detail': 'Le forfait gratuit ne nécessite aucun paiement.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    payment = start_test_payment(request.user.company, plan)
    return Response(
        PaymentTransactionSerializer(payment).data,
        status=status.HTTP_201_CREATED,
    )


@extend_schema(
    request=CompleteTestPaymentSerializer,
    responses=PaymentTransactionSerializer,
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def simulate_payment(request, reference):
    if settings.PAYMENT_PROVIDER != 'test' or not (
        settings.DEBUG or settings.ALLOW_TEST_PAYMENT_SIMULATOR
    ):
        return Response(
            {'detail': 'Le simulateur est désactivé hors environnement de test.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    if not request.user.is_owner() or not request.user.company_id:
        return Response(status=status.HTTP_403_FORBIDDEN)
    try:
        payment = PaymentTransaction.objects.get(
            reference=reference,
            company=request.user.company,
        )
    except PaymentTransaction.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    serializer = CompleteTestPaymentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payment = complete_test_payment(
        payment,
        serializer.validated_data['outcome'],
    )
    return Response(PaymentTransactionSerializer(payment).data)


class SystemAnnouncementListView(generics.ListAPIView):
    """Public endpoint to fetch active system announcements."""
    permission_classes = []
    serializer_class = SystemAnnouncementSerializer
    
    def get_queryset(self):
        from .models import SystemAnnouncement, AnnouncementTarget
        qs = SystemAnnouncement.objects.filter(is_active=True)
        user = self.request.user
        
        if not user.is_authenticated:
            return qs.filter(target_audience=AnnouncementTarget.ALL)
            
        if user.is_superuser or user.is_owner():
            return qs
            
        return qs.filter(target_audience=AnnouncementTarget.ALL)


from rest_framework import viewsets
class AdminSystemAnnouncementViewSet(viewsets.ModelViewSet):
    """Platform super-admin endpoint to manage announcements."""
    permission_classes = [IsAuthenticated, IsSuperUser]
    serializer_class = SystemAnnouncementSerializer
    
    def get_queryset(self):
        from .models import SystemAnnouncement
        return SystemAnnouncement.objects.all()

    def perform_create(self, serializer):
        announcement = serializer.save()
        log_platform_audit(
            self.request,
            category='announcement',
            action='announcement_created',
            entity_label=announcement.message[:100],
            details={'type': announcement.type, 'target_audience': announcement.target_audience},
        )

    def perform_update(self, serializer):
        announcement = serializer.save()
        log_platform_audit(
            self.request,
            category='announcement',
            action='announcement_updated',
            entity_label=announcement.message[:100],
            details={'is_active': announcement.is_active},
        )

    def perform_destroy(self, instance):
        log_platform_audit(
            self.request,
            category='announcement',
            action='announcement_deleted',
            entity_label=instance.message[:100],
        )
        instance.delete()


class PlatformAuditLogListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsSuperUser]
    serializer_class = PlatformAuditLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category', 'company']

    def get_queryset(self):
        return PlatformAuditLog.objects.select_related('actor', 'company')
