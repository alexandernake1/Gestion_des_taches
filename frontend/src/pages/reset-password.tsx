import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { KeyRound } from 'lucide-react'
import { useState } from 'react'

import { redirectAuthenticatedUser } from '@/router/auth'
import { authService } from '@/services/auth'
import { PasswordInput } from '@/components/auth/PasswordInput'

export const Route = createFileRoute('/reset-password')({
  beforeLoad: redirectAuthenticatedUser,
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const params = new URLSearchParams(window.location.search)
  const uid = params.get('uid') || ''
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password !== confirmation) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await authService.confirmPasswordReset({ uid, token, new_password: password, new_password_confirm: confirmation })
      navigate({ to: '/login' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Réinitialisation impossible.')
    } finally {
      setLoading(false)
    }
  }

  const invalidLink = !uid || !token
  return <main className="app-surface flex min-h-screen items-center justify-center px-4 py-10"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><KeyRound className="h-6 w-6" /></div><h1 className="mt-5 text-2xl font-black text-slate-950">Nouveau mot de passe</h1>{invalidLink ? <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Ce lien est incomplet. Demandez un nouveau lien de réinitialisation.</div> : <form onSubmit={submit} className="mt-6 space-y-5">{error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}<label className="block text-sm font-semibold text-slate-700">Nouveau mot de passe<PasswordInput required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal focus:border-indigo-500" /></label><label className="block text-sm font-semibold text-slate-700">Confirmation<PasswordInput required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal focus:border-indigo-500" /></label><button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}</button></form>}<a href="/login" className="mt-6 inline-block text-sm font-bold text-indigo-600">Retour à la connexion</a></section></main>
}
