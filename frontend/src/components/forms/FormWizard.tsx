import type { LucideIcon } from 'lucide-react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export interface FormWizardStep {
  id: string
  title: string
  description: string
  icon: LucideIcon
}

interface FormWizardProps {
  steps: FormWizardStep[]
  currentStep: number
  onStepSelect?: (step: number) => void
  children: ReactNode
}

export function FormWizard({ steps, currentStep, onStepSelect, children }: FormWizardProps) {
  const wizardRef = useRef<HTMLDivElement>(null)
  const activeStep = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  useEffect(() => {
    const wizard = wizardRef.current
    if (!wizard) return
    const scrollContainer = wizard.closest<HTMLElement>('[data-modal-panel]')
      ?? wizard.closest<HTMLElement>('[role="dialog"]')
    if (scrollContainer) {
      if (typeof scrollContainer.scrollTo === 'function') scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
      else scrollContainer.scrollTop = 0
      return
    }
    if (typeof wizard.scrollIntoView === 'function') wizard.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [currentStep])

  return (
    <div ref={wizardRef} className="space-y-6">
      <div className="rounded-2xl border border-border/80 bg-muted/25 p-4 sm:p-5">
        <div className="sm:hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                Étape {currentStep + 1} sur {steps.length}
              </p>
              <p className="mt-1 text-base font-black text-foreground">{activeStep.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{activeStep.description}</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <activeStep.icon className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <ol
          className="hidden gap-3 sm:grid"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
          aria-label="Progression du formulaire"
        >
          {steps.map((step, index) => {
            const isComplete = index < currentStep
            const isCurrent = index === currentStep
            const canSelect = isComplete && Boolean(onStepSelect)
            const Icon = step.icon

            return (
              <li key={step.id} className="min-w-0">
                <button
                  type="button"
                  disabled={!canSelect}
                  onClick={() => canSelect && onStepSelect?.(index)}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'group flex w-full items-start gap-3 rounded-xl p-2 text-left transition-colors',
                    canSelect && 'cursor-pointer hover:bg-primary/5',
                    !canSelect && 'cursor-default',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-black transition-all',
                      isCurrent && 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20',
                      isComplete && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
                      !isCurrent && !isComplete && 'border-border bg-background text-muted-foreground',
                    )}
                  >
                    {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className={cn('block truncate text-xs font-black', isCurrent ? 'text-foreground' : 'text-muted-foreground')}>
                      {step.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">
                      {step.description}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      {children}
    </div>
  )
}

interface FormWizardPanelProps {
  step: number
  active: boolean
  title: string
  description?: string
  children: ReactNode
}

export function FormWizardPanel({ step, active, title, description, children }: FormWizardPanelProps) {
  return (
    <section
      hidden={!active}
      data-form-wizard-step={step}
      aria-labelledby={`form-wizard-step-${step}`}
      className="space-y-5 animate-fade-in"
    >
      <div className="border-b border-border/60 pb-4">
        <h3 id={`form-wizard-step-${step}`} className="text-lg font-black tracking-tight text-foreground">
          {title}
        </h3>
        {description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

interface FormWizardActionsProps {
  currentStep: number
  totalSteps: number
  onBack: () => void
  onNext: () => void
  onCancel: () => void
  isSubmitting?: boolean
  submitLabel: string
  submittingLabel?: string
  nextDisabled?: boolean
  submitDisabled?: boolean
}

export function FormWizardActions({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onCancel,
  isSubmitting = false,
  submitLabel,
  submittingLabel = 'Enregistrement…',
  nextDisabled = false,
  submitDisabled = false,
}: FormWizardActionsProps) {
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1

  return (
    <footer className="flex flex-col-reverse gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button type="button" variant="ghost" onClick={onCancel} className="w-full sm:w-auto">
          Annuler
        </Button>
        {!isFirstStep && (
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            leftIcon={<ChevronLeft className="h-4 w-4" />}
            className="w-full sm:w-auto"
          >
            Retour
          </Button>
        )}
      </div>

      {isLastStep ? (
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={submitDisabled}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          rightIcon={<ChevronRight className="h-4 w-4" />}
          className="w-full sm:w-auto"
        >
          Continuer
        </Button>
      )}
    </footer>
  )
}
