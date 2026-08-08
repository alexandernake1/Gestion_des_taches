import { Badge } from '@/components/ui/Badge'
import type { Priority, Status } from '@/domain/types'

/**
 * Shared task badge utilities — centralized here to avoid duplication
 * across tasks.tsx, $taskId.tsx, and dashboard.tsx.
 */

export function getStatusBadge(status: Status) {
  const variants: Record<Status, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
    todo: 'default',
    in_progress: 'info',
    on_hold: 'warning',
    deferred: 'warning',
    completed: 'success',
  }
  const labels: Record<Status, string> = {
    todo: 'À faire',
    in_progress: 'En cours',
    on_hold: 'En attente',
    deferred: 'Reportée',
    completed: 'Complétée',
  }
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}

export function getPriorityBadge(priority: Priority) {
  const variants: Record<Priority, 'default' | 'info' | 'warning' | 'danger'> = {
    low: 'default',
    normal: 'info',
    high: 'warning',
    urgent: 'danger',
  }
  const labels: Record<Priority, string> = {
    low: 'Faible',
    normal: 'Normale',
    high: 'Haute',
    urgent: 'Urgent',
  }
  return <Badge variant={variants[priority]}>{labels[priority]}</Badge>
}

/** Plain string labels (useful for selects/dropdowns) */
export const STATUS_LABELS: Record<Status, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  on_hold: 'En attente',
  deferred: 'Reportée',
  completed: 'Complétée',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Faible',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgent',
}
