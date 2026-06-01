const storageKey = 'cbl-auth-store'
const accessTokenKey = import.meta.env.VITE_TOKEN_KEY || 'cbl_access_token'
const refreshTokenKey = import.meta.env.VITE_REFRESH_KEY || 'cbl_refresh_token'
const userKey = 'cbl_user'
function isBrowser() {
  return typeof window !== 'undefined'
}
function getPersistedState() {
  if (!isBrowser()) return null
  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed.state || null
  } catch {
    return null
  }
}
function setPersistedStateField(field, value) {
  if (!isBrowser()) return
  const raw = window.localStorage.getItem(storageKey)
  let state = {}
  let version = 0
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      state = parsed.state || {}
      version = parsed.version || 0
    } catch {}
  }
  state[field] = value
  window.localStorage.setItem(storageKey, JSON.stringify({ state, version }))
}
export function getAccessToken() {
  if (!isBrowser()) return null
  return window.localStorage.getItem(accessTokenKey) || getPersistedState()?.accessToken || null
}
export function setAccessToken(token) {
  if (isBrowser()) {
    if (token) {
      window.localStorage.setItem(accessTokenKey, token)
    } else {
      window.localStorage.removeItem(accessTokenKey)
    }
  }
  setPersistedStateField('accessToken', token)
  setPersistedStateField('isAuthenticated', true)
}
export function getRefreshToken() {
  if (!isBrowser()) return null
  return (
    window.localStorage.getItem(refreshTokenKey) || getPersistedState()?.refreshTokenValue || null
  )
}
export function setRefreshToken(token) {
  if (isBrowser()) {
    if (token) {
      window.localStorage.setItem(refreshTokenKey, token)
    } else {
      window.localStorage.removeItem(refreshTokenKey)
    }
  }
  setPersistedStateField('refreshTokenValue', token)
}
export function setStoredUser(user) {
  if (isBrowser()) {
    if (user) {
      window.localStorage.setItem(userKey, JSON.stringify(user))
    } else {
      window.localStorage.removeItem(userKey)
    }
  }
  setPersistedStateField('user', user)
}
export function getStoredUser() {
  if (isBrowser()) {
    const rawUser = window.localStorage.getItem(userKey)
    if (rawUser) {
      try {
        return JSON.parse(rawUser)
      } catch {}
    }
  }
  const state = getPersistedState()
  return state?.user || null
}
export function clearAuthStorage() {
  if (!isBrowser()) {
    return
  }
  window.localStorage.removeItem(storageKey)
  window.localStorage.removeItem(accessTokenKey)
  window.localStorage.removeItem(refreshTokenKey)
  window.localStorage.removeItem(userKey)
  // Manually expires and clears the custom client-side cookie to ensure local session cleanup
  document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict'
}
export function mapBackendUserToFrontendUser(backendUser) {
  if (!backendUser) return null
  return {
    id: backendUser.id,
    username: backendUser.username ?? backendUser.userName ?? '',
    email: backendUser.email ?? '',
    employeeCode: backendUser.employeeId ?? backendUser.employeeCode ?? '',
    phone: backendUser.phone ?? backendUser.phoneNumber ?? '',
    roles: backendUser.roles || [],
    permissions: backendUser.permissions || [],
    orgId: backendUser.organizationId || backendUser.orgId || '',
  }
}
export function mapBackendResponseToLoginResponse(responseValue) {
  if (!responseValue?.accessToken) {
    throw new Error('Login response did not include an access token.')
  }
  return {
    accessToken: responseValue.accessToken,
    refreshToken: responseValue.refreshToken ?? null,
    expiresIn: responseValue.expiresIn,
    tokenType: responseValue.tokenType,
    user: mapBackendUserToFrontendUser(responseValue.user),
  }
}
