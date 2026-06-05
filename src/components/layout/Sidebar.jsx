import * as Tooltip from '@radix-ui/react-tooltip'
import {
  // Banknote,
  // BarChart2,
  // Bookmark,
  // ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Ruler,
  Store,
  Search,
  Settings,
  // Shield,
  // ShoppingCart,
  Tags,
  // Truck,
  Route,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore'
import { useUIStore } from '@stores/uiStore'
import UserAvatarIcon from '@components/ui/UserAvatarIcon'
import { cn } from '@/utils'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'
import styles from './Sidebar.module.css'
const navGroups = [
  {
    label: 'OPERATIONS',
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true }],
  },
  // {
  //   label: 'PURCHASING',
  //   items: [
  //     { label: 'Purchase Order', to: '/purchasing', icon: ShoppingCart, end: true },
  //     { label: 'Purchase Returns', to: '/purchasing/returns', icon: Bookmark },
  //   ],
  // },
  // {
  //   label: 'FINANCE',
  //   items: [{ label: 'Collections', to: '/collections/daily', icon: Banknote }],
  // },
  {
    label: 'MASTER',
    items: [
      {
        label: 'Supplier',
        to: '/master/suppliers',
        icon: Store,
        permissions: PERMISSIONS.purchasing.supplierManage,
      },
      {
        label: 'Product',
        to: '/master/products',
        icon: Package,
        end: true,
        permissions: PERMISSIONS.masterData.productRead,
      },
      {
        label: 'Category',
        to: '/master/categories',
        icon: Tags,
        permissions: PERMISSIONS.masterData.categoryManage,
      },
      {
        label: 'UOM',
        to: '/master/units-of-measure',
        icon: Ruler,
        permissions: PERMISSIONS.masterData.uomManage,
      },
      {
        label: 'Sales Routes',
        to: '/master/sales-routes',
        icon: Route,
        permissions: PERMISSIONS.masterData.salesRouteManage,
      },
    ],
  },
  {
    label: 'SALES',
    items: [
      {
        label: 'Customer',
        to: '/sales/customers',
        icon: Users,
        permissions: [PERMISSIONS.sales.customerRead, PERMISSIONS.sales.customerManage],
      },
      {
        label: 'Customer Groups',
        to: '/sales/customer-groups',
        icon: Users,
        permissions: PERMISSIONS.sales.customerManage,
      },
    ],
  },
  {
    label: 'ADMIN',
    items: [
      {
        label: 'Users',
        to: '/users',
        icon: Users,
        end: true,
        permissions: PERMISSIONS.identity.userManage,
      },
      // { label: 'Roles & Permissions', to: '/users/roles', icon: Shield },
      {
        label: 'Settings',
        to: '/settings',
        icon: Settings,
        permissions: [
          PERMISSIONS.masterData.orgManage,
          PERMISSIONS.masterData.territoryManage,
          PERMISSIONS.masterData.businessUnitManage,
        ],
      },
    ],
  },
]
function closeMobileSidebar() {
  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
    useUIStore.setState({ sidebarMobileOpen: false })
  }
}
function normalizeSearch(value) {
  return value.trim().toLowerCase()
}
function SidebarLink({ collapsed, item }) {
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
  const accessibleNavGroups = navGroups
    .map((group) => {
      const items = group.items.filter((item) => userHasPermission(user, item.permissions))
      return items.length ? { ...group, items } : null
    })
    .filter((group) => Boolean(group))
  const filteredNavGroups = normalizedQuery
    ? accessibleNavGroups
        .map((group) => {
          const items = group.items.filter((item) => {
            const haystack = `${group.label} ${item.label}`.toLowerCase()
            return haystack.includes(normalizedQuery)
          })
          return items.length ? { ...group, items } : null
        })
        .filter((group) => Boolean(group))
    : accessibleNavGroups
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
          <div
            className={cn(styles.brandMark, sidebarCollapsed && styles.brandMarkCollapsed)}
            style={{ background: 'transparent', boxShadow: 'none' }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="url(#flowLinkIconGrad)"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(139, 92, 246, 0.4))' }}
            >
              <defs>
                <linearGradient id="flowLinkIconGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--color-amber)" />
                  <stop offset="100%" stopColor="var(--color-purple)" />
                </linearGradient>
              </defs>
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
              <circle cx="5" cy="12" r="2.5" fill="var(--color-amber)" stroke="none" />
              <circle cx="19" cy="12" r="2.5" fill="var(--color-purple)" stroke="none" />
            </svg>
          </div>
          {!sidebarCollapsed ? (
            <div className={styles.brandText}>
              <p
                className={styles.brandTitle}
                style={{
                  fontWeight: 800,
                  letterSpacing: '-0.3px',
                  background: 'linear-gradient(to right, var(--color-amber), var(--color-purple))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                FlowLink
              </p>
              <p
                className={styles.brandSubtitle}
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-dim)',
                  fontWeight: 700,
                }}
              >
                Distribution Hub
              </p>
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
          ) : !sidebarCollapsed ? (
            <div className={styles.searchEmptyState}>No menu items found.</div>
          ) : null}
        </div>

        <div className={styles.footer}>
          <div className={cn(styles.profileCard, sidebarCollapsed && styles.profileCardCollapsed)}>
            <Link to="/profile" onClick={closeMobileSidebar} className={styles.profileLink}>
              <div className={styles.profileAvatar}>
                <UserAvatarIcon size={20} />
              </div>
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
