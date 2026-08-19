import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTutorial } from '@/context/TutorialContext'
import {
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  ChevronDown,
  X,
  Play,
  ListTodo,
  Users,
  Settings,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface ChecklistItem {
  id: string
  title: string
  description: string
  icon: typeof Play
  actionLabel: string
  onAction: () => void
}

export function OnboardingChecklist({ isPersonalWorkspace }: { isPersonalWorkspace?: boolean }) {
  const { startTour, hasSeenTour } = useTutorial()
  const navigate = useNavigate()

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return localStorage.getItem('onboarding_checklist_dismissed') === 'true'
  })

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('onboarding_checklist_collapsed') === 'true'
  })

  const [completedItems, setCompletedItems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('onboarding_completed_items')
      return saved ? JSON.parse(saved) : hasSeenTour ? ['tour'] : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (hasSeenTour && !completedItems.includes('tour')) {
      const updated = [...completedItems, 'tour']
      setCompletedItems(updated)
      localStorage.setItem('onboarding_completed_items', JSON.stringify(updated))
    }
  }, [hasSeenTour, completedItems])

  const toggleItem = (id: string) => {
    const isCompleted = completedItems.includes(id)
    const updated = isCompleted
      ? completedItems.filter((item) => item !== id)
      : [...completedItems, id]
    setCompletedItems(updated)
    localStorage.setItem('onboarding_completed_items', JSON.stringify(updated))
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('onboarding_checklist_dismissed', 'true')
  }

  const handleToggleCollapse = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    localStorage.setItem('onboarding_checklist_collapsed', String(next))
  }

  if (isDismissed) return null

  const items: ChecklistItem[] = [
    {
      id: 'tour',
      title: 'Suivre la visite guidée interactive',
      description: 'Découvrez en 5 étapes l’ensemble des fonctionnalités clés.',
      icon: Play,
      actionLabel: 'Lancer le guide',
      onAction: () => {
        toggleItem('tour')
        startTour(0)
      },
    },
    {
      id: 'task',
      title: 'Créer votre première tâche',
      description: 'Définissez une priorité, une échéance et assignez un responsable.',
      icon: ListTodo,
      actionLabel: 'Créer une tâche',
      onAction: () => {
        toggleItem('task')
        navigate({ to: '/tasks' })
      },
    },
    ...(!isPersonalWorkspace
      ? [
          {
            id: 'team',
            title: 'Explorer vos équipes & collaborateurs',
            description: 'Structurez vos équipes et vérifiez les attributions de rôles.',
            icon: Users,
            actionLabel: 'Voir les équipes',
            onAction: () => {
              toggleItem('team')
              navigate({ to: '/teams' })
            },
          },
        ]
      : []),
    {
      id: 'settings',
      title: 'Configurer vos notifications & profil',
      description: 'Activez le son chime et les alertes push pour ne rien manquer.',
      icon: Settings,
      actionLabel: 'Paramètres',
      onAction: () => {
        toggleItem('settings')
        navigate({ to: '/settings' })
      },
    },
  ]

  const total = items.length
  const completedCount = items.filter((item) => completedItems.includes(item.id)).length
  const progressPercent = Math.round((completedCount / total) * 100)

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card shadow-sm overflow-hidden transition-all duration-200">
      {/* Top Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between gap-4 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-foreground truncate">
                Guide de démarrage rapide
              </h3>
              <span className="rounded-full bg-primary/15 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                {completedCount}/{total} complété{completedCount > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {progressPercent === 100
                ? 'Félicitations ! Vous maîtrisez les fondamentaux d’Activity Control.'
                : 'Quelques étapes simples pour démarrer avec confiance.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={isCollapsed ? 'Déplier le guide' : 'Replier le guide'}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Masquer définitivement"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-muted overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Body Content */}
      {!isCollapsed && (
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const isCompleted = completedItems.includes(item.id)
              const Icon = item.icon

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                    isCompleted
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title={isCompleted ? 'Marquer comme non fait' : 'Marquer comme fait'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/20" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/60" />
                        )}
                      </button>
                    </div>

                    <h4
                      className={`text-xs font-bold ${
                        isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                      }`}
                    >
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-border/50 flex justify-end">
                    <Button
                      size="sm"
                      variant={isCompleted ? 'secondary' : 'outline'}
                      className="text-xs h-7 px-2.5 font-semibold"
                      onClick={item.onAction}
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="h-3 w-3 ml-1" />
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
