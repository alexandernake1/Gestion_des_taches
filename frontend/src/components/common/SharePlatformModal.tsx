import { useState } from 'react'
import { useTutorial } from '@/context/TutorialContext'
import {
  X,
  Share2,
  Copy,
  Check,
  Smartphone,
  Mail,
  Linkedin,
  Twitter,
  MessageCircle,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function SharePlatformModal() {
  const { isShareModalOpen, closeShareModal } = useTutorial()
  const [copied, setCopied] = useState(false)

  if (!isShareModalOpen) return null

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const shareTitle = 'Activity Control — Pilotage d’activités, validations et projets d’équipe'
  const shareMessage =
    'Découvrez Activity Control, la solution moderne pour structurer vos tâches, automatiser le circuit de validation et piloter les délais d’équipe en toute transparence.'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // Fallback
    }
  }

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareMessage,
          url: shareUrl,
        })
      } catch {
        // User cancelled
      }
    }
  }

  const canNativeShare = typeof navigator !== 'undefined' && Boolean(navigator.share)

  // Preformatted sharing links
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${shareTitle}\n\n${shareMessage}\n\n👉 Découvrir ici : ${shareUrl}`
  )}`

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    shareUrl
  )}`

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${shareTitle} — ${shareMessage}`
  )}&url=${encodeURIComponent(shareUrl)}`

  const emailUrl = `mailto:?subject=${encodeURIComponent(
    `Recommandation : Découvrez Activity Control`
  )}&body=${encodeURIComponent(
    `Bonjour,\n\nJe te recommande Activity Control pour simplifier la gestion de nos activités et livrables d'équipe :\n\n${shareMessage}\n\nLien d'accès : ${shareUrl}\n\nÀ bientôt !`
  )}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        onClick={closeShareModal}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card text-foreground shadow-2xl z-10 animate-scale-up">
        {/* Glow ambient accent */}
        <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-5 bg-muted/30">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
              <Share2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-black text-base text-foreground">Partager la plateforme</h3>
              <p className="text-xs text-muted-foreground">Faites découvrir Activity Control à votre réseau</p>
            </div>
          </div>

          <button
            onClick={closeShareModal}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* Copy Link Row */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Lien direct de la plateforme
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 truncate rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-foreground font-mono">
                {shareUrl}
              </div>
              <Button
                type="button"
                onClick={handleCopy}
                size="sm"
                className={`shrink-0 font-bold transition-all ${
                  copied
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copier
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Social Channels */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Partager en 1 clic
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs font-bold text-foreground transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate">WhatsApp</p>
                  <p className="text-[11px] font-normal text-muted-foreground truncate">Message prêt à l'envoi</p>
                </div>
              </a>

              {/* LinkedIn */}
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs font-bold text-foreground transition-all hover:border-blue-500/50 hover:bg-blue-500/10"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                  <Linkedin className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate">LinkedIn</p>
                  <p className="text-[11px] font-normal text-muted-foreground truncate">Partage professionnel</p>
                </div>
              </a>

              {/* X / Twitter */}
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3.5 text-xs font-bold text-foreground transition-all hover:border-sky-500/50 hover:bg-sky-500/10"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 shrink-0">
                  <Twitter className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate">X (Twitter)</p>
                  <p className="text-[11px] font-normal text-muted-foreground truncate">Tweet rapide</p>
                </div>
              </a>

              {/* Email */}
              <a
                href={emailUrl}
                className="flex items-center gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-3.5 text-xs font-bold text-foreground transition-all hover:border-violet-500/50 hover:bg-violet-500/10"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate">Par Email</p>
                  <p className="text-[11px] font-normal text-muted-foreground truncate">Courrier pré-rédigé</p>
                </div>
              </a>
            </div>
          </div>

          {/* Optional Native Share button */}
          {canNativeShare && (
            <Button
              onClick={handleNativeShare}
              variant="outline"
              className="w-full font-bold border-primary/30 text-primary hover:bg-primary/10"
              size="sm"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Partager via les applications de mon appareil
            </Button>
          )}

          {/* Quick value banner */}
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Sparkles className="h-4 w-4" />
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Vos collègues pourront immédiatement créer un compte et rejoindre votre structure ou tester la démo.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 bg-muted/20 flex justify-end">
          <Button variant="secondary" size="sm" onClick={closeShareModal}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  )
}
