import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { subscriptionsService } from '@/services/subscriptions'
import { requirePlatformAdmin } from '@/router/auth'
import { ErrorState } from '@/components/ui/ErrorState'
import { Package, Plus, Settings2, Power, PowerOff, ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import type { SubscriptionPlan } from '@/domain/types'
import { useSmartBack } from '@/utils/navigation'

export const Route = createFileRoute('/admin/plans')({
  beforeLoad: requirePlatformAdmin,
  component: AdminPlansPage,
})

function AdminPlansPage() {
  const goBack = useSmartBack('/dashboard')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  
  const queryClient = useQueryClient()
  const { data: plans, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: subscriptionsService.adminListPlans,
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (plan: SubscriptionPlan) =>
      subscriptionsService.adminUpdatePlan(plan.id, { is_active: !plan.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-plans'] }),
  })

  const handleEdit = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan)
    setModalOpen(true)
  }

  const handleCreate = () => {
    setSelectedPlan(null)
    setModalOpen(true)
  }

  if (isLoading) {
    return (
      <Layout title="Forfaits SaaS">
        <div className="mx-auto max-w-7xl px-4 py-8 animate-pulse space-y-4">
          <div className="h-8 w-64 rounded-xl bg-slate-200" />
          <div className="h-96 rounded-3xl bg-slate-200" />
        </div>
      </Layout>
    )
  }

  if (isError) {
    return (
      <Layout title="Forfaits SaaS">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <ErrorState onRetry={() => refetch()} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Forfaits SaaS">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900" onClick={goBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Espace Super-Admin</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Catalogue des Forfaits</h2>
            <p className="mt-1 text-sm text-slate-500">Gérez les offres, leurs limites et leur tarification.</p>
          </div>
          <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Forfait
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {plans?.map((plan) => (
            <Card key={plan.id} className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${plan.is_active ? 'border-indigo-100' : 'border-slate-200 opacity-75'}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.is_active ? 'bg-indigo-50' : 'bg-slate-100'}`}>
                    <Package className={`h-5 w-5 ${plan.is_active ? 'text-indigo-600' : 'text-slate-400'}`} />
                  </div>
                  <Badge variant={plan.is_active ? 'success' : 'default'} className="uppercase tracking-wider text-[10px]">
                    {plan.is_active ? 'Actif' : 'Désactivé'}
                  </Badge>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <p className="text-xs font-medium text-slate-500 mb-4">Code : <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">{plan.code}</code></p>
                
                <div className="mb-4">
                  <span className="text-2xl font-black text-slate-900">{Number(plan.price).toLocaleString('fr-FR')} F</span>
                  <span className="text-sm font-medium text-slate-500"> / {plan.billing_period === 'monthly' ? 'mois' : 'an'}</span>
                </div>

                <div className="space-y-2 text-sm text-slate-600 mb-6">
                  <div className="flex items-center justify-between">
                    <span>Utilisateurs max</span>
                    <strong className="font-semibold">{plan.max_users === 0 ? 'Illimité' : plan.max_users}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Équipes max</span>
                    <strong className="font-semibold">{plan.max_teams === 0 ? 'Illimité' : plan.max_teams}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Vues incluses</span>
                    <strong className="font-semibold text-right">
                      Liste
                      {plan.feature_flags?.has_kanban_view !== false && ', Kanban'}
                      {plan.feature_flags?.has_calendar_view && ', Calendrier'}
                      {plan.feature_flags?.has_timeline_view && ', Chronologie'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Outils d'analyse</span>
                    <strong className="font-semibold text-right">
                      {plan.feature_flags?.has_reports ? 'Bilans / Rapports' : '-'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Exports (CSV/Excel)</span>
                    <strong className="font-semibold text-right">
                      {plan.feature_flags?.has_exports ? 'Inclus' : 'Non inclus'}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(plan)} className="flex-1">
                    <Settings2 className="mr-2 h-4 w-4" /> Modifier
                  </Button>
                  <Button 
                    variant={plan.is_active ? 'danger' : 'secondary'} 
                    size="sm" 
                    onClick={() => toggleStatusMutation.mutate(plan)}
                    className="px-3"
                    title={plan.is_active ? 'Désactiver' : 'Activer'}
                  >
                    {plan.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <PlanModal
        isOpen={modalOpen}
        plan={selectedPlan}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false)
          refetch()
        }}
      />
    </Layout>
  )
}

function PlanModal({ isOpen, plan, onClose, onSuccess }: { isOpen: boolean; plan: SubscriptionPlan | null; onClose: () => void; onSuccess: () => void }) {
  const mutation = useMutation({
    mutationFn: (data: Partial<SubscriptionPlan>) =>
      plan ? subscriptionsService.adminUpdatePlan(plan.id, data) : subscriptionsService.adminCreatePlan(data as SubscriptionPlan),
    onSuccess,
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    
    mutation.mutate({
      name: data.get('name') as string,
      code: data.get('code') as string,
      description: data.get('description') as string,
      price: Number(data.get('price')),
      billing_period: data.get('billing_period') as 'monthly' | 'yearly',
      max_users: Number(data.get('max_users')),
      max_teams: Number(data.get('max_teams')),
      storage_limit_mb: plan?.storage_limit_mb ?? 500, // On garde une valeur par défaut pour l'API
      feature_flags: {
        ...plan?.feature_flags,
        has_kanban_view: data.get('has_kanban_view') === 'on',
        has_calendar_view: data.get('has_calendar_view') === 'on',
        has_timeline_view: data.get('has_timeline_view') === 'on',
        has_reports: data.get('has_reports') === 'on',
        has_exports: data.get('has_exports') === 'on',
        custom_branding: data.get('custom_branding') === 'on',
        audit_logs: data.get('audit_logs') === 'on',
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={plan ? 'Modifier le forfait' : 'Nouveau forfait'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {mutation.isError && (
          <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
            Une erreur est survenue. Vérifiez les informations.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">Nom du forfait *</label>
            <input id="name" name="name" defaultValue={plan?.name} required className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label htmlFor="code" className="mb-1 block text-sm font-medium text-slate-700">Code unique *</label>
            <input id="code" name="code" defaultValue={plan?.code} required className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea id="description" name="description" defaultValue={plan?.description || ''} rows={2} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="price" className="mb-1 block text-sm font-medium text-slate-700">Prix (FCFA) *</label>
            <input id="price" name="price" type="number" step="0.01" min="0" defaultValue={plan?.price || 0} required className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label htmlFor="billing_period" className="mb-1 block text-sm font-medium text-slate-700">Période de facturation *</label>
            <select id="billing_period" name="billing_period" defaultValue={plan?.billing_period || 'monthly'} required className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
              <option value="monthly">Mensuel</option>
              <option value="yearly">Annuel</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="max_users" className="mb-1 block text-sm font-medium text-slate-700">Utilisateurs max (0 = ∞) *</label>
            <input id="max_users" name="max_users" type="number" min="0" defaultValue={plan?.max_users ?? 5} required className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label htmlFor="max_teams" className="mb-1 block text-sm font-medium text-slate-700">Équipes max (0 = ∞) *</label>
            <input id="max_teams" name="max_teams" type="number" min="0" defaultValue={plan?.max_teams ?? 2} required className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <h4 className="text-sm font-bold text-slate-900">Vues et Fonctionnalités autorisées</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="has_kanban_view" defaultChecked={plan?.feature_flags?.has_kanban_view ?? true} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4" />
              <span className="text-sm font-medium text-slate-700">Vue Kanban</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="has_calendar_view" defaultChecked={plan?.feature_flags?.has_calendar_view ?? false} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4" />
              <span className="text-sm font-medium text-slate-700">Vue Calendrier</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="has_timeline_view" defaultChecked={plan?.feature_flags?.has_timeline_view ?? false} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4" />
              <span className="text-sm font-medium text-slate-700">Vue Chronologie</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="has_reports" defaultChecked={plan?.feature_flags?.has_reports ?? false} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4" />
              <span className="text-sm font-medium text-slate-700">Bilans et Rapports</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="has_exports" defaultChecked={plan?.feature_flags?.has_exports ?? false} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4" />
              <span className="text-sm font-medium text-slate-700">Exports de données</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="custom_branding" defaultChecked={plan?.feature_flags?.custom_branding ?? false} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4" />
              <span className="text-sm font-medium text-slate-700">Personnalisation marque</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="audit_logs" defaultChecked={plan?.feature_flags?.audit_logs ?? false} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4" />
              <span className="text-sm font-medium text-slate-700">Journal d'audit</span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Annuler
          </Button>
          <Button type="submit" disabled={mutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
            {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
