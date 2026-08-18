import { Bell, Building2, ClipboardCheck, FolderKanban, CheckSquare2, CreditCard, Globe, LayoutDashboard, LogOut, Shield, UserRound, Users, X, Package, Megaphone, ChevronRight, ScrollText } from 'lucide-react'
import { Link, useLocation } from '@tanstack/react-router'
import { authService } from '@/services/auth'
import { subscriptionsService } from '@/services/subscriptions'
import { tasksService } from '@/services/tasks'
import { useQuery } from '@tanstack/react-query'
import { ROLE_LABELS } from '@/constants/labels'

interface NavigationItem {
  name: string
  href: string
  icon: React.ElementType
  roles: string[]
  companyOnly?: boolean
  personalOnly?: boolean
}

const navigation: NavigationItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'manager', 'employee'] },
  { name: 'Tâches', href: '/tasks', icon: CheckSquare2, roles: ['owner', 'manager', 'employee'] },
  { name: 'Projets', href: '/projects', icon: FolderKanban, roles: ['owner', 'manager', 'employee'] },
  { name: 'Validations', href: '/approvals', icon: ClipboardCheck, roles: ['owner', 'manager', 'employee'], companyOnly: true },
  { name: 'Équipes', href: '/teams', icon: Users, roles: ['owner', 'manager'], companyOnly: true },
  { name: 'Utilisateurs', href: '/users', icon: UserRound, roles: ['owner', 'manager'], companyOnly: true },
  { name: 'Abonnement', href: '/subscription', icon: CreditCard, roles: ['owner'] },
  { name: 'Créer une structure', href: '/onboarding', icon: Building2, roles: ['owner'], personalOnly: true },
  { name: 'Notifications', href: '/notifications', icon: Bell, roles: ['owner', 'manager', 'employee'] },
]

const platformNavigation = [
  { name: "Journal d'audit", href: '/admin/audit', icon: ScrollText },
  { name: 'Structures clientes', href: '/admin/companies', icon: Globe },
  { name: 'Abonnements SaaS', href: '/admin/subscriptions', icon: CreditCard },
  { name: 'Forfaits SaaS', href: '/admin/plans', icon: Package },
  { name: 'Annonces Systèmes', href: '/admin/announcements', icon: Megaphone },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
  })
  const { data: subscription } = useQuery({
    queryKey: ['mySubscription'],
    queryFn: subscriptionsService.getMySubscription,
    enabled: !!currentUser?.company && !currentUser?.is_superuser,
  })
  const hasProjectsFeature = currentUser?.is_superuser || !!subscription?.plan_details?.feature_flags?.has_projects
  const isPersonalWorkspace = Boolean(currentUser?.is_personal_workspace)
  const impersonatedCompanyId = localStorage.getItem('impersonated_company_id')
  const hasCompany = (!!currentUser?.company && !currentUser?.is_superuser) || (currentUser?.is_superuser && !!impersonatedCompanyId)
  const canReviewApprovals = Boolean(
    !isPersonalWorkspace && (currentUser?.is_superuser || currentUser?.role === 'owner' || currentUser?.role === 'manager'),
  )
  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['sidebar-pending-approvals'],
    queryFn: () => tasksService.getApprovals({ status: 'pending' }),
    enabled: canReviewApprovals && hasCompany,
    refetchInterval: 30_000,
  })
  const { data: pendingReports = [] } = useQuery({
    queryKey: ['sidebar-pending-reports'],
    queryFn: () => tasksService.getPendingReports({ status: 'pending' }),
    enabled: canReviewApprovals && hasCompany,
    refetchInterval: 30_000,
  })
  const pendingValidationCount = pendingApprovals.length + pendingReports.length
  const visibleNavigation = navigation.filter((item) => {
    if (!hasCompany || !currentUser) return false
    if (!item.roles.includes(currentUser.role) && !currentUser.is_superuser) return false
    if (item.companyOnly && isPersonalWorkspace) return false
    if (item.personalOnly && !isPersonalWorkspace) return false
    if (item.href === '/projects' && !hasProjectsFeature) return false
    return true
  })
  const navigationLabel = (item: (typeof navigation)[number]) => {
    if (item.href === '/tasks') {
      return isPersonalWorkspace || currentUser?.role === 'employee' ? 'Mes tâches' : 'Pilotage des tâches'
    }
    if (item.href === '/users' && currentUser?.role === 'manager') {
      return 'Collaborateurs'
    }
    return item.name
  }

  const handleLogout = async () => {
    await authService.logout()
    // Full page reload ensures the React Query cache and application state 
    // are completely cleared before the next user logs in.
    window.location.assign('/login')
  }

  const displayName = currentUser?.full_name || currentUser?.email || 'Utilisateur'
  const roleLabel = currentUser?.is_superuser
    ? 'Super-administrateur de la plateforme'
    : isPersonalWorkspace
      ? 'Compte personnel'
      : (ROLE_LABELS[currentUser?.role || ''] || currentUser?.role_display || '')

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden animate-fade-in"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col transition-transform duration-300 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'hsl(var(--sidebar-bg))' }}
      >
        {/* Inner border on right */}
        <div
          className="absolute inset-y-0 right-0 w-px"
          style={{ background: 'hsl(var(--sidebar-border))' }}
        />

        {/* Ambient glow top */}
        <div
          className="pointer-events-none absolute -top-32 -left-16 h-64 w-64 rounded-full blur-3xl opacity-20"
          style={{ background: 'hsl(var(--primary))' }}
        />

        {/* ── Header ──────────────────────────────────── */}
        <div
          className="relative flex h-[72px] shrink-0 items-center justify-between px-5"
          style={{ borderBottom: '1px solid hsl(var(--sidebar-border))' }}
        >
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-cta"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
              }}
            >
              <CheckSquare2 className="h-5 w-5 text-white" />
            </div>

            <div>
              <span className="text-[15px] font-black tracking-tight text-white">
                Activity<span style={{ color: 'hsl(var(--primary))' }}>Control</span>
              </span>
              <p
                className="text-[10px] font-semibold tracking-wider uppercase"
                style={{ color: 'hsl(var(--sidebar-text-muted))' }}
              >
                Pilotage d'activité
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg lg:hidden transition-colors"
            style={{ color: 'hsl(var(--sidebar-text-muted))' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Navigation Lists ────────────────────────── */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scrollbar-thin">
          {/* Admin Platform section */}
          {currentUser?.is_superuser && (
            <div className="animate-slide-up">
              <div className="mb-2 flex items-center gap-1.5 px-3">
                <Shield className="h-3.5 w-3.5 text-amber-500" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500">
                  Administration Plateforme
                </p>
              </div>
              <ul className="space-y-0.5">
                {platformNavigation.map((item, i) => {
                  const isActive = location.pathname === item.href
                  return (
                    <NavItem
                      key={item.name}
                      item={item}
                      isActive={isActive}
                      onClose={onClose}
                      label={item.name}
                      delay={i * 40}
                      variant="admin"
                    />
                  )
                })}
              </ul>
            </div>
          )}

          {/* Workspace section */}
          {visibleNavigation.length > 0 && (
            <div className="animate-slide-up" style={{ animationDelay: '60ms' }}>
              <p
                className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: 'hsl(var(--sidebar-text-muted))' }}
              >
                Espace de travail
              </p>
              <ul className="space-y-0.5">
                {visibleNavigation.map((item, i) => {
                  const isActive = location.pathname === item.href
                  return (
                    <NavItem
                      key={item.name}
                      item={item}
                      isActive={isActive}
                      onClose={onClose}
                      label={navigationLabel(item)}
                      badgeCount={item.href === '/approvals' && canReviewApprovals ? pendingValidationCount : undefined}
                      delay={i * 40}
                      variant="default"
                    />
                  )
                })}
              </ul>
            </div>
          )}
        </nav>

        {/* ── Footer — User + Logout ──────────────────── */}
        <div
          className="shrink-0 p-3"
          style={{ borderTop: '1px solid hsl(var(--sidebar-border))' }}
        >
          {/* User row */}
          <div
            className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ background: 'hsl(var(--sidebar-hover-bg))' }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold text-white shadow-cta"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
              }}
            >
              {getInitials(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white leading-tight">
                {displayName}
              </p>
              <p
                className="truncate text-[11px]"
                style={{ color: 'hsl(var(--sidebar-text-muted))' }}
              >
                {roleLabel}
              </p>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200"
            style={{ color: 'hsl(var(--sidebar-text))' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'hsl(var(--destructive) / 0.12)'
              e.currentTarget.style.color = 'hsl(var(--destructive))'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'hsl(var(--sidebar-text))'
            }}
          >
            <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Déconnexion</span>
          </button>
          <div className="mt-2 flex items-center justify-center gap-3 text-[10px] font-semibold" style={{ color: 'hsl(var(--sidebar-text-muted))' }}>
            <Link to="/privacy" onClick={onClose} className="hover:text-white">Confidentialité</Link>
            <span aria-hidden="true">•</span>
            <Link to="/terms" onClick={onClose} className="hover:text-white">Conditions</Link>
          </div>
        </div>
      </aside>
    </>
  )
}

/* ── NavItem sub-component ──────────────────────────────── */
function NavItem({
  item,
  isActive,
  onClose,
  label,
  badgeCount,
  delay,
  variant,
}: {
  item: { href: string; icon: React.ElementType }
  isActive: boolean
  onClose: () => void
  label: string
  badgeCount?: number
  delay: number
  variant: 'default' | 'admin'
}) {
  const activeColor = variant === 'admin' ? 'hsl(38 92% 52%)' : 'hsl(var(--primary))'
  const activeBg = variant === 'admin' ? 'hsl(38 92% 52% / 0.12)' : 'hsl(var(--primary) / 0.14)'

  return (
    <li
      className="animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Link
        to={item.href}
        onClick={onClose}
        className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200"
        style={{
          background: isActive ? activeBg : 'transparent',
          color: isActive ? activeColor : 'hsl(var(--sidebar-text))',
        }}
        onMouseEnter={e => {
          if (!isActive) {
            e.currentTarget.style.background = 'hsl(var(--sidebar-hover-bg))'
            e.currentTarget.style.color = 'hsl(var(--foreground))'
          }
        }}
        onMouseLeave={e => {
          if (!isActive) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'hsl(var(--sidebar-text))'
          }
        }}
      >
        {/* Active pill indicator */}
        {isActive && (
          <span
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
            style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}` }}
          />
        )}

        <item.icon
          className="h-[17px] w-[17px] shrink-0 transition-transform duration-200 group-hover:scale-110"
          style={{ color: isActive ? activeColor : 'hsl(var(--sidebar-text-muted))' }}
        />
        <span className="flex-1 truncate">{label}</span>

        {!!badgeCount && (
          <span
            aria-label={`${badgeCount} validation${badgeCount > 1 ? 's' : ''} en attente`}
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-sm"
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}

        {isActive && (
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 opacity-60"
            style={{ color: activeColor }}
          />
        )}
      </Link>
    </li>
  )
}
