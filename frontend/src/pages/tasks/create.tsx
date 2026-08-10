import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Modal } from '@/components/ui/Modal'
import { TaskForm } from '@/components/tasks/TaskForm'
import { tasksService } from '@/services/tasks'
import { authService } from '@/services/auth'
import { teamsService } from '@/services/teams'
import { useState } from 'react'
import { requireCompanyMember } from '@/router/auth'
import { Button } from '@/components/ui/Button'
import { LayoutTemplate } from 'lucide-react'

import { useSmartBack } from '@/utils/navigation'

export const Route = createFileRoute('/tasks/create')({
  beforeLoad: requireCompanyMember,
  component: CreateTaskPage,
})

function CreateTaskPage() {
  const navigate = useNavigate()
  const goBack = useSmartBack('/tasks')
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(true)
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
  })


  const canAssign = currentUser?.role === 'owner' || currentUser?.role === 'manager'

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => authService.list(),
    enabled: canAssign,
  })

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsService.list,
    enabled: canAssign,
  })
  const { data: templates = [] } = useQuery({
    queryKey: ['task-templates'],
    queryFn: tasksService.listTemplates,
  })

  const mutation = useMutation({
    mutationFn: tasksService.create,
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      navigate({ to: '/tasks/$taskId', params: { taskId: String(task.id) } })
    }
  })
  const instantiateMutation = useMutation({
    mutationFn: (templateId: number) => tasksService.instantiateTemplate(templateId),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      navigate({ to: '/tasks/$taskId', params: { taskId: String(task.id) } })
    },
  })

  const handleClose = () => {
    setIsModalOpen(false)
    goBack()
  }

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
    <Layout title="Nouvelle tâche">
      <Modal isOpen={isModalOpen} onClose={handleClose} title="Créer une nouvelle tâche" size="xl">
        {templates.length > 0 && (
          <div className="mb-4 rounded-2xl border border-border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold text-foreground">Créer rapidement depuis un modèle</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {templates.map((template) => (
                <Button key={template.id} type="button" size="sm" variant="secondary" disabled={instantiateMutation.isPending} onClick={() => instantiateMutation.mutate(template.id)} className="shrink-0 flex items-center gap-1.5">
                  <span>{template.is_shared === false ? '🔒' : '🏢'}</span>
                  <span>{template.name}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
        <TaskForm
          onSubmit={mutation.mutate}
          onCancel={handleClose}
          users={users}
          teams={teams}
          canAssign={canAssign}
          isSubmitting={mutation.isPending}
          error={mutation.isError ? (mutation.error instanceof Error ? mutation.error.message : 'Création impossible.') : undefined}
        />
      </Modal>
    </Layout>
  )
}
