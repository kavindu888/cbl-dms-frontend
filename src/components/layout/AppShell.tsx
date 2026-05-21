import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

import { useUIStore } from '@stores/uiStore'

import Sidebar from './Sidebar'
import TopBar from './TopBar'

function deriveModule(pathname: string) {
  const [firstSegment] = pathname.split('/').filter(Boolean)
  return firstSegment ?? 'dashboard'
}

export default function AppShell() {
  const location = useLocation()
  const { sidebarCollapsed, sidebarMobileOpen, setActiveModule } = useUIStore()

  useEffect(() => {
    setActiveModule(deriveModule(location.pathname))
  }, [location.pathname, setActiveModule])

  return (
    <div
      className="relative h-screen overflow-hidden bg-[var(--color-bg-base)] text-[var(--color-text-primary)] lg:grid"
      style={{
        gridTemplateColumns: `${sidebarCollapsed ? '76px' : 'var(--spacing-layout-sidebar)'} 1fr`,
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
      <main className="relative row-start-2 min-h-0 overflow-y-auto lg:col-start-2">
        <div className="page-shell">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
