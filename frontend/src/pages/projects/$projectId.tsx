import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, FolderKanban, CheckCircle2, AlertTriangle, Clock, Users,
  Plus, Calendar, LayoutGrid, ListFilter, CheckSquare2, UserRound, ArrowRight
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { requireAuthentication } from '@/router/auth'
import { projectsService } from '@/services/projects'
import { tasksService } from '@/services/tasks'
import type { Task, Status, Priority } from '@/domain/types'

export const Route = createFileRoute('/projects/$projectId')({
  beforeLoad: requireAuthentication,
  component: ProjectDetailPage,
})

const statusColumns: { id: Status; label: string; color: string }[] = [
  { id: 'todo', label: 'À faire', color: 'border-slate-300 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300' },
  { id: 'in_progress', label: 'En cours', color: 'border-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' },
  { id: 'on_hold', label: 'En attente', color: 'border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
  { id: 'completed', label: 'Terminée', color: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
]

export function ProjectDetailPage() {
  const { projectId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const numericId = Number(projectId)
  const [activeTab, setActiveTab] = useState<'kanban' | 'timeline'>('kanban')
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ['project', numericId],
    queryFn: () => projectsService.getById(numericId),
  })

  const { data: tasksData, isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks', 'project', numericId],
    queryFn: () => tasksService.list({ project: numericId }),
  })
  const tasks = tasksData?.results || []

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, newStatus }: { taskId: number; newStatus: Status }) =>
      tasksService.update(taskId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['project', numericId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  if (isProjectLoading) {
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
          <div className="grid gap-6 sm:grid-cols-3 pt-6 border-t border-border">
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

            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">Responsable</p>
                <p className="text-sm font-semibold text-foreground">{project.manager_name || 'Non assigné'}</p>
              </div>
            </div>

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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {statusColumns.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.id)
              return (
                <div key={col.id} className="flex flex-col rounded-2xl border border-border bg-card/60 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-xl border px-3 py-1 text-xs font-bold ${col.color}`}>
                      {col.label}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">{colTasks.length}</span>
                  </div>

                  <div className="space-y-3 flex-1 min-h-[300px]">
                    {colTasks.length === 0 ? (
                      <div className="h-24 rounded-xl border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground/60">
                        Aucune tâche
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => navigate({ to: '/tasks/$taskId', params: { taskId: String(task.id) } })}
                          className="group cursor-pointer rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md space-y-3"
                        >
                          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                            <span>{task.assigned_to_name || 'Non assigné'}</span>
                            {task.due_date && (
                              <span>{new Date(task.due_date).toLocaleDateString('fr-FR')}</span>
                            )}
                          </div>
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
                      <p className="text-xs text-muted-foreground">Assigné à : {task.assigned_to_name || 'Non assigné'}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <Badge variant={task.status === 'completed' ? 'success' : 'secondary'}>
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

  const mutation = useMutation({
    mutationFn: (data: { title: string; description?: string; project: number; priority?: Priority; due_date?: string }) =>
      tasksService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    mutation.mutate({
      title: String(form.get('title')),
      description: String(form.get('description') || ''),
      project: projectId,
      priority: (form.get('priority') as Priority) || 'normal',
      due_date: form.get('due_date') ? String(form.get('due_date')) : undefined,
    })
  }

  const inputClass = 'h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle tâche pour ce projet">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Titre de la tâche *</label>
          <input name="title" required placeholder="Ex: Rédiger la spécification..." className={inputClass} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Description</label>
          <textarea
            name="description"
            rows={3}
            placeholder="Détails de la tâche..."
            className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Priorité</label>
            <select name="priority" defaultValue="normal" className={inputClass}>
              <option value="low">Faible</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Date d'échéance</label>
            <input name="due_date" type="date" className={inputClass} />
          </div>
        </div>

        {mutation.isError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-medium text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : 'Erreur lors de la création.'}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Création…' : 'Créer la tâche'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
