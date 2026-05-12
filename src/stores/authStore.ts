import { create } from 'zustand'

import { authService } from '@services/api/authService'
import { type Permission, Role, type UserDto } from '@/types'
import { clearAuthStorage, getAccessToken, getStoredUser, setStoredUser } from '@/utils'

type AuthState = {
  user: UserDto | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: UserDto) => void
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  hasRole: (role: string) => boolean
  hasPermission: (permission: string) => boolean
}

const initialUser = getStoredUser()

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialUser,
  isAuthenticated: Boolean(initialUser && getAccessToken()),
  isLoading: false,

  setUser: (user) => {
    setStoredUser(user)
    set({
      user,
      isAuthenticated: true,
    })
  },

  login: async (username, password) => {
    set({ isLoading: true })

    try {
      const session = await authService.login({ username, password })
      setStoredUser(session.user)
      set({
        user: session.user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: async () => {
    try {
      await authService.logout()
    } finally {
      clearAuthStorage()
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })

      if (typeof window !== 'undefined') {
        window.location.assign('/login')
      }
    }
  },

  refreshToken: async () => {
    set({ isLoading: true })

    try {
      const session = await authService.refreshToken()
      setStoredUser(session.user)
      set({
        user: session.user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      clearAuthStorage()
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
      throw error
    }
  },

  hasRole: (role) => {
    const userRoles = get().user?.roles ?? []
    return userRoles.includes(role as Role) || userRoles.includes(Role.Admin)
  },

  hasPermission: (permission) => {
    const permissions = get().user?.permissions ?? []
    return permissions.includes('*') || permissions.includes(permission as Permission)
  },
}))
