import { ShieldCheck } from 'lucide-react'
import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
    }
  }
}

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

interface CaptchaWidgetProps {
  onToken: (token?: string) => void
  action: string
  resetKey?: number
}

export function CaptchaWidget({ onToken, action, resetKey = 0 }: CaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string>()

  useEffect(() => {
    if (!siteKey) {
      onToken(undefined)
      return
    }

    let disposed = false
    const renderWidget = () => {
      if (disposed || !containerRef.current || !window.turnstile || widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        language: 'fr',
        theme: 'auto',
        size: 'flexible',
        appearance: 'always',
        action,
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(undefined),
        'error-callback': () => onToken(undefined),
      })
    }

    const existingScript = document.getElementById('turnstile-api') as HTMLScriptElement | null
    if (existingScript) {
      if (window.turnstile) renderWidget()
      else existingScript.addEventListener('load', renderWidget, { once: true })
    } else {
      const script = document.createElement('script')
      script.id = 'turnstile-api'
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.addEventListener('load', renderWidget, { once: true })
      document.head.appendChild(script)
    }

    return () => {
      disposed = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = undefined
      }
    }
  }, [action, onToken])

  useEffect(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current)
      onToken(undefined)
    }
  }, [onToken, resetKey])

  if (!siteKey) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div ref={containerRef} className="flex min-h-[65px] justify-center" />
      <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        Protection anti-robot sécurisée par Cloudflare Turnstile
      </p>
    </div>
  )
}
