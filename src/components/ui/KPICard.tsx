import type { ReactNode } from 'react'

import { cn } from '@/utils'

type KPICardProps = {
  title: string
  value: ReactNode
  sub?: string
  trend?: 'up' | 'down'
  trendValue?: string
  icon: ReactNode
  iconColor?: string
  valueColor?: string
}

export default function KPICard({
  title,
  value,
  sub,
  trend,
  trendValue,
  icon,
  iconColor = 'var(--color-amber)',
  valueColor = 'var(--color-text-primary)',
}: KPICardProps) {
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
            borderColor: 'rgba(244, 166, 35, 0.18)',
            backgroundColor: 'rgba(244, 166, 35, 0.08)',
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
