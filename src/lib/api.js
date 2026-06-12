import axios from 'axios'
import { getAccessToken } from '@/utils'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://staging.ceyservice.store'
const parsedBaseUrl = new URL(configuredBaseUrl)
const useDevProxy = import.meta.env.DEV && import.meta.env.VITE_USE_API_PROXY !== 'false'

export const apiPrefix = parsedBaseUrl.pathname.replace(/\/$/, '')

const api = axios.create({
  baseURL: useDevProxy ? undefined : parsedBaseUrl.origin,
  timeout: 20000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

const pendingGetRequests = new Map()
let refreshRequest = null

function getRequestKey(config) {
  const params = config.params ? JSON.stringify(config.params) : ''
  return `${config.method || 'get'}:${config.url || ''}:${params}`
}

function isAuthEndpoint(url = '') {
  return ['/login', '/refresh', '/logout'].some((endpoint) => url.endsWith(endpoint))
}

function isRefreshAuthFailure(error) {
  return [400, 401, 403].includes(error.response?.status)
}

function isNetworkFailure(error) {
  return !error.response
}

function getFirstValidationMessage(errors) {
  if (Array.isArray(errors)) {
    const firstError = errors[0]
    return typeof firstError === 'string' ? firstError : firstError?.message
  }

  if (errors && typeof errors === 'object') {
    const firstValue = Object.values(errors)[0]
    if (Array.isArray(firstValue)) return firstValue[0]
    if (typeof firstValue === 'string') return firstValue
  }

  return null
}

async function refreshAccessToken() {
  if (!refreshRequest) {
    const { useAuthStore } = await import('@stores/authStore')
    refreshRequest = useAuthStore
      .getState()
      .refreshToken()
      .finally(() => {
        refreshRequest = null
      })
  }

  return refreshRequest
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type')
    } else {
      delete config.headers['Content-Type']
      delete config.headers['content-type']
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (!originalRequest) {
      return Promise.reject(error)
    }

    const canAttemptRefresh =
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.skipAuthRefresh &&
      !isAuthEndpoint(originalRequest.url)

    if (canAttemptRefresh) {
      const isAuthPage =
        typeof window !== 'undefined' &&
        (window.location.pathname === '/login' || window.location.pathname === '/register')

      if (!isAuthPage) {
        originalRequest._retry = true
        try {
          const session = await refreshAccessToken()

          if (session?.accessToken) {
            originalRequest.headers.Authorization = `Bearer ${session.accessToken}`
            return api(originalRequest)
          }
        } catch (refreshError) {
          if (isRefreshAuthFailure(refreshError)) {
            const { useAuthStore } = await import('@stores/authStore')
            useAuthStore.getState().clearSession('Session expired. Please sign in again.')
          }
          return Promise.reject(refreshError)
        }
      }
    }

    const responseData = error.response?.data
    const result = responseData?.data
    const validationErrors = result?.validationErrors || responseData?.errors || []
    const validationMessage = getFirstValidationMessage(validationErrors)
    const permissionMessage =
      error.response?.status === 403 ? 'You do not have permission to perform this action.' : null
    const message =
      permissionMessage ||
      validationMessage ||
      result?.errorMessage ||
      responseData?.errorMessage ||
      responseData?.message ||
      (isNetworkFailure(error)
        ? 'Network error. Please check your connection and try again.'
        : null) ||
      error.message ||
      'Request failed'

    return Promise.reject(new Error(message))
  }
)

export function apiUrl(path) {
  return `${apiPrefix}/${path.replace(/^\//, '')}`
}

export function getOnce(url, config = {}) {
  const requestConfig = { ...config, method: 'get', url }
  const key = getRequestKey(requestConfig)

  if (pendingGetRequests.has(key)) {
    return pendingGetRequests.get(key)
  }

  const request = api.get(url, config).finally(() => {
    pendingGetRequests.delete(key)
  })

  pendingGetRequests.set(key, request)
  return request
}

export default api
