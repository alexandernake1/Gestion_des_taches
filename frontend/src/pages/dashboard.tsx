import { useState, useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  CalendarDays,
  ArrowRight,
  Target,
  TrendingUp,
  Activity,
  Globe,
  Building2,
  CircleDollarSign,
  ShieldAlert,
  TimerReset,
  ListTodo,
  Users,
  FolderKanban,
  UserCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react'
import { dashboardService, type ActivityItem, type TrendPoint } from '@/services/dashboard'
import { requireCompanyMember } from '@/router/auth'
import { ErrorState } from '@/components/ui/ErrorState'
import { authService } from '@/services/auth'
import type { Task, Team, Project, User } from '@/domain/types'
import { companiesService } from '@/services/companies'
import { subscriptionsService } from '@/services/subscriptions'
import { teamsService } from '@/services/teams'
import { projectsService } from '@/services/projects'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: requireCompanyMember,
  component: DashboardPage,
})

type PeriodPreset = 'today' | '7d' | '30d' | 'month' | 'quarter' | 'year' | 'custom'

function getPresetDates(preset: PeriodPreset): { from: string; to: string } {
  const today = new Date()
  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  if (preset === 'today') {
    const s = formatDate(today)
    return { from: s, to: s }
  }
  if (preset === '7d') {
    const past = new Date(today)
    past.setDate(today.getDate() - 6)
    return { from: formatDate(past), to: formatDate(today) }
  }
  if (preset === '30d') {
    const past = new Date(today)
    past.setDate(today.getDate() - 29)
    return { from: formatDate(past), to: formatDate(today) }
  }
  if (preset === 'month') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return { from: formatDate(firstDay), to: formatDate(lastDay) }
  }
  if (preset === 'quarter') {
    const currentQuarter = Math.floor(today.getMonth() / 3)
    const firstDay = new Date(today.getFullYear(), currentQuarter * 3, 1)
    const lastDay = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0)
    return { from: formatDate(firstDay), to: formatDate(lastDay) }
  }
  if (preset === 'year') {
    const firstDay = new Date(today.getFullYear(), 0, 1)
    const lastDay = new Date(today.getFullYear(), 11, 31)
    return { from: formatDate(firstDay), to: formatDate(lastDay) }
  }
  return { from: '', to: '' }
}

function DashboardPage() {
  const navigate = useNavigate()
  const { data: currentUser, isLoading: userIdentityLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
  })

  const isPersonalWorkspace = Boolean(currentUser?.is_personal_workspace)
  const isManagement = !isPersonalWorkspace && (currentUser?.role === 'owner' || currentUser?.role === 'manager')
  const isSuperUserNotImpersonating = currentUser?.is_superuser && !localStorage.getItem('impersonated_company_id')
  const enabledQueries = !isSuperUserNotImpersonating

  // Period state
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('30d')
  const [customFrom, setCustomFrom] = useState<string>('')
  const [customTo, setCustomTo] = useState<string>('')

  // Scope filters for management
  const [selectedTeamId, setSelectedTeamId] = useState<number | string | undefined>()
  const [selectedProjectId, setSelectedProjectId] = useState<number | string | undefined>()
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | string | undefined>()

  const activeDates = useMemo(() => {
    if (periodPreset === 'custom') {
      return { from: customFrom, to: customTo }
    }
    return getPresetDates(periodPreset)
  }, [periodPreset, customFrom, customTo])

  const { data: subscription } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionsService.getMySubscription,
    enabled: enabledQueries,
  })

  const featureFlags = subscription?.plan_details?.feature_flags || {}
  const hasReports = featureFlags['has_reports'] !== false

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsService.list,
    enabled: isManagement && enabledQueries,
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.list(),
    enabled: isManagement && enabledQueries,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['company-members'],
    queryFn: () => authService.list({ is_active: true }),
    enabled: isManagement && enabledQueries,
  })

  const { data: platformCompanies = [] } = useQuery({
    queryKey: ['platform', 'companies'],
    queryFn: companiesService.listCompanies,
    enabled: !!isSuperUserNotImpersonating,
  })

  const { data: platformSubscriptions = [] } = useQuery({
    queryKey: ['platform', 'subscriptions'],
    queryFn: subscriptionsService.adminListSubscriptions,
    enabled: !!isSuperUserNotImpersonating,
  })

  const {
    data: companyStats,
    isLoading: companyLoading,
    isError: companyError,
    refetch: refetchCompany,
  } = useQuery({
    queryKey: [
      'companyStats',
      selectedTeamId,
      selectedProjectId,
      selectedAssigneeId,
      activeDates.from,
      activeDates.to,
    ],
    queryFn: () =>
      dashboardService.getCompanyStatistics({
        team_id: selectedTeamId,
        project_id: selectedProjectId,
        assignee_id: selectedAssigneeId,
        date_from: activeDates.from || undefined,
        date_to: activeDates.to || undefined,
      }),
    enabled: isManagement && enabledQueries,
  })

  const { data: dailyFocus, isLoading: focusLoading } = useQuery({
    queryKey: ['daily-focus'],
    queryFn: dashboardService.getDailyFocus,
    enabled: enabledQueries,
  })

  const {
    data: userStats,
    isLoading: userLoading,
    isError: userError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['userStats', activeDates.from, activeDates.to],
    queryFn: () =>
      dashboardService.getUserStatistics({
        date_from: activeDates.from || undefined,
        date_to: activeDates.to || undefined,
      }),
    enabled: enabledQueries,
  })

  const {
    data: activity,
    isLoading: activityLoading,
    isError: activityError,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ['activity', selectedTeamId],
    queryFn: () => dashboardService.getRecentActivity(8, selectedTeamId),
    enabled: enabledQueries,
  })

  const { data: performanceMetrics, isLoading: performanceLoading } = useQuery({
    queryKey: ['dashboard', 'performance', selectedTeamId, activeDates.from, activeDates.to],
    queryFn: () =>
      dashboardService.getPerformanceMetrics({
        team_id: selectedTeamId,
        date_from: activeDates.from || undefined,
        date_to: activeDates.to || undefined,
      }),
    enabled: isManagement && enabledQueries,
  })

  const hasError = (isManagement && companyError) || userError || activityError
  const retryDashboard = () => {
    if (isManagement) refetchCompany()
    refetchUser()
    refetchActivity()
  }

  if (userIdentityLoading) {
    return (
      <Layout title="Chargement...">
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    )
  }

  if (isSuperUserNotImpersonating) {
    const activeCompanies = platformCompanies.filter((company) => company.is_active).length
    const recurringRevenue = platformSubscriptions
      .filter((subscription) => subscription.status === 'active')
      .reduce((sum, subscription) => sum + Number(subscription.plan_details.price || 0), 0)
    const attentionRequired = platformSubscriptions.filter((subscription) => (
      subscription.status === 'past_due'
      || subscription.status === 'suspended'
      || subscription.status === 'pending_verification'
    )).length
    const trials = platformSubscriptions.filter((subscription) => subscription.status === 'trial').length
    return (
      <Layout title="Pilotage Plateforme">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-900 p-8 text-white shadow-2xl lg:p-12">
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"></div>
            <h1 className="mb-4 text-3xl font-bold tracking-tight lg:text-4xl relative z-10">
              Bienvenue, Super Administrateur
            </h1>
            <p className="mb-8 max-w-3xl text-lg text-indigo-100 lg:text-xl relative z-10">
              Vous êtes connecté en tant qu'administrateur système global. Depuis cet espace de pilotage, vous supervisez l'ensemble de la plateforme SaaS.
            </p>
            <div className="flex flex-wrap gap-4 relative z-10">
              <button
                onClick={() => navigate({ to: '/admin/companies' })}
                className="inline-flex items-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-900 shadow-lg shadow-white/10 transition-all hover:-translate-y-1 hover:shadow-xl hover:bg-slate-50"
              >
                <Globe className="mr-2 h-5 w-5" />
                Gérer les entreprises
              </button>
              <button
                onClick={() => navigate({ to: '/admin/subscriptions' })}
                className="inline-flex items-center rounded-xl border border-indigo-200/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition-all hover:-translate-y-1 hover:bg-white/20"
              >
                <CalendarDays className="mr-2 h-5 w-5" />
                Gérer les abonnements
              </button>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-5 xl:grid-cols-4">
            <PlatformMetric icon={Building2} label="Entreprises actives" value={activeCompanies} detail={`${platformCompanies.length} au total`} color="indigo" />
            <PlatformMetric icon={CircleDollarSign} label="Revenu mensuel estimé" value={`${recurringRevenue.toLocaleString('fr-FR')} F`} detail="Abonnements actifs" color="emerald" />
            <PlatformMetric icon={ShieldAlert} label="À surveiller" value={attentionRequired} detail="Paiements ou suspensions" alert={attentionRequired > 0} color="rose" />
            <PlatformMetric icon={TimerReset} label="Périodes d’essai" value={trials} detail="Conversions potentielles" color="amber" />
          </div>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
             <Card className="group border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer" onClick={() => navigate({ to: '/admin/companies' })}>
                <CardHeader>
                   <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-900 transition-colors">Entreprises</h3>
                      <div className="p-3 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                        <Globe className="h-6 w-6 text-indigo-600" />
                      </div>
                   </div>
                </CardHeader>
                <CardContent>
                   <p className="text-slate-500 mb-6 text-base">Ajoutez de nouvelles entreprises clientes, activez ou désactivez leur accès, et modifiez leurs informations principales.</p>
                   <span className="inline-flex text-sm font-bold text-indigo-600 items-center">Accéder à la gestion <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"/></span>
                </CardContent>
             </Card>
             
             <Card className="group border-slate-200 shadow-sm hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/5 transition-all duration-300 cursor-pointer" onClick={() => navigate({ to: '/admin/subscriptions' })}>
                <CardHeader>
                   <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-800 group-hover:text-violet-900 transition-colors">Abonnements</h3>
                      <div className="p-3 bg-violet-50 rounded-xl group-hover:bg-violet-100 transition-colors">
                        <CalendarDays className="h-6 w-6 text-violet-600" />
                      </div>
                   </div>
                </CardHeader>
                <CardContent>
                   <p className="text-slate-500 mb-6 text-base">Configurez les forfaits de facturation (Mois, Année), gérez les renouvellements et vérifiez le statut des paiements des clients.</p>
                   <span className="inline-flex text-sm font-bold text-violet-600 items-center">Gérer les abonnements <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"/></span>
                </CardContent>
             </Card>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={isManagement ? 'Tableau de bord' : 'Mon tableau de bord'}>
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-8">
        
        {/* Welcome Banner */}
        <WelcomeBanner
          userName={currentUser?.first_name || 'Utilisateur'}
          isManagement={isManagement}
          periodPreset={periodPreset}
          setPeriodPreset={setPeriodPreset}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          activeDates={activeDates}
          teams={teams}
          selectedTeamId={selectedTeamId}
          setSelectedTeamId={setSelectedTeamId}
          projects={projects}
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
          members={members}
          selectedAssigneeId={selectedAssigneeId}
          setSelectedAssigneeId={setSelectedAssigneeId}
        />

        {hasError && (
          <div className="mb-6">
            <ErrorState
              message="Certaines données du tableau de bord n’ont pas pu être chargées."
              onRetry={retryDashboard}
            />
          </div>
        )}

        {/* Dynamic Views: Management vs Collaborator */}
        {isManagement ? (
          <ManagementDashboardView
            stats={companyStats}
            metrics={performanceMetrics}
            loading={companyLoading || performanceLoading}
            activity={activity}
            activityLoading={activityLoading}
            hasReports={hasReports}
            navigate={navigate}
          />
        ) : (
          <CollaboratorDashboardView
            userStats={userStats}
            dailyFocus={dailyFocus}
            focusLoading={focusLoading}
            userLoading={userLoading}
            activity={activity}
            activityLoading={activityLoading}
            hasReports={hasReports}
            navigate={navigate}
          />
        )}

      </div>
    </Layout>
  )
}

function WelcomeBanner({
  userName,
  isManagement,
  periodPreset,
  setPeriodPreset,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  activeDates,
  teams,
  selectedTeamId,
  setSelectedTeamId,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  members,
  selectedAssigneeId,
  setSelectedAssigneeId,
}: {
  userName: string
  isManagement: boolean
  periodPreset: PeriodPreset
  setPeriodPreset: (p: PeriodPreset) => void
  customFrom: string
  setCustomFrom: (s: string) => void
  customTo: string
  setCustomTo: (s: string) => void
  activeDates: { from: string; to: string }
  teams: Team[]
  selectedTeamId?: number | string
  setSelectedTeamId: (id?: number | string) => void
  projects: Project[]
  selectedProjectId?: number | string
  setSelectedProjectId: (id?: number | string) => void
  members: User[]
  selectedAssigneeId?: number | string
  setSelectedAssigneeId: (id?: number | string) => void
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white shadow-float animate-slide-up"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(243 75% 48%) 40%, hsl(var(--accent)) 100%)',
      }}
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl opacity-40" style={{ background: 'hsl(265 70% 80%)' }} />
      <div className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full blur-3xl opacity-30" style={{ background: 'hsl(213 94% 70%)' }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight lg:text-3xl drop-shadow-sm flex items-center gap-3">
              <span className="text-white">
                Bonjour, {userName}
              </span> 
              <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-2 text-sm font-medium text-white/90 max-w-xl leading-relaxed drop-shadow-sm">
              {isManagement
                ? "Pilotez l'activité globale, la charge de travail et la ponctualité de vos équipes."
                : "Retrouvez vos priorités du jour, vos échéances et votre bilan d'avancement."}
            </p>
          </div>

          {/* Unified Period Selector */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-black/20 p-1.5 backdrop-blur-md border border-white/20">
            <span className="flex items-center gap-1.5 px-2 text-xs font-bold uppercase tracking-wider text-white/80">
              <Calendar className="h-3.5 w-3.5" /> Période :
            </span>
            {[
              { id: 'today', label: "Aujourd'hui" },
              { id: '7d', label: '7 jours' },
              { id: '30d', label: '30 jours' },
              { id: 'month', label: 'Ce mois' },
              { id: 'quarter', label: 'Trimestre' },
              { id: 'year', label: 'Année' },
              { id: 'custom', label: 'Personnalisée' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodPreset(p.id as PeriodPreset)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  periodPreset === p.id
                    ? 'bg-white text-indigo-900 shadow-md font-bold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Pickers when 'custom' is active */}
        {periodPreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur-md border border-white/20">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-white">Du :</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 rounded-lg bg-slate-900/80 px-2.5 text-xs text-white border border-white/20"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-white">Au :</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 rounded-lg bg-slate-900/80 px-2.5 text-xs text-white border border-white/20"
              />
            </div>
            <span className="text-xs text-white/70 italic">
              {activeDates.from && activeDates.to ? `Affichage du ${activeDates.from} au ${activeDates.to}` : 'Veuillez saisir les dates'}
            </span>
          </div>
        )}

        {/* Management Scopes (Team, Project, Member) */}
        {isManagement && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/15">
            {/* Team filter */}
            <div className="relative rounded-xl border border-white/20 bg-white/10 backdrop-blur-md">
              <select
                className="w-full appearance-none rounded-xl bg-transparent py-2.5 pl-3 pr-8 text-xs font-semibold text-white focus:outline-none cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white"
                value={selectedTeamId || ''}
                onChange={(e) => setSelectedTeamId(e.target.value || undefined)}
                aria-label="Filtrer par équipe"
              >
                <option value="">Toutes les équipes</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>Équipe : {t.name}</option>
                ))}
              </select>
              <Users className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/70" />
            </div>

            {/* Project filter */}
            <div className="relative rounded-xl border border-white/20 bg-white/10 backdrop-blur-md">
              <select
                className="w-full appearance-none rounded-xl bg-transparent py-2.5 pl-3 pr-8 text-xs font-semibold text-white focus:outline-none cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white"
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(e.target.value || undefined)}
                aria-label="Filtrer par projet"
              >
                <option value="">Tous les projets</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>Projet : {p.name}</option>
                ))}
              </select>
              <FolderKanban className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/70" />
            </div>

            {/* Assignee filter */}
            <div className="relative rounded-xl border border-white/20 bg-white/10 backdrop-blur-md">
              <select
                className="w-full appearance-none rounded-xl bg-transparent py-2.5 pl-3 pr-8 text-xs font-semibold text-white focus:outline-none cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white"
                value={selectedAssigneeId || ''}
                onChange={(e) => setSelectedAssigneeId(e.target.value || undefined)}
                aria-label="Filtrer par collaborateur"
              >
                <option value="">Tous les collaborateurs</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>Assigné : {m.full_name}</option>
                ))}
              </select>
              <UserCheck className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/70" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ManagementDashboardView({
  stats,
  metrics,
  loading,
  activity,
  activityLoading,
  hasReports,
  navigate,
}: {
  stats?: ReturnType<typeof dashboardService.getCompanyStatistics> extends Promise<infer T> ? T : never
  metrics?: ReturnType<typeof dashboardService.getPerformanceMetrics> extends Promise<infer T> ? T : never
  loading: boolean
  activity?: ActivityItem[]
  activityLoading: boolean
  hasReports: boolean
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <div className="space-y-8">
      {/* 6 Core KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard
          title="Créées (période)"
          value={stats?.created_in_period ?? stats?.new_tasks_this_week ?? 0}
          icon={<ListTodo className="h-5 w-5 text-indigo-600" />}
          loading={loading}
          accent="indigo"
          detail={`Total actif: ${stats?.total_tasks || 0}`}
        />
        <StatCard
          title="Achevées (période)"
          value={stats?.completed_in_period ?? stats?.completed_this_week ?? 0}
          icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
          loading={loading}
          accent="emerald"
          detail={`Total terminées: ${stats?.completed_tasks || 0}`}
        />
        <StatCard
          title="En cours"
          value={stats?.in_progress_tasks || 0}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          loading={loading}
          accent="amber"
          detail={`Ouvertes: ${stats?.open_tasks || 0}`}
        />
        <StatCard
          title="En retard"
          value={stats?.overdue_tasks || 0}
          icon={<AlertCircle className="h-5 w-5 text-rose-600" />}
          loading={loading}
          accent="rose"
          alert={(stats?.overdue_tasks || 0) > 0}
          detail="Échéance dépassée"
        />
        <StatCard
          title="Taux d'achèvement"
          value={`${stats?.completion_rate || 0}%`}
          icon={<Target className="h-5 w-5 text-blue-600" />}
          loading={loading}
          accent="indigo"
          detail="Sur la période"
        />
        <StatCard
          title="Ponctualité"
          value={`${stats?.on_time_completion_rate ?? metrics?.on_time_completion_rate ?? 100}%`}
          icon={<CheckCircle2 className="h-5 w-5 text-teal-600" />}
          loading={loading}
          accent="emerald"
          detail="Terminées dans les délais"
        />
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Main Column */}
        <div className="space-y-8 lg:col-span-8">
          {/* Trend Chart (Created vs Completed) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Flux des tâches sur la période</h3>
                  <p className="text-xs text-muted-foreground">Créations (bleu) vs Achèvements (vert)</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-48 skeleton rounded-xl" />
              ) : stats?.trends && stats.trends.length > 0 ? (
                <TrendChart trends={stats.trends} />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground italic">
                  Aucune tendance disponible sur cette période.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Teams and Members Workload */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Team Workload */}
            <Card>
              <CardHeader>
                <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Users className="h-4 w-4 text-indigo-600" />
                  Charge par équipe
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats?.team_workload && stats.team_workload.length > 0 ? (
                  stats.team_workload.map((team) => (
                    <div key={team.team_id} className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-foreground">{team.team_name}</span>
                        <span className="text-muted-foreground">{team.total_tasks} tâche{team.total_tasks > 1 ? 's' : ''}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-emerald-600 font-medium">{team.completed_tasks} terminées</span>
                        {team.overdue_tasks > 0 && (
                          <span className="text-rose-600 font-bold">{team.overdue_tasks} en retard</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic py-3">Aucune équipe active.</p>
                )}
              </CardContent>
            </Card>

            {/* Member Workload */}
            <Card>
              <CardHeader>
                <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <UserCheck className="h-4 w-4 text-indigo-600" />
                  Charge par collaborateur
                </h3>
              </CardHeader>
              <CardContent className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {stats?.member_workload && stats.member_workload.length > 0 ? (
                  stats.member_workload.map((member) => (
                    <div key={member.user_id} className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-foreground">{member.user_name}</span>
                        <span className="text-muted-foreground">{member.total_tasks} tâche{member.total_tasks > 1 ? 's' : ''}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-emerald-600 font-medium">{member.completed_tasks} terminées</span>
                        {member.overdue_tasks > 0 && (
                          <span className="text-rose-600 font-bold">{member.overdue_tasks} en retard</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic py-3">Aucun collaborateur assigné.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* At Risk Projects */}
          {stats?.at_risk_projects && stats.at_risk_projects.length > 0 && (
            <Card className="border-rose-200/60 bg-rose-50/20">
              <CardHeader>
                <h3 className="flex items-center gap-2 text-sm font-bold text-rose-800">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  Projets nécessitant une attention ({stats.at_risk_projects.length})
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.at_risk_projects.map((proj) => (
                  <div
                    key={proj.project_id}
                    onClick={() => navigate({ to: '/projects/$projectId', params: { projectId: String(proj.project_id) } })}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-200 bg-white p-3.5 shadow-xs transition-all hover:border-rose-400 cursor-pointer"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 hover:text-indigo-600">{proj.project_name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {proj.completed_tasks} / {proj.total_tasks} tâches ({proj.progress}%) • {proj.overdue_tasks} en retard
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-28 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full"
                          style={{ width: `${proj.progress}%` }}
                        />
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                <Activity className="h-4 w-4 text-indigo-600" />
                Activité récente
              </h3>
            </CardHeader>
            <CardContent className="pt-4 max-h-[500px] overflow-y-auto">
              {activityLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 skeleton rounded-xl" />)}
                </div>
              ) : (
                <div className="relative pl-5 ml-2 space-y-3 border-l border-border">
                  {activity?.map((item) => <ActivityItemCard key={item.id} item={item} />)}
                  {activity?.length === 0 && <p className="text-xs text-muted-foreground italic py-3">Aucune activité récente.</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side Column */}
        <div className="space-y-8 lg:col-span-4">
          {/* Completion Speeds & Durations */}
          {hasReports && (
            <Card>
              <CardHeader>
                <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  Délais moyens d'exécution
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Durée moyenne</span>
                  <p className="mt-1 text-2xl font-black text-foreground">
                    {stats?.avg_completion_time_hours ? `${stats.avg_completion_time_hours} h` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Entre la création et la clôture</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Durée médiane</span>
                  <p className="mt-1 text-2xl font-black text-foreground">
                    {stats?.median_completion_time_hours ? `${stats.median_completion_time_hours} h` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Valeur pivot d'exécution</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Layers className="h-4 w-4 text-indigo-600" />
                Répartition par statut
              </h3>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { label: 'À faire', count: stats?.status_breakdown.todo || 0, color: 'bg-slate-500' },
                { label: 'En cours', count: stats?.status_breakdown.in_progress || 0, color: 'bg-amber-500' },
                { label: 'En pause', count: stats?.status_breakdown.on_hold || 0, color: 'bg-purple-500' },
                { label: 'Reportée', count: stats?.status_breakdown.deferred || 0, color: 'bg-orange-500' },
                { label: 'Terminée', count: stats?.status_breakdown.completed || 0, color: 'bg-emerald-500' },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between text-xs font-semibold p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                    <span className="text-foreground">{s.label}</span>
                  </div>
                  <span className="font-bold text-foreground">{s.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Priority Breakdown */}
          <Card>
            <CardHeader>
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Target className="h-4 w-4 text-indigo-600" />
                Répartition par priorité
              </h3>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { label: 'Urgent', count: stats?.priority_breakdown.urgent || 0, color: 'text-rose-600 bg-rose-50 border-rose-200' },
                { label: 'Haute', count: stats?.priority_breakdown.high || 0, color: 'text-amber-600 bg-amber-50 border-amber-200' },
                { label: 'Normale', count: stats?.priority_breakdown.normal || 0, color: 'text-blue-600 bg-blue-50 border-blue-200' },
                { label: 'Faible', count: stats?.priority_breakdown.low || 0, color: 'text-slate-600 bg-slate-50 border-slate-200' },
              ].map((p) => (
                <div key={p.label} className={`flex items-center justify-between text-xs font-semibold p-2.5 rounded-xl border ${p.color}`}>
                  <span>{p.label}</span>
                  <span className="font-black text-sm">{p.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Approvals Summary */}
          {stats?.approvals && (
            <Card>
              <CardHeader>
                <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                  Demandes de validation
                </h3>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5">
                  <p className="text-xs font-semibold text-amber-700">En attente</p>
                  <p className="text-xl font-black text-amber-900 mt-1">{stats.approvals.pending}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5">
                  <p className="text-xs font-semibold text-emerald-700">Validées</p>
                  <p className="text-xl font-black text-emerald-900 mt-1">{stats.approvals.approved}</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-2.5">
                  <p className="text-xs font-semibold text-rose-700">Refusées</p>
                  <p className="text-xl font-black text-rose-900 mt-1">{stats.approvals.rejected}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function CollaboratorDashboardView({
  userStats,
  dailyFocus,
  focusLoading,
  userLoading,
  activity,
  activityLoading,
  hasReports,
  navigate,
}: {
  userStats?: ReturnType<typeof dashboardService.getUserStatistics> extends Promise<infer T> ? T : never
  dailyFocus?: ReturnType<typeof dashboardService.getDailyFocus> extends Promise<infer T> ? T : never
  focusLoading: boolean
  userLoading: boolean
  activity?: ActivityItem[]
  activityLoading: boolean
  hasReports: boolean
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <div className="space-y-8">
      {/* 4 Collaborator KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Mes tâches du jour"
          value={userStats?.my_day?.today || 0}
          icon={<CalendarDays className="h-5 w-5 text-indigo-600" />}
          loading={userLoading}
          accent="indigo"
          detail="Échéance aujourd'hui"
        />
        <StatCard
          title="En cours"
          value={userStats?.assigned?.in_progress || userStats?.my_day?.in_progress || 0}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          loading={userLoading}
          accent="amber"
          detail="En cours d'exécution"
        />
        <StatCard
          title="En retard"
          value={userStats?.assigned?.overdue || userStats?.my_day?.overdue || 0}
          icon={<AlertCircle className="h-5 w-5 text-rose-600" />}
          loading={userLoading}
          accent="rose"
          alert={(userStats?.assigned?.overdue || 0) > 0}
          detail="Nécessite votre attention"
        />
        <StatCard
          title="Taux d'achèvement"
          value={`${userStats?.completion_rate || 0}%`}
          icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
          loading={userLoading}
          accent="emerald"
          detail="Sur la période sélectionnée"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Main Column: Daily Focus + Recent Activity */}
        <div className="space-y-8 lg:col-span-8">
          <DailyFocusPanel
            focus={dailyFocus}
            loading={focusLoading}
            onOpen={(task) => navigate({ to: '/tasks/$taskId', params: { taskId: String(task.id) } })}
          />

          {/* Personal Trend Chart */}
          {userStats?.trends && userStats.trends.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                  Mon rythme de réalisation
                </h3>
              </CardHeader>
              <CardContent>
                <TrendChart trends={userStats.trends} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                <Activity className="h-4 w-4 text-indigo-600" />
                Activité sur mes tâches
              </h3>
            </CardHeader>
            <CardContent className="pt-4 max-h-[500px] overflow-y-auto">
              {activityLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 skeleton rounded-xl" />)}
                </div>
              ) : (
                <div className="relative pl-5 ml-2 space-y-3 border-l border-border">
                  {activity?.map((item) => <ActivityItemCard key={item.id} item={item} />)}
                  {activity?.length === 0 && <p className="text-xs text-muted-foreground italic py-3">Aucune activité récente.</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side Column: Completion Donut & Summary */}
        <div className="space-y-8 lg:col-span-4">
          {hasReports && (
            <Card className="group relative overflow-hidden bg-card/80 backdrop-blur-md">
              <CardHeader className="pb-2">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-indigo-600" />
                  Bilan sur la période
                </h3>
              </CardHeader>
              <CardContent>
                {userLoading ? (
                  <div className="flex justify-center items-center h-48">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-2">
                    <div className="relative flex items-center justify-center my-4 drop-shadow-xl">
                      <svg className="w-36 h-36 transform -rotate-90">
                        <circle
                          className="text-muted/40"
                          strokeWidth="12"
                          stroke="currentColor"
                          fill="transparent"
                          r="56"
                          cx="72"
                          cy="72"
                        />
                        <circle
                          className={
                            (userStats?.completion_rate || 0) >= 80 ? 'text-emerald-500' :
                            (userStats?.completion_rate || 0) >= 50 ? 'text-amber-500' :
                            'text-rose-500'
                          }
                          strokeWidth="12"
                          strokeDasharray={56 * 2 * Math.PI}
                          strokeDashoffset={
                            56 * 2 * Math.PI - ((userStats?.completion_rate || 0) / 100) * 56 * 2 * Math.PI
                          }
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r="56"
                          cx="72"
                          cy="72"
                          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-foreground">
                          {userStats?.completion_rate || 0}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full text-center mt-2">
                      <div className="rounded-xl border border-border bg-muted/20 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Créées</p>
                        <p className="text-2xl font-black text-foreground mt-0.5">{userStats?.created_in_period ?? userStats?.new_tasks_this_week ?? 0}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Terminées</p>
                        <p className="text-2xl font-black text-emerald-800 mt-0.5">{userStats?.completed_in_period ?? userStats?.completed_this_week ?? 0}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pending Approvals alert if any */}
          {(userStats?.pending_approvals_count || 0) > 0 && (
            <Card className="border-amber-200 bg-amber-50/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-900">Demandes en attente</p>
                    <p className="text-xs text-amber-700">{userStats?.pending_approvals_count} tâche(s) en attente de validation</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function TrendChart({ trends }: { trends: TrendPoint[] }) {
  const maxVal = Math.max(...trends.flatMap((t) => [t.created, t.completed]), 1)

  return (
    <div className="pt-2">
      <div className="flex items-end gap-1.5 h-36 w-full overflow-x-auto pb-6">
        {trends.map((pt, idx) => {
          const cHeight = Math.max(4, (pt.created / maxVal) * 100)
          const compHeight = Math.max(4, (pt.completed / maxVal) * 100)
          const dateLabel = pt.date.slice(5) // MM-DD

          return (
            <div key={idx} className="flex-1 min-w-[20px] flex flex-col items-center gap-1 group relative">
              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute -top-12 z-20 hidden group-hover:flex flex-col items-center rounded-lg bg-slate-900 px-2 py-1 text-[10px] text-white shadow-lg whitespace-nowrap">
                <span>{pt.date}</span>
                <span>Créées : {pt.created} | Terminées : {pt.completed}</span>
              </div>

              <div className="flex items-end gap-0.5 h-28 w-full justify-center">
                <div
                  className="w-2.5 rounded-t bg-indigo-500 transition-all group-hover:bg-indigo-600"
                  style={{ height: `${cHeight}%` }}
                />
                <div
                  className="w-2.5 rounded-t bg-emerald-500 transition-all group-hover:bg-emerald-600"
                  style={{ height: `${compHeight}%` }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground whitespace-nowrap">{dateLabel}</span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-center gap-6 pt-2 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded bg-indigo-500" />
          <span>Tâches créées</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded bg-emerald-500" />
          <span>Tâches achevées</span>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  loading,
  accent,
  detail,
  alert = false,
}: {
  title: string
  value: number | string
  icon: React.ReactNode
  loading: boolean
  accent: string
  detail?: string
  alert?: boolean
}) {
  const colorMap: Record<string, { stripe: string; iconBg: string }> = {
    indigo:  { stripe: 'hsl(var(--primary))',     iconBg: 'hsl(var(--primary) / 0.10)' },
    amber:   { stripe: 'hsl(var(--warning))',     iconBg: 'hsl(var(--warning) / 0.10)' },
    emerald: { stripe: 'hsl(var(--success))',     iconBg: 'hsl(var(--success) / 0.10)' },
    rose:    { stripe: 'hsl(var(--destructive))', iconBg: 'hsl(var(--destructive) / 0.10)' },
  }
  const c = colorMap[accent] ?? colorMap.indigo

  return (
    <Card className={`group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${alert ? 'border-destructive/40' : ''}`}>
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{ background: alert ? 'hsl(var(--destructive))' : c.stripe }}
      />
      <CardContent className="p-4 pl-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">{title}</p>
            {loading ? (
              <div className="h-8 w-16 skeleton rounded-lg my-1" />
            ) : (
              <p
                className="text-[26px] font-black tracking-tight leading-none my-1 truncate"
                style={{ color: alert ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))' }}
              >
                {value}
              </p>
            )}
            {detail && <p className="text-[11px] font-medium text-muted-foreground truncate">{detail}</p>}
          </div>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: c.iconBg }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DailyFocusPanel({
  focus,
  loading,
  onOpen,
}: {
  focus?: Awaited<ReturnType<typeof dashboardService.getDailyFocus>>
  loading: boolean
  onOpen: (task: Task) => void
}) {
  const priorityDot: Record<string, string> = {
    urgent: 'hsl(var(--destructive))',
    high:   'hsl(var(--warning))',
    normal: 'hsl(var(--primary))',
    low:    'hsl(var(--muted-foreground))',
  }

  const focusSectionConfig = [
    { key: 'overdue',     label: 'En retard',           borderColor: 'hsl(var(--destructive) / 0.25)', bg: 'hsl(var(--destructive) / 0.04)', badgeBg: 'hsl(var(--destructive) / 0.10)', badgeColor: 'hsl(var(--destructive))', dotColor: 'hsl(var(--destructive))' },
    { key: 'today',       label: "À faire aujourd'hui", borderColor: 'hsl(var(--primary) / 0.25)',     bg: 'hsl(var(--primary) / 0.04)',     badgeBg: 'hsl(var(--primary) / 0.10)',     badgeColor: 'hsl(var(--primary))',     dotColor: 'hsl(var(--primary))' },
    { key: 'in_progress', label: 'En cours',            borderColor: 'hsl(var(--warning) / 0.25)',    bg: 'hsl(var(--warning) / 0.04)',    badgeBg: 'hsl(var(--warning) / 0.10)',    badgeColor: 'hsl(var(--warning))',    dotColor: 'hsl(var(--warning))' },
    { key: 'upcoming',    label: '7 prochains jours',   borderColor: 'hsl(var(--border))',             bg: 'hsl(var(--muted) / 0.50)',       badgeBg: 'hsl(var(--muted))',             badgeColor: 'hsl(var(--muted-foreground))', dotColor: 'hsl(var(--muted-foreground))' },
  ] as const

  const sections = focus
    ? focusSectionConfig
        .map((cfg) => ({ ...cfg, tasks: focus[cfg.key as keyof typeof focus] as Task[] }))
        .filter((s) => s.tasks.length > 0)
    : []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
          >
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Ma journée</h2>
            <p className="text-xs text-muted-foreground">Les tâches qui demandent votre attention immédiate.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-28 skeleton rounded-xl" />
            <div className="h-28 skeleton rounded-xl" />
          </div>
        ) : sections.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {sections.map((section) => (
              <div
                key={section.label}
                className="relative rounded-2xl border p-4 transition-all duration-300 hover:shadow-md"
                style={{ borderColor: section.borderColor, background: `linear-gradient(180deg, ${section.bg} 0%, transparent 100%)` }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] shadow-xs"
                    style={{ background: section.badgeBg, color: section.badgeColor, border: `1px solid ${section.borderColor}` }}
                  >
                    <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: section.dotColor }} />
                    {section.label}
                  </span>
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-slate-600 shadow-xs border border-slate-200">
                    {section.tasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {section.tasks.slice(0, 4).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onOpen(task)}
                      className="group flex w-full items-center gap-2.5 rounded-xl border border-slate-200/60 bg-white/90 backdrop-blur-xs px-3.5 py-2.5 text-left shadow-xs transition-all hover:border-indigo-300 hover:shadow-sm"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: priorityDot[task.priority] ?? priorityDot.low }}
                      />
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700 group-hover:text-indigo-700">
                        {task.title}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="rounded-xl border p-6 text-center flex flex-col items-center justify-center min-h-[140px]"
            style={{ borderColor: 'hsl(var(--success) / 0.25)', background: 'hsl(var(--success) / 0.05)' }}
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-foreground">Rien d'urgent pour aujourd'hui</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Vous êtes parfaitement à jour sur vos priorités.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityItemCard({ item }: { item: ActivityItem }) {
  const getInitials = (name: string) =>
    name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()

  return (
    <div className="group relative flex items-start gap-3">
      <div
        className="absolute -left-[25px] mt-2.5 h-2 w-2 rounded-full border-2 border-background z-10"
        style={{ background: 'hsl(var(--primary))' }}
      />
      <div className="flex-1 min-w-0 rounded-xl border border-border bg-card p-3 shadow-xs transition-all hover:bg-muted/20">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100">
            {getInitials(item.changed_by)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground leading-snug">
              <span className="font-bold text-foreground">{item.changed_by}</span>{' '}
              a modifié{' '}
              <span className="inline rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-muted text-foreground border border-border">
                {item.field_name}
              </span>
            </p>
            <p className="text-xs font-bold text-foreground truncate mt-0.5">{item.task_title}</p>
            <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Clock className="w-3 h-3" />
              {new Date(item.changed_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlatformMetric({
  icon: Icon,
  label,
  value,
  detail,
  alert = false,
  color,
}: {
  icon: typeof Building2
  label: string
  value: string | number
  detail: string
  alert?: boolean
  color: string
}) {
  const colorMap: Record<string, { icon: string; iconBg: string; stripe: string }> = {
    indigo:  { icon: 'hsl(var(--primary))',     iconBg: 'hsl(var(--primary) / 0.12)',     stripe: 'hsl(var(--primary))' },
    emerald: { icon: 'hsl(var(--success))',     iconBg: 'hsl(var(--success) / 0.12)',     stripe: 'hsl(var(--success))' },
    rose:    { icon: 'hsl(var(--destructive))', iconBg: 'hsl(var(--destructive) / 0.12)', stripe: 'hsl(var(--destructive))' },
    amber:   { icon: 'hsl(var(--warning))',     iconBg: 'hsl(var(--warning) / 0.12)',     stripe: 'hsl(var(--warning))' },
  }
  const c = colorMap[color] ?? colorMap.indigo

  return (
    <Card hover className={`group relative overflow-hidden ${alert ? 'border-destructive/30' : ''}`}>
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl" style={{ background: c.stripe }} />
      <CardContent className="p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 truncate">{label}</p>
            <p
              className="text-[26px] font-black tracking-tight truncate leading-none"
              style={{ color: alert ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))' }}
            >
              {value}
            </p>
            <p className="mt-1.5 text-xs font-medium text-muted-foreground truncate">{detail}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: c.iconBg }}>
            <Icon className="h-5 w-5" style={{ color: c.icon }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
