import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useUIStore } from '@stores/uiStore'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
function deriveModule(pathname) {
  const [firstSegment] = pathname.split('/').filter(Boolean)
  return firstSegment ?? 'dashboard'
}
export default function AppShell() {
  const { pathname } = useLocation()
  const { sidebarCollapsed, sidebarMobileOpen, setActiveModule } = useUIStore()
  const isProfilePage = pathname === '/profile'
  useEffect(() => {
    setActiveModule(deriveModule(pathname))
  }, [pathname, setActiveModule])
  return (
    <div
      className="relative flex h-[100dvh] flex-col overflow-hidden bg-bg-base text-text-primary lg:grid"
      style={{
        gridTemplateColumns: `${sidebarCollapsed ? '84px' : 'var(--spacing-layout-sidebar)'} 1fr`,
        gridTemplateRows: 'var(--spacing-layout-topbar) 1fr',
      }}
    >
      <div className="gradient-orb" />
      {sidebarMobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/55 lg:hidden"
          aria-label="Close navigation"
          onClick={() => useUIStore.setState({ sidebarMobileOpen: false })}
        />
      ) : null}
      <Sidebar />
      <TopBar />
      <main
        className={`relative min-h-0 flex-1 overflow-x-hidden ${
          isProfilePage ? 'overflow-hidden' : 'overflow-y-auto'
        } lg:row-start-2 lg:col-start-2`}
      >
        <div
          className="page-shell flex min-h-full flex-col"
          style={
            isProfilePage
              ? {
                  gap: 12,
                  minHeight: '100%',
                  padding: '14px 20px 18px',
                  overflow: 'hidden',
                }
              : undefined
          }
        >
          <Outlet />
        </div>
      </main>
    </div>
  )
}
