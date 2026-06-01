import { cn, formatLKR } from '@/utils'
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
export default function AmountDisplay({ amount, variant = 'default', size = 'md', className }) {
  return (
    <span className={cn(variantClasses[variant], sizeClasses[size], className)}>
      {formatLKR(amount)}
    </span>
  )
}
