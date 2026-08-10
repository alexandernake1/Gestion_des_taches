import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { subscriptionsService } from '@/services/subscriptions'
import { requirePlatformAdmin } from '@/router/auth'
import { ErrorState } from '@/components/ui/ErrorState'
import { CircleDollarSign, RefreshCw, ShieldCheck, TimerReset, Edit2, ArrowLeft } from 'lucide-react'
import type { CompanySubscription } from '@/domain/types'
import { useSmartBack } from '@/utils/navigation'

export const Route = createFileRoute('/admin/subscriptions')({
  beforeLoad: requirePlatformAdmin,
  component: AdminSubscriptionsPage,
})

function AdminSubscriptionsPage() {
  const goBack = useSmartBack('/dashboard')
  const queryClient = useQueryClient()
  const { data: subscriptions, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: subscriptionsService.adminListSubscriptions,
  })

  const [selectedSub, setSelectedSub] = useState<CompanySubscription | null>(null)
  const [overrideValue, setOverrideValue] = useState<number | ''>('')
  
  const updateOverrideMutation = useMutation({
    mutationFn: (data: { id: string, seats_override: number | null }) =>
      subscriptionsService.adminUpdateSubscription(data.id, { seats_override: data.seats_override ?? undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      setSelectedSub(null)
    },
  })

  const handleOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSub) return
    updateOverrideMutation.mutate({
      id: selectedSub.id,
      seats_override: overrideValue === '' ? null : Number(overrideValue)
    })
  }

  const openOverrideModal = (sub: CompanySubscription) => {
    setSelectedSub(sub)
    setOverrideValue(sub.seats_override ?? '')
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
      trial: 'Essai',
      pending_verification: 'En attente',
      past_due: 'En retard',
      suspended: 'Suspendu',
      cancelled: 'Annulé',
    }
    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>{labels[status as keyof typeof labels] || status}</Badge>
  }

  if (isLoading) {
    return (
      <Layout title="Administration des Abonnements SaaS">
        <div className="mx-auto max-w-7xl px-4 py-8 animate-pulse space-y-4">
          <div className="h-8 w-64 rounded-xl bg-slate-200" />
          <div className="h-96 rounded-3xl bg-slate-200" />
        </div>
      </Layout>
    )
  }

  if (isError) {
    return (
      <Layout title="Administration des Abonnements SaaS">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <ErrorState onRetry={() => refetch()} />
        </div>
      </Layout>
    )
  }
  const activeCount = subscriptions?.filter((sub) => sub.status === 'active').length || 0
  const trialCount = subscriptions?.filter((sub) => sub.status === 'trial').length || 0
  const attentionCount = subscriptions?.filter((sub) => ['past_due', 'suspended', 'pending_verification'].includes(sub.status)).length || 0
  const revenue = subscriptions?.filter((sub) => sub.status === 'active').reduce((sum, sub) => sum + Number(sub.plan_details.price || 0), 0) || 0

  return (
    <Layout title="Administration des Abonnements SaaS">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900" onClick={goBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Espace Super-Admin</span>
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Abonnements des Entreprises Clients</h2>
          <p className="mt-1 text-sm text-slate-500">Surveillez le cycle de vie automatisé des abonnements, les paiements et les échéances de la plateforme.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <SubscriptionMetric icon={ShieldCheck} label="Actifs" value={activeCount} />
          <SubscriptionMetric icon={TimerReset} label="Essais" value={trialCount} />
          <SubscriptionMetric icon={RefreshCw} label="À surveiller" value={attentionCount} alert={attentionCount > 0} />
          <SubscriptionMetric icon={CircleDollarSign} label="Revenu estimé" value={`${revenue.toLocaleString('fr-FR')} F`} />
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <strong>Gestion automatisée :</strong> les statuts sont calculés à partir des paiements, fins d’essai et échéances. Le super-administrateur surveille les anomalies sans modifier manuellement le cycle d’abonnement.
        </div>

        <Card className="overflow-hidden border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Entreprise</th>
                  <th className="px-6 py-4">Forfait Actuel</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4">Utilisateurs</th>
                  <th className="px-6 py-4">Équipes</th>
                  <th className="px-6 py-4">Prochaine échéance</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions?.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{sub.company_name}</td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-indigo-600">{sub.plan_details?.name}</span>
                      <span className="block text-xs text-slate-400">{Number(sub.plan_details?.price).toLocaleString('fr-FR')} FCFA/mois</span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                    <td className="px-6 py-4 font-medium">
                      {sub.active_users_count} / {sub.effective_max_users === 0 ? '∞' : sub.effective_max_users}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {sub.active_teams_count} / {sub.effective_max_teams === 0 ? '∞' : sub.effective_max_teams}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {sub.ends_at ? new Date(sub.ends_at).toLocaleDateString('fr-FR') : sub.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleDateString('fr-FR') : 'Sans échéance'}
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="sm" onClick={() => openOverrideModal(sub)}>
                        <Edit2 className="h-4 w-4 text-slate-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {selectedSub && (
          <Modal isOpen={!!selectedSub} onClose={() => setSelectedSub(null)} title="Modifier les limites (Override)">
            <form onSubmit={handleOverrideSubmit} className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                Vous modifiez les limites pour <strong>{selectedSub.company_name}</strong>. Actuellement sur le forfait <strong>{selectedSub.plan_details.name}</strong> (Limite : {selectedSub.plan_details.max_users === 0 ? 'Illimité' : selectedSub.plan_details.max_users}).
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Limite personnalisée d'utilisateurs</label>
                <input
                  type="number"
                  min="0"
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Laissez vide pour utiliser la limite du forfait"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-400">Cette valeur remplacera la limite du forfait. Laissez vide pour retirer l'override.</p>
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setSelectedSub(null)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={updateOverrideMutation.isPending}>
                  {updateOverrideMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </Layout>
  )
}

function SubscriptionMetric({ icon: Icon, label, value, alert = false }: { icon: typeof ShieldCheck; label: string; value: string | number; alert?: boolean }) {
  return (
    <Card className={alert ? 'border-rose-200 bg-rose-50/50' : ''}>
      <div className="flex items-center gap-3 p-4">
        <div className={`rounded-xl p-2.5 ${alert ? 'bg-rose-100 text-rose-700' : 'bg-indigo-50 text-indigo-600'}`}><Icon className="h-5 w-5" /></div>
        <div><p className="text-xl font-black text-slate-950">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div>
      </div>
    </Card>
  )
}
