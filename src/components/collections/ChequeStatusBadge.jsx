const STYLES = {
  Received: ['rgba(102,181,250,.1)', 'var(--color-blue)', 'rgba(102,181,250,.3)'],
  Deposited: ['rgba(245,158,11,.1)', 'var(--color-amber)', 'rgba(245,158,11,.3)'],
  Cleared: ['rgba(32,212,191,.1)', 'var(--color-teal)', 'rgba(32,212,191,.3)'],
  Bounced: ['rgba(244,63,94,.1)', 'var(--color-danger)', 'rgba(244,63,94,.3)'],
  Cancelled: ['rgba(148,163,184,.08)', 'var(--color-text-dim)', 'rgba(148,163,184,.2)'],
  WrittenOff: ['rgba(148,163,184,.08)', 'var(--color-text-dim)', 'rgba(148,163,184,.2)'],
}

export default function ChequeStatusBadge({ status }) {
  const style = STYLES[status] || STYLES.Cancelled
  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        background: style[0],
        color: style[1],
        border: `1px solid ${style[2]}`,
      }}
    >
      {status || 'Unknown'}
    </span>
  )
}

export { ChequeStatusBadge }
