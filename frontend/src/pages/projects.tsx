import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FolderKanban, Plus, Search, CheckCircle2, AlertTriangle, Clock, Users,
  Calendar, ShieldAlert, ArrowUpRight, Lock, Edit3, Trash2, UserRound, Sparkles
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { requireAuthentication } from '@/router/auth'
import { projectsService, type CreateProjectPayload } from '@/services/projects'
import { subscriptionsService } from '@/services/subscriptions'
import { authService } from '@/services/auth'
import type { Project, ProjectHealth, ProjectStatus } from '@/domain/types'

export const Route = createFileRoute('/projects')({
  beforeLoad: requireAuthentication,
  component: ProjectsPage,
})

const healthBadges: Record<ProjectHealth, { label: string; variant: 'success' | 'warning' | 'danger'; icon: typeof CheckCircle2 }> = {
  on_track: { label: 'Sur les rails', variant: 'success', icon: CheckCircle2 },
  at_risk: { label: 'En risque', variant: 'warning', icon: AlertTriangle },
  off_track: { label: 'En retard', variant: 'danger', icon: AlertTriangle },
}

const statusBadges: Record<ProjectStatus, { label: string; className: string }> = {
  in_progress: { label: 'En cours', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' },
  on_hold: { label: 'En pause', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  completed: { label: 'Terminé', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
  cancelled: { label: 'Annulé', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [healthFilter, setHealthFilter] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const { data: subscription } = useQuery({
    queryKey: ['mySubscription'],
    queryFn: subscriptionsService.getMySubscription,
  })

  const { data: projects = [], isLoading, isError } = useQuery({
    queryKey: ['projects', search, statusFilter, healthFilter],
    queryFn: () => projectsService.list({ search, status: statusFilter, health: healthFilter }),
  })

  const { data: usersData } = useQuery({
    queryKey: ['companyUsers'],
    queryFn: () => authService.getUsers({ is_active: true }),
  })
  const users = Array.isArray(usersData) ? usersData : usersData?.results || []

  // Check tiering: free/starter plans can be restricted or prompt upgrade
  const planCode = subscription?.plan_details?.code || 'starter'
  const isFreePlan = planCode === 'free' || planCode === 'starter'

  const deleteMutation = useMutation({
    mutationFn: projectsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const onTrackCount = projects.filter((p) => p.health === 'on_track').length
  const atRiskCount = projects.filter((p) => p.health === 'at_risk' || p.health === 'off_track').length
  const completedCount = projects.filter((p) => p.status === 'completed').length

  return (
    <Layout title="Projets & Portefeuille">
      <div className="space-y-8 p-4 sm:p-8 max-w-7xl mx-auto">
        {/* Header section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground">Portefeuille de Projets</h1>
              {isFreePlan && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" /> PRO
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Pilotez les grands chantiers stratégiques de votre organisation et suivez l'avancement en temps réel.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingProject(null)
              setIsModalOpen(true)
            }}
            size="lg"
            className="shadow-lg shadow-primary/20"
          >
            <Plus className="h-5 w-5 mr-2" /> Nouveau Projet
          </Button>
        </div>

        {/* Plan Upgrade Banner if on free plan */}
        {isFreePlan && (
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-indigo-50/50 to-purple-50/30 dark:from-primary/20 dark:to-purple-950/30 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="rounded-xl bg-primary/15 p-2.5 text-primary">
                  <FolderKanban className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Débloquez la gestion avancée des projets</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                    Le module Projets permet de regrouper vos tâches, de suivre la santé des livrables et d'obtenir des jalons automatisés. Passez à l'offre Pro pour des projets illimités.
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate({ to: '/subscription' })} variant="secondary" size="sm" className="shrink-0">
                Découvrir l'offre Pro <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard title="Projets Actifs" value={projects.length} icon={FolderKanban} color="indigo" />
          <MetricCard title="Sur les rails" value={onTrackCount} icon={CheckCircle2} color="emerald" />
          <MetricCard title="En risque / retard" value={atRiskCount} icon={AlertTriangle} color="amber" alert={atRiskCount > 0} />
          <MetricCard title="Projets Terminés" value={completedCount} icon={CheckCircle2} color="purple" />
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un projet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm font-normal text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Tous les statuts</option>
              <option value="in_progress">En cours</option>
              <option value="on_hold">En pause</option>
              <option value="completed">Terminé</option>
              <option value="cancelled">Annulé</option>
            </select>

            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Toute la santé</option>
              <option value="on_track">Sur les rails 🟢</option>
              <option value="at_risk">En risque 🟠</option>
              <option value="off_track">En retard 🔴</option>
            </select>
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-card p-6" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive">
            Impossible de charger les projets. Veuillez réessayer.
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-bold text-foreground">Aucun projet trouvé</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Créez votre premier projet pour organiser vos tâches en grands objectifs d'équipe.
            </p>
            <Button
              onClick={() => {
                setEditingProject(null)
                setIsModalOpen(true)
              }}
              className="mt-6"
            >
              <Plus className="h-4 w-4 mr-2" /> Créer un projet
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => navigate({ to: '/projects/$projectId', params: { projectId: String(project.id) } })}
                onEdit={() => {
                  setEditingProject(project)
                  setIsModalOpen(true)
                }}
                onDelete={() => {
                  if (confirm(`Voulez-vous supprimer le projet « ${project.name} » ?`)) {
                    deleteMutation.mutate(project.id)
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Project Create / Edit Modal */}
        <ProjectFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          project={editingProject}
          users={users}
        />
      </div>
    </Layout>
  )
}

function MetricCard({ title, value, icon: Icon, color, alert }: { title: string; value: number; icon: React.ElementType; color: string; alert?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition-colors ${alert ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : 'border-border bg-card'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className={`rounded-xl p-2 bg-${color}-100 dark:bg-${color}-950/50 text-${color}-600`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl sm:text-3xl font-black text-foreground">{value}</p>
    </div>
  )
}

function ProjectCard({
  project,
  onOpen,
  onEdit,
  onDelete,
}: {
  project: Project
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const healthInfo = healthBadges[project.health] || healthBadges.on_track
  const statusInfo = statusBadges[project.status] || statusBadges.in_progress

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
      <div>
        {/* Header badges */}
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
          <Badge variant={healthInfo.variant} className="text-xs font-bold px-2.5 py-0.5">
            {healthInfo.label}
          </Badge>
        </div>

        {/* Title and Description */}
        <div className="mt-4">
          <h3
            onClick={onOpen}
            className="text-lg font-bold text-foreground group-hover:text-primary transition-colors cursor-pointer line-clamp-1"
          >
            {project.name}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
            {project.description || 'Aucune description renseignée.'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-muted-foreground">Avancement</span>
            <span className="text-foreground">{project.progress_percent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                project.progress_percent >= 100
                  ? 'bg-emerald-500'
                  : project.health === 'off_track'
                  ? 'bg-rose-500'
                  : 'bg-primary'
              }`}
              style={{ width: `${project.progress_percent}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground text-right mt-1">
            {project.completed_tasks_count} / {project.total_tasks_count} tâche(s) terminée(s)
          </p>
        </div>
      </div>

      {/* Footer details & Action buttons */}
      <div className="mt-6 border-t border-border pt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium">
            <UserRound className="h-3.5 w-3.5" />
            <span>{project.manager_name || 'Non assigné'}</span>
          </div>
          {project.due_date && (
            <div className="flex items-center gap-1 font-medium">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(project.due_date).toLocaleDateString('fr-FR')}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex -space-x-2">
            {(project.member_details || []).slice(0, 3).map((m) => (
              <div
                key={m.id}
                title={m.full_name}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary ring-2 ring-background"
              >
                {m.full_name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
            ))}
            {(project.member_details || []).length > 3 && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground ring-2 ring-background">
                +{(project.member_details || []).length - 3}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Modifier"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <Button onClick={onOpen} size="sm" className="ml-1 text-xs">
              Ouvrir
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectFormModal({
  isOpen,
  onClose,
  project,
  users,
}: {
  isOpen: boolean
  onClose: () => void
  project: Project | null
  users: { id: number; full_name: string; email: string }[]
}) {
  const queryClient = useQueryClient()
  const isEditing = !!project

  const mutation = useMutation({
    mutationFn: (data: CreateProjectPayload) => {
      if (isEditing) {
        return projectsService.update(project.id, data)
      }
      return projectsService.create(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const data: CreateProjectPayload = {
      name: String(form.get('name')),
      description: String(form.get('description') || ''),
      status: String(form.get('status')),
      health: String(form.get('health')),
      start_date: form.get('start_date') ? String(form.get('start_date')) : undefined,
      due_date: form.get('due_date') ? String(form.get('due_date')) : undefined,
      manager: form.get('manager') ? Number(form.get('manager')) : undefined,
      budget_hours: form.get('budget_hours') ? Number(form.get('budget_hours')) : 0,
    }
    mutation.mutate(data)
  }

  const inputClass = 'h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Modifier le projet' : 'Nouveau Projet Strategic'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Nom du projet *</label>
          <input name="name" required defaultValue={project?.name} placeholder="Ex: Refonte du Site Web Q3" className={inputClass} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Description</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={project?.description}
            placeholder="Objectifs et livrables clés..."
            className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Statut</label>
            <select name="status" defaultValue={project?.status || 'in_progress'} className={inputClass}>
              <option value="in_progress">En cours</option>
              <option value="on_hold">En pause</option>
              <option value="completed">Terminé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Santé du projet</label>
            <select name="health" defaultValue={project?.health || 'on_track'} className={inputClass}>
              <option value="on_track">Sur les rails 🟢</option>
              <option value="at_risk">En risque 🟠</option>
              <option value="off_track">En retard 🔴</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Responsable</label>
            <select name="manager" defaultValue={project?.manager || ''} className={inputClass}>
              <option value="">Sélectionner un manager</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Budget d'heures</label>
            <input name="budget_hours" type="number" min={0} defaultValue={project?.budget_hours || 0} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Date de début</label>
            <input name="start_date" type="date" defaultValue={project?.start_date} className={inputClass} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Date d'échéance</label>
            <input name="due_date" type="date" defaultValue={project?.due_date} className={inputClass} />
          </div>
        </div>

        {mutation.isError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-medium text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : 'Erreur lors de l’enregistrement.'}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Enregistrement…' : isEditing ? 'Enregistrer' : 'Créer le projet'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
