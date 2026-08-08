from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from .models import Notification, NotificationPreference
from .serializers import (
    NotificationPreferenceSerializer,
    NotificationSerializer,
    NotificationUpdateSerializer,
)


class NotificationListView(generics.ListAPIView):
    """List notifications for the current user."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_read', 'type']
    ordering = ['-created_at']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Notification.objects.none()
        return Notification.objects.filter(recipient=self.request.user)
    
    @extend_schema(
        description="List notifications for the current user",
        responses=NotificationSerializer(many=True)
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class NotificationDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve and update a notification."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    queryset = Notification.objects.all()
    lookup_field = 'id'
    
    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return NotificationUpdateSerializer
        return NotificationSerializer
    
    @extend_schema(
        description="Get notification details",
        responses=NotificationSerializer
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        description="Update notification (mark as read/unread)",
        request=NotificationUpdateSerializer,
        responses=NotificationSerializer
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class NotificationPreferenceView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationPreferenceSerializer

    def get_object(self):
        preference, _ = NotificationPreference.objects.get_or_create(
            user=self.request.user,
        )
        return preference


@extend_schema(
    description="Mark all notifications as read",
    request=None,
    responses={
        200: inline_serializer(
            name='MarkAllNotificationsReadResponse',
            fields={'detail': serializers.CharField()},
        )
    },
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    """Mark all notifications as read for the current user."""
    
    Notification.objects.filter(
        recipient=request.user,
        is_read=False
    ).update(is_read=True)
    
    return Response(
        {"detail": "All notifications marked as read."},
        status=status.HTTP_200_OK
    )


@extend_schema(
    description="Get unread notification count",
    responses={
        200: inline_serializer(
            name='UnreadNotificationCountResponse',
            fields={'count': serializers.IntegerField()},
        )
    },
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_count(request):
    """Get the count of unread notifications for the current user."""
    
    count = Notification.objects.filter(
        recipient=request.user,
        is_read=False
    ).count()
    
    return Response({"count": count}, status=status.HTTP_200_OK)
