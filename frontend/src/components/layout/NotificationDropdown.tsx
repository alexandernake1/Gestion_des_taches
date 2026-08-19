import { useState, useRef, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, AlertTriangle, CalendarClock, Play, ArrowRight, ExternalLink } from 'lucide-react'
import { notificationsService } from '@/services/notifications'
import { tasksService } from '@/services/tasks'
import type { Notification } from '@/domain/types'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [previousUnreadCount, setPreviousUnreadCount] = useState<number>(0)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  const { data: unreadCount } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: notificationsService.getUnreadCount,
    refetchInterval: 60_000,
  })

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsService.list,
    enabled: isOpen,
  })

  // Toast notification logic for new unread notifications
  useEffect(() => {
    if (unreadCount && unreadCount.count > previousUnreadCount && previousUnreadCount > 0) {
      toast.info('Nouvelle notification', {
        description: 'Vous avez de nouvelles notifications.',
        action: {
          label: 'Voir',
          onClick: () => navigate({ to: '/notifications' })
        }
      })
    }
    if (unreadCount) {
      setPreviousUnreadCount(unreadCount.count)
    }
  }, [unreadCount, previousUnreadCount, navigate])

  const markAsReadMutation = useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
    }
  })

  const markAllReadMutation = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
      setIsOpen(false)
      toast.success('Toutes les notifications ont été marquées comme lues.')
    }
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
          // ignore
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
      setIsOpen(false)
      navigate({ to: '/tasks/$taskId', params: { taskId: String(result.taskId) } })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Impossible de démarrer la tâche.')
    },
  })

  const handleOpenNotification = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(Number(notification.id))
    }
    setIsOpen(false)
    setSelectedNotification(notification)
  }

  const handleOpenTask = (taskId: number) => {
    setSelectedNotification(null)
    setIsOpen(false)
    navigate({ to: '/tasks/$taskId', params: { taskId: String(taskId) } })
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
          isOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Bell className="h-[18px] w-[18px]" />
        {!!unreadCount?.count && (
          <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full border-2 border-background bg-destructive px-0.5 text-[8px] font-bold text-white shadow-sm animate-in zoom-in">
            {unreadCount.count > 99 ? '99+' : unreadCount.count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-glass z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
            <h3 className="font-bold text-foreground">Notifications</h3>
            {unreadCount && unreadCount.count > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                disabled={markAllReadMutation.isPending}
              >
                Tout marquer comme lu
              </button>
            )}
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!notifications ? (
              <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Chargement...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center gap-2">
                <Bell className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Aucune notification</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {notifications.slice(0, 6).map((notification) => {
                  const requiresAction = ['approval_requested', 'task_overdue', 'payment_failed', 'subscription_suspended'].includes(notification.type)
                  const isReminder = notification.type === 'task_due_soon'
                  const isAssignment = notification.type === 'new_assignment' || notification.type === 'new_task'
                  
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleOpenNotification(notification)}
                      className={`flex items-start gap-3 w-full text-left p-3 rounded-xl transition-colors ${
                        !notification.is_read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        requiresAction ? 'bg-destructive/10 text-destructive' : 
                        isReminder ? 'bg-amber-500/10 text-amber-500' : 
                        isAssignment ? 'bg-primary/10 text-primary' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {requiresAction ? <AlertTriangle className="h-4 w-4" /> :
                         isReminder ? <CalendarClock className="h-4 w-4" /> :
                         <Bell className="h-4 w-4" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-foreground truncate">{notification.title}</p>
                          {!notification.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-muted-foreground/70">
                            {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          {notification.task && (
                            <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                              {notification.task_status === 'in_progress' ? 'Continuer →' : 'Commencer →'}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          
          <div className="border-t border-border p-2 bg-muted/30">
            <button
              onClick={() => {
                setIsOpen(false)
                navigate({ to: '/notifications' })
              }}
              className="w-full rounded-xl py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors text-center"
            >
              Voir toutes les notifications
            </button>
          </div>
        </div>
      )}

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
    </div>
  )
}
