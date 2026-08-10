import { cn } from '@/utils/cn'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'amber'
  dot?: boolean
  className?: string
}

const variantStyles: Record<string, { label: string; dot?: string }> = {
  default: {
    label: 'border-border/80 bg-muted/80 text-muted-foreground',
    dot: 'bg-muted-foreground/60',
  },
  success: {
    label: 'border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  warning: {
    label: 'border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  danger: {
    label: 'border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
  info: {
    label: 'border-blue-200/80 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  purple: {
    label: 'border-violet-200/80 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400',
    dot: 'bg-violet-500',
  },
  amber: {
    label: 'border-amber-300/80 bg-amber-500/10 text-amber-600 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
}

export function Badge({ children, variant = 'default', dot = false, className }: BadgeProps) {
  const styles = variantStyles[variant] ?? variantStyles.default

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
        styles.label,
        className
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', styles.dot)}
        />
      )}
      {children}
    </span>
  )
}
