import { cn } from '@/utils/cn'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftElement?: React.ReactNode
  rightElement?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftElement, rightElement, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

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
          />

          {rightElement && (
            <div className="absolute inset-y-0 right-3 flex items-center text-muted-foreground">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <p className="flex items-center gap-1 text-[12px] font-medium text-destructive">
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-[12px] text-muted-foreground">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
