import { describe, expect, it } from 'vitest'

import { notificationWebSocketUrl } from '../useWebSocket'


describe('notificationWebSocketUrl', () => {
  it('uses a same-origin WebSocket URL without exposing a token', () => {
    expect(notificationWebSocketUrl({ protocol: 'http:', host: '152.228.233.72' }))
      .toBe('ws://152.228.233.72/ws/notifications/')
  })

  it('uses WSS when the application is served over HTTPS', () => {
    expect(notificationWebSocketUrl({ protocol: 'https:', host: 'app.example.com' }))
      .toBe('wss://app.example.com/ws/notifications/')
  })
})
