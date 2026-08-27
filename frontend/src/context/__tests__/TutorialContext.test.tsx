import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TutorialProvider, useTutorial } from '@/context/TutorialContext'

function TutorialHarness({ maxSteps = 5 }: { maxSteps?: number }) {
  const { startTour, nextStep, closeTour, hasSeenTour, isTourOpen } = useTutorial()

  return (
    <div>
      <output>{hasSeenTour ? 'terminé' : 'non terminé'}</output>
      <output>{isTourOpen ? 'ouvert' : 'fermé'}</output>
      <button type="button" onClick={() => startTour()}>Ouvrir</button>
      <button type="button" onClick={() => nextStep(maxSteps)}>Suivant</button>
      <button type="button" onClick={closeTour}>Passer</button>
    </div>
  )
}

describe('TutorialContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('ne considère le tutoriel comme terminé qu’après sa dernière étape', async () => {
    const user = userEvent.setup()
    render(<TutorialProvider><TutorialHarness /></TutorialProvider>)

    await user.click(screen.getByRole('button', { name: 'Ouvrir' }))
    await user.click(screen.getByRole('button', { name: 'Passer' }))
    expect(screen.getByText('non terminé')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ouvrir' }))
    for (let index = 0; index < 5; index += 1) {
      await user.click(screen.getByRole('button', { name: 'Suivant' }))
    }

    expect(screen.getByText('terminé')).toBeInTheDocument()
    expect(localStorage.getItem('has_seen_product_tour')).toBe('true')
  })

  it('supporte un nombre d’étapes dynamique (ex: 4 étapes pour profil personnel)', async () => {
    const user = userEvent.setup()
    render(<TutorialProvider><TutorialHarness maxSteps={4} /></TutorialProvider>)

    await user.click(screen.getByRole('button', { name: 'Ouvrir' }))
    for (let index = 0; index < 4; index += 1) {
      await user.click(screen.getByRole('button', { name: 'Suivant' }))
    }

    expect(screen.getByText('terminé')).toBeInTheDocument()
  })
})
