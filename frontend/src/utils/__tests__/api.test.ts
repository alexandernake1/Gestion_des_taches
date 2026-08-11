import { afterEach, describe, expect, it, vi } from 'vitest'

import { api, ApiError } from '../api'


describe('API error normalization', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a French message for network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(api.get('/health/')).rejects.toMatchObject({
      status: 0,
      code: 'network_error',
      message: 'Impossible de contacter le serveur. Vérifiez votre connexion puis réessayez.',
    })
  })

  it('exposes translated field errors from the API envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'validation_error',
      message: 'This field is required.',
      fields: { email: ['This field is required.'] },
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })))

    try {
      await api.post('/users/', {})
      throw new Error('Expected request to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error).toMatchObject({
        status: 400,
        code: 'validation_error',
        message: 'Ce champ est obligatoire.',
        fieldErrors: { email: ['Ce champ est obligatoire.'] },
      })
    }
  })
})
