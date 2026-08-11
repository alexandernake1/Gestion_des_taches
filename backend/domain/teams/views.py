from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiResponse
from rest_framework import serializers
from common.permissions.permissions import IsManagerOrAdministrator, IsOwner, IsSameCompany, IsCompanyOperational
from common.utils import get_requested_company
from .models import Team
from .serializers import (
    TeamSerializer,
    TeamListSerializer,
    TeamCreateSerializer,
    TeamUpdateSerializer
)


class TeamListCreateView(generics.ListCreateAPIView):
    """List and create teams."""
    
    permission_classes = [IsAuthenticated, IsCompanyOperational, IsManagerOrAdministrator]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'name']
    ordering = ['-created_at']
    
    def get_queryset(self):
        company = get_requested_company(self.request)
        if not company:
            return Team.objects.none()
        return Team.objects.filter(company=company).select_related(
            'leader',
        ).prefetch_related('members')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TeamCreateSerializer
        return TeamListSerializer
    
    def perform_create(self, serializer):
        company = get_requested_company(self.request)
        if not company:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous devez sélectionner une entreprise ou appartenir à une entreprise pour créer une équipe.")
        serializer.save(company=company)
    
    @extend_schema(
        description="List teams in the company (managers and admins only)",
        responses=TeamListSerializer(many=True)
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        description="Create a new team (managers and admins only)",
        request=TeamCreateSerializer,
        responses=TeamSerializer
    )
    def post(self, request, *args, **kwargs):
        # Quota checks – super-admins are exempt.
        company = get_requested_company(request)
        if not request.user.is_superuser and company and hasattr(company, 'subscription'):
            subscription = company.subscription
            if subscription.is_suspended():
                return Response(
                    {"detail": "Your company subscription is currently suspended."},
                    status=status.HTTP_403_FORBIDDEN
                )
            max_teams = subscription.effective_max_teams
            if max_teams > 0:
                current_teams_count = Team.objects.filter(company=company, is_active=True).count()
                if current_teams_count >= max_teams:
                    return Response(
                        {"detail": f"Company team limit ({max_teams}) reached for your subscription plan. Upgrade your plan to create more teams."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            TeamSerializer(
                serializer.instance,
                context={'request': request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


class TeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update and delete a team."""
    
    permission_classes = [IsAuthenticated, IsCompanyOperational, IsManagerOrAdministrator, IsSameCompany]
    lookup_field = 'id'

    def get_permissions(self):
        if self.request.method == 'DELETE':
            permission_classes = [IsAuthenticated, IsCompanyOperational, IsOwner, IsSameCompany]
        else:
            permission_classes = self.permission_classes
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        company = get_requested_company(self.request)
        if not company:
            return Team.objects.none()
        return Team.objects.filter(company=company).select_related(
            'leader',
        ).prefetch_related('members')
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return TeamSerializer
        return TeamUpdateSerializer
    
    @extend_schema(
        description="Get team details",
        responses=TeamSerializer
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        description="Update team details",
        request=TeamUpdateSerializer,
        responses=TeamSerializer
    )
    def put(self, request, *args, **kwargs):
        return self._update_with_full_response(request, partial=False)
    
    @extend_schema(
        description="Partially update team details",
        request=TeamUpdateSerializer,
        responses=TeamSerializer
    )
    def patch(self, request, *args, **kwargs):
        return self._update_with_full_response(request, partial=True)

    def _update_with_full_response(self, request, partial):
        instance = self.get_object()
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(
            TeamSerializer(
                serializer.instance,
                context={'request': request},
            ).data
        )
    
    @extend_schema(
        description="Delete a team",
        responses={204: OpenApiResponse(description="Team deleted")}
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)


@extend_schema(
    description="Add a member to a team (managers and admins only)",
    request=None,
    responses={
        200: inline_serializer(
            name='AddTeamMemberResponse',
            fields={'detail': serializers.CharField()},
        )
    },
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCompanyOperational, IsManagerOrAdministrator])
def add_team_member(request, team_id, user_id):
    """Add a member to a team."""
    
    company = get_requested_company(request)
    try:
        team = Team.objects.get(id=team_id, company=company)
    except Team.DoesNotExist:
        return Response(
            {"detail": "Team not found."},
            status=status.HTTP_404_NOT_FOUND
        )
    
    try:
        from domain.users.models import User
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"detail": "User not found."},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if user is in the same company
    if user.company != company or not user.is_active:
        return Response(
            {"detail": "User must be an active member of the same enterprise."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    team.members.add(user)
    return Response(
        {"detail": "Member added successfully."},
        status=status.HTTP_200_OK
    )


@extend_schema(
    description="Remove a member from a team (managers and admins only)",
    request=None,
    responses={
        200: inline_serializer(
            name='RemoveTeamMemberResponse',
            fields={'detail': serializers.CharField()},
        )
    },
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCompanyOperational, IsManagerOrAdministrator])
def remove_team_member(request, team_id, user_id):
    """Remove a member from a team."""
    
    company = get_requested_company(request)
    try:
        team = Team.objects.get(id=team_id, company=company)
    except Team.DoesNotExist:
        return Response(
            {"detail": "Team not found."},
            status=status.HTTP_404_NOT_FOUND
        )
    
    try:
        from domain.users.models import User
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"detail": "User not found."},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if user.company != company:
        return Response(
            {"detail": "User must be from the same enterprise."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Prevent removing the team leader while they are still the leader.
    if team.leader == user:
        return Response(
            {"detail": "Impossible de retirer le responsable de l'\u00e9quipe. Veuillez d'abord lui assigner un remplaçant."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    team.members.remove(user)

    return Response(
        {"detail": "Member removed successfully."},
        status=status.HTTP_200_OK
    )
