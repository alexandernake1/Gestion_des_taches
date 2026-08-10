from django.urls import path
from .views import ProjectListCreateView, ProjectDetailView

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='project_list_create'),
    path('<int:pk>/', ProjectDetailView.as_view(), name='project_detail'),
]
