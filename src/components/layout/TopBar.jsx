import dayjs from 'dayjs'
import { Bell, Clock3, Menu, User, Settings, LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore'
import { useUIStore } from '@stores/uiStore'
import UserAvatarIcon from '@components/ui/UserAvatarIcon'
import { cn } from '@/utils'
import styles from './TopBar.module.css'
const notifications = [
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
    }, 1000)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [])
  const breadcrumb = buildBreadcrumb(location.pathname)
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
              <span className={styles.breadcrumbLabel}>Navigation</span>
              {breadcrumb.map((item, index) => (
                <span key={`${item}-${index}`} className={styles.breadcrumbSegment}>
                  <span className={styles.breadcrumbSeparator}>/</span>
                  <span
                    className={cn(
                      styles.breadcrumbItem,
                      index === breadcrumb.length - 1
                        ? styles.breadcrumbItemActive
                        : styles.breadcrumbItemInactive
                    )}
                  >
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
            <span className={styles.clockText}>{now.format('ddd, DD MMM YYYY HH:mm:ss')}</span>
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
              <span className={styles.notificationBadge}>{notifications.length}</span>
            </button>

            {isNotificationsOpen && (
              <div className={styles.notificationsDropdown}>
                <div className={styles.notificationsHeader}>
                  <div>
                    <p className={styles.notificationsTitle}>Notifications</p>
                    <p className={styles.notificationsSubtitle}>
                      {notifications.length} new alerts
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.notificationsMarkRead}
                    onClick={() => setIsNotificationsOpen(false)}
                  >
                    Mark as read
                  </button>
                </div>

                <div className={styles.notificationsList}>
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={styles.notificationItem}
                      onClick={() => setIsNotificationsOpen(false)}
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
                  ))}
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
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {displayName}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-dim)]">{displayRole}</p>
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
