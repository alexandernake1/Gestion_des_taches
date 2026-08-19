import { useTutorial, TOTAL_TOUR_STEPS } from '@/context/TutorialContext'
import {
  Sparkles,
  BarChart3,
  Play,
  ShieldCheck,
  BellRing,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'

type TutorialRoute = '/dashboard' | '/tasks' | '/approvals' | '/settings'

interface StepData {
  icon: typeof Sparkles
  badge: string
  title: string
  description: string
  highlights: string[]
  shortcutAction?: {
    label: string
    route: TutorialRoute
  }
}

const TOUR_STEPS: StepData[] = [
  {
    icon: Sparkles,
    badge: 'Étape 1 sur 5 • Bienvenue',
    title: 'Bienvenue dans votre nouvel espace de travail',
    description:
      'Activity Control réunit les projets, tâches, validations et échanges de votre équipe dans une interface fluide et ultra-lisible. Basculez en un clic entre votre Espace Personnel autonome et vos Espaces Entreprises multi-équipes.',
    highlights: [
      'Bascule instantanée Espace Personnel ↔ Entreprise',
      'Navigation latérale complète et responsive',
      'Rôles clairs : Propriétaire, Manager, Employé',
    ],
  },
  {
    icon: BarChart3,
    badge: 'Étape 2 sur 5 • Pilotage & KPIs',
    title: 'Un tableau de bord complet pour agir au bon moment',
    description:
      'Suivez en temps réel la progression des projets, vos priorités du jour, la répartition de la charge par collaborateur et les délais moyens d’exécution sans chercher dans plusieurs logiciels.',
    highlights: [
      'Indicateurs clés et taux de complétion',
      'Charge de travail par collaborateur',
      'Filtres par équipe, projet et période',
    ],
    shortcutAction: {
      label: 'Voir le Tableau de bord',
      route: '/dashboard',
    },
  },
  {
    icon: Play,
    badge: 'Étape 3 sur 5 • Tâches & Démarrage',
    title: 'Créez, assignez et démarrez vos tâches en un clic',
    description:
      'Organisez vos activités en vues Kanban ou Liste, découpez-les en sous-tâches et liez des dépendances. Dès réception d’un rappel, le bouton « Commencer la tâche » passe directement son statut en cours sans détour.',
    highlights: [
      'Bouton d’action directe « Commencer la tâche »',
      'Gestion des dépendances et sous-tâches',
      'Modèles de tâches réutilisables en 1 clic',
    ],
    shortcutAction: {
      label: 'Explorer les Tâches',
      route: '/tasks',
    },
  },
  {
    icon: ShieldCheck,
    badge: 'Étape 4 sur 5 • Validations & Reports',
    title: 'Un circuit de validation hiérarchique sans friction',
    description:
      'Garantissez la qualité de chaque livrable avant clôture. Les managers approuvent ou refusent avec motif obligatoire, et les collaborateurs peuvent solliciter un report d’échéance motivé en toute transparence.',
    highlights: [
      'Validation de fin de tâche avec pièces jointes',
      'Demandes de report d’échéance avec motif',
      'Compteurs et badges mis à jour en temps réel',
    ],
    shortcutAction: {
      label: 'Accéder aux Validations',
      route: '/approvals',
    },
  },
  {
    icon: BellRing,
    badge: 'Étape 5 sur 5 • Accompagnement',
    title: 'Restez toujours synchronisé et soutenu',
    description:
      'Recevez des alertes en temps réel avec signal sonore discret. À tout moment, cliquez sur l’icône Aide dans la barre supérieure ou les paramètres pour relancer ce guide ou consulter les tutoriels rapides.',
    highlights: [
      'Alertes instantanées WebSockets & son chime',
      'Centre d’aide et guides accessibles partout',
      'Assistance disponible dans vos paramètres',
    ],
    shortcutAction: {
      label: 'Découvrir les Paramètres',
      route: '/settings',
    },
  },
]

export function ProductTourModal() {
  const { isTourOpen, currentStep, nextStep, prevStep, closeTour, goToStep } = useTutorial()
  const navigate = useNavigate()

  if (!isTourOpen) return null

  const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0]
  const Icon = step.icon
  const isLastStep = currentStep === TOTAL_TOUR_STEPS - 1

  const handleShortcut = (route: TutorialRoute) => {
    closeTour()
    navigate({ to: route })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={closeTour}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 bg-slate-900 text-slate-100 shadow-2xl shadow-indigo-950/80 z-10 animate-scale-up">
        {/* Glow ambient accent */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              {step.badge}
            </span>
          </div>

          <button
            onClick={closeTour}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Fermer le guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {step.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {step.description}
            </p>
          </div>

          {/* Highlights list */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              Ce que vous pouvez faire :
            </p>
            {step.highlights.map((highlight, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>

          {/* Optional Direct Shortcut Link */}
          {step.shortcutAction && (
            <button
              type="button"
              onClick={() => handleShortcut(step.shortcutAction!.route)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <span>{step.shortcutAction.label}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Footer controls & Progress */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-white/10 bg-slate-950/60 px-6 py-4">
          {/* Bullets indicator */}
          <div className="flex items-center gap-1.5 justify-center sm:justify-start">
            {Array.from({ length: TOTAL_TOUR_STEPS }).map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                aria-label={`Aller à l'étape ${index + 1}`}
                className={`h-2 rounded-full transition-all ${
                  currentStep === index
                    ? 'w-6 bg-indigo-500 shadow-sm shadow-indigo-500/50'
                    : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeTour}
              className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Passer
            </button>

            {currentStep > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={prevStep}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Précédent
              </Button>
            )}

            <Button
              size="sm"
              onClick={nextStep}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold shadow-md shadow-indigo-500/30 hover:brightness-110"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  J'ai compris !
                </>
              ) : (
                <>
                  Suivant
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
