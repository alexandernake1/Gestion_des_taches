import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, Clock3, ShieldCheck, UsersRound } from 'lucide-react'
import { authService } from '@/services/auth'
import { redirectAuthenticatedUser } from '@/router/auth'
import { CaptchaWidget } from '@/components/auth/CaptchaWidget'
import { isCaptchaEnabled } from '@/components/auth/config'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { TaskinaWordmark } from '@/components/brand/TaskinaBrand'
import { ApiError } from '@/utils/api'

export const Route = createFileRoute('/login')({
  beforeLoad: redirectAuthenticatedUser,
  component: LoginPage,
})

const promises = [
  {
    icon: Clock3,
    title: 'Le bon travail, au bon moment',
    description: 'Priorités, échéances et responsabilités restent lisibles.',
  },
  {
    icon: UsersRound,
    title: 'Une équipe vraiment alignée',
    description: 'Chacun sait ce qui avance, ce qui bloque et qui décide.',
  },
  {
    icon: ShieldCheck,
    title: 'Des validations qui laissent une trace',
    description: 'Les décisions importantes ne se perdent plus dans les messages.',
  },
]

function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [credentialError, setCredentialError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string>()
  const [captchaResetKey, setCaptchaResetKey] = useState(0)

  const redirectAfterLogin = useCallback((user: Awaited<ReturnType<typeof authService.getCurrentUser>>) => {
    if (user.must_change_password) navigate({ to: '/change-password' })
    else if (user.is_superuser && !user.company) navigate({ to: '/admin/companies' })
    else if (!user.company) navigate({ to: '/onboarding' })
    else navigate({ to: '/dashboard' })
  }, [navigate])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setCredentialError(false)
    if (isCaptchaEnabled && !captchaToken) {
      setError("Confirmez que vous n'êtes pas un robot.")
      return
    }
    setLoading(true)

    try {
      const response = await authService.login({ email, password, remember_me: rememberMe, captcha_token: captchaToken })
      queryClient.clear()
      redirectAfterLogin(response.user)
    } catch (err) {
      setCredentialError(err instanceof ApiError && err.code === 'invalid_credentials')
      setError(err instanceof Error ? err.message : 'Connexion impossible. Vérifiez vos identifiants.')
      setCaptchaResetKey((key) => key + 1)
      setLoading(false)
    }
  }

  const handleGoogleCredential = useCallback(async (credential: string) => {
    if (isCaptchaEnabled && !captchaToken) {
      setError("Confirmez que vous n'êtes pas un robot avant de continuer avec Google.")
      return
    }
    setError('')
    setLoading(true)
    try {
      const response = await authService.loginWithGoogle(credential, captchaToken, rememberMe)
      queryClient.clear()
      redirectAfterLogin(response.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion Google impossible.')
      setCaptchaResetKey((key) => key + 1)
    } finally {
      setLoading(false)
    }
  }, [captchaToken, queryClient, redirectAfterLogin, rememberMe])

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(480px,0.92fr)]">
      <section className="relative hidden min-h-screen overflow-hidden border-r border-border bg-[hsl(var(--primary-light))] px-10 py-9 lg:flex lg:flex-col xl:px-16 xl:py-12">
        <div className="absolute inset-y-0 right-[18%] w-px bg-primary/10" aria-hidden="true" />
        <div className="absolute inset-y-0 right-[18%] w-2 -translate-x-1/2 bg-accent/80" aria-hidden="true" />

        <TaskinaWordmark className="relative z-10" />

        <div className="relative z-10 my-auto max-w-[680px] py-16">
          <div className="mb-8 flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.22em] text-primary">
            <span className="h-2.5 w-2.5 bg-accent" />
            Le centre de travail de votre équipe
          </div>
          <h1 className="max-w-[620px] text-[clamp(3.2rem,5vw,5.5rem)] font-extrabold leading-[0.94] tracking-[-0.055em] text-foreground">
            Voir clair.
            <br />
            Décider vite.
            <br />
            <span className="text-primary">Avancer ensemble.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Taskina transforme les tâches dispersées en un rythme de travail simple, lisible et partagé.
          </p>

          <div className="mt-12 grid max-w-2xl gap-px overflow-hidden border-y border-primary/20 bg-primary/20 sm:grid-cols-3">
            {promises.map(({ icon: Icon, title, description }) => (
              <article key={title} className="bg-[hsl(var(--primary-light))] px-5 py-6 first:pl-0 sm:last:pr-0">
                <Icon className="mb-5 h-5 w-5 text-accent" strokeWidth={2.2} />
                <h2 className="text-sm font-extrabold leading-snug text-foreground">{title}</h2>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          <span>taskina.net</span>
          <span>Organiser · suivre · valider</span>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-card px-5 py-10 sm:px-10">
        <div className="w-full max-w-[410px] animate-slide-up">
          <TaskinaWordmark className="mb-14 lg:hidden" />

          <div className="mb-9">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-10 bg-accent" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent">Espace sécurisé</span>
            </div>
            <h2 className="text-[34px] font-extrabold leading-none tracking-[-0.04em] text-foreground">Bon retour.</h2>
            <p className="mt-3 text-sm text-muted-foreground">Connectez-vous pour reprendre là où vous vous êtes arrêté.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div id="login-error" role="alert" aria-live="assertive" className="flex items-start gap-3 border-l-4 border-destructive bg-destructive/5 px-4 py-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 bg-destructive" />
                <p className="text-[13px] font-semibold text-destructive">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-foreground">
                Adresse email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError('')
                  setCredentialError(false)
                }}
                aria-invalid={credentialError || undefined}
                aria-describedby={credentialError ? 'login-error' : undefined}
                placeholder="vous@organisation.com"
                className={`h-12 w-full rounded-lg border bg-background px-4 text-sm text-foreground shadow-none placeholder:text-muted-foreground/65 focus:outline-none focus:ring-2 ${credentialError ? 'border-destructive/60 focus:border-destructive focus:ring-destructive/15' : 'border-border focus:border-primary focus:ring-primary/15'}`}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="login-password" className="block text-[12px] font-extrabold uppercase tracking-[0.12em] text-foreground">Mot de passe</label>
                <a href="/forgot-password" className="text-xs font-bold text-primary hover:underline">Mot de passe oublié ?</a>
              </div>
              <PasswordInput
                id="login-password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError('')
                  setCredentialError(false)
                }}
                aria-invalid={credentialError || undefined}
                aria-describedby={credentialError ? 'login-error' : undefined}
                placeholder="••••••••"
                className={`h-12 w-full rounded-lg border bg-background px-4 text-sm text-foreground shadow-none placeholder:text-muted-foreground/65 focus:outline-none focus:ring-2 ${credentialError ? 'border-destructive/60 focus:border-destructive focus:ring-destructive/15' : 'border-border focus:border-primary focus:ring-primary/15'}`}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-[hsl(var(--primary))]"
              />
              <span>
                <strong className="font-bold text-foreground">Se souvenir de moi</strong>
                <span className="mt-0.5 block text-xs">Session maintenue pendant 7 jours sur cet appareil.</span>
              </span>
            </label>

            <CaptchaWidget onToken={setCaptchaToken} action="login" resetKey={captchaResetKey} />

            <button
              type="submit"
              id="login-submit"
              disabled={loading || (isCaptchaEnabled && !captchaToken)}
              className="group flex h-12 w-full items-center justify-between rounded-lg bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-cta transition-all hover:bg-[hsl(var(--primary-dark))] disabled:pointer-events-none disabled:opacity-60"
            >
              <span>{loading ? 'Connexion…' : 'Entrer dans Taskina'}</span>
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" />
          </div>
          <GoogleSignInButton onCredential={handleGoogleCredential} />

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6">
            <div>
              <p className="text-sm font-extrabold text-foreground">Nouveau sur Taskina ?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Votre premier espace est gratuit.</p>
            </div>
            <a href="/register" className="inline-flex shrink-0 items-center gap-2 text-sm font-extrabold text-primary hover:underline">
              Créer un compte <Check className="h-4 w-4 text-accent" />
            </a>
          </div>

          <p className="mt-10 text-center text-[11px] text-muted-foreground">
            <a href="/privacy" className="font-bold hover:text-primary hover:underline">Confidentialité</a>
            <span className="mx-2">·</span>
            <a href="/terms" className="font-bold hover:text-primary hover:underline">Conditions d’utilisation</a>
          </p>
        </div>
      </section>
    </main>
  )
}
