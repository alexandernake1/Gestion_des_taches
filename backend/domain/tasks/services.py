import calendar
from datetime import date, timedelta

from .models import RecurrenceFrequency, Status, Task


def _shift_months(value: date, months: int) -> date:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def shift_recurrence_date(value: date | None, frequency: str, interval: int):
    if value is None:
        return None
    if frequency == RecurrenceFrequency.DAILY:
        return value + timedelta(days=interval)
    if frequency == RecurrenceFrequency.WEEKLY:
        return value + timedelta(weeks=interval)
    if frequency == RecurrenceFrequency.MONTHLY:
        return _shift_months(value, interval)
    return value


def generate_next_occurrence(task: Task) -> Task | None:
    if not task.recurrence_frequency or task.next_occurrence_id:
        return task.next_occurrence

    next_start = shift_recurrence_date(
        task.start_date,
        task.recurrence_frequency,
        task.recurrence_interval,
    )
    next_due = shift_recurrence_date(
        task.due_date,
        task.recurrence_frequency,
        task.recurrence_interval,
    )
    reference_date = next_due or next_start
    if not reference_date:
        return None

    # Fix #21 : Sécurité anti-boucle infinie (cap recurrence à max 5 ans)
    if reference_date > date.today() + timedelta(days=365 * 5):
        return None

    if (
        task.recurrence_end_date
        and reference_date > task.recurrence_end_date
    ):
        return None

    next_task = Task.objects.create(
        title=task.title,
        description=task.description,
        company=task.company,
        creator=task.creator,
        assigned_to=task.assigned_to,
        team=task.team,
        parent=task.parent,
        priority=task.priority,
        status=Status.TODO,
        start_date=next_start,
        due_date=next_due,
        recurrence_frequency=task.recurrence_frequency,
        recurrence_interval=task.recurrence_interval,
        recurrence_end_date=task.recurrence_end_date,
        estimated_hours=task.estimated_hours,
    )
    next_task.dependencies.set(task.dependencies.all())
    
    # Fix #9 : Copier les sous-tâches (elles deviennent de nouvelles instances)
    for subtask in task.subtasks.all():
        # On décale les dates de la sous-tâche de la même durée
        sub_start = shift_recurrence_date(subtask.start_date, task.recurrence_frequency, task.recurrence_interval)
        sub_due = shift_recurrence_date(subtask.due_date, task.recurrence_frequency, task.recurrence_interval)
        
        sub = Task.objects.create(
            title=subtask.title,
            description=subtask.description,
            company=subtask.company,
            creator=subtask.creator,
            assigned_to=subtask.assigned_to,
            team=subtask.team,
            parent=next_task,
            priority=subtask.priority,
            status=Status.TODO,
            start_date=sub_start,
            due_date=sub_due,
            estimated_hours=subtask.estimated_hours,
        )
        sub.dependencies.set(subtask.dependencies.all())

    task.next_occurrence = next_task
    task.save(update_fields=['next_occurrence', 'updated_at'])
    return next_task
