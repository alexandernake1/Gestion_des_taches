import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileText, Settings2, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { FormWizard, FormWizardActions, type FormWizardStep } from '@/components/forms/FormWizard'

const steps: FormWizardStep[] = [
  { id: 'identity', title: 'Identité', description: 'Informations essentielles', icon: FileText },
  { id: 'settings', title: 'Organisation', description: 'Paramètres de travail', icon: Settings2 },
  { id: 'review', title: 'Vérification', description: 'Contrôle final', icon: CheckCircle2 },
]

function ConfirmationHarness({ onSubmit }: { onSubmit: () => void }) {
  const [currentStep, setCurrentStep] = useState(0)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <p>{currentStep === 0 ? 'Saisie' : 'Récapitulatif'}</p>
      <FormWizardActions
        currentStep={currentStep}
        totalSteps={2}
        onBack={() => setCurrentStep(0)}
        onNext={() => setCurrentStep(1)}
        onCancel={() => undefined}
        submitLabel="Confirmer"
      />
    </form>
  )
}

describe('FormWizard', () => {
  it('annonce la progression et autorise le retour vers une étape terminée', async () => {
    const user = userEvent.setup()
    const onStepSelect = vi.fn()

    render(
      <FormWizard steps={steps} currentStep={1} onStepSelect={onStepSelect}>
        <p>Contenu courant</p>
      </FormWizard>,
    )

    expect(screen.getByText('Étape 2 sur 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Organisation/ })).toHaveAttribute('aria-current', 'step')

    await user.click(screen.getByRole('button', { name: /Identité/ }))
    expect(onStepSelect).toHaveBeenCalledWith(0)
    expect(screen.getByRole('button', { name: /Vérification/ })).toBeDisabled()
  })

  it('affiche la bonne action selon la position dans le parcours', async () => {
    const user = userEvent.setup()
    const onNext = vi.fn()
    const onBack = vi.fn()
    const onCancel = vi.fn()
    const { rerender } = render(
      <FormWizardActions currentStep={0} totalSteps={3} onBack={onBack} onNext={onNext} onCancel={onCancel} submitLabel="Créer" />,
    )

    expect(screen.queryByRole('button', { name: 'Retour' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continuer' }))
    expect(onNext).toHaveBeenCalledOnce()

    rerender(
      <FormWizardActions currentStep={2} totalSteps={3} onBack={onBack} onNext={onNext} onCancel={onCancel} submitLabel="Créer" />,
    )
    expect(screen.getByRole('button', { name: 'Retour' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Créer' })).toHaveAttribute('type', 'submit')
  })

  it('attend un nouveau clic explicite après l’arrivée sur le récapitulatif', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<ConfirmationHarness onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Continuer' }))

    expect(screen.getByText('Récapitulatif')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Confirmer' }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })
})
