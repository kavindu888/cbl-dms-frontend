import * as Separator from '@radix-ui/react-separator'
import dayjs from 'dayjs'
import { Bell, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { useAuthStore } from '@stores/authStore'
import { useUIStore } from '@stores/uiStore'

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function toReadableSegment(segment: string) {
  if (!segment) {
    return 'Dashboard'
  }

  const normalized = segment.replace(/[-_]/g, ' ')

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
}

function buildBreadcrumb(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)

  if (!segments.length) {
    return ['Dashboard']
  }

  return segments.map((segment, index) => {
    if (segment === 'new') {
      return 'New'
    }

    if (index > 0 && /^[a-z0-9-]+$/i.test(segment) && segment.includes('-')) {
      return toReadableSegment(segment)
    }

    if (index > 0 && /^[a-z0-9]+$/i.test(segment) && /\d/.test(segment)) {
      return 'Detail'
    }

    return toReadableSegment(segment)
  })
}

export default function TopBar() {
  const location = useLocation()
  const { toggleSidebar } = useUIStore()
  const { user } = useAuthStore()
  const [now, setNow] = useState(() => dayjs())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(dayjs())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const breadcrumb = buildBreadcrumb(location.pathname)
  const displayName = user?.username ?? 'Demo User'
  const displayRole = user?.roles[0] ?? 'Guest'

  return (
    <header className="sticky top-0 z-20 flex h-[var(--spacing-layout-topbar)] items-center justify-between border-b border-[var(--color-border)] bg-[rgba(13,27,42,0.92)] px-4 backdrop-blur-xl lg:col-start-2 lg:row-start-1 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="icon-button"
          aria-label="Toggle sidebar"
          onClick={toggleSidebar}
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="min-w-0">
          <p className="eyebrow">Navigation</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-sm text-[var(--color-text-muted)]">
            {breadcrumb.map((item, index) => (
              <span key={`${item}-${index}`} className="truncate">
                {index > 0 ? <span className="mr-2 text-[var(--color-text-dim)]">/</span> : null}
                <span
                  className={
                    index === breadcrumb.length - 1 ? 'text-[var(--color-text-primary)]' : ''
                  }
                >
                  {item}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="ml-4 flex items-center gap-3">
        <div className="hidden rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-3 py-2 md:block">
          <span className="mono text-xs text-[var(--color-text-muted)]">
            {now.format('ddd, DD MMM YYYY  HH:mm:ss')}
          </span>
        </div>

        <button type="button" className="icon-button relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-semibold text-white">
            3
          </span>
        </button>

        <Separator.Root
          decorative
          orientation="vertical"
          className="hidden h-8 w-px bg-[var(--color-border)] md:block"
        />

        <div className="hidden items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-3 py-2 md:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(244,166,35,0.12)] font-semibold text-[var(--color-amber)]">
            {getInitials(displayName)}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{displayName}</p>
            <div className="mt-1">
              <span className="text-chip">{displayRole}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
