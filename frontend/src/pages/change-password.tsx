import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { authService } from '@/services/auth'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/auth/PasswordInput'

export const Route = createFileRoute('/change-password')({
  beforeLoad: () => {
    if (!authService.isAuthenticated()) throw redirect({ to: '/login' })
  },
  component: ChangePasswordPage,
})

function ChangePasswordPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: authService.changePassword,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['current-user'] })
      navigate({ to: '/dashboard' })
    },
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    const newPassword = data.get('new_password') as string
    const confirmation = data.get('new_password_confirm') as string
    if (newPassword !== confirmation) {
      setError('Les nouveaux mots de passe ne correspondent pas.')
      return
    }
    mutation.mutate({
      old_password: data.get('old_password') as string,
      new_password: newPassword,
      new_password_confirm: confirmation,
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
          <KeyRound className="h-6 w-6 text-indigo-700" />
        </div>
        <h1 className="text-2xl font-bold text-slate-950">Choisissez votre mot de passe</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Pour sécuriser votre compte, le mot de passe temporaire doit être remplacé avant d’accéder à la plateforme.
        </p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label className="block text-sm font-medium text-slate-700">Mot de passe temporaire
            <PasswordInput name="old_password" required autoComplete="current-password" className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Nouveau mot de passe
            <PasswordInput name="new_password" required minLength={8} autoComplete="new-password" className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Confirmer le nouveau mot de passe
            <PasswordInput name="new_password_confirm" required minLength={8} autoComplete="new-password" className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
          </label>
          {(error || mutation.isError) && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error || (mutation.error instanceof Error ? mutation.error.message : 'Modification impossible.')}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Sécurisation…' : 'Enregistrer et continuer'}
          </Button>
        </form>
      </div>
    </div>
  )
}
