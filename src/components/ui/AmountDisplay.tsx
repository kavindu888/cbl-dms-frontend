import { cn, formatLKR } from '@/utils'

type AmountDisplayProps = {
  amount: number
  variant?: 'default' | 'primary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const variantClasses = {
  default: 'amount',
  primary: 'amount-primary',
  danger: 'amount-danger',
  success: 'amount-success',
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
}

export default function AmountDisplay({
  amount,
  variant = 'default',
  size = 'md',
  className,
}: AmountDisplayProps) {
  return (
    <span className={cn(variantClasses[variant], sizeClasses[size], className)}>
      {formatLKR(amount)}
    </span>
  )
}
