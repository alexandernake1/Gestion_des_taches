import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { FormWizard, FormWizardActions, FormWizardPanel, type FormWizardStep } from '@/components/forms/FormWizard'
import { useConfirmation } from '@/components/ui/confirmation'
import { teamsService } from '@/services/teams'
import { authService } from '@/services/auth'
import { tasksService } from '@/services/tasks'
import type { Team, User } from '@/domain/types'
import { Archive, ArchiveRestore, CheckCircle2, Plus, Search, ShieldCheck, Trash2, UserRound, Users, X, AlertCircle, ClipboardCheck, FileText } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { requireManagement } from '@/router/auth'
import { ErrorState } from '@/components/ui/ErrorState'
import { ROLE_LABELS } from '@/constants/labels'

export const Route = createFileRoute('/teams')({
  beforeLoad: requireManagement,
  component: TeamsPage,
})

function TeamsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data: teams, isLoading, isError, refetch } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsService.list()
  })
  const { data: users = [] } = useQuery({
    queryKey: ['users', 'team-management'],
    queryFn: () => authService.list({ is_active: true }),
  })
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
  })
  const canDeleteTeams = Boolean(currentUser?.is_superuser || currentUser?.role === 'owner')
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => teamsService.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  })
  const confirmAction = useConfirmation()
  const deleteMutation = useMutation({
    mutationFn: (id: number) => teamsService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  })
  const handleToggleStatus = async (team: Team) => {
    const archiving = team.is_active
    const { confirmed } = await confirmAction({
      title: `${archiving ? 'Archiver' : 'Réactiver'} l’équipe « ${team.name} » ?`,
      description: archiving
        ? 'L’équipe sera conservée, mais ne pourra plus être choisie pour de nouvelles assignations.'
        : 'L’équipe redeviendra disponible pour les nouvelles assignations.',
      confirmLabel: archiving ? 'Archiver l’équipe' : 'Réactiver l’équipe',
      tone: archiving ? 'danger' : 'warning',
      impacts: archiving
        ? ['Les membres, projets et tâches déjà rattachés sont conservés.']
        : ['La composition actuelle de l’équipe sera conservée.'],
    })
    if (confirmed) toggleStatusMutation.mutate({ id: Number(team.id), is_active: !team.is_active })
  }
  const handleDelete = async (team: Team) => {
    const { confirmed } = await confirmAction({
      title: `Supprimer définitivement l’équipe « ${team.name} » ?`,
      description: 'Cette action est réservée à l’administrateur de la structure et ne peut pas être annulée.',
      confirmLabel: 'Supprimer définitivement',
      tone: 'danger',
      impacts: [
        'Les membres seront retirés de cette équipe.',
        'Les tâches existantes seront conservées mais ne seront plus rattachées à cette équipe.',
      ],
      requireText: 'SUPPRIMER',
    })
    if (confirmed) deleteMutation.mutate(Number(team.id))
  }
  const normalizedSearch = search.trim().toLocaleLowerCase('fr')
  const visibleTeams = teams?.filter((team) => (
    !normalizedSearch
    || team.name.toLocaleLowerCase('fr').includes(normalizedSearch)
    || team.leader_name?.toLocaleLowerCase('fr').includes(normalizedSearch)
  ))
  const activeTeams = teams?.filter((team) => team.is_active).length || 0
  const coveredMembers = new Set(
    teams?.flatMap((team) => team.members?.map(String) || []) || [],
  ).size

  return (
    <Layout title="Équipes">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'hsl(var(--primary))' }}>
                <Users className="h-4 w-4" />Organisation
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">Structurez les responsabilités</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Regroupez les collaborateurs, désignez un responsable clair et suivez le travail rattaché à chaque équipe.</p>
            </div>
            <Button size="lg" onClick={() => setIsModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle équipe
            </Button>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TeamMetric icon={Users} label="Équipes" value={teams?.length || 0} />
            <TeamMetric icon={CheckCircle2} label="Équipes actives" value={activeTeams} />
            <TeamMetric icon={UserRound} label="Membres couverts" value={coveredMembers} />
          </div>
        </section>

        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une équipe ou un responsable…"
              aria-label="Rechercher une équipe"
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Effacer la recherche" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <span className="hidden text-sm font-medium text-muted-foreground sm:block">{visibleTeams?.length || 0} résultat{(visibleTeams?.length || 0) > 1 ? 's' : ''}</span>
        </div>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {visibleTeams?.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onManage={() => setSelectedTeam(team)}
                onToggleStatus={() => void handleToggleStatus(team)}
                isToggling={toggleStatusMutation.isPending}
                onDelete={canDeleteTeams ? () => void handleDelete(team) : undefined}
                isDeleting={deleteMutation.isPending}
              />
            ))}
            {visibleTeams?.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center xl:col-span-2">
                <Users className="mx-auto h-9 w-9" style={{ color: 'hsl(var(--primary) / 0.60)' }} />
                <h3 className="mt-4 font-bold text-foreground">{search ? 'Aucune équipe correspondante' : 'Créez votre première équipe'}</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{search ? 'Essayez un autre nom ou recherchez le responsable de l’équipe.' : 'Une équipe permet de répartir clairement le travail et de suivre les responsabilités.'}</p>
                {search ? (
                  <Button className="mt-5" variant="secondary" onClick={() => setSearch('')}>Effacer la recherche</Button>
                ) : (
                  <Button className="mt-5" onClick={() => setIsModalOpen(true)}><Plus className="mr-2 h-4 w-4" />Créer une équipe</Button>
                )}
              </div>
            )}
          </div>
        )}

        <CreateTeamModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false)
            queryClient.invalidateQueries({ queryKey: ['teams'] })
          }}
          users={users}
        />
        <ManageTeamModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
          onSuccess={() => {
            setSelectedTeam(null)
            queryClient.invalidateQueries({ queryKey: ['teams'] })
          }}
          users={users}
        />
      </div>
    </Layout>
  )
}

function TeamMetric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 p-4 shadow-xs">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: 'hsl(var(--primary) / 0.10)' }}
      >
        <Icon className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
      </div>
      <div>
        <p className="text-xl font-black text-foreground">{value}</p>
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function TeamCard({ team, onManage, onToggleStatus, isToggling, onDelete, isDeleting }: { team: Team; onManage: () => void; onToggleStatus: () => void; isToggling: boolean; onDelete?: () => void; isDeleting: boolean }) {
  return (
    <Card className="group relative cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-card">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--accent) / 0.12) 100%)' }}
              >
                <Users className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-foreground group-hover:text-primary transition-colors">{team.name}</h3>
                {team.leader_name && (
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <UserRound className="h-3.5 w-3.5" />
                    Responsable : <span className="text-foreground/80">{team.leader_name}</span>
                  </p>
                )}
              </div>
            </div>
            {team.description && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{team.description}</p>
            )}
            <div className="flex items-center gap-3">
              <Badge variant="info" className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700">
                {team.member_count || 0} membre{(team.member_count || 0) > 1 ? 's' : ''}
              </Badge>
              {team.is_active ? (
                <Badge variant="success" className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Active</Badge>
              ) : (
                <Badge variant="danger" className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Inactive</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity mt-4 sm:mt-0">
            <Button variant="ghost" size="sm" onClick={onToggleStatus} disabled={isToggling} className="rounded-full">
              {team.is_active ? <Archive className="mr-1.5 h-3.5 w-3.5" /> : <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />}
              {team.is_active ? 'Archiver' : 'Réactiver'}
            </Button>
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={onDelete} disabled={isDeleting} className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />Supprimer
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onManage} className="rounded-full shadow-sm hover:bg-white hover:shadow">
              Gérer <ShieldCheck className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ManageTeamModal({ team, onClose, onSuccess, users }: { team: Team | null; onClose: () => void; onSuccess: () => void; users: User[] }) {
  const confirmAction = useConfirmation()
  const { data: details, isLoading } = useQuery({
    queryKey: ['team', team?.id],
    queryFn: () => teamsService.get(Number(team!.id)),
    enabled: team !== null,
  })

  const [leaderId, setLeaderId] = useState<number | undefined>(undefined)
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])

  useEffect(() => {
    if (details) {
      setLeaderId(details.leader || undefined)
      setSelectedMembers(details.members || [])
    }
  }, [details])

  const effectiveMembers = new Set([
    ...selectedMembers,
    ...(leaderId ? [leaderId] : []),
  ])

  const mutation = useMutation({
    mutationFn: (data: { name: string; description?: string; leader?: number; is_active: boolean; member_ids: number[] }) =>
      teamsService.update(Number(team!.id), data),
    onSuccess,
  })
  const { data: teamTasks = [] } = useQuery({
    queryKey: ['tasks', 'team', team?.id],
    queryFn: () => tasksService.list({ team: Number(team!.id) }),
    enabled: team !== null,
  })

  const handleMemberToggle = (userId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const isActive = data.get('is_active') === 'on'

    if (isActive && effectiveMembers.size < 2) {
      return
    }

    const payload = {
      name: data.get('name') as string,
      description: data.get('description') as string || undefined,
      leader: leaderId,
      is_active: isActive,
      member_ids: Array.from(effectiveMembers),
    }

    if (details && details.is_active !== payload.is_active) {
      const deactivating = details.is_active
      const { confirmed } = await confirmAction({
        title: `${deactivating ? 'Désactiver' : 'Réactiver'} l’équipe « ${details.name} » ?`,
        description: deactivating
          ? 'Cette équipe ne sera plus disponible pour de nouvelles assignations.'
          : 'Cette équipe redeviendra disponible pour les assignations.',
        confirmLabel: deactivating ? 'Désactiver l’équipe' : 'Réactiver l’équipe',
        tone: deactivating ? 'danger' : 'warning',
        impacts: deactivating
          ? [`Les ${teamTasks.length} tâche${teamTasks.length > 1 ? 's' : ''} déjà rattachée${teamTasks.length > 1 ? 's' : ''} seront conservées.`]
          : ['Les membres et le responsable configurés seront conservés.'],
      })
      if (!confirmed) return
    }

    mutation.mutate(payload)
  }

  return (
    <Modal isOpen={team !== null} onClose={onClose} title="Gérer l’équipe">
      {isLoading || !details ? <p className="text-sm text-slate-500">Chargement…</p> : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">Nom
            <input name="name" required defaultValue={details.name} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Description
            <textarea name="description" rows={3} defaultValue={details.description} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Responsable
            <select
              name="leader"
              value={leaderId || ''}
              onChange={(e) => setLeaderId(e.target.value ? Number(e.target.value) : undefined)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Aucun responsable</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} — {ROLE_LABELS[user.role] || user.role_display}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <div className="mb-2 flex items-center justify-between">
              <legend className="text-sm font-medium text-slate-700">Membres</legend>
              <span className={`text-xs font-semibold ${effectiveMembers.size >= 2 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {effectiveMembers.size} personne{effectiveMembers.size > 1 ? 's' : ''} (min. 2)
              </span>
            </div>
            <div className="max-h-48 space-y-2 overflow-auto rounded-xl border border-slate-200 p-3">
              {users.map((user) => {
                const isLeader = Boolean(leaderId && Number(user.id) === Number(leaderId))
                const isChecked = isLeader || selectedMembers.includes(Number(user.id))
                return (
                  <label key={user.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      value={user.id}
                      checked={isChecked}
                      disabled={isLeader}
                      onChange={() => handleMemberToggle(Number(user.id))}
                    />
                    <span>{user.full_name}</span>
                    {isLeader && <span className="text-xs font-bold text-indigo-600">(Responsable)</span>}
                    <span className="ml-auto text-xs text-slate-400">{ROLE_LABELS[user.role] || user.role_display}</span>
                  </label>
                )
              })}
            </div>
            {effectiveMembers.size < 2 && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Sélectionnez au moins deux personnes, responsable compris.
              </p>
            )}
          </fieldset>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input name="is_active" type="checkbox" defaultChecked={details.is_active} /> Équipe active
          </label>
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-700">Tâches de l’équipe ({teamTasks.length})</h3>
            <div className="max-h-44 space-y-2 overflow-auto rounded-xl bg-slate-50 p-3">
              {teamTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                  <span className="truncate font-medium text-slate-700">{task.title}</span>
                  <span className="ml-3 shrink-0 text-xs text-slate-400">{task.status_display || task.status}</span>
                </div>
              ))}
              {teamTasks.length === 0 && <p className="py-3 text-center text-sm text-slate-400">Aucune tâche rattachée.</p>}
            </div>
          </div>
          {mutation.isError && <p className="text-sm text-rose-600">{mutation.error instanceof Error ? mutation.error.message : 'Modification impossible.'}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending || effectiveMembers.size < 2}>
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

const createTeamSteps: FormWizardStep[] = [
  { id: 'identity', title: 'Identité', description: 'Nom et mission', icon: FileText },
  { id: 'members', title: 'Composition', description: 'Manager et collaborateurs', icon: Users },
  { id: 'review', title: 'Vérification', description: 'Contrôle avant création', icon: ClipboardCheck },
]

function CreateTeamModal({ isOpen, onClose, onSuccess, users }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; users: User[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [leaderId, setLeaderId] = useState<number | undefined>(undefined)
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [stepError, setStepError] = useState('')
  const [reviewIdentity, setReviewIdentity] = useState({ name: '', description: '' })

  useEffect(() => {
    if (!isOpen) return
    setLeaderId(undefined)
    setSelectedMembers([])
    setCurrentStep(0)
    setStepError('')
    setReviewIdentity({ name: '', description: '' })
  }, [isOpen])

  const effectiveMembers = new Set([
    ...selectedMembers,
    ...(leaderId ? [leaderId] : []),
  ])

  const mutation = useMutation({
    mutationFn: teamsService.create,
    onSuccess: () => {
      setLeaderId(undefined)
      setSelectedMembers([])
      onSuccess()
    }
  })

  const handleMemberToggle = (userId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const validateCurrentStep = () => {
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-form-wizard-step="${currentStep}"]`)
    if (!panel) return true
    const controls = Array.from(panel.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea'))
    for (const control of controls) {
      if (!control.checkValidity()) {
        control.reportValidity()
        return false
      }
    }
    return true
  }

  const goToNextStep = () => {
    setStepError('')
    if (!validateCurrentStep()) return
    if (currentStep === 1 && effectiveMembers.size < 2) {
      setStepError('Sélectionnez au moins deux personnes, manager compris.')
      return
    }
    if (currentStep === createTeamSteps.length - 2 && formRef.current) {
      const formData = new FormData(formRef.current)
      setReviewIdentity({
        name: String(formData.get('name') || '').trim(),
        description: String(formData.get('description') || '').trim(),
      })
    }
    setCurrentStep((step) => Math.min(step + 1, createTeamSteps.length - 1))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (currentStep !== createTeamSteps.length - 1) {
      goToNextStep()
      return
    }
    if (effectiveMembers.size < 2 || !leaderId || !formRef.current) {
      setCurrentStep(1)
      setStepError('Choisissez un manager et au moins un autre collaborateur.')
      return
    }
    const formData = new FormData(formRef.current)
    mutation.mutate({
      name: String(formData.get('name') || '').trim(),
      description: String(formData.get('description') || '').trim() || undefined,
      leader: Number(leaderId),
      member_ids: Array.from(effectiveMembers),
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Créer une équipe" size="lg">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <FormWizard steps={createTeamSteps} currentStep={currentStep} onStepSelect={(step) => { setStepError(''); setCurrentStep(step) }}>
          <FormWizardPanel step={0} active={currentStep === 0} title="Donnez une identité à l'équipe" description="Un nom clair aide les collaborateurs à comprendre immédiatement sa mission.">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Nom de l'équipe *</label>
              <input name="name" type="text" required autoFocus className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex. Équipe commerciale" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Mission de l'équipe</label>
              <textarea name="description" rows={4} className="min-h-[110px] w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Responsabilités principales et périmètre d'intervention…" />
            </div>
          </FormWizardPanel>

          <FormWizardPanel step={1} active={currentStep === 1} title="Composez l'équipe" description="Une équipe active doit contenir un manager et au moins un autre collaborateur.">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Manager *</label>
              <select name="leader" required value={leaderId || ''} onChange={(event) => setLeaderId(event.target.value ? Number(event.target.value) : undefined)} className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Choisir un manager</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.full_name} — {ROLE_LABELS[user.role] || user.role_display}</option>)}
              </select>
            </div>

            <fieldset>
              <div className="mb-2 flex items-center justify-between gap-3">
                <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Collaborateurs</legend>
                <span className={`shrink-0 text-xs font-semibold ${effectiveMembers.size >= 2 ? 'text-emerald-600' : 'text-amber-600'}`}>{effectiveMembers.size} personne{effectiveMembers.size > 1 ? 's' : ''} · minimum 2</span>
              </div>
              <div className="max-h-64 space-y-2 overflow-auto rounded-2xl border border-border bg-muted/20 p-3">
                {users.map((user) => {
                  const isLeader = Boolean(leaderId && Number(user.id) === Number(leaderId))
                  const isChecked = isLeader || selectedMembers.includes(Number(user.id))
                  return (
                    <label key={user.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm transition hover:border-border hover:bg-background">
                      <input type="checkbox" value={user.id} checked={isChecked} disabled={isLeader} onChange={() => handleMemberToggle(Number(user.id))} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                      <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-foreground">{user.full_name}</span><span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role] || user.role_display}</span></span>
                      {isLeader && <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">Manager</span>}
                    </label>
                  )
                })}
              </div>
              {effectiveMembers.size < 2 && <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-600"><AlertCircle className="h-3.5 w-3.5 shrink-0" />Ajoutez au moins un collaborateur en plus du manager.</p>}
            </fieldset>
          </FormWizardPanel>

          <FormWizardPanel step={2} active={currentStep === 2} title="Vérifiez la composition" description="Contrôlez l'identité et les membres avant de créer l'équipe.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TeamReviewCard label="Équipe" value={reviewIdentity.name} detail={reviewIdentity.description || 'Aucune description'} />
              <TeamReviewCard label="Manager" value={users.find((user) => Number(user.id) === leaderId)?.full_name || 'Non sélectionné'} detail={ROLE_LABELS[users.find((user) => Number(user.id) === leaderId)?.role || 'employee']} />
            </div>
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Composition · {effectiveMembers.size} personnes</p>
              <div className="mt-3 flex flex-wrap gap-2">{Array.from(effectiveMembers).map((id) => <span key={id} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground">{users.find((user) => Number(user.id) === id)?.full_name || `Utilisateur #${id}`}</span>)}</div>
            </div>
          </FormWizardPanel>
        </FormWizard>

        {(stepError || mutation.isError) && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{stepError || (mutation.error instanceof Error ? mutation.error.message : 'Création impossible.')}</p>}

        <FormWizardActions currentStep={currentStep} totalSteps={createTeamSteps.length} onBack={() => { setStepError(''); setCurrentStep((step) => Math.max(0, step - 1)) }} onNext={goToNextStep} onCancel={onClose} isSubmitting={mutation.isPending} submitDisabled={effectiveMembers.size < 2 || !leaderId} submitLabel="Créer l'équipe" submittingLabel="Création…" />
      </form>
    </Modal>
  )
}

function TeamReviewCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-border bg-muted/20 p-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">{label}</p><p className="mt-2 text-sm font-bold text-foreground">{value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div>
}
