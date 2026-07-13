import { returnNoteStatusLabel } from '@/constants/returnNoteStatus'

const colorByStatus = {
  Draft: {
    color: 'var(--color-text-muted)',
    background: 'rgba(148,163,184,0.10)',
    border: 'rgba(148,163,184,0.22)',
  },
  Submitted: {
    color: 'var(--color-teal)',
    background: 'rgba(142,232,240,0.08)',
    border: 'rgba(142,232,240,0.18)',
  },
  Approved: {
    color: 'var(--color-amber)',
    background: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.22)',
  },
  Completed: {
    color: 'var(--color-emerald)',
    background: 'rgba(16,185,129,0.10)',
    border: 'rgba(16,185,129,0.22)',
  },
  Rejected: {
    color: 'var(--color-danger)',
    background: 'rgba(244,63,94,0.10)',
    border: 'rgba(244,63,94,0.22)',
  },
  Cancelled: {
    color: 'var(--color-text-muted)',
    background: 'rgba(148,163,184,0.10)',
    border: 'rgba(148,163,184,0.22)',
  },
}

export default function ReturnNoteStatusBadge({ status }) {
  const label = returnNoteStatusLabel(status)
  const colors = colorByStatus[label] || colorByStatus.Draft

  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        border: `1px solid ${colors.border}`,
        background: colors.background,
        color: colors.color,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  )
}
