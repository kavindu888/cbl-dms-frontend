import type { PaginatedResponse, PaginationParams, RoleDto, UserListItemDto } from '@/types'

import axiosInstance from './axiosInstance'

export const usersService = {
  async listUsers(params: Partial<PaginationParams> = {}) {
    const response = await axiosInstance.get<PaginatedResponse<UserListItemDto>>('/users', {
      params,
    })
    return response.data
  },

  async listRoles() {
    const response = await axiosInstance.get<RoleDto[]>('/users/roles')
    return response.data
  },
}
