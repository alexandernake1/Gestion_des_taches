import { Bell, Building2, FolderKanban, CheckSquare2, CreditCard, Globe, LayoutDashboard, LogOut, Shield, UserRound, Users, X, Package, Megaphone, ChevronRight } from 'lucide-react'
import { Link, useLocation } from '@tanstack/react-router'
import { authService } from '@/services/auth'
import { useQuery } from '@tanstack/react-query'

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'manager', 'employee'] },
  { name: 'Tâches', href: '/tasks', icon: CheckSquare2, roles: ['owner', 'manager', 'employee'] },
  { name: 'Projets', href: '/projects', icon: FolderKanban, roles: ['owner', 'manager', 'employee'] },
  { name: 'Équipes', href: '/teams', icon: Users, roles: ['owner', 'manager'] },
  { name: 'Utilisateurs', href: '/users', icon: UserRound, roles: ['owner', 'manager'] },
  { name: 'Abonnement', href: '/subscription', icon: CreditCard, roles: ['owner'] },
  { name: 'Notifications', href: '/notifications', icon: Bell, roles: ['owner', 'manager', 'employee'] },
]

const platformNavigation = [
  { name: 'Entreprises Clients', href: '/admin/companies', icon: Globe },
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
  const impersonatedCompanyId = localStorage.getItem('impersonated_company_id')
  const hasCompany = (!!currentUser?.company && !currentUser?.is_superuser) || (currentUser?.is_superuser && !!impersonatedCompanyId)
  const visibleNavigation = navigation.filter(
    (item) => hasCompany && !!currentUser && (item.roles.includes(currentUser.role) || currentUser.is_superuser)
  )
  const navigationLabel = (item: (typeof navigation)[number]) => {
    if (item.href === '/tasks') {
      return currentUser?.role === 'employee' ? 'Mes tâches' : 'Pilotage des tâches'
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
    ? 'Super Administrateur'
    : currentUser?.role_display || ''

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
              <Building2 className="h-4.5 w-4.5 text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold leading-tight text-white tracking-tight">
                {currentUser?.is_superuser ? 'Activity' : (currentUser?.company_name || 'Activity')}
              </p>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                style={{ color: 'hsl(var(--sidebar-text-muted))' }}
              >
                Control Center
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="lg:hidden rounded-lg p-1.5 transition-colors"
            style={{ color: 'hsl(var(--sidebar-text-muted))' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--sidebar-hover-bg))')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* ── Navigation ─────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">

          {/* Super Admin section */}
          {currentUser?.is_superuser && (
            <div className="animate-slide-up" style={{ animationDelay: '0ms' }}>
              <p
                className="mb-2 flex items-center gap-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: 'hsl(38 92% 52%)' }}
              >
                <Shield className="h-3 w-3" />
                Administration SaaS
              </p>
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
  delay,
  variant,
}: {
  item: { href: string; icon: React.ElementType }
  isActive: boolean
  onClose: () => void
  label: string
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
