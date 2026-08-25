import React, { createContext, useCallback, useContext, useState } from 'react'

export interface TutorialContextType {
  isTourOpen: boolean
  currentStep: number
  startTour: (initialStep?: number) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  closeTour: () => void
  completeTour: () => void
  isHelpDrawerOpen: boolean
  activeHelpGuideId: string | null
  openHelpDrawer: (guideId?: string) => void
  closeHelpDrawer: () => void
  isShareModalOpen: boolean
  openShareModal: () => void
  closeShareModal: () => void
  resetOnboarding: () => void
  hasSeenTour: boolean
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined)

export const TOTAL_TOUR_STEPS = 5

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isTourOpen, setIsTourOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isHelpDrawerOpen, setIsHelpDrawerOpen] = useState(false)
  const [activeHelpGuideId, setActiveHelpGuideId] = useState<string | null>(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [hasSeenTour, setHasSeenTour] = useState<boolean>(() => {
    return localStorage.getItem('has_seen_product_tour') === 'true'
  })

  // Start the interactive tour
  const startTour = (initialStep = 0) => {
    setIsHelpDrawerOpen(false)
    setActiveHelpGuideId(null)
    setIsShareModalOpen(false)
    setCurrentStep(initialStep)
    setIsTourOpen(true)
  }

  const nextStep = () => {
    if (currentStep < TOTAL_TOUR_STEPS - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      completeTour()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const goToStep = (step: number) => {
    if (step >= 0 && step < TOTAL_TOUR_STEPS) {
      setCurrentStep(step)
    }
  }

  const closeTour = useCallback(() => {
    setIsTourOpen(false)
  }, [])

  const completeTour = useCallback(() => {
    setIsTourOpen(false)
    localStorage.setItem('has_seen_product_tour', 'true')
    setHasSeenTour(true)
  }, [])

  const openHelpDrawer = useCallback((guideId?: string) => {
    setActiveHelpGuideId(guideId || null)
    setIsHelpDrawerOpen(true)
  }, [])

  const closeHelpDrawer = useCallback(() => {
    setIsHelpDrawerOpen(false)
    setActiveHelpGuideId(null)
  }, [])

  const openShareModal = () => {
    setIsShareModalOpen(true)
  }

  const closeShareModal = () => {
    setIsShareModalOpen(false)
  }

  const resetOnboarding = () => {
    localStorage.removeItem('has_seen_product_tour')
    localStorage.removeItem('onboarding_checklist_dismissed')
    localStorage.removeItem('onboarding_checklist_collapsed')
    localStorage.removeItem('onboarding_completed_items')
    setHasSeenTour(false)
    startTour(0)
  }

  return (
    <TutorialContext.Provider
      value={{
        isTourOpen,
        currentStep,
        startTour,
        nextStep,
        prevStep,
        goToStep,
        closeTour,
        completeTour,
        isHelpDrawerOpen,
        activeHelpGuideId,
        openHelpDrawer,
        closeHelpDrawer,
        isShareModalOpen,
        openShareModal,
        closeShareModal,
        resetOnboarding,
        hasSeenTour,
      }}
    >
      {children}
    </TutorialContext.Provider>
  )
}

// The provider and its companion hook intentionally share this context module.
// eslint-disable-next-line react-refresh/only-export-components
export function useTutorial() {
  const context = useContext(TutorialContext)
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider')
  }
  return context
}
