import type { PaginatedResponse, PaginationParams, PurchaseOrderDto } from '@/types'

import axiosInstance from './axiosInstance'

export const purchasingService = {
  async listPurchaseOrders(params: Partial<PaginationParams> = {}) {
    const response = await axiosInstance.get<PaginatedResponse<PurchaseOrderDto>>(
      '/purchasing/orders',
      {
        params,
      }
    )
    return response.data
  },

  async getPurchaseOrder(id: string) {
    const response = await axiosInstance.get<PurchaseOrderDto>(`/purchasing/orders/${id}`)
    return response.data
  },
}
