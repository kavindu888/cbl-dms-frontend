import dayjs from 'dayjs'
import { Bell, Clock3, Menu, User, Settings, LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore'
import { useUIStore } from '@stores/uiStore'
import UserAvatarIcon from '@components/ui/UserAvatarIcon'
import { cn } from '@/utils'
import styles from './TopBar.module.css'
const initialNotifications = [
  {
    id: 1,
    title: '6 overdue accounts',
    description: 'Collections team needs attention today.',
    time: '12m ago',
    tone: 'danger',
  },
  {
    id: 2,
    title: '1 vehicle in maintenance',
    description: 'WP-MB-4521 is marked unavailable.',
    time: '28m ago',
    tone: 'warning',
  },
  {
    id: 3,
    title: 'Sales target updated',
    description: "Today's sales exceeded yesterday by 12%.",
    time: '1h ago',
    tone: 'success',
  },
]
function toReadableSegment(segment) {
  if (!segment) {
    return 'Dashboard'
  }
  const normalized = segment.replace(/[-_]/g, ' ')
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
}
function buildBreadcrumb(pathname) {
  const segments = pathname.split('/').filter(Boolean)
  if (!segments.length) {
    return ['Dashboard']
  }
  if (segments.length === 1 && segments[0] === 'inventory') {
    return ['Inventory', 'Overview']
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
  const { user, logout } = useAuthStore()
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
  const breadcrumb = buildBreadcrumb(location.pathname)
  const pageTitle = breadcrumb[breadcrumb.length - 1] || 'Dashboard'
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
            aria-label="Toggle sidebar"
            onClick={toggleSidebar}
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className={styles.breadcrumbWrap}>
            <div className={styles.breadcrumb}>
              <span className={styles.breadcrumbLabel}>{pageTitle}</span>
              {parentBreadcrumb.map((item, index) => (
                <span key={`${item}-${index}`} className={styles.breadcrumbSegment}>
                  <span className={styles.breadcrumbSeparator}>in</span>
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
              aria-label="Notifications"
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
                    <p className={styles.notificationsTitle}>Notifications</p>
                    <p className={styles.notificationsSubtitle}>
                      {unreadNotifications.length} new alert
                      {unreadNotifications.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.notificationsMarkRead}
                    onClick={markAllNotificationsRead}
                    disabled={unreadNotifications.length === 0}
                  >
                    {unreadNotifications.length > 0 ? 'Mark as read' : 'All read'}
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
                          <span className={styles.notificationItemTitle}>{item.title}</span>
                          <span className={styles.notificationItemDescription}>
                            {item.description}
                          </span>
                        </span>
                        <span className={styles.notificationTime}>{item.time}</span>
                      </button>
                    ))
                  ) : (
                    <div className={styles.notificationsEmpty}>
                      <p className={styles.notificationsEmptyTitle}>No new notifications</p>
                      <p className={styles.notificationsEmptyText}>You are all caught up.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
                    Profile
                  </Link>

                  <Link
                    to="/settings"
                    className={styles.dropdownItem}
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Settings className={styles.dropdownItemIcon} />
                    Settings
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
                    Logout
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
