from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from common.permissions.permissions import IsAdministrator, IsManagerOrAdministrator, IsSameCompany, IsCompanyOperational
from common.utils import get_requested_company
from .models import User, Role, UserAuditLog
from .serializers import (
    UserSerializer,
    UserListSerializer,
    RegistrationSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
    UpdateProfileSerializer,
    UserManagementSerializer,
    InviteUserSerializer,
    UserAuditLogSerializer,
    CompanyRegistrationSerializer,
)


class LoginRateThrottle(AnonRateThrottle):
    """Limits login attempts to 10 per minute per IP to prevent brute-force."""
    scope = 'login'


class RegistrationRateThrottle(AnonRateThrottle):
    scope = 'registration'


@extend_schema(
    description="Create a company, its owner account and its initial subscription",
    request=CompanyRegistrationSerializer,
    responses={201: UserSerializer},
)
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegistrationRateThrottle])
def register_company(request):
    serializer = CompanyRegistrationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    result = serializer.save()
    refresh = RefreshToken.for_user(result['user'])

    from domain.companies.serializers import (
        CompanySerializer,
        CompanySubscriptionSerializer,
        PaymentTransactionSerializer,
    )

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(result['user']).data,
        'company': CompanySerializer(result['company']).data,
        'subscription': CompanySubscriptionSerializer(result['subscription']).data,
        'payment': (
            PaymentTransactionSerializer(result['payment']).data
            if result['payment'] else None
        ),
    }, status=status.HTTP_201_CREATED)


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT token view with additional user data."""

    serializer_class = LoginSerializer
    throttle_classes = [LoginRateThrottle]

    
    @extend_schema(
        description="Authenticate user and return JWT tokens",
        responses={
            200: inline_serializer(
                name='LoginResponse',
                fields={
                    'access': serializers.CharField(),
                    'refresh': serializers.CharField(),
                    'user': UserSerializer(),
                },
            )
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        try:
            user = User.objects.get(email=email)
            if user.check_password(password):
                if not user.is_active:
                    return Response(
                        {"detail": "This account has been deactivated."},
                        status=status.HTTP_403_FORBIDDEN
                    )
                if user.company and not user.company.is_active:
                    return Response(
                        {"detail": "Your enterprise has been deactivated."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                
                # Generate tokens
                from rest_framework_simplejwt.tokens import RefreshToken
                refresh = RefreshToken.for_user(user)
                
                from django.conf import settings
                
                response = Response({
                    'user': UserSerializer(user).data
                })
                
                response.set_cookie(
                    key=getattr(settings, 'JWT_COOKIE_NAME', 'access_token'),
                    value=str(refresh.access_token),
                    expires=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
                    secure=getattr(settings, 'JWT_COOKIE_SECURE', False),
                    httponly=getattr(settings, 'JWT_COOKIE_HTTP_ONLY', True),
                    samesite=getattr(settings, 'JWT_COOKIE_SAMESITE', 'Lax')
                )
                response.set_cookie(
                    key=getattr(settings, 'JWT_REFRESH_COOKIE_NAME', 'refresh_token'),
                    value=str(refresh),
                    expires=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'],
                    secure=getattr(settings, 'JWT_COOKIE_SECURE', False),
                    httponly=getattr(settings, 'JWT_COOKIE_HTTP_ONLY', True),
                    samesite=getattr(settings, 'JWT_COOKIE_SAMESITE', 'Lax')
                )
                
                return response
        except User.DoesNotExist:
            pass
        
        return Response(
            {"detail": "Invalid credentials."},
            status=status.HTTP_401_UNAUTHORIZED
        )


@extend_schema(
    request=None,
    responses={204: None},
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    from django.conf import settings
    refresh_token = request.COOKIES.get(getattr(settings, 'JWT_REFRESH_COOKIE_NAME', 'refresh_token'))
    if refresh_token:
        try:
            RefreshToken(refresh_token).blacklist()
        except Exception:
            pass
    response = Response(status=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(getattr(settings, 'JWT_COOKIE_NAME', 'access_token'))
    response.delete_cookie(getattr(settings, 'JWT_REFRESH_COOKIE_NAME', 'refresh_token'))
    return response

from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken

class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        from django.conf import settings
        refresh_token = request.COOKIES.get(getattr(settings, 'JWT_REFRESH_COOKIE_NAME', 'refresh_token'))
        if not refresh_token:
            raise InvalidToken('No refresh token found in cookies')
        
        # Simulate DRF expectation
        mutable_data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        mutable_data['refresh'] = refresh_token
        
        serializer = self.get_serializer(data=mutable_data)
        serializer.is_valid(raise_exception=True)
        
        response = Response(status=status.HTTP_200_OK)
        access_token = serializer.validated_data.get('access')
        new_refresh = serializer.validated_data.get('refresh')
        
        if access_token:
            response.set_cookie(
                key=getattr(settings, 'JWT_COOKIE_NAME', 'access_token'),
                value=access_token,
                expires=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
                secure=getattr(settings, 'JWT_COOKIE_SECURE', False),
                httponly=getattr(settings, 'JWT_COOKIE_HTTP_ONLY', True),
                samesite=getattr(settings, 'JWT_COOKIE_SAMESITE', 'Lax')
            )
        if new_refresh:
            response.set_cookie(
                key=getattr(settings, 'JWT_REFRESH_COOKIE_NAME', 'refresh_token'),
                value=new_refresh,
                expires=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'],
                secure=getattr(settings, 'JWT_COOKIE_SECURE', False),
                httponly=getattr(settings, 'JWT_COOKIE_HTTP_ONLY', True),
                samesite=getattr(settings, 'JWT_COOKIE_SAMESITE', 'Lax')
            )
            
        return response


class RegisterView(generics.CreateAPIView):
    """User registration — disabled for public access.
    Users are created exclusively by company administrators via the invite endpoint.
    """
    queryset = User.objects.none()
    permission_classes = [AllowAny]
    serializer_class = RegistrationSerializer

    def post(self, request, *args, **kwargs):
        # Public self-registration is intentionally disabled.
        # Accounts are provisioned by company administrators only.
        return Response(
            {"detail": "Public registration is disabled. Please contact your company administrator."},
            status=status.HTTP_403_FORBIDDEN,
        )


class ProfileView(generics.RetrieveUpdateAPIView):
    """User profile endpoint."""
    
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method == 'PUT' or self.request.method == 'PATCH':
            return UpdateProfileSerializer
        return UserSerializer


@extend_schema(
    description="Change user password",
    request=ChangePasswordSerializer,
    responses={
        200: inline_serializer(
            name='ChangePasswordResponse',
            fields={'detail': serializers.CharField()},
        )
    },
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change user password."""
    
    serializer = ChangePasswordSerializer(
        data=request.data,
        context={'request': request}
    )
    serializer.is_valid(raise_exception=True)
    
    user = request.user
    user.set_password(serializer.validated_data['new_password'])
    user.must_change_password = False
    user.save(update_fields=['password', 'must_change_password', 'updated_at'])

    # Invalidate the current refresh token so existing sessions are terminated.
    # The user will need to log in again with the new password.
    refresh_token = request.data.get('refresh')
    if refresh_token:
        try:
            from rest_framework_simplejwt.tokens import RefreshToken as JWT_RefreshToken
            JWT_RefreshToken(refresh_token).blacklist()
        except Exception:
            pass  # Token already invalid or blacklist not enabled — not critical

    return Response(
        {"detail": "Password changed successfully. Please log in again."},
        status=status.HTTP_200_OK
    )


@extend_schema(
    description="Get current user information",
    responses={200: UserSerializer}
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Get current user information."""
    
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


class UserListView(generics.ListAPIView):
    """List users in the company (managers and admins only)."""
    
    permission_classes = [IsAuthenticated, IsManagerOrAdministrator]
    serializer_class = UserListSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'email', 'first_name']
    ordering = ['-created_at']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return User.objects.none()
        user = self.request.user
        if user.is_superuser:
            company = get_requested_company(self.request)
            if company:
                return User.objects.filter(company=company)
            return User.objects.all()
        if user.is_administrator():
            return User.objects.filter(company=user.company, is_superuser=False)
        return User.objects.filter(company=user.company, role__in=['employee', 'manager'], is_superuser=False)


class UserDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve and update user details (managers and admins only)."""
    
    permission_classes = [IsAuthenticated, IsManagerOrAdministrator, IsSameCompany]
    serializer_class = UserManagementSerializer
    lookup_field = 'id'

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return User.objects.none()
        user = self.request.user
        if user.is_superuser:
            company = get_requested_company(self.request)
            if company:
                return User.objects.filter(company=company)
            return User.objects.all()
        queryset = User.objects.filter(company=user.company, is_superuser=False)
        if user.is_administrator():
            return queryset
        return queryset.filter(role=Role.EMPLOYEE)
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return UserSerializer
        return UserManagementSerializer

    def perform_update(self, serializer):
        user = self.get_object()
        previous = {
            'role': user.role,
            'is_active': user.is_active,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone': user.phone,
        }
        updated = serializer.save()
        changes = {
            field: {'from': previous[field], 'to': getattr(updated, field)}
            for field in previous
            if previous[field] != getattr(updated, field)
        }
        if changes:
            UserAuditLog.objects.create(
                actor=self.request.user,
                target=updated,
                action='account_updated',
                details={'changes': changes},
            )


@extend_schema(
    description="Invite a user to the company (managers and admins only)",
    request=InviteUserSerializer,
    responses={201: UserSerializer}
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsManagerOrAdministrator, IsCompanyOperational])
def invite_user(request):
    """Invite a user to the company."""
    
    company = get_requested_company(request)
    if not company:
        return Response(
            {"detail": "You must be associated with a company or have one selected to invite users."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = InviteUserSerializer(
        data=request.data,
        context={'request': request},
    )
    serializer.is_valid(raise_exception=True)
    
    # Use select_for_update to prevent race conditions where two concurrent
    # requests both pass the quota check and both create a user.
    if not request.user.is_superuser and company and hasattr(company, 'subscription'):
        from django.db import transaction
        with transaction.atomic():
            subscription = company.subscription.__class__.objects.select_for_update().get(
                pk=company.subscription.pk
            )
            if subscription.is_suspended():
                return Response(
                    {"detail": "Your company subscription is currently suspended."},
                    status=status.HTTP_403_FORBIDDEN
                )
            max_users = subscription.effective_max_users
            if max_users > 0:
                current_users_count = User.objects.filter(company=company, is_active=True).count()
                if current_users_count >= max_users:
                    return Response(
                        {"detail": f"Company user limit ({max_users}) reached for your subscription plan. Upgrade your plan to invite more users."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Check if user already exists (inside the transaction)
            email = serializer.validated_data['email']
            if User.objects.filter(email=email).exists():
                return Response(
                    {"detail": "A user with this email already exists."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create user with a temporary password
            import secrets
            temp_password = secrets.token_urlsafe(16)

            user = User.objects.create_user(
                email=email,
                password=temp_password,
                first_name=serializer.validated_data['first_name'],
                last_name=serializer.validated_data['last_name'],
                phone=serializer.validated_data.get('phone', ''),
                company=company,
                role=serializer.validated_data['role'],
                weekly_capacity_hours=serializer.validated_data.get('weekly_capacity_hours', 40),
                must_change_password=True,
            )
    else:
        # Super-admin path: no quota check
        email = serializer.validated_data['email']
        if User.objects.filter(email=email).exists():
            return Response(
                {"detail": "A user with this email already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )
        import secrets
        temp_password = secrets.token_urlsafe(16)
        user = User.objects.create_user(
            email=email,
            password=temp_password,
            first_name=serializer.validated_data['first_name'],
            last_name=serializer.validated_data['last_name'],
            phone=serializer.validated_data.get('phone', ''),
            company=company,
            role=serializer.validated_data['role'],
            weekly_capacity_hours=serializer.validated_data.get('weekly_capacity_hours', 40),
            must_change_password=True,
        )
    
    from domain.users.emails import send_user_invitation_email
    email_sent = send_user_invitation_email(user, temp_password)

    user_data = UserSerializer(user).data
    user_data['temporary_password'] = temp_password
    user_data['email_sent'] = email_sent
    UserAuditLog.objects.create(
        actor=request.user,
        target=user,
        action='account_created',
        details={'role': user.role, 'email_sent': email_sent},
    )
    
    return Response(
        user_data,
        status=status.HTTP_201_CREATED
    )


@extend_schema(
    description="Reset a user's password and require a change at next login",
    request=None,
    responses={
        200: inline_serializer(
            name='TemporaryPasswordResponse',
            fields={
                'email': serializers.EmailField(),
                'temporary_password': serializers.CharField(),
            },
        )
    },
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdministrator, IsCompanyOperational])
def reset_user_password(request, user_id):
    company = get_requested_company(request)
    try:
        user = User.objects.get(id=user_id, company=company)
    except User.DoesNotExist:
        return Response(
            {"detail": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if user == request.user:
        return Response(
            {"detail": "Use your profile settings to change your own password."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user.role == Role.OWNER and not (request.user.is_superuser or request.user == user):
        return Response(
            {"detail": "Only the company owner or super-administrator can reset this password."},
            status=status.HTTP_403_FORBIDDEN,
        )

    import secrets
    temporary_password = secrets.token_urlsafe(16)
    user.set_password(temporary_password)
    user.must_change_password = True
    user.save(update_fields=['password', 'must_change_password', 'updated_at'])
    from domain.users.emails import send_password_reset_email
    email_sent = send_password_reset_email(user, temporary_password)

    UserAuditLog.objects.create(
        actor=request.user,
        target=user,
        action='password_reset',
        details={'email_sent': email_sent},
    )

    return Response({
        "email": user.email,
        "temporary_password": temporary_password,
        "email_sent": email_sent,
    })


@extend_schema(
    description="Deactivate a user (administrators only)",
    request=None,
    responses={
        200: inline_serializer(
            name='DeactivateUserResponse',
            fields={'detail': serializers.CharField()},
        )
    },
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdministrator, IsCompanyOperational])
def deactivate_user(request, user_id):
    """Deactivate a user."""
    
    try:
        # Immediately scope the lookup to the requester's company (unless superuser).
        company = get_requested_company(request)
        user = User.objects.get(id=user_id, company=company)
    except User.DoesNotExist:
        return Response(
            {"detail": "User not found."},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Prevent deactivating yourself
    if user == request.user:
        return Response(
            {"detail": "You cannot deactivate yourself."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if user.role == Role.OWNER:
        return Response(
            {"detail": "The company owner account cannot be deactivated."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.is_active = False
    user.save(update_fields=['is_active', 'updated_at'])
    UserAuditLog.objects.create(
        actor=request.user,
        target=user,
        action='account_deactivated',
    )
    
    return Response(
        {"detail": "User deactivated successfully."},
        status=status.HTTP_200_OK
    )


@extend_schema(
    request=None,
    responses={
        200: inline_serializer(
            name='ActivateUserResponse',
            fields={'detail': serializers.CharField()},
        )
    },
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdministrator, IsCompanyOperational])
def activate_user(request, user_id):
    company = get_requested_company(request)
    try:
        user = User.objects.get(id=user_id, company=company)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    user.is_active = True
    user.save(update_fields=['is_active', 'updated_at'])
    UserAuditLog.objects.create(
        actor=request.user,
        target=user,
        action='account_activated',
    )
    return Response({"detail": "User activated successfully."})


class UserAuditLogListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdministrator]
    serializer_class = UserAuditLogSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['target', 'action']
    ordering = ['-created_at']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return UserAuditLog.objects.none()
        user = self.request.user
        qs = UserAuditLog.objects.select_related('actor', 'target')
        # Super-admins can audit all companies; company admins see only their own.
        if user.is_superuser:
            return qs
        return qs.filter(target__company=user.company)
