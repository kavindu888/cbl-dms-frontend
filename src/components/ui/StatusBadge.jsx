import { cn } from '@utils/cn'
const STATUS_STYLES = {
  draft: { bg: 'transparent', text: 'var(--color-text-muted)', border: 'rgba(148,163,184,0.20)' },
  submitted: {
    bg: 'rgba(102,181,250,0.10)',
    text: 'var(--color-blue)',
    border: 'rgba(102,181,250,0.25)',
  },
  pending_approval: {
    bg: 'rgba(102,181,250,0.10)',
    text: 'var(--color-blue)',
    border: 'rgba(102,181,250,0.25)',
  },
  approved: {
    bg: 'rgba(32,212,191,0.12)',
    text: 'var(--color-teal)',
    border: 'rgba(32,212,191,0.30)',
  },
  rejected: {
    bg: 'rgba(244,63,94,0.10)',
    text: 'var(--color-danger)',
    border: 'rgba(244,63,94,0.25)',
  },
  partially_received: {
    bg: 'rgba(250,204,21,0.10)',
    text: 'var(--color-warning)',
    border: 'rgba(250,204,21,0.25)',
  },
  fully_received: {
    bg: 'rgba(32,212,191,0.12)',
    text: 'var(--color-teal)',
    border: 'rgba(32,212,191,0.30)',
  },
  received: {
    bg: 'rgba(32,212,191,0.12)',
    text: 'var(--color-teal)',
    border: 'rgba(32,212,191,0.30)',
  },
  partial: {
    bg: 'rgba(250,204,21,0.10)',
    text: 'var(--color-warning)',
    border: 'rgba(250,204,21,0.25)',
  },
  cancelled: {
    bg: 'rgba(244,63,94,0.10)',
    text: 'var(--color-danger)',
    border: 'rgba(244,63,94,0.25)',
  },
  overdue: {
    bg: 'rgba(244,63,94,0.15)',
    text: 'var(--color-danger)',
    border: 'rgba(244,63,94,0.30)',
  },
  cleared: {
    bg: 'rgba(32,212,191,0.12)',
    text: 'var(--color-teal)',
    border: 'rgba(32,212,191,0.30)',
  },
  on_route: {
    bg: 'rgba(32,212,191,0.12)',
    text: 'var(--color-teal)',
    border: 'rgba(32,212,191,0.30)',
  },
  pending: {
    bg: 'rgba(167,139,250,0.10)',
    text: 'var(--color-purple)',
    border: 'rgba(167,139,250,0.25)',
  },
  returned: {
    bg: 'rgba(244,63,94,0.10)',
    text: 'var(--color-danger)',
    border: 'rgba(244,63,94,0.25)',
  },
  active: {
    bg: 'rgba(32,212,191,0.12)',
    text: 'var(--color-teal)',
    border: 'rgba(32,212,191,0.30)',
  },
  inactive: {
    bg: 'rgba(148,163,184,0.10)',
    text: 'var(--color-text-muted)',
    border: 'rgba(148,163,184,0.20)',
  },
  discontinued: {
    bg: 'rgba(148,163,184,0.10)',
    text: 'var(--color-text-muted)',
    border: 'rgba(148,163,184,0.20)',
  },
  expired: {
    bg: 'rgba(244,63,94,0.10)',
    text: 'var(--color-danger)',
    border: 'rgba(244,63,94,0.25)',
  },
  critical: {
    bg: 'rgba(244,63,94,0.15)',
    text: 'var(--color-danger)',
    border: 'rgba(244,63,94,0.30)',
  },
  paid: { bg: 'rgba(32,212,191,0.12)', text: 'var(--color-teal)', border: 'rgba(32,212,191,0.30)' },
  in_warehouse: {
    bg: 'rgba(102,181,250,0.10)',
    text: 'var(--color-blue)',
    border: 'rgba(102,181,250,0.25)',
  },
  low: {
    bg: 'rgba(250,204,21,0.10)',
    text: 'var(--color-warning)',
    border: 'rgba(250,204,21,0.25)',
  },
  in_transit: {
    bg: 'rgba(250,204,21,0.10)',
    text: 'var(--color-warning)',
    border: 'rgba(250,204,21,0.25)',
  },
  maintenance: {
    bg: 'rgba(244,63,94,0.10)',
    text: 'var(--color-danger)',
    border: 'rgba(244,63,94,0.25)',
  },
  system: {
    bg: 'rgba(32,212,191,0.12)',
    text: 'var(--color-teal)',
    border: 'rgba(32,212,191,0.30)',
  },
  custom: {
    bg: 'rgba(148,163,184,0.10)',
    text: 'var(--color-text-muted)',
    border: 'rgba(148,163,184,0.20)',
  },
  verified: {
    bg: 'rgba(32,212,191,0.12)',
    text: 'var(--color-teal)',
    border: 'rgba(32,212,191,0.30)',
  },
  claimed: {
    bg: 'rgba(250,204,21,0.10)',
    text: 'var(--color-warning)',
    border: 'rgba(250,204,21,0.25)',
  },
  available: {
    bg: 'rgba(102,181,250,0.10)',
    text: 'var(--color-blue)',
    border: 'rgba(102,181,250,0.25)',
  },
  allocated: {
    bg: 'rgba(250,204,21,0.10)',
    text: 'var(--color-warning)',
    border: 'rgba(250,204,21,0.25)',
  },
  earned: {
    bg: 'rgba(32,212,191,0.12)',
    text: 'var(--color-teal)',
    border: 'rgba(32,212,191,0.30)',
  },
  consumed: {
    bg: 'rgba(250,204,21,0.10)',
    text: 'var(--color-warning)',
    border: 'rgba(250,204,21,0.25)',
  },
  adjusted: {
    bg: 'rgba(102,181,250,0.10)',
    text: 'var(--color-blue)',
    border: 'rgba(102,181,250,0.25)',
  },
  damage: {
    bg: 'rgba(244,63,94,0.10)',
    text: 'var(--color-danger)',
    border: 'rgba(244,63,94,0.25)',
  },
  damaged: {
    bg: 'rgba(249,115,22,0.10)',
    text: 'var(--color-orange, #f97316)',
    border: 'rgba(249,115,22,0.25)',
  },
  expire: {
    bg: 'rgba(249,115,22,0.10)',
    text: 'var(--color-orange, #f97316)',
    border: 'rgba(249,115,22,0.25)',
  },
  shortexpire: {
    bg: 'rgba(250,204,21,0.10)',
    text: 'var(--color-warning)',
    border: 'rgba(250,204,21,0.25)',
  },
  shortexpiry: {
    bg: 'rgba(250,204,21,0.10)',
    text: 'var(--color-warning)',
    border: 'rgba(250,204,21,0.25)',
  },
  short_expiry: {
    bg: 'rgba(250,204,21,0.10)',
    text: 'var(--color-warning)',
    border: 'rgba(250,204,21,0.25)',
  },
  other: {
    bg: 'rgba(148,163,184,0.10)',
    text: 'var(--color-text-muted)',
    border: 'rgba(148,163,184,0.20)',
  },
  others: {
    bg: 'rgba(148,163,184,0.10)',
    text: 'var(--color-text-muted)',
    border: 'rgba(148,163,184,0.20)',
  },
}
const FALLBACK = {
  bg: 'transparent',
  text: 'var(--color-text-muted)',
  border: 'rgba(148,163,184,0.20)',
}
function normalizeStatus(status) {
  if (status === null || status === undefined || status === '') return 'Unknown'
  return String(status)
}

export default function StatusBadge({ status, className }) {
  const safeStatus = normalizeStatus(status)
  const key = safeStatus
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  const style = STATUS_STYLES[key] ?? FALLBACK
  const label = safeStatus.replace(/_/g, ' ').toUpperCase()
  return (
    <span
      className={cn('mono inline-flex items-center', className)}
      style={{
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        borderRadius: 20,
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {label}
    </span>
  )
}
