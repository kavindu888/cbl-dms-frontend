import { cn } from '@utils/cn'

const statusStyles: Record<string, { backgroundColor: string; color: string }> = {
  draft: {
    backgroundColor: 'var(--color-status-draft-bg)',
    color: 'var(--color-status-draft-text)',
  },
  submitted: {
    backgroundColor: 'var(--color-status-submitted-bg)',
    color: 'var(--color-status-submitted-text)',
  },
  received: {
    backgroundColor: 'var(--color-status-received-bg)',
    color: 'var(--color-status-received-text)',
  },
  partial: {
    backgroundColor: 'var(--color-status-partial-bg)',
    color: 'var(--color-status-partial-text)',
  },
  cancelled: {
    backgroundColor: 'var(--color-status-cancelled-bg)',
    color: 'var(--color-status-cancelled-text)',
  },
  overdue: {
    backgroundColor: 'var(--color-status-overdue-bg)',
    color: 'var(--color-status-overdue-text)',
  },
  cleared: {
    backgroundColor: 'var(--color-status-cleared-bg)',
    color: 'var(--color-status-cleared-text)',
  },
  on_route: {
    backgroundColor: 'var(--color-status-onroute-bg)',
    color: 'var(--color-status-onroute-text)',
  },
  pending: {
    backgroundColor: 'var(--color-status-submitted-bg)',
    color: 'var(--color-status-submitted-text)',
  },
  returned: {
    backgroundColor: 'var(--color-status-cancelled-bg)',
    color: 'var(--color-status-cancelled-text)',
  },
  active: {
    backgroundColor: 'var(--color-status-active-bg)',
    color: 'var(--color-status-active-text)',
  },
  inactive: {
    backgroundColor: 'var(--color-status-inactive-bg)',
    color: 'var(--color-status-inactive-text)',
  },
  expired: {
    backgroundColor: 'rgba(244, 63, 94, 0.16)',
    color: '#fda4af',
  },
  critical: {
    backgroundColor: 'rgba(250, 204, 21, 0.14)',
    color: '#fde68a',
  },
}

type StatusBadgeProps = {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  const badgeStyle = statusStyles[normalizedStatus] ?? statusStyles.draft

  return (
    <span
      className={cn(
        'mono inline-flex h-5 items-center rounded-[20px] px-2 text-[11px] uppercase tracking-[0.5px]',
        className
      )}
      style={badgeStyle}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}
