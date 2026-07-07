import api, { getOnce } from '@/lib/api'

function getValue(response, fallbackMessage = 'Request failed') {
  const apiResponse = response.data
  const result = apiResponse?.data

  if (!apiResponse?.success || result?.isFailure) {
    const validationMessage = result?.validationErrors?.[0]?.message
    throw new Error(
      validationMessage || result?.errorMessage || apiResponse?.errorMessage || fallbackMessage
    )
  }

  return result?.value ?? result ?? apiResponse
}

function asList(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.items)) return value.items
  return []
}

const transferStatusLabels = {
  1: 'Draft',
  2: 'Dispatched',
  3: 'Received',
  4: 'Cancelled',
}

const stocktakeStatusLabels = {
  1: 'Draft',
  2: 'Counting',
  3: 'Completed',
  4: 'Cancelled',
}

const movementTypeLabels = {
  1: 'Grn Receipt',
  2: 'Sales Issue',
  3: 'Sales Return',
  4: 'Purchase Return',
  5: 'Adjustment In',
  6: 'Adjustment Out',
  7: 'Transfer Out',
  8: 'Transfer In',
  9: 'Stocktake Adjust',
}

const batchStatusLabels = {
  1: 'Active',
  2: 'Depleted',
  3: 'Expired',
  4: 'Quarantined',
}

function enumLabel(value, labels) {
  if (value === null || value === undefined || value === '') return 'Unknown'
  return labels[value] || String(value)
}

function formatBatch(item) {
  return {
    ...item,
    status: enumLabel(item.status, batchStatusLabels),
  }
}

function formatMovement(item) {
  return {
    ...item,
    movementType: enumLabel(item.movementType, movementTypeLabels),
  }
}

function formatTransfer(item) {
  return {
    ...item,
    status: enumLabel(item.status, transferStatusLabels),
  }
}

function formatStocktake(item) {
  return {
    ...item,
    status: enumLabel(item.status, stocktakeStatusLabels),
  }
}

//Inventory service for interacting with the inventory API endpoints
//Inventory List 
export const inventoryService = {
  async listStockLevels(params = {}) {
    const response = await getOnce('/api/v1/inventory/stock/levels', { params })
    return asList(getValue(response, 'Unable to load stock levels.'))
  },

  //Inventory Stock Availability
  async getStockAvailability(productId) {
    const response = await getOnce(`/api/v1/inventory/stock/availability/${productId}`)
    return getValue(response, 'Unable to load stock availability.')
  },

  //Inventory Stock Batches
  async listStockBatches(productId) {
    const response = await getOnce(`/api/v1/inventory/stock/batches/${productId}`)
    return asList(getValue(response, 'Unable to load stock batches.')).map(formatBatch)
  },

  //Inventory Expiring Batches
  async listExpiringBatches(params = {}) {
    const response = await getOnce('/api/v1/inventory/stock/batches/expiring', { params })
    return asList(getValue(response, 'Unable to load expiring batches.')).map(formatBatch)
  },

  //Inventory Stock Movements
  async listStockMovements(params = {}) {
    const response = await getOnce('/api/v1/inventory/stock/movements', { params })
    return asList(getValue(response, 'Unable to load stock movements.')).map(formatMovement)
  },

  //Inventory Stock Locations
  async listStockLocations(params = {}) {
    const response = await getOnce('/api/inventory/stock-locations', { params })
    const page = getValue(response, 'Unable to load stock locations.')
    return {
      ...page,
      items: asList(page).map((item) => ({
        ...item,
        status: item.isActive ? 'Active' : 'Inactive',
      })),
    }
  },

  //Inventory Stock Location
  async getStockLocation(id) {
    const response = await getOnce(`/api/inventory/stock-locations/${id}`)
    const item = getValue(response, 'Unable to load stock location.')
    return { ...item, status: item.isActive ? 'Active' : 'Inactive' }
  },

  //Inventory Stock Location Management
  async createStockLocation(payload) {
    const response = await api.post('/api/inventory/stock-locations', payload)
    return getValue(response, 'Unable to create stock location.')
  },

  //Inventory Stock Location Update
  async updateStockLocation(id, payload) {
    const response = await api.put(`/api/inventory/stock-locations/${id}`, payload)
    return getValue(response, 'Unable to update stock location.')
  },

  //Inventory Stock Location Activation
  async activateStockLocation(id) {
    const response = await api.post(`/api/inventory/stock-locations/${id}/activate`)
    return getValue(response, 'Unable to activate stock location.')
  },

  //Inventory Stock Location Deactivation
  async deactivateStockLocation(id) {
    const response = await api.post(`/api/inventory/stock-locations/${id}/deactivate`)
    return getValue(response, 'Unable to deactivate stock location.')
  },

  //Inventory Stock Transfers
  async listStockTransfers(params = {}) {
    const response = await getOnce('/api/v1/inventory/stock-transfers', { params })
    return asList(getValue(response, 'Unable to load stock transfers.')).map(formatTransfer)
  },

  //Inventory Stock Transfer
  async getStockTransfer(id) {
    const response = await getOnce(`/api/v1/inventory/stock-transfers/${id}`)
    return formatTransfer(getValue(response, 'Unable to load stock transfer.'))
  },

  //Inventory Stock Transfer Management
  async createStockTransfer(payload) {
    const response = await api.post('/api/v1/inventory/stock-transfers', payload)
    return getValue(response, 'Unable to create stock transfer.')
  },

  //
  async addStockTransferLine(id, payload) {
    const response = await api.post(`/api/v1/inventory/stock-transfers/${id}/lines`, payload)
    return getValue(response, 'Unable to add stock transfer line.')
  },

  //Inventory Stock Transfer Line Removal
  async removeStockTransferLine(id, lineId) {
    const response = await api.delete(`/api/v1/inventory/stock-transfers/${id}/lines/${lineId}`)
    return getValue(response, 'Unable to remove stock transfer line.')
  },

  async dispatchStockTransfer(id) {
    const response = await api.post(`/api/v1/inventory/stock-transfers/${id}/dispatch`)
    return getValue(response, 'Unable to dispatch stock transfer.')
  },

  async receiveStockTransfer(id) {
    const response = await api.post(`/api/v1/inventory/stock-transfers/${id}/receive`)
    return getValue(response, 'Unable to receive stock transfer.')
  },

  async cancelStockTransfer(id) {
    const response = await api.post(`/api/v1/inventory/stock-transfers/${id}/cancel`)
    return getValue(response, 'Unable to cancel stock transfer.')
  },

  async listStocktakes(params = {}) {
    const response = await getOnce('/api/v1/inventory/stocktakes', { params })
    return asList(getValue(response, 'Unable to load stocktakes.')).map(formatStocktake)
  },

  async getStocktake(id) {
    const response = await getOnce(`/api/v1/inventory/stocktakes/${id}`)
    return formatStocktake(getValue(response, 'Unable to load stocktake.'))
  },

  async createStocktake(payload) {
    const response = await api.post('/api/v1/inventory/stocktakes', payload)
    return getValue(response, 'Unable to create stocktake.')
  },

  async addStocktakeLine(id, payload) {
    const response = await api.post(`/api/v1/inventory/stocktakes/${id}/lines`, payload)
    return getValue(response, 'Unable to add stocktake line.')
  },

  async removeStocktakeLine(id, lineId) {
    const response = await api.delete(`/api/v1/inventory/stocktakes/${id}/lines/${lineId}`)
    return getValue(response, 'Unable to remove stocktake line.')
  },

  async startStocktake(id) {
    const response = await api.post(`/api/v1/inventory/stocktakes/${id}/start`)
    return getValue(response, 'Unable to start stocktake.')
  },

  async recordStocktakeCount(id, lineId, countedQty) {
    const response = await api.put(`/api/v1/inventory/stocktakes/${id}/lines/${lineId}/count`, {
      countedQty,
    })
    return getValue(response, 'Unable to record stocktake count.')
  },

  async completeStocktake(id) {
    const response = await api.post(`/api/v1/inventory/stocktakes/${id}/complete`)
    return getValue(response, 'Unable to complete stocktake.')
  },

  async cancelStocktake(id) {
    const response = await api.post(`/api/v1/inventory/stocktakes/${id}/cancel`)
    return getValue(response, 'Unable to cancel stocktake.')
  },

  // Return Stock (Supplier Returns Staging)
  async flagStockForReturn(payload) {
    const response = await api.post('/api/v1/inventory/return-stock/flag', payload)
    return getValue(response, 'Unable to flag stock for supplier return.')
  },

  async cancelReturnFlag(id) {
    const response = await api.post(`/api/v1/inventory/return-stock/${id}/cancel`)
    return getValue(response, 'Unable to cancel return stock flag.')
  },

  async listReturnStock(params = {}) {
    const response = await getOnce('/api/v1/inventory/return-stock', { params })
    const data = getValue(response, 'Unable to load return stock staging.')
    
    const returnStockStatusLabels = {
      1: 'Available',
      2: 'Claimed',
      3: 'Returned',
      4: 'Cancelled',
    }

    const returnStockReasonLabels = {
      1: 'Expired',
      2: 'ShortExpiry',
      3: 'Damaged',
      4: 'Other',
    }

    const items = asList(data).map(item => ({
      ...item,
      status: returnStockStatusLabels[item.status] || String(item.status),
      reason: returnStockReasonLabels[item.reason] || String(item.reason),
    }))
    
    return {
      items,
      totalItems: data.totalItems ?? items.length,
      totalPages: data.totalPages ?? 1,
      page: data.page ?? 1,
      pageSize: data.pageSize ?? items.length,
    }
  },

  async getReturnStockByProduct(productId) {
    const response = await getOnce(`/api/v1/inventory/return-stock/by-product/${productId}`)
    const data = getValue(response, 'Unable to load return stock by product.')
    
    const returnStockStatusLabels = {
      1: 'Available',
      2: 'Claimed',
      3: 'Returned',
      4: 'Cancelled',
    }

    const returnStockReasonLabels = {
      1: 'Expired',
      2: 'ShortExpiry',
      3: 'Damaged',
      4: 'Other',
    }

    return asList(data).map(item => ({
      ...item,
      status: returnStockStatusLabels[item.status] || String(item.status),
      reason: returnStockReasonLabels[item.reason] || String(item.reason),
    }))
  },
}
