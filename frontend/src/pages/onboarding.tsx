import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Building2, Check, ChevronLeft, ChevronRight, CreditCard, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { authService } from '@/services/auth'
import { subscriptionsService } from '@/services/subscriptions'
import { ApiError } from '@/utils/api'
import { requireAuthentication } from '@/router/auth'
import type { CompanyOnboardingRequest, WorkspaceType } from '@/domain/types'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    const user = await requireAuthentication()
    if (user.company && !user.is_personal_workspace && !user.is_superuser) {
      throw redirect({ to: '/dashboard' })
    }
    return {
      title: user.is_personal_workspace
        ? 'Passer à une structure'
        : 'Configuration de votre espace',
      onboardingUser: user,
    }
  },
  component: OnboardingPage,
})

type OnboardingStep = 'usage' | 'plan' | 'company'

const initialForm: CompanyOnboardingRequest = {
  company_name: '',
  website: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  plan_code: '',
}

function OnboardingPage() {
  const { onboardingUser } = Route.useRouteContext()
  const isConvertingPersonalSpace = onboardingUser.is_personal_workspace
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [usageType, setUsageType] = useState<WorkspaceType | null>(
    isConvertingPersonalSpace ? 'company' : null,
  )
  const [step, setStep] = useState<OnboardingStep>(
    isConvertingPersonalSpace ? 'plan' : 'usage',
  )
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const { data: user = onboardingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
    initialData: onboardingUser,
  })
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['public-subscription-plans', usageType],
    queryFn: () => subscriptionsService.listPlans(usageType!),
    enabled: usageType !== null,
  })
  const selectedPlan = plans.find((plan) => plan.code === form.plan_code)

  const { data: quote } = useQuery({
    queryKey: ['onboarding-quote', form.plan_code],
    queryFn: () => subscriptionsService.getQuote(form.plan_code),
    enabled: Boolean(isConvertingPersonalSpace && form.plan_code && form.plan_code !== ''),
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (usageType === 'personal') {
        return authService.onboardPersonal({
          plan_code: form.plan_code,
        })
      }
      return authService.onboardCompany({
        ...form,
        contact_email: form.contact_email || user.email,
        contact_phone: form.contact_phone || user.phone || '',
      })
    },
    onSuccess: async (response) => {
      queryClient.setQueryData(['current-user'], response.user)
      await queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      navigate({ to: '/dashboard' })
    },
    onError: (err) => {
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors)
      setError(
        err instanceof Error
          ? err.message
          : "La configuration de l'espace a échoué.",
      )
    },
  })

  const update = (field: keyof CompanyOnboardingRequest, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
    setFieldErrors((current) => ({ ...current, [field]: [] }))
  }

  const selectUsage = (value: WorkspaceType) => {
    setUsageType(value)
    setForm((current) => ({ ...current, plan_code: '' }))
    setError('')
    setStep('plan')
  }

  const continueFromPlans = () => {
    if (!form.plan_code) {
      setError('Choisissez un forfait pour continuer.')
      return
    }
    setError('')
    if (usageType === 'personal') {
      mutation.mutate()
      return
    }
    setStep('company')
  }

  const goBackFromPlans = () => {
    if (isConvertingPersonalSpace) {
      navigate({ to: '/dashboard' })
      return
    }
    setUsageType(null)
    setStep('usage')
  }

  const logout = async () => {
    await authService.logout()
    navigate({ to: '/login' })
  }

  return (
    <main className="app-surface min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600">
              <UserRound className="h-5 w-5 text-white" />
            </span>
            <span>
              <strong className="block text-slate-950">Bienvenue {user.first_name}</strong>
              <span className="text-xs text-slate-500">
                {isConvertingPersonalSpace
                  ? 'Transformez votre espace personnel en structure'
                  : 'Votre compte est créé, choisissez maintenant votre usage'}
              </span>
            </span>
          </div>
          <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
            <LogOut className="h-4 w-4" />Se déconnecter
          </button>
        </header>

        <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 lg:grid-cols-[310px_1fr]">
          <aside className="bg-gradient-to-b from-slate-950 to-indigo-950 p-7 text-white sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
              {isConvertingPersonalSpace ? 'Évolution du compte' : 'Compte créé'}
            </p>
            <h1 className="mt-3 text-2xl font-black tracking-tight">
              {isConvertingPersonalSpace
                ? 'Passez au travail collaboratif quand vous le souhaitez.'
                : 'Un espace adapté à votre façon de travailler.'}
            </h1>
            <p className="mt-4 text-sm leading-6 text-indigo-100">
              {isConvertingPersonalSpace
                ? 'Vos tâches et vos projets seront conservés pendant la création de votre structure.'
                : usageType === 'company'
                ? 'Configurez votre structure pour inviter des collaborateurs et organiser le travail en équipe.'
                : 'Un compte personnel ne demande aucune information de structure. Vous pourrez créer une organisation plus tard sans perdre vos tâches.'}
            </p>
            <div className="mt-8 space-y-5">
              <Step active={false} done icon={UserRound} number={1} label="Compte utilisateur" />
              {!isConvertingPersonalSpace && (
                <Step active={step === 'usage'} done={step !== 'usage'} icon={UserRound} number={2} label="Type d'utilisation" />
              )}
              <Step active={step === 'plan'} done={step === 'company'} icon={CreditCard} number={isConvertingPersonalSpace ? 2 : 3} label="Forfait adapté" />
              {usageType === 'company' && (
                <Step active={step === 'company'} done={false} icon={Building2} number={isConvertingPersonalSpace ? 3 : 4} label="Structure" />
              )}
            </div>
          </aside>

          <section className="p-6 sm:p-10">
            {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

            {step === 'usage' && (
              <>
                <h2 className="text-2xl font-black text-slate-950">Comment souhaitez-vous utiliser Activity ?</h2>
                <p className="mt-2 text-sm text-slate-500">Ce choix adapte les forfaits et les fonctionnalités. Il pourra évoluer plus tard.</p>
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <UsageCard
                    icon={UserRound}
                    title="Usage personnel"
                    description="Gérez vos propres tâches, projets et échéances dans un espace strictement privé."
                    highlights={['Aucune structure requise', 'Organisation de vos tâches', 'Évolution possible plus tard']}
                    onClick={() => selectUsage('personal')}
                  />
                  <UsageCard
                    icon={Building2}
                    title="Usage en structure"
                    description="Pilotez une organisation, ses équipes, ses collaborateurs et ses validations."
                    highlights={['Gestion des équipes', 'Invitations de collaborateurs', 'Validation et pilotage']}
                    onClick={() => selectUsage('company')}
                  />
                </div>
              </>
            )}

            {step === 'plan' && (
              <>
                <h2 className="text-2xl font-black text-slate-950">
                  Forfaits {usageType === 'personal' ? 'personnels' : 'structure'}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Seules les offres compatibles avec votre type d’utilisation sont affichées.
                </p>
                {plansLoading ? (
                  <div className="mt-7 h-48 animate-pulse rounded-2xl bg-slate-100" />
                ) : plans.length === 0 ? (
                  <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Aucun forfait n’est actuellement disponible pour cet usage.</div>
                ) : (
                  <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => update('plan_code', plan.code)}
                        className={`relative rounded-2xl border p-5 text-left transition ${form.plan_code === plan.code ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/15' : 'border-slate-200 hover:border-indigo-300'}`}
                      >
                        {form.plan_code === plan.code && <Check className="absolute right-4 top-4 h-5 w-5 text-indigo-600" />}
                        <p className="pr-8 font-bold text-slate-950">{plan.name}</p>
                        <p className="mt-2 text-2xl font-black text-indigo-700">{Number(plan.price) === 0 ? 'Gratuit' : `${Number(plan.price).toLocaleString('fr-FR')} FCFA`}</p>
                        <p className="mt-3 min-h-10 text-xs leading-5 text-slate-500">{plan.description}</p>
                        <p className="mt-3 border-t border-slate-200 pt-3 text-xs font-semibold text-slate-600">
                          {usageType === 'personal'
                            ? 'Espace individuel et confidentiel'
                            : `${plan.max_users === 0 ? 'Utilisateurs illimités' : `${plan.max_users} utilisateurs`} · ${plan.max_teams === 0 ? 'Équipes illimitées' : `${plan.max_teams} équipes`}`}
                        </p>

                      </button>
                    ))}
                  </div>
                )}
                {quote && quote.credit_applied > 0 && (
                  <div className="mt-5 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-950">
                    <div className="flex items-center gap-2.5">
                      <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div>
                        <strong className="block text-emerald-900">Crédit prorata appliqué ({quote.prorata_details.remaining_days} j. restants)</strong>
                        <span className="text-xs text-emerald-700">Votre crédit personnel est automatiquement déduit du premier paiement de votre structure.</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs line-through text-slate-400">{Number(quote.gross_amount).toLocaleString('fr-FR')} FCFA</span>
                      <strong className="text-lg font-black text-emerald-800">{Number(quote.net_amount_due).toLocaleString('fr-FR')} FCFA</strong>
                    </div>
                  </div>
                )}
                {selectedPlan && Number(selectedPlan.price) > 0 && (
                  <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <ShieldCheck className="h-5 w-5 shrink-0" />
                    <div><strong>Paiement de test sécurisé</strong><p className="mt-1 text-xs">La transaction sera automatiquement approuvée dans cet environnement.</p></div>
                  </div>
                )}

                <footer className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                  <button type="button" onClick={goBackFromPlans} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ChevronLeft className="h-4 w-4" />Retour</button>
                  <button type="button" onClick={continueFromPlans} disabled={mutation.isPending || plans.length === 0} className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                    {mutation.isPending ? 'Création…' : usageType === 'personal' ? 'Accéder à mon espace' : 'Continuer'}
                    {!mutation.isPending && <ChevronRight className="h-4 w-4" />}
                  </button>
                </footer>
              </>
            )}

            {step === 'company' && (
              <form onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}>
                <h2 className="text-2xl font-black text-slate-950">Informations de la structure</h2>
                <p className="mt-2 text-sm text-slate-500">Ces informations activent les fonctions collaboratives. Vos tâches existantes seront conservées.</p>
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <Field label="Nom de la structure" required value={form.company_name} error={fieldErrors.company_name?.[0]} onChange={(value) => update('company_name', value)} />
                  <Field label="Email de contact" type="email" required value={form.contact_email || user.email} error={fieldErrors.contact_email?.[0]} onChange={(value) => update('contact_email', value)} />
                  <Field label="Téléphone de contact" type="tel" required value={form.contact_phone} error={fieldErrors.contact_phone?.[0]} onChange={(value) => update('contact_phone', value)} />
                  <Field label="Adresse" value={form.address || ''} error={fieldErrors.address?.[0]} onChange={(value) => update('address', value)} />
                  <Field label="Site web" type="url" value={form.website || ''} error={fieldErrors.website?.[0]} placeholder="https://…" onChange={(value) => update('website', value)} />
                </div>
                <footer className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                  <button type="button" onClick={() => setStep('plan')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ChevronLeft className="h-4 w-4" />Retour</button>
                  <button type="submit" disabled={mutation.isPending} className="h-11 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{mutation.isPending ? 'Création…' : isConvertingPersonalSpace ? "Créer ma structure" : "Créer la structure"}</button>
                </footer>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function UsageCard({ icon: Icon, title, description, highlights, onClick }: { icon: typeof UserRound; title: string; description: string; highlights: string[]; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group rounded-2xl border border-slate-200 p-6 text-left transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-lg">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white"><Icon className="h-6 w-6" /></span>
      <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <ul className="mt-5 space-y-2 text-xs font-semibold text-slate-600">
        {highlights.map((highlight) => <li key={highlight} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{highlight}</li>)}
      </ul>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-indigo-600">Choisir <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
    </button>
  )
}

function Field({ label, type = 'text', value, placeholder, required, error, onChange }: { label: string; type?: string; value: string; placeholder?: string; required?: boolean; error?: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-semibold text-slate-700">{label} {required && <span className="text-rose-500">*</span>}<input type={type} required={required} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={`mt-1.5 h-11 w-full rounded-xl border px-3 text-sm font-normal ${error ? 'border-rose-400' : 'border-slate-200 focus:border-indigo-500'}`} />{error && <p className="mt-1 text-xs text-rose-600">{error}</p>}</label>
}

function Step({ active, done, icon: Icon, number, label }: { active: boolean; done: boolean; icon: typeof UserRound; number: number; label: string }) {
  return <div className={`flex items-center gap-3 ${active || done ? 'text-white' : 'text-slate-500'}`}><span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${active ? 'border-indigo-400 bg-indigo-500' : done ? 'border-emerald-400 bg-emerald-500' : 'border-white/10 bg-white/5'}`}>{done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</span><span><span className="block text-[10px] font-bold uppercase tracking-wider">Étape {number}</span><strong className="text-sm">{label}</strong></span></div>
}
