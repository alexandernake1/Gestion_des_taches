from django.urls import path
from .views import (
    NotificationListView,
    NotificationDetailView,
    mark_all_read,
    unread_count,
    NotificationPreferenceView,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification_list'),
    path('<int:id>/', NotificationDetailView.as_view(), name='notification_detail'),
    path('mark-all-read/', mark_all_read, name='mark_all_read'),
    path('unread-count/', unread_count, name='unread_count'),
    path('preferences/', NotificationPreferenceView.as_view(), name='notification_preferences'),
]
