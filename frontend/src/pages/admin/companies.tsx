import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { companiesService } from '@/services/companies'
import { requirePlatformAdmin } from '@/router/auth'
import { ErrorState } from '@/components/ui/ErrorState'
import { Plus, Globe, Calendar, Power } from 'lucide-react'

export const Route = createFileRoute('/admin/companies')({
  beforeLoad: requirePlatformAdmin,
  component: AdminCompaniesPage,
})

function AdminCompaniesPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    website: '',
  })
  const [formError, setFormError] = useState('')

  const { data: companies, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: companiesService.listCompanies,
  })

  const createCompanyMutation = useMutation({
    mutationFn: companiesService.createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] })
      setIsModalOpen(false)
      setFormData({ name: '', slug: '', description: '', website: '' })
      setFormError('')
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Erreur lors de la création de la société.')
    },
  })

  const toggleCompanyStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string | number; is_active: boolean }) =>
      companiesService.updateCompany(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] })
    },
  })

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setFormData({ ...formData, name, slug })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.slug) {
      setFormError('Le nom et le slug de la société sont obligatoires.')
      return
    }
    createCompanyMutation.mutate(formData)
  }

  if (isLoading) {
    return (
      <Layout title="Administration des Entreprises">
        <div className="mx-auto max-w-7xl px-4 py-8 animate-pulse space-y-4">
          <div className="h-8 w-64 rounded-xl bg-slate-200" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-3xl bg-slate-200" />
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  if (isError) {
    return (
      <Layout title="Administration des Entreprises">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <ErrorState onRetry={() => refetch()} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Administration des Entreprises">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Espace Super-Admin</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Gestion des Entreprises (Multi-Tenant)</h2>
            <p className="mt-1 text-sm text-slate-500">Supervisez et créez les organisations clientes de la plateforme SaaS.</p>
          </div>

          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Créer une entreprise</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {companies?.map((company) => (
            <Card key={company.id} className="overflow-hidden border-slate-200 transition-all hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 font-bold text-lg">
                      {company.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{company.name}</h3>
                      <p className="text-xs font-mono text-slate-400">slug: {company.slug}</p>
                    </div>
                  </div>
                  <Badge variant={company.is_active ? 'success' : 'danger'}>
                    {company.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {company.description && (
                  <p className="mt-4 text-xs text-slate-600 line-clamp-2">{company.description}</p>
                )}

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(company.created_at).toLocaleDateString('fr-FR')}
                  </span>
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 font-medium text-indigo-600 hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Visiter
                    </a>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                  <Button
                    variant={company.is_active ? 'ghost' : 'secondary'}
                    size="sm"
                    className="flex items-center gap-1.5 text-xs"
                    onClick={() =>
                      toggleCompanyStatusMutation.mutate({
                        id: company.id,
                        is_active: !company.is_active,
                      })
                    }
                  >
                    <Power className="h-3.5 w-3.5" />
                    <span>{company.is_active ? 'Désactiver' : 'Réactiver'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modal création entreprise */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Créer une nouvelle entreprise">
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700">Nom de l'entreprise *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Sahel Digital Corp"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Identifiant Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="ex: sahel-digital-corp"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Courte description de l'entreprise..."
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Site Web</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createCompanyMutation.isPending}>
                {createCompanyMutation.isPending ? 'Création...' : 'Créer la société'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}
