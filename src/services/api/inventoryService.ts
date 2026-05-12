import type { PaginatedResponse, PaginationParams, StockItemDto, StockMovementDto } from '@/types'

import axiosInstance from './axiosInstance'

export const inventoryService = {
  async listStock(params: Partial<PaginationParams> = {}) {
    const response = await axiosInstance.get<PaginatedResponse<StockItemDto>>('/inventory/stock', {
      params,
    })
    return response.data
  },

  async listMovements(params: Partial<PaginationParams> = {}) {
    const response = await axiosInstance.get<PaginatedResponse<StockMovementDto>>(
      '/inventory/movements',
      {
        params,
      }
    )
    return response.data
  },
}
