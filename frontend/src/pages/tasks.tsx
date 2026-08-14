import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useConfirmation } from '@/components/ui/confirmation'
import { tasksService } from '@/services/tasks'
import { authService } from '@/services/auth'
import { subscriptionsService } from '@/services/subscriptions'
import type { Task, Status, Priority } from '@/domain/types'
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Columns3, List, Plus, Search, SlidersHorizontal, UserCheck, X, Lock, LayoutTemplate, GanttChart } from 'lucide-react'
import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import { requireCompanyMember } from '@/router/auth'
import { ErrorState } from '@/components/ui/ErrorState'
import { TimelineView } from '@/components/tasks/TimelineView'
import { api } from '@/utils/api'
import { toast } from 'sonner'

export const Route = createFileRoute('/tasks')({
  beforeLoad: requireCompanyMember,
  component: TasksPage,
})

const exportScopeTitles: Record<string, string> = {
  assigned: 'Tâches assignées à moi',
  mine: 'Tâches créées par moi',
  team: "Tâches d'équipe",
  all: 'Toutes les tâches',
}

const exportStatusTitles: Record<string, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  on_hold: 'En pause',
  deferred: 'Reportées',
  completed: 'Terminées',
}

const exportPriorityTitles: Record<string, string> = {
  low: 'Priorité faible',
  normal: 'Priorité normale',
  high: 'Priorité haute',
  urgent: 'Priorité urgente',
}

function TasksPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const confirmAction = useConfirmation()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') || '')
  const deferredSearch = useDeferredValue(search)
  const [view, setView] = useState<'list' | 'kanban' | 'calendar' | 'timeline'>(() => {
    const savedView = localStorage.getItem('tasks_view')
    return (savedView === 'kanban' || savedView === 'calendar' || savedView === 'timeline') ? savedView : 'list'
  })
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
  })
  
  const { data: subscription } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionsService.getMySubscription,
  })



  const isEmployee = currentUser?.role === 'employee'
  const isPersonalWorkspace = Boolean(currentUser?.is_personal_workspace)

  // Employees only have personal + team scopes.
  // Managers/admins/owners have personal + assigned + all.
  const scopes = isPersonalWorkspace
    ? [{ id: 'all', label: 'Mes tâches' }]
    : isEmployee
    ? [
        { id: 'assigned', label: 'Assignées à moi' },
        { id: 'mine', label: 'Créées par moi' },
        { id: 'team', label: 'Uniquement les tâches de mon équipe' },
        { id: 'all', label: 'Toutes mes tâches' },
      ]
    : [
        { id: 'assigned', label: 'Assignées à moi' },
        { id: 'mine', label: 'Créées par moi' },
        { id: 'team', label: 'Uniquement les tâches d\'équipe' },
        { id: 'all', label: 'Toutes les tâches' },
      ]

  const [scope, setScope] = useState<string>(scopes[0].id)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportTitle, setExportTitle] = useState('')
  const [exporting, setExporting] = useState(false)
  
  // Fonctionnalités autorisées par le forfait
  const featureFlags = subscription?.plan_details?.feature_flags || {}
  const hasKanban = featureFlags['has_kanban_view'] !== false // Par défaut true
  const hasCalendar = featureFlags['has_calendar_view'] === true
  const hasTimeline = featureFlags['has_timeline_view'] === true
  const hasExports = featureFlags['has_exports'] === true

  useEffect(() => {
    if (currentUser?.is_superuser) setScope('all')
  }, [currentUser?.is_superuser])

  useEffect(() => {
    if (isPersonalWorkspace) setScope('all')
  }, [isPersonalWorkspace])

  // Sécurité pour forcer la vue 'list' si la vue sauvegardée n'est plus autorisée
  useEffect(() => {
    if (view === 'kanban' && !hasKanban) setView('list')
    if (view === 'calendar' && !hasCalendar) setView('list')
    if (view === 'timeline' && !hasTimeline) setView('list')
  }, [view, hasKanban, hasCalendar, hasTimeline])

  useEffect(() => {
    localStorage.setItem('tasks_view', view)
  }, [view])

  const filters = {
    status: statusFilter || undefined,
    priority: priorityFilter as Priority || undefined,
    search: deferredSearch || undefined,
  }

  const { data: tasks, isLoading, isError, refetch } = useQuery({
    queryKey: ['tasks', scope, statusFilter, priorityFilter, deferredSearch],
    queryFn: () => {
      if (scope === 'mine') return tasksService.getMyTasks(filters)
      if (scope === 'assigned') return tasksService.getAssignedTasks(filters)
      if (scope === 'team') return tasksService.list({ ...filters, scope: 'team' })
      return tasksService.list(filters)
    },
  })
  const taskSummary = {
    total: tasks?.length || 0,
    active: tasks?.filter((task) => task.status === 'in_progress').length || 0,
    overdue: tasks?.filter((task) => (
      task.status !== 'completed'
      && !!task.due_date
      && new Date(`${task.due_date}T23:59:59`).getTime() < Date.now()
    )).length || 0,
    completed: tasks?.filter((task) => task.status === 'completed').length || 0,
  }
  const activeFilterCount = [statusFilter, priorityFilter, deferredSearch].filter(Boolean).length
  const automaticExportTitle = [
    exportScopeTitles[scope] || 'Export des tâches',
    statusFilter ? exportStatusTitles[statusFilter] : '',
    priorityFilter ? exportPriorityTitles[priorityFilter] : '',
  ].filter(Boolean).join(' - ')
  const clearFilters = () => {
    setStatusFilter('')
    setPriorityFilter('')
    setSearch('')
    window.history.replaceState({}, '', window.location.pathname)
  }

  const openExportModal = () => {
    setExportTitle(automaticExportTitle)
    setExportModalOpen(true)
  }

  const handleExport = async () => {
    const finalTitle = exportTitle.trim() || automaticExportTitle
    setExporting(true)
    try {
      const params = new URLSearchParams()
      Object.entries({ ...filters, scope, title: finalTitle }).forEach(([key, value]) => {
        if (value) params.set(key, String(value))
      })
      const blob = await api.download(`/tasks/export/?${params.toString()}`)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeTitle = finalTitle
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'export_taches'
      a.download = `${safeTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setExportModalOpen(false)
    } catch (err) {
      console.error(err)
      alert("Erreur lors de l'export.")
    } finally {
      setExporting(false)
    }
  }

  // Mutation used by the Kanban drag-and-drop to update the task status.
  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, newStatus }: { taskId: number; newStatus: Status }) =>
      tasksService.update(taskId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Changement de statut impossible.'),
  })
  const bulkMutation = useMutation({
    mutationFn: (data: { action: 'status' | 'archive'; status?: Status }) =>
      tasksService.bulkAction({
        task_ids: selectedIds,
        ...data,
      }),
    onSuccess: () => {
      setSelectedIds([])
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
  const rescheduleMutation = useMutation({
    mutationFn: ({ taskId, dueDate }: { taskId: number; dueDate: string }) =>
      tasksService.update(taskId, { due_date: dueDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const changeTaskStatus = (taskId: number, newStatus: Status) => {
    const task = tasks?.find((item) => item.id === taskId)
    if (newStatus === 'completed' && isEmployee && task?.requires_completion_approval) {
      toast.info('Validation requise avant clôture', {
        description: 'Ouvrez la tâche pour envoyer votre demande au responsable.',
        action: {
          label: 'Ouvrir',
          onClick: () => navigate({ to: '/tasks/$taskId', params: { taskId: String(taskId) } }),
        },
      })
      return
    }
    updateStatusMutation.mutate({ taskId, newStatus })
  }

  const getStatusBadge = (task: Task) => {
    if (task.approval_pending) return <Badge variant="warning">En attente de validation</Badge>
    if (task.deadline_status === 'overdue') return <Badge variant="danger">En retard</Badge>
    if (task.deadline_status === 'completed_late') return <Badge variant="warning">Terminée en retard</Badge>
    const status = task.status
    const variants = {
      todo: 'default',
      in_progress: 'info',
      on_hold: 'warning',
      deferred: 'warning',
      completed: 'success'
    } as const
    const labels = {
      todo: 'À faire',
      in_progress: 'En cours',
      on_hold: 'En pause',
      deferred: 'Reportée',
      completed: 'Terminée'
    }
    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  const getPriorityBadge = (priority: Priority) => {
    const variants = {
      low: 'default',
      normal: 'info',
      high: 'warning',
      urgent: 'danger'
    } as const
    const labels = {
      low: 'Faible',
      normal: 'Normale',
      high: 'Haute',
      urgent: 'Urgent'
    }
    return <Badge variant={variants[priority]}>{labels[priority]}</Badge>
  }

  if (isUserLoading) {
    return (
      <Layout title="Chargement...">
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Tâches">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-7">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'hsl(var(--primary))' }}>
                <SlidersHorizontal className="h-4 w-4" />
                {isPersonalWorkspace || isEmployee ? 'Mon espace de travail' : 'Centre de pilotage'}
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">
                {isPersonalWorkspace || isEmployee ? 'Concentrez-vous sur l’essentiel' : 'Gardez les priorités sous contrôle'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {isPersonalWorkspace
                  ? 'Organisez vos tâches, vos échéances et votre progression dans une vue adaptée à votre quotidien.'
                  : isEmployee
                  ? 'Retrouvez vos tâches assignées, vos échéances et votre progression dans une vue adaptée à votre quotidien.'
                  : 'Suivez la charge, repérez les retards et faites avancer le travail de l’équipe depuis un seul écran.'}
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-3">
              {hasExports && (
                <Button size="lg" variant="secondary" onClick={openExportModal} className="min-w-0">
                  Exporter<span className="hidden sm:inline"> (Excel)</span>
                </Button>
              )}
              <Button size="lg" variant="secondary" onClick={() => navigate({ to: '/tasks/templates' })} className={hasExports ? 'min-w-0' : 'col-span-2 min-w-0'}>
                <LayoutTemplate className="mr-2 h-4 w-4 text-indigo-500" />
                Modèles
              </Button>
              <Button size="lg" onClick={() => navigate({ to: '/tasks/create' })} className="col-span-2 min-w-0 sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                {isPersonalWorkspace ? 'Créer une tâche' : isEmployee ? 'Créer une tâche personnelle' : 'Créer et assigner une tâche'}
              </Button>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryMetric label="Dans cette vue" value={taskSummary.total} icon={List} tone="slate" />
            <SummaryMetric label="En cours" value={taskSummary.active} icon={UserCheck} tone="blue" />
            <SummaryMetric label="En retard" value={taskSummary.overdue} icon={AlertTriangle} tone="rose" />
            <SummaryMetric label="Terminées" value={taskSummary.completed} icon={CheckCircle2} tone="emerald" />
          </div>
        </section>

        <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          {!isPersonalWorkspace && <div className="flex w-full overflow-x-auto rounded-xl border border-border bg-card p-1 lg:w-fit">
            {scopes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setScope(item.id)}
                className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  scope === item.id
                    ? 'text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                style={scope === item.id ? { background: 'hsl(var(--primary))' } : {}}
              >
                {item.label}
              </button>
            ))}
          </div>}
          <div className="flex w-full overflow-x-auto rounded-xl border border-border bg-card p-1 lg:w-fit">
            {[
              { id: 'list', label: 'Liste', icon: List },
              ...(hasKanban ? [{ id: 'kanban', label: 'Kanban', icon: Columns3 }] : []),
              ...(hasTimeline ? [{ id: 'timeline', label: 'Chronologie', icon: GanttChart }] : []),
              ...(hasCalendar ? [{ id: 'calendar', label: 'Calendrier', icon: CalendarDays }] : []),
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id as typeof view)}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  view === item.id
                    ? 'text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                style={view === item.id ? { background: 'hsl(var(--foreground) / 0.90)' } : {}}
              >
                <item.icon className="h-4 w-4" />{item.label}
              </button>
            ))}
          </div>
        </div>
        {selectedIds.length > 0 && (
          <div className="sticky top-24 z-20 mb-5 flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-950 p-3 text-white shadow-xl sm:flex-row sm:items-center">
            <span className="px-2 text-sm font-bold">{selectedIds.length} tâche{selectedIds.length > 1 ? 's' : ''} sélectionnée{selectedIds.length > 1 ? 's' : ''}</span>
            <div className="flex flex-1 flex-wrap gap-2 sm:justify-end">
              <select defaultValue="" aria-label="Changer le statut des tâches sélectionnées" onChange={(event) => {
                const nextStatus = event.target.value as Status
                const selectionRequiresApproval = nextStatus === 'completed' && isEmployee && tasks?.some(
                  (task) => selectedIds.includes(task.id) && task.requires_completion_approval,
                )
                if (selectionRequiresApproval) {
                  toast.info('Certaines tâches exigent une validation individuelle avant clôture.')
                } else if (nextStatus) {
                  bulkMutation.mutate({ action: 'status', status: nextStatus })
                }
                event.target.value = ''
              }} className="h-9 rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white">
                <option value="" className="text-slate-900">Changer le statut…</option>
                <option value="todo" className="text-slate-900">À faire</option>
                <option value="in_progress" className="text-slate-900">En cours</option>
                <option value="on_hold" className="text-slate-900">En pause</option>
                <option value="completed" className="text-slate-900">Terminée</option>
              </select>
              {!isEmployee && <button type="button" onClick={async () => {
                const taskCount = selectedIds.length
                const { confirmed } = await confirmAction({
                  title: `Archiver ${taskCount} tâche${taskCount > 1 ? 's' : ''} ?`,
                  description: `Les ${taskCount} tâches sélectionnées ne figureront plus dans les listes actives.`,
                  confirmLabel: 'Archiver',
                  tone: 'danger',
                  impacts: ['Les tâches pourront toujours être retrouvées dans les données archivées.'],
                })
                if (confirmed) bulkMutation.mutate({ action: 'archive' })
              }} className="h-9 rounded-lg bg-rose-500 px-3 text-xs font-bold hover:bg-rose-600">Archiver</button>}
              <button type="button" onClick={() => setSelectedIds([])} className="h-9 rounded-lg px-3 text-xs font-bold text-indigo-100 hover:bg-white/10">Annuler</button>
            </div>
          </div>
        )}
        <div className="mb-6 rounded-2xl border border-border bg-card p-3 shadow-xs sm:p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Rechercher une tâche"
                className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 sm:w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrer par statut"
              className="h-10 rounded-xl border border-border bg-background px-4 text-sm text-foreground"
            >
              <option value="">Tous les statuts</option>
              <option value="todo">À faire</option>
              <option value="in_progress">En cours</option>
              <option value="on_hold">En pause</option>
              <option value="deferred">Reportée</option>
              <option value="completed">Terminée</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filtrer par priorité"
              className="h-10 rounded-xl border border-border bg-background px-4 text-sm text-foreground"
            >
              <option value="">Toutes les priorités</option>
              <option value="low">Faible</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" onClick={clearFilters} className="text-slate-500">
                <X className="mr-2 h-4 w-4" />
                Effacer {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''}
              </Button>
            )}
          </div>
          </div>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        ) : view === 'kanban' ? (
          <KanbanView
            tasks={tasks || []}
            onOpen={(task) => navigate({ to: '/tasks/$taskId', params: { taskId: String(task.id) } })}
            getPriorityBadge={getPriorityBadge}
            onStatusChange={changeTaskStatus}
            showAssignee={!isPersonalWorkspace}
          />
        ) : view === 'calendar' ? (
          <CalendarView
            tasks={tasks || []}
            onOpen={(task) => navigate({ to: '/tasks/$taskId', params: { taskId: String(task.id) } })}
            onReschedule={(task, dueDate) => rescheduleMutation.mutate({ taskId: task.id, dueDate })}
            canReschedule={(task) => !isEmployee || String(task.creator) === String(currentUser?.id)}
            error={rescheduleMutation.isError ? (rescheduleMutation.error instanceof Error ? rescheduleMutation.error.message : 'Replanification impossible.') : undefined}
            showAssignee={!isPersonalWorkspace}
          />
        ) : view === 'timeline' ? (
          <TimelineView tasks={tasks || []} showAssignee={!isPersonalWorkspace} />
        ) : (
          <div className="grid gap-4">
            {tasks?.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                selected={selectedIds.includes(task.id)}
                onToggle={() => setSelectedIds((current) => current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id])}
                getStatusBadge={getStatusBadge}
                getPriorityBadge={getPriorityBadge}
                showAssignee={!isPersonalWorkspace}
              />
            ))}
            {tasks?.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeFilterCount ? 'Aucune tâche ne correspond à ces filtres' : 'Votre espace est prêt'}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  {activeFilterCount
                    ? 'Modifiez vos critères ou effacez les filtres pour retrouver toutes les tâches.'
                    : 'Créez une première tâche pour commencer à organiser le travail et suivre son avancement.'}
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  {activeFilterCount > 0 ? (
                    <Button variant="secondary" onClick={clearFilters}>Effacer les filtres</Button>
                  ) : (
                    <Button onClick={() => navigate({ to: '/tasks/create' })}>
                      <Plus className="mr-2 h-4 w-4" />Créer une tâche
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Exporter les tâches"
        description="Le fichier reprend exactement le périmètre et les filtres actuellement sélectionnés."
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault()
            void handleExport()
          }}
        >
          <div>
            <label htmlFor="export-title" className="mb-1.5 block text-sm font-semibold text-foreground">
              Titre du fichier
            </label>
            <input
              id="export-title"
              value={exportTitle}
              onChange={(event) => setExportTitle(event.target.value)}
              placeholder={automaticExportTitle}
              maxLength={120}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Titre automatique : {automaticExportTitle}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Périmètre : <strong className="text-foreground">{exportScopeTitles[scope] || 'Export des tâches'}</strong>
            {statusFilter && <> · Statut : <strong className="text-foreground">{exportStatusTitles[statusFilter]}</strong></>}
            {priorityFilter && <> · <strong className="text-foreground">{exportPriorityTitles[priorityFilter]}</strong></>}
            {deferredSearch && <> · Recherche : <strong className="text-foreground">{deferredSearch}</strong></>}
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setExportModalOpen(false)} disabled={exporting}>
              Annuler
            </Button>
            <Button type="submit" disabled={exporting}>
              {exporting ? 'Export en cours…' : 'Télécharger le fichier Excel'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}

function SummaryMetric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof List
  tone: 'slate' | 'blue' | 'rose' | 'emerald'
}) {
  const colorMap = {
    slate:   { icon: 'hsl(var(--muted-foreground))',  iconBg: 'hsl(var(--muted))',              stripe: 'hsl(var(--border))' },
    blue:    { icon: 'hsl(var(--primary))',            iconBg: 'hsl(var(--primary) / 0.10)',    stripe: 'hsl(var(--primary))' },
    rose:    { icon: 'hsl(var(--destructive))',        iconBg: 'hsl(var(--destructive) / 0.10)', stripe: 'hsl(var(--destructive))' },
    emerald: { icon: 'hsl(var(--success))',            iconBg: 'hsl(var(--success) / 0.10)',   stripe: 'hsl(var(--success))' },
  }
  const c = colorMap[tone]
  return (
    <div
      className="relative flex items-center gap-4 overflow-hidden rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-card"
    >
      {/* Accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: c.stripe }} />
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: c.iconBg }}
      >
        <Icon className="h-5 w-5" style={{ color: c.icon }} />
      </div>
      <div>
        <p className="text-2xl font-black leading-none tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function TaskCard({ task, selected, onToggle, getStatusBadge, getPriorityBadge, showAssignee }: { task: Task; selected: boolean; onToggle: () => void; getStatusBadge: (s: Status) => React.ReactNode; getPriorityBadge: (p: Priority) => React.ReactNode; showAssignee: boolean }) {
  const navigate = useNavigate()
  const isOverdue = task.status !== 'completed'
    && !!task.due_date
    && new Date(`${task.due_date}T23:59:59`).getTime() < Date.now()

  return (
    <Card
      className={`group relative cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-card ${
        isOverdue ? 'border-l-4 border-l-destructive' : ''
      } ${selected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
  onClick={() => navigate({ to: '/tasks/$taskId', params: { taskId: String(task.id) } })}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex shrink-0 items-center justify-center h-full sm:pr-2" onClick={(event) => event.stopPropagation()}>
            <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Sélectionner ${task.title}`} className="h-5 w-5 rounded-md border-border text-primary focus:ring-primary/30 transition-all cursor-pointer" />
          </label>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h3 className="text-[15px] font-bold text-foreground group-hover:text-primary transition-colors">{task.title}</h3>
              {getStatusBadge(task)}
              {getPriorityBadge(task.priority)}
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{task.description}</p>
            )}
            <div className="flex flex-col gap-2 text-xs font-medium text-muted-foreground sm:flex-row sm:items-center sm:gap-5">
              {showAssignee && <div className="flex items-center gap-1.5">
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold uppercase text-white"
                  style={{ background: 'hsl(var(--primary) / 0.70)' }}
                >
                  {task.assigned_to_name ? task.assigned_to_name.substring(0, 2) : '?'}
                </div>
                <span>{task.assigned_to_name || 'Non assigné'}</span>
              </div>}
              {task.due_date && (
                <div className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 ${
                  isOverdue
                    ? 'bg-destructive/10 text-destructive font-bold'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>
                    {isOverdue ? 'En retard depuis le ' : 'Échéance : '}
                    {new Date(task.due_date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="secondary" size="sm">
              Ouvrir <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type KanbanColumnStatus = Status | 'pending_approval'

const kanbanColumns: Array<{ status: KanbanColumnStatus; label: string; color: string; textColor: string; bgColor: string; dotColor: string }> = [
  { status: 'todo', label: 'À faire', color: 'border-slate-300', textColor: 'text-slate-700', bgColor: 'bg-slate-100', dotColor: 'bg-slate-400' },
  { status: 'in_progress', label: 'En cours', color: 'border-blue-400', textColor: 'text-blue-700', bgColor: 'bg-blue-100', dotColor: 'bg-blue-500' },
  { status: 'on_hold', label: 'En pause', color: 'border-amber-400', textColor: 'text-amber-700', bgColor: 'bg-amber-100', dotColor: 'bg-amber-500' },
  { status: 'pending_approval', label: 'En attente de validation', color: 'border-violet-400', textColor: 'text-violet-700', bgColor: 'bg-violet-100', dotColor: 'bg-violet-500' },
  { status: 'deferred', label: 'Reportées', color: 'border-orange-400', textColor: 'text-orange-700', bgColor: 'bg-orange-100', dotColor: 'bg-orange-500' },
  { status: 'completed', label: 'Terminées', color: 'border-emerald-400', textColor: 'text-emerald-700', bgColor: 'bg-emerald-100', dotColor: 'bg-emerald-500' },
]

function KanbanView({
  tasks,
  onOpen,
  getPriorityBadge,
  onStatusChange,
  showAssignee,
}: {
  tasks: Task[]
  onOpen: (task: Task) => void
  getPriorityBadge: (priority: Priority) => React.ReactNode
  onStatusChange: (taskId: number, newStatus: Status) => void
  showAssignee: boolean
}) {
  const draggedId = useRef<number | null>(null)
  const [draggingOver, setDraggingOver] = useState<KanbanColumnStatus | null>(null)

  const handleDragStart = (taskId: number) => {
    draggedId.current = taskId
  }

  const handleDrop = (newStatus: KanbanColumnStatus) => {
    if (newStatus === 'pending_approval') return
    if (draggedId.current) {
      onStatusChange(draggedId.current, newStatus)
      draggedId.current = null
    }
    setDraggingOver(null)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory hide-scrollbar w-full">
      {kanbanColumns.filter((column) => showAssignee || column.status !== 'pending_approval').map((column) => {
        const columnTasks = tasks.filter((task) => (
          column.status === 'pending_approval'
            ? task.approval_pending
            : !task.approval_pending && task.status === column.status
        ))
        const isOver = draggingOver === column.status
        return (
          <section
            key={column.status}
            className={`w-[85vw] max-w-[320px] shrink-0 snap-center sm:w-[320px] lg:w-full lg:max-w-none lg:shrink rounded-3xl border p-4 transition-all duration-300 flex-1 ${isOver ? 'bg-primary/5 shadow-inner border-primary/30' : 'bg-muted/40 backdrop-blur-sm border-border/50'} ${column.color.replace('border-', 'border-t-[3px] border-t-').replace('300', '400')}`}
            onDragOver={(e) => { if (column.status !== 'pending_approval') { e.preventDefault(); setDraggingOver(column.status) } }}
            onDragLeave={() => setDraggingOver(null)}
            onDrop={() => handleDrop(column.status)}
          >
            <div className="mb-4 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${column.dotColor}`} />
                <h3 className={`text-[13px] font-black uppercase tracking-wider text-foreground/80`}>{column.label}</h3>
              </div>
              <span className={`flex h-6 min-w-6 items-center justify-center rounded-full ${column.bgColor} px-2 text-xs font-bold ${column.textColor} shadow-sm border border-border/40 dark:border-border`}>{columnTasks.length}</span>
            </div>
            <div className="space-y-3">
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  draggable={!task.approval_pending}
                  onDragStart={() => handleDragStart(task.id)}
                  className="group cursor-grab rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-card hover:border-primary/40 hover:shadow-md active:cursor-grabbing active:scale-[0.98]"
                >
                  <button
                    type="button"
                    onClick={() => onOpen(task)}
                    className="w-full text-left focus:outline-none"
                  >
                    <p className="font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                      {task.is_blocked && <Lock className="inline-block mr-1.5 h-3 w-3 text-rose-500 shrink-0" />}
                      {task.title}
                    </p>
                    {showAssignee && task.assigned_to_name && (
                       <div className="mt-2.5 flex items-center gap-1.5">
                         <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted border border-border/60 text-[9px] font-bold text-muted-foreground uppercase">
                           {task.assigned_to_name.substring(0, 2)}
                         </div>
                         <span className="text-[11px] font-semibold text-muted-foreground">{task.assigned_to_name}</span>
                       </div>
                    )}
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/40 pt-3">
                      {getPriorityBadge(task.priority)}
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {task.due_date ? new Date(task.due_date).toLocaleDateString('fr-FR').substring(0, 5) : '--/--'}
                      </span>
                    </div>
                  </button>
                </div>
              ))}
              {columnTasks.length === 0 && (
                <div className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-colors ${isOver ? 'border-primary/40 bg-primary/5 text-primary' : 'border-border/60 bg-transparent text-muted-foreground'}`}>
                  <Plus className={`mb-2 h-6 w-6 ${isOver ? 'text-primary' : 'text-muted-foreground/50'}`} />
                  <p className="text-xs font-semibold">{isOver ? 'Déposer ici' : 'Vide'}</p>
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function CalendarView({
  tasks,
  onOpen,
  onReschedule,
  canReschedule,
  error,
  showAssignee,
}: {
  tasks: Task[]
  onOpen: (task: Task) => void
  onReschedule: (task: Task, dueDate: string) => void
  canReschedule: (task: Task) => boolean
  error?: string
  showAssignee: boolean
}) {
  const [month, setMonth] = useState(() => {
    const firstDate = tasks.find((task) => task.due_date)?.due_date
    return firstDate ? parseISO(firstDate) : new Date()
  })
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const monthStart = startOfMonth(month)
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })
  const datedTasks = tasks.filter((task) => task.due_date)
  const undatedTasks = tasks.filter((task) => !task.due_date)
  const grouped = datedTasks.reduce<Record<string, Task[]>>((groups, task) => {
    const key = task.due_date!
    groups[key] = [...(groups[key] || []), task]
    return groups
  }, {})

  const dropOn = (date: string) => {
    if (draggedTask && draggedTask.due_date !== date) onReschedule(draggedTask, date)
    setDraggedTask(null)
    setHoveredDate(null)
  }

  return (
    <div className="space-y-5">
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="text-lg font-black capitalize text-slate-950">{format(month, 'MMMM yyyy', { locale: fr })}</h3><p className="text-xs text-slate-500">Glissez une tâche sur un jour pour modifier son échéance.</p></div>
          <div className="flex items-center rounded-xl border border-slate-200 p-1">
            <button type="button" onClick={() => setMonth((date) => subMonths(date, 1))} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Mois précédent"><ArrowLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => setMonth(new Date())} className="px-3 text-xs font-bold text-indigo-600">Aujourd’hui</button>
            <button type="button" onClick={() => setMonth((date) => addMonths(date, 1))} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Mois suivant"><ArrowRight className="h-4 w-4" /></button>
          </div>
        </header>
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => <div key={day} className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">{day}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const dayTasks = grouped[key] || []
                const hours = dayTasks.reduce((sum, task) => sum + Number(task.estimated_hours || 1), 0)
                const isHovered = hoveredDate === key
                return (
                  <div
                    key={key}
                    onDragOver={(event) => { event.preventDefault(); setHoveredDate(key) }}
                    onDragLeave={() => setHoveredDate(null)}
                    onDrop={() => dropOn(key)}
                    className={`h-40 flex flex-col border-b border-r border-slate-100 p-2 transition-colors ${!isSameMonth(day, month) ? 'bg-slate-50/70' : ''} ${isHovered ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-400' : ''}`}
                  >
                    <div className="mb-2 flex shrink-0 items-center justify-between">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isToday(day) ? 'bg-indigo-600 text-white' : isSameMonth(day, month) ? 'text-slate-700' : 'text-slate-300'}`}>{format(day, 'd')}</span>
                      {hours > 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${hours > 8 ? 'bg-rose-100 text-rose-700' : hours >= 6 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{hours} h</span>}
                    </div>
                    <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
                      {dayTasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          draggable={canReschedule(task)}
                          onDragStart={() => setDraggedTask(task)}
                          onDragEnd={() => { setDraggedTask(null); setHoveredDate(null) }}
                          onClick={() => onOpen(task)}
                          className={`w-full truncate rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold shadow-sm ${task.status === 'completed' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : task.priority === 'urgent' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700'} ${canReschedule(task) ? 'cursor-grab active:cursor-grabbing' : ''}`}
                        >
                          {task.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {undatedTasks.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3"><h3 className="font-bold text-slate-900">À planifier</h3><p className="text-xs text-slate-500">Ces tâches n’ont pas encore d’échéance.</p></div>
          <div className="grid gap-2 lg:grid-cols-2">
            {undatedTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                <button type="button" onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-bold text-slate-800">{task.title}</p><p className="text-xs text-slate-400">{task.estimated_hours || 1} h{showAssignee ? ` · ${task.assigned_to_name || 'Non assignée'}` : ''}</p></button>
                {canReschedule(task) && <input type="date" aria-label={`Planifier ${task.title}`} onChange={(event) => event.target.value && onReschedule(task, event.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-xs" />}
              </div>
            ))}
          </div>
        </section>
      )}
      {tasks.length === 0 && <p className="py-12 text-center text-sm text-slate-400">Aucune tâche à afficher dans le calendrier.</p>}
    </div>
  )
}
