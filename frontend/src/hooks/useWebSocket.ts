import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { playNotificationSound, sendDesktopNotification } from '@/utils/notifications'

export function useWebSocket() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const ws = useRef<WebSocket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws')
    const url = `${baseUrl}/ws/notifications/?token=${token}`

    const connect = () => {
      ws.current = new WebSocket(url)

      ws.current.onopen = () => {
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
            const toastOptions = {
              description: body,
              duration: 5000,
              action: {
                label: taskId ? 'Voir la tâche' : 'Consulter',
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
        console.log('WebSocket disconnected, attempting to reconnect in 3s...')
        setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close()
      }
    }
  }, [queryClient, navigate])
}
