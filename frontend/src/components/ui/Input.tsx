import { cn } from '@/utils/cn'
import { forwardRef, useId } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftElement?: React.ReactNode
  rightElement?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftElement, rightElement, className, id, ...props }, ref) => {
    const generatedId = useId().replace(/:/g, '')
    const inputId = id || `input-${generatedId}`
    const errorId = `${inputId}-error`
    const hintId = `${inputId}-hint`
    const describedBy = error ? errorId : hint ? hintId : props['aria-describedby']

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-semibold text-foreground"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftElement && (
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              {leftElement}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              'h-10 w-full rounded-xl border bg-background px-3.5 text-sm text-foreground shadow-xs',
              'placeholder:text-muted-foreground/70',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60',
              error
                ? 'border-destructive/70 focus:ring-destructive/30 focus:border-destructive'
                : 'border-border/80 hover:border-border',
              leftElement && 'pl-9',
              rightElement && 'pr-9',
              className
            )}
            {...props}
            aria-invalid={error ? true : props['aria-invalid']}
            aria-describedby={describedBy}
          />

          {rightElement && (
            <div className="absolute inset-y-0 right-3 flex items-center text-muted-foreground">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} role="alert" className="flex items-center gap-1 text-[12px] font-medium text-destructive">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="text-[12px] text-muted-foreground">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
