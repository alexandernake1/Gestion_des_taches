import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { tasksService } from '@/services/tasks'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { requireCompanyMember } from '@/router/auth'
import { Plus, Clock, Activity } from 'lucide-react'
import type { Priority } from '@/domain/types'

export const Route = createFileRoute('/tasks/templates')({
  beforeLoad: requireCompanyMember,
  component: TaskTemplatesPage,
})

function TaskTemplatesPage() {
  const queryClient = useQueryClient()
  const { data: templates, isLoading } = useQuery({
    queryKey: ['task-templates'],
    queryFn: tasksService.listTemplates,
  })

  const [isModalOpen, setIsModalOpen] = useState(false)

  const createMutation = useMutation({
    mutationFn: tasksService.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] })
      setIsModalOpen(false)
    },
  })

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createMutation.mutate({
      name: formData.get('name') as string,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      priority: formData.get('priority') as Priority,
      default_duration_days: formData.get('default_duration_days') ? parseInt(formData.get('default_duration_days') as string) : undefined,
    })
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'default' | 'info' | 'warning' | 'danger'> = {
      low: 'default', normal: 'info', high: 'warning', urgent: 'danger'
    }
    const labels: Record<string, string> = {
      low: 'Faible', normal: 'Normale', high: 'Haute', urgent: 'Urgente'
    }
    return <Badge variant={variants[priority]}>{labels[priority]}</Badge>
  }

  return (
    <Layout title="Modèles de Tâches">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">Productivité</span>
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">Modèles de Tâches</h2>
            <p className="mt-1 text-sm text-muted-foreground">Automatisez la création de vos tâches récurrentes en utilisant des modèles.</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau Modèle
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates?.length === 0 && (
              <div className="col-span-full py-12 text-center text-sm text-muted-foreground border-2 border-dashed rounded-2xl">
                Aucun modèle de tâche n'a été créé pour le moment.
              </div>
            )}
            {templates?.map((template) => (
              <Card key={template.id} className="flex flex-col h-full hover:shadow-md transition-shadow bg-card/95 backdrop-blur-sm border-border/50">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-foreground text-lg leading-tight">{template.name}</h3>
                    {getPriorityBadge(template.priority)}
                  </div>
                  <p className="text-sm font-semibold text-foreground/80 mb-2">{template.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{template.description || 'Aucune description'}</p>
                  
                  <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground mt-auto pt-4 border-t border-border/50">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {template.default_duration_days ? `${template.default_duration_days} jours` : 'Sans durée'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      Actif
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Créer un modèle de tâche" size="md">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nom du modèle (ex: Onboarding)</label>
              <input name="name" required className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm focus:border-primary/60 focus:ring-2 focus:ring-primary/25" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Titre de la tâche par défaut</label>
              <input name="title" required className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm focus:border-primary/60 focus:ring-2 focus:ring-primary/25" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <textarea name="description" rows={3} className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary/60 focus:ring-2 focus:ring-primary/25" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Priorité par défaut</label>
                <select name="priority" className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm focus:border-primary/60 focus:ring-2 focus:ring-primary/25">
                  <option value="low">Faible</option>
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Durée (jours)</label>
                <input type="number" name="default_duration_days" min="1" className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm focus:border-primary/60 focus:ring-2 focus:ring-primary/25" placeholder="Optionnel" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createMutation.isPending}>Créer le modèle</Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}
