import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Menu, Settings, Building, HelpCircle, Share2 } from 'lucide-react'
import { authService } from '@/services/auth'
import { companiesService } from '@/services/companies'
import { ThemeToggle } from './ThemeToggle'
import { NotificationDropdown } from './NotificationDropdown'
import { ROLE_LABELS } from '@/constants/labels'
import { useTutorial } from '@/context/TutorialContext'

interface HeaderProps {
  title: string
  onMenuClick: () => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const { openHelpDrawer, openShareModal } = useTutorial()
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
  })

  const impersonatedCompanyId = localStorage.getItem('impersonated_company_id') || ''
  const { data: companies } = useQuery({
    queryKey: ['companies-list'],
    queryFn: companiesService.listCompanies,
    enabled: !!currentUser?.is_superuser,
  })

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val) {
      localStorage.setItem('impersonated_company_id', val)
    } else {
      localStorage.removeItem('impersonated_company_id')
    }
    window.location.reload()
  }

  const displayName = currentUser?.full_name || currentUser?.email || 'Mon compte'

  return (
    <header className="glass-heavy sticky top-0 z-30 flex h-[72px] items-center justify-between px-4 sm:px-6 lg:px-8">

      {/* ── Left: menu + title ─────────────────────────── */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Ouvrir le menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-bold leading-tight tracking-tight text-foreground sm:text-[18px]">
            {title}
          </h1>
        </div>
      </div>

      {/* ── Right: controls ────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications Dropdown */}
        {!currentUser?.is_superuser && (
          <NotificationDropdown />
        )}

        {/* Super admin: company selector */}
        {currentUser?.is_superuser && companies && (
          <div className="relative flex items-center">
            <Building className="pointer-events-none absolute left-3 hidden h-3.5 w-3.5 text-primary sm:block" />
            <select
              value={impersonatedCompanyId}
              onChange={handleCompanyChange}
              aria-label="Structure consultée"
              className="h-9 w-32 appearance-none rounded-xl border border-border bg-muted/50 px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all sm:w-48 sm:pl-9 sm:pr-8 cursor-pointer"
            >
              <option value="">Toutes les structures</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Share Platform */}
        <button
          onClick={openShareModal}
          aria-label="Partager la plateforme"
          title="Partager la plateforme"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        >
          <Share2 className="h-[18px] w-[18px]" />
        </button>

        {/* Help Center & Tutorial */}
        <button
          onClick={openHelpDrawer}
          aria-label="Centre d'aide & Tutoriels"
          title="Centre d'aide & Tutoriels"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>

        {/* Settings */}
        <button
          onClick={() => navigate({ to: '/settings' })}
          aria-label="Paramètres"
          className="hidden h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted hover:text-foreground sm:flex"
        >
          <Settings className="h-[18px] w-[18px]" />
        </button>

        {/* Divider */}
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        {/* User avatar */}
        <button
          type="button"
          onClick={() => navigate({ to: '/settings' })}
          aria-label="Mon profil"
          className="flex items-center gap-2.5 rounded-xl border border-transparent p-1 pr-3 text-left transition-all hover:bg-muted/50 hover:border-border"
        >
          {/* Avatar */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold text-white shadow-cta"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
            }}
          >
            {getInitials(displayName)}
          </div>

          {/* Name + role */}
          <div className="hidden xl:block">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-semibold text-foreground leading-tight">
                {displayName}
              </p>
              {currentUser?.is_superuser && (
                <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600 border border-amber-500/20">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
              {currentUser?.is_superuser ? 'Plateforme SaaS' : currentUser?.is_personal_workspace ? 'Compte personnel' : (ROLE_LABELS[currentUser?.role || ''] || currentUser?.role_display || '')}
            </p>
          </div>
        </button>
      </div>
    </header>
  )
}
