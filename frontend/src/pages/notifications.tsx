import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { notificationsService } from '@/services/notifications'
import { tasksService } from '@/services/tasks'
import type { Notification } from '@/domain/types'
import { AlertTriangle, Bell, CalendarClock, Check, CheckCheck, ArrowLeft, Play, ExternalLink, ArrowRight } from 'lucide-react'
import { requireCompanyMember } from '@/router/auth'
import { ErrorState } from '@/components/ui/ErrorState'
import { Modal } from '@/components/ui/Modal'
import { useSmartBack } from '@/utils/navigation'
import { toast } from 'sonner'

export const Route = createFileRoute('/notifications')({
  beforeLoad: requireCompanyMember,
  component: NotificationsPage,
})

function NotificationsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const goBack = useSmartBack('/dashboard')
  const [filter, setFilter] = useState<'all' | 'unread' | 'action'>('all')
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  const { data: notifications, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.list(),
  })

  const { data: unreadCount } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: () => notificationsService.getUnreadCount(),
  })

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
      toast.success('Toutes les notifications ont été marquées comme lues.')
    },
  })

  const startTaskMutation = useMutation({
    mutationFn: async ({ taskId, notifId, alreadyInProgress }: { taskId: number; notifId?: string | number; alreadyInProgress?: boolean }) => {
      if (!alreadyInProgress) {
        await tasksService.update(taskId, { status: 'in_progress' })
      }
      if (notifId) {
        try {
          await notificationsService.markAsRead(Number(notifId))
        } catch {
          // ignore read error
        }
      }
      return { taskId, alreadyInProgress }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task', String(result.taskId)] })
      queryClient.invalidateQueries({ queryKey: ['company-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['user-dashboard'] })
      if (!result.alreadyInProgress) {
        toast.success('Tâche démarrée ! Statut passé à « En cours ».')
      }
      setSelectedNotification(null)
      navigate({ to: '/tasks/$taskId', params: { taskId: String(result.taskId) } })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Impossible de démarrer la tâche.')
    },
  })

  const visibleNotifications = notifications?.filter((notification) => {
    if (filter === 'unread') return !notification.is_read
    if (filter === 'action') {
      return ['approval_requested', 'task_due_soon', 'task_overdue', 'payment_failed', 'subscription_suspended', 'new_assignment'].includes(notification.type)
    }
    return true
  })

  const openNotification = (notification: Notification) => {
    if (!notification.is_read) markAsReadMutation.mutate(Number(notification.id))
    setSelectedNotification(notification)
  }

  const handleOpenTask = (taskId: number) => {
    setSelectedNotification(null)
    navigate({ to: '/tasks/$taskId', params: { taskId: String(taskId) } })
  }

  return (
    <Layout title="Notifications">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-4">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={goBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-foreground">Centre de notifications</h1>
            {unreadCount && unreadCount.count > 0 && (
              <Badge variant="danger">{unreadCount.count} non lue{unreadCount.count > 1 ? 's' : ''}</Badge>
            )}
          </div>
          {unreadCount && unreadCount.count > 0 && (
            <Button variant="secondary" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrer les notifications">
          {([
            ['all', 'Toutes'],
            ['unread', 'Non lues'],
            ['action', 'À traiter'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                filter === value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-2xl"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleNotifications?.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkAsRead={() => markAsReadMutation.mutate(Number(notification.id))}
                onOpen={() => openNotification(notification)}
                onStartTask={(taskId, alreadyInProgress) => startTaskMutation.mutate({ taskId, notifId: notification.id, alreadyInProgress })}
                onOpenTask={(taskId) => handleOpenTask(taskId)}
                isMarking={markAsReadMutation.isPending}
                isStarting={startTaskMutation.isPending}
              />
            ))}
            {visibleNotifications?.length === 0 && (
              <div className="text-center py-16 rounded-3xl border border-dashed border-border">
                <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-bold text-foreground">Aucune notification</h3>
                <p className="text-sm text-muted-foreground mt-1">Vous êtes parfaitement à jour dans vos alertes.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedNotification && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedNotification(null)}
          title={selectedNotification.title}
          size="md"
          description={new Date(selectedNotification.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        >
          <div className="space-y-6">
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 p-4 rounded-2xl border border-border/50">
              {selectedNotification.message}
            </div>

            {selectedNotification.task && selectedNotification.task_title && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Tâche concernée</p>
                  <p className="font-semibold text-foreground truncate">{selectedNotification.task_title}</p>
                </div>
                {selectedNotification.task_status && (
                  <Badge variant={selectedNotification.task_status === 'completed' ? 'success' : selectedNotification.task_status === 'in_progress' ? 'info' : 'warning'}>
                    {selectedNotification.task_status === 'completed' ? 'Terminée' : selectedNotification.task_status === 'in_progress' ? 'En cours' : 'À faire'}
                  </Badge>
                )}
              </div>
            )}
            
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-border/50">
              <Button type="button" variant="secondary" onClick={() => setSelectedNotification(null)}>
                Fermer
              </Button>
              {selectedNotification.task && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenTask(Number(selectedNotification.task))}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Consulter la tâche
                  </Button>
                  {selectedNotification.task_status !== 'completed' && (
                    <Button
                      type="button"
                      onClick={() => startTaskMutation.mutate({
                        taskId: Number(selectedNotification.task),
                        notifId: selectedNotification.id,
                        alreadyInProgress: selectedNotification.task_status === 'in_progress',
                      })}
                      disabled={startTaskMutation.isPending}
                      className="bg-primary text-primary-foreground font-semibold shadow-sm"
                    >
                      {selectedNotification.task_status === 'in_progress' ? (
                        <>
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Continuer la tâche
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2 fill-current" />
                          Commencer la tâche
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

function NotificationCard({
  notification,
  onMarkAsRead,
  onOpen,
  onStartTask,
  onOpenTask,
  isMarking,
  isStarting,
}: {
  notification: Notification
  onMarkAsRead: () => void
  onOpen: () => void
  onStartTask: (taskId: number, alreadyInProgress?: boolean) => void
  onOpenTask: (taskId: number) => void
  isMarking: boolean
  isStarting: boolean
}) {
  const requiresAction = ['approval_requested', 'task_overdue', 'payment_failed', 'subscription_suspended'].includes(notification.type)
  const isReminder = notification.type === 'task_due_soon'
  const isAssignment = notification.type === 'new_assignment' || notification.type === 'new_task'
  const hasTask = Boolean(notification.task)
  const isInProgress = notification.task_status === 'in_progress'
  const isCompleted = notification.task_status === 'completed'

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-card ${
        requiresAction
          ? 'border-destructive/30 bg-destructive/5'
          : isReminder
            ? 'border-amber-500/30 bg-amber-500/5'
            : !notification.is_read
              ? 'border-primary/30 bg-primary/5'
              : 'border-border bg-card'
      }`}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <button type="button" onClick={onOpen} className="flex flex-1 items-start gap-3 text-left group">
            <span
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 shadow-sm ${
                requiresAction
                  ? 'bg-destructive/15 text-destructive'
                  : isReminder
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : isAssignment
                      ? 'bg-primary/15 text-primary'
                      : 'bg-primary/10 text-primary'
              }`}
            >
              {requiresAction ? (
                <AlertTriangle className="h-5 w-5" />
              ) : isReminder ? (
                <CalendarClock className="h-5 w-5" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                  {notification.title}
                </h3>
                {!notification.is_read && (
                  <Badge variant="info" className="text-[10px] uppercase font-bold tracking-wider">Nouveau</Badge>
                )}
                {notification.task_title && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    · {notification.task_title}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2 leading-relaxed whitespace-pre-wrap">{notification.message}</p>
              <p className="text-xs font-medium text-muted-foreground/70">
                {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </button>

          <div className="flex flex-wrap items-center sm:flex-col sm:items-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
            {hasTask && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!isCompleted ? (
                  <Button
                    size="sm"
                    className="shadow-sm font-semibold flex-1 sm:flex-initial"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStartTask(Number(notification.task), isInProgress)
                    }}
                    disabled={isStarting}
                  >
                    {isInProgress ? (
                      <>
                        <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                        Continuer
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                        Commencer la tâche
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="font-semibold flex-1 sm:flex-initial"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenTask(Number(notification.task))
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Voir la tâche
                  </Button>
                )}
              </div>
            )}

            {!notification.is_read && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkAsRead()
                }}
                disabled={isMarking}
                title="Marquer comme lu"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Marquer lu
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
