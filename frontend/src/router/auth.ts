import { redirect } from '@tanstack/react-router'
import { authService } from '@/services/auth'
import type { User } from '@/domain/types'

function authenticatedHome(user: User) {
  const impersonatedCompanyId = localStorage.getItem('impersonated_company_id')
  if (user.is_superuser && !impersonatedCompanyId) {
    return '/admin/companies'
  }
  return '/dashboard'
}

export async function requireAuthentication(): Promise<User> {
  if (!authService.isAuthenticated()) {
    throw redirect({ to: '/login' })
  }
  const user = await authService.getCurrentUser()
  if (user.must_change_password) {
    throw redirect({ to: '/change-password' })
  }
  return user
}

export async function redirectAuthenticatedUser() {
  if (!authService.isAuthenticated()) return
  const user = await authService.getCurrentUser()
  if (user.must_change_password) throw redirect({ to: '/change-password' })
  throw redirect({ to: authenticatedHome(user) })
}

export async function requireManagement() {
  const user = await requireAuthentication()
  if (user.is_superuser) {
    const impersonated = localStorage.getItem('impersonated_company_id')
    if (!impersonated) {
      throw redirect({ to: '/admin/companies' })
    }
  } else if (!user.company || user.role === 'employee') {
    throw redirect({ to: '/dashboard' })
  }
  return user
}

export async function requireCompanyMember() {
  const user = await requireAuthentication()
  if (!user.is_superuser && !user.company) {
    throw redirect({ to: '/login' })
  }
  return user
}

export async function requireOwner() {
  const user = await requireCompanyMember()
  if (!user.is_superuser && user.role !== 'owner') {
    throw redirect({ to: '/dashboard' })
  }
  return user
}

export async function requirePlatformAdmin() {
  const user = await requireAuthentication()
  if (!user.is_superuser) {
    throw redirect({ to: '/dashboard' })
  }
  return user
}
