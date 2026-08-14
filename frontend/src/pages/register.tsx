import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, UserRound } from 'lucide-react'
import { useCallback, useState } from 'react'

import { CaptchaWidget } from '@/components/auth/CaptchaWidget'
import { isCaptchaEnabled } from '@/components/auth/config'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { redirectAuthenticatedUser } from '@/router/auth'
import { authService } from '@/services/auth'
import type { RegisterRequest } from '@/domain/types'
import { ApiError } from '@/utils/api'

export const Route = createFileRoute('/register')({
  beforeLoad: redirectAuthenticatedUser,
  component: RegisterPage,
})

const initialForm: RegisterRequest = {
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
  const [form, setForm] = useState(initialForm)
  const [captchaToken, setCaptchaToken] = useState<string>()
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  const update = (field: keyof RegisterRequest, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const continueAfterAuthentication = useCallback(() => {
    navigate({ to: '/onboarding' })
  }, [navigate])

  const handleGoogleCredential = useCallback(async (credential: string) => {
    if (!form.accept_terms) {
      setError("Acceptez les Conditions d'utilisation et consultez la Politique de confidentialité avant de continuer.")
      return
    }
    if (isCaptchaEnabled && !captchaToken) {
      setError("Confirmez que vous n'êtes pas un robot avant de continuer avec Google.")
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await authService.loginWithGoogle(credential, captchaToken, false, form.accept_terms)
      navigate({ to: response.user.company ? '/dashboard' : '/onboarding' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion Google impossible.')
      setCaptchaResetKey((key) => key + 1)
    } finally {
      setLoading(false)
    }
  }, [captchaToken, form.accept_terms, navigate])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (form.password !== form.password_confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (isCaptchaEnabled && !captchaToken) {
      setError("Confirmez que vous n'êtes pas un robot.")
      return
    }
    setLoading(true)
    try {
      await authService.register({ ...form, captcha_token: captchaToken })
      continueAfterAuthentication()
    } catch (err) {
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors)
      setError(err instanceof Error ? err.message : 'Création du compte impossible.')
      setCaptchaResetKey((key) => key + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-surface min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <a href="/login" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20"><UserRound className="h-5 w-5 text-white" /></span>
            <span><strong className="block text-slate-950">Activity</strong><span className="text-xs text-slate-500">Votre espace personnel</span></span>
          </a>
          <a href="/login" className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50">Se connecter</a>
        </header>

        <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 lg:grid-cols-[300px_1fr]">
          <aside className="bg-gradient-to-b from-slate-950 to-indigo-950 p-7 text-white sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">Compte gratuit</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Commencez par votre espace.</h1>
            <p className="mt-4 text-sm leading-6 text-indigo-100">La création d'une entreprise est facultative. Vous pourrez choisir un forfait et configurer votre organisation ensuite.</p>
            <div className="mt-8 space-y-4 text-sm text-indigo-50">
              {['Compte créé immédiatement', 'Entreprise facultative', 'Forfait choisi dans un second temps'].map((label) => (
                <div key={label} className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-400" />{label}</div>
              ))}
            </div>
          </aside>

          <form onSubmit={submit} className="p-6 sm:p-10">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Créer mon compte gratuitement</h2>
            <p className="mt-2 text-sm text-slate-500">Aucune information d'entreprise n'est demandée à cette étape.</p>
            {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <Field name="first_name" label="Prénom" required value={form.first_name} error={fieldErrors.first_name?.[0]} onChange={(value) => update('first_name', value)} />
              <Field name="last_name" label="Nom" required value={form.last_name} error={fieldErrors.last_name?.[0]} onChange={(value) => update('last_name', value)} />
              <Field name="email" label="Adresse email" type="email" required value={form.email} error={fieldErrors.email?.[0]} onChange={(value) => update('email', value)} />
              <Field name="phone" label="Téléphone" type="tel" value={form.phone || ''} error={fieldErrors.phone?.[0]} onChange={(value) => update('phone', value)} />
              <Field name="password" label="Mot de passe" type="password" required value={form.password} error={fieldErrors.password?.[0]} onChange={(value) => update('password', value)} />
              <Field name="password_confirm" label="Confirmation" type="password" required value={form.password_confirm} error={fieldErrors.password_confirm?.[0]} onChange={(value) => update('password_confirm', value)} />
            </div>

            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-600 hover:bg-slate-50">
              <input type="checkbox" checked={form.accept_terms} onChange={(event) => update('accept_terms', event.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-600" />
              <span>
                J'accepte les{' '}
                <a href="/terms" target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="font-bold text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900">
                  Conditions d'utilisation
                </a>{' '}
                et je reconnais avoir pris connaissance de la{' '}
                <a href="/privacy" target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="font-bold text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900">
                  Politique de confidentialité
                </a>.
              </span>
            </label>
            <div className="mt-5"><CaptchaWidget onToken={setCaptchaToken} action="register" resetKey={captchaResetKey} /></div>

            <button type="submit" disabled={loading || !form.accept_terms || (isCaptchaEnabled && !captchaToken)} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Création en cours…' : <>Créer mon compte <ArrowRight className="h-4 w-4" /></>}
            </button>

            <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />ou<span className="h-px flex-1 bg-slate-200" /></div>
            <GoogleSignInButton onCredential={handleGoogleCredential} />
          </form>
        </div>
      </div>
    </main>
  )
}

function Field({ name, label, type = 'text', value, required, error, onChange }: { name: string; label: string; type?: string; value: string; required?: boolean; error?: string; onChange: (value: string) => void }) {
  const inputClassName = `mt-1.5 h-11 w-full rounded-xl border px-3 text-sm font-normal focus:ring-1 ${error ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'}`
  return (
    <label htmlFor={name} className="block text-sm font-semibold text-slate-700">{label} {required && <span className="text-rose-500">*</span>}
      {type === 'password' ? (
        <PasswordInput id={name} name={name} required={required} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={error ? true : undefined} autoComplete="new-password" className={inputClassName} />
      ) : (
        <input id={name} name={name} type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={error ? true : undefined} className={inputClassName} />
      )}
      {error && <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </label>
  )
}
