import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { authService as usersService } from '@/services/auth'
import type { User, UserAuditLog } from '@/domain/types'
import { Archive, ArchiveRestore, Briefcase, CheckCircle2, Clock, History, Mail, Phone, Search, ShieldCheck, Trash2, UserPlus, UserRound, Users, XCircle } from 'lucide-react'
import { requireManagement } from '@/router/auth'
import { ErrorState } from '@/components/ui/ErrorState'
import { Modal } from '@/components/ui/Modal'
import { useConfirmation } from '@/components/ui/confirmation'
import { useState } from 'react'

export const Route = createFileRoute('/users')({
  beforeLoad: requireManagement,
  component: UsersPage,
})

const USERS_PER_PAGE = 12

function UsersPage() {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [auditOpen, setAuditOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [userPage, setUserPage] = useState(1)
  const queryClient = useQueryClient()
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: usersService.getCurrentUser,
  })
  const isOwner = currentUser?.role === 'owner'
  const isSuperuser = currentUser?.is_superuser
  const canManageAccounts = isOwner || currentUser?.role === 'manager' || isSuperuser
  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ['users', search, roleFilter, statusFilter],
    queryFn: () => usersService.list({
      search: search || undefined,
      role: roleFilter || undefined,
      is_active: statusFilter === '' ? undefined : statusFilter === 'active',
    })
  })
  const { data: auditLog = [], isLoading: auditLoading } = useQuery({
    queryKey: ['user-audit-log'],
    queryFn: () => usersService.getAuditLog(),
    enabled: auditOpen && canManageAccounts,
  })
  const accountStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => (
      isActive ? usersService.activate(id) : usersService.deactivate(id)
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user-audit-log'] })
    },
  })
  const deleteAccountMutation = useMutation({
    mutationFn: (id: number) => usersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user-audit-log'] })
    },
  })
  const confirmAction = useConfirmation()
  const handleToggleAccount = async (user: User) => {
    const archiving = user.is_active
    const { confirmed } = await confirmAction({
      title: `${archiving ? 'Archiver' : 'Réactiver'} le compte de ${user.full_name} ?`,
      description: archiving
        ? 'Cette personne ne pourra plus se connecter, sans supprimer son historique.'
        : 'Cette personne retrouvera l’accès avec ses permissions actuelles.',
      confirmLabel: archiving ? 'Archiver le compte' : 'Réactiver le compte',
      tone: archiving ? 'danger' : 'warning',
      impacts: archiving
        ? ['Ses tâches et son historique restent conservés.']
        : ['Les droits précédemment attribués restent inchangés.'],
    })
    if (confirmed) accountStatusMutation.mutate({ id: Number(user.id), isActive: user.is_active })
  }
  const handleDeleteAccount = async (user: User) => {
    const { confirmed } = await confirmAction({
      title: `Supprimer définitivement le compte de ${user.full_name} ?`,
      description: 'Cette action est irréversible et réservée au propriétaire.',
      confirmLabel: 'Supprimer définitivement',
      tone: 'danger',
      impacts: [
        'Le compte, ses accès et ses notifications seront supprimés.',
        'Les tâches et les journaux administratifs sont conservés, sans compte associé.',
      ],
      requireText: 'SUPPRIMER',
    })
    if (confirmed) deleteAccountMutation.mutate(Number(user.id))
  }
  const activeFilterCount = [search, roleFilter, statusFilter].filter(Boolean).length
  const activeUsers = users?.filter((user) => user.is_active).length || 0
  const managers = users?.filter((user) => user.role === 'manager').length || 0
  const administrators = users?.filter((user) => user.role === 'owner').length || 0
  const totalPages = Math.max(1, Math.ceil((users?.length || 0) / USERS_PER_PAGE))
  const currentPage = Math.min(userPage, totalPages)
  const visibleUsers = users?.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE)
  const clearFilters = () => {
    setSearch('')
    setRoleFilter('')
    setStatusFilter('')
    setUserPage(1)
  }

  const getRoleBadge = (role: string) => {
    const variants = {
      owner: 'purple',
      manager: 'warning',
      employee: 'info'
    } as const
    const labels = {
      owner: 'Propriétaire',
      manager: 'Manager',
      employee: 'Employé'
    }
    return <Badge variant={variants[role as keyof typeof variants] || 'info'}>{labels[role as keyof typeof labels] || role}</Badge>
  }

  return (
    <Layout title="Utilisateurs">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                <ShieldCheck className="h-4 w-4" />Accès et responsabilités
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">{canManageAccounts ? 'Pilotez les accès de votre organisation' : 'Consultez vos collaborateurs'}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{canManageAccounts ? 'Invitez les bonnes personnes, attribuez des rôles cohérents et gardez une trace des opérations sensibles.' : 'Retrouvez rapidement les membres actifs, leurs rôles et leurs coordonnées professionnelles.'}</p>
            </div>
            {canManageAccounts && <div className="flex flex-col gap-2 sm:flex-row">
              {isOwner && <Button variant="secondary" onClick={() => setAuditOpen(true)}><History className="mr-2 h-4 w-4" />Historique</Button>}
              <Button onClick={() => setInviteOpen(true)}><UserPlus className="mr-2 h-4 w-4" />Créer un compte</Button>
            </div>}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <UserMetric icon={Users} label="Résultats" value={users?.length || 0} />
            <UserMetric icon={CheckCircle2} label="Comptes actifs" value={activeUsers} />
            <UserMetric icon={UserRound} label="Managers" value={managers} />
            <UserMetric icon={ShieldCheck} label="Propriétaire" value={administrators} />
          </div>
        </section>
        <div className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setUserPage(1) }} placeholder="Rechercher un utilisateur…" aria-label="Rechercher un utilisateur" className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground" />
          </div>
            <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setUserPage(1) }} aria-label="Filtrer par rôle" className="h-10 w-full appearance-none rounded-xl border border-border bg-background pl-3 pr-10 text-sm text-foreground">
              <option value="">Tous les rôles</option>
              <option value="owner">Propriétaires</option>
              <option value="manager">Managers</option>
              <option value="employee">Employés</option>
            </select>
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-500 sm:col-span-3">
              <span>{activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''} actif{activeFilterCount > 1 ? 's' : ''}</span>
              <button type="button" onClick={clearFilters} className="font-semibold text-indigo-600 hover:text-indigo-800">Tout effacer</button>
            </div>
          )}
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setUserPage(1) }} aria-label="Filtrer par statut" className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground">
            <option value="">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleUsers?.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                getRoleBadge={getRoleBadge}
                onEdit={(canManageAccounts && (isOwner || isSuperuser || user.role === 'employee')) ? () => setSelectedUser(user) : undefined}
                onToggleStatus={canManageAccounts && user.role !== 'owner' && (isOwner || isSuperuser || user.role === 'employee') ? () => void handleToggleAccount(user) : undefined}
                isToggling={accountStatusMutation.isPending}
                onDelete={(isOwner || isSuperuser) && user.role !== 'owner' ? () => void handleDeleteAccount(user) : undefined}
                isDeleting={deleteAccountMutation.isPending}
              />
            ))}
            {users?.length === 0 && (
              <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
                <XCircle className="mx-auto h-9 w-9 text-slate-400" />
                <h3 className="mt-4 font-bold text-slate-900">Aucun utilisateur trouvé</h3>
                <p className="mt-2 text-sm text-slate-500">Modifiez les filtres pour élargir les résultats.</p>
                <Button className="mt-5" variant="secondary" onClick={clearFilters}>Effacer les filtres</Button>
              </div>
            )}
            {(users?.length || 0) > USERS_PER_PAGE && (
              <nav className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row" aria-label="Pagination des utilisateurs">
                <p className="text-sm text-muted-foreground">
                  {((currentPage - 1) * USERS_PER_PAGE) + 1}–{Math.min(currentPage * USERS_PER_PAGE, users?.length || 0)} sur {users?.length || 0}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" disabled={currentPage === 1} onClick={() => setUserPage((page) => Math.max(1, page - 1))}>Précédent</Button>
                  <span className="min-w-20 text-center text-sm font-semibold text-foreground">Page {currentPage} / {totalPages}</span>
                  <Button variant="secondary" size="sm" disabled={currentPage === totalPages} onClick={() => setUserPage((page) => Math.min(totalPages, page + 1))}>Suivant</Button>
                </div>
              </nav>
            )}
          </div>
        )}
        <UserModal
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onSuccess={() => {
            setInviteOpen(false)
            queryClient.invalidateQueries({ queryKey: ['users'] })
          }}
        />
        <AuditLogModal isOpen={auditOpen} onClose={() => setAuditOpen(false)} entries={auditLog} isLoading={auditLoading} />
        <UserModal
          isOpen={selectedUser !== null}
          user={selectedUser || undefined}
          onClose={() => setSelectedUser(null)}
          onSuccess={() => {
            setSelectedUser(null)
            queryClient.invalidateQueries({ queryKey: ['users'] })
          }}
        />
      </div>
    </Layout>
  )
}

function UserMetric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/70 p-3.5 shadow-sm">
      <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700"><Icon className="h-5 w-5" /></div>
      <div><p className="text-xl font-black leading-none text-foreground">{value}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p></div>
    </div>
  )
}

function UserCard({ user, getRoleBadge, onEdit, onToggleStatus, isToggling, onDelete, isDeleting }: { user: User; getRoleBadge: (role: string) => React.ReactNode; onEdit?: () => void; onToggleStatus?: () => void; isToggling: boolean; onDelete?: () => void; isDeleting: boolean }) {
  return (
    <Card className="group relative cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 shadow-inner">
              <span className="text-lg font-black text-indigo-700">
                {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-bold text-foreground transition-colors group-hover:text-indigo-600">{user.full_name}</h3>
                {getRoleBadge(user.role)}
                <Badge variant={user.is_active ? 'success' : 'danger'} className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                  {user.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              <div className="flex flex-col gap-2 text-xs font-medium text-muted-foreground sm:flex-row sm:items-center sm:gap-5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {user.phone}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Connexion : {user.last_login ? new Date(user.last_login).toLocaleDateString('fr-FR') : 'Jamais'}
                </div>
              </div>
            </div>
          </div>
          {onEdit && (
            <div className="mt-4 flex items-center gap-2 opacity-100 transition-opacity sm:mt-0 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              {onToggleStatus && (
                <Button variant="ghost" size="sm" onClick={onToggleStatus} disabled={isToggling} className="rounded-full">
                  {user.is_active ? <Archive className="mr-1.5 h-3.5 w-3.5" /> : <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />}
                  {user.is_active ? 'Archiver' : 'Réactiver'}
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="sm" onClick={onDelete} disabled={isDeleting} className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />Supprimer
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={onEdit} className="rounded-full shadow-sm hover:bg-white hover:shadow">
                Modifier <UserRound className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function UserModal({ isOpen, user, onClose, onSuccess }: { isOpen: boolean; user?: User; onClose: () => void; onSuccess: () => void }) {
  const confirmAction = useConfirmation()
  const { data: currentUser } = useQuery({ queryKey: ['current-user'], queryFn: usersService.getCurrentUser })
  const isOwner = currentUser?.role === 'owner'
  const isSuperuser = currentUser?.is_superuser
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null)
  const isEditingOwner = user?.role === 'owner'
  const mutation = useMutation({
    mutationFn: (data: { email: string; first_name: string; last_name: string; phone?: string; role: string; is_active?: boolean; weekly_capacity_hours?: number }) =>
      user ? usersService.update(user.id, data) : usersService.invite(data),
    onSuccess: (result) => {
      if (user) {
        onSuccess()
      } else if ('temporary_password' in result && typeof result.temporary_password === 'string') {
        setCreatedCredentials({ email: result.email, password: result.temporary_password })
      }
    },
  })
  const resetPassword = useMutation({
    mutationFn: () => usersService.resetPassword(user!.id),
    onSuccess: (result) => {
      setCreatedCredentials({ email: result.email, password: result.temporary_password })
    },
  })

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const payload = {
      email: data.get('email') as string,
      first_name: data.get('first_name') as string,
      last_name: data.get('last_name') as string,
      phone: data.get('phone') as string || undefined,
      role: data.get('role') as string,
      is_active: user
        ? (isEditingOwner ? user.is_active : data.get('is_active') === 'on')
        : undefined,
      weekly_capacity_hours: Number(data.get('weekly_capacity_hours')) || 40,
    }

    if (user) {
      const deactivating = user.is_active && payload.is_active === false
      const reactivating = !user.is_active && payload.is_active === true
      const roleChanged = payload.role !== user.role
      if (deactivating || reactivating || roleChanged) {
        const impacts = [
          ...(deactivating ? ["L’utilisateur ne pourra plus se connecter à l’espace de l’entreprise."] : []),
          ...(reactivating ? ["L’utilisateur retrouvera l’accès avec ses permissions actuelles."] : []),
          ...(roleChanged ? [`Son rôle passera de « ${user.role_display || user.role} » à « ${payload.role === 'manager' ? 'Manager' : 'Employé'} ».`] : []),
        ]
        const { confirmed } = await confirmAction({
          title: deactivating
            ? `Désactiver le compte de ${user.full_name} ?`
            : roleChanged
              ? `Modifier les permissions de ${user.full_name} ?`
              : `Réactiver le compte de ${user.full_name} ?`,
          description: 'Cette modification affecte immédiatement les accès de ce collaborateur.',
          confirmLabel: deactivating ? 'Désactiver le compte' : 'Appliquer la modification',
          tone: deactivating || roleChanged ? 'danger' : 'warning',
          impacts,
          requireText: deactivating ? 'DÉSACTIVER' : undefined,
        })
        if (!confirmed) return
      }
    }

    mutation.mutate(payload)
  }

  const handleResetPassword = async () => {
    if (!user) return
    const { confirmed } = await confirmAction({
      title: `Réinitialiser le mot de passe de ${user.full_name} ?`,
      description: 'Un nouveau mot de passe temporaire sera généré.',
      confirmLabel: 'Générer un nouveau mot de passe',
      tone: 'danger',
      impacts: ["L’ancien mot de passe ne permettra plus de se connecter."],
    })
    if (confirmed) resetPassword.mutate()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Modifier l’utilisateur' : 'Inviter un collaborateur'}>
      {createdCredentials ? (
        <div className="space-y-5">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-semibold text-emerald-800">{user ? 'Mot de passe réinitialisé' : 'Compte créé avec succès'}</p>
            <p className="mt-3 text-sm text-emerald-900">Email : <strong>{createdCredentials.email}</strong></p>
            <p className="mt-1 text-sm text-emerald-900">Mot de passe temporaire : <strong className="font-mono">{createdCredentials.password}</strong></p>
          </div>
          <p className="text-sm text-slate-500">Un e-mail d'invitation avec ces identifiants et l'obligation de changement de mot de passe a été automatiquement envoyé à l'adresse de l'utilisateur. Vous pouvez également les lui transmettre directement par précaution.</p>
          <div className="flex justify-end">
            <Button onClick={onSuccess}>Terminer</Button>
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Informations personnelles</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Prénom
              <div className="relative mt-1">
                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input name="first_name" required defaultValue={user?.first_name} className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 outline-none transition-all hover:border-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Nom
              <div className="relative mt-1">
                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input name="last_name" required defaultValue={user?.last_name} className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 outline-none transition-all hover:border-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Adresse email
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input name="email" type="email" required defaultValue={user?.email} readOnly={!!user} className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 outline-none transition-all hover:border-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 read-only:bg-slate-100" />
              </div>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Téléphone
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input name="phone" defaultValue={user?.phone} className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 outline-none transition-all hover:border-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
            </label>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <h4 className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            Paramètres du compte
            {user && !isEditingOwner && (
              <label className="flex cursor-pointer items-center gap-2">
                <span className="text-xs font-medium normal-case text-slate-600">Statut actif</span>
                <div className="relative inline-block h-5 w-9 align-middle select-none transition duration-200 ease-in">
                  <input type="checkbox" name="is_active" defaultChecked={user.is_active} className="peer absolute block h-5 w-9 cursor-pointer appearance-none rounded-full bg-slate-300 transition-colors checked:bg-indigo-600" />
                  <span className="absolute left-1 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-white transition-all peer-checked:left-5"></span>
                </div>
              </label>
            )}
          </h4>
          
          <label className="block text-sm font-medium text-slate-700">
            Capacité hebdomadaire
            <div className="relative mt-1 max-w-[200px]">
              <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input name="weekly_capacity_hours" type="number" min={1} max={168} defaultValue={user?.weekly_capacity_hours || 40} className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-14 outline-none transition-all hover:border-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">heures</span>
            </div>
          </label>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-slate-700">Rôle et permissions</span>
            {isEditingOwner ? (
              <div className="flex items-center gap-3 rounded-xl border-2 border-purple-200 bg-purple-50 p-3">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-semibold text-purple-900">Propriétaire (Owner)</p>
                  <p className="text-xs text-purple-700">Accès total. Impossible de modifier ce rôle.</p>
                </div>
                <input type="hidden" name="role" value="owner" />
              </div>
            ) : !isOwner ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <UserRound className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="font-semibold text-slate-900">{user?.role === 'manager' ? 'Manager' : 'Employé'}</p>
                  <p className="text-xs text-slate-500">Seul un propriétaire peut modifier le rôle.</p>
                </div>
                <input type="hidden" name="role" value={user?.role || 'employee'} />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="group relative flex cursor-pointer rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50 has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50 has-[:checked]:ring-1 has-[:checked]:ring-indigo-600">
                  <input type="radio" name="role" value="employee" defaultChecked={!user || user.role === 'employee'} className="peer sr-only" />
                  <UserRound className="h-5 w-5 text-slate-400 group-has-[:checked]:text-indigo-600" />
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-semibold text-slate-900 group-has-[:checked]:text-indigo-900">Employé</p>
                    <p className="text-xs text-slate-500 group-has-[:checked]:text-indigo-700">Accès standard. Voit ses propres tâches.</p>
                  </div>
                </label>
                
                <label className="group relative flex cursor-pointer rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50 has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50 has-[:checked]:ring-1 has-[:checked]:ring-indigo-600">
                  <input type="radio" name="role" value="manager" defaultChecked={user?.role === 'manager'} className="peer sr-only" />
                  <Briefcase className="h-5 w-5 text-slate-400 group-has-[:checked]:text-indigo-600" />
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-semibold text-slate-900 group-has-[:checked]:text-indigo-900">Manager</p>
                    <p className="text-xs text-slate-500 group-has-[:checked]:text-indigo-700">Peut créer et assigner des tâches.</p>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {mutation.isError && (
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">
            {mutation.error instanceof Error ? mutation.error.message : 'Opération impossible.'}
          </div>
        )}
        {resetPassword.isError && (
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">
            {resetPassword.error instanceof Error ? resetPassword.error.message : 'Réinitialisation impossible.'}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <div className="flex gap-2">
            {user && (isOwner || isSuperuser) && (!isEditingOwner || isSuperuser) && (
              <Button type="button" variant="secondary" disabled={resetPassword.isPending} onClick={handleResetPassword}>
                {resetPassword.isPending ? 'Réinitialisation…' : 'Nouveau mot de passe'}
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Enregistrement…' : user ? 'Enregistrer les modifications' : 'Inviter l’utilisateur'}
            </Button>
          </div>
        </div>
      </form>
      )}
    </Modal>
  )
}

const auditLabels: Record<UserAuditLog['action'], string> = {
  account_created: 'Compte créé',
  account_updated: 'Compte modifié',
  password_reset: 'Mot de passe réinitialisé',
  account_deactivated: 'Compte désactivé',
  account_activated: 'Compte réactivé',
  account_deleted: 'Compte supprimé définitivement',
}

function AuditLogModal({ isOpen, onClose, entries, isLoading }: { isOpen: boolean; onClose: () => void; entries: UserAuditLog[]; isLoading: boolean }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Historique administratif" size="lg">
      {isLoading ? <p className="text-sm text-slate-500">Chargement…</p> : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{auditLabels[entry.action] || entry.action}</p>
                <time className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleString('fr-FR')}</time>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {entry.target_name || String(entry.details.target_name || 'Compte supprimé')} · par {entry.actor_name || 'Système'}
              </p>
            </div>
          ))}
          {entries.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Aucune action administrative enregistrée.</p>}
        </div>
      )}
    </Modal>
  )
}
