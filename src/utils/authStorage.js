const storageKey = 'cbl-auth-store'
const accessTokenKey = import.meta.env.VITE_TOKEN_KEY || 'cbl_access_token'
const refreshTokenKey = import.meta.env.VITE_REFRESH_KEY || 'cbl_refresh_token'
const userKey = 'cbl_user'

function isBrowser() {
  return typeof window !== 'undefined'
}

function roleName(role) {
  if (!role) return ''
  if (typeof role === 'string') return role
  return role.name ?? role.Name ?? role.roleName ?? role.RoleName ?? ''
}

function permissionKey(permission) {
  if (!permission) return ''
  if (typeof permission === 'string') return permission

  const module = permission.module ?? permission.Module
  const resource = permission.resource ?? permission.Resource
  const action = permission.action ?? permission.Action

  return (
    permission.permissionKey ??
    permission.PermissionKey ??
    permission.key ??
    permission.Key ??
    (module && resource && action ? `${module}:${resource}:${action}` : '')
  )
}

function normalizeList(value, mapper) {
  if (!Array.isArray(value)) return []
  return value.map(mapper).filter(Boolean)
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
  document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict'
}

export function mapBackendUserToFrontendUser(backendUser) {
  if (!backendUser) return null
  return {
    id: backendUser.id ?? backendUser.Id,
    username: backendUser.username ?? backendUser.userName ?? backendUser.Username ?? '',
    email: backendUser.email ?? backendUser.Email ?? '',
    employeeCode: backendUser.employeeId ?? backendUser.employeeCode ?? backendUser.EmployeeId ?? '',
    phone: backendUser.phone ?? backendUser.phoneNumber ?? backendUser.Phone ?? '',
    roles: normalizeList(backendUser.roles ?? backendUser.Roles, roleName),
    permissions: normalizeList(backendUser.permissions ?? backendUser.Permissions, permissionKey),
    orgId: backendUser.organizationId ?? backendUser.orgId ?? backendUser.OrganizationId ?? '',
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
