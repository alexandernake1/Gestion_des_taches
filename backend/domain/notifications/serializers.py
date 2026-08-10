from rest_framework import serializers
from .models import Notification, NotificationPreference, NotificationType


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model."""
    
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True, allow_null=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'type', 'type_display', 'title', 'message',
            'task', 'task_title', 'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'recipient', 'created_at']


class NotificationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating notification (mark as read)."""
    
    class Meta:
        model = Notification
        fields = ['is_read']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'assignments_enabled', 'comments_enabled',
            'task_reminders_enabled', 'overdue_alerts_enabled',
            'daily_digest_enabled', 'subscription_alerts_enabled',
            'reminder_days_before', 'digest_hour', 'updated_at',
        ]
        read_only_fields = ['updated_at']

    def validate_reminder_days_before(self, value):
        if value < 1 or value > 14:
            raise serializers.ValidationError("Choose a value between 1 and 14 days.")
        return value

    def validate_digest_hour(self, value):
        if value > 23:
            raise serializers.ValidationError("Choose an hour between 0 and 23.")
        return value
