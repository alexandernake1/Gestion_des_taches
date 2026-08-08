from django.urls import path, include
from .views import (
    company_dashboard,
    user_dashboard,
    recent_activity,
    performance_metrics
)

urlpatterns = [
    path('auth/', include('domain.users.urls')),
    path('companies/', include('domain.companies.urls')),
    path('teams/', include('domain.teams.urls')),
    path('tasks/', include('domain.tasks.urls')),
    path('notifications/', include('domain.notifications.urls')),
    path('dashboard/company/', company_dashboard, name='company_dashboard'),
    path('dashboard/user/', user_dashboard, name='user_dashboard'),
    path('dashboard/activity/', recent_activity, name='recent_activity'),
    path('dashboard/performance/', performance_metrics, name='performance_metrics'),
]
