import {
  setAccessToken,
  setRefreshToken,
  setStoredUser,
  mapBackendUserToFrontendUser,
} from '@/utils'
import api from '@/lib/api'

const AUTH_API = {
  changePassword: '/change-password',
  login: '/login',
  logout: '/logout',
  refresh: '/refresh',
}

function getResultValue(response, fallbackMessage) {
  const result = response.data?.data

  if (!response.data?.success || result?.isFailure || !result?.isSuccess) {
    throw new Error(
      result?.validationErrors?.[0]?.message ||
        result?.errorMessage ||
        response.data?.errorMessage ||
        response.data?.message ||
        fallbackMessage
    )
  }

  return result.value
}

function createSession(authResult) {
  if (!authResult?.accessToken) {
    throw new Error('Login response did not include an access token.')
  }

  return {
    accessToken: authResult.accessToken,
    refreshToken: null,
    expiresIn: authResult.expiresIn,
    tokenType: authResult.tokenType,
    user: mapBackendUserToFrontendUser(authResult.user),
  }
}

function persistSession(session) {
  setAccessToken(session.accessToken)
  setRefreshToken(session.refreshToken)
  setStoredUser(session.user)
}

async function authenticate(endpoint, credentials, fallbackMessage) {
  const response = await api.post(endpoint, credentials, {
    skipAuthRefresh: endpoint === AUTH_API.login || endpoint === AUTH_API.refresh,
    withCredentials: true,
  })
  const authResult = getResultValue(response, fallbackMessage)
  const session = createSession(authResult)

  persistSession(session)
  return session
}

export const authService = {
  async login(credentials) {
    return authenticate(AUTH_API.login, credentials, 'Unable to sign in.')
  },

  async changePassword(payload) {
    const response = await api.post(
      AUTH_API.changePassword,
      {
        userId: payload.userId,
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
        confirmNewPassword: payload.confirmNewPassword,
      },
      { withCredentials: true }
    )

    return getResultValue(response, 'Unable to change password.')
  },

  async refreshToken() {
    return authenticate(AUTH_API.refresh, undefined, 'Token refresh failed.')
  },

  async logout() {
    try {
      await api.post(AUTH_API.logout, undefined, {
        skipAuthRefresh: true,
        withCredentials: true,
      })
    } catch (error) {
      // Swallows logout API failures to make client-side session cleanup deterministic
      console.warn('Backend logout failed or was unreachable:', error)
    }
  },
}
