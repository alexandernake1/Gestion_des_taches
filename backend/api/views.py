from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiTypes
from services.dashboard import DashboardService
from common.permissions.permissions import IsManagerOrAdministrator
from common.utils import get_requested_company


@extend_schema(
    description="Get company dashboard statistics",
    responses={200: OpenApiTypes.OBJECT}
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManagerOrAdministrator])
def company_dashboard(request):
    """Get dashboard statistics for the user's company."""
    
    company = get_requested_company(request)
    if not company:
        return Response(
            {"detail": "You must be associated with a company or select one."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    team_id = request.query_params.get('team_id')
    statistics = DashboardService.get_company_statistics(company, team_id=team_id)
    return Response(statistics)


@extend_schema(
    description="Get user dashboard statistics",
    responses={200: OpenApiTypes.OBJECT}
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_dashboard(request):
    """Get dashboard statistics for the current user."""
    
    company = get_requested_company(request)
    statistics = DashboardService.get_user_statistics(request.user, company)
    return Response(statistics)


@extend_schema(
    description="Get recent activity",
    responses={200: OpenApiTypes.OBJECT}
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_activity(request):
    """Get recent activity for the user's company."""
    
    company = get_requested_company(request)
    if not company:
        return Response(
            {"detail": "You must be associated with a company or select one."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    limit = int(request.query_params.get('limit', 10))
    team_id = request.query_params.get('team_id')
    activity = DashboardService.get_recent_activity(request.user, company, limit, team_id=team_id)
    return Response(activity)


@extend_schema(
    description="Get performance metrics",
    responses={200: OpenApiTypes.OBJECT}
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManagerOrAdministrator])
def performance_metrics(request):
    """Get performance metrics for the user's company."""
    
    company = get_requested_company(request)
    if not company:
        return Response(
            {"detail": "You must be associated with a company or select one."},
            status=400
        )
    
    team_id = request.query_params.get('team_id')
    metrics = DashboardService.get_performance_metrics(company, team_id=team_id)
    return Response(metrics)
