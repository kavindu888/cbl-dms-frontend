import { cn } from '@/utils'
export default function KPICard({
  title,
  value,
  sub,
  trend,
  trendValue,
  icon,
  iconColor = 'var(--color-amber)',
  valueColor = 'var(--color-text-primary)',
}) {
  const trendColor = trend === 'up' ? 'var(--color-teal)' : 'var(--color-danger)'
  return (
    <section className="panel flex min-h-[156px] flex-col justify-between p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{title}</p>
          <div className="mt-3 text-3xl font-semibold" style={{ color: valueColor }}>
            {value}
          </div>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl border"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-amber) 18%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--color-amber) 8%, transparent)',
            color: iconColor,
          }}
        >
          {icon}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">
          {sub ?? 'Awaiting live ERP metrics'}
        </p>
        {trend && trendValue ? (
          <span className={cn('mono text-sm font-medium')} style={{ color: trendColor }}>
            {trend === 'up' ? '▲' : '▼'} {trendValue}
          </span>
        ) : null}
      </div>
    </section>
  )
}
