import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { PasswordInput } from '../PasswordInput'


describe('PasswordInput', () => {
  it('lets the user reveal and hide the entered password', async () => {
    const user = userEvent.setup()
    render(<PasswordInput aria-label="Mot de passe" defaultValue="Secret123!" />)

    const input = screen.getByLabelText('Mot de passe')
    expect(input).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }))
    expect(input).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Masquer le mot de passe' }))
    expect(input).toHaveAttribute('type', 'password')
  })
})
