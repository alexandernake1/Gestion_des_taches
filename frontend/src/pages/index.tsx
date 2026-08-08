import { createFileRoute, redirect } from '@tanstack/react-router'
import { authService } from '@/services/auth'
import { redirectAuthenticatedUser } from '@/router/auth'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    if (!authService.isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
    await redirectAuthenticatedUser()
  },
  component: () => null,
})
