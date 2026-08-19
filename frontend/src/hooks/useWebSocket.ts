import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { playNotificationSound, sendDesktopNotification } from '@/utils/notifications'

export function notificationWebSocketUrl(location: { protocol: string; host: string } = window.location) {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${location.host}/ws/notifications/`
}

export function useWebSocket() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const ws = useRef<WebSocket | null>(null)

  useEffect(() => {
    let stopped = false
    let attempt = 0
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (stopped) return

      const wsUrl = notificationWebSocketUrl()

      try {
        ws.current = new WebSocket(wsUrl)
      } catch (err) {
        console.error('Failed to construct WebSocket', err)
        return
      }

      ws.current.onopen = () => {
        attempt = 0
        console.log('WebSocket connected')
      }

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'notification') {
            const notif = message.data || {}
            const title = notif.title || 'Nouvelle notification'
            const body = notif.message || 'Vous avez reçu une nouvelle mise à jour.'
            const taskId = notif.task

            // 1. Invalidate React Query caches
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            queryClient.invalidateQueries({ queryKey: ['unreadCount'] })

            // 2. Play subtle SaaS audio chime
            playNotificationSound()

            // 3. Navigation handler
            const handleNavigate = () => {
              if (taskId) {
                navigate({ to: '/tasks/$taskId', params: { taskId: String(taskId) } })
              } else {
                navigate({ to: '/notifications' })
              }
            }

            // 4. Trigger Live In-App Toast
            const isStartable = Boolean(taskId && ['task_due_soon', 'task_overdue', 'new_assignment', 'new_task'].includes(notif.type))
            const toastOptions = {
              description: body,
              duration: 6000,
              action: {
                label: isStartable ? 'Commencer la tâche' : (taskId ? 'Voir la tâche' : 'Consulter'),
                onClick: handleNavigate,
              },
            }

            if (['task_overdue', 'payment_failed', 'subscription_suspended'].includes(notif.type)) {
              toast.error(title, toastOptions)
            } else if (['task_due_soon', 'on_hold', 'report_rejected'].includes(notif.type)) {
              toast.warning(title, toastOptions)
            } else if (['task_completed', 'report_approved', 'payment_succeeded'].includes(notif.type)) {
              toast.success(title, toastOptions)
            } else {
              toast.info(title, toastOptions)
            }

            // 5. Send Desktop OS Push Notification if tab is in background
            sendDesktopNotification(title, body, handleNavigate)
          }
        } catch (error) {
          console.error('Error parsing websocket notification', error)
        }
      }

      ws.current.onclose = () => {
        if (stopped) return
        const delay = Math.min(1000 * 2 ** attempt, 30000)
        attempt += 1
        console.log(`WebSocket disconnected, reconnecting in ${delay / 1000}s...`)
        reconnectTimer = setTimeout(() => void connect(), delay)
      }
    }

    void connect()

    return () => {
      stopped = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws.current) {
        ws.current.onclose = null
        ws.current.close()
      }
    }
  }, [queryClient, navigate])
}
