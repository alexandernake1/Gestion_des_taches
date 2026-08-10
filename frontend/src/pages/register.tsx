import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Building2, Check, ChevronLeft, ChevronRight, CreditCard, ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'

import { authService } from '@/services/auth'
import { subscriptionsService } from '@/services/subscriptions'
import { redirectAuthenticatedUser } from '@/router/auth'
import type { CompanyRegistrationRequest } from '@/domain/types'

export const Route = createFileRoute('/register')({
  beforeLoad: redirectAuthenticatedUser,
  component: RegisterPage,
})

const initialForm: CompanyRegistrationRequest = {
  company_name: '',
  company_slug: '',
  website: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  plan_code: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  password_confirm: '',
  accept_terms: false,
}

function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [companyEmailError, setCompanyEmailError] = useState('')
  const [checkingCompanyEmail, setCheckingCompanyEmail] = useState(false)
  const [loading, setLoading] = useState(false)
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['public-subscription-plans'],
    queryFn: subscriptionsService.listPlans,
  })
  const selectedPlan = plans.find((plan) => plan.code === form.plan_code)

  const update = (field: keyof CompanyRegistrationRequest, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
    if (field === 'contact_email') setCompanyEmailError('')
  }

  const validateCompanyEmail = async () => {
    if (!form.contact_email) return false
    setCheckingCompanyEmail(true)
    try {
      const result = await authService.checkCompanyEmail(form.contact_email)
      const message = result.available ? '' : (result.message || "Cet email d'entreprise est déjà utilisé.")
      setCompanyEmailError(message)
      if (message) setError(message)
      return result.available
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de vérifier l'email de l'entreprise."
      setCompanyEmailError(message)
      setError(message)
      return false
    } finally {
      setCheckingCompanyEmail(false)
    }
  }

  const validateStep = () => {
    if (step === 1 && (!form.company_name || !form.contact_email || !form.contact_phone)) {
      setError('Renseignez le nom, l’email et le téléphone de l’entreprise.')
      return false
    }
    if (step === 2 && !form.plan_code) {
      setError('Choisissez un forfait pour continuer.')
      return false
    }
    return true
  }

  const next = async () => {
    if (!validateStep()) return
    if (step === 1 && !(await validateCompanyEmail())) return
    setStep((current) => Math.min(3, current + 1))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (form.password !== form.password_confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      await authService.register(form)
      navigate({ to: '/dashboard' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création de l’espace impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-surface min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <a href="/login" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <Building2 className="h-5 w-5 text-white" />
            </span>
            <span><strong className="block text-slate-950">Activity</strong><span className="text-xs text-slate-500">Espace entreprise</span></span>
          </a>
          <a href="/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">Se connecter</a>
        </header>

        <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 lg:grid-cols-[280px_1fr]">
          <aside className="bg-gradient-to-b from-slate-950 to-indigo-950 p-6 text-white sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">Création de votre espace</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight">Votre entreprise opérationnelle en quelques minutes.</h1>
            <div className="mt-8 space-y-5">
              <StepItem active={step === 1} done={step > 1} icon={Building2} number={1} title="Entreprise" />
              <StepItem active={step === 2} done={step > 2} icon={CreditCard} number={2} title="Forfait et paiement" />
              <StepItem active={step === 3} done={false} icon={UserRound} number={3} title="Compte propriétaire" />
            </div>
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-indigo-100">
              Le premier compte devient automatiquement propriétaire et représente l’entreprise auprès du fournisseur de la solution.
            </div>
          </aside>

          <form onSubmit={submit} className="p-6 sm:p-10">
            {error && <div role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

            {step === 1 && (
              <section className="animate-fade-in">
                <h2 className="text-2xl font-black tracking-tight text-slate-950">Informations de l’entreprise</h2>
                <p className="mt-2 text-sm text-slate-500">Ces informations identifient votre organisation et son contact principal.</p>
                <div className="mt-7 grid gap-6 sm:grid-cols-2">
                  <Field label="Nom de l’entreprise" required value={form.company_name} onChange={(value) => update('company_name', value)} />
                  <Field label="Identifiant de l'espace (URL)" helpText="Ex: 'mon-entreprise' (facultatif)" value={form.company_slug || ''} placeholder="mon-entreprise" onChange={(value) => update('company_slug', value)} />
                  
                  <div className="sm:col-span-2 border-t border-slate-100 pt-4 mt-2">
                    <p className="text-sm font-bold text-slate-700 mb-4">Coordonnées principales</p>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Field
                        label="Email de l'entreprise"
                        type="email"
                        required
                        value={form.contact_email}
                        error={companyEmailError}
                        onBlur={() => void validateCompanyEmail()}
                        onChange={(value) => update('contact_email', value)}
                      />
                      <Field label="Téléphone de contact" type="tel" required value={form.contact_phone} onChange={(value) => update('contact_phone', value)} />
                      <Field label="Adresse postale (Siège)" helpText="Où est située l'entreprise" value={form.address || ''} placeholder="123 Rue de Paris..." onChange={(value) => update('address', value)} />
                      <Field label="Site web" type="url" value={form.website || ''} placeholder="https://..." onChange={(value) => update('website', value)} />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="animate-fade-in">
                <h2 className="text-2xl font-black tracking-tight text-slate-950">Choisissez votre forfait</h2>
                <p className="mt-2 text-sm text-slate-500">Le paiement des offres payantes est simulé pendant la phase de test.</p>
                {plansLoading ? <div className="mt-7 h-48 animate-pulse rounded-2xl bg-slate-100" /> : (
                  <div className="mt-7 grid gap-4 sm:grid-cols-2">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => update('plan_code', plan.code)}
                        className={`relative rounded-2xl border p-5 text-left transition ${form.plan_code === plan.code ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/15' : 'border-slate-200 hover:border-indigo-300'}`}
                      >
                        {form.plan_code === plan.code && <Check className="absolute right-4 top-4 h-5 w-5 text-indigo-600" />}
                        <p className="font-bold text-slate-950">{plan.name}</p>
                        <p className="mt-2 text-2xl font-black text-indigo-700">{Number(plan.price) === 0 ? 'Gratuit' : `${Number(plan.price).toLocaleString('fr-FR')} FCFA`}</p>
                        <p className="mt-3 text-xs leading-5 text-slate-500">{plan.max_users === 0 ? 'Utilisateurs illimités' : `${plan.max_users} utilisateurs`} · {plan.max_teams === 0 ? 'Équipes illimitées' : `${plan.max_teams} équipes`}</p>
                      </button>
                    ))}
                  </div>
                )}
                {selectedPlan && Number(selectedPlan.price) > 0 && (
                  <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <ShieldCheck className="h-5 w-5 shrink-0" />
                    <div><strong>Paiement de test sécurisé</strong><p className="mt-1 text-xs leading-5">La transaction sera automatiquement approuvée par le simulateur. L’intégration Ligdicash remplacera ce mécanisme sans modifier le parcours.</p></div>
                  </div>
                )}
              </section>
            )}

            {step === 3 && (
              <section className="animate-fade-in">
                <h2 className="text-2xl font-black tracking-tight text-slate-950">Créez le compte propriétaire</h2>
                <p className="mt-2 text-sm text-slate-500">Ce compte pourra ensuite inviter les managers et employés.</p>
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <Field label="Prénom" required value={form.first_name} onChange={(value) => update('first_name', value)} />
                  <Field label="Nom" required value={form.last_name} onChange={(value) => update('last_name', value)} />
                  <Field label="Email (Identifiant)" type="email" helpText="Adresse utilisée pour la connexion" required value={form.email} onChange={(value) => update('email', value)} />
                  <Field label="Téléphone personnel" type="tel" value={form.phone || ''} onChange={(value) => update('phone', value)} />
                  <Field label="Mot de passe" type="password" required value={form.password} onChange={(value) => update('password', value)} />
                  <Field label="Confirmez le mot de passe" type="password" required value={form.password_confirm} onChange={(value) => update('password_confirm', value)} />
                </div>
                <label className="mt-6 flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={form.accept_terms} onChange={(event) => update('accept_terms', event.target.checked)} className="mt-0.5 accent-indigo-600 w-4 h-4" />
                  <span>J’accepte les conditions d’utilisation et confirme être autorisé à créer cet espace pour l’entreprise.</span>
                </label>
              </section>
            )}

            <footer className="mt-9 flex items-center justify-between border-t border-slate-100 pt-6">
              <button type="button" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 disabled:invisible">
                <ChevronLeft className="h-4 w-4" />Retour
              </button>
              {step < 3 ? (
                <button type="button" onClick={() => void next()} disabled={checkingCompanyEmail} className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60">
                  {checkingCompanyEmail ? 'Vérification…' : 'Continuer'}<ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={loading || !form.accept_terms} className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50">
                  {loading ? 'Création en cours…' : Number(selectedPlan?.price || 0) > 0 ? 'Payer et créer l’espace' : 'Créer l\'espace'}
                </button>
              )}
            </footer>
          </form>
        </div>
      </div>
    </main>
  )
}

function Field({ label, type = 'text', value, placeholder, required, helpText, error, onBlur, onChange }: { label: string; type?: string; value: string; placeholder?: string; required?: boolean; helpText?: string; error?: string; onBlur?: () => void; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">{label} {required && <span className="text-rose-500">*</span>}
      <input type={type} required={required} value={value} placeholder={placeholder} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} className={`mt-1.5 h-11 w-full rounded-xl border px-3 text-sm font-normal focus:ring-1 transition-colors ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500'}`} />
      {error ? <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p> : helpText && <p className="mt-1.5 text-xs text-slate-400 font-medium">{helpText}</p>}
    </label>
  )
}

function StepItem({ active, done, icon: Icon, number, title }: { active: boolean; done: boolean; icon: typeof Building2; number: number; title: string }) {
  return (
    <div className={`flex items-center gap-3 ${active || done ? 'text-white' : 'text-slate-500'}`}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${active ? 'border-indigo-400 bg-indigo-500' : done ? 'border-emerald-400 bg-emerald-500' : 'border-white/10 bg-white/5'}`}>
        {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </span>
      <span><span className="block text-[10px] font-bold uppercase tracking-wider">Étape {number}</span><strong className="text-sm">{title}</strong></span>
    </div>
  )
}
