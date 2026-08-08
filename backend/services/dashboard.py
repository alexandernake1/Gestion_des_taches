from django.db.models import Q, F
from django.utils import timezone
from datetime import timedelta
from domain.tasks.models import Task, Status, Priority



class DashboardService:
    """Service for dashboard statistics and data."""
    
    @staticmethod
    def get_company_statistics(company, team_id=None):
        """Get overall company statistics."""
        
        now = timezone.now()
        today = now.date()
        week_ago = today - timedelta(days=7)
        
        tasks = Task.objects.filter(company=company, is_active=True)
        if team_id:
            tasks = tasks.filter(team_id=team_id)
        
        # Basic counts
        total_tasks = tasks.count()
        completed_tasks = tasks.filter(status=Status.COMPLETED).count()
        in_progress_tasks = tasks.filter(status=Status.IN_PROGRESS).count()
        
        # Overdue tasks
        overdue_tasks = tasks.filter(
            due_date__lt=today,
            status__in=[Status.TODO, Status.IN_PROGRESS, Status.ON_HOLD]
        ).count()
        
        # Deferred tasks
        deferred_tasks = tasks.filter(status=Status.DEFERRED).count()
        
        # Tasks created this week
        new_tasks_this_week = tasks.filter(created_at__date__gte=week_ago).count()
        
        # Tasks completed this week
        completed_this_week = tasks.filter(
            status=Status.COMPLETED,
            completed_at__date__gte=week_ago
        ).count()
        
        # Priority breakdown
        priority_breakdown = {
            'urgent': tasks.filter(priority=Priority.URGENT).count(),
            'high': tasks.filter(priority=Priority.HIGH).count(),
            'normal': tasks.filter(priority=Priority.NORMAL).count(),
            'low': tasks.filter(priority=Priority.LOW).count(),
        }
        
        # Status breakdown
        status_breakdown = {
            'todo': tasks.filter(status=Status.TODO).count(),
            'in_progress': tasks.filter(status=Status.IN_PROGRESS).count(),
            'on_hold': tasks.filter(status=Status.ON_HOLD).count(),
            'deferred': tasks.filter(status=Status.DEFERRED).count(),
            'completed': tasks.filter(status=Status.COMPLETED).count(),
        }
        
        return {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'in_progress_tasks': in_progress_tasks,
            'overdue_tasks': overdue_tasks,
            'deferred_tasks': deferred_tasks,
            'new_tasks_this_week': new_tasks_this_week,
            'completed_this_week': completed_this_week,
            'completion_rate': round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 2),
            'priority_breakdown': priority_breakdown,
            'status_breakdown': status_breakdown,
        }
    
    @staticmethod
    def get_user_statistics(user, company):
        """Get statistics for a specific user within a specific company."""
        
        now = timezone.now()
        today = now.date()
        week_ago = today - timedelta(days=7)
        
        # Tasks created by user
        created_tasks = Task.objects.filter(
            company=company,
            creator=user,
            is_active=True
        )
        
        # Tasks assigned to user
        assigned_tasks = Task.objects.filter(
            company=company,
            assigned_to=user,
            is_active=True
        )
        
        # Tasks visible to the user = created by, assigned to, OR team member
        visible_tasks = Task.objects.filter(
            Q(creator=user) | Q(assigned_to=user) | Q(team__members=user),
            company=company,
            is_active=True,
        ).distinct()

        stats = {
            'created': {
                'total': created_tasks.count(),
                'completed': created_tasks.filter(status=Status.COMPLETED).count(),
                'in_progress': created_tasks.filter(status=Status.IN_PROGRESS).count(),
                'overdue': created_tasks.filter(
                    due_date__lt=today,
                    status__in=[Status.TODO, Status.IN_PROGRESS, Status.ON_HOLD]
                ).count(),
            },
            'assigned': {
                'total': assigned_tasks.count(),
                'completed': assigned_tasks.filter(status=Status.COMPLETED).count(),
                'in_progress': assigned_tasks.filter(status=Status.IN_PROGRESS).count(),
                'overdue': assigned_tasks.filter(
                    due_date__lt=today,
                    status__in=[Status.TODO, Status.IN_PROGRESS, Status.ON_HOLD]
                ).count(),
            },
            'scope': {
                'total': visible_tasks.count(),
                'completed': visible_tasks.filter(status=Status.COMPLETED).count(),
                'in_progress': visible_tasks.filter(status=Status.IN_PROGRESS).count(),
                'overdue': visible_tasks.filter(
                    due_date__lt=today,
                    status__in=[Status.TODO, Status.IN_PROGRESS, Status.ON_HOLD]
                ).count(),
                'priority_breakdown': {
                    'urgent': visible_tasks.filter(priority=Priority.URGENT).count(),
                    'high': visible_tasks.filter(priority=Priority.HIGH).count(),
                    'normal': visible_tasks.filter(priority=Priority.NORMAL).count(),
                    'low': visible_tasks.filter(priority=Priority.LOW).count(),
                },
                'status_breakdown': {
                    'todo': visible_tasks.filter(status=Status.TODO).count(),
                    'in_progress': visible_tasks.filter(status=Status.IN_PROGRESS).count(),
                    'on_hold': visible_tasks.filter(status=Status.ON_HOLD).count(),
                    'deferred': visible_tasks.filter(status=Status.DEFERRED).count(),
                    'completed': visible_tasks.filter(status=Status.COMPLETED).count(),
                },
            },
        }

        # Calculate weekly stats for the user
        new_this_week = visible_tasks.filter(created_at__gte=week_ago).count()
        completed_this_week = visible_tasks.filter(
            status=Status.COMPLETED, 
            completed_at__gte=week_ago
        ).count()
        completion_rate = round((completed_this_week / new_this_week * 100)) if new_this_week > 0 else 0
        if new_this_week == 0 and completed_this_week > 0:
            completion_rate = 100

        stats['new_tasks_this_week'] = new_this_week
        stats['completed_this_week'] = completed_this_week
        stats['completion_rate'] = completion_rate

        return stats
    
    @staticmethod
    def get_recent_activity(user, company, limit=10, team_id=None):
        """Get recent activity limited to tasks visible to the current user."""
        
        from domain.tasks.models import TaskHistory
        
        recent_history = TaskHistory.objects.filter(task__company=company)
        if team_id:
            recent_history = recent_history.filter(task__team_id=team_id)
        if not user.is_manager():
            recent_history = recent_history.filter(
                Q(task__creator=user) | Q(task__assigned_to=user) | Q(task__team__members=user)
            )

        recent_history = recent_history.select_related(
            'changed_by',
            'task'
        ).distinct().order_by('-changed_at')[:limit]
        
        activity = []
        for history in recent_history:
            activity.append({
                'id': history.id,
                'task_id': history.task.id,
                'task_title': history.task.title,
                'changed_by': history.changed_by.full_name,
                'field_name': history.field_name,
                'old_value': history.old_value,
                'new_value': history.new_value,
                'changed_at': history.changed_at,
            })
        
        return activity
    
    @staticmethod
    def get_performance_metrics(company, team_id=None):
        """Get performance metrics for the company."""
        
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        
        tasks = Task.objects.filter(
            company=company,
            is_active=True,
            created_at__gte=thirty_days_ago
        )
        if team_id:
            tasks = tasks.filter(team_id=team_id)
        
        # Average completion time (for completed tasks)
        completed_tasks = tasks.filter(status=Status.COMPLETED, completed_at__isnull=False)
        
        if completed_tasks.exists():
            completion_times = []
            for task in completed_tasks:
                if task.completed_at:
                    delta = task.completed_at - task.created_at
                    completion_times.append(delta.total_seconds() / 3600)  # in hours
            
            avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0
        else:
            avg_completion_time = 0
        
        # On-time completion rate
        on_time_completed = completed_tasks.filter(
            completed_at__date__lte=F('due_date')
        ).count()
        
        on_time_rate = round(
            (on_time_completed / completed_tasks.count() * 100) if completed_tasks.count() > 0 else 0,
            2
        )
        
        return {
            'avg_completion_time_hours': round(avg_completion_time, 2),
            'on_time_completion_rate': on_time_rate,
            'total_tasks_last_30_days': tasks.count(),
            'completed_last_30_days': completed_tasks.count(),
        }
