export const STOCK_ADJUSTMENT_STATUSES = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Submitted', value: 'Submitted' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Applied', value: 'Applied' },
  { label: 'Cancelled', value: 'Cancelled' },
]

const statusLabels = {
  1: 'Draft',
  2: 'Submitted',
  3: 'Approved',
  4: 'Applied',
  5: 'Cancelled',
}

export const STATUS_COLORS = {
  Draft: 'bg-amber-500/10 text-amber-400 border border-amber-700/50',
  Submitted: 'bg-blue-500/10 text-blue-400 border border-blue-700/50',
  Approved: 'bg-purple-500/10 text-purple-400 border border-purple-700/50',
  Applied: 'bg-green-500/10 text-green-400 border border-green-700/50',
  Cancelled: 'bg-gray-700/30 text-gray-500 border border-gray-700/30',
}

export function statusLabel(value) {
  if (value === null || value === undefined || value === '') return 'Draft'
  return statusLabels[value] || String(value)
}

export function formatNumber(value, digits = 2) {
  return Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function getQtyAvailable(batch) {
  return Number(batch?.qtyAvailable ?? batch?.availableQty ?? batch?.available ?? 0)
}

export function getUnitCost(batch) {
  return Number(batch?.unitCostSmallest ?? batch?.unitCost ?? batch?.cost ?? 0)
}

export function getMrp(batch) {
  return Number(batch?.mrp ?? batch?.MRP ?? batch?.sellingPrice ?? 0)
}

export function makeTempId(prefix = 'stock-adjustment') {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random()}`
}
