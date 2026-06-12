import api, { getOnce } from '@/lib/api'

function getValue(response, fallbackMessage) {
  const apiResponse = response.data
  const result = apiResponse?.data

  if (!apiResponse?.success || result?.isFailure) {
    const validationMessage = result?.validationErrors?.[0]?.message
    throw new Error(
      validationMessage || result?.errorMessage || apiResponse?.errorMessage || fallbackMessage
    )
  }

  return result?.value ?? result
}

export const purchasingService = {
  async listPurchaseOrders(params = {}) {
    const response = await getOnce('/api/v1/purchase-orders', { params })
    return getValue(response, 'Unable to load purchase orders.')
  },

  async listAllPurchaseOrders() {
    const allItems = []
    const pageSize = 100
    let page = 1

    while (page <= 100) {
      const result = await this.listPurchaseOrders({ page, pageSize })
      const items = result?.items || []
      allItems.push(...items)

      if (items.length < pageSize) break
      page += 1
    }

    return allItems
  },

 
  // Get a single purchase order by ID
  async getPurchaseOrder(id) {
    const response = await getOnce(`/api/v1/purchase-orders/${id}`)
    return getValue(response, 'Unable to load the purchase order.')
  },

  // Create a new purchase order
  async createPurchaseOrder(payload) {
    const response = await api.post('/api/v1/purchase-orders', payload)
    return getValue(response, 'Unable to create the purchase order.')
  },

  // Update an existing purchase order
  async updatePurchaseOrder(id, payload) {
    const response = await api.put(`/api/v1/purchase-orders/${id}`, payload)
    return getValue(response, 'Unable to update the purchase order.')
  },

  // Delete a purchase order
  async addPurchaseOrderLine(id, payload) {
    const response = await api.post(`/api/v1/purchase-orders/${id}/lines`, payload)
    return getValue(response, 'Unable to add the purchase order line.')
  },

  // Update a purchase order line
  async updatePurchaseOrderLine(id, lineId, payload) {
    const response = await api.put(`/api/v1/purchase-orders/${id}/lines/${lineId}`, payload)
    return getValue(response, 'Unable to update the purchase order line.')
  },

  // Remove a purchase order line 
  async removePurchaseOrderLine(id, lineId) {
    const response = await api.delete(`/api/v1/purchase-orders/${id}/lines/${lineId}`)
    return getValue(response, 'Unable to remove the purchase order line.')
  },

  // Submit a purchase order for approval
  async submitPurchaseOrder(id) {
    const response = await api.post(`/api/v1/purchase-orders/${id}/submit`)
    return getValue(response, 'Unable to submit the purchase order.')
  },

  // Approve a purchase order
  async approvePurchaseOrder(id) {
    const response = await api.post(`/api/v1/purchase-orders/${id}/approve`)
    return getValue(response, 'Unable to approve the purchase order.')
  },

  // Reject a purchase order with a reason
  async rejectPurchaseOrder(id, reason) {
    const response = await api.post(`/api/v1/purchase-orders/${id}/reject`, { reason })
    return getValue(response, 'Unable to reject the purchase order.')
  },

  // Cancel a purchase order with a reason
  async cancelPurchaseOrder(id, reason) {
    const response = await api.post(`/api/v1/purchase-orders/${id}/cancel`, { reason })
    return getValue(response, 'Unable to cancel the purchase order.')
  },

}
