import { useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Clock, Plus, Calendar, LayoutGrid, CheckSquare2, UserRound, ArrowRight
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { TaskForm } from '@/components/tasks/TaskForm'
import { requireCollaborativeWorkspace } from '@/router/auth'
import { projectsService } from '@/services/projects'
import { tasksService } from '@/services/tasks'
import { authService } from '@/services/auth'
import type { Status, TaskCreateRequest } from '@/domain/types'
import { toast } from 'sonner'

export const Route = createFileRoute('/projects/$projectId')({
  beforeLoad: requireCollaborativeWorkspace,
  component: ProjectDetailPage,
})

const statusColumns: { id: Status | 'pending_approval'; label: string; color: string }[] = [
  { id: 'todo', label: 'À faire', color: 'border-slate-300 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300' },
  { id: 'in_progress', label: 'En cours', color: 'border-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' },
  { id: 'on_hold', label: 'En pause', color: 'border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
  { id: 'pending_approval', label: 'En attente de validation', color: 'border-violet-300 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300' },
  { id: 'deferred', label: 'Reportée', color: 'border-orange-300 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300' },
  { id: 'completed', label: 'Terminée', color: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
]

export function ProjectDetailPage() {
  const { projectId } = Route.useParams()
  const navigate = useNavigate()
  const numericId = Number(projectId)
  const [activeTab, setActiveTab] = useState<'kanban' | 'timeline'>('kanban')
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const draggedTaskId = useRef<number | null>(null)
  const [draggingOver, setDraggingOver] = useState<Status | null>(null)
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
  })
  const isPersonalWorkspace = Boolean(currentUser?.is_personal_workspace)
  const queryClient = useQueryClient()

  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: Status }) => tasksService.update(taskId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'project', numericId] })
      queryClient.invalidateQueries({ queryKey: ['project', numericId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Changement de statut impossible.')
    },
  })

  const startTaskDrag = (event: React.DragEvent<HTMLDivElement>, taskId: number) => {
    draggedTaskId.current = taskId
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(taskId))
  }

  const dropTask = (event: React.DragEvent<HTMLDivElement>, status: Status | 'pending_approval') => {
    event.preventDefault()
    if (status === 'pending_approval') return
    const taskId = draggedTaskId.current ?? Number(event.dataTransfer.getData('text/plain'))
    if (taskId) updateTaskStatusMutation.mutate({ taskId, status })
    draggedTaskId.current = null
    setDraggingOver(null)
  }

  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ['project', numericId],
    queryFn: () => projectsService.getById(numericId),
  })

  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks', 'project', numericId],
    queryFn: () => tasksService.list({ project: numericId }),
  })
  if (isProjectLoading || isTasksLoading) {
    return (
      <Layout title="Projet">
        <div className="p-8 max-w-7xl mx-auto space-y-6">
          <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
        </div>
      </Layout>
    )
  }

  if (!project) {
    return (
      <Layout title="Projet introuvable">
        <div className="p-12 text-center">
          <p className="text-lg font-bold text-destructive">Projet introuvable.</p>
          <Button onClick={() => navigate({ to: '/projects' })} className="mt-4">
            Retour aux projets
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={project.name}>
      <div className="space-y-8 p-4 sm:p-8 max-w-7xl mx-auto">
        {/* Navigation back button */}
        <button
          onClick={() => navigate({ to: '/projects' })}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux projets
        </button>

        {/* Project Header Banner */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-foreground">{project.name}</h1>
                <Badge
                  variant={
                    project.health === 'on_track'
                      ? 'success'
                      : project.health === 'at_risk'
                      ? 'warning'
                      : 'danger'
                  }
                  className="text-xs font-bold px-3 py-1"
                >
                  {project.health_display}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground max-w-3xl">
                {project.description || 'Aucune description renseignée.'}
              </p>
            </div>

            <Button onClick={() => setIsTaskModalOpen(true)} size="lg" className="shrink-0 shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5 mr-2" /> Ajouter une tâche
            </Button>
          </div>

          {/* Progress bar and key details */}
          <div className={`grid gap-6 pt-6 border-t border-border ${isPersonalWorkspace ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted-foreground">Progression Globale</span>
                <span className="text-foreground">{project.progress_percent}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${project.progress_percent}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {project.completed_tasks_count} / {project.total_tasks_count} tâche(s) accomplie(s)
              </p>
            </div>

            {!isPersonalWorkspace && <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">Responsable</p>
                <p className="text-sm font-semibold text-foreground">{project.manager_name || 'Non assigné'}</p>
              </div>
            </div>}

            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">Échéance finale</p>
                <p className="text-sm font-semibold text-foreground">
                  {project.due_date ? new Date(project.due_date).toLocaleDateString('fr-FR') : 'Non définie'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {!isPersonalWorkspace && (project.team_details || []).length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground">Équipes participant au projet</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.team_details?.map((team) => (
                <span key={team.id} className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                  <UserRound className="h-4 w-4" />
                  {team.name}
                  <span className="text-xs font-normal text-muted-foreground">{team.member_count} membre(s)</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* View Tabs */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                activeTab === 'kanban'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <LayoutGrid className="h-4 w-4" /> Tableau Kanban
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                activeTab === 'timeline'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Clock className="h-4 w-4" /> Timeline & Planning
            </button>
          </div>
        </div>

        {/* Kanban Board Tab */}
        {activeTab === 'kanban' && (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {statusColumns.filter((col) => !isPersonalWorkspace || col.id !== 'pending_approval').map((col) => {
              const colTasks = tasks.filter((task) => (
                col.id === 'pending_approval'
                  ? task.approval_pending
                  : !task.approval_pending && task.status === col.id
              ))
              const isDropTarget = col.id !== 'pending_approval'
              const isOver = draggingOver === col.id
              return (
                <div
                  key={col.id}
                  className={`flex flex-col rounded-2xl border border-border bg-card/60 p-4 space-y-4 transition-colors ${isOver ? 'border-primary/50 bg-primary/5 shadow-inner' : ''}`}
                  onDragOver={(event) => {
                    if (!isDropTarget) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    setDraggingOver(col.id)
                  }}
                  onDragLeave={() => setDraggingOver(null)}
                  onDrop={(event) => dropTask(event, col.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-xl border px-3 py-1 text-xs font-bold ${col.color}`}>
                      {col.label}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">{colTasks.length}</span>
                  </div>

                  <div className="space-y-3 flex-1 min-h-[300px]">
                    {colTasks.length === 0 ? (
                      <div className="h-24 rounded-xl border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground/60">
                        {isOver ? 'Déposer ici' : 'Aucune tâche'}
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <div
                          key={task.id}
                          draggable={!task.approval_pending && !task.is_blocked}
                          onDragStart={(event) => startTaskDrag(event, task.id)}
                          onDragEnd={() => {
                            draggedTaskId.current = null
                            setDraggingOver(null)
                          }}
                          onClick={() => navigate({ to: '/tasks/$taskId', params: { taskId: String(task.id) } })}
                          title={task.approval_pending ? 'Cette tâche attend une validation : ouvrez-la pour la traiter.' : task.is_blocked ? 'Cette tâche est bloquée par une dépendance.' : 'Glissez la tâche vers un autre statut.'}
                          className={`group rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md space-y-3 ${task.approval_pending || task.is_blocked ? 'cursor-not-allowed opacity-75' : 'cursor-grab active:cursor-grabbing'}`}
                        >
                          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                            {!isPersonalWorkspace && <span>{task.assigned_to_name || 'Non assigné'}</span>}
                            {task.due_date && (
                              <span>{new Date(task.due_date).toLocaleDateString('fr-FR')}</span>
                            )}
                          </div>
                          {task.deadline_status === 'overdue' && <span className="inline-flex rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700">En retard</span>}
                          {task.deadline_status === 'completed_late' && <span className="inline-flex rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">Terminée en retard</span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-foreground">Échéancier chronologique du projet</h3>
            <div className="divide-y divide-border">
              {tasks.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucune tâche enregistrée sur ce projet.</p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate({ to: '/tasks/$taskId', params: { taskId: String(task.id) } })}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 cursor-pointer hover:bg-muted/40 px-3 rounded-xl transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckSquare2 className="h-4 w-4 text-primary" />
                        <span className="font-bold text-foreground hover:text-primary transition-colors text-sm">
                          {task.title}
                        </span>
                      </div>
                      {!isPersonalWorkspace && <p className="text-xs text-muted-foreground">Assigné à : {task.assigned_to_name || 'Non assigné'}</p>}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <Badge variant={task.status === 'completed' ? 'success' : 'default'}>
                        {task.status_display}
                      </Badge>
                      {task.due_date && (
                        <span className="text-muted-foreground">
                          Échéance : {new Date(task.due_date).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Task Creation Modal for this Project */}
        <CreateProjectTaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          projectId={numericId}
        />
      </div>
    </Layout>
  )
}

function CreateProjectTaskModal({
  isOpen,
  onClose,
  projectId,
}: {
  isOpen: boolean
  onClose: () => void
  projectId: number
}) {
  const queryClient = useQueryClient()
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
  })
  const canAssign = Boolean(
    !currentUser?.is_personal_workspace
    && (currentUser?.is_superuser || currentUser?.role === 'owner' || currentUser?.role === 'manager'),
  )

  const mutation = useMutation({
    mutationFn: (data: TaskCreateRequest) => tasksService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onClose()
    },
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle tâche pour ce projet" size="lg">
      <TaskForm
        lockedProjectId={projectId}
        onSubmit={mutation.mutate}
        onCancel={onClose}
        isSubmitting={mutation.isPending}
        canAssign={canAssign}
        error={mutation.isError ? (mutation.error instanceof Error ? mutation.error.message : 'Erreur lors de la création.') : undefined}
      />
    </Modal>
  )
}
