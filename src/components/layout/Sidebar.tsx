import * as Tooltip from '@radix-ui/react-tooltip'
import {
  Banknote,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

import logo from '@assets/logo.svg'
import { useAuthStore } from '@stores/authStore'
import { useUIStore } from '@stores/uiStore'
import { cn } from '@/utils'

type NavItem = {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'OPERATIONS',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
      { label: 'Purchasing', to: '/purchasing', icon: ShoppingCart },
      { label: 'Inventory', to: '/inventory', icon: Package },
      { label: 'Sales', to: '/sales/invoices', icon: ClipboardList },
    ],
  },
  {
    label: 'FINANCE',
    items: [{ label: 'Collections', to: '/collections/daily', icon: Banknote }],
  },
  {
    label: 'LOGISTICS',
    items: [{ label: 'Fleet', to: '/fleet', icon: Truck }],
  },
  {
    label: 'ANALYTICS',
    items: [{ label: 'Reports', to: '/reports', icon: BarChart2 }],
  },
  {
    label: 'ADMIN',
    items: [
      { label: 'Users', to: '/users', icon: Users },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function closeMobileSidebar() {
  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
    useUIStore.setState({ sidebarMobileOpen: false })
  }
}

function SidebarLink({ collapsed, item }: { collapsed: boolean; item: NavItem }) {
  const Icon = item.icon
  const link = (
    <NavLink
      end={item.end}
      to={item.to}
      onClick={closeMobileSidebar}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center gap-3 rounded-r-xl border-l-[3px] px-4 text-sm transition-colors',
          collapsed ? 'justify-center px-2' : 'justify-start',
          isActive
            ? 'border-[var(--color-amber)] bg-[var(--color-bg-elevated)] text-[var(--color-amber)]'
            : 'border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]'
        )
      }
    >
      <Icon className="h-4.5 w-4.5 shrink-0" />
      {!collapsed ? <span>{item.label}</span> : null}
    </NavLink>
  )

  if (!collapsed) {
    return link
  }

  return (
    <Tooltip.Root delayDuration={150}>
      <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={12}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-xs text-[var(--color-text-primary)] shadow-lg"
        >
          {item.label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export default function Sidebar() {
  const { sidebarCollapsed, sidebarMobileOpen, toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()

  const displayName = user ? `${user.username}` : 'Demo User'
  const displayRole = user?.roles[0] ?? 'Guest'

  return (
    <Tooltip.Provider>
      <aside
        className={cn(
          'panel fixed inset-y-0 left-0 z-40 flex w-[var(--spacing-layout-sidebar)] flex-col overflow-hidden rounded-none border-y-0 border-l-0 transition-transform duration-300 lg:static lg:row-span-2',
          sidebarCollapsed ? 'lg:w-14' : 'lg:w-[var(--spacing-layout-sidebar)]',
          sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-3 border-b border-[var(--color-border)] p-4',
            sidebarCollapsed && 'justify-center px-2'
          )}
        >
          <img
            src={logo}
            alt="CBL logo"
            className={cn('h-10', sidebarCollapsed ? 'w-10 object-cover object-left' : 'w-auto')}
          />
          {!sidebarCollapsed ? (
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {import.meta.env.VITE_APP_NAME}
              </p>
              <p className="eyebrow mt-1">Sri Lanka FMCG Distribution ERP</p>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-6">
              {!sidebarCollapsed ? <p className="eyebrow px-4 pb-2">{group.label}</p> : null}
              <div className="flex flex-col gap-1 px-1">
                {group.items.map((item) => (
                  <SidebarLink key={item.to} collapsed={sidebarCollapsed} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--color-border)] p-3">
          <button
            type="button"
            className={cn('button-ghost mb-3 w-full', sidebarCollapsed && 'px-0')}
            onClick={toggleSidebar}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
            {!sidebarCollapsed ? <span>Collapse Navigation</span> : null}
          </button>

          <div
            className={cn(
              'panel flex items-center gap-3 p-3',
              sidebarCollapsed && 'justify-center px-2'
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(244,166,35,0.14)] font-semibold text-[var(--color-amber)]">
              {getInitials(displayName)}
            </div>
            {!sidebarCollapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                  {displayName}
                </p>
                <p className="truncate text-xs text-[var(--color-text-muted)]">{displayRole}</p>
              </div>
            ) : null}
            <button
              type="button"
              className={cn('icon-button shrink-0', sidebarCollapsed && 'h-9 w-9')}
              aria-label="Logout"
              onClick={() => void logout()}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </Tooltip.Provider>
  )
}
