import { useEffect, useState } from 'react'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'warning' | 'danger'
  impacts?: string[]
  requireText?: string
  reasonLabel?: string
  reasonRequired?: boolean
  isPending?: boolean
  onClose: () => void
  onConfirm: (reason?: string) => void
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'warning',
  impacts = [],
  requireText,
  reasonLabel,
  reasonRequired = false,
  isPending = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const [confirmationText, setConfirmationText] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (isOpen) {
      setConfirmationText('')
      setReason('')
    }
  }, [isOpen])

  const normalizedRequiredText = requireText?.trim().toLocaleLowerCase('fr')
  const typedTextMatches = !normalizedRequiredText
    || confirmationText.trim().toLocaleLowerCase('fr') === normalizedRequiredText
  const canConfirm = typedTextMatches && (!reasonRequired || reason.trim().length > 0)
  const Icon = tone === 'danger' ? ShieldAlert : AlertTriangle

  return (
    <Modal isOpen={isOpen} onClose={isPending ? () => undefined : onClose} title={title} size="sm">
      <div className="space-y-5">
        <div className={`flex items-start gap-3 rounded-xl border p-4 ${
          tone === 'danger'
            ? 'border-rose-200 bg-rose-50 text-rose-900'
            : 'border-amber-200 bg-amber-50 text-amber-900'
        }`}>
          <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm leading-6">{description}</p>
        </div>

        {impacts.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Conséquences</p>
            <ul className="mt-2 space-y-2 text-sm text-foreground">
              {impacts.map((impact) => (
                <li key={impact} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
                  <span>{impact}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {reasonLabel && (
          <label className="block text-sm font-semibold text-foreground">
            {reasonLabel}{reasonRequired ? ' *' : ' (facultatif)'}
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Précisez le contexte de cette action…"
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        )}

        {requireText && (
          <label className="block text-sm font-semibold text-foreground">
            Saisissez <strong className="text-destructive">{requireText}</strong> pour confirmer
            <input
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              autoComplete="off"
              className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground outline-none transition focus:border-destructive focus:ring-2 focus:ring-destructive/20"
            />
          </label>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={() => onConfirm(reason.trim() || undefined)}
            disabled={!canConfirm}
            loading={isPending}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
