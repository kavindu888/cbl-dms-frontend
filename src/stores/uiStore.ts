import { create } from 'zustand'

type UIState = {
  sidebarCollapsed: boolean
  sidebarMobileOpen: boolean
  activeModule: string
  toggleSidebar: () => void
  setActiveModule: (module: string) => void
}

export const useUIStore = create<UIState>((set) => ({
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
