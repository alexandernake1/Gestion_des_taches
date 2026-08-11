import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Input } from '../Input'


describe('Input accessibility', () => {
  it('associates an error message with its field', () => {
    render(<Input label="Adresse e-mail" error="Ce champ est obligatoire." />)

    const input = screen.getByLabelText('Adresse e-mail')
    const error = screen.getByRole('alert')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', error.id)
  })
})
