import { createContext, useContext } from 'react'
import type { ConfirmDialogProps } from '@/components/ui/ConfirmDialog'

export type ConfirmationOptions = Omit<
  ConfirmDialogProps,
  'isOpen' | 'onClose' | 'onConfirm' | 'isPending'
>

export interface ConfirmationResult {
  confirmed: boolean
  reason?: string
}

export type ConfirmFunction = (options: ConfirmationOptions) => Promise<ConfirmationResult>

export const ConfirmationContext = createContext<ConfirmFunction | null>(null)

export function useConfirmation() {
  const context = useContext(ConfirmationContext)
  if (!context) {
    throw new Error('useConfirmation doit être utilisé dans ConfirmationProvider.')
  }
  return context
}
