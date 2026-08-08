from django.urls import path
from .views import (
    TeamListCreateView,
    TeamDetailView,
    add_team_member,
    remove_team_member
)

urlpatterns = [
    path('', TeamListCreateView.as_view(), name='team_list_create'),
    path('<int:id>/', TeamDetailView.as_view(), name='team_detail'),
    path('<int:team_id>/members/<int:user_id>/add/', add_team_member, name='add_team_member'),
    path('<int:team_id>/members/<int:user_id>/remove/', remove_team_member, name='remove_team_member'),
]
