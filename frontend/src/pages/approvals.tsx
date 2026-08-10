import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ClipboardCheck, Clock3, ExternalLink, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Layout } from '@/components/layout/Layout'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { useConfirmation } from '@/components/ui/confirmation'
import { authService } from '@/services/auth'
import { tasksService } from '@/services/tasks'
import { requireCompanyMember } from '@/router/auth'
import type { ApprovalRequest, ApprovalStatus, TaskReport } from '@/domain/types'

export const Route = createFileRoute('/approvals')({
  beforeLoad: requireCompanyMember,
  component: ApprovalsPage,
})

function ApprovalsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const confirmAction = useConfirmation()
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | ''>('pending')

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
  })
  const { data: approvals = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['approvals', statusFilter],
    queryFn: () => tasksService.getApprovals(statusFilter ? { status: statusFilter } : undefined),
  })
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'owner' || currentUser?.is_superuser
  const { data: reportRequests = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['approval-reports', statusFilter, Boolean(isManager)],
    queryFn: () => isManager
      ? tasksService.getPendingReports({ status: statusFilter || 'all' })
      : tasksService.getMyReports(statusFilter ? { status: statusFilter } : undefined),
    enabled: !!currentUser,
  })

  const reviewMutation = useMutation({
    mutationFn: ({ approval, status, comment }: {
      approval: ApprovalRequest
      status: 'approved' | 'rejected'
      comment?: string
    }) => tasksService.reviewApproval(approval.id, {
      status,
      review_comment: comment,
    }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      queryClient.invalidateQueries({ queryKey: ['task-approvals', String(variables.approval.task)] })
      queryClient.invalidateQueries({ queryKey: ['task', String(variables.approval.task)] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success(variables.status === 'approved' ? 'Clôture approuvée' : 'Demande refusée')
    },
  })

  const reviewReportMutation = useMutation({
    mutationFn: ({ report, status, comment }: {
      report: TaskReport
      status: 'approved' | 'rejected'
      comment?: string
    }) => tasksService.reviewReport(report.task, report.id, {
      status,
      review_comment: comment,
    }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approval-reports'] })
      queryClient.invalidateQueries({ queryKey: ['task-reports', String(variables.report.task)] })
      queryClient.invalidateQueries({ queryKey: ['task', String(variables.report.task)] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success(variables.status === 'approved' ? 'Report approuvé' : 'Report refusé')
    },
  })

  const review = async (approval: ApprovalRequest, decision: 'approved' | 'rejected') => {
    const approving = decision === 'approved'
    const result = await confirmAction({
      title: approving ? 'Approuver cette clôture ?' : 'Refuser cette demande ?',
      description: approving
        ? `La tâche « ${approval.task_title} » sera marquée comme terminée.`
        : `La tâche « ${approval.task_title} » restera inchangée.`,
      confirmLabel: approving ? 'Approuver et clôturer' : 'Refuser',
      tone: approving ? 'warning' : 'danger',
      impacts: ['La décision et son auteur seront conservés dans l’historique.'],
      reasonLabel: approving ? 'Commentaire de validation' : 'Motif du refus',
      reasonRequired: !approving,
    })
    if (result.confirmed) {
      reviewMutation.mutate({ approval, status: decision, comment: result.reason })
    }
  }

  const reviewReport = async (report: TaskReport, decision: 'approved' | 'rejected') => {
    const approving = decision === 'approved'
    const result = await confirmAction({
      title: approving ? 'Approuver ce report ?' : 'Refuser ce report ?',
      description: approving
        ? `L’échéance de « ${report.task_title} » passera au ${new Date(report.new_due_date).toLocaleDateString('fr-FR')}.`
        : `L’échéance actuelle de « ${report.task_title} » sera conservée.`,
      confirmLabel: approving ? 'Approuver le report' : 'Refuser le report',
      tone: approving ? 'warning' : 'danger',
      impacts: approving ? ['La tâche passera au statut reporté.'] : ['Le demandeur recevra votre motif de refus.'],
      reasonLabel: approving ? 'Commentaire de validation' : 'Motif du refus',
      reasonRequired: !approving,
    })
    if (result.confirmed) {
      reviewReportMutation.mutate({ report, status: decision, comment: result.reason })
    }
  }

  const pendingCount = approvals.filter((approval) => approval.status === 'pending').length
    + reportRequests.filter((report) => report.status === 'pending').length

  return (
    <Layout title="Validations">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="rounded-3xl border border-primary/15 bg-gradient-to-br from-card via-primary/5 to-card p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <ClipboardCheck className="h-4 w-4" /> Circuit de décision
              </div>
              <h1 className="mt-2 text-2xl font-black text-foreground">
                {isManager ? 'Demandes à valider' : 'Mes demandes de validation'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {isManager
                  ? 'Examinez les livrables, motivez vos décisions et gardez une trace claire de chaque clôture.'
                  : 'Suivez les demandes envoyées à vos responsables et consultez leurs décisions.'}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-5 py-4 text-center shadow-sm">
              <p className="text-3xl font-black text-foreground">{pendingCount}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">En attente</p>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les validations">
          {([
            ['', 'Toutes'],
            ['pending', 'En attente'],
            ['approved', 'Approuvées'],
            ['rejected', 'Refusées'],
          ] as const).map(([value, label]) => (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => setStatusFilter(value)}
              aria-pressed={statusFilter === value}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                statusFilter === value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading || reportsLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : approvals.length === 0 && reportRequests.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border py-16 text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h2 className="mt-4 font-bold text-foreground">Aucune validation dans cette vue</h2>
            <p className="mt-2 text-sm text-muted-foreground">Les nouvelles demandes apparaîtront ici automatiquement.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <article key={approval.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-foreground">{approval.task_title}</h2>
                      <Badge variant={approval.status === 'approved' ? 'success' : approval.status === 'rejected' ? 'danger' : 'warning'}>
                        {approval.status_display}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {approval.action_display} · {approval.requested_by_name || 'Utilisateur'} · {new Date(approval.created_at).toLocaleString('fr-FR')}
                    </p>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">{approval.reason}</p>
                    {approval.review_comment && (
                      <p className="mt-4 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                        <strong className="text-foreground">Décision de {approval.reviewed_by_name || 'Responsable'} :</strong>{' '}{approval.review_comment}
                      </p>
                    )}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => navigate({ to: '/tasks/$taskId', params: { taskId: String(approval.task) } })}>
                    <ExternalLink className="h-4 w-4" /> Voir la tâche
                  </Button>
                </div>

                {isManager && approval.status === 'pending' && (
                  <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-4">
                    <span className="mr-auto flex items-center gap-2 text-xs font-semibold text-amber-700"><Clock3 className="h-4 w-4" /> Décision attendue</span>
                    <Button variant="danger" size="sm" onClick={() => review(approval, 'rejected')} disabled={reviewMutation.isPending}>
                      <XCircle className="h-4 w-4" /> Refuser
                    </Button>
                    <Button size="sm" onClick={() => review(approval, 'approved')} disabled={reviewMutation.isPending}>
                      <CheckCircle2 className="h-4 w-4" /> Approuver
                    </Button>
                  </div>
                )}
              </article>
            ))}
            {reportRequests.map((report) => (
              <article key={`report-${report.id}`} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-foreground">{report.task_title}</h2>
                      <Badge variant={report.status === 'approved' ? 'success' : report.status === 'rejected' ? 'danger' : 'warning'}>
                        {report.status === 'approved' ? 'Approuvée' : report.status === 'rejected' ? 'Refusée' : 'En attente'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Report d’échéance · {report.requested_by_name || 'Utilisateur'} · {new Date(report.created_at).toLocaleString('fr-FR')}
                    </p>
                    <p className="mt-4 text-sm font-semibold text-foreground">
                      Du {new Date(report.old_due_date).toLocaleDateString('fr-FR')} au {new Date(report.new_due_date).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{report.reason}</p>
                    {report.review_comment && (
                      <p className="mt-4 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                        <strong className="text-foreground">Décision de {report.reviewed_by_name || 'Responsable'} :</strong>{' '}{report.review_comment}
                      </p>
                    )}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => navigate({ to: '/tasks/$taskId', params: { taskId: String(report.task) } })}>
                    <ExternalLink className="h-4 w-4" /> Voir la tâche
                  </Button>
                </div>

                {isManager && report.status === 'pending' && (
                  <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-4">
                    <span className="mr-auto flex items-center gap-2 text-xs font-semibold text-amber-700"><Clock3 className="h-4 w-4" /> Report à examiner</span>
                    <Button variant="danger" size="sm" onClick={() => reviewReport(report, 'rejected')} disabled={reviewReportMutation.isPending}>
                      <XCircle className="h-4 w-4" /> Refuser
                    </Button>
                    <Button size="sm" onClick={() => reviewReport(report, 'approved')} disabled={reviewReportMutation.isPending}>
                      <CheckCircle2 className="h-4 w-4" /> Approuver
                    </Button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
