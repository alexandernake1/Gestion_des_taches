import { useState } from 'react'
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
} from 'lucide-react'
import { dashboardService, type ActivityItem } from '@/services/dashboard'
import { requireCompanyMember } from '@/router/auth'
import { ErrorState } from '@/components/ui/ErrorState'
import { authService } from '@/services/auth'
import type { Task, Team } from '@/domain/types'
import { companiesService } from '@/services/companies'
import { subscriptionsService } from '@/services/subscriptions'
import { teamsService } from '@/services/teams'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: requireCompanyMember,
  component: DashboardPage,
})

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
  const [selectedTeamId, setSelectedTeamId] = useState<number | string | undefined>()

  const { data: subscription } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionsService.getMySubscription,
    enabled: enabledQueries,
  })

  const featureFlags = subscription?.plan_details?.feature_flags || {}
  const hasReports = featureFlags['has_reports'] === true

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsService.list,
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
    queryKey: ['companyStats', selectedTeamId],
    queryFn: () => dashboardService.getCompanyStatistics(selectedTeamId),
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
    queryKey: ['userStats'],
    queryFn: () => dashboardService.getUserStatistics(),
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
    queryKey: ['dashboard', 'performance', selectedTeamId],
    queryFn: () => dashboardService.getPerformanceMetrics(selectedTeamId),
    enabled: !isSuperUserNotImpersonating,
  })

  const hasError = (isManagement && companyError) || userError || activityError
  const overview = isManagement && companyStats ? {
    total: companyStats.total_tasks,
    completed: companyStats.completed_tasks,
    in_progress: companyStats.in_progress_tasks,
    overdue: companyStats.overdue_tasks,
  } : userStats?.scope
  const overviewLoading = userIdentityLoading || (isManagement ? companyLoading : userLoading)

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
          teams={teams || []}
          selectedTeamId={selectedTeamId}
          setSelectedTeamId={setSelectedTeamId}
        />

        {hasError && (
          <div className="mb-6">
            <ErrorState
              message="Certaines données du tableau de bord n’ont pas pu être chargées."
              onRetry={retryDashboard}
            />
          </div>
        )}

        {/* Top Stat Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={isManagement ? 'Tâches totales' : 'Mes tâches'}
            value={overview?.total || 0}
            icon={<ListTodo className="h-6 w-6 text-indigo-600" />}
            loading={overviewLoading}
            accent="indigo"
          />
          <StatCard
            title="En cours"
            value={overview?.in_progress || 0}
            icon={<Clock className="h-6 w-6 text-amber-600" />}
            loading={overviewLoading}
            accent="amber"
          />
          <StatCard
            title="Terminées"
            value={overview?.completed || 0}
            icon={<CheckCircle className="h-6 w-6 text-emerald-600" />}
            loading={overviewLoading}
            accent="emerald"
          />
          <StatCard
            title="En retard"
            value={overview?.overdue || 0}
            icon={<AlertCircle className="h-6 w-6 text-rose-600" />}
            loading={overviewLoading}
            accent="rose"
          />
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Column (Daily Focus + Activity) */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            <DailyFocusPanel
              focus={dailyFocus}
              loading={focusLoading}
              onOpen={(task) => navigate({ to: '/tasks/$taskId', params: { taskId: String(task.id) } })}
            />
            
            <Card className="flex-1">
              <CardHeader>
                <h3 className="flex items-center gap-2 text-[16px] font-bold tracking-tight text-foreground">
                  <Activity className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
                  {isManagement ? 'Activité récente' : 'Activité sur mes tâches'}
                </h3>
              </CardHeader>
              <CardContent className="pt-5 max-h-[600px] overflow-y-auto pr-1">
                {activityLoading ? (
                  <div className="relative pl-5 ml-3 space-y-5" style={{ borderLeft: '2px solid hsl(var(--border))' }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="h-4 skeleton w-2/3" />
                          <div className="h-3 skeleton w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative pl-5 ml-3 space-y-4" style={{ borderLeft: '2px solid hsl(var(--border) / 0.60)' }}>
                    {activity?.map((item) => (
                      <ActivityItemCard key={item.id} item={item} />
                    ))}
                    {activity?.length === 0 && (
                      <p className="text-sm text-slate-500 py-4 italic">
                        Aucune activité récente.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Side Column (Stats + Performance) */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            
            {/* Completion Rate / Donut */}
            {hasReports && (
            <Card className="group shadow-sm border border-slate-200/60 bg-white/80 backdrop-blur-md overflow-hidden relative transition-all duration-300 hover:shadow-lg hover:border-slate-300">
              <div className="absolute top-0 right-0 p-24 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none transition-transform duration-500 group-hover:scale-110"></div>
              <CardHeader className="pb-2">
                <h3 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600"><Target className="h-4 w-4" /></div>
                  Bilan de la semaine
                </h3>
              </CardHeader>
              <CardContent>
                {userLoading ? (
                  <div className="flex justify-center items-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-2">
                    <div className="relative flex items-center justify-center my-6 drop-shadow-2xl">
                      {/* Glow effect behind SVG */}
                      <div className="absolute inset-0 rounded-full blur-xl opacity-20 bg-indigo-500 animate-pulse"></div>
                      <svg className="w-40 h-40 transform -rotate-90 relative z-10">
                        <circle
                          className="text-slate-100"
                          strokeWidth="14"
                          stroke="currentColor"
                          fill="transparent"
                          r="68"
                          cx="80"
                          cy="80"
                        />
                        <circle
                          className={
                            (userStats?.completion_rate || 0) >= 80 ? 'text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]' :
                            (userStats?.completion_rate || 0) >= 50 ? 'text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]' :
                            'text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                          }
                          strokeWidth="14"
                          strokeDasharray={68 * 2 * Math.PI}
                          strokeDashoffset={
                            68 * 2 * Math.PI - ((userStats?.completion_rate || 0) / 100) * 68 * 2 * Math.PI
                          }
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r="68"
                          cx="80"
                          cy="80"
                          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center z-10">
                        <span className="text-4xl font-black text-slate-800 tracking-tighter">
                          {userStats?.completion_rate || 0}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 w-full text-center mt-2">
                      <div className="bg-slate-50/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/60 transition-all hover:bg-slate-100 hover:shadow-md hover:-translate-y-0.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nouvelles</p>
                        <p className="text-3xl font-black text-slate-900">{userStats?.new_tasks_this_week || 0}</p>
                      </div>
                      <div className="bg-emerald-50/80 backdrop-blur-sm rounded-2xl p-4 border border-emerald-200/60 transition-all hover:bg-emerald-100 hover:shadow-md hover:-translate-y-0.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">Terminées</p>
                        <p className="text-3xl font-black text-emerald-800">{userStats?.completed_this_week || 0}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Performance Indicators */}
            {hasReports && (
            <Card className="shadow-sm border border-slate-200/60 bg-white/80 backdrop-blur-md transition-all hover:shadow-md">
              <CardHeader className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600"><TrendingUp className="h-4 w-4" /></div>
                  Performances (30J)
                </h3>
              </CardHeader>
              <CardContent className="pt-6">
                {performanceLoading ? (
                  <div className="animate-pulse space-y-6">
                    <div className="h-16 bg-slate-100 rounded-xl"></div>
                    <div className="h-16 bg-slate-100 rounded-xl"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Time tracking */}
                    <div className="group/metric">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 transition-colors group-hover/metric:bg-blue-100"><Clock className="w-4 h-4"/></div>
                          <span className="text-sm font-bold text-slate-700">Temps moyen</span>
                        </div>
                        <span className="text-sm font-black text-slate-900 group-hover/metric:text-blue-600 transition-colors">
                          {performanceMetrics?.avg_completion_time_hours 
                            ? (performanceMetrics.avg_completion_time_hours > 24 
                              ? `${(performanceMetrics.avg_completion_time_hours / 24).toFixed(1)} j`
                              : `${performanceMetrics.avg_completion_time_hours.toFixed(1)} h`)
                            : '-'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                        <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: performanceMetrics?.avg_completion_time_hours ? Math.min(100, (24 / performanceMetrics.avg_completion_time_hours) * 100) + '%' : '0%' }}>
                          <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-stripe_1s_linear_infinite]"></div>
                        </div>
                      </div>
                    </div>

                    {/* On time rate */}
                    <div className="group/metric">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 transition-colors group-hover/metric:bg-emerald-100"><CheckCircle className="w-4 h-4"/></div>
                          <span className="text-sm font-bold text-slate-700">Dans les délais</span>
                        </div>
                        <span className="text-sm font-black text-emerald-600 group-hover/metric:scale-110 transition-transform origin-right">
                          {performanceMetrics?.on_time_completion_rate ? `${performanceMetrics.on_time_completion_rate.toFixed(0)}%` : '-'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                        <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: performanceMetrics?.on_time_completion_rate ? `${performanceMetrics.on_time_completion_rate}%` : '0%' }}>
                          <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-stripe_1s_linear_infinite]"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            )}

          </div>
        </div>
      </div>
    </Layout>
  )
}

function WelcomeBanner({
  userName,
  isManagement,
  teams,
  selectedTeamId,
  setSelectedTeamId,
}: {
  userName: string
  isManagement: boolean
  teams: Team[]
  selectedTeamId?: number | string
  setSelectedTeamId: (id?: number | string) => void
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-8 sm:p-10 text-white shadow-float animate-slide-up"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(243 75% 48%) 40%, hsl(var(--accent)) 100%)',
      }}
    >
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl opacity-40" style={{ background: 'hsl(265 70% 80%)' }} />
      <div className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full blur-3xl opacity-30" style={{ background: 'hsl(213 94% 70%)' }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight lg:text-4xl drop-shadow-sm flex items-center gap-3">
            <span className="text-white">
              Bonjour, {userName}
            </span> 
            <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-3 text-[15px] font-medium text-white/90 max-w-xl leading-relaxed drop-shadow-sm">
            {isManagement
              ? "Voici un aperçu de l'activité globale et des performances de votre équipe."
              : "Voici un résumé de vos tâches et de votre activité récente."}
          </p>
        </div>

        {isManagement && (
          <div className="w-full md:w-auto">
            <div className="relative rounded-xl border border-white/30 bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] transition-all hover:bg-white/20">
              <select
                className="w-full appearance-none rounded-xl bg-transparent py-3 pl-4 pr-10 text-[14px] font-bold text-white focus:outline-none cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white"
                value={selectedTeamId || ''}
                onChange={(e) => setSelectedTeamId(e.target.value ? e.target.value : undefined)}
              >
                <option value="">Vue globale (Toutes les équipes)</option>
                {teams?.map(team => (
                  <option key={team.id} value={team.id}>Équipe : {team.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-white/80">
                <Globe className="h-4 w-4" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PlatformMetric({ icon: Icon, label, value, detail, alert = false, color }: { icon: typeof Building2; label: string; value: string | number; detail: string; alert?: boolean, color: string }) {
  const colorMap: Record<string, { icon: string; iconBg: string; stripe: string }> = {
    indigo: { icon: 'hsl(var(--primary))', iconBg: 'hsl(var(--primary) / 0.12)', stripe: 'hsl(var(--primary))' },
    emerald: { icon: 'hsl(var(--success))', iconBg: 'hsl(var(--success) / 0.12)', stripe: 'hsl(var(--success))' },
    rose: { icon: 'hsl(var(--destructive))', iconBg: 'hsl(var(--destructive) / 0.12)', stripe: 'hsl(var(--destructive))' },
    amber: { icon: 'hsl(var(--warning))', iconBg: 'hsl(var(--warning) / 0.12)', stripe: 'hsl(var(--warning))' },
  }
  const c = colorMap[color] ?? colorMap.indigo

  return (
    <Card
      hover
      className={`group relative overflow-hidden ${
        alert ? 'border-destructive/30' : ''
      }`}
    >
      {/* Accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{ background: c.stripe }}
      />
      <CardContent className="p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 truncate">{label}</p>
            <p
              className="text-[28px] font-black tracking-tight truncate leading-none"
              style={{ color: alert ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))' }}
            >
              {value}
            </p>
            <p className="mt-1.5 text-[12px] font-medium text-muted-foreground truncate">{detail}</p>
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: c.iconBg }}
          >
            <Icon className="h-5 w-5" style={{ color: c.icon }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const focusSectionConfig = [
  { key: 'overdue',     label: 'En retard',              borderColor: 'hsl(var(--destructive) / 0.25)', bg: 'hsl(var(--destructive) / 0.04)', badgeBg: 'hsl(var(--destructive) / 0.10)', badgeColor: 'hsl(var(--destructive))', dotColor: 'hsl(var(--destructive))' },
  { key: 'today',       label: "À faire aujourd'hui",    borderColor: 'hsl(var(--primary) / 0.25)',     bg: 'hsl(var(--primary) / 0.04)',     badgeBg: 'hsl(var(--primary) / 0.10)',     badgeColor: 'hsl(var(--primary))',     dotColor: 'hsl(var(--primary))' },
  { key: 'in_progress', label: 'En cours',               borderColor: 'hsl(var(--warning) / 0.25)',    bg: 'hsl(var(--warning) / 0.04)',    badgeBg: 'hsl(var(--warning) / 0.10)',    badgeColor: 'hsl(var(--warning))',    dotColor: 'hsl(var(--warning))' },
  { key: 'upcoming',    label: '7 prochains jours',      borderColor: 'hsl(var(--border))',             bg: 'hsl(var(--muted) / 0.50)',       badgeBg: 'hsl(var(--muted))',             badgeColor: 'hsl(var(--muted-foreground))', dotColor: 'hsl(var(--muted-foreground))' },
] as const

function DailyFocusPanel({ focus, loading, onOpen }: { focus?: Awaited<ReturnType<typeof dashboardService.getDailyFocus>>; loading: boolean; onOpen: (task: Task) => void }) {
  const priorityDot: Record<string, string> = {
    urgent: 'hsl(var(--destructive))',
    high:   'hsl(var(--warning))',
    normal: 'hsl(var(--primary))',
    low:    'hsl(var(--muted-foreground))',
  }

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
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: 'hsl(var(--primary) / 0.10)' }}
          >
            <CalendarDays className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-foreground tracking-tight">Ma journée</h2>
            <p className="text-[12px] text-muted-foreground">Les tâches qui demandent votre attention.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-32 skeleton" />
            <div className="h-32 skeleton" />
          </div>
        ) : sections.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {sections.map((section) => (
              <div
                key={section.label}
                className="relative rounded-2xl border p-5 transition-all duration-300 hover:shadow-md"
                style={{ borderColor: section.borderColor, background: `linear-gradient(180deg, ${section.bg} 0%, transparent 100%)` }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] shadow-sm"
                    style={{ background: section.badgeBg, color: section.badgeColor, border: `1px solid ${section.borderColor}` }}
                  >
                    <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: section.dotColor }} />
                    {section.label}
                  </span>
                  <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-white px-2 text-[12px] font-bold text-slate-600 shadow-sm border border-slate-200">
                    {section.tasks.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {section.tasks.slice(0, 4).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onOpen(task)}
                      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200/60 bg-white/80 backdrop-blur-sm px-4 py-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-indigo-300"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_8px_currentColor]"
                        style={{ background: priorityDot[task.priority] ?? priorityDot.low, color: priorityDot[task.priority] ?? priorityDot.low }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">
                        {task.title}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-indigo-600" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="rounded-xl border p-8 text-center flex flex-col items-center justify-center min-h-[180px]"
            style={{ borderColor: 'hsl(var(--success) / 0.25)', background: 'hsl(var(--success) / 0.05)' }}
          >
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'hsl(var(--success) / 0.12)' }}
            >
              <CheckCircle className="h-7 w-7" style={{ color: 'hsl(var(--success))' }} />
            </div>
            <p className="text-[15px] font-bold text-foreground">Rien d'urgent pour aujourd'hui</p>
            <p className="mt-1 text-[13px] text-muted-foreground">Vous êtes à jour sur vos priorités.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatCard({ title, value, icon, loading, accent }: { title: string; value: number; icon: React.ReactNode; loading: boolean; accent: string }) {
  const colorMap: Record<string, { stripe: string; iconBg: string }> = {
    indigo:  { stripe: 'hsl(var(--primary))',     iconBg: 'hsl(var(--primary) / 0.10)' },
    amber:   { stripe: 'hsl(var(--warning))',     iconBg: 'hsl(var(--warning) / 0.10)' },
    emerald: { stripe: 'hsl(var(--success))',     iconBg: 'hsl(var(--success) / 0.10)' },
    rose:    { stripe: 'hsl(var(--destructive))', iconBg: 'hsl(var(--destructive) / 0.10)' },
  }
  const c = colorMap[accent] ?? colorMap.indigo

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-lg">
      {/* Accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-2xl transition-all duration-300 group-hover:w-[6px]"
        style={{ background: c.stripe }}
      />
      {/* Soft gradient background on hover */}
      <div 
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-10 pointer-events-none"
        style={{ background: `linear-gradient(135deg, transparent 40%, ${c.stripe} 100%)` }}
      />
      <div className="pl-2 relative z-10">
        <CardHeader className="border-0 pb-0 pt-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-md"
              style={{ background: c.iconBg }}
            >
              {icon}
            </div>
            <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
          </div>
        </CardHeader>
        <CardContent className="pt-3 pb-5">
          {loading ? (
            <div className="h-10 w-24 skeleton rounded-lg" />
          ) : (
            <p className="text-[36px] font-black leading-none tracking-tighter text-foreground">
              {value}
            </p>
          )}
        </CardContent>
      </div>
    </Card>
  )
}

function ActivityItemCard({ item }: { item: ActivityItem }) {
  const getInitials = (name: string) =>
    name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()

  return (
    <div className="group relative flex items-start gap-3">
      {/* Timeline dot */}
      <div
        className="absolute -left-[23px] mt-3 h-2.5 w-2.5 rounded-full border-2 border-background transition-colors z-10"
        style={{ background: 'hsl(var(--border))' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--primary))')}
        onMouseLeave={e => (e.currentTarget.style.background = 'hsl(var(--border))')}
      />

      {/* Card */}
      <div className="flex-1 min-w-0 rounded-xl border border-slate-200/60 bg-white/80 backdrop-blur-sm p-3.5 transition-all duration-300 hover:bg-white hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 shadow-sm"
          >
            {getInitials(item.changed_by)}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-slate-600 leading-snug">
              <span className="font-bold text-slate-800">{item.changed_by}</span>{' '}
              a mis à jour{' '}
              <span
                className="inline rounded-md px-1.5 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-sm"
              >
                {(() => {
                  const fieldLabels: Record<string, string> = {
                    status: 'Statut',
                    priority: 'Priorité',
                    assigned_to: 'Assignation',
                    title: 'Titre',
                    description: 'Description',
                    due_date: 'Date d’échéance',
                    start_date: 'Date de début',
                    created: 'Création',
                    created_from_template: 'Créé depuis un modèle',
                    duplicated_from: 'Duplication',
                    restored: 'Restauration',
                    archived: 'Archivage',
                    team: 'Équipe',
                    parent: 'Tâche parente',
                    is_blocked: 'Blocage',
                    progress_percent: 'Progression',
                    estimated_hours: 'Temps estimé',
                  }
                  return fieldLabels[item.field_name] || item.field_name.replace(/_/g, ' ')
                })()}
              </span>
            </p>
            <p className="text-[13px] font-bold text-slate-900 truncate mt-1 group-hover:text-indigo-600 transition-colors">{item.task_title}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
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
