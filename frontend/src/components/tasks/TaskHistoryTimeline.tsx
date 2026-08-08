import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Clock, Edit3, ArrowRight } from 'lucide-react'
import type { TaskHistory } from '@/domain/types'

interface TaskHistoryTimelineProps {
  history: TaskHistory[]
}

const FIELD_LABELS: Record<string, string> = {
  status: 'Statut',
  priority: 'Priorité',
  title: 'Titre',
  description: 'Description',
  assigned_to: 'Assignation',
  team: 'Équipe',
  due_date: 'Date d\'échéance',
  start_date: 'Date de début',
  progress_percent: 'Progression',
}

function formatValue(field: string, value?: string) {
  if (!value) return 'Vide'
  
  if (field === 'status') {
    const statuses: Record<string, string> = {
      todo: 'À faire',
      in_progress: 'En cours',
      on_hold: 'En attente',
      deferred: 'Reportée',
      completed: 'Terminée'
    }
    return statuses[value] || value
  }
  
  if (field === 'priority') {
    const priorities: Record<string, string> = {
      low: 'Faible',
      normal: 'Normale',
      high: 'Haute',
      urgent: 'Urgente'
    }
    return priorities[value] || value
  }

  return value
}

export function TaskHistoryTimeline({ history }: TaskHistoryTimelineProps) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 border-dashed bg-slate-50 py-12 text-center">
        <Clock className="mb-2 h-8 w-8 text-slate-300" />
        <h3 className="text-sm font-medium text-slate-900">Aucun historique</h3>
        <p className="mt-1 text-xs text-slate-500">
          Cette tâche n'a subi aucune modification.
        </p>
      </div>
    )
  }

  return (
    <div className="flow-root p-2">
      <ul role="list" className="-mb-8">
        {history.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== history.length - 1 ? (
                <span
                  className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 ring-8 ring-white">
                    <Edit3 className="h-4 w-4 text-slate-500" />
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-900">
                        {event.changed_by_name || 'Utilisateur inconnu'}
                      </span>{' '}
                      a modifié{' '}
                      <span className="font-medium text-slate-900">
                        {FIELD_LABELS[event.field_name] || event.field_name}
                      </span>
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      {event.old_value && (
                        <span className="line-through opacity-70">
                          {formatValue(event.field_name, event.old_value)}
                        </span>
                      )}
                      {event.old_value && event.new_value && <ArrowRight className="h-3.5 w-3.5" />}
                      {event.new_value && (
                        <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {formatValue(event.field_name, event.new_value)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="whitespace-nowrap text-right text-xs text-slate-500">
                    <time dateTime={event.changed_at}>
                      {format(new Date(event.changed_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
