import { Inbox } from 'lucide-react'
export default function EmptyState({
  icon = <Inbox className="size-8" />,
  title,
  description,
  action,
}) {
  return (
    <div className="panel flex min-h-55 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-amber)_10%,transparent)] text-amber">
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
        <p className="mx-auto max-w-lg text-sm text-text-muted">{description}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}
