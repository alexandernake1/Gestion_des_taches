import { useEffect, useMemo, useRef, useState } from 'react'
import { useTutorial } from '@/context/TutorialContext'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  X,
  Play,
  HelpCircle,
  BookOpen,
  ChevronDown,
  Sparkles,
  Keyboard,
  RotateCcw,
  Search,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { authService } from '@/services/auth'
import { subscriptionsService } from '@/services/subscriptions'
import {
  getAdaptiveGuides,
  getAvailableCategories,
  getAdaptiveTourSteps,
  type AdaptiveGuideTopic,
  type GuideCategory,
  type GuideUserContext,
} from '@/components/tutorial/guideData'

export function HelpCenterDrawer() {
  const { isHelpDrawerOpen, activeHelpGuideId, closeHelpDrawer, startTour, resetOnboarding, openShareModal } = useTutorial()
  const navigate = useNavigate()
  const drawerRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [openGuideId, setOpenGuideId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<'all' | GuideCategory>('all')

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
    enabled: isHelpDrawerOpen,
  })

  const { data: subscription } = useQuery({
    queryKey: ['mySubscription'],
    queryFn: subscriptionsService.getMySubscription,
    enabled: isHelpDrawerOpen && !!currentUser?.company && !currentUser?.is_superuser,
  })

  const userContext = useMemo<GuideUserContext>(() => ({
    isPersonalWorkspace: Boolean(currentUser?.is_personal_workspace),
    role: currentUser?.role,
    isSuperuser: currentUser?.is_superuser,
    hasCompany: !!currentUser?.company,
    featureFlags: subscription?.plan_details?.feature_flags,
  }), [currentUser, subscription])

  const applicableGuides = useMemo<AdaptiveGuideTopic[]>(() => {
    return getAdaptiveGuides(userContext)
  }, [userContext])

  const availableCategories = useMemo(() => {
    return getAvailableCategories(applicableGuides)
  }, [applicableGuides])

  const tourSteps = useMemo(() => {
    return getAdaptiveTourSteps(userContext)
  }, [userContext])

  useEffect(() => {
    if (!isHelpDrawerOpen) return
    const targetGuide = applicableGuides.find((guide) => guide.id === activeHelpGuideId)
    setOpenGuideId(targetGuide ? targetGuide.id : (applicableGuides[0]?.id || null))
    setSearchQuery('')
    setSelectedCategory('all')
  }, [activeHelpGuideId, isHelpDrawerOpen, applicableGuides])

  useEffect(() => {
    if (!isHelpDrawerOpen) return undefined

    const previousFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const timer = window.setTimeout(() => drawerRef.current?.focus(), 0)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeHelpDrawer()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) || [])
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusedElement?.focus()
    }
  }, [isHelpDrawerOpen, closeHelpDrawer])

  if (!isHelpDrawerOpen) return null

  const filteredGuides = applicableGuides.filter((guide) => {
    const q = searchQuery.toLowerCase().trim()
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory
    const matchesSearch = !q
      || guide.title.toLowerCase().includes(q)
      || guide.summary.toLowerCase().includes(q)
      || guide.steps.some((step) => step.toLowerCase().includes(q))
    return matchesCategory && matchesSearch
  })

  const handleGuideAction = (guide: AdaptiveGuideTopic) => {
    if (!guide.route) return
    closeHelpDrawer()
    navigate({ to: guide.route })
  }

  const isPersonal = Boolean(currentUser?.is_personal_workspace)

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={closeHelpDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-center-title"
          tabIndex={-1}
          className="z-10 flex w-screen max-w-md flex-col border-l border-border bg-card text-foreground shadow-2xl animate-slide-in-right sm:max-w-lg"
        >

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-5 bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                <HelpCircle className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="help-center-title" className="font-extrabold text-base text-foreground">Centre d’aide et guides</h3>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {isPersonal ? 'Personnel' : 'Structure'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Tutoriels et assistance adaptés à votre profil</p>
              </div>
            </div>

            <button
              type="button"
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
                Besoin d'un rappel des fonctionnalités adaptées à votre compte ? Relancez la visite pas-à-pas à tout moment.
              </p>
              <Button
                onClick={() => startTour(0)}
                className="w-full bg-primary text-primary-foreground font-bold shadow-sm hover:brightness-110"
                size="sm"
              >
                <Play className="h-4 w-4 mr-2 fill-current" />
                Lancer la visite guidée ({tourSteps.length} étapes)
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

            {/* Category tabs (Dynamic) */}
            {availableCategories.length > 2 && (
              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrer les guides par thème">
                {availableCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                      selectedCategory === category.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            )}

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

                          {guide.actionLabel && guide.route && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="w-full text-xs font-bold"
                              onClick={() => handleGuideAction(guide)}
                            >
                              {guide.actionLabel}
                              <ChevronDown className="ml-1.5 h-3.5 w-3.5 -rotate-90" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Shortcuts block adapted */}
            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Keyboard className="h-4 w-4 text-primary" />
                <span>Raccourcis et bonnes pratiques</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-card border border-border/60">
                  <span className="font-semibold text-foreground block">Action Tâche</span>
                  <span className="text-muted-foreground">Bouton « Commencer » sur notifications</span>
                </div>
                <div className="p-2 rounded-xl bg-card border border-border/60">
                  <span className="font-semibold text-foreground block">{isPersonal ? 'Modèles réutilisables' : 'Motif de refus'}</span>
                  <span className="text-muted-foreground">{isPersonal ? 'Gagnez du temps sur vos routines' : 'Obligatoire pour garantir la traçabilité'}</span>
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
              {isPersonal
                ? 'Besoin d’aide ? Consultez les guides ou contactez le support.'
                : 'Besoin d’aide supplémentaire ? Contactez votre manager ou l’administrateur.'}
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
