export default function AgingBadge({ daysOverdue }) {
  const days = Number(daysOverdue || 0)
  if (days <= 0) return null
  const color =
    days > 21
      ? 'var(--color-danger)'
      : days > 14
        ? 'var(--color-orange, #f97316)'
        : days > 7
          ? 'var(--color-amber)'
          : 'var(--color-warning)'
  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 10,
        color,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
      }}
    >
      {days}d overdue
    </span>
  )
}

export { AgingBadge }
