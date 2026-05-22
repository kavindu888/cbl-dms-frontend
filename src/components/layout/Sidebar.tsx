import * as Tooltip from '@radix-ui/react-tooltip'
import {
  Banknote,
  BarChart2,
  Bookmark,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { useAuthStore } from '@stores/authStore'
import { useUIStore } from '@stores/uiStore'
import { cn } from '@/utils'

import styles from './Sidebar.module.css'

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
      { label: 'Sales', to: '/sales/invoices', icon: ClipboardList },
    ],
  },
  {
    label: 'INVENTORY',
    items: [
      { label: 'Product', to: '/inventory', icon: Package, end: true },
      { label: 'Category', to: '/inventory/categories', icon: Tags },
      { label: 'Brand', to: '/inventory/brands', icon: Bookmark },
    ],
  },
  {
    label: 'PURCHASING',
    items: [
      { label: 'Purchase Order', to: '/purchasing', icon: ShoppingCart, end: true },
      { label: 'Supplier', to: '/purchasing/suppliers', icon: Store },
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
      { label: 'Users', to: '/users', icon: Users, end: true },
      { label: 'Roles & Permissions', to: '/users/roles', icon: Shield },
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

function normalizeSearch(value: string) {
  return value.trim().toLowerCase()
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
          styles.navLink,
          collapsed ? styles.navLinkCollapsed : styles.navLinkExpanded,
          isActive ? styles.navLinkActive : styles.navLinkInactive
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className={styles.navIconWrap}>
            <Icon
              className={cn(
                styles.navIcon,
                isActive ? styles.navIconActive : styles.navIconInactive
              )}
            />
          </div>
          {!collapsed ? <span className="truncate">{item.label}</span> : null}
        </>
      )}
    </NavLink>
  )

  if (!collapsed) {
    return link
  }

  return (
    <Tooltip.Root delayDuration={150}>
      <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="right" sideOffset={12} className={styles.tooltipContent}>
          {item.label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export default function Sidebar() {
  const { sidebarCollapsed, sidebarMobileOpen } = useUIStore()
  const { user, logout } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')

  const displayName = user ? `${user.username}` : 'admin'
  const displayRole = user?.roles[0] ?? 'Administrator'
  const normalizedQuery = normalizeSearch(searchQuery)

  const filteredNavGroups = normalizedQuery
    ? navGroups
        .map((group) => {
          const items = group.items.filter((item) => {
            const haystack = `${group.label} ${item.label}`.toLowerCase()
            return haystack.includes(normalizedQuery)
          })

          return items.length ? { ...group, items } : null
        })
        .filter((group): group is NavGroup => Boolean(group))
    : navGroups

  return (
    <Tooltip.Provider>
      <aside
        className={cn(
          styles.sidebar,
          sidebarCollapsed && styles.sidebarCollapsed,
          sidebarMobileOpen ? styles.sidebarMobileOpen : styles.sidebarMobileClosed
        )}
      >
        <div className={cn(styles.header, sidebarCollapsed && styles.headerCollapsed)}>
          <div className={cn(styles.brandMark, sidebarCollapsed && styles.brandMarkCollapsed)}>
            C
          </div>
          {!sidebarCollapsed ? (
            <div className={styles.brandText}>
              <p className={styles.brandTitle}>CBL FOODS</p>
              <p className={styles.brandSubtitle}>Distribution</p>
            </div>
          ) : null}
        </div>

        {!sidebarCollapsed ? (
          <div className={styles.searchWrap}>
            <div className={styles.searchInputWrap}>
              <Search className={styles.searchIcon} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search menu..."
                aria-label="Search menu"
                className={styles.searchInput}
              />
              {searchQuery ? (
                <button
                  type="button"
                  className={styles.searchClear}
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                >
                  x
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className={styles.navContent}>
          {filteredNavGroups.length ? (
            filteredNavGroups.map((group) => (
              <div key={group.label} className={styles.navGroup}>
                {!sidebarCollapsed ? <p className={styles.navGroupLabel}>{group.label}</p> : null}
                <div className={styles.navList}>
                  {group.items.map((item) => (
                    <SidebarLink key={item.to} collapsed={sidebarCollapsed} item={item} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            !sidebarCollapsed ? <div className={styles.searchEmptyState}>No menu items found.</div> : null
          )}
        </div>

        <div className={styles.footer}>
          <div className={cn(styles.profileCard, sidebarCollapsed && styles.profileCardCollapsed)}>
            <Link to="/profile" onClick={closeMobileSidebar} className={styles.profileLink}>
              <div className={styles.profileAvatar}>{getInitials(displayName)}</div>
              {!sidebarCollapsed ? (
                <div className={styles.profileText}>
                  <p className={styles.profileName}>{displayName}</p>
                  <p className={styles.profileRole}>{displayRole}</p>
                </div>
              ) : null}
            </Link>
            <button
              type="button"
              className={styles.logoutButton}
              aria-label="Logout"
              onClick={() => void logout()}
            >
              <LogOut className={styles.logoutIcon} />
              {!sidebarCollapsed ? <span className={styles.logoutLabel}>Logout</span> : null}
            </button>
          </div>
        </div>
      </aside>
    </Tooltip.Provider>
  )
}
