import { getOnce } from '@/lib/api'
export const purchasingService = {
  async listPurchaseOrders(params = {}) {
    const response = await getOnce('/api/v1/purchasing/orders', {
      params,
    })
    return response.data
  },
  async getPurchaseOrder(id) {
    const response = await getOnce(`/api/v1/purchasing/orders/${id}`)
    return response.data
  },
}
