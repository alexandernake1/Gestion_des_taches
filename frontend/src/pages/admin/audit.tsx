import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Building2, ClipboardList, Filter, ScrollText, UserRound } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { companiesService } from '@/services/companies'
import { requirePlatformAdmin } from '@/router/auth'
import { useSmartBack } from '@/utils/navigation'
import { useState } from 'react'

export const Route = createFileRoute('/admin/audit')({
  beforeLoad: requirePlatformAdmin,
  component: PlatformAuditPage,
})

const categoryLabels: Record<string, string> = {
  company: 'Entreprise',
  plan: 'Forfait',
  subscription: 'Abonnement',
  announcement: 'Annonce',
}

function PlatformAuditPage() {
  const goBack = useSmartBack('/admin/companies')
  const [category, setCategory] = useState('')
  const [company, setCompany] = useState('')
  const { data: companies = [] } = useQuery({ queryKey: ['admin-companies'], queryFn: companiesService.listCompanies })
  const { data: entries = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['platform-audit-log', category, company],
    queryFn: () => companiesService.getPlatformAuditLog({
      category: category || undefined,
      company: company || undefined,
    }),
  })

  return (
    <Layout title="Journal d'audit">
      <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900" onClick={goBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />Retour
        </Button>
        <section className="rounded-3xl border border-amber-100 bg-gradient-to-br from-white via-amber-50/60 to-orange-50 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-800"><ScrollText className="h-6 w-6" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Gouvernance de la plateforme</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Journal d’audit super-admin</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Historique lisible des actions sensibles réalisées dans l’administration SaaS. Les données des entreprises restent isolées.</p>
            </div>
          </div>
        </section>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">Type d’action
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">
              <option value="">Toutes les actions</option>
              {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">Entreprise concernée
            <select value={company} onChange={(event) => setCompany(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">
              <option value="">Toutes les entreprises</option>
              {companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>

        {isError ? <ErrorState onRetry={() => refetch()} /> : isLoading ? (
          <div className="space-y-3 animate-pulse">{[1, 2, 3].map((item) => <div key={item} className="h-24 rounded-2xl bg-slate-100" />)}</div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500">
            <Filter className="mx-auto mb-3 h-7 w-7 text-slate-400" />Aucune action ne correspond aux filtres sélectionnés.
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="warning">{categoryLabels[entry.category] || entry.category}</Badge>
                      <h2 className="truncate font-bold text-slate-900">{entry.entity_label || entry.action}</h2>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{entry.actor_name || 'Système'}</span>
                      {entry.company_name && <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{entry.company_name}</span>}
                      <span className="inline-flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" />{formatAction(entry.action)}</span>
                    </div>
                  </div>
                  <time className="shrink-0 text-xs font-medium text-slate-400">{new Date(entry.created_at).toLocaleString('fr-FR')}</time>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ').replace(/^./, (letter: string) => letter.toUpperCase())
}
