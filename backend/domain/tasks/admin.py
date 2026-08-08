from django.contrib import admin
from .models import Task, TaskHistory, TaskComment, TaskAttachment, TaskReport


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'company', 'assigned_to', 'status', 'priority', 'due_date', 'created_at']
    list_filter = ['status', 'priority', 'company', 'created_at']
    search_fields = ['title', 'description']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'completed_at']


@admin.register(TaskHistory)
class TaskHistoryAdmin(admin.ModelAdmin):
    list_display = ['task', 'field_name', 'changed_by', 'changed_at']
    list_filter = ['field_name', 'changed_at']
    search_fields = ['task__title', 'field_name']
    ordering = ['-changed_at']
    readonly_fields = ['changed_at']


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ['task', 'author', 'created_at']
    list_filter = ['created_at']
    search_fields = ['task__title', 'content']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(TaskAttachment)
class TaskAttachmentAdmin(admin.ModelAdmin):
    list_display = ['task', 'filename', 'file_size', 'uploaded_by', 'created_at']
    list_filter = ['created_at', 'mime_type']
    search_fields = ['filename', 'task__title']
    ordering = ['-created_at']
    readonly_fields = ['created_at']


@admin.register(TaskReport)
class TaskReportAdmin(admin.ModelAdmin):
    list_display = ['task', 'requested_by', 'old_due_date', 'new_due_date', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['task__title', 'reason']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'reviewed_at']
