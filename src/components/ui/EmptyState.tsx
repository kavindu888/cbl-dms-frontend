import type { ReactNode } from 'react'

import { Inbox } from 'lucide-react'

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export default function EmptyState({
  icon = <Inbox className="h-8 w-8" />,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="panel flex min-h-[220px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(244,166,35,0.1)] text-[var(--color-amber)]">
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h3>
        <p className="mx-auto max-w-lg text-sm text-[var(--color-text-muted)]">{description}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}
