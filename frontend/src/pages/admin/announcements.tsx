import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { announcementsService } from '@/services/announcements'
import { requirePlatformAdmin } from '@/router/auth'
import { ErrorState } from '@/components/ui/ErrorState'
import { Edit2, Plus, Trash2, Power, PowerOff } from 'lucide-react'
import type { SystemAnnouncement, AnnouncementType, AnnouncementTarget } from '@/domain/types'

export const Route = createFileRoute('/admin/announcements')({
  beforeLoad: requirePlatformAdmin,
  component: AdminAnnouncementsPage,
})

function AdminAnnouncementsPage() {
  const queryClient = useQueryClient()
  const { data: announcements, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: announcementsService.listAnnouncements,
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<SystemAnnouncement | null>(null)

  const deleteMutation = useMutation({
    mutationFn: announcementsService.deleteAnnouncement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }),
  })

  const handleDelete = (id: number) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette annonce ?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleEdit = (ann: SystemAnnouncement) => {
    setEditingAnnouncement(ann)
    setIsModalOpen(true)
  }

  const toggleMutation = useMutation({
    mutationFn: (ann: SystemAnnouncement) => announcementsService.updateAnnouncement(ann.id, { is_active: !ann.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }),
  })

  const handleToggleActive = (ann: SystemAnnouncement) => {
    toggleMutation.mutate(ann)
  }

  const handleCreate = () => {
    setEditingAnnouncement(null)
    setIsModalOpen(true)
  }

  if (isLoading) {
    return (
      <Layout title="Communications & Annonces">
        <div className="mx-auto max-w-7xl px-4 py-8 animate-pulse space-y-4">
          <div className="h-8 w-64 rounded-xl bg-slate-200" />
          <div className="h-96 rounded-3xl bg-slate-200" />
        </div>
      </Layout>
    )
  }

  if (isError) {
    return (
      <Layout title="Communications & Annonces">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <ErrorState onRetry={() => refetch()} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Communications & Annonces">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Espace Super-Admin</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Communications Systèmes</h2>
            <p className="mt-1 text-sm text-slate-500">Gérez les annonces importantes affichées sur l'interface de tous les utilisateurs (maintenances, nouveautés).</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle Annonce
          </Button>
        </div>

        <Card className="overflow-hidden border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Message</th>
                  <th className="px-6 py-4">Public cible</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4">Créé le</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {announcements?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      Aucune annonce configurée.
                    </td>
                  </tr>
                )}
                {announcements?.map((ann) => (
                  <tr key={ann.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 max-w-md truncate">{ann.message}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {ann.target_audience_display}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={ann.type === 'danger' ? 'danger' : ann.type === 'warning' ? 'warning' : 'info'}>
                        {ann.type_display}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={ann.is_active ? 'success' : 'default'}>
                        {ann.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(ann.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant={ann.is_active ? "outline" : "primary"} 
                          size="sm" 
                          onClick={() => handleToggleActive(ann)}
                          title={ann.is_active ? "Désactiver cette annonce" : "Activer cette annonce"}
                        >
                          {ann.is_active ? (
                            <>
                              <PowerOff className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
                              <span className="text-slate-600">Désactiver</span>
                            </>
                          ) : (
                            <>
                              <Power className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                              <span>Activer</span>
                            </>
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(ann)} title="Modifier">
                          <Edit2 className="h-4 w-4 text-slate-500 hover:text-indigo-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(ann.id)} title="Supprimer">
                          <Trash2 className="h-4 w-4 text-slate-500 hover:text-rose-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {isModalOpen && (
          <AnnouncementModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            announcement={editingAnnouncement}
          />
        )}
      </div>
    </Layout>
  )
}

function AnnouncementModal({ isOpen, onClose, announcement }: { isOpen: boolean; onClose: () => void; announcement: SystemAnnouncement | null }) {
  const queryClient = useQueryClient()
  const isEditing = !!announcement

  const mutation = useMutation({
    mutationFn: (data: Partial<SystemAnnouncement>) =>
      isEditing ? announcementsService.updateAnnouncement(announcement.id, data) : announcementsService.createAnnouncement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    mutation.mutate({
      message: formData.get('message') as string,
      type: formData.get('type') as AnnouncementType,
      target_audience: formData.get('target_audience') as AnnouncementTarget,
      is_active: formData.get('is_active') === 'on',
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Modifier l'annonce" : "Créer une annonce"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Message</label>
          <textarea
            name="message"
            required
            defaultValue={announcement?.message}
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Ex: Maintenance prévue ce soir à 22h..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700">Type d'annonce</label>
          <select
            name="type"
            required
            defaultValue={announcement?.type || 'info'}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="info">Information (Bleu)</option>
            <option value="warning">Avertissement (Orange)</option>
            <option value="danger">Critique (Rouge)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Public cible</label>
          <select
            name="target_audience"
            required
            defaultValue={announcement?.target_audience || 'all'}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Tous les utilisateurs</option>
            <option value="owners">Propriétaires d'entreprise uniquement</option>
          </select>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            name="is_active"
            id="is_active"
            defaultChecked={announcement ? announcement.is_active : true}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
            {isEditing ? 'Annonce active (visible)' : 'Publier immédiatement (Actif)'}
          </label>
        </div>

        {mutation.isError && (
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">
            {mutation.error instanceof Error ? mutation.error.message : 'Une erreur est survenue.'}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
