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

  it('translates legacy invalid credential errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      detail: 'Invalid credentials.',
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })))

    await expect(api.post('/auth/login/', {})).rejects.toMatchObject({
      status: 401,
      message: 'Adresse e-mail ou mot de passe incorrect.',
    })
  })

  it('does not expose an HTML error page to the user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      '<!doctype html><html><body><h1>Bad Request (400)</h1></body></html>',
      {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    )))

    await expect(api.post('/auth/login/', {})).rejects.toMatchObject({
      status: 400,
      code: 'unexpected_server_response',
      message: "Le serveur a refusé la requête. Veuillez réessayer ou contacter l'assistance.",
    })
  })
})
