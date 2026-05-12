import type { UserDto } from '@/types/auth.types'

const fallbackTokenKey = 'cbl_access_token'
const fallbackRefreshKey = 'cbl_refresh_token'
const userStorageKey = 'cbl_current_user'

function getTokenKey() {
  return import.meta.env.VITE_TOKEN_KEY || fallbackTokenKey
}

function getRefreshKey() {
  return import.meta.env.VITE_REFRESH_KEY || fallbackRefreshKey
}

function isBrowser() {
  return typeof window !== 'undefined'
}

export function getAccessToken() {
  if (!isBrowser()) {
    return null
  }

  return window.localStorage.getItem(getTokenKey())
}

export function setAccessToken(token: string) {
  if (!isBrowser()) {
    return
  }

  window.localStorage.setItem(getTokenKey(), token)
}

export function getRefreshToken() {
  if (!isBrowser()) {
    return null
  }

  return window.localStorage.getItem(getRefreshKey())
}

export function setRefreshToken(token: string) {
  if (!isBrowser()) {
    return
  }

  window.localStorage.setItem(getRefreshKey(), token)
}

export function setStoredUser(user: UserDto | null) {
  if (!isBrowser()) {
    return
  }

  if (!user) {
    window.localStorage.removeItem(userStorageKey)
    return
  }

  window.localStorage.setItem(userStorageKey, JSON.stringify(user))
}

export function getStoredUser(): UserDto | null {
  if (!isBrowser()) {
    return null
  }

  const rawUser = window.localStorage.getItem(userStorageKey)

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser) as UserDto
  } catch {
    window.localStorage.removeItem(userStorageKey)
    return null
  }
}

export function clearAuthStorage() {
  if (!isBrowser()) {
    return
  }

  window.localStorage.removeItem(getTokenKey())
  window.localStorage.removeItem(getRefreshKey())
  window.localStorage.removeItem(userStorageKey)
}
