import { useCallback, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  ConfirmationContext,
  type ConfirmationOptions,
  type ConfirmationResult,
  type ConfirmFunction,
} from '@/components/ui/confirmation'

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmationOptions | null>(null)
  const resolverRef = useRef<((result: ConfirmationResult) => void) | null>(null)

  const finish = useCallback((result: ConfirmationResult) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setOptions(null)
  }, [])

  const confirm = useCallback<ConfirmFunction>((nextOptions) => {
    resolverRef.current?.({ confirmed: false })
    setOptions(nextOptions)
    return new Promise((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      {options && (
        <ConfirmDialog
          {...options}
          isOpen
          onClose={() => finish({ confirmed: false })}
          onConfirm={(reason) => finish({ confirmed: true, reason })}
        />
      )}
    </ConfirmationContext.Provider>
  )
}
