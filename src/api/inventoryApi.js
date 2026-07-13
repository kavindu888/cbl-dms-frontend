import api from '@/lib/api'

const inventoryAxios = {
  get: (url, config) => api.get(`/api/v1/inventory${url}`, config),
  post: (url, data, config) => api.post(`/api/v1/inventory${url}`, data, config),
  put: (url, data, config) => api.put(`/api/v1/inventory${url}`, data, config),
  delete: (url, config) => api.delete(`/api/v1/inventory${url}`, config),
}

// Return Stock
export const flagStockForReturn = (data) => inventoryAxios.post('/return-stock/flag', data)
export const cancelReturnFlag = (id) => inventoryAxios.post(`/return-stock/${id}/cancel`)
export const listReturnStock = (params) => inventoryAxios.get('/return-stock', { params })
export const getReturnStockByProduct = (productId) => inventoryAxios.get(`/return-stock/by-product/${productId}`)
export const getAvailableReturnStockByProduct = (productId) => inventoryAxios.get(`/return-stock/available/${productId}`)

// In-Store Returns
export const createInStoreReturn = (data) => inventoryAxios.post('/in-store-returns', data)
export const addInStoreReturnLine = (id, data) => inventoryAxios.post(`/in-store-returns/${id}/lines`, data)
export const removeInStoreReturnLine = (id, lineId) => inventoryAxios.delete(`/in-store-returns/${id}/lines/${lineId}`)
export const submitInStoreReturn = (id) => inventoryAxios.post(`/in-store-returns/${id}/submit`)
export const approveInStoreReturn = (id) => inventoryAxios.post(`/in-store-returns/${id}/approve`)
export const applyInStoreReturn = (id) => inventoryAxios.post(`/in-store-returns/${id}/apply`)
export const cancelInStoreReturn = (id, data) => inventoryAxios.post(`/in-store-returns/${id}/cancel`, data)
export const getInStoreReturn = (id) => inventoryAxios.get(`/in-store-returns/${id}`)
export const listInStoreReturns = (params) => inventoryAxios.get('/in-store-returns', { params })

// Stock
export const getStockLevels = (params) => inventoryAxios.get('/stock/levels', { params })
export const getStockAvailability = (productId) => inventoryAxios.get(`/stock/availability/${productId}`)
export const getStockBatches = (productId) => inventoryAxios.get(`/stock/batches/${productId}`)
export const getExpiringBatches = (withinDays = 30) => inventoryAxios.get('/stock/batches/expiring', { params: { withinDays } })
export const getStockMovements = (params) => inventoryAxios.get('/stock/movements', { params })
export const getLastBatchCost = (productId) => inventoryAxios.get(`/stock/last-cost/${productId}`)
export const getLastPrices = (productId) => inventoryAxios.get(`/stock/last-prices/${productId}`)
