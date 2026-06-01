import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '@services/api/authService'
import { Role } from '@/types'
import { userHasPermission } from '@/utils/permissions'
import { clearAuthStorage } from '@/utils'
export const useAuthStore = create()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshTokenValue: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      getUser: () => get().user,
      getAccessToken: () => get().accessToken,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: true,
          error: null,
        })
      },

      clearSession: (message = null) => {
        clearAuthStorage()
        set({
          user: null,
          accessToken: null,
          refreshTokenValue: null,
          isAuthenticated: false,
          isLoading: false,
          error: message,
        })
      },

      login: async (username, password) => {
        set({ isLoading: true, error: null })
        try {
          const session = await authService.login({ username, password })
          set({
            user: session.user,
            accessToken: session.accessToken,
            refreshTokenValue: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
          return session
        } catch (error) {
          const message = error?.message || 'Login failed'
          set({ isLoading: false, error: message })
          throw error
        }
      },

      logout: async () => {
        void authService.logout()
        get().clearSession()
        if (typeof window !== 'undefined') {
          window.location.assign('/login')
        }
      },

      refreshToken: async () => {
        try {
          const session = await authService.refreshToken()
          set({
            user: session.user,
            accessToken: session.accessToken,
            refreshTokenValue: null,
            isAuthenticated: true,
            error: null,
          })
          return session
        } catch (error) {
          const message = error?.message || 'Session expired'
          set({
            error: message,
          })
          throw error
        }
      },

      hasRole: (role) => {
        const userRoles = get().user?.roles ?? []
        return userRoles.includes(role) || userRoles.includes(Role.Admin)
      },

      hasPermission: (permission) => {
        return userHasPermission(get().user, permission)
      },

      hasAnyPermission: (permissions) => {
        return userHasPermission(get().user, permissions)
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'cbl-auth-store',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshTokenValue: state.refreshTokenValue,
        isAuthenticated: state.isAuthenticated,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...persistedState,
        isLoading: false,
        error: null,
      }),
    }
  )
)
