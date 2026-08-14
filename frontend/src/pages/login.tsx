import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { Building2, ArrowRight, Zap, BarChart3, Users } from 'lucide-react'
import { authService } from '@/services/auth'
import { redirectAuthenticatedUser } from '@/router/auth'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { CaptchaWidget } from '@/components/auth/CaptchaWidget'
import { isCaptchaEnabled } from '@/components/auth/config'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { PasswordInput } from '@/components/auth/PasswordInput'

export const Route = createFileRoute('/login')({
  beforeLoad: redirectAuthenticatedUser,
  component: LoginPage,
})

const features = [
  {
    icon: Zap,
    title: 'Suivi en temps réel',
    description: 'Suivez l\'avancement de toutes vos tâches instantanément.',
  },
  {
    icon: Users,
    title: 'Collaboration d\'équipe',
    description: 'Responsabilités clairement définies pour chaque membre.',
  },
  {
    icon: BarChart3,
    title: 'Décisions éclairées',
    description: 'Analytics et métriques de performance intégrées.',
  },
]

function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string>()
  const [captchaResetKey, setCaptchaResetKey] = useState(0)

  const redirectAfterLogin = useCallback((user: Awaited<ReturnType<typeof authService.getCurrentUser>>) => {
    if (user.must_change_password) navigate({ to: '/change-password' })
    else if (user.is_superuser && !user.company) navigate({ to: '/admin/companies' })
    else if (!user.company) navigate({ to: '/onboarding' })
    else navigate({ to: '/dashboard' })
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (isCaptchaEnabled && !captchaToken) {
      setError("Confirmez que vous n'êtes pas un robot.")
      return
    }
    setLoading(true)

    try {
      const response = await authService.login({ email, password, remember_me: rememberMe, captcha_token: captchaToken })
      queryClient.clear() // Clear cache from any previous sessions
      redirectAfterLogin(response.user)
    } catch (err) {
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
    <div className="grid min-h-screen lg:grid-cols-2" style={{ background: 'hsl(var(--background))' }}>

      {/* ── Left panel ─────────────────────────────────────── */}
      <div
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between p-10 xl:p-14"
        style={{ background: 'hsl(228 40% 7%)' }}
      >
        {/* Ambient orbs */}
        <div
          className="pointer-events-none absolute -top-40 -left-20 h-96 w-96 rounded-full blur-3xl opacity-30"
          style={{ background: 'hsl(var(--primary))' }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full blur-3xl opacity-20"
          style={{ background: 'hsl(var(--accent))' }}
        />

        {/* Grid pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3 animate-slide-up">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shadow-cta"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
            }}
          >
            <Building2 className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[15px] font-bold text-white leading-tight">Activity Control</p>
            <p className="text-[11px] font-medium" style={{ color: 'hsl(228 20% 55%)' }}>
              Centre de pilotage d'entreprise
            </p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative animate-slide-up" style={{ animationDelay: '80ms' }}>
          <div
            className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={{
              borderColor: 'hsl(var(--primary) / 0.30)',
              background: 'hsl(var(--primary) / 0.10)',
              color: 'hsl(var(--primary))',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'hsl(var(--primary))' }} />
            Travaillez avec clarté
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-[1.15] tracking-tight text-white xl:text-5xl">
            Toute l'activité de votre équipe,{' '}
            <span className="text-gradient-primary">enfin au même endroit.</span>
          </h1>

          {/* Feature items */}
          <div className="space-y-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="flex items-start gap-4 animate-slide-up"
                style={{ animationDelay: `${160 + i * 60}ms` }}
              >
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'hsl(var(--primary) / 0.15)' }}
                >
                  <f.icon className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-white">{f.title}</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'hsl(228 15% 55%)' }}>
                    {f.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p
          className="relative text-xs animate-fade-in"
          style={{ color: 'hsl(228 15% 40%)', animationDelay: '400ms' }}
        >
          Une plateforme simple pour des équipes performantes.
        </p>
      </div>

      {/* ── Right panel — Form ──────────────────────────────── */}
      <div className="flex items-center justify-center px-5 py-12 sm:px-8 xl:px-12">
        <div className="w-full max-w-[400px] animate-slide-up">

          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
              }}
            >
              <Building2 className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-[15px] font-bold text-foreground">Activity Control</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <p
              className="mb-1.5 text-[13px] font-semibold"
              style={{ color: 'hsl(var(--primary))' }}
            >
              Heureux de vous revoir 👋
            </p>
            <h2 className="text-[28px] font-bold tracking-tight text-foreground leading-tight">
              Connectez-vous
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Accédez à votre espace de pilotage.
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3">
                <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                <p className="text-[13px] font-medium text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-[13px] font-semibold text-foreground">
                  Adresse email
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@entreprise.com"
                  className="h-11 w-full rounded-xl border border-border/80 bg-card px-4 text-sm text-foreground shadow-xs placeholder:text-muted-foreground/70 transition-all focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25 hover:border-border"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="login-password" className="block text-[13px] font-semibold text-foreground">Mot de passe</label>
                  <a href="/forgot-password" className="text-xs font-bold text-primary hover:underline">Mot de passe oublié ?</a>
                </div>
                <PasswordInput
                  id="login-password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-border/80 bg-card px-4 text-sm text-foreground shadow-xs placeholder:text-muted-foreground/70 transition-all focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25 hover:border-border"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-indigo-600"
              />
              <span>
                <strong className="font-semibold text-slate-700">Se souvenir de moi</strong>
                <span className="mt-0.5 block text-xs text-slate-500">Garde votre session active pendant 7 jours sur cet appareil.</span>
              </span>
            </label>

            <CaptchaWidget onToken={setCaptchaToken} action="login" resetKey={captchaResetKey} />

            <button
              type="submit"
              id="login-submit"
              disabled={loading || (isCaptchaEnabled && !captchaToken)}
              className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-white shadow-cta transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-60 disabled:pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
              }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connexion...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Se connecter
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
          <GoogleSignInButton onCredential={handleGoogleCredential} />

          {/* Register CTA */}
          <div
            className="mt-8 rounded-xl border p-4 text-center"
            style={{
              borderColor: 'hsl(var(--primary) / 0.20)',
              background: 'hsl(var(--primary) / 0.04)',
            }}
          >
            <p className="text-[13px] font-medium text-foreground">
              Vous n'avez pas encore de compte ?
            </p>
            <a
              href="/register"
              className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-bold transition-colors"
              style={{ color: 'hsl(var(--primary))' }}
            >
              Créer gratuitement mon compte
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <p className="mt-5 text-center text-[11px] text-slate-500">
            <a href="/privacy" className="font-semibold hover:text-indigo-700 hover:underline">Politique de confidentialité</a>
            <span className="mx-2">•</span>
            <a href="/terms" className="font-semibold hover:text-indigo-700 hover:underline">Conditions d'utilisation</a>
          </p>

        </div>
      </div>
    </div>
  )
}
