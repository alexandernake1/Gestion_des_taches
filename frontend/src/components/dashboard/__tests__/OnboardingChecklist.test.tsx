import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { TutorialProvider } from '@/context/TutorialContext'
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}))

function renderChecklist(props: ComponentProps<typeof OnboardingChecklist>) {
  return render(
    <TutorialProvider>
      <OnboardingChecklist {...props} />
    </TutorialProvider>,
  )
}

describe('OnboardingChecklist', () => {
  beforeEach(() => {
    localStorage.clear()
    navigate.mockClear()
  })

  it('calcule la progression d’un responsable à partir des éléments réellement créés', () => {
    renderChecklist({
      role: 'manager',
      createdTaskCount: 1,
      teamCount: 1,
      projectCount: 1,
    })

    expect(screen.getByText('3/4 complétées')).toBeInTheDocument()
    expect(screen.getAllByTitle('Accompli automatiquement')).toHaveLength(3)
    expect(screen.queryByTitle('Marquer comme fait')).not.toBeInTheDocument()
  })

  it('adapte les actions proposées à un collaborateur sans les valider sur un clic', async () => {
    const user = userEvent.setup()
    renderChecklist({ role: 'employee', assignedTaskCount: 0 })

    expect(screen.getByText('Consulter vos tâches confiées')).toBeInTheDocument()
    expect(screen.queryByText('Créer votre première équipe')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Voir mes tâches' }))

    expect(navigate).toHaveBeenCalledWith({ to: '/tasks' })
    expect(screen.getByText('0/2 complétée')).toBeInTheDocument()
  })
})
