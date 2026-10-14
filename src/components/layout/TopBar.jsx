import dayjs from 'dayjs'
import { Bell, Clock3, Languages, Menu, User, Settings, LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore'
import { useUIStore } from '@stores/uiStore'
import UserAvatarIcon from '@components/ui/UserAvatarIcon'
import { cn } from '@/utils'
import { useLanguage } from '@/i18n'
import styles from './TopBar.module.css'
const initialNotifications = [
  {
    id: 1,
    titleKey: 'notifications.overdueAccountsTitle',
    descriptionKey: 'notifications.overdueAccountsDescription',
    timeKey: 'notifications.twelveMinutesAgo',
    tone: 'danger',
  },
  {
    id: 2,
    titleKey: 'notifications.vehicleMaintenanceTitle',
    descriptionKey: 'notifications.vehicleMaintenanceDescription',
    timeKey: 'notifications.twentyEightMinutesAgo',
    tone: 'warning',
  },
  {
    id: 3,
    titleKey: 'notifications.salesTargetTitle',
    descriptionKey: 'notifications.salesTargetDescription',
    timeKey: 'notifications.oneHourAgo',
    tone: 'success',
  },
]
const routeSegmentLabels = {
  admin: 'nav.admin',
  collections: 'nav.collections',
  dashboard: 'common.dashboard',
  fleet: 'nav.fleet',
  inventory: 'nav.inventory',
  master: 'nav.master',
  purchasing: 'nav.purchasing',
  reports: 'nav.reports',
  sales: 'nav.sales',
  settings: 'nav.settings',
  users: 'nav.users',
  profile: 'common.profile',
  invoices: 'nav.invoices',
  customers: 'nav.customer',
  orders: 'nav.purchasingOrder',
  'return-notes': 'nav.returnNotes',
  'customer-credit': 'nav.customerCredit',
  'customer-groups': 'nav.customerGroups',
  'stuck-reservations': 'nav.stuckReservations',
  sessions: 'nav.dailySessions',
  cheques: 'nav.cheques',
  banks: 'nav.banksBranches',
  collectors: 'nav.collectors',
  salesmen: 'nav.salesmen',
  'opening-stock': 'nav.openingStock',
  'in-store-returns': 'nav.inStoreReturns',
  'vehicle-loadings': 'nav.vehicleLoading',
  'vehicle-unloadings': 'nav.vehicleUnloading',
  'stock-adjustments': 'nav.stockAdjustments',
  batches: 'nav.stockBatches',
  locations: 'nav.stockLocations',
  products: 'nav.product',
  categories: 'nav.category',
  'category-discounts': 'nav.categoryDiscounts',
  'units-of-measure': 'nav.uom',
  'sales-routes': 'nav.salesRoutes',
  'delivery-runs': 'nav.deliveryRuns',
  'place-order': 'nav.newPurchaseOrder',
  approvals: 'nav.poApproveReject',
  approved: 'nav.approvedPurchaseOrders',
  'all-orders': 'nav.purchaseOrdersList',
  suppliers: 'nav.supplierSettlement',
  'goods-receipt-entry': 'nav.newGoodsReceipt',
  'goods-receipts': 'nav.goodsReceiptList',
  'grn-approve-reject': 'nav.grnApproveReject',
  settlement: 'nav.settlement',
  'credit-aging': 'nav.creditAgingReport',
  discount: 'nav.discountReport',
  'daily-collection': 'nav.dailyCollectionReport',
  'month-end': 'nav.monthEndReport',
}
function toReadableSegment(segment, t) {
  if (!segment) {
    return t('common.dashboard')
  }
  if (routeSegmentLabels[segment]) {
    return t(routeSegmentLabels[segment])
  }
  const normalized = segment.replace(/[-_]/g, ' ')
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
}
function buildBreadcrumb(pathname, t) {
  const segments = pathname.split('/').filter(Boolean)
  if (!segments.length) {
    return [t('common.dashboard')]
  }
  if (segments.length === 1 && segments[0] === 'inventory') {
    return [t('nav.inventory'), t('common.overview')]
  }
  return segments.map((segment, index) => {
    if (segment === 'stock') {
      return segments[0] === 'reports' ? t('nav.stockReport') : t('nav.stockOverview')
    }
    if (segment === 'new') {
      return t('common.new')
    }
    if (index > 0 && /^[a-z0-9-]+$/i.test(segment) && segment.includes('-')) {
      return toReadableSegment(segment, t)
    }
    if (index > 0 && /^[a-z0-9]+$/i.test(segment) && /\d/.test(segment)) {
      return t('common.detail')
    }
    return toReadableSegment(segment, t)
  })
}
export default function TopBar() {
  const location = useLocation()
  const { toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()
  const { language, languages, setLanguage, t } = useLanguage()
  const [now, setNow] = useState(() => dayjs())
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('dms-read-notifications') || '[]')
    } catch {
      return []
    }
  })
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const notificationsRef = useRef(null)
  const profileRef = useRef(null)
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(dayjs())
    }, 60000)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [])
  const breadcrumb = buildBreadcrumb(location.pathname, t)
  const pageTitle = breadcrumb[breadcrumb.length - 1] || t('common.dashboard')
  const parentBreadcrumb = breadcrumb.slice(0, -1)
  const unreadNotifications = initialNotifications.filter(
    (item) => !readNotificationIds.includes(item.id)
  )

  function persistReadNotifications(ids) {
    setReadNotificationIds(ids)
    window.localStorage.setItem('dms-read-notifications', JSON.stringify(ids))
  }

  function markNotificationRead(id) {
    persistReadNotifications([...new Set([...readNotificationIds, id])])
    setIsNotificationsOpen(false)
  }

  function markAllNotificationsRead() {
    persistReadNotifications(initialNotifications.map((item) => item.id))
  }

  const displayName = user?.username ?? 'admin'
  const displayRole = user?.roles[0] ?? 'Admin'
  return (
    <header className={styles.topBar}>
      <div className={styles.topBarInner}>
        <div className={styles.leftGroup}>
          <button
            type="button"
            className="icon-button shrink-0 lg:hidden"
            aria-label={t('common.toggleSidebar')}
            onClick={toggleSidebar}
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className={styles.breadcrumbWrap}>
            <div className={styles.breadcrumb}>
              <span className={styles.breadcrumbLabel}>{pageTitle}</span>
              {parentBreadcrumb.map((item, index) => (
                <span key={`${item}-${index}`} className={styles.breadcrumbSegment}>
                  <span className={styles.breadcrumbSeparator}>{t('common.in')}</span>
                  <span className={cn(styles.breadcrumbItem, styles.breadcrumbItemInactive)}>
                    {item}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.rightGroup}>
          <div className={styles.clockChip}>
            <Clock3 className={styles.clockIcon} />
            <span className={styles.clockText}>{now.format('DD MMM YYYY, h:mm A')}</span>
          </div>

          <div className={styles.notificationWrap} ref={notificationsRef}>
            <button
              type="button"
              className={cn(
                styles.notificationButton,
                isNotificationsOpen
                  ? styles.notificationButtonOpen
                  : styles.notificationButtonClosed
              )}
              aria-label={t('notifications.label')}
              aria-expanded={isNotificationsOpen}
              onClick={() => {
                setIsNotificationsOpen((current) => !current)
                setIsProfileOpen(false)
              }}
            >
              <Bell className={styles.notificationIcon} />
              {unreadNotifications.length > 0 && (
                <span className={styles.notificationBadge}>{unreadNotifications.length}</span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className={styles.notificationsDropdown} role="menu">
                <div className={styles.notificationsHeader}>
                  <div>
                    <p className={styles.notificationsTitle}>{t('notifications.title')}</p>
                    <p className={styles.notificationsSubtitle}>
                      {t(
                        unreadNotifications.length === 1
                          ? 'notifications.newAlert'
                          : 'notifications.newAlerts',
                        { count: unreadNotifications.length }
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.notificationsMarkRead}
                    onClick={markAllNotificationsRead}
                    disabled={unreadNotifications.length === 0}
                  >
                    {unreadNotifications.length > 0 ? t('common.markAsRead') : t('common.allRead')}
                  </button>
                </div>

                <div className={styles.notificationsList}>
                  {unreadNotifications.length > 0 ? (
                    unreadNotifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={styles.notificationItem}
                        onClick={() => markNotificationRead(item.id)}
                      >
                        <span
                          className={cn(
                            styles.notificationDot,
                            item.tone === 'danger' && styles.notificationDotDanger,
                            item.tone === 'warning' && styles.notificationDotWarning,
                            item.tone === 'success' && styles.notificationDotSuccess
                          )}
                        />
                        <span className={styles.notificationBody}>
                          <span className={styles.notificationItemTitle}>{t(item.titleKey)}</span>
                          <span className={styles.notificationItemDescription}>
                            {t(item.descriptionKey)}
                          </span>
                        </span>
                        <span className={styles.notificationTime}>{t(item.timeKey)}</span>
                      </button>
                    ))
                  ) : (
                    <div className={styles.notificationsEmpty}>
                      <p className={styles.notificationsEmptyTitle}>
                        {t('notifications.emptyTitle')}
                      </p>
                      <p className={styles.notificationsEmptyText}>
                        {t('notifications.emptyText')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <label className={styles.languageSelectWrap} aria-label={t('common.language')}>
            <Languages className={styles.languageIcon} />
            <select
              className={styles.languageSelect}
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {languages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.shortLabel}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.profileWrap} ref={profileRef}>
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen((current) => !current)
                setIsNotificationsOpen(false)
              }}
              className={cn(
                styles.profileButton,
                isProfileOpen ? styles.profileButtonOpen : styles.profileButtonClosed
              )}
            >
              <div className={styles.profileMeta}>
                <p className={styles.profileName}>{displayName}</p>
                <p className={styles.profileRole}>{displayRole}</p>
              </div>
              <div className={styles.profileAvatar}>
                <UserAvatarIcon size={22} />
              </div>
            </button>

            {isProfileOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownMobileHeader}>
                  <p className="text-sm font-semibold text-text-primary">{displayName}</p>
                  <p className="mt-0.5 text-xs text-text-dim">{displayRole}</p>
                </div>
                <div className={styles.dropdownMobileDivider} />

                <div className={styles.dropdownList}>
                  <Link
                    to="/profile"
                    className={styles.dropdownItem}
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <User className={styles.dropdownItemIcon} />
                    {t('common.profile')}
                  </Link>

                  <Link
                    to="/settings"
                    className={styles.dropdownItem}
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Settings className={styles.dropdownItemIcon} />
                    {t('common.settings')}
                  </Link>

                  <div className={styles.dropdownDivider} />

                  <button
                    type="button"
                    className={cn(styles.dropdownItem, styles.dropdownItemDanger)}
                    onClick={() => {
                      setIsProfileOpen(false)
                      logout()
                    }}
                  >
                    <LogOut className={styles.dropdownItemIcon} />
                    {t('common.logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
