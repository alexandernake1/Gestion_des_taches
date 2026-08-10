import { cn } from '@/utils/cn'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = [
    'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200',
    'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'select-none relative overflow-hidden',
  ].join(' ')

  const variants = {
    primary: [
      'rounded-xl text-white shadow-cta',
      'hover:-translate-y-0.5 hover:shadow-lg hover:brightness-110',
    ].join(' '),
    secondary: [
      'rounded-xl border border-border bg-card text-card-foreground shadow-xs',
      'hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:-translate-y-0.5 hover:shadow-card',
    ].join(' '),
    outline: [
      'rounded-xl border-2 border-primary/60 text-primary bg-transparent',
      'hover:bg-primary hover:text-white hover:-translate-y-0.5 hover:shadow-cta',
    ].join(' '),
    danger: [
      'rounded-xl text-white',
      'hover:-translate-y-0.5 hover:brightness-110',
    ].join(' '),
    success: [
      'rounded-xl text-white',
      'hover:-translate-y-0.5 hover:brightness-110',
    ].join(' '),
    ghost: [
      'rounded-xl bg-transparent text-muted-foreground',
      'hover:bg-muted/70 hover:text-foreground',
    ].join(' '),
  }

  const sizes = {
    xs: 'h-7  px-2.5 text-xs  rounded-lg gap-1.5',
    sm: 'h-8  px-3   text-xs',
    md: 'h-10 px-4   text-sm',
    lg: 'h-12 px-6   text-sm',
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
    },
    danger: {
      background: 'hsl(var(--destructive))',
      boxShadow: '0 4px 14px -2px hsl(var(--destructive) / 0.40)',
    },
    success: {
      background: 'hsl(var(--success))',
      boxShadow: '0 4px 14px -2px hsl(var(--success) / 0.40)',
    },
    secondary: {},
    outline: {},
    ghost: {},
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      style={variantStyles[variant]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      {children}
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  )
}
