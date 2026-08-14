import { createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, Mail } from 'lucide-react'
import { useState } from 'react'

import { CaptchaWidget } from '@/components/auth/CaptchaWidget'
import { isCaptchaEnabled } from '@/components/auth/config'
import { redirectAuthenticatedUser } from '@/router/auth'
import { authService } from '@/services/auth'

export const Route = createFileRoute('/forgot-password')({
  beforeLoad: redirectAuthenticatedUser,
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string>()
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isCaptchaEnabled && !captchaToken) {
      setError("Confirmez que vous n'êtes pas un robot.")
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await authService.requestPasswordReset(email, captchaToken)
      setMessage(response.detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer la demande.")
      setCaptchaResetKey((key) => key + 1)
    } finally {
      setLoading(false)
    }
  }

  return <main className="app-surface flex min-h-screen items-center justify-center px-4 py-10"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Mail className="h-6 w-6" /></div><h1 className="mt-5 text-2xl font-black text-slate-950">Mot de passe oublié</h1><p className="mt-2 text-sm leading-6 text-slate-500">Saisissez votre adresse email. Si un compte correspond, vous recevrez un lien sécurisé.</p>{message ? <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : <form onSubmit={submit} className="mt-6 space-y-5">{error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}<label className="block text-sm font-semibold text-slate-700">Adresse email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal focus:border-indigo-500" /></label><CaptchaWidget onToken={setCaptchaToken} action="password_reset" resetKey={captchaResetKey} /><button type="submit" disabled={loading || (isCaptchaEnabled && !captchaToken)} className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{loading ? 'Envoi…' : 'Envoyer le lien'}</button></form>}<a href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-indigo-600"><ArrowLeft className="h-4 w-4" />Retour à la connexion</a></section></main>
}
