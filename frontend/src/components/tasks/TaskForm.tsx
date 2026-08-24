import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarRange, ClipboardCheck, FileText, Settings2 } from 'lucide-react'
import { FormWizard, FormWizardActions, FormWizardPanel, type FormWizardStep } from '@/components/forms/FormWizard'
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
  /** Pre-lock the form to a specific project (from project detail page). */
  lockedProjectId?: number
}

const taskSteps: FormWizardStep[] = [
  {
    id: 'essentials',
    title: 'Essentiel',
    description: 'Titre, description et projet',
    icon: FileText,
  },
  {
    id: 'organization',
    title: 'Organisation',
    description: 'Statut, priorité et responsables',
    icon: Settings2,
  },
  {
    id: 'planning',
    title: 'Planification',
    description: 'Dates, charge et récurrence',
    icon: CalendarRange,
  },
  {
    id: 'review',
    title: 'Vérification',
    description: 'Contrôlez avant de créer',
    icon: ClipboardCheck,
  },
]

const statusLabels: Record<Status, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  on_hold: 'En pause',
  deferred: 'Reportée',
  completed: 'Terminée',
}

const priorityLabels: Record<Priority, string> = {
  low: 'Faible',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente',
}

const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground'
const inputClass = 'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
const selectClass = `${inputClass} cursor-pointer`

export function TaskForm({
  onSubmit,
  onCancel,
  initialData,
  isEdit = false,
  users: providedUsers,
  teams: providedTeams,
  canAssign = true,
  isSubmitting = false,
  error,
  lockedProjectId,
}: TaskFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [reviewData, setReviewData] = useState<TaskCreateRequest | null>(null)
  const [stepError, setStepError] = useState('')

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsService.list(),
    enabled: canAssign || Boolean(lockedProjectId),
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
  const effectiveProjectId = lockedProjectId ?? initialData?.project
  const [selectedProjectId, setSelectedProjectId] = useState(effectiveProjectId ? String(effectiveProjectId) : '')
  const [selectedTeamId, setSelectedTeamId] = useState(initialData?.team ? String(initialData.team) : '')
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(initialData?.assigned_to ? String(initialData.assigned_to) : '')
  const selectedProject = projects.find((project) => String(project.id) === selectedProjectId)
  const projectTeamIds = useMemo(
    () => new Set((selectedProject?.teams || []).map(String)),
    [selectedProject?.teams],
  )
  const availableTeams = selectedProject
    ? teams.filter((team) => projectTeamIds.has(String(team.id)))
    : teams
  const selectedTeam = teams.find((team) => String(team.id) === selectedTeamId)
  const isDelegatedTask = Boolean(selectedAssigneeId || selectedTeamId)

  useEffect(() => {
    if (!selectedProject || selectedTeamId || (selectedProject.teams || []).length !== 1) return
    const inheritedTeam = teams.find((team) => String(team.id) === String(selectedProject.teams?.[0]))
    if (!inheritedTeam) return
    setSelectedTeamId(String(inheritedTeam.id))
    if (inheritedTeam.leader) setSelectedAssigneeId(String(inheritedTeam.leader))
  }, [selectedProject, selectedTeamId, teams])

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId)
    const project = projects.find((item) => String(item.id) === projectId)
    const teamIds = new Set((project?.teams || []).map(String))
    if (teamIds.size && !teamIds.has(selectedTeamId)) {
      setSelectedTeamId('')
      setSelectedAssigneeId('')
    }
  }

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId)
    const team = teams.find((item) => String(item.id) === teamId)
    setSelectedAssigneeId(team?.leader ? String(team.leader) : '')
  }

  const buildPayload = (): TaskCreateRequest | null => {
    if (!formRef.current) return null
    const formData = new FormData(formRef.current)
    const assignedTo = String(formData.get('assigned_to') || '')
    const team = String(formData.get('team') || '')
    const project = String(formData.get('project') || '')

    return {
      title: String(formData.get('title') || '').trim(),
      description: String(formData.get('description') || '').trim() || undefined,
      priority: String(formData.get('priority') || 'normal') as Priority,
      status: String(formData.get('status') || 'todo') as Status,
      assigned_to: assignedTo ? Number(assignedTo) : undefined,
      team: team ? Number(team) : undefined,
      project: project ? Number(project) : undefined,
      start_date: String(formData.get('start_date') || '') || undefined,
      due_date: String(formData.get('due_date') || '') || undefined,
      recurrence_frequency: String(formData.get('recurrence_frequency') || '') as TaskCreateRequest['recurrence_frequency'],
      recurrence_interval: Number(formData.get('recurrence_interval')) || 1,
      recurrence_end_date: String(formData.get('recurrence_end_date') || '') || undefined,
      estimated_hours: Number(formData.get('estimated_hours')) || 1,
      requires_completion_approval: canAssign && isDelegatedTask
        ? formData.get('requires_completion_approval') === 'on'
        : false,
    }
  }

  const validateCurrentStep = () => {
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-form-wizard-step="${currentStep}"]`)
    if (!panel) return true
    const controls = Array.from(panel.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea'))
    for (const control of controls) {
      if (!control.checkValidity()) {
        control.reportValidity()
        return false
      }
    }
    return true
  }

  const validatePlanning = (payload: TaskCreateRequest) => {
    if (payload.start_date && payload.due_date && payload.due_date < payload.start_date) {
      setStepError("La date d'échéance doit être postérieure ou égale à la date de début.")
      return false
    }
    if (payload.recurrence_end_date && payload.due_date && payload.recurrence_end_date < payload.due_date) {
      setStepError("La fin de récurrence ne peut pas précéder l'échéance de la tâche.")
      return false
    }
    return true
  }

  const goToNextStep = () => {
    setStepError('')
    if (!validateCurrentStep()) return
    const payload = buildPayload()
    if (!payload) return
    if (currentStep === 2 && !validatePlanning(payload)) return
    if (currentStep === taskSteps.length - 2) setReviewData(payload)
    setCurrentStep((step) => Math.min(step + 1, taskSteps.length - 1))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = buildPayload()
    if (!payload) return
    if (!isEdit && currentStep !== taskSteps.length - 1) {
      goToNextStep()
      return
    }
    if (!validatePlanning(payload)) {
      if (!isEdit) setCurrentStep(2)
      return
    }
    onSubmit(payload)
  }

  const essentialsPanel = (
    <FormWizardPanel
      step={0}
      active={isEdit || currentStep === 0}
      title="Définissez clairement la tâche"
      description="Commencez par le résultat attendu. Les détails d'organisation viendront ensuite."
    >
      <div>
        <label className={labelClass}>Titre de la tâche *</label>
        <input
          name="title"
          required
          defaultValue={initialData?.title}
          placeholder="Ex. Préparer le rapport mensuel"
          autoFocus={!isEdit}
          className={`${inputClass} text-[15px] font-medium`}
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          name="description"
          rows={4}
          defaultValue={initialData?.description}
          placeholder="Contexte, résultat attendu et informations utiles…"
          className="min-h-[110px] w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {(canAssign || lockedProjectId) && (
        <div>
          <label className={labelClass}>Projet associé</label>
          {lockedProjectId ? (
            <>
              <input type="hidden" name="project" value={lockedProjectId} />
              <div className="flex h-11 w-full items-center rounded-xl border border-primary/30 bg-primary/5 px-3 text-sm font-medium text-primary">
                {projects.find((project) => project.id === lockedProjectId)?.name ?? `Projet #${lockedProjectId}`}
                <span className="ml-auto text-xs text-muted-foreground">Verrouillé</span>
              </div>
            </>
          ) : (
            <select name="project" value={selectedProjectId} onChange={(event) => handleProjectChange(event.target.value)} className={selectClass}>
              <option value="">Sans projet</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">Le projet permet de regrouper la tâche dans un objectif commun.</p>
        </div>
      )}
    </FormWizardPanel>
  )

  const organizationPanel = (
    <FormWizardPanel
      step={1}
      active={isEdit || currentStep === 1}
      title="Organisez la responsabilité"
      description="Définissez la priorité, le statut initial et les personnes responsables."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Statut</label>
          <select name="status" defaultValue={initialData?.status || 'todo'} className={selectClass} required>
            <option value="todo">À faire</option>
            <option value="in_progress">En cours</option>
            <option value="on_hold">En pause</option>
            <option value="deferred">Reportée</option>
            <option value="completed">Terminée</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Priorité</label>
          <select name="priority" defaultValue={initialData?.priority || 'normal'} className={selectClass} required>
            <option value="low">Faible</option>
            <option value="normal">Normale</option>
            <option value="high">Haute</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>
      </div>

      {canAssign && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Personne responsable</label>
            <select name="assigned_to" value={selectedAssigneeId} onChange={(event) => setSelectedAssigneeId(event.target.value)} className={selectClass} disabled={usersLoading}>
              <option value="">{usersLoading ? 'Chargement…' : 'Moi-même — tâche personnelle'}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.full_name ? `${user.full_name} — ${user.email}` : user.email}</option>
              ))}
            </select>
            {!usersLoading && users.length === 0 && <p className="mt-1.5 text-xs text-muted-foreground">Aucun utilisateur actif disponible.</p>}
          </div>
          <div>
            <label className={labelClass}>Équipe responsable</label>
            <select
              name="team"
              value={selectedTeamId}
              onChange={(event) => handleTeamChange(event.target.value)}
              className={selectClass}
              disabled={teamsLoading}
              required={projectTeamIds.size > 1}
            >
              <option value="">{teamsLoading ? 'Chargement…' : 'Aucune équipe'}</option>
              {availableTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}{team.leader_name ? ` — Manager : ${team.leader_name}` : ''} ({team.member_count ?? team.members?.length ?? 0} membres)
                </option>
              ))}
            </select>
            {!teamsLoading && selectedProject && projectTeamIds.size === 0 && <p className="mt-1.5 text-xs text-amber-700">Ce projet n'a encore aucune équipe rattachée.</p>}
          </div>
          <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">
            {isDelegatedTask
              ? "La personne responsable recevra la tâche. Le manager d'une équipe sélectionnée est proposé automatiquement."
              : 'Sans collaborateur ni équipe, cette tâche sera automatiquement créée pour vous.'}
            {projectTeamIds.size > 0 && ' Seules les équipes rattachées au projet sont proposées.'}
          </p>
          {selectedTeam?.leader && selectedAssigneeId && String(selectedTeam.leader) !== selectedAssigneeId && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:col-span-2">La personne choisie est différente du manager de l'équipe.</p>
          )}
        </div>
      )}
    </FormWizardPanel>
  )

  const planningPanel = (
    <FormWizardPanel
      step={2}
      active={isEdit || currentStep === 2}
      title="Planifiez l'exécution"
      description="Fixez les dates, la charge et les règles de répétition ou de validation."
    >
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
          <label className={labelClass}>Charge estimée</label>
          <div className="relative">
            <input name="estimated_hours" type="number" min="0.25" step="0.25" defaultValue={initialData?.estimated_hours || 1} className={`${inputClass} pr-16`} />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-muted-foreground">heures</span>
          </div>
        </div>
      </div>

      {canAssign && isDelegatedTask && (
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <input name="requires_completion_approval" type="checkbox" defaultChecked={initialData?.requires_completion_approval ?? !isEdit} className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30" />
          <span>
            <span className="block text-sm font-bold text-foreground">Validation requise avant clôture</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">Le collaborateur expliquera sa demande avant la décision d'un manager.</span>
          </span>
        </label>
      )}

      <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
        <div>
          <p className="text-sm font-bold text-foreground">Récurrence</p>
          <p className="mt-1 text-xs text-muted-foreground">Laissez « Aucune » pour une tâche unique.</p>
        </div>
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
            <label className={labelClass}>Intervalle</label>
            <input name="recurrence_interval" type="number" min={1} max={365} defaultValue={initialData?.recurrence_interval || 1} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Fin de récurrence</label>
            <DateInput name="recurrence_end_date" defaultValue={initialData?.recurrence_end_date} className={inputClass} />
          </div>
        </div>
      </div>
    </FormWizardPanel>
  )

  const activeReview = reviewData
  const reviewPanel = !isEdit && (
    <FormWizardPanel
      step={3}
      active={currentStep === 3}
      title="Vérifiez avant la création"
      description="Relisez les informations principales. Vous pourrez revenir en arrière sans perdre vos saisies."
    >
      {activeReview && (
        <div className="grid gap-4 sm:grid-cols-2">
          <ReviewCard label="Tâche" value={activeReview.title} detail={activeReview.description || 'Aucune description'} />
          <ReviewCard
            label="Organisation"
            value={`${statusLabels[activeReview.status]} · Priorité ${priorityLabels[activeReview.priority].toLowerCase()}`}
            detail={[
              projects.find((project) => Number(project.id) === activeReview.project)?.name,
              teams.find((team) => Number(team.id) === activeReview.team)?.name,
            ].filter(Boolean).join(' · ') || 'Sans projet ni équipe'}
          />
          <ReviewCard
            label="Responsabilité"
            value={
              !activeReview.assigned_to && !activeReview.team
                ? 'Tâche personnelle'
                : users.find((user) => Number(user.id) === activeReview.assigned_to)?.full_name || "Responsabilité définie par l'équipe"
            }
            detail={
              !activeReview.assigned_to && !activeReview.team
                ? 'Créée automatiquement pour vous · aucune validation nécessaire'
                : activeReview.requires_completion_approval ? 'Validation requise avant clôture' : 'Clôture directe autorisée'
            }
          />
          <ReviewCard
            label="Planification"
            value={activeReview.due_date ? `Échéance : ${formatDate(activeReview.due_date)}` : 'Aucune échéance'}
            detail={`${activeReview.estimated_hours || 1} h estimée${Number(activeReview.estimated_hours || 1) > 1 ? 's' : ''}${activeReview.recurrence_frequency ? ' · Tâche récurrente' : ''}`}
          />
        </div>
      )}
    </FormWizardPanel>
  )

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {isEdit ? (
        <div className="space-y-7">
          {essentialsPanel}
          {organizationPanel}
          {planningPanel}
        </div>
      ) : (
        <FormWizard steps={taskSteps} currentStep={currentStep} onStepSelect={(step) => { setStepError(''); setCurrentStep(step) }}>
          {essentialsPanel}
          {organizationPanel}
          {planningPanel}
          {reviewPanel}
        </FormWizard>
      )}

      {(stepError || error) && (
        <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {stepError || error}
        </div>
      )}

      {isEdit ? (
        <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">Annuler</Button>
          <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">Mettre à jour</Button>
        </div>
      ) : (
        <FormWizardActions
          currentStep={currentStep}
          totalSteps={taskSteps.length}
          onBack={() => { setStepError(''); setCurrentStep((step) => Math.max(0, step - 1)) }}
          onNext={goToNextStep}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
          submitLabel="Créer la tâche"
          submittingLabel="Création…"
        />
      )}
    </form>
  )
}

function ReviewCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">{label}</p>
      <p className="mt-2 text-sm font-bold text-foreground">{value}</p>
      <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(`${value}T00:00:00`))
}
