import * as Tooltip from '@radix-ui/react-tooltip'
import {
  Banknote,
  BarChart3,
  CalendarDays,
  // Bookmark,
  ClipboardList,
  ClipboardCheck,
  FileText,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  BadgeCheck,
  ListChecks,
  CheckSquare,
  Package,
  PackageCheck,
  PackagePlus,
  PackageX,
  PackageOpen,
  Percent,
  // ArrowLeftRight,
  Warehouse,
  Ruler,
  Search,
  Settings,
  SlidersHorizontal,
  // Shield,
  ShoppingCart,
  // Store,
  Tags,
  Truck,
  TrendingUp,
  Route,
  Landmark,
  User,
  UserCog,
  Users,
  Undo2,
  Unlock,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore'
import { useUIStore } from '@stores/uiStore'
import UserAvatarIcon from '@components/ui/UserAvatarIcon'
import { cn } from '@/utils'
import { PERMISSIONS, userMeetsPermissionRequirement } from '@/utils/permissions'
import { purchasingService } from '@/services/api/purchasingService'
import { ReturnNoteStatus } from '@/types/purchasing.types'
import { useLanguage } from '@/i18n'
import styles from './Sidebar.module.css'
const navGroups = [
  {
    labelKey: 'nav.operations',
    items: [{ labelKey: 'common.dashboard', to: '/', icon: LayoutDashboard, end: true }],
  },
  {
    labelKey: 'nav.sales',
    items: [
      {
        labelKey: 'nav.customer',
        to: '/sales/customers',
        icon: User,
        permissions: [PERMISSIONS.sales.customerRead, PERMISSIONS.sales.customerManage],
      },
      {
        labelKey: 'nav.customerGroups',
        to: '/sales/customer-groups',
        icon: Users,
        permissions: PERMISSIONS.sales.customerManage,
      },
      {
        labelKey: 'nav.invoices',
        to: '/sales/invoices',
        icon: FileText,
        end: true,
        permissions: PERMISSIONS.sales.invoiceRead,
      },
      {
        labelKey: 'nav.newInvoice',
        to: '/sales/invoices/new',
        icon: ClipboardList,
        permissions: PERMISSIONS.sales.invoiceCreate,
      },
      {
        labelKey: 'nav.invoicePaymentRecord',
        to: '/sales/invoice-payment-record',
        icon: Banknote,
        permissions: { all: [PERMISSIONS.sales.invoiceRead, PERMISSIONS.sales.invoiceAddPayment] },
      },
      {
        labelKey: 'nav.returnNotes',
        to: '/sales/return-notes',
        icon: Undo2,
        permissions: PERMISSIONS.sales.crnView,
      },
      {
        labelKey: 'nav.customerCredit',
        to: '/sales/customer-credit',
        icon: Banknote,
        permissions: PERMISSIONS.sales.customerCreditView,
      },
      {
        labelKey: 'nav.stuckReservations',
        to: '/sales/orders/stuck-reservations',
        icon: Unlock,
        permissions: PERMISSIONS.sales.orderCancel,
      },
    ],
  },
  {
    labelKey: 'nav.collections',
    items: [
      {
        labelKey: 'nav.dailySessions',
        to: '/collections/sessions',
        icon: ClipboardList,
        permissions: [PERMISSIONS.collections.sessionRead, PERMISSIONS.collections.sessionCreate],
      },
      {
        labelKey: 'nav.cheques',
        to: '/collections/cheques',
        icon: FileCheck2,
        permissions: [PERMISSIONS.collections.chequeRead, PERMISSIONS.collections.chequeManage],
      },
      {
        labelKey: 'nav.customerAccounts',
        to: '/collections/customer-accounts',
        icon: Users,
        permissions: [
          PERMISSIONS.collections.customerAccountRead,
          PERMISSIONS.collections.customerAccountManage,
        ],
      },
      {
        labelKey: 'nav.banksBranches',
        to: '/collections/banks',
        icon: Landmark,
        permissions: PERMISSIONS.collections.bankManage,
      },
      {
        labelKey: 'nav.collectors',
        to: '/collections/collectors',
        icon: User,
        permissions: [
          PERMISSIONS.collections.sessionCreate,
          PERMISSIONS.collections.collectorManage,
        ],
      },
      {
        labelKey: 'nav.salesmen',
        to: '/collections/salesmen',
        icon: UserCog,
        permissions: [
          PERMISSIONS.collections.sessionCreate,
          PERMISSIONS.collections.salesmanManage,
        ],
      },
    ],
  },
  {
    labelKey: 'nav.purchasing',
    items: [
      {
        isSubHeader: true,
        labelKey: 'nav.purchasingOrder',
      },
      {
        labelKey: 'nav.newPurchaseOrder',
        to: '/purchasing/place-order',
        icon: ShoppingCart,
        end: true,
        permissions: PERMISSIONS.purchasing.poCreate,
      },
      {
        labelKey: 'nav.poApproveReject',
        to: '/purchasing/approvals',
        icon: ListChecks,
        end: true,
        permissions: { all: [PERMISSIONS.purchasing.poRead, PERMISSIONS.purchasing.poApprove] },
      },
      {
        labelKey: 'nav.approvedPurchaseOrders',
        to: '/purchasing/approved',
        icon: BadgeCheck,
        end: true,
        permissions: PERMISSIONS.purchasing.poRead,
      },
      {
        labelKey: 'nav.purchaseOrdersList',
        to: '/purchasing/all-orders',
        icon: ClipboardList,
        end: true,
        permissions: PERMISSIONS.purchasing.poRead,
      },
      {
        isSubHeader: true,
        labelKey: 'nav.grn',
      },
      {
        labelKey: 'nav.newGoodsReceipt',
        to: '/purchasing/goods-receipt-entry',
        icon: PackageCheck,
        end: true,
        permissions: PERMISSIONS.purchasing.grnCreate,
      },
      {
        labelKey: 'nav.grnApproveReject',
        to: '/purchasing/grn-approve-reject',
        icon: ListChecks,
        end: true,
        permissions: PERMISSIONS.purchasing.grnVerify,
      },
      {
        labelKey: 'nav.goodsReceiptList',
        to: '/purchasing/goods-receipts',
        icon: ClipboardCheck,
        end: true,
        permissions: [PERMISSIONS.purchasing.grnCreate, PERMISSIONS.purchasing.grnVerify],
      },
      {
        isSubHeader: true,
        labelKey: 'nav.returnNote',
      },
      {
        labelKey: 'nav.purchaseReturns',
        to: '/purchasing/return-notes',
        icon: Undo2,
        end: true,
        permissions: [
          PERMISSIONS.purchasing.returnNoteCreate,
          PERMISSIONS.purchasing.returnNoteApprove,
          PERMISSIONS.purchasing.returnNoteComplete,
        ],
      },
      {
        labelKey: 'nav.rnApproveReject',
        to: '/purchasing/return-notes/approvals',
        icon: CheckSquare,
        end: true,
        badgeKey: 'pendingReturnApprovals',
        permissions: PERMISSIONS.purchasing.returnNoteApprove,
      },
      {
        isSubHeader: true,
        labelKey: 'nav.settlement',
      },
      {
        labelKey: 'nav.supplierSettlement',
        to: '/purchasing/settlement',
        icon: Banknote,
        end: true,
        permissions: PERMISSIONS.purchasing.settlementCreate,
      },
    ],
  },
  // {
  //   label: 'FINANCE',
  //   items: [{ label: 'Collections', to: '/collections/daily', icon: Banknote }],
  // },
  {
    labelKey: 'nav.master',
    items: [
      // {
      //   label: 'Supplier',
      //   to: '/master/suppliers',
      //   icon: Store,
      //   permissions: PERMISSIONS.purchasing.supplierManage,
      // },
      {
        labelKey: 'nav.product',
        to: '/master/products',
        icon: Package,
        end: true,
        permissions: PERMISSIONS.masterData.productRead,
      },
      {
        labelKey: 'nav.category',
        to: '/master/categories',
        icon: Tags,
        permissions: PERMISSIONS.masterData.categoryManage,
      },
      {
        labelKey: 'nav.categoryDiscounts',
        to: '/master/category-discounts',
        icon: Percent,
        permissions: PERMISSIONS.masterData.categoryManage,
      },
      {
        labelKey: 'nav.uom',
        to: '/master/units-of-measure',
        icon: Ruler,
        permissions: PERMISSIONS.masterData.uomManage,
      },
      {
        labelKey: 'nav.salesRoutes',
        to: '/master/sales-routes',
        icon: Route,
        permissions: PERMISSIONS.masterData.salesRouteManage,
      },
      {
        labelKey: 'nav.deliveryRuns',
        to: '/master/delivery-runs',
        icon: Truck,
        permissions: PERMISSIONS.masterData.salesRouteManage,
      },
    ],
  },
  {
    labelKey: 'nav.inventory',
    items: [
      {
        labelKey: 'nav.stockOverview',
        to: '/inventory/stock',
        icon: Package,
        end: true,
        permissions: PERMISSIONS.inventory.stockRead,
      },
      {
        labelKey: 'nav.openingStock',
        to: '/inventory/opening-stock',
        icon: PackagePlus,
        permissions: PERMISSIONS.inventory.openingStock,
      },
      // {
      //   label: 'Staged Returns',
      //   to: '/inventory/return-stock',
      //   icon: PackageX,
      //   permissions: PERMISSIONS.inventory.stockRead,
      // },
      {
        labelKey: 'nav.inStoreReturns',
        to: '/inventory/in-store-returns',
        icon: PackageX,
        permissions: [
          PERMISSIONS.inventory.inStoreReturnCreate,
          PERMISSIONS.inventory.inStoreReturnApprove,
        ],
      },
      {
        labelKey: 'nav.stockAdjustments',
        to: '/inventory/stock-adjustments',
        icon: SlidersHorizontal,
        permissions: PERMISSIONS.inventory.stockAdjustmentCreate,
      },
      // {
      //   label: 'Stock Audit',
      //   to: '/inventory/stock-audit',
      //   icon: Search,
      //   permissions: PERMISSIONS.inventory.stockRead,
      // },
      {
        labelKey: 'nav.stockBatches',
        to: '/inventory/batches',
        icon: PackageCheck,
        permissions: PERMISSIONS.inventory.stockRead,
      },
      {
        labelKey: 'nav.vehicleLoading',
        to: '/inventory/vehicle-loadings',
        icon: Truck,
        permissions: PERMISSIONS.inventory.vehicleLoad,
      },
      {
        labelKey: 'nav.vehicleUnloading',
        to: '/inventory/vehicle-unloadings',
        icon: PackageOpen,
        permissions: PERMISSIONS.inventory.vehicleUnload,
      },
      {
        labelKey: 'nav.stockLocations',
        to: '/inventory/locations',
        icon: Warehouse,
        permissions: PERMISSIONS.inventory.stockRead,
      },
      // {
      //   label: 'Stock Transfers',
      //   to: '/inventory/transfers',
      //   icon: ArrowLeftRight,
      //   permissions: PERMISSIONS.inventory.stockRead,
      // },
      // {
      //   label: 'Stocktakes',
      //   to: '/inventory/stocktakes',
      //   icon: ClipboardCheck,
      //   permissions: PERMISSIONS.inventory.stocktakeManage,
      // },
      // {
      //   label: 'Movements',
      //   to: '/inventory/movements',
      //   icon: ListChecks,
      //   permissions: PERMISSIONS.inventory.stockRead,
      // },
    ],
  },
  {
    labelKey: 'nav.reports',
    items: [
      {
        labelKey: 'nav.stockReport',
        to: '/reports/stock',
        icon: BarChart3,
        end: true,
        permissions: PERMISSIONS.reporting.viewReports,
      },
        {
          labelKey: 'nav.creditAgingReport',
          to: '/reports/credit-aging',
          icon: TrendingUp,
          end: true,
          permissions: PERMISSIONS.reporting.viewReports,
        },
        {
          labelKey: 'nav.discountReport',
          to: '/reports/discount',
          icon: Percent,
          end: true,
          permissions: PERMISSIONS.reporting.discountView,
        },
        {
          labelKey: 'nav.dailyCollectionReport',
        to: '/reports/daily-collection',
        icon: Banknote,
        end: true,
        permissions: PERMISSIONS.reporting.viewReports,
      },
      {
        labelKey: 'nav.monthEndReport',
        to: '/reports/month-end',
        icon: CalendarDays,
        end: true,
        permissions: PERMISSIONS.reporting.monthEndView,
      },
    ],
  },
  {
    labelKey: 'nav.admin',
    items: [
      {
        labelKey: 'nav.users',
        to: '/users',
        icon: UserCog,
        end: true,
        permissions: { all: [PERMISSIONS.identity.userManage, PERMISSIONS.identity.roleManage] },
      },
      // { label: 'Roles & Permissions', to: '/users/roles', icon: Shield },
      {
        labelKey: 'nav.settings',
        to: '/settings',
        icon: Settings,
        permissions: [
          PERMISSIONS.masterData.orgManage,
          PERMISSIONS.masterData.territoryManage,
          PERMISSIONS.masterData.taxRead,
          PERMISSIONS.masterData.taxManage,
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
function SidebarLink({ collapsed, item, label }) {
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
          {!collapsed ? (
            <>
              <span className="truncate">{label}</span>
              {item.badge ? (
                <span
                  className="mono"
                  style={{
                    marginLeft: 'auto',
                    minWidth: 20,
                    height: 18,
                    padding: '0 6px',
                    borderRadius: 999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-amber)',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.22)',
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {item.badge}
                </span>
              ) : null}
            </>
          ) : null}
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
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
export default function Sidebar() {
  const { sidebarCollapsed, sidebarMobileOpen } = useUIStore()
  const { user, logout } = useAuthStore()
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingReturnApprovals, setPendingReturnApprovals] = useState(0)
  const displayName = user ? `${user.username}` : 'admin'
  const displayRole = user?.roles[0] ?? 'Administrator'

  const normalizedQuery = normalizeSearch(searchQuery)
  useEffect(() => {
    if (!userMeetsPermissionRequirement(user, PERMISSIONS.purchasing.returnNoteApprove)) {
      setPendingReturnApprovals(0)
      return
    }

    let isCurrent = true
    purchasingService
      .listReturnNotes({ page: 1, pageSize: 100, status: ReturnNoteStatus.Submitted })
      .then((result) => {
        if (isCurrent) setPendingReturnApprovals((result?.items || []).length)
      })
      .catch(() => {
        if (isCurrent) setPendingReturnApprovals(0)
      })

    return () => {
      isCurrent = false
    }
  }, [user])

  const badgeValues = { pendingReturnApprovals }
  const accessibleNavGroups = navGroups
    .map((group) => {
      const items = group.items
        .filter((item) => {
          if (item.isSubHeader) return true
          return userMeetsPermissionRequirement(user, item.permissions)
        })
        .map((item) => (item.badgeKey ? { ...item, badge: badgeValues[item.badgeKey] } : item))

      const cleanedItems = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.isSubHeader) {
          let hasFollowers = false
          for (let j = i + 1; j < items.length; j++) {
            if (items[j].isSubHeader) break
            hasFollowers = true
            break
          }
          if (hasFollowers) {
            cleanedItems.push(item)
          }
        } else {
          cleanedItems.push(item)
        }
      }

      return cleanedItems.length ? { ...group, items: cleanedItems } : null
    })
    .filter((group) => Boolean(group))
  const filteredNavGroups = normalizedQuery
    ? accessibleNavGroups
        .map((group) => {
          const items = group.items.filter((item) => {
            if (item.isSubHeader) return false
            const haystack = `${t(group.labelKey)} ${t(item.labelKey)}`.toLowerCase()
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
                {t('app.brandSubtitle')}
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
                placeholder={`${t('common.searchMenu')}...`}
                aria-label={t('common.searchMenu')}
                className={styles.searchInput}
              />
              {searchQuery ? (
                <button
                  type="button"
                  className={styles.searchClear}
                  aria-label={t('common.clearSearch')}
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
              <div key={group.labelKey} className={styles.navGroup}>
                {!sidebarCollapsed ? (
                  <p className={styles.navGroupLabel}>{t(group.labelKey)}</p>
                ) : null}
                <div className={styles.navList}>
                  {group.items.map((item, idx) =>
                    item.isSubHeader ? (
                      !sidebarCollapsed ? (
                        <div key={`sub-${idx}`} className={styles.subHeader}>
                          {t(item.labelKey)}
                        </div>
                      ) : null
                    ) : (
                      <SidebarLink
                        key={item.to}
                        collapsed={sidebarCollapsed}
                        item={item}
                        label={t(item.labelKey)}
                      />
                    )
                  )}
                </div>
              </div>
            ))
          ) : !sidebarCollapsed ? (
            <div className={styles.searchEmptyState}>{t('common.noMenuItemsFound')}</div>
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
              aria-label={t('common.logout')}
              onClick={() => void logout()}
            >
              <LogOut className={styles.logoutIcon} />
              {!sidebarCollapsed ? (
                <span className={styles.logoutLabel}>{t('common.logout')}</span>
              ) : null}
            </button>
          </div>
        </div>
      </aside>
    </Tooltip.Provider>
  )
}
