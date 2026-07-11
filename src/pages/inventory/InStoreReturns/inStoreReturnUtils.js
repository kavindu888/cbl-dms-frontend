export const IN_STORE_RETURN_STATUSES = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 1 },
  { label: 'Submitted', value: 2 },
  { label: 'Approved', value: 3 },
  { label: 'Applied', value: 4 },
  { label: 'Cancelled', value: 5 },
]

export const IN_STORE_RETURN_REASONS = [
  { label: 'Damaged', value: 1 },
  { label: 'Expired', value: 2 },
  { label: 'ShortExpiry', value: 3 },
  { label: 'QualityIssue', value: 4 },
  { label: 'Other', value: 5 },
]

const statusLabels = {
  1: 'Draft',
  2: 'Submitted',
  3: 'Approved',
  4: 'Applied',
  5: 'Cancelled',
}

const reasonLabels = {
  1: 'Damaged',
  2: 'Expired',
  3: 'ShortExpiry',
  4: 'QualityIssue',
  5: 'Other',
}

export function statusLabel(value) {
  if (value === null || value === undefined || value === '') return 'Draft'
  return statusLabels[value] || String(value)
}

export function reasonLabel(value) {
  if (value === null || value === undefined || value === '') return '-'
  return reasonLabels[value] || String(value)
}

export function formatNumber(value, digits = 2) {
  return Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

export function getQtyAvailable(batch) {
  return Number(batch?.qtyAvailable ?? batch?.availableQty ?? batch?.available ?? 0)
}

export function getUnitCost(batch) {
  return Number(batch?.unitCostSmallest ?? batch?.unitCost ?? batch?.cost ?? batch?.costSmallest ?? 0)
}

export function getMrp(batch) {
  return Number(batch?.mrp ?? batch?.MRP ?? batch?.sellingPrice ?? 0)
}
