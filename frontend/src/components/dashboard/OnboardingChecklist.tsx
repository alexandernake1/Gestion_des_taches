import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTutorial } from '@/context/TutorialContext'
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ChevronDown,
  X,
  Play,
  ListTodo,
  Users,
  FolderKanban,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { Role } from '@/domain/types'

interface ChecklistItem {
  id: string
  title: string
  description: string
  icon: typeof Play
  actionLabel: string
  onAction: () => void
  completed: boolean
}

interface OnboardingChecklistProps {
  isPersonalWorkspace?: boolean
  role?: Role
  createdTaskCount?: number
  assignedTaskCount?: number
  teamCount?: number
  projectCount?: number
}

export function OnboardingChecklist({
  isPersonalWorkspace = false,
  role,
  createdTaskCount = 0,
  assignedTaskCount = 0,
  teamCount = 0,
  projectCount = 0,
}: OnboardingChecklistProps) {
  const { startTour, hasSeenTour } = useTutorial()
  const navigate = useNavigate()
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return localStorage.getItem('onboarding_checklist_dismissed') === 'true'
  })
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('onboarding_checklist_collapsed') === 'true'
  })

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('onboarding_checklist_dismissed', 'true')
  }

  const handleToggleCollapse = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    localStorage.setItem('onboarding_checklist_collapsed', String(next))
  }

  const isCollaborator = role === 'employee'
  const hasWorkStarted = isCollaborator ? assignedTaskCount > 0 : createdTaskCount > 0
  const items: ChecklistItem[] = [
    {
      id: 'tour',
      title: 'Suivre la visite guidée interactive',
      description: 'Découvrez en 5 étapes les fonctionnalités essentielles de la plateforme.',
      icon: Play,
      actionLabel: 'Lancer le guide',
      onAction: () => startTour(0),
      completed: hasSeenTour,
    },
    {
      id: 'task',
      title: isCollaborator ? 'Consulter vos tâches confiées' : 'Créer votre première tâche',
      description: isCollaborator
        ? 'Retrouvez une tâche confiée, son échéance et les actions attendues.'
        : 'Définissez une priorité, une échéance et, si besoin, un responsable.',
      icon: ListTodo,
      actionLabel: isCollaborator ? 'Voir mes tâches' : 'Créer une tâche',
      onAction: () => navigate({ to: '/tasks' }),
      completed: hasWorkStarted,
    },
    ...(!isPersonalWorkspace && !isCollaborator
      ? [
          {
            id: 'team',
            title: 'Créer votre première équipe',
            description: 'Rassemblez au moins deux personnes et désignez un manager.',
            icon: Users,
            actionLabel: 'Gérer les équipes',
            onAction: () => navigate({ to: '/teams' }),
            completed: teamCount > 0,
          },
          {
            id: 'project',
            title: 'Créer votre premier projet',
            description: 'Regroupez les tâches autour d’un objectif et d’une échéance.',
            icon: FolderKanban,
            actionLabel: 'Gérer les projets',
            onAction: () => navigate({ to: '/projects' }),
            completed: projectCount > 0,
          },
        ]
      : []),
  ]

  if (isDismissed) return null

  const total = items.length
  const completedCount = items.filter((item) => item.completed).length
  const progressPercent = Math.round((completedCount / total) * 100)

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between gap-4 border-b border-border/50 bg-muted/20 p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-black text-foreground">Guide de démarrage rapide</h3>
              <span className="rounded-full border border-primary/20 bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                {completedCount}/{total} complétée{completedCount > 1 ? 's' : ''}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {progressPercent === 100
                ? 'Les actions essentielles sont réalisées.'
                : 'La progression est mise à jour après vos actions réelles.'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={isCollapsed ? 'Déplier le guide' : 'Replier le guide'}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Masquer le guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="h-1 w-full overflow-hidden bg-muted">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {!isCollapsed && (
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => {
              const Icon = item.icon

              return (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                    item.completed
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                          item.completed
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span title={item.completed ? 'Accompli automatiquement' : 'À réaliser'}>
                        <CheckCircle2 className={`h-5 w-5 ${item.completed ? 'fill-emerald-500/20 text-emerald-500' : 'text-muted-foreground/40'}`} />
                      </span>
                    </div>

                    <h4 className={`text-xs font-bold ${item.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {item.title}
                    </h4>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.description}</p>
                  </div>

                  <div className="mt-3 flex justify-end border-t border-border/50 pt-3">
                    <Button
                      size="sm"
                      variant={item.completed ? 'secondary' : 'outline'}
                      className="h-7 px-2.5 text-xs font-semibold"
                      onClick={item.onAction}
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
