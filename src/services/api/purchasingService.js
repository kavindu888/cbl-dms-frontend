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

  // Purchase Order GET, POST, PUT, DELETE, and other actions
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

  // Goods Receipt Notes (GRN)
  async listGoodsReceipts(params = {}) {
    const response = await getOnce('/api/v1/goods-receipts', { params })
    return getValue(response, 'Unable to load goods receipts.')
  },

  async getGoodsReceipt(id) {
    const response = await getOnce(`/api/v1/goods-receipts/${id}`)
    return getValue(response, 'Unable to load the goods receipt.')
  },

  async createGoodsReceipt(payload) {
    const response = await api.post('/api/v1/goods-receipts', payload)
    return getValue(response, 'Unable to create the goods receipt.')
  },

  async updateGoodsReceiptHeader(id, payload) {
    const response = await api.patch(`/api/v1/goods-receipts/${id}/header`, payload)
    return getValue(response, 'Unable to update the goods receipt header.')
  },

  async addGoodsReceiptLine(id, payload) {
    const response = await api.post(`/api/v1/goods-receipts/${id}/lines`, payload)
    return getValue(response, 'Unable to add the goods receipt line.')
  },

  async updateGoodsReceiptLine(id, lineId, payload) {
    const response = await api.put(`/api/v1/goods-receipts/${id}/lines/${lineId}`, payload)
    return getValue(response, 'Unable to update the goods receipt line.')
  },

  async removeGoodsReceiptLine(id, lineId) {
    const response = await api.delete(`/api/v1/goods-receipts/${id}/lines/${lineId}`)
    return getValue(response, 'Unable to remove the goods receipt line.')
  },

  async submitGoodsReceipt(id) {
    const response = await api.post(`/api/v1/goods-receipts/${id}/submit`)
    return getValue(response, 'Unable to submit the goods receipt.')
  },

  async verifyGoodsReceipt(id) {
    const response = await api.post(`/api/v1/goods-receipts/${id}/verify`)
    return getValue(response, 'Unable to verify the goods receipt.')
  },

  async adminAdjustGoodsReceipt(id, adjustmentAmount, reason) {
    const response = await api.put(`/api/v1/goods-receipts/${id}/adjustment`, {
      adjustmentAmount,
      reason,
    })
    return getValue(response, 'Unable to update the goods receipt adjustment.')
  },

  async rejectGoodsReceipt(id, reason) {
    const response = await api.post(`/api/v1/goods-receipts/${id}/reject`, { reason })
    return getValue(response, 'Unable to reject the goods receipt.')
  },

  // Return Notes
  // Return Notes List
  async listReturnNotes(params = {}) {
    const response = await getOnce('/api/v1/return-notes', { params })
    return getValue(response, 'Unable to load return notes.')
  },

  // Return Note GET
  async getReturnNote(id) {
    const response = await getOnce(`/api/v1/return-notes/${id}`)
    return getValue(response, 'Unable to load the return note.')
  },

  // Return Note Outstanding Credits List
  async listOutstandingReturnCredits(params = {}) {
    const response = await getOnce('/api/v1/return-notes/outstanding-credits', { params })
    return getValue(response, 'Unable to load outstanding return credits.')
  },

  // Return Note Create
  async createReturnNote(payload) {
    const response = await api.post('/api/v1/return-notes', payload)
    return getValue(response, 'Unable to create the return note.')
  },

  async updateReturnNoteHeader(id, payload) {
    const response = await api.patch(`/api/v1/return-notes/${id}/header`, payload)
    return getValue(response, 'Unable to update the return note header.')
  },

  async addReturnNoteItem(id, payload) {
    const response = await api.post(`/api/v1/return-notes/${id}/items`, payload)
    return getValue(response, 'Unable to add the return note item.')
  },

  async updateReturnNoteItem(id, itemId, payload) {
    const response = await api.put(`/api/v1/return-notes/${id}/items/${itemId}`, payload)
    return getValue(response, 'Unable to update the return note item.')
  },

  async removeReturnNoteItem(id, itemId) {
    const response = await api.delete(`/api/v1/return-notes/${id}/items/${itemId}`)
    return getValue(response, 'Unable to remove the return note item.')
  },

  async submitReturnNote(id) {
    const response = await api.post(`/api/v1/return-notes/${id}/submit`)
    return getValue(response, 'Unable to submit the return note.')
  },

  async approveReturnNote(id) {
    const response = await api.post(`/api/v1/return-notes/${id}/approve`)
    return getValue(response, 'Unable to approve the return note.')
  },

  async rejectReturnNote(id, reason) {
    const response = await api.post(`/api/v1/return-notes/${id}/reject`, { reason })
    return getValue(response, 'Unable to reject the return note.')
  },

  async completeReturnNote(id, payload) {
    const response = await api.post(`/api/v1/return-notes/${id}/complete`, payload)
    return getValue(response, 'Unable to complete the return note.')
  },

  async cancelReturnNote(id, reason) {
    const response = await api.post(`/api/v1/return-notes/${id}/cancel`, { reason })
    return getValue(response, 'Unable to cancel the return note.')
  },
  // Suppliers API
  // Suppliers List
  async listSuppliers(params = {}) {
    const response = await getOnce('/api/v1/suppliers', { params })
    return getValue(response, 'Unable to load suppliers.')
  },

  // Suppliers Create
  async createSupplier(payload) {
    const response = await api.post('/api/v1/suppliers', payload)
    return getValue(response, 'Unable to create supplier.')
  },

  // Suppliers Update
  async updateSupplier(id, payload) {
    const response = await api.put(`/api/v1/suppliers`, payload, { params: { id } })
    return getValue(response, 'Unable to update supplier.')
  },
}
