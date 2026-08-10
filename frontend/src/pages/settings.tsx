import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { authService } from '@/services/auth'
import { notificationsService } from '@/services/notifications'
import { Button } from '@/components/ui/Button'
import { requireAuthentication } from '@/router/auth'
import { BellRing, Check, Key, ShieldCheck, Smartphone, UserRound, ArrowLeft } from 'lucide-react'
import { useSmartBack } from '@/utils/navigation'
import { requestPushPermission } from '@/utils/notifications'

export const Route = createFileRoute('/settings')({
  beforeLoad: requireAuthentication,
  component: SettingsPage,
})

function SettingsPage() {
  const goBack = useSmartBack('/dashboard')
  const [profileSaved, setProfileSaved] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [notificationsSaved, setNotificationsSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile')
  const queryClient = useQueryClient()
  
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
  })



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
      assignments_enabled: data.has('assignments_enabled'),
      comments_enabled: data.has('comments_enabled'),
      task_reminders_enabled: data.has('task_reminders_enabled'),
      overdue_alerts_enabled: data.has('overdue_alerts_enabled'),
      daily_digest_enabled: data.has('daily_digest_enabled'),
      subscription_alerts_enabled: data.has('subscription_alerts_enabled'),
      reminder_days_before: Number(data.get('reminder_days_before')),
      digest_hour: Number(data.get('digest_hour')),
    })
  }

  const inputClass = 'h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground/60'
  const inputWithIconClass = 'h-11 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-sm text-foreground transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25'

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
          <p className="mt-1 text-sm text-muted-foreground">Gérez vos informations personnelles et vos préférences de sécurité.</p>
        </div>

        <div className="flex flex-col gap-8 px-4 sm:flex-row sm:px-6 lg:px-8">
          {/* Sidebar nav */}
          <div className="w-full sm:w-64 shrink-0">
            <div className="flex flex-col gap-1 rounded-2xl bg-card border border-border p-2 shadow-xs">
              {(['profile', 'security', 'notifications'] as const).map((tab) => {
                const icons = { profile: UserRound, security: ShieldCheck, notifications: BellRing }
                const labels = { profile: 'Profil', security: 'Sécurité', notifications: 'Notifications' }
                const Icon = icons[tab]
                const isActive = activeTab === tab
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20'
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
                  <p className="truncate text-xs text-muted-foreground">{currentUser?.role_display}</p>
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
                  <p className="mt-1 text-sm text-muted-foreground">Ces informations seront visibles par les membres de votre entreprise.</p>
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
                  <div>
                    {updateProfile.isError && <p className="text-sm font-medium text-destructive">{updateProfile.error instanceof Error ? updateProfile.error.message : 'Erreur'}</p>}
                    {profileSaved && <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"><Check className="h-4 w-4" /> Enregistré avec succès</p>}
                  </div>
                  <Button type="submit" disabled={updateProfile.isPending} size="lg">
                    {updateProfile.isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
                  </Button>
                </div>
              </form>
            )}

            {activeTab === 'security' && (
              <form onSubmit={savePassword} className="space-y-8 p-6 sm:p-8 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Mot de passe</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Sécurisez votre compte avec un mot de passe robuste d'au moins 8 caractères.</p>
                </div>

                <div className="space-y-2 max-w-md">
                  <label className="text-sm font-semibold text-foreground">Mot de passe actuel</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input name="old_password" type="password" required autoComplete="current-password" className={inputWithIconClass} />
                  </div>
                </div>

                <div className="space-y-5 max-w-md rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Nouveau mot de passe</label>
                    <input name="new_password" type="password" required minLength={8} autoComplete="new-password" placeholder="8 caractères minimum" className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Confirmation</label>
                    <input name="new_password_confirm" type="password" required minLength={8} autoComplete="new-password" placeholder="Retapez le mot de passe" className={inputClass} />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-6">
                  <div>
                    {passwordError && <p role="alert" className="text-sm font-medium text-destructive">{passwordError}</p>}
                    {changePassword.isError && <p role="alert" className="text-sm font-medium text-destructive">{changePassword.error instanceof Error ? changePassword.error.message : 'Erreur'}</p>}
                    {passwordSaved && <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"><Check className="h-4 w-4" /> Mot de passe modifié</p>}
                  </div>
                  <Button type="submit" disabled={changePassword.isPending} size="lg">
                    {changePassword.isPending ? 'Modification…' : 'Mettre à jour le mot de passe'}
                  </Button>
                </div>
              </form>
            )}

            {activeTab === 'notifications' && notificationPreferences && (
              <form key={notificationPreferences.updated_at} onSubmit={saveNotifications} className="space-y-8 p-6 sm:p-8 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Notifications intelligentes</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Choisissez les alertes utiles et leur fréquence. Les doublons sont automatiquement évités.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <PreferenceToggle name="notification_sound_enabled" label="Signal sonore SaaS" description="Émettre un son discret lors de la réception d'une notification." defaultChecked={typeof localStorage !== 'undefined' ? localStorage.getItem('notification_sound_enabled') !== 'false' : true} />
                  <PreferenceToggle name="notification_desktop_enabled" label="Notifications Push bureau" description="Afficher une alerte Windows/OS quand l'application est en arrière-plan." defaultChecked={typeof localStorage !== 'undefined' ? localStorage.getItem('notification_desktop_enabled') !== 'false' : true} />
                  <PreferenceToggle name="assignments_enabled" label="Nouvelles assignations" description="Lorsqu'une tâche vous est confiée." defaultChecked={notificationPreferences.assignments_enabled} />
                  <PreferenceToggle name="comments_enabled" label="Commentaires" description="Activité sur les tâches qui vous concernent." defaultChecked={notificationPreferences.comments_enabled} />
                  <PreferenceToggle name="task_reminders_enabled" label="Échéances proches" description="Rappel avant la date limite." defaultChecked={notificationPreferences.task_reminders_enabled} />
                  <PreferenceToggle name="overdue_alerts_enabled" label="Tâches en retard" description="Une alerte quotidienne par tâche en retard." defaultChecked={notificationPreferences.overdue_alerts_enabled} />
                  <PreferenceToggle name="daily_digest_enabled" label="Résumé quotidien" description="Une synthèse de votre charge du jour." defaultChecked={notificationPreferences.daily_digest_enabled} />
                  <PreferenceToggle name="subscription_alerts_enabled" label="Abonnement et paiements" description="Alertes importantes pour les responsables." defaultChecked={notificationPreferences.subscription_alerts_enabled} />
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
