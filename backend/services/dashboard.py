import statistics
from datetime import datetime, timedelta
from django.db.models import F, Q
from django.utils import timezone
from domain.tasks.models import (
    ApprovalRequest,
    ApprovalStatus,
    Priority,
    Project,
    ReportStatus,
    Status,
    Task,
    TaskHistory,
    TaskReport,
)
from domain.teams.models import Team
from domain.users.models import User


def parse_date_param(val):
    if not val:
        return None
    if isinstance(val, str):
        try:
            return datetime.strptime(val, '%Y-%m-%d').date()
        except ValueError:
            return None
    return val


class DashboardService:
    """Service for dashboard statistics and data."""

    @staticmethod
    def get_company_statistics(
        company,
        team_id=None,
        project_id=None,
        assignee_id=None,
        date_from=None,
        date_to=None,
    ):
        """Get overall company statistics for a given period and scope."""
        now = timezone.now()
        today = timezone.localdate()

        d_from = parse_date_param(date_from)
        d_to = parse_date_param(date_to)

        if not d_from or not d_to:
            d_from = today - timedelta(days=29)
            d_to = today

        tasks = Task.objects.filter(company=company, is_active=True)
        if team_id:
            tasks = tasks.filter(team_id=team_id)
        if project_id:
            tasks = tasks.filter(project_id=project_id)
        if assignee_id:
            tasks = tasks.filter(assigned_to_id=assignee_id)

        # Base active counts
        total_tasks = tasks.count()
        completed_tasks = tasks.filter(status=Status.COMPLETED).count()
        in_progress_tasks = tasks.filter(status=Status.IN_PROGRESS).count()
        open_tasks = tasks.exclude(status=Status.COMPLETED).count()
        deferred_tasks = tasks.filter(status=Status.DEFERRED).count()

        # Overdue tasks (due_date < today and not completed)
        overdue_tasks = tasks.filter(
            due_date__lt=today,
            status__in=[Status.TODO, Status.IN_PROGRESS, Status.ON_HOLD],
        ).count()

        # Period-filtered tasks
        created_in_period = tasks.filter(
            created_at__date__gte=d_from,
            created_at__date__lte=d_to,
        )
        created_in_period_count = created_in_period.count()

        completed_in_period = tasks.filter(
            status=Status.COMPLETED,
            completed_at__date__gte=d_from,
            completed_at__date__lte=d_to,
        )
        completed_in_period_count = completed_in_period.count()

        # Completion rate
        if created_in_period_count > 0:
            completion_rate = round((completed_in_period_count / created_in_period_count) * 100, 2)
        elif completed_in_period_count > 0:
            completion_rate = 100.0
        elif total_tasks > 0:
            completion_rate = round((completed_tasks / total_tasks) * 100, 2)
        else:
            completion_rate = 0.0

        # On-time completion rate
        completed_with_due = completed_in_period.filter(due_date__isnull=False)
        completed_with_due_count = completed_with_due.count()
        if completed_with_due_count > 0:
            on_time_count = completed_with_due.filter(completed_at__date__lte=F('due_date')).count()
            on_time_rate = round((on_time_count / completed_with_due_count) * 100, 2)
        else:
            on_time_rate = 100.0 if completed_in_period_count > 0 else 0.0

        # Average & median completion duration in hours
        durations = []
        for t in completed_in_period.filter(completed_at__isnull=False):
            delta = (t.completed_at - t.created_at).total_seconds() / 3600
            if delta < 0:
                delta = abs(delta)
            durations.append(max(0.5, delta))

        avg_completion_hours = round(sum(durations) / len(durations), 1) if durations else 0.0
        median_completion_hours = round(statistics.median(durations), 1) if durations else 0.0

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
            'completed': completed_tasks,
        }

        # Daily trends across the requested period (capped at 31 points for graph clarity)
        days_span = max(1, (d_to - d_from).days + 1)
        step = max(1, days_span // 30) if days_span > 31 else 1
        trends = []
        curr = d_from
        while curr <= d_to:
            next_curr = min(curr + timedelta(days=step - 1), d_to)
            c_count = tasks.filter(created_at__date__gte=curr, created_at__date__lte=next_curr).count()
            comp_count = tasks.filter(status=Status.COMPLETED, completed_at__date__gte=curr, completed_at__date__lte=next_curr).count()
            trends.append({
                'date': curr.isoformat(),
                'created': c_count,
                'completed': comp_count,
            })
            curr = next_curr + timedelta(days=1)

        # Team workload
        teams = Team.objects.filter(company=company)
        team_workload = []
        for team in teams:
            t_tasks = tasks.filter(team=team)
            if t_tasks.exists():
                team_workload.append({
                    'team_id': team.id,
                    'team_name': team.name,
                    'total_tasks': t_tasks.count(),
                    'completed_tasks': t_tasks.filter(status=Status.COMPLETED).count(),
                    'overdue_tasks': t_tasks.filter(due_date__lt=today, status__in=[Status.TODO, Status.IN_PROGRESS, Status.ON_HOLD]).count(),
                })

        # Member workload
        members = User.objects.filter(company=company, is_active=True)
        member_workload = []
        for member in members:
            m_tasks = tasks.filter(assigned_to=member)
            if m_tasks.exists():
                member_workload.append({
                    'user_id': member.id,
                    'user_name': member.full_name,
                    'total_tasks': m_tasks.count(),
                    'completed_tasks': m_tasks.filter(status=Status.COMPLETED).count(),
                    'overdue_tasks': m_tasks.filter(due_date__lt=today, status__in=[Status.TODO, Status.IN_PROGRESS, Status.ON_HOLD]).count(),
                })

        # At risk projects
        projects = Project.objects.filter(company=company)
        at_risk_projects = []
        for project in projects:
            p_tasks = tasks.filter(project=project)
            p_total = p_tasks.count()
            if p_total > 0:
                p_completed = p_tasks.filter(status=Status.COMPLETED).count()
                p_overdue = p_tasks.filter(due_date__lt=today, status__in=[Status.TODO, Status.IN_PROGRESS, Status.ON_HOLD]).count()
                progress = round((p_completed / p_total) * 100)
                if p_overdue > 0 or project.health in ['at_risk', 'off_track']:
                    at_risk_projects.append({
                        'project_id': project.id,
                        'project_name': project.name,
                        'total_tasks': p_total,
                        'completed_tasks': p_completed,
                        'overdue_tasks': p_overdue,
                        'progress': progress,
                        'health': project.health,
                        'due_date': project.target_date.isoformat() if project.target_date else None,
                    })

        # Approvals summary (aggregating completion approvals and deadline extension requests)
        approval_reqs = ApprovalRequest.objects.filter(company=company)
        task_reports = TaskReport.objects.filter(task__company=company)
        approvals_summary = {
            'pending': approval_reqs.filter(status=ApprovalStatus.PENDING).count() + task_reports.filter(status=ReportStatus.PENDING).count(),
            'approved': approval_reqs.filter(status=ApprovalStatus.APPROVED).count() + task_reports.filter(status=ReportStatus.APPROVED).count(),
            'rejected': approval_reqs.filter(status=ApprovalStatus.REJECTED).count() + task_reports.filter(status=ReportStatus.REJECTED).count(),
            'completion_requests': {
                'pending': approval_reqs.filter(status=ApprovalStatus.PENDING).count(),
                'approved': approval_reqs.filter(status=ApprovalStatus.APPROVED).count(),
                'rejected': approval_reqs.filter(status=ApprovalStatus.REJECTED).count(),
            },
            'report_requests': {
                'pending': task_reports.filter(status=ReportStatus.PENDING).count(),
                'approved': task_reports.filter(status=ReportStatus.APPROVED).count(),
                'rejected': task_reports.filter(status=ReportStatus.REJECTED).count(),
            },
        }

        # Backwards compatible keys + rich analytics
        week_ago = today - timedelta(days=7)
        return {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'in_progress_tasks': in_progress_tasks,
            'open_tasks': open_tasks,
            'overdue_tasks': overdue_tasks,
            'deferred_tasks': deferred_tasks,
            'new_tasks_this_week': tasks.filter(created_at__date__gte=week_ago).count(),
            'completed_this_week': tasks.filter(status=Status.COMPLETED, completed_at__date__gte=week_ago).count(),
            'created_in_period': created_in_period_count,
            'completed_in_period': completed_in_period_count,
            'completion_rate': completion_rate,
            'on_time_completion_rate': on_time_rate,
            'avg_completion_time_hours': avg_completion_hours,
            'median_completion_time_hours': median_completion_hours,
            'priority_breakdown': priority_breakdown,
            'status_breakdown': status_breakdown,
            'trends': trends,
            'team_workload': team_workload,
            'member_workload': member_workload,
            'at_risk_projects': at_risk_projects,
            'approvals': approvals_summary,
            'date_from': d_from.isoformat(),
            'date_to': d_to.isoformat(),
        }

    @staticmethod
    def get_user_statistics(user, company, date_from=None, date_to=None):
        """Get statistics for a specific user within a specific company."""
        now = timezone.now()
        today = timezone.localdate()

        d_from = parse_date_param(date_from)
        d_to = parse_date_param(date_to)

        if not d_from or not d_to:
            d_from = today - timedelta(days=29)
            d_to = today

        created_tasks = Task.objects.filter(company=company, creator=user, is_active=True)
        assigned_tasks = Task.objects.filter(company=company, assigned_to=user, is_active=True)
        visible_tasks = Task.objects.filter(
            Q(creator=user) | Q(assigned_to=user) | Q(team__members=user),
            company=company,
            is_active=True,
        ).distinct()

        # "Ma journée" for Collaborator
        my_day = {
            'overdue': assigned_tasks.filter(due_date__lt=today, status__in=[Status.TODO, Status.IN_PROGRESS, Status.ON_HOLD]).count(),
            'today': assigned_tasks.filter(due_date=today, status__in=[Status.TODO, Status.IN_PROGRESS, Status.ON_HOLD]).count(),
            'in_progress': assigned_tasks.filter(status=Status.IN_PROGRESS).count(),
            'upcoming': assigned_tasks.filter(due_date__gt=today, status__in=[Status.TODO, Status.IN_PROGRESS, Status.ON_HOLD]).count(),
        }

        # Created tasks stats
        created_stats = {
            'total': created_tasks.count(),
            'completed': created_tasks.filter(status=Status.COMPLETED).count(),
            'in_progress': created_tasks.filter(status=Status.IN_PROGRESS).count(),
            'overdue': created_tasks.filter(due_date__lt=today, status__in=[Status.TODO, Status.IN_PROGRESS, Status.ON_HOLD]).count(),
        }

        # Assigned tasks stats
        assigned_stats = {
            'total': assigned_tasks.count(),
            'completed': assigned_tasks.filter(status=Status.COMPLETED).count(),
            'in_progress': assigned_tasks.filter(status=Status.IN_PROGRESS).count(),
            'overdue': assigned_tasks.filter(due_date__lt=today, status__in=[Status.TODO, Status.IN_PROGRESS, Status.ON_HOLD]).count(),
        }

        # Scope stats
        scope_stats = {
            'total': visible_tasks.count(),
            'completed': visible_tasks.filter(status=Status.COMPLETED).count(),
            'in_progress': visible_tasks.filter(status=Status.IN_PROGRESS).count(),
            'overdue': visible_tasks.filter(due_date__lt=today, status__in=[Status.TODO, Status.IN_PROGRESS, Status.ON_HOLD]).count(),
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
        }

        # Period calculation for user
        created_in_period = visible_tasks.filter(created_at__date__gte=d_from, created_at__date__lte=d_to).count()
        completed_in_period = visible_tasks.filter(status=Status.COMPLETED, completed_at__date__gte=d_from, completed_at__date__lte=d_to).count()

        if created_in_period > 0:
            completion_rate = round((completed_in_period / created_in_period) * 100, 2)
        elif completed_in_period > 0:
            completion_rate = 100.0
        elif visible_tasks.count() > 0:
            completion_rate = round((scope_stats['completed'] / visible_tasks.count()) * 100, 2)
        else:
            completion_rate = 0.0

        # Weekly stats (backwards compatibility)
        week_ago = today - timedelta(days=7)
        new_this_week = visible_tasks.filter(created_at__gte=week_ago).count()
        completed_this_week = visible_tasks.filter(status=Status.COMPLETED, completed_at__gte=week_ago).count()
        weekly_completion_rate = round((completed_this_week / new_this_week * 100)) if new_this_week > 0 else (100 if completed_this_week > 0 else 0)

        # Personal daily trends across requested period
        days_span = max(1, (d_to - d_from).days + 1)
        step = max(1, days_span // 30) if days_span > 31 else 1
        trends = []
        curr = d_from
        while curr <= d_to:
            next_curr = min(curr + timedelta(days=step - 1), d_to)
            c_count = visible_tasks.filter(created_at__date__gte=curr, created_at__date__lte=next_curr).count()
            comp_count = visible_tasks.filter(status=Status.COMPLETED, completed_at__date__gte=curr, completed_at__date__lte=next_curr).count()
            trends.append({
                'date': curr.isoformat(),
                'created': c_count,
                'completed': comp_count,
            })
            curr = next_curr + timedelta(days=1)

        # Action required (both completion approvals and postponement validations)
        pending_my_approvals = (
            ApprovalRequest.objects.filter(company=company, task__assigned_to=user, status=ApprovalStatus.PENDING).count()
            + TaskReport.objects.filter(task__company=company, requested_by=user, status=ReportStatus.PENDING).count()
        )

        return {
            'created': created_stats,
            'assigned': assigned_stats,
            'scope': scope_stats,
            'my_day': my_day,
            'new_tasks_this_week': new_this_week,
            'completed_this_week': completed_this_week,
            'completion_rate': completion_rate,
            'weekly_completion_rate': weekly_completion_rate,
            'created_in_period': created_in_period,
            'completed_in_period': completed_in_period,
            'trends': trends,
            'pending_approvals_count': pending_my_approvals,
            'date_from': d_from.isoformat(),
            'date_to': d_to.isoformat(),
        }

    @staticmethod
    def get_recent_activity(user, company, limit=10, team_id=None):
        """Get recent activity limited to tasks visible to the current user."""
        recent_history = TaskHistory.objects.filter(task__company=company)
        if team_id:
            recent_history = recent_history.filter(task__team_id=team_id)
        if not user.is_manager():
            recent_history = recent_history.filter(
                Q(task__creator=user) | Q(task__assigned_to=user) | Q(task__team__members=user)
            )

        recent_history = recent_history.select_related(
            'changed_by',
            'task',
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
    def get_performance_metrics(company, team_id=None, date_from=None, date_to=None):
        """Get performance metrics for the company."""
        now = timezone.now()
        today = timezone.localdate()

        d_from = parse_date_param(date_from)
        d_to = parse_date_param(date_to)

        if not d_from or not d_to:
            d_from = today - timedelta(days=29)
            d_to = today

        tasks = Task.objects.filter(
            company=company,
            is_active=True,
            created_at__date__gte=d_from,
            created_at__date__lte=d_to,
        )
        if team_id:
            tasks = tasks.filter(team_id=team_id)

        completed_tasks = tasks.filter(status=Status.COMPLETED, completed_at__isnull=False)

        if completed_tasks.exists():
            completion_times = []
            for task in completed_tasks:
                if task.completed_at:
                    delta = task.completed_at - task.created_at
                    completion_times.append(delta.total_seconds() / 3600)

            avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0.0
            median_completion_time = statistics.median(completion_times) if completion_times else 0.0
        else:
            avg_completion_time = 0.0
            median_completion_time = 0.0

        on_time_completed = completed_tasks.filter(
            due_date__isnull=False,
            completed_at__date__lte=F('due_date'),
        ).count()
        with_due = completed_tasks.filter(due_date__isnull=False).count()

        on_time_rate = round(
            (on_time_completed / with_due * 100) if with_due > 0 else (100.0 if completed_tasks.count() > 0 else 0.0),
            2,
        )

        return {
            'avg_completion_time_hours': round(avg_completion_time, 2),
            'median_completion_time_hours': round(median_completion_time, 2),
            'on_time_completion_rate': on_time_rate,
            'total_tasks_in_period': tasks.count(),
            'total_tasks_last_30_days': tasks.count(),
            'completed_in_period': completed_tasks.count(),
            'completed_last_30_days': completed_tasks.count(),
        }
