import { useState } from 'react'
import { useTutorial } from '@/context/TutorialContext'
import {
  X,
  Play,
  HelpCircle,
  BookOpen,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  ListTodo,
  Users,
  CreditCard,
  Keyboard,
  RotateCcw,
  Search,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface GuideTopic {
  id: string
  title: string
  category: 'tasks' | 'approvals' | 'teams' | 'billing'
  icon: typeof ListTodo
  summary: string
  steps: string[]
  tip?: string
}

const GUIDES: GuideTopic[] = [
  {
    id: 'create-task',
    title: 'Créer et démarrer une tâche',
    category: 'tasks',
    icon: ListTodo,
    summary: 'Comment structurer une tâche et utiliser l’action rapide de démarrage.',
    steps: [
      'Cliquez sur « Nouvelle tâche » depuis le tableau de bord ou la vue Tâches.',
      'Renseignez le titre, la description, la date d’échéance et assignez un collaborateur ou une équipe.',
      'Optionnel : ajoutez des sous-tâches ou liez des dépendances requises avant clôture.',
      'À la réception de la tâche ou d’un rappel, cliquez directement sur « Commencer la tâche » pour la passer à l’état « En cours ».',
    ],
    tip: 'Vous pouvez aussi sauvegarder n’importe quelle tâche complexe comme modèle réutilisable.',
  },
  {
    id: 'approvals-flow',
    title: 'Gérer les validations et reports d’échéance',
    category: 'approvals',
    icon: ShieldCheck,
    summary: 'Le fonctionnement des approbations de fin et des reports motivés.',
    steps: [
      'Validation de fin : lorsque la tâche exige une revue, l’assigné clique sur « Demander la validation » avec ses pièces jointes.',
      'Les managers et créateurs sont instantanément notifiés et peuvent approuver ou refuser (avec motif obligatoire).',
      'Report d’échéance : si un imprévu survient, le collaborateur formule une demande de report avec la nouvelle date souhaitée et une justification.',
      'L’approbation met immédiatement à jour les compteurs de la barre latérale.',
    ],
    tip: 'Les motifs de refus et commentaires de validation sont tracés dans l’historique immuable de la tâche.',
  },
  {
    id: 'roles-workspaces',
    title: 'Comprendre les rôles et espaces de travail',
    category: 'teams',
    icon: Users,
    summary: 'Basculez entre votre compte personnel et les espaces de travail entreprise.',
    steps: [
      'Espace Personnel : dédié à vos tâches privées, gratuit et sans hiérarchie.',
      'Espace Entreprise : active la collaboration multi-utilisateurs avec équipes et projets partagés.',
      'Rôle Propriétaire / Owner : gère l’abonnement, les équipes, et les paramètres d’entreprise.',
      'Rôle Manager : supervise les tâches de ses équipes, approuve les livrables et valide les reports.',
      'Rôle Employé : réalise ses tâches assignées, échange des commentaires et sollicite des validations.',
    ],
  },
  {
    id: 'billing-prorata',
    title: 'Facturation, changements d’offres et crédits',
    category: 'billing',
    icon: CreditCard,
    summary: 'Comment fonctionne le calcul au prorata et le solde créditeur.',
    steps: [
      'Lors d’un changement d’offre ou ajout d’équipe, le système calcule automatiquement le prorata temporis restant sur la période actuelle.',
      'Si le changement génère un trop-perçu, un excédent de crédit est conservé sur votre compte entreprise.',
      'Cet excédent est automatiquement déduit de votre prochain renouvellement sans action manuelle requise.',
    ],
  },
]

export function HelpCenterDrawer() {
  const { isHelpDrawerOpen, closeHelpDrawer, startTour, resetOnboarding, openShareModal } = useTutorial()
  const [searchQuery, setSearchQuery] = useState('')
  const [openGuideId, setOpenGuideId] = useState<string | null>('create-task')

  if (!isHelpDrawerOpen) return null

  const filteredGuides = GUIDES.filter((guide) => {
    const q = searchQuery.toLowerCase()
    return (
      guide.title.toLowerCase().includes(q) ||
      guide.summary.toLowerCase().includes(q) ||
      guide.steps.some((s) => s.toLowerCase().includes(q))
    )
  })

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={closeHelpDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-card border-l border-border text-foreground shadow-2xl flex flex-col z-10 animate-slide-in-right">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-5 bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                <HelpCircle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-base text-foreground">Centre d’Aide & Guides</h3>
                <p className="text-xs text-muted-foreground">Tutoriels et assistance interactive</p>
              </div>
            </div>

            <button
              onClick={closeHelpDrawer}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Fermer le centre d'aide"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Drawer Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Action Banner: Relancer le Tour */}
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                <span>Visite guidée interactive</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Besoin d'un rappel des fonctionnalités clés ? Relancez la visite pas-à-pas à tout moment.
              </p>
              <Button
                onClick={() => startTour(0)}
                className="w-full bg-primary text-primary-foreground font-bold shadow-sm hover:brightness-110"
                size="sm"
              >
                <Play className="h-4 w-4 mr-2 fill-current" />
                Lancer la visite guidée (5 étapes)
              </Button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un guide ou une question..."
                className="w-full rounded-xl border border-border bg-muted/40 pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Guides Accordion */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                Guides d'utilisation ({filteredGuides.length})
              </h4>

              {filteredGuides.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Aucun guide trouvé pour votre recherche.
                </div>
              ) : (
                filteredGuides.map((guide) => {
                  const isOpen = openGuideId === guide.id
                  const Icon = guide.icon

                  return (
                    <div
                      key={guide.id}
                      className="rounded-2xl border border-border bg-card overflow-hidden transition-colors hover:border-primary/30"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenGuideId(isOpen ? null : guide.id)}
                        className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{guide.title}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{guide.summary}</p>
                          </div>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pt-2 border-t border-border/50 bg-muted/20 space-y-3 text-xs">
                          <ol className="space-y-2 list-decimal list-inside text-muted-foreground leading-relaxed">
                            {guide.steps.map((step, idx) => (
                              <li key={idx} className="text-slate-700 dark:text-slate-300">
                                <span className="font-normal">{step}</span>
                              </li>
                            ))}
                          </ol>

                          {guide.tip && (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                              💡 <strong>Astuce :</strong> {guide.tip}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Shortcuts block */}
            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Keyboard className="h-4 w-4 text-primary" />
                <span>Raccourcis & Bonnes pratiques</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-card border border-border/60">
                  <span className="font-semibold text-foreground block">Action Tâche</span>
                  <span className="text-muted-foreground">Bouton « Commencer » sur notifications</span>
                </div>
                <div className="p-2 rounded-xl bg-card border border-border/60">
                  <span className="font-semibold text-foreground block">Motif de refus</span>
                  <span className="text-muted-foreground">Obligatoire pour garantir la traçabilité</span>
                </div>
              </div>
            </div>

            {/* Share / Recommend Card */}
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">Recommander Activity Control</p>
                <p className="text-[11px] text-muted-foreground truncate">Partagez l'application avec vos collègues</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => {
                  closeHelpDrawer()
                  openShareModal()
                }}
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                Partager
              </Button>
            </div>

            {/* Reset Onboarding Option */}
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Repartir de zéro ?</span>
              <button
                type="button"
                onClick={resetOnboarding}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Réinitialiser les guides
              </button>
            </div>

          </div>

          {/* Footer */}
          <div className="border-t border-border p-4 bg-muted/30 text-center">
            <p className="text-[11px] text-muted-foreground">
              Besoin d’aide supplémentaire ? Contactez votre manager ou l'administrateur.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
