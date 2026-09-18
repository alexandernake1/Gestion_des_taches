import { cn } from '@/utils/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  hover?: boolean
}

export function Card({ children, className, hover = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card text-card-foreground shadow-xs',
        'transition-all duration-200',
        hover && 'hover:border-primary/35 hover:shadow-card cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'border-b border-border/60 px-5 py-4 sm:px-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardContent({ children, className, ...props }: CardProps) {
  return (
    <div className={cn('p-5 sm:p-6', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'border-t border-border/60 px-5 py-4 sm:px-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
