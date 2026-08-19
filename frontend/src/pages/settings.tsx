import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { authService } from '@/services/auth'
import { notificationsService } from '@/services/notifications'
import { Button } from '@/components/ui/Button'
import { requireAuthentication } from '@/router/auth'
import {
  BellRing,
  Check,
  ShieldCheck,
  Smartphone,
  UserRound,
  ArrowLeft,
  HelpCircle,
  Sparkles,
  Play,
  BookOpen,
  RotateCcw,
  ExternalLink,
  Share2,
} from 'lucide-react'
import { useSmartBack } from '@/utils/navigation'
import { requestPushPermission } from '@/utils/notifications'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { useTutorial } from '@/context/TutorialContext'

export const Route = createFileRoute('/settings')({
  beforeLoad: requireAuthentication,
  component: SettingsPage,
})

function SettingsPage() {
  const goBack = useSmartBack('/dashboard')
  const { startTour, openHelpDrawer, resetOnboarding, openShareModal } = useTutorial()
  const [profileSaved, setProfileSaved] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [notificationsSaved, setNotificationsSaved] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'help'>('profile')
  const queryClient = useQueryClient()
  
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
  })
  const isPersonalWorkspace = Boolean(currentUser?.is_personal_workspace)

  const { data: notificationPreferences } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationsService.getPreferences,
  })

  const updateProfile = useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] })
      setProfileSaved(true)
    },
  })
  
  const changePassword = useMutation({
    mutationFn: authService.changePassword,
    onSuccess: () => setPasswordSaved(true),
  })

  const updateNotifications = useMutation({
    mutationFn: notificationsService.updatePreferences,
    onSuccess: (preferences) => {
      queryClient.setQueryData(['notification-preferences'], preferences)
      setNotificationsSaved(true)
    },
  })

  const saveProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProfileSaved(false)
    const data = new FormData(event.currentTarget)
    updateProfile.mutate({
      first_name: data.get('first_name') as string,
      last_name: data.get('last_name') as string,
      phone: data.get('phone') as string,
    })
  }

  const savePassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordSaved(false)
    setPasswordError('')
    const data = new FormData(event.currentTarget)
    const newPassword = data.get('new_password') as string
    const confirmation = data.get('new_password_confirm') as string
    if (newPassword !== confirmation) {
      setPasswordError('Les deux nouveaux mots de passe ne correspondent pas.')
      return
    }
    changePassword.mutate({
      old_password: data.get('old_password') as string,
      new_password: newPassword,
      new_password_confirm: confirmation,
    })
  }

  const saveNotifications = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotificationsSaved(false)
    const data = new FormData(event.currentTarget)

    localStorage.setItem('notification_sound_enabled', data.has('notification_sound_enabled') ? 'true' : 'false')
    const desktopEnabled = data.has('notification_desktop_enabled')
    localStorage.setItem('notification_desktop_enabled', desktopEnabled ? 'true' : 'false')
    if (desktopEnabled) {
      requestPushPermission()
    }

    updateNotifications.mutate({
      assignments_enabled: isPersonalWorkspace ? false : data.has('assignments_enabled'),
      comments_enabled: data.has('comments_enabled'),
      task_reminders_enabled: data.has('task_reminders_enabled'),
      overdue_alerts_enabled: data.has('overdue_alerts_enabled'),
      daily_digest_enabled: data.has('daily_digest_enabled'),
      subscription_alerts_enabled: data.has('subscription_alerts_enabled'),
      reminder_days_before: Number(data.get('reminder_days_before')),
      digest_hour: Number(data.get('digest_hour')),
    })
  }

  const handleResetOnboarding = () => {
    resetOnboarding()
    setResetMessage('Guide et checklist réinitialisés avec succès.')
    setTimeout(() => setResetMessage(''), 4000)
  }

  const inputClass = 'h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
  const inputWithIconClass = 'h-11 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

  if (isUserLoading) {
    return (
      <Layout title="Chargement...">
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Paramètres">
      <div className="mx-auto max-w-5xl py-8">
        <div className="mb-6 px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" className="mb-4 text-slate-500 hover:text-slate-900" onClick={goBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Paramètres du compte</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gérez vos informations personnelles, vos notifications et l'assistance.</p>
        </div>

        <div className="flex flex-col gap-8 px-4 sm:flex-row sm:px-6 lg:px-8">
          {/* Sidebar nav */}
          <div className="w-full sm:w-64 shrink-0">
            <div className="flex flex-col gap-1 rounded-2xl bg-card border border-border p-2 shadow-xs">
              {(['profile', 'security', 'notifications', 'help'] as const).map((tab) => {
                const icons = {
                  profile: UserRound,
                  security: ShieldCheck,
                  notifications: BellRing,
                  help: HelpCircle,
                }
                const labels = {
                  profile: 'Profil',
                  security: 'Sécurité',
                  notifications: 'Notifications',
                  help: 'Guide & Aide',
                }
                const Icon = icons[tab]
                const isActive = activeTab === tab
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20 font-bold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" /> {labels[tab]}
                  </button>
                )
              })}
            </div>
            
            <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)' }}
                >
                  {currentUser?.first_name?.[0]}{currentUser?.last_name?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{currentUser?.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{isPersonalWorkspace ? 'Compte personnel' : currentUser?.role_display}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            {activeTab === 'profile' && (
              <form onSubmit={saveProfile} className="space-y-8 p-6 sm:p-8 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Informations personnelles</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isPersonalWorkspace
                      ? 'Ces informations permettent de personnaliser votre compte.'
                      : 'Ces informations seront visibles par les membres de votre entreprise.'}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Prénom</label>
                    <input name="first_name" required defaultValue={currentUser?.first_name} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Nom</label>
                    <input name="last_name" required defaultValue={currentUser?.last_name} className={inputClass} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Téléphone</label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input name="phone" defaultValue={currentUser?.phone} className={`${inputWithIconClass} max-w-md`} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Adresse email</label>
                  <input value={currentUser?.email} disabled className="h-11 w-full max-w-md rounded-xl border border-border bg-muted px-4 text-sm text-muted-foreground cursor-not-allowed opacity-70" />
                  <p className="text-xs text-muted-foreground">L'adresse email ne peut pas être modifiée directement.</p>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-6">
                  {profileSaved && <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"><Check className="h-4 w-4" /> Profil mis à jour</p>}
                  <div className="ml-auto">
                    <Button type="submit" disabled={updateProfile.isPending} size="lg">
                      {updateProfile.isPending ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {activeTab === 'security' && (
              <form onSubmit={savePassword} className="space-y-8 p-6 sm:p-8 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Sécurité du mot de passe</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Changez votre mot de passe pour protéger votre compte.</p>
                </div>

                <div className="space-y-5 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Mot de passe actuel</label>
                    <PasswordInput name="old_password" required placeholder="••••••••" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Nouveau mot de passe</label>
                    <PasswordInput name="new_password" required placeholder="Minimum 8 caractères" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Confirmer le nouveau mot de passe</label>
                    <PasswordInput name="new_password_confirm" required placeholder="••••••••" />
                  </div>
                </div>

                {passwordError && <p className="text-sm font-medium text-destructive">{passwordError}</p>}

                <div className="flex items-center justify-between border-t border-border pt-6">
                  {passwordSaved && <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"><Check className="h-4 w-4" /> Mot de passe modifié</p>}
                  <div className="ml-auto">
                    <Button type="submit" disabled={changePassword.isPending} size="lg">
                      {changePassword.isPending ? 'Modification…' : 'Modifier le mot de passe'}
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {activeTab === 'notifications' && notificationPreferences && (
              <form onSubmit={saveNotifications} className="space-y-8 p-6 sm:p-8 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Préférences de notification</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Sélectionnez les alertes et synthèses que vous souhaitez recevoir.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PreferenceToggle name="notification_sound_enabled" label="Signal sonore (Audio Chime)" description="Jouer un carillon subtil lors d'une nouvelle notification." defaultChecked={typeof localStorage !== 'undefined' ? localStorage.getItem('notification_sound_enabled') !== 'false' : true} />
                  <PreferenceToggle name="notification_desktop_enabled" label="Notifications Push bureau" description="Afficher une alerte Windows/OS quand l'application est en arrière-plan." defaultChecked={typeof localStorage !== 'undefined' ? localStorage.getItem('notification_desktop_enabled') !== 'false' : true} />
                  {!isPersonalWorkspace && <PreferenceToggle name="assignments_enabled" label="Nouvelles assignations" description="Lorsqu'une tâche vous est confiée." defaultChecked={notificationPreferences.assignments_enabled} />}
                  <PreferenceToggle name="comments_enabled" label="Commentaires" description="Activité sur les tâches qui vous concernent." defaultChecked={notificationPreferences.comments_enabled} />
                  <PreferenceToggle name="task_reminders_enabled" label="Échéances proches" description="Rappel avant la date limite." defaultChecked={notificationPreferences.task_reminders_enabled} />
                  <PreferenceToggle name="overdue_alerts_enabled" label="Tâches en retard" description="Une alerte quotidienne par tâche en retard." defaultChecked={notificationPreferences.overdue_alerts_enabled} />
                  <PreferenceToggle name="daily_digest_enabled" label="Résumé quotidien" description="Une synthèse de votre charge du jour." defaultChecked={notificationPreferences.daily_digest_enabled} />
                  <PreferenceToggle name="subscription_alerts_enabled" label="Abonnement et paiements" description={isPersonalWorkspace ? 'Alertes importantes liées à votre forfait.' : 'Alertes importantes pour les responsables.'} defaultChecked={notificationPreferences.subscription_alerts_enabled} />
                </div>
                <div className="grid gap-5 rounded-xl border border-primary/20 bg-primary/5 p-5 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-foreground">
                    Rappel avant échéance
                    <select name="reminder_days_before" defaultValue={notificationPreferences.reminder_days_before} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25">
                      {[1, 2, 3, 5, 7, 10, 14].map((days) => <option key={days} value={days}>{days} jour{days > 1 ? 's' : ''} avant</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-foreground">
                    Heure du résumé
                    <select name="digest_hour" defaultValue={notificationPreferences.digest_hour} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25">
                      {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}
                    </select>
                  </label>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-6">
                  <div>
                    {updateNotifications.isError && <p role="alert" className="text-sm font-medium text-destructive">{updateNotifications.error instanceof Error ? updateNotifications.error.message : 'Erreur'}</p>}
                    {notificationsSaved && <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"><Check className="h-4 w-4" /> Préférences enregistrées</p>}
                  </div>
                  <Button type="submit" disabled={updateNotifications.isPending} size="lg">
                    {updateNotifications.isPending ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                </div>
              </form>
            )}

            {activeTab === 'help' && (
              <div className="space-y-8 p-6 sm:p-8 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Guide & Prise en main</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Retrouvez tous les outils pour découvrir et maîtriser l’ensemble des fonctionnalités d’Activity Control.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Card 1: Relancer la visite guidée */}
                  <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
                        <Sparkles className="h-4 w-4" />
                        <span>Visite guidée</span>
                      </div>
                      <h4 className="font-extrabold text-sm text-foreground">Visite interactive pas-à-pas</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Revisitez les 5 étapes fondamentales : Espaces, Tableau de bord, Tâches & Action directe, Validations et Notifications.
                      </p>
                    </div>
                    <Button onClick={() => startTour(0)} className="w-full font-bold mt-2" size="sm">
                      <Play className="h-4 w-4 mr-2 fill-current" />
                      Lancer la visite guidée
                    </Button>
                  </div>

                  {/* Card 2: Ouvrir le tiroir d'aide */}
                  <div className="rounded-2xl border border-border bg-card p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground font-bold text-xs uppercase tracking-wider mb-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span>Guides thématiques</span>
                      </div>
                      <h4 className="font-extrabold text-sm text-foreground">Centre d’Aide & Documentation</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Consultez les guides détaillés avec astuces sur la création de tâches, les reports, les rôles et la facturation.
                      </p>
                    </div>
                    <Button onClick={openHelpDrawer} variant="outline" className="w-full font-semibold mt-2" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ouvrir le centre d’aide
                    </Button>
                  </div>
                </div>

                {/* Card 3: Partager la plateforme */}
                <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
                      <Share2 className="h-4 w-4" />
                      <span>Recommandation</span>
                    </div>
                    <h4 className="font-bold text-sm text-foreground">Faites découvrir Activity Control</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Partagez la plateforme avec vos collègues par WhatsApp, LinkedIn, X, Email ou lien direct.
                    </p>
                  </div>
                  <Button
                    onClick={openShareModal}
                    className="shrink-0 font-bold bg-primary text-primary-foreground shadow-sm"
                    size="sm"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Partager la plateforme
                  </Button>
                </div>

                {/* Reset Onboarding Card */}
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Réinitialiser l’onboarding</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Fait réapparaître la checklist de démarrage sur le tableau de bord et réinitialise les marqueurs d’aide.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleResetOnboarding}
                      className="shrink-0 font-semibold"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Réinitialiser
                    </Button>
                  </div>
                  {resetMessage && (
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                      <Check className="h-4 w-4" /> {resetMessage}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

function PreferenceToggle({ name, label, description, defaultChecked }: { name: string; label: string; description: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border p-4 transition-colors hover:border-primary/30 hover:bg-primary/5">
      <span>
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-1 h-5 w-5 shrink-0 rounded border-border text-primary focus:ring-primary/50" />
    </label>
  )
}
