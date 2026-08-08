import { Button } from '@/components/ui/Button'
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
}

export function TaskForm({ onSubmit, onCancel, initialData, isEdit, users = [], teams = [], canAssign = true, isSubmitting = false, error }: TaskFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const assignedToVal = formData.get('assigned_to') as string
    const teamVal = formData.get('team') as string

    const data: TaskCreateRequest = {
      title: formData.get('title') as string,
      description: formData.get('description') as string || undefined,
      priority: formData.get('priority') as Priority,
      status: formData.get('status') as Status,
      assigned_to: assignedToVal ? Number(assignedToVal) : undefined,
      team: teamVal ? Number(teamVal) : undefined,
      start_date: formData.get('start_date') as string || undefined,
      due_date: formData.get('due_date') as string || undefined,
      recurrence_frequency: formData.get('recurrence_frequency') as TaskCreateRequest['recurrence_frequency'] || undefined,
      recurrence_interval: Number(formData.get('recurrence_interval')) || 1,
      recurrence_end_date: formData.get('recurrence_end_date') as string || undefined,
      estimated_hours: Number(formData.get('estimated_hours')) || 1,
    }
    
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        
        {/* Left Column: Main Details */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Titre de la tâche
            </label>
            <input
              name="title"
              required
              defaultValue={initialData?.title}
              placeholder="Ex: Refonte de la page d'accueil"
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-[15px] sm:text-sm text-foreground transition-all"
            />
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-[15px] sm:text-sm text-foreground transition-all resize-y"
              defaultValue={initialData?.description}
              placeholder="Détails de la tâche, étapes clés, contexte..."
            />
          </div>

          {!canAssign && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs sm:text-sm text-primary font-medium">
              Cette tâche sera automatiquement enregistrée comme tâche personnelle.
            </div>
          )}
        </div>

        {/* Right Column: Settings */}
        <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-3.5 sm:p-4">
          <h3 className="font-bold text-sm sm:text-base text-foreground mb-2">Paramètres</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Statut
              </label>
              <select
                name="status"
                defaultValue={initialData?.status || 'todo'}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[15px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                required
              >
                <option value="todo">À faire</option>
                <option value="in_progress">En cours</option>
                <option value="on_hold">En attente</option>
                <option value="deferred">Reportée</option>
                <option value="completed">Complétée</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Priorité
              </label>
              <select
                name="priority"
                defaultValue={initialData?.priority || 'normal'}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[15px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                required
              >
                <option value="low">Faible</option>
                <option value="normal">Normale</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {canAssign && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Assigné à
                  </label>
                  {users.length > 0 ? (
                    <select
                      name="assigned_to"
                      defaultValue={initialData?.assigned_to || ''}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[15px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    >
                      <option value="">Moi-même</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name || u.email}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name="assigned_to"
                      placeholder="ID user"
                      type="number"
                      defaultValue={initialData?.assigned_to}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[15px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    />
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Équipe
                  </label>
                  {teams.length > 0 ? (
                    <select
                      name="team"
                      defaultValue={initialData?.team || ''}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[15px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    >
                      <option value="">Aucune</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name="team"
                      placeholder="ID équipe"
                      type="number"
                      defaultValue={initialData?.team}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[15px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    />
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Date début
              </label>
              <input
                name="start_date"
                type="date"
                defaultValue={initialData?.start_date}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[15px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Échéance
              </label>
              <input
                name="due_date"
                type="date"
                defaultValue={initialData?.due_date}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[15px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>
            
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Charge estimée (heures)
              </label>
              <input
                name="estimated_hours"
                type="number"
                min="0.25"
                step="0.25"
                defaultValue={initialData?.estimated_hours || 1}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[15px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>
          </div>
        </div>

      </div>
      
      {/* Recurrence (Bottom Width) */}
      <div className="rounded-2xl border border-border bg-background p-3.5 sm:p-5">
        <p className="mb-2.5 text-xs sm:text-sm font-bold text-foreground">Récurrence</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">Fréquence
            <select name="recurrence_frequency" defaultValue={initialData?.recurrence_frequency || ''} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[15px] sm:text-sm text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none">
              <option value="">Aucune</option>
              <option value="daily">Quotidienne</option>
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuelle</option>
            </select>
          </label>
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">Tous les
            <input name="recurrence_interval" type="number" min={1} max={365} defaultValue={initialData?.recurrence_interval || 1} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[15px] sm:text-sm text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none" />
          </label>
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">Fin de récurrence
            <input name="recurrence_end_date" type="date" defaultValue={initialData?.recurrence_end_date} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[15px] sm:text-sm text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none" />
          </label>
        </div>
        <p className="mt-2.5 text-xs text-muted-foreground">La prochaine occurrence sera créée lorsque cette tâche sera terminée.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs sm:text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="sticky bottom-0 z-10 bg-card pt-3 pb-1 border-t border-border/60 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3">
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
