from django.contrib import admin
from .models import Team


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'leader', 'is_active', 'created_at']
    list_filter = ['is_active', 'company', 'created_at']
    search_fields = ['name', 'description']
    filter_horizontal = ['members']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
