import { useTutorial } from '@/context/TutorialContext'
import {
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { authService } from '@/services/auth'
import { subscriptionsService } from '@/services/subscriptions'
import { getAdaptiveTourSteps, type AdaptiveTourStep } from '@/components/tutorial/guideData'

export function ProductTourModal() {
  const { isTourOpen, currentStep, nextStep, prevStep, closeTour, goToStep } = useTutorial()
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDivElement>(null)

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
    enabled: isTourOpen,
  })

  const { data: subscription } = useQuery({
    queryKey: ['mySubscription'],
    queryFn: subscriptionsService.getMySubscription,
    enabled: isTourOpen && !!currentUser?.company && !currentUser?.is_superuser,
  })

  const steps = useMemo<AdaptiveTourStep[]>(() => {
    return getAdaptiveTourSteps({
      isPersonalWorkspace: Boolean(currentUser?.is_personal_workspace),
      role: currentUser?.role,
      isSuperuser: currentUser?.is_superuser,
      hasCompany: !!currentUser?.company,
      featureFlags: subscription?.plan_details?.feature_flags,
    })
  }, [currentUser, subscription])

  const totalSteps = steps.length
  const safeStepIndex = Math.min(Math.max(0, currentStep), totalSteps - 1)
  const step = steps[safeStepIndex] || steps[0]
  const Icon = step.icon
  const isLastStep = safeStepIndex === totalSteps - 1

  useEffect(() => {
    if (!isTourOpen) return undefined

    const previousFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const focusDialog = () => dialogRef.current?.focus()
    const timer = window.setTimeout(focusDialog, 0)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeTour()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
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
  }, [isTourOpen, closeTour])

  if (!isTourOpen || !step) return null

  const handleShortcut = (route: string) => {
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
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-tour-title"
        aria-describedby="product-tour-description"
        tabIndex={-1}
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 bg-slate-900 text-slate-100 shadow-2xl shadow-indigo-950/80 animate-scale-up"
      >
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
            type="button"
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
            <h2 id="product-tour-title" className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {step.title}
            </h2>
            <p id="product-tour-description" className="mt-3 text-sm leading-relaxed text-slate-300">
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
            {Array.from({ length: totalSteps }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goToStep(index, totalSteps)}
                aria-label={`Aller à l'étape ${index + 1}`}
                className={`h-2 rounded-full transition-all ${
                  safeStepIndex === index
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

            {safeStepIndex > 0 && (
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
              onClick={() => nextStep(totalSteps)}
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
