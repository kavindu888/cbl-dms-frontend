import { cn } from '@utils/cn'

type BadgeStyle = { bg: string; text: string; border: string }

const STATUS_STYLES: Record<string, BadgeStyle> = {
  draft:       { bg: 'transparent',           text: '#94A3B8', border: '#243057' },
  submitted:   { bg: 'rgba(102,181,250,0.15)', text: '#66B5FA', border: '#66B5FA' },
  received:    { bg: 'rgba(32,212,191,0.15)',  text: '#20D4BF', border: '#20D4BF' },
  partial:     { bg: 'rgba(250,204,21,0.15)',  text: '#FACC15', border: '#FACC15' },
  cancelled:   { bg: 'rgba(244,63,94,0.15)',   text: '#F43F5E', border: '#F43F5E' },
  overdue:     { bg: 'rgba(244,63,94,0.20)',   text: '#F43F5E', border: '#F43F5E' },
  cleared:     { bg: 'rgba(32,212,191,0.15)',  text: '#20D4BF', border: '#20D4BF' },
  on_route:    { bg: 'rgba(32,212,191,0.15)',  text: '#20D4BF', border: '#20D4BF' },
  pending:     { bg: 'rgba(167,139,250,0.15)', text: '#A78BFA', border: '#A78BFA' },
  returned:    { bg: 'rgba(244,63,94,0.15)',   text: '#F43F5E', border: '#F43F5E' },
  active:      { bg: 'rgba(32,212,191,0.15)',  text: '#20D4BF', border: '#20D4BF' },
  inactive:    { bg: 'rgba(148,163,184,0.15)', text: '#94A3B8', border: '#94A3B8' },
  expired:     { bg: 'rgba(244,63,94,0.15)',   text: '#F43F5E', border: '#F43F5E' },
  critical:    { bg: 'rgba(244,63,94,0.20)',   text: '#F43F5E', border: '#F43F5E' },
  paid:        { bg: 'rgba(32,212,191,0.15)',  text: '#20D4BF', border: '#20D4BF' },
  in_warehouse:{ bg: 'rgba(102,181,250,0.15)', text: '#66B5FA', border: '#66B5FA' },
  low:         { bg: 'rgba(250,204,21,0.15)',  text: '#FACC15', border: '#FACC15' },
  in_transit:  { bg: 'rgba(250,204,21,0.15)',  text: '#FACC15', border: '#FACC15' },
  maintenance: { bg: 'rgba(244,63,94,0.15)',   text: '#F43F5E', border: '#F43F5E' },
}

const FALLBACK: BadgeStyle = { bg: 'transparent', text: '#94A3B8', border: '#243057' }

type StatusBadgeProps = {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status.trim().toLowerCase().replace(/[\s-]+/g, '_')
  const style = STATUS_STYLES[key] ?? FALLBACK
  const label = status.replace(/_/g, ' ').toUpperCase()

  return (
    <span
      className={cn(
        'mono inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.5px]',
        className
      )}
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {label}
    </span>
  )
}
