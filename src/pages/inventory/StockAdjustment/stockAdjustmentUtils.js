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

// Physical batches are tracked separately in inventory (one row per receipt), but that distinction
// means nothing to someone doing a stock adjustment — they think in terms of "the stuff worth this
// MRP". Collapse same-MRP batches into one pickable row; a group with only one member renders
// exactly as a normal batch row would. Members are ordered earliest-expiry-first so any later
// split (see handleAddLine) draws down the soonest-to-expire stock first.
export function groupBatchesByMrp(batches) {
  const groups = new Map()
  for (const batch of batches || []) {
    const key = getMrp(batch).toFixed(2)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(batch)
  }

  return Array.from(groups.entries()).map(([key, members]) => {
    const sortedMembers = [...members].sort((a, b) => {
      const aTime = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity
      const bTime = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity
      return aTime - bTime
    })
    const qtyAvailable = sortedMembers.reduce((sum, batch) => sum + getQtyAvailable(batch), 0)
    const costWeight = sortedMembers.reduce(
      (sum, batch) => sum + getQtyAvailable(batch) * getUnitCost(batch),
      0
    )
    const unitCost = qtyAvailable > 0 ? costWeight / qtyAvailable : getUnitCost(sortedMembers[0])
    const earliestExpiry = sortedMembers.find((batch) => batch.expiryDate)?.expiryDate || null

    return {
      id: `mrp-group-${key}`,
      mrp: Number(key),
      qtyAvailable,
      unitCost,
      expiryDate: earliestExpiry,
      batchNo:
        sortedMembers.length > 1 ? `${sortedMembers.length} batches` : sortedMembers[0]?.batchNo || '-',
      batchCount: sortedMembers.length,
      members: sortedMembers,
    }
  })
}
