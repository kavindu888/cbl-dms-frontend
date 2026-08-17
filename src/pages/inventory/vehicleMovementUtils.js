export const VEHICLE_MOVEMENT_STATUSES = [
  { label: 'All statuses', value: '' },
  { label: 'Draft', value: 1 },
  { label: 'Applied', value: 2 },
  { label: 'Cancelled', value: 3 },
]

export const movementStatusLabel = (value) =>
  ({ 1: 'Draft', 2: 'Applied', 3: 'Cancelled' })[value] || String(value || 'Draft')

export const unloadingTypeLabel = (value) =>
  String(value).toLowerCase() === 'labelled' || Number(value) === 2 ? 'Labelled' : 'Normal'

export const returnReasonLabel = (value) =>
  ({ 3: 'Short Expiry', 4: 'Unwanted' })[value] ||
  { shortexpiry: 'Short Expiry', unwanted: 'Unwanted' }[String(value || '').toLowerCase()] ||
  '—'

export const formatNumber = (value, digits = 2) =>
  Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })

export const getQtyAvailable = (batch) =>
  Number(batch?.qtyAvailable ?? batch?.availableQty ?? batch?.available ?? 0)

export const getQtyReserved = (batch) =>
  Number(batch?.qtyReserved ?? batch?.reservedQty ?? batch?.reserved ?? 0)

export const getQtyFree = (batch) =>
  Number(batch?.sellableQty ?? Math.max(0, getQtyAvailable(batch) - getQtyReserved(batch)))

export const getUnitCost = (batch) => Number(batch?.unitCostSmallest ?? batch?.unitCost ?? 0)
export const getMrp = (batch) => Number(batch?.mrp ?? batch?.MRP ?? 0)

export const vehicleLabel = (vehicle) =>
  vehicle ? `${vehicle.vehicleCode || vehicle.code || vehicle.id} — ${vehicle.name}` : '—'

export const resultId = (result) =>
  typeof result === 'string' ? result : result?.id || result?.value || ''
