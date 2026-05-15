import axios from 'axios'

import { createMockLoginResponse } from '@data/mockUsers'
import type { ApiResponse, LoginRequest, LoginResponse, RegisterRequest, UserDto } from '@/types'
import { clearAuthStorage, setAccessToken, setRefreshToken, setStoredUser } from '@/utils'

import axiosInstance from './axiosInstance'

function persistSession(session: LoginResponse) {
  setAccessToken(session.accessToken)
  if (session.refreshToken) {
    setRefreshToken(session.refreshToken)
  }
  setStoredUser(session.user)
}

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await axiosInstance.post<ApiResponse<LoginResponse>>(
        '/auth/login',
        credentials
      )
      persistSession(response.data.data)
      return response.data.data
    } catch (error) {
      // The response interceptor normalizes AxiosErrors into NormalizedAppError before
      // they reach here, so axios.isAxiosError() is always false at this point.
      // Detect a network-level failure (no server response) by checking statusCode 500
      // or a raw AxiosError in case the interceptor is bypassed.
      const isNetworkFailure =
        (axios.isAxiosError(error) && !error.response) ||
        (typeof error === 'object' &&
          error !== null &&
          'statusCode' in error &&
          (error as { statusCode: number }).statusCode === 500 &&
          'errors' in error &&
          Array.isArray((error as { errors: unknown[] }).errors) &&
          (error as { errors: unknown[] }).errors.length === 0)

      if (import.meta.env.DEV && isNetworkFailure) {
        const mockSession = createMockLoginResponse(credentials.username)
        persistSession(mockSession)
        return mockSession
      }

      throw error
    }
  },

  async register(payload: RegisterRequest): Promise<UserDto> {
    const response = await axiosInstance.post<ApiResponse<UserDto>>('/auth/register', payload)
    return response.data.data
  },

  async refreshToken(): Promise<LoginResponse> {
    const response = await axiosInstance.post<ApiResponse<LoginResponse>>('/auth/refresh-token')
    persistSession(response.data.data)
    return response.data.data
  },

  async logout() {
    try {
      await axiosInstance.post('/auth/logout')
    } finally {
      clearAuthStorage()
    }
  },
}
