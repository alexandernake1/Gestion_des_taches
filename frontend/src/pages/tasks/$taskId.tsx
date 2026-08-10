import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TaskForm } from '@/components/tasks/TaskForm'
import { tasksService } from '@/services/tasks'
import { authService } from '@/services/auth'
import { teamsService } from '@/services/teams'
import type { Task, TaskAttachment, TaskCreateRequest, Status, Priority } from '@/domain/types'
import { ArrowLeft, Calendar, CalendarClock, Clock, Copy, Edit, FileText, GitBranch, LayoutTemplate, ListChecks, MessageSquare, Paperclip, Plus, Trash2, User } from 'lucide-react'
import { useState } from 'react'
import { requireCompanyMember } from '@/router/auth'
import { ErrorState } from '@/components/ui/ErrorState'
import { TaskActivityFeed } from '@/components/tasks/TaskActivityFeed'
import { useSmartBack } from '@/utils/navigation'

export const Route = createFileRoute('/tasks/$taskId')({
  beforeLoad: requireCompanyMember,
  component: TaskDetailPage,
})

function TaskDetailPage() {
  const { taskId } = Route.useParams()
  const navigate = useNavigate()
  const goBack = useSmartBack('/tasks')
  const queryClient = useQueryClient()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'structure' | 'activity' | 'attachments' | 'reports'>('structure')

  const { data: task, isLoading, isError, refetch } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksService.get(Number(taskId))
  })
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
  })



  const { data: comments = [] } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => tasksService.getComments(Number(taskId)),
  })

  const { data: attachments = [] } = useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: () => tasksService.getAttachments(Number(taskId)),
  })

  const { data: history = [] } = useQuery({
    queryKey: ['task-history', taskId],
    queryFn: () => tasksService.getHistory(Number(taskId)),
  })

  const { data: reports = [] } = useQuery({
    queryKey: ['task-reports', taskId],
    queryFn: () => tasksService.getReports(Number(taskId)),
  })
  const { data: subtasks = [] } = useQuery({
    queryKey: ['task-subtasks', taskId],
    queryFn: () => tasksService.list({ parent: Number(taskId) }),
  })
  const { data: candidateTasks = [] } = useQuery({
    queryKey: ['tasks', 'dependency-candidates', currentUser?.role],
    queryFn: () => tasksService.list({ scope: currentUser?.role === 'employee' ? 'team' : 'all' }),
  })
  const { data: currentTeam } = useQuery({
    queryKey: ['team', task?.team],
    queryFn: () => teamsService.get(Number(task?.team)),
    enabled: !!task?.team,
  })

  const deleteMutation = useMutation({
    mutationFn: () => tasksService.delete(parseInt(taskId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      navigate({ to: '/tasks' })
    }
  })
  const attachmentMutation = useMutation({
    mutationFn: (file: File) => tasksService.uploadAttachment(Number(taskId), file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] }),
  })

  const downloadAttachmentMutation = useMutation({
    mutationFn: async (attachment: TaskAttachment) => {
      const blob = await tasksService.downloadAttachment(
        parseInt(taskId),
        Number(attachment.id),
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.filename
      link.click()
      URL.revokeObjectURL(url)
    },
  })
  const reportMutation = useMutation({
    mutationFn: (data: { new_due_date: string; reason: string }) => tasksService.createReport(Number(taskId), data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task-reports', taskId] }),
  })
  const duplicateMutation = useMutation({
    mutationFn: () => tasksService.duplicate(Number(taskId)),
    onSuccess: (copy) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      navigate({ to: '/tasks/$taskId', params: { taskId: String(copy.id) } })
    },
  })
  const createSubtaskMutation = useMutation({
    mutationFn: (data: { title: string, assigned_to?: number }) => tasksService.create({
      title: data.title,
      parent: Number(taskId),
      priority: task?.priority || 'normal',
      status: 'todo',
      assigned_to: data.assigned_to,
      team: task?.team,
      due_date: task?.due_date,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-subtasks', taskId] })
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    },
  })
  const dependenciesMutation = useMutation({
    mutationFn: (dependencies: number[]) => tasksService.update(Number(taskId), { dependencies }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', taskId] }),
  })
  const saveTemplateMutation = useMutation({
    mutationFn: ({ name, is_shared }: { name: string; is_shared?: boolean }) => tasksService.saveAsTemplate(Number(taskId), name, is_shared),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task-templates'] }),
  })

  const getStatusBadge = (status: Status) => {
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
      on_hold: 'En attente',
      deferred: 'Reportée',
      completed: 'Complétée'
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

  if (isLoading) {
    return (
      <Layout title="Détails de la tâche">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    )
  }

  if (isError) {
    return (
      <Layout title="Détails de la tâche">
        <div className="p-6">
          <ErrorState
            message="Impossible de charger cette tâche."
            onRetry={() => refetch()}
          />
        </div>
      </Layout>
    )
  }

  if (!task) {
    return (
      <Layout title="Détails de la tâche">
        <div className="p-6">
          <p className="text-gray-500">Tâche non trouvée</p>
        </div>
      </Layout>
    )
  }
  const canManageTask = (
    currentUser?.role === 'owner' ||
    currentUser?.role === 'manager' ||
    String(task.creator) === String(currentUser?.id)
  )

  const canCreateSubtask = canManageTask || String(task.team_leader_id) === String(currentUser?.id)

  return (
    <Layout title="Détails de la tâche">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" className="text-slate-500 hover:text-slate-900" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm mb-6">
          <div className="border-b border-slate-100 bg-slate-50/50 p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  {getStatusBadge(task.status)}
                  {getPriorityBadge(task.priority)}
                </div>
                <h1 className="text-2xl font-black text-slate-900 sm:text-3xl mb-3 tracking-tight">{task.title}</h1>
                {task.description && (
                  <p className="max-w-4xl text-sm leading-relaxed text-slate-600">{task.description}</p>
                )}
              </div>
              
              {canManageTask && (
                <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end lg:gap-3 shrink-0">
                  <Button className="w-full lg:w-auto shadow-md hover:shadow-lg transition-shadow bg-indigo-600 hover:bg-indigo-700" onClick={() => setIsEditModalOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier la tâche
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="bg-white" onClick={() => {
                      const name = window.prompt('Nom du modèle réutilisable :', task.title)
                      if (name?.trim()) {
                        let isShared = false
                        if (currentUser?.role !== 'employee') {
                          isShared = window.confirm('Souhaitez-vous partager ce modèle avec TOUTE l\'entreprise ?\n\nCliquez sur [OK] pour partager avec l\'entreprise, ou [Annuler] pour créer un modèle personnel.')
                        }
                        saveTemplateMutation.mutate({ name: name.trim(), is_shared: isShared })
                      }
                    }} disabled={saveTemplateMutation.isPending}>
                      <LayoutTemplate className="mr-2 h-4 w-4 text-indigo-500" />Modèle
                    </Button>
                    <Button variant="secondary" className="bg-white" onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending}>
                      <Copy className="mr-2 h-4 w-4 text-indigo-500" />Dupliquer
                    </Button>
                  </div>
                  <Button variant="ghost" className="text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => window.confirm('Archiver cette tâche ? Elle ne figurera plus dans les listes actives.') && deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Archiver
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6 sm:p-8">
            {task.is_blocked && (
              <div className="mb-8 flex items-start gap-4 rounded-2xl border-2 border-rose-100 bg-rose-50/50 p-5 shadow-inner">
                <div className="rounded-full bg-rose-100 p-2">
                  <GitBranch className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <strong className="text-rose-900 text-lg">Tâche bloquée</strong>
                  <p className="mt-1 text-sm text-rose-700">Terminez les dépendances et toutes les sous-tâches avant de clôturer cette tâche.</p>
                </div>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" /> Assigné à
                </h3>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 uppercase">
                    {task.assigned_to_name ? task.assigned_to_name.substring(0, 2) : '?'}
                  </div>
                  <p className="font-semibold text-slate-900">{task.assigned_to_name || 'Non assigné'}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" /> Échéance
                </h3>
                <p className="font-semibold text-slate-900">
                  {task.due_date ? new Date(task.due_date).toLocaleDateString('fr-FR') : 'Non définie'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" /> Début
                </h3>
                <p className="font-semibold text-slate-900">
                  {task.start_date ? new Date(task.start_date).toLocaleDateString('fr-FR') : 'Non définie'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" /> Équipe
                </h3>
                <p className="font-semibold text-slate-900">{task.team_name || 'Non assignée'}</p>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-4 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                Créé le {new Date(task.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
              {task.updated_at !== task.created_at && (
                <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                  Mis à jour le {new Date(task.updated_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              )}
            </div>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2">
            {[
              { id: 'structure', label: 'Structure', count: subtasks.length + (task.dependencies?.length || 0), icon: ListChecks },
              { id: 'activity', label: 'Activité', count: comments.length + history.length, icon: MessageSquare },
              { id: 'attachments', label: 'Documents', count: attachments.length, icon: Paperclip },
              { id: 'reports', label: 'Reports', count: reports.length, icon: CalendarClock },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] shadow-sm">{tab.count}</span>
              </button>
            ))}
          </div>
          <CardContent>
            {activeTab === 'structure' && (
              <div className="grid gap-6 lg:grid-cols-2">
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <div><h3 className="font-bold text-slate-900">Sous-tâches</h3><p className="text-xs text-slate-500">Progression : {task.progress_percent || 0}%</p></div>
                    <span className="text-xs font-semibold text-slate-500">{subtasks.filter((item) => item.status === 'completed').length}/{subtasks.length}</span>
                  </div>
                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${task.progress_percent || 0}%` }} /></div>
                  {canCreateSubtask && (
                    <form className="mb-3 flex flex-col sm:flex-row gap-2" onSubmit={(event) => {
                      event.preventDefault()
                      const form = event.currentTarget
                      const title = new FormData(form).get('title') as string
                      const assigned_to = new FormData(form).get('assigned_to') as string
                      if (title.trim()) createSubtaskMutation.mutate({ title: title.trim(), assigned_to: assigned_to ? Number(assigned_to) : undefined })
                      form.reset()
                    }}>
                      <input name="title" required placeholder="Ajouter une sous-tâche…" className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm" />
                      <select name="assigned_to" className="h-10 rounded-xl border border-slate-200 px-3 text-sm min-w-[150px]">
                        <option value="">Assigner à...</option>
                        {currentTeam?.member_details?.map(member => (
                          <option key={member.id} value={member.id}>{member.full_name}</option>
                        ))}
                      </select>
                      <Button type="submit" disabled={createSubtaskMutation.isPending}><Plus className="h-4 w-4" /></Button>
                    </form>
                  )}
                  <div className="space-y-2">
                    {subtasks.map((subtask) => (
                      <button key={subtask.id} type="button" onClick={() => navigate({ to: '/tasks/$taskId', params: { taskId: String(subtask.id) } })} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-left hover:border-indigo-200">
                        <span className="truncate text-sm font-semibold text-slate-700">{subtask.title}</span>{getStatusBadge(subtask.status)}
                      </button>
                    ))}
                    {subtasks.length === 0 && <p className="rounded-xl bg-slate-50 py-6 text-center text-sm text-slate-400">Aucune sous-tâche.</p>}
                  </div>
                </section>
                <section>
                  <div className="mb-3"><h3 className="font-bold text-slate-900">Dépendances</h3><p className="text-xs text-slate-500">Travaux à terminer avant cette tâche.</p></div>
                  {canManageTask && (
                    <form className="mb-3 flex gap-2" onSubmit={(event) => {
                      event.preventDefault()
                      const dependency = Number(new FormData(event.currentTarget).get('dependency'))
                      if (dependency && !task.dependencies?.includes(dependency)) dependenciesMutation.mutate([...(task.dependencies || []), dependency])
                    }}>
                      <select name="dependency" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm">
                        <option value="">Choisir une tâche…</option>
                        {candidateTasks
                          .filter((item) => item.id !== task.id && !task.dependencies?.includes(item.id) && item.status !== 'completed')
                          .map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                      </select>
                      <Button type="submit" variant="secondary">Ajouter</Button>
                    </form>
                  )}
                  <div className="space-y-2">
                    {task.dependency_details?.map((dependency) => (
                      <div key={dependency.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
                        <button type="button" onClick={() => navigate({ to: '/tasks/$taskId', params: { taskId: String(dependency.id) } })} className="truncate text-left text-sm font-semibold text-slate-700">{dependency.title}</button>
                        <div className="flex items-center gap-2">{getStatusBadge(dependency.status)}
                          {canManageTask && <button type="button" onClick={() => dependenciesMutation.mutate((task.dependencies || []).filter((id) => id !== dependency.id))} className="text-xs font-bold text-rose-500">Retirer</button>}
                        </div>
                      </div>
                    ))}
                    {!task.dependency_details?.length && <p className="rounded-xl bg-slate-50 py-6 text-center text-sm text-slate-400">Aucune dépendance.</p>}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="pt-2">
                <TaskActivityFeed 
                  taskId={Number(taskId)} 
                  history={history} 
                  comments={comments} 
                  currentUserId={currentUser?.id} 
                />
              </div>
            )}

            {activeTab === 'attachments' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="col-span-full flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 p-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
                  {attachmentMutation.isPending ? 'Envoi en cours…' : 'Ajouter un document'}
                  <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg" className="sr-only" disabled={attachmentMutation.isPending} onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) attachmentMutation.mutate(file)
                    event.target.value = ''
                  }} />
                </label>
                {attachmentMutation.isError && <p className="col-span-full text-sm text-rose-600">Impossible d’envoyer ce document.</p>}
                {attachments.map((attachment) => (
                  <button key={attachment.id} type="button" onClick={() => downloadAttachmentMutation.mutate(attachment)} disabled={downloadAttachmentMutation.isPending} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/40 disabled:opacity-60">
                    <div className="rounded-xl bg-indigo-50 p-2.5"><FileText className="h-5 w-5 text-indigo-600" /></div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{attachment.filename}</p>
                      <p className="text-xs text-slate-400">{Math.max(1, Math.round(attachment.file_size / 1024))} Ko</p>
                    </div>
                  </button>
                ))}
                {attachments.length === 0 && <EmptyTab icon={Paperclip} label="Aucun document joint." />}
              </div>
            )}



            {activeTab === 'reports' && (
              <div className="space-y-3">
                {task.due_date ? (
                  <form className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4" onSubmit={(event) => {
                    event.preventDefault()
                    const data = new FormData(event.currentTarget)
                    reportMutation.mutate({
                      new_due_date: data.get('new_due_date') as string,
                      reason: data.get('reason') as string,
                    })
                    event.currentTarget.reset()
                  }}>
                    <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto]">
                      <input name="new_due_date" type="date" required aria-label="Nouvelle date d'échéance" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      <input name="reason" required placeholder="Motif de la demande…" aria-label="Motif du report" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      <Button type="submit" disabled={reportMutation.isPending}>Demander</Button>
                    </div>
                    {reportMutation.isError && <p className="mt-2 text-sm text-rose-600">Impossible d'envoyer la demande.</p>}
                  </form>
                ) : (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-700">
                    ⚠️ Cette tâche n'a pas de date d'échéance. Définissez une date d'échéance avant de demander un report.
                  </div>
                )}
                {reports.map((report) => (
                  <div key={report.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Nouvelle échéance : {new Date(report.new_due_date).toLocaleDateString('fr-FR')}</p>
                        {report.old_due_date && (
                          <p className="mt-0.5 text-xs text-slate-400">Ancienne échéance : {new Date(report.old_due_date).toLocaleDateString('fr-FR')}</p>
                        )}
                      </div>
                      <Badge variant={report.status === 'approved' ? 'success' : report.status === 'rejected' ? 'danger' : 'warning'}>{report.status === 'approved' ? 'Approuvé' : report.status === 'rejected' ? 'Refusé' : 'En attente'}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{report.reason}</p>
                  </div>
                ))}
                {reports.length === 0 && <EmptyTab icon={CalendarClock} label="Aucune demande de report." />}
              </div>
            )}
          </CardContent>
        </Card>

        {isEditModalOpen && (
          <EditTaskModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            task={task}
            canAssign={currentUser?.role === 'owner' || currentUser?.role === 'manager'}
            onSuccess={() => {
              setIsEditModalOpen(false)
              queryClient.invalidateQueries({ queryKey: ['task', taskId] })
              queryClient.invalidateQueries({ queryKey: ['tasks'] })
            }}
          />
        )}
      </div>
    </Layout>
  )
}

function EmptyTab({ icon: Icon, label }: { icon: typeof Calendar; label: string }) {
  return (
    <div className="col-span-full py-10 text-center">
      <Icon className="mx-auto mb-3 h-8 w-8 text-slate-300" />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  )
}

function EditTaskModal({ isOpen, onClose, task, onSuccess, canAssign }: { isOpen: boolean; onClose: () => void; task: Task; onSuccess: () => void; canAssign: boolean }) {
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => authService.list(),
    enabled: canAssign,
  })

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsService.list,
    enabled: canAssign,
  })

  const mutation = useMutation({
    mutationFn: (data: TaskCreateRequest) => tasksService.update(task.id, data),
    onSuccess
  })

  const initialData = {
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    assigned_to: task.assigned_to,
    team: task.team,
    start_date: task.start_date,
    due_date: task.due_date,
    recurrence_frequency: task.recurrence_frequency,
    recurrence_interval: task.recurrence_interval,
    recurrence_end_date: task.recurrence_end_date,
    estimated_hours: task.estimated_hours,
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifier la tâche" size="md">
      <TaskForm
        initialData={initialData}
        isEdit={true}
        onSubmit={mutation.mutate}
        onCancel={onClose}
        users={users}
        teams={teams}
        canAssign={canAssign}
        isSubmitting={mutation.isPending}
        error={mutation.isError ? (mutation.error instanceof Error ? mutation.error.message : 'Modification impossible.') : undefined}
      />
    </Modal>
  )
}
