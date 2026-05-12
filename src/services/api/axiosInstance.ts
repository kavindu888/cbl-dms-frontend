import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

import type { ApiError, ApiResponse, LoginResponse, NormalizedAppError } from '@/types'
import {
  clearAuthStorage,
  getAccessToken,
  setAccessToken,
  setRefreshToken,
  setStoredUser,
} from '@/utils'

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

const baseURL = import.meta.env.VITE_API_BASE_URL

function normalizeError(error: AxiosError<ApiResponse<unknown>>): NormalizedAppError {
  const statusCode = error.response?.status ?? 500
  const responseData = error.response?.data
  const errors: ApiError[] = responseData?.errors ?? []
  const message =
    errors[0]?.message ??
    responseData?.message ??
    error.message ??
    'An unexpected application error occurred.'

  return {
    name: 'AppError',
    message,
    statusCode,
    errors,
  }
}

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<LoginResponse>>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshResponse = await axios.post<ApiResponse<LoginResponse>>(
          `${baseURL}/auth/refresh-token`,
          undefined,
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        const refreshedSession = refreshResponse.data.data

        if (refreshedSession.accessToken) {
          setAccessToken(refreshedSession.accessToken)
        }

        if (refreshedSession.refreshToken) {
          setRefreshToken(refreshedSession.refreshToken)
        }

        if (refreshedSession.user) {
          setStoredUser(refreshedSession.user)
        }

        originalRequest.headers.Authorization = `Bearer ${refreshedSession.accessToken}`

        return axiosInstance(originalRequest)
      } catch (refreshError) {
        clearAuthStorage()
        if (typeof window !== 'undefined') {
          window.location.assign('/login')
        }
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(normalizeError(error))
  }
)

export default axiosInstance
