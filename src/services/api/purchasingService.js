import api, { getOnce } from '@/lib/api'

function getResult(response, fallbackMessage) {
  const result = response.data?.data

  if (!response.data?.success || result?.isFailure) {
    throw new Error(result?.errorMessage || response.data?.errorMessage || fallbackMessage)
  }

  return result?.value ?? result
}

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

  // Supplier Listing, Creation, and Update
  // Supplier Listing
  async listSuppliers(params = {}) {
    const response = await getOnce('/api/v1/suppliers', { params })
    return getResult(response, 'Unable to load suppliers.')
  },

  // Supplier Creation
  async createSupplier(payload) {
    const response = await api.post('/api/v1/suppliers', payload)
    return getResult(response, 'Unable to create supplier.')
  },

  // Supplier Update
  async updateSupplier(id, payload) {
    const response = await api.put('/api/v1/suppliers', payload, {
      params: { id },
    })
    return getResult(response, 'Unable to update supplier.')
  },
}
