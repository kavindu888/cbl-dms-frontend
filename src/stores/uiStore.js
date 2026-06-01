import { create } from 'zustand'
export const useUIStore = create((set) => ({
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  activeModule: 'dashboard',
  toggleSidebar: () =>
    set((state) => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024
      if (isMobile) {
        return { sidebarMobileOpen: !state.sidebarMobileOpen }
      }
      return { sidebarCollapsed: !state.sidebarCollapsed }
    }),
  setActiveModule: (module) =>
    set(() => ({
      activeModule: module,
    })),
}))
