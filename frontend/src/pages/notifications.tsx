import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { notificationsService } from '@/services/notifications'
import type { Notification } from '@/domain/types'
import { AlertTriangle, Bell, CalendarClock, Check, CheckCheck, ArrowLeft } from 'lucide-react'
import { requireCompanyMember } from '@/router/auth'
import { ErrorState } from '@/components/ui/ErrorState'
import { Modal } from '@/components/ui/Modal'
import { useSmartBack } from '@/utils/navigation'

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
    queryFn: () => notificationsService.list()
  })

  const { data: unreadCount } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: () => notificationsService.getUnreadCount()
  })

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationsService.markAsRead(id),
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
    }
  })

  const visibleNotifications = notifications?.filter((notification) => {
    if (filter === 'unread') return !notification.is_read
    if (filter === 'action') {
      return ['approval_requested', 'task_due_soon', 'task_overdue', 'payment_failed', 'subscription_suspended'].includes(notification.type)
    }
    return true
  })

  const openNotification = (notification: Notification) => {
    if (!notification.is_read) markAsReadMutation.mutate(Number(notification.id))
    setSelectedNotification(notification)
  }

  const handleAction = () => {
    if (selectedNotification?.task) {
      setSelectedNotification(null)
      navigate({ to: '/tasks/$taskId', params: { taskId: String(selectedNotification.task) } })
    }
  }

  return (
    <Layout title="Notifications">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-4">
        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900" onClick={goBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold text-gray-900">Centre de notifications</h2>
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
            <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${filter === value ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
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
                isMarking={markAsReadMutation.isPending}
              />
            ))}
            {visibleNotifications?.length === 0 && (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucune notification</p>
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
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
          })}
        >
          <div className="space-y-6">
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {selectedNotification.message}
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-border/50">
              <Button type="button" variant="secondary" onClick={() => setSelectedNotification(null)}>
                Fermer
              </Button>
              {selectedNotification.task && (
                <Button type="button" onClick={handleAction}>
                  Voir la tâche associée
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

function NotificationCard({ notification, onMarkAsRead, onOpen, isMarking }: { notification: Notification; onMarkAsRead: () => void; onOpen: () => void; isMarking: boolean }) {
  const requiresAction = ['approval_requested', 'task_overdue', 'payment_failed', 'subscription_suspended'].includes(notification.type)
  const isReminder = notification.type === 'task_due_soon'
  return (
    <Card className={`transition-colors ${requiresAction ? 'border-rose-200 bg-rose-50/50' : !notification.is_read ? 'bg-blue-50 border-blue-200' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <button type="button" onClick={onOpen} className="flex flex-1 items-start gap-3 text-left group">
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${requiresAction ? 'bg-rose-100 text-rose-600' : isReminder ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
              {requiresAction ? <AlertTriangle className="h-4 w-4" /> : isReminder ? <CalendarClock className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </span>
            <span className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{notification.title}</h3>
              {!notification.is_read && (
                <Badge variant="info" className="text-xs">Nouveau</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
            <p className="text-xs text-gray-400">
              {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            {notification.task && <span className="mt-2 block text-xs font-semibold text-indigo-600">Ouvrir la tâche →</span>}
            </span>
          </button>
          {!notification.is_read && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAsRead}
              disabled={isMarking}
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
