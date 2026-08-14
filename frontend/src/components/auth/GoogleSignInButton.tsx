import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: Record<string, unknown>) => void
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (credential: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!clientId) return
    let disposed = false
    const renderButton = () => {
      if (disposed || !containerRef.current || !window.google) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          if (response.credential) onCredential(response.credential)
        },
      })
      containerRef.current.replaceChildren()
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        width: Math.min(containerRef.current.clientWidth || 360, 400),
        text: 'continue_with',
        locale: 'fr',
      })
    }

    const existingScript = document.getElementById('google-identity-api') as HTMLScriptElement | null
    if (existingScript) {
      if (window.google) renderButton()
      else existingScript.addEventListener('load', renderButton, { once: true })
    } else {
      const script = document.createElement('script')
      script.id = 'google-identity-api'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.addEventListener('load', renderButton, { once: true })
      document.head.appendChild(script)
    }
    return () => { disposed = true }
  }, [onCredential])

  if (!clientId) return null
  return <div ref={containerRef} className="flex min-h-11 w-full justify-center" />
}
