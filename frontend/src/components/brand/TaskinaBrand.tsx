import type { SVGProps } from 'react'
import { cn } from '@/utils/cn'

interface TaskinaMarkProps extends SVGProps<SVGSVGElement> {
  inverted?: boolean
}

export function TaskinaMark({ className, inverted = false, ...props }: TaskinaMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label="Taskina"
      className={cn('h-10 w-10 shrink-0', className)}
      {...props}
    >
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="9"
        fill={inverted ? 'hsl(var(--sidebar-text))' : 'hsl(var(--primary))'}
      />
      <path d="M9 10h22v5.5h-8.2V30h-5.6V15.5H9V10Z" fill={inverted ? 'hsl(var(--sidebar-bg))' : 'white'} />
      <circle cx="29.5" cy="29.5" r="3.5" fill="hsl(var(--accent))" />
    </svg>
  )
}

interface TaskinaWordmarkProps {
  className?: string
  inverted?: boolean
  compact?: boolean
}

export function TaskinaWordmark({ className, inverted = false, compact = false }: TaskinaWordmarkProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <TaskinaMark className={compact ? 'h-9 w-9' : 'h-10 w-10'} inverted={inverted} />
      <div className="min-w-0">
        <div
          className={cn(
            'brand-wordmark truncate text-[18px] font-extrabold leading-none tracking-[-0.04em]',
            inverted ? 'text-white' : 'text-foreground',
          )}
        >
          taskina<span className="text-accent">.</span>
        </div>
        {!compact && (
          <p
            className={cn(
              'mt-1 truncate text-[9px] font-bold uppercase tracking-[0.2em]',
              inverted ? 'text-[hsl(var(--sidebar-text-muted))]' : 'text-muted-foreground',
            )}
          >
            Organiser · avancer
          </p>
        )}
      </div>
    </div>
  )
}
