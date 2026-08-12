import api, { getOnce } from '@/lib/api'

function getValue(response, fallbackMessage = 'Request failed') {
  const apiResponse = response.data
  const isApiEnvelope = Object.prototype.hasOwnProperty.call(apiResponse ?? {}, 'success')
  const result = isApiEnvelope ? apiResponse?.data : apiResponse

  if (
    (isApiEnvelope && !apiResponse?.success) ||
    result?.isFailure ||
    result?.isSuccess === false
  ) {
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

const inStoreReturnStatusLabels = {
  1: 'Draft',
  2: 'Submitted',
  3: 'Approved',
  4: 'Applied',
  5: 'Cancelled',
}

const inStoreReturnReasonLabels = {
  1: 'Damaged',
  2: 'Expired',
  3: 'ShortExpiry',
  4: 'QualityIssue',
  5: 'Other',
}

const vehicleMovementStatusLabels = {
  1: 'Draft',
  2: 'Applied',
  3: 'Cancelled',
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

function formatInStoreReturnLine(line) {
  return {
    ...line,
    lineReason:
      line.lineReason === null || line.lineReason === undefined
        ? null
        : enumLabel(line.lineReason, inStoreReturnReasonLabels),
  }
}

function formatInStoreReturn(item) {
  if (!item) return item
  const lines = Array.isArray(item.lines) ? item.lines.map(formatInStoreReturnLine) : []
  return {
    ...item,
    status: enumLabel(item.status, inStoreReturnStatusLabels),
    reason: enumLabel(item.reason, inStoreReturnReasonLabels),
    lines,
    lineCount: item.lineCount ?? lines.length,
  }
}

function formatVehicleMovement(item) {
  if (!item) return item
  const lines = Array.isArray(item.lines) ? item.lines : []
  return {
    ...item,
    status: enumLabel(item.status, vehicleMovementStatusLabels),
    lines,
    lineCount: item.lineCount ?? lines.length,
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
  async listStockBatches(productId, params = {}) {
    const response = await getOnce(`/api/v1/inventory/stock/batches/${productId}`, { params })
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

    const items = asList(data).map((item) => ({
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

    return asList(data).map((item) => ({
      ...item,
      status: returnStockStatusLabels[item.status] || String(item.status),
      reason: returnStockReasonLabels[item.reason] || String(item.reason),
    }))
  },

  async getAvailableReturnStockByProduct(productId) {
    const response = await getOnce(`/api/v1/inventory/return-stock/available/${productId}`)
    const data = getValue(response, 'Unable to load available return stock.')

    const returnStockReasonLabels = {
      1: 'Expired',
      2: 'ShortExpiry',
      3: 'Damaged',
      4: 'Other',
      5: 'QualityIssue',
    }

    return asList(data).map((item) => ({
      ...item,
      availableQty: item.availableQty ?? item.qtyAvailable ?? item.qty ?? 0,
      unitCostSmallest: item.unitCostSmallest ?? item.unitCost ?? 0,
      mrp: item.mrp ?? item.MRP ?? 0,
      reason: returnStockReasonLabels[item.reason] || String(item.reason || ''),
      sourceLabel:
        item.sourceLabel || item.returnSourceLabel || item.returnSource || item.source || '',
    }))
  },

  // In-Store Returns
  async listInStoreReturns(params = {}) {
    const response = await getOnce('/api/v1/inventory/in-store-returns', { params })
    return asList(getValue(response, 'Unable to load in-store returns.')).map(formatInStoreReturn)
  },

  async getInStoreReturn(id) {
    const response = await getOnce(`/api/v1/inventory/in-store-returns/${id}`)
    return formatInStoreReturn(getValue(response, 'Unable to load in-store return.'))
  },

  async createInStoreReturn(payload) {
    const response = await api.post('/api/v1/inventory/in-store-returns', payload)
    return getValue(response, 'Unable to create in-store return.')
  },

  async addInStoreReturnLine(id, payload) {
    const response = await api.post(`/api/v1/inventory/in-store-returns/${id}/lines`, payload)
    return getValue(response, 'Unable to add in-store return line.')
  },

  async removeInStoreReturnLine(id, lineId) {
    const response = await api.delete(`/api/v1/inventory/in-store-returns/${id}/lines/${lineId}`)
    return getValue(response, 'Unable to remove in-store return line.')
  },

  async submitInStoreReturn(id) {
    const response = await api.post(`/api/v1/inventory/in-store-returns/${id}/submit`)
    return getValue(response, 'Unable to submit in-store return.')
  },

  async approveInStoreReturn(id, payload) {
    const response = await api.post(`/api/v1/inventory/in-store-returns/${id}/approve`, payload)
    return getValue(response, 'Unable to approve in-store return.')
  },

  async applyInStoreReturn(id) {
    const response = await api.post(`/api/v1/inventory/in-store-returns/${id}/apply`)
    return getValue(response, 'Unable to apply in-store return.')
  },

  async cancelInStoreReturn(id, payload) {
    const response = await api.post(`/api/v1/inventory/in-store-returns/${id}/cancel`, payload)
    return getValue(response, 'Unable to cancel in-store return.')
  },

  async listVehicles(params = {}) {
    const response = await getOnce('/api/v1/inventory/vehicles', { params })
    return asList(getValue(response, 'Unable to load vehicles.'))
  },

  async createVehicleLoading(payload) {
    const response = await api.post('/api/v1/inventory/vehicle-loadings', payload)
    return getValue(response, 'Unable to create vehicle loading.')
  },
  async addVehicleLoadingLine(id, payload) {
    const response = await api.post(`/api/v1/inventory/vehicle-loadings/${id}/lines`, payload)
    return getValue(response, 'Unable to add vehicle loading line.')
  },
  async removeVehicleLoadingLine(id, lineId) {
    const response = await api.delete(`/api/v1/inventory/vehicle-loadings/${id}/lines/${lineId}`)
    return getValue(response, 'Unable to remove vehicle loading line.')
  },
  async applyVehicleLoading(id) {
    const response = await api.post(`/api/v1/inventory/vehicle-loadings/${id}/apply`)
    return getValue(response, 'Unable to apply vehicle loading.')
  },
  async cancelVehicleLoading(id, payload) {
    const response = await api.post(`/api/v1/inventory/vehicle-loadings/${id}/cancel`, payload)
    return getValue(response, 'Unable to cancel vehicle loading.')
  },
  async getVehicleLoading(id) {
    const response = await getOnce(`/api/v1/inventory/vehicle-loadings/${id}`)
    return formatVehicleMovement(getValue(response, 'Unable to load vehicle loading.'))
  },
  async listVehicleLoadings(params = {}) {
    const response = await getOnce('/api/v1/inventory/vehicle-loadings', { params })
    return asList(getValue(response, 'Unable to load vehicle loadings.')).map(formatVehicleMovement)
  },

  async createVehicleUnloading(payload) {
    const response = await api.post('/api/v1/inventory/vehicle-unloadings', payload)
    return getValue(response, 'Unable to create vehicle unloading.')
  },
  async addVehicleUnloadingLine(id, payload) {
    const response = await api.post(`/api/v1/inventory/vehicle-unloadings/${id}/lines`, payload)
    return getValue(response, 'Unable to add vehicle unloading line.')
  },
  async removeVehicleUnloadingLine(id, lineId) {
    const response = await api.delete(`/api/v1/inventory/vehicle-unloadings/${id}/lines/${lineId}`)
    return getValue(response, 'Unable to remove vehicle unloading line.')
  },
  async applyVehicleUnloading(id) {
    const response = await api.post(`/api/v1/inventory/vehicle-unloadings/${id}/apply`)
    return getValue(response, 'Unable to apply vehicle unloading.')
  },
  async cancelVehicleUnloading(id, payload) {
    const response = await api.post(`/api/v1/inventory/vehicle-unloadings/${id}/cancel`, payload)
    return getValue(response, 'Unable to cancel vehicle unloading.')
  },
  async getVehicleUnloading(id) {
    const response = await getOnce(`/api/v1/inventory/vehicle-unloadings/${id}`)
    return formatVehicleMovement(getValue(response, 'Unable to load vehicle unloading.'))
  },
  async listVehicleUnloadings(params = {}) {
    const response = await getOnce('/api/v1/inventory/vehicle-unloadings', { params })
    return asList(getValue(response, 'Unable to load vehicle unloadings.')).map(
      formatVehicleMovement
    )
  },

  async getLastBatchCost(productId) {
    const response = await api.get(`/api/v1/inventory/stock/last-cost/${productId}`)
    return getValue(response, 'Unable to load last batch cost.')
  },

  async getLastPrices(productId) {
    const response = await api.get(`/api/v1/inventory/stock/last-prices/${productId}`)
    return getValue(response, 'Unable to load last prices.')
  },
}
