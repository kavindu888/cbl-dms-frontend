import type { ReactNode } from 'react'

type FilterBarProps = {
  children: ReactNode
}

export default function FilterBar({ children }: FilterBarProps) {
  return <div className="panel flex flex-wrap items-center gap-3 p-4">{children}</div>
}
