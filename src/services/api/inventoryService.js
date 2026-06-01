import { getOnce } from '@/lib/api'
export const inventoryService = {
  async listStock(params = {}) {
    const response = await getOnce('/api/v1/inventory/stock', {
      params,
    })
    return response.data
  },
  async listMovements(params = {}) {
    const response = await getOnce('/api/v1/inventory/movements', {
      params,
    })
    return response.data
  },
}
