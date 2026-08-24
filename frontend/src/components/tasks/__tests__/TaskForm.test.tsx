import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskForm } from '@/components/tasks/TaskForm'
import type { User } from '@/domain/types'

vi.mock('@/services/projects', () => ({
  projectsService: {
    list: vi.fn().mockResolvedValue([]),
  },
}))

const collaborator = {
  id: '7',
  email: 'awa@example.com',
  full_name: 'Awa Ouédraogo',
  first_name: 'Awa',
  last_name: 'Ouedraogo',
  is_personal_workspace: false,
  role: 'employee',
  role_display: 'Collaboratrice',
  is_active: true,
  must_change_password: false,
  weekly_capacity_hours: 40,
  created_at: '2026-08-24T00:00:00Z',
  updated_at: '2026-08-24T00:00:00Z',
} satisfies User

function renderTaskForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <TaskForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        users={[collaborator]}
        teams={[]}
        canAssign
      />
    </QueryClientProvider>,
  )
}

describe('TaskForm', () => {
  it('présente une tâche sans attribution comme une tâche personnelle sans validation', async () => {
    const user = userEvent.setup()
    const { container } = renderTaskForm()

    await user.type(container.querySelector<HTMLInputElement>('input[name="title"]')!, 'Préparer mon bilan')
    await user.click(screen.getByRole('button', { name: 'Continuer' }))

    expect(screen.getByText('Sans collaborateur ni équipe, cette tâche sera automatiquement créée pour vous.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continuer' }))
    expect(screen.queryByText('Validation requise avant clôture')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continuer' }))
    expect(screen.getByText('Tâche personnelle')).toBeInTheDocument()
    expect(screen.getByText(/aucune validation nécessaire/i)).toBeInTheDocument()
  })

  it('propose la validation seulement lorsqu’un collaborateur est choisi', async () => {
    const user = userEvent.setup()
    const { container } = renderTaskForm()

    await user.type(container.querySelector<HTMLInputElement>('input[name="title"]')!, 'Préparer le dossier client')
    await user.click(screen.getByRole('button', { name: 'Continuer' }))
    await user.selectOptions(container.querySelector<HTMLSelectElement>('select[name="assigned_to"]')!, '7')
    await user.click(screen.getByRole('button', { name: 'Continuer' }))

    expect(screen.getByText('Validation requise avant clôture')).toBeInTheDocument()
    expect(container.querySelector<HTMLInputElement>('input[name="requires_completion_approval"]')).toBeChecked()
  })
})
