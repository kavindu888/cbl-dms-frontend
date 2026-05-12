import type { PaginatedResponse, PaginationParams, RouteLogDto, VehicleDto } from '@/types'

import axiosInstance from './axiosInstance'

export const fleetService = {
  async listVehicles(params: Partial<PaginationParams> = {}) {
    const response = await axiosInstance.get<PaginatedResponse<VehicleDto>>('/fleet/vehicles', {
      params,
    })
    return response.data
  },

  async listRouteLogs(params: Partial<PaginationParams> = {}) {
    const response = await axiosInstance.get<PaginatedResponse<RouteLogDto>>('/fleet/routes', {
      params,
    })
    return response.data
  },
}
