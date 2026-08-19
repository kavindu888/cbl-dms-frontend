import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

const STATUS_STYLES = {
  idle: { bg: 'transparent', text: 'var(--color-text-muted)', border: 'rgba(148,163,184,0.20)' },
  saving: {
    bg: 'rgba(102,181,250,0.10)',
    text: 'var(--color-blue)',
    border: 'rgba(102,181,250,0.25)',
  },
  saved: {
    bg: 'rgba(32,212,191,0.12)',
    text: 'var(--color-teal)',
    border: 'rgba(32,212,191,0.30)',
  },
  offline: {
    bg: 'rgba(250,204,21,0.10)',
    text: 'var(--color-warning)',
    border: 'rgba(250,204,21,0.25)',
  },
  error: {
    bg: 'rgba(244,63,94,0.10)',
    text: 'var(--color-danger)',
    border: 'rgba(244,63,94,0.25)',
  },
}

function relativeTimeFromNow(now, date) {
  const seconds = Math.max(0, now.diff(dayjs(date), 'second'))
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return dayjs(date).format('DD MMM')
}

export default function DraftStatusBadge({ status, lastSavedAt }) {
  const [now, setNow] = useState(() => dayjs())

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(dayjs()), 5000)
    return () => window.clearInterval(intervalId)
  }, [])

  if (status === 'idle') return null

  const style = STATUS_STYLES[status] || STATUS_STYLES.idle
  const label =
    status === 'saving'
      ? 'Saving...'
      : status === 'offline'
        ? `Offline — saved locally${lastSavedAt ? ` · ${relativeTimeFromNow(now, lastSavedAt)}` : ''}`
        : status === 'error'
          ? 'Draft error'
          : `Saved locally${lastSavedAt ? ` · ${relativeTimeFromNow(now, lastSavedAt)}` : ''}`

  return (
    <span
      className="mono inline-flex items-center"
      style={{
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
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
