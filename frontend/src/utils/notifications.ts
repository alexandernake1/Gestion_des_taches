/**
 * Utility functions for SaaS Audio Chime and Browser Push Notifications
 */

// Web Audio API Synthesizer for a clean, subtle SaaS notification chime sound
export function playNotificationSound() {
  try {
    const soundEnabled = localStorage.getItem('notification_sound_enabled') !== 'false'
    if (!soundEnabled) return

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    const now = ctx.currentTime

    // Two-tone pleasant chime (E5 -> B5)
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc2.type = 'sine'

    osc1.frequency.setValueAtTime(659.25, now) // E5
    osc2.frequency.setValueAtTime(987.77, now + 0.08) // B5

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.15)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.4)
  } catch {
    // Ignore audio autoplay restrictions if user hasn't interacted yet
  }
}

/**
 * Request Browser Desktop Push Permission
 */
export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

/**
 * Send OS Desktop Push Notification
 */
export function sendDesktopNotification(title: string, body: string, onClick?: () => void) {
  try {
    const desktopEnabled = localStorage.getItem('notification_desktop_enabled') !== 'false'
    if (!desktopEnabled) return

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      if (document.hidden) {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: 'task_notification_' + Date.now(),
        })

        notif.onclick = () => {
          window.focus()
          if (onClick) onClick()
          notif.close()
        }
      }
    }
  } catch {
    // Ignore permission or browser restriction errors
  }
}
