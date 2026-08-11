import { describe, expect, it } from 'vitest'

import { frenchValidationMessage } from '../formValidation'


describe('French native form validation', () => {
  it('translates a required field error', () => {
    const input = document.createElement('input')
    input.required = true

    expect(frenchValidationMessage(input)).toBe('Ce champ est obligatoire.')
  })

  it('translates an invalid email error', () => {
    const input = document.createElement('input')
    input.type = 'email'
    input.value = 'adresse-invalide'

    expect(frenchValidationMessage(input)).toBe('Saisissez une adresse e-mail valide.')
  })
})
