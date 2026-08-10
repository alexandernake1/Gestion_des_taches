import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { subscriptionsService } from '@/services/subscriptions'
import { authService } from '@/services/auth'
import { requireOwner } from '@/router/auth'
import { ErrorState } from '@/components/ui/ErrorState'
import { Check, ShieldAlert, Sparkles, Users, Layers, HardDrive, ReceiptText, XCircle, Clock3, ArrowLeft } from 'lucide-react'
import type { PaymentTransaction } from '@/domain/types'
import { useSmartBack } from '@/utils/navigation'

export const Route = createFileRoute('/subscription')({
  beforeLoad: requireOwner,
  component: SubscriptionPage,
})

const featureLabels: Record<string, string> = {
  audit_logs: 'Journal d’audit',
  custom_branding: 'Personnalisation de la marque',
  has_kanban_view: 'Vue Tableau Kanban',
  has_calendar_view: 'Vue Calendrier',
  has_timeline_view: 'Vue Chronologie / Gantt',
  has_reports: 'Rapports & Statistiques',
  has_exports: 'Export Excel des tâches',
  has_projects: 'Gestion de projets',
}

function normalizedPlanFeatures(flags: Record<string, boolean>) {
  const normalized = { ...flags }
  const aliases: Record<string, string[]> = {
    has_calendar_view: ['calendar_view'],
    has_kanban_view: ['kanban_view'],
    has_timeline_view: ['timeline_view'],
    has_reports: ['reports'],
    has_exports: ['advanced_export', 'exports'],
  }

  Object.entries(aliases).forEach(([canonical, legacyKeys]) => {
    const hasLegacyKey = legacyKeys.some((key) => key in flags)
    if (normalized[canonical] === undefined && hasLegacyKey) {
      normalized[canonical] = legacyKeys.some((key) => flags[key] === true)
    }
    legacyKeys.forEach((key) => delete normalized[key])
  })
  return Object.entries(normalized)
}

function SubscriptionPage() {
  const goBack = useSmartBack('/dashboard')
  const queryClient = useQueryClient()

  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
  })



  const isOwner = currentUser?.role === 'owner'

  const { data: subscription, isLoading: subLoading, isError: subError, refetch } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionsService.getMySubscription,
  })

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionsService.listPlans,
  })

  const [planChangeSuccess, setPlanChangeSuccess] = useState<string | null>(null)
  const [pendingPayment, setPendingPayment] = useState<PaymentTransaction | null>(null)
  const { data: payments = [] } = useQuery({
    queryKey: ['payment-history'],
    queryFn: subscriptionsService.paymentHistory,
    enabled: isOwner,
  })

  const changePlanMutation = useMutation({
    mutationFn: (planCode: string) => subscriptionsService.changePlan(planCode),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      setPlanChangeSuccess(`Forfait "${data?.plan_details?.name || 'nouveau'}" sélectionné — en attente de vérification.`)
      setTimeout(() => setPlanChangeSuccess(null), 6000)
    },
  })
  const startPaymentMutation = useMutation({
    mutationFn: subscriptionsService.startTestPayment,
    onSuccess: setPendingPayment,
  })
  const simulatePaymentMutation = useMutation({
    mutationFn: (outcome: PaymentTransaction['status'] | 'pending') =>
      subscriptionsService.simulatePayment(pendingPayment!.reference, outcome),
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payment-history'] })
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      if (payment.status !== 'pending') {
        setPendingPayment(null)
        setPlanChangeSuccess(
          payment.status === 'succeeded'
            ? `Paiement ${payment.reference} confirmé. Le forfait est actif.`
            : `Paiement ${payment.status === 'failed' ? 'refusé' : 'annulé'}. Vous pouvez réessayer.`,
        )
      }
    },
  })
  const choosePlan = (planCode: string, price: number) => {
    if (price === 0) changePlanMutation.mutate(planCode)
    else startPaymentMutation.mutate(planCode)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'success',
      trial: 'info',
      pending_verification: 'warning',
      past_due: 'warning',
      suspended: 'danger',
      cancelled: 'default',
    } as const
    const labels = {
      active: 'Actif',
      trial: 'Période d’essai',
      pending_verification: 'En attente',
      past_due: 'Paiement en retard',
      suspended: 'Suspendu',
      cancelled: 'Annulé',
    }
    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>{labels[status as keyof typeof labels] || status}</Badge>
  }

  if (isUserLoading) {
    return (
      <Layout title="Chargement...">
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </Layout>
    )
  }

  if (subLoading || plansLoading) {
    return (
      <Layout title="Abonnement & Offres">
        <div className="mx-auto max-w-7xl px-4 py-8 animate-pulse space-y-6">
          <div className="h-40 rounded-3xl bg-slate-200" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 rounded-3xl bg-slate-200" />
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  if (subError || !subscription) {
    return (
      <Layout title="Abonnement & Offres">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <ErrorState onRetry={() => refetch()} />
        </div>
      </Layout>
    )
  }

  const usersUsagePercent = subscription.effective_max_users > 0
    ? Math.min(100, Math.round((subscription.active_users_count / subscription.effective_max_users) * 100))
    : 0

  const teamsUsagePercent = subscription.effective_max_teams > 0
    ? Math.min(100, Math.round((subscription.active_teams_count / subscription.effective_max_teams) * 100))
    : 0

  return (
    <Layout title="Abonnement & Offres">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900" onClick={goBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">Abonnement & Offres SaaS</h2>
          <p className="mt-1 text-sm text-slate-500">Gérez le forfait de votre entreprise et suivez vos consommations de ressources.</p>
        </div>

        {planChangeSuccess && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 animate-in fade-in slide-in-from-top-4 duration-500">
            <Check className="h-6 w-6 text-emerald-600 shrink-0" />
            <p className="font-semibold text-sm">{planChangeSuccess}</p>
          </div>
        )}

        {subscription.is_suspended && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <ShieldAlert className="h-6 w-6 text-rose-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Abonnement suspendu</p>
              <p className="text-xs">L’accès en écriture de votre organisation est temporairement restreint. Veuillez contacter le support ou mettre à jour votre forfait.</p>
            </div>
          </div>
        )}

        {/* Current Subscription & Usage Card */}
        <Card className="overflow-hidden border-indigo-100 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white shadow-xl">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Offre Actuelle</span>
                  {getStatusBadge(subscription.status)}
                </div>
                <h3 className="mt-2 text-3xl font-extrabold text-white">{subscription.plan_details.name}</h3>
                <p className="mt-1 text-sm text-slate-300">{subscription.plan_details.description}</p>
                <div className="mt-4 text-2xl font-bold text-indigo-400">
                  {Number(subscription.plan_details.price) === 0 ? (
                    'Gratuit'
                  ) : (
                    <span>{Number(subscription.plan_details.price).toLocaleString('fr-FR')} FCFA <span className="text-xs font-normal text-slate-400">/ mois</span></span>
                  )}
                </div>
              </div>

              {/* Usage Metrics Gauges */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:w-1/2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                    <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-indigo-400" /> Comptes Utilisateurs</span>
                    <span className="font-bold text-white">
                      {subscription.active_users_count} / {subscription.effective_max_users === 0 ? '∞' : subscription.effective_max_users}
                    </span>
                  </div>
                  {subscription.effective_max_users > 0 && (
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div className={`h-full rounded-full transition-all ${usersUsagePercent >= 90 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${usersUsagePercent}%` }} />
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                    <span className="flex items-center gap-1.5"><Layers className="h-4 w-4 text-indigo-400" /> Équipes</span>
                    <span className="font-bold text-white">
                      {subscription.active_teams_count} / {subscription.effective_max_teams === 0 ? '∞' : subscription.effective_max_teams}
                    </span>
                  </div>
                  {subscription.effective_max_teams > 0 && (
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div className={`h-full rounded-full transition-all ${teamsUsagePercent >= 90 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${teamsUsagePercent}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plans Comparison Section */}
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-950">Comparer les forfaits disponibles</h3>
            <p className="text-sm text-slate-500">Choisissez l’offre adaptée aux besoins de votre entreprise.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {(Array.isArray(plans) ? plans : []).map((plan) => {
              const isCurrentPlan = subscription.plan_details.id === plan.id
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all duration-200 ${
                    isCurrentPlan ? 'border-indigo-600 ring-2 ring-indigo-600/20' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-[11px] font-bold text-white shadow-sm">
                      Forfait Actuel
                    </div>
                  )}

                  <div>
                    <h4 className="text-xl font-bold text-slate-900">{plan.name}</h4>
                    <p className="mt-2 text-xs text-slate-500 min-h-[36px]">{plan.description}</p>

                    <div className="mt-4 mb-6">
                      <span className="text-2xl font-extrabold text-slate-950">
                        {Number(plan.price) === 0 ? 'Gratuit' : `${Number(plan.price).toLocaleString('fr-FR')} FCFA`}
                      </span>
                      {Number(plan.price) > 0 && <span className="text-xs text-slate-400"> / mois</span>}
                    </div>

                    <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-4">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span><strong>{plan.max_users === 0 ? 'Utilisateurs illimités' : `Jusqu’à ${plan.max_users} utilisateurs`}</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span><strong>{plan.max_teams === 0 ? 'Équipes illimitées' : `Jusqu’à ${plan.max_teams} équipes`}</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>{plan.storage_limit_mb === 0 ? 'Stockage illimité' : `${plan.storage_limit_mb} Mo de stockage`}</span>
                      </li>
                      {normalizedPlanFeatures(plan.feature_flags).map(([key, enabled]) => {
                        const labelText = featureLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                        return (
                          <li key={key} className={`flex items-center gap-2 ${enabled ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                            <Sparkles className={`h-4 w-4 shrink-0 ${enabled ? 'text-amber-500' : 'text-slate-300'}`} />
                            <span>{labelText}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100">
                    {isCurrentPlan ? (
                      <Button variant="secondary" disabled className="w-full">
                        Offre active
                      </Button>
                    ) : (
                      <Button
                        disabled={!isOwner || changePlanMutation.isPending || startPaymentMutation.isPending}
                        onClick={() => choosePlan(plan.code, Number(plan.price))}
                        className="w-full"
                      >
                        {changePlanMutation.isPending || startPaymentMutation.isPending ? 'Préparation…' : Number(plan.price) > 0 ? 'Continuer vers le paiement' : 'Choisir cette offre'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <section>
          <div className="mb-4 flex items-center gap-3">
            <ReceiptText className="h-5 w-5 text-indigo-600" />
            <div><h3 className="font-bold text-slate-950">Historique des paiements</h3><p className="text-xs text-slate-500">Transactions de test et reçus associés.</p></div>
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr><th className="px-5 py-3">Référence</th><th className="px-5 py-3">Forfait</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Montant</th><th className="px-5 py-3">Statut</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-700">{payment.reference}</td>
                      <td className="px-5 py-4">{payment.plan_name}</td>
                      <td className="px-5 py-4 text-slate-500">{new Date(payment.created_at).toLocaleString('fr-FR')}</td>
                      <td className="px-5 py-4 font-semibold">{Number(payment.amount).toLocaleString('fr-FR')} {payment.currency}</td>
                      <td className="px-5 py-4"><PaymentBadge status={payment.status} /></td>
                    </tr>
                  ))}
                  {payments.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Aucune transaction enregistrée.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <Modal isOpen={pendingPayment !== null} onClose={() => setPendingPayment(null)} title="Simulateur de paiement">
          {pendingPayment && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Transaction</p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-900">{pendingPayment.reference}</p>
                <div className="mt-4 flex items-end justify-between"><span className="text-sm text-slate-500">{pendingPayment.plan_name}</span><strong className="text-2xl text-indigo-700">{Number(pendingPayment.amount).toLocaleString('fr-FR')} {pendingPayment.currency}</strong></div>
              </div>
              <p className="text-sm text-slate-600">Choisissez le résultat à simuler. Cela permet de tester tous les parcours avant l’intégration du prestataire réel.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Button onClick={() => simulatePaymentMutation.mutate('succeeded')} disabled={simulatePaymentMutation.isPending}><Check className="mr-2 h-4 w-4" />Réussir</Button>
                <Button variant="danger" onClick={() => simulatePaymentMutation.mutate('failed')} disabled={simulatePaymentMutation.isPending}><XCircle className="mr-2 h-4 w-4" />Refuser</Button>
                <Button variant="secondary" onClick={() => simulatePaymentMutation.mutate('cancelled')} disabled={simulatePaymentMutation.isPending}><Clock3 className="mr-2 h-4 w-4" />Annuler</Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  )
}

function PaymentBadge({ status }: { status: PaymentTransaction['status'] }) {
  const variants = { pending: 'warning', succeeded: 'success', failed: 'danger', cancelled: 'default' } as const
  const labels = { pending: 'En attente', succeeded: 'Réussi', failed: 'Refusé', cancelled: 'Annulé' }
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}
