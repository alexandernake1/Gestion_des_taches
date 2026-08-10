import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { DateInput } from '@/components/ui/DateInput'
import { projectsService } from '@/services/projects'
import { authService } from '@/services/auth'
import { teamsService } from '@/services/teams'
import type { TaskCreateRequest, Priority, Status, User, Team } from '@/domain/types'

interface TaskFormProps {
  onSubmit: (data: TaskCreateRequest) => void
  onCancel: () => void
  initialData?: Partial<TaskCreateRequest>
  isEdit?: boolean
  users?: User[]
  teams?: Team[]
  canAssign?: boolean
  isSubmitting?: boolean
  error?: string
  /** Pre-lock the form to a specific project (from project detail page) */
  lockedProjectId?: number
}

const labelClass = 'block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5'
const inputClass = 'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all'
const selectClass = 'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer'

export function TaskForm({
  onSubmit,
  onCancel,
  initialData,
  isEdit,
  users: providedUsers,
  teams: providedTeams,
  canAssign = true,
  isSubmitting = false,
  error,
  lockedProjectId,
}: TaskFormProps) {
  // Load available projects for the dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsService.list(),
  })

  const { data: fetchedUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => authService.list({ is_active: true }),
    enabled: canAssign && providedUsers === undefined,
  })

  const { data: fetchedTeams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsService.list,
    enabled: canAssign && providedTeams === undefined,
  })

  const users = providedUsers ?? fetchedUsers
  const teams = providedTeams ?? fetchedTeams

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const assignedToVal = formData.get('assigned_to') as string
    const teamVal = formData.get('team') as string
    const projectVal = formData.get('project') as string

    const data: TaskCreateRequest = {
      title: formData.get('title') as string,
      description: formData.get('description') as string || undefined,
      priority: formData.get('priority') as Priority,
      status: formData.get('status') as Status,
      assigned_to: assignedToVal ? Number(assignedToVal) : undefined,
      team: teamVal ? Number(teamVal) : undefined,
      project: projectVal ? Number(projectVal) : undefined,
      start_date: formData.get('start_date') as string || undefined,
      due_date: formData.get('due_date') as string || undefined,
      recurrence_frequency: formData.get('recurrence_frequency') as TaskCreateRequest['recurrence_frequency'] || undefined,
      recurrence_interval: Number(formData.get('recurrence_interval')) || 1,
      recurrence_end_date: formData.get('recurrence_end_date') as string || undefined,
      estimated_hours: Number(formData.get('estimated_hours')) || 1,
      requires_completion_approval: canAssign
        ? formData.get('requires_completion_approval') === 'on'
        : false,
    }

    onSubmit(data)
  }

  const effectiveProjectId = lockedProjectId ?? initialData?.project

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Title */}
      <div>
        <label className={labelClass}>Titre de la tâche *</label>
        <input
          name="title"
          required
          defaultValue={initialData?.title}
          placeholder="Ex: Refonte de la page d'accueil"
          className={`${inputClass} h-11 text-[15px] font-medium`}
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Description</label>
        <textarea
          name="description"
          rows={4}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-y min-h-[100px]"
          defaultValue={initialData?.description}
          placeholder="Détails de la tâche, étapes clés, contexte..."
        />
      </div>

      {/* Project */}
      <div>
        <label className={labelClass}>🗂️ Projet associé</label>
        {lockedProjectId ? (
          <>
            <input type="hidden" name="project" value={lockedProjectId} />
            <div className="h-10 w-full rounded-xl border border-primary/30 bg-primary/5 px-3 flex items-center text-sm text-primary font-medium">
              {projects.find(p => p.id === lockedProjectId)?.name ?? `Projet #${lockedProjectId}`}
              <span className="ml-auto text-xs text-muted-foreground">Verrouillé</span>
            </div>
          </>
        ) : (
          <select
            name="project"
            defaultValue={effectiveProjectId ?? ''}
            className={selectClass}
          >
            <option value="">— Sans projet —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Status + Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Statut</label>
          <select name="status" defaultValue={initialData?.status || 'todo'} className={selectClass} required>
            <option value="todo">À faire</option>
            <option value="in_progress">En cours</option>
            <option value="on_hold">En attente</option>
            <option value="deferred">Reportée</option>
            <option value="completed">Complétée</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Priorité</label>
          <select name="priority" defaultValue={initialData?.priority || 'normal'} className={selectClass} required>
            <option value="low">🟢 Faible</option>
            <option value="normal">🔵 Normale</option>
            <option value="high">🟠 Haute</option>
            <option value="urgent">🔴 Urgent</option>
          </select>
        </div>
      </div>

      {/* Assignment */}
      {canAssign ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Assigné à</label>
            <select name="assigned_to" defaultValue={initialData?.assigned_to || ''} className={selectClass} disabled={usersLoading}>
              <option value="">{usersLoading ? 'Chargement des utilisateurs…' : 'Moi-même'}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name ? `${u.full_name} — ${u.email}` : u.email}</option>
              ))}
            </select>
            {!usersLoading && users.length === 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">Aucun autre utilisateur actif n’est disponible.</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Équipe</label>
            <select name="team" defaultValue={initialData?.team || ''} className={selectClass} disabled={teamsLoading}>
              <option value="">{teamsLoading ? 'Chargement des équipes…' : 'Aucune équipe'}</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.member_count ?? t.members?.length ?? 0} membre(s))</option>
              ))}
            </select>
            {!teamsLoading && teams.length === 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">Aucune équipe active n’est disponible.</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Vous pouvez assigner la tâche à une personne, à une équipe, ou aux deux pour conserver un responsable individuel dans un contexte d’équipe.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary font-medium">
          Cette tâche sera automatiquement enregistrée comme tâche personnelle.
        </div>
      )}

      {/* Dates + Charge */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Date de début</label>
          <DateInput name="start_date" defaultValue={initialData?.start_date} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Échéance</label>
          <DateInput name="due_date" defaultValue={initialData?.due_date} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Charge (heures)</label>
          <input
            name="estimated_hours"
            type="number"
            min="0.25"
            step="0.25"
            defaultValue={initialData?.estimated_hours || 1}
            className={inputClass}
          />
        </div>
      </div>

      {canAssign && (
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <input
            name="requires_completion_approval"
            type="checkbox"
            defaultChecked={initialData?.requires_completion_approval ?? !isEdit}
            className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
          />
          <span>
            <span className="block text-sm font-bold text-foreground">Validation requise avant clôture</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Le collaborateur devra expliquer sa demande. Un responsable approuvera ou refusera ensuite la clôture.
            </span>
          </span>
        </label>
      )}

      {/* Recurrence */}
      <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-bold text-foreground">🔁 Récurrence</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Fréquence</label>
            <select name="recurrence_frequency" defaultValue={initialData?.recurrence_frequency || ''} className={selectClass}>
              <option value="">Aucune</option>
              <option value="daily">Quotidienne</option>
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuelle</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Tous les</label>
            <input name="recurrence_interval" type="number" min={1} max={365} defaultValue={initialData?.recurrence_interval || 1} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Fin de récurrence</label>
            <DateInput name="recurrence_end_date" defaultValue={initialData?.recurrence_end_date} className={inputClass} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">La prochaine occurrence sera créée lorsque cette tâche sera terminée.</p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col-reverse gap-3 pt-4 border-t border-border/50 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : 'Créer la tâche'}
        </Button>
      </div>
    </form>
  )
}
