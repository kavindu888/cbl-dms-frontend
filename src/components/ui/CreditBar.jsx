import * as Progress from '@radix-ui/react-progress'
import { formatLKR } from '@/utils'
export default function CreditBar({ used, limit, label = 'Credit Utilization' }) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  return (
    <div className="panel space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">{label}</p>
        <span className="mono text-sm text-[var(--color-text-primary)]">
          {Math.round(percentage)}%
        </span>
      </div>
      <Progress.Root
        className="relative h-3 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]"
        value={percentage}
      >
        <Progress.Indicator
          className="h-full rounded-full bg-[var(--color-amber)] transition-transform"
          style={{ width: `${percentage}%` }}
        />
      </Progress.Root>
      <div className="flex items-center justify-between gap-3 text-sm text-[var(--color-text-muted)]">
        <span>{formatLKR(used)} used</span>
        <span>{formatLKR(limit)} limit</span>
      </div>
    </div>
  )
}
