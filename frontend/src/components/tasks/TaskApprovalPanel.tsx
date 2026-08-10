import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock3, ShieldCheck, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useConfirmation } from '@/components/ui/confirmation'
import { tasksService } from '@/services/tasks'
import type { ApprovalRequest, Task, User } from '@/domain/types'

interface TaskApprovalPanelProps {
  task: Task
  currentUser: User
}

export function TaskApprovalPanel({ task, currentUser }: TaskApprovalPanelProps) {
  const queryClient = useQueryClient()
  const confirmAction = useConfirmation()
  const [reason, setReason] = useState('')
  const isManager = currentUser.role === 'manager' || currentUser.role === 'owner' || currentUser.is_superuser

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ['task-approvals', String(task.id)],
    queryFn: () => tasksService.getTaskApprovals(task.id),
  })
  const pendingApproval = approvals.find((approval) => approval.status === 'pending')

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['task-approvals', String(task.id)] })
    queryClient.invalidateQueries({ queryKey: ['approvals'] })
    queryClient.invalidateQueries({ queryKey: ['task', String(task.id)] })
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
  }

  const requestMutation = useMutation({
    mutationFn: () => tasksService.requestCompletionApproval(task.id, reason.trim()),
    onSuccess: () => {
      setReason('')
      refresh()
      toast.success('Demande de validation envoyée')
    },
  })

  const reviewMutation = useMutation({
    mutationFn: ({ approval, status, reviewComment }: {
      approval: ApprovalRequest
      status: 'approved' | 'rejected'
      reviewComment?: string
    }) => tasksService.reviewApproval(approval.id, {
      status,
      review_comment: reviewComment,
    }),
    onSuccess: (_, variables) => {
      refresh()
      toast.success(variables.status === 'approved' ? 'Clôture approuvée' : 'Demande refusée')
    },
  })

  const review = async (approval: ApprovalRequest, decision: 'approved' | 'rejected') => {
    const approving = decision === 'approved'
    const result = await confirmAction({
      title: approving ? 'Approuver la clôture ?' : 'Refuser la clôture ?',
      description: approving
        ? `La tâche « ${task.title} » sera immédiatement marquée comme terminée.`
        : `La tâche « ${task.title} » restera dans son statut actuel.`,
      confirmLabel: approving ? 'Approuver et clôturer' : 'Refuser la demande',
      tone: approving ? 'warning' : 'danger',
      impacts: approving
        ? ['La décision sera enregistrée dans l’historique de la tâche.']
        : ['Le collaborateur recevra votre motif de refus.'],
      reasonLabel: approving ? 'Commentaire de validation' : 'Motif du refus',
      reasonRequired: !approving,
    })
    if (result.confirmed) {
      reviewMutation.mutate({ approval, status: decision, reviewComment: result.reason })
    }
  }

  if (isLoading) return <div className="h-32 animate-pulse rounded-2xl bg-muted" />

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary/10 p-2 text-primary"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <h3 className="font-bold text-foreground">Validation de clôture</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {task.requires_completion_approval
                ? 'Cette tâche doit être approuvée par un responsable avant de passer au statut terminé.'
                : 'La clôture de cette tâche ne nécessite pas de validation préalable.'}
            </p>
          </div>
        </div>

        {!isManager && task.requires_completion_approval && task.status !== 'completed' && !pendingApproval && (
          <form className="mt-5 space-y-3 border-t border-border/60 pt-5" onSubmit={(event) => {
            event.preventDefault()
            if (reason.trim().length >= 3) requestMutation.mutate()
          }}>
            <label className="block text-sm font-semibold text-foreground">
              Résumé du travail réalisé *
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                placeholder="Décrivez brièvement le résultat livré et les points à vérifier…"
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            {requestMutation.isError && (
              <p className="text-sm text-destructive">{requestMutation.error instanceof Error ? requestMutation.error.message : 'Demande impossible.'}</p>
            )}
            <Button type="submit" disabled={reason.trim().length < 3 || requestMutation.isPending}>
              {requestMutation.isPending ? 'Envoi…' : 'Demander la validation'}
            </Button>
          </form>
        )}

        {!isManager && pendingApproval && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Clock3 className="h-5 w-5 shrink-0" />
            Votre demande est en attente de décision d’un responsable.
          </div>
        )}
      </div>

      <div className="space-y-3">
        {approvals.map((approval) => (
          <div key={approval.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-foreground">{approval.action_display}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Demandée par {approval.requested_by_name || 'Utilisateur'} · {new Date(approval.created_at).toLocaleString('fr-FR')}
                </p>
              </div>
              <Badge variant={approval.status === 'approved' ? 'success' : approval.status === 'rejected' ? 'danger' : 'warning'}>
                {approval.status_display}
              </Badge>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">{approval.reason}</p>
            {approval.review_comment && (
              <div className="mt-4 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                <strong className="text-foreground">Décision de {approval.reviewed_by_name || 'Responsable'} :</strong>{' '}
                {approval.review_comment}
              </div>
            )}
            {isManager && approval.status === 'pending' && (
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">
                <Button variant="danger" size="sm" onClick={() => review(approval, 'rejected')} disabled={reviewMutation.isPending}>
                  <XCircle className="h-4 w-4" /> Refuser
                </Button>
                <Button size="sm" onClick={() => review(approval, 'approved')} disabled={reviewMutation.isPending}>
                  <CheckCircle2 className="h-4 w-4" /> Approuver
                </Button>
              </div>
            )}
          </div>
        ))}
        {approvals.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Aucune demande de validation pour cette tâche.
          </p>
        )}
      </div>
    </div>
  )
}
