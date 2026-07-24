import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { AlertCircle, Inbox } from 'lucide-react'

dayjs.extend(utc)
dayjs.extend(timezone)

export const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const colomboToday = () => dayjs().tz('Asia/Colombo').format('YYYY-MM-DD')
export const isPostDated = (date) =>
  Boolean(date) &&
  dayjs(date).tz('Asia/Colombo').startOf('day').isAfter(dayjs().tz('Asia/Colombo').startOf('day'))

export function PageTitle({ title, subtitle, actions }) {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h1 style={{ fontSize: 25, fontWeight: 800 }}>{title}</h1>
        <p style={{ marginTop: 3, fontSize: 13, color: 'var(--color-text-muted)' }}>{subtitle}</p>
      </div>
      {actions ? <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div> : null}
    </header>
  )
}

export function Metric({ label, value, tone = 'var(--color-text-primary)', helper }) {
  return (
    <section className="panel" style={{ padding: 14 }}>
      <div className="form-label">{label}</div>
      <div className="mono" style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: tone }}>
        {value}
      </div>
      {helper ? (
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-dim)' }}>{helper}</div>
      ) : null}
    </section>
  )
}

export function Busy({ label = 'Loading...' }) {
  return (
    <div
      className="panel"
      style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}
    >
      {label}
    </div>
  )
}
export function Problem({ error }) {
  return (
    <div
      className="panel"
      style={{ padding: 22, color: 'var(--color-danger)', display: 'flex', gap: 8 }}
    >
      <AlertCircle size={18} />
      {error?.message || 'Unable to load data.'}
    </div>
  )
}
export function Blank({ children = 'No records found.' }) {
  return (
    <div style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}>
      <Inbox size={28} style={{ margin: '0 auto 8px' }} />
      {children}
    </div>
  )
}

export const inputStyle = { width: '100%', height: 38, background: 'var(--color-bg-base)' }
export const sectionStyle = { padding: 16, overflow: 'hidden' }
