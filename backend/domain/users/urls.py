from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    ProfileView,
    change_password,
    me,
    UserListView,
    UserDetailView,
    invite_user,
    deactivate_user,
    reset_user_password,
    activate_user,
    UserAuditLogListView,
    logout,
    register_company,
)

urlpatterns = [
    path('register/company/', register_company, name='register_company'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', logout, name='logout'),
    path('me/', me, name='me'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', change_password, name='change_password'),
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/<int:id>/', UserDetailView.as_view(), name='user_detail'),
    path('users/invite/', invite_user, name='invite_user'),
    path('users/<int:user_id>/deactivate/', deactivate_user, name='deactivate_user'),
    path('users/<int:user_id>/activate/', activate_user, name='activate_user'),
    path('users/<int:user_id>/reset-password/', reset_user_password, name='reset_user_password'),
    path('users/audit-log/', UserAuditLogListView.as_view(), name='user_audit_log'),
]
