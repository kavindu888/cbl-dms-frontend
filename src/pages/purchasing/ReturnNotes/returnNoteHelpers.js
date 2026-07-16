import dayjs from 'dayjs'
import { ReturnNoteStatus } from '@/types/purchasing.types'

export const pageShellStyle = {
  height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  overflow: 'hidden',
}

export function today() {
  return dayjs().format('YYYY-MM-DD')
}

export function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function toIsoDate(value) {
  return value ? dayjs(value).toISOString() : null
}

export function normalizeText(value) {
  const text = String(value || '').trim()
  return text || null
}

export function sanitizeText(value) {
  return String(value || '').replace(/[^a-zA-Z0-9\s-]/g, '')
}

export function getLifoDate(record, fallbackDateField = 'returnDate') {
  return dayjs(record?.createdAt || record?.[fallbackDateField])
}

export function getItemPayload(line, form, entry, product) {
  return {
    productId: entry?.productId || line?.productId || product?.id,
    productSku: entry?.productSku || line?.productSku || product?.sku,
    productName: entry?.productName || line?.productName || product?.name,
    qtySmallestUnit: toNumber(form.qtySmallestUnit),
    unitCostSmallest: toNumber(form.unitCostSmallest),
    returnReason: normalizeText(form.returnReason),
    goodsReceiptLineId: line?.id || null,
    refInvoiceNo: normalizeText(form.refInvoiceNo),
    refInvoiceDate: toIsoDate(form.refInvoiceDate),
    batchNo: normalizeText(form.batchNo),
    expiryDate: toIsoDate(form.expiryDate),
    notes: normalizeText(form.notes),
    stockReturnEntryId: normalizeText(form.stockReturnEntryId),
  }
}

export function getEditableItemPayload(form) {
  return {
    qtySmallestUnit: toNumber(form.qtySmallestUnit),
    unitCostSmallest: toNumber(form.unitCostSmallest),
    returnReason: normalizeText(form.returnReason),
    refInvoiceNo: normalizeText(form.refInvoiceNo),
    refInvoiceDate: toIsoDate(form.refInvoiceDate),
    batchNo: normalizeText(form.batchNo),
    expiryDate: toIsoDate(form.expiryDate),
    notes: normalizeText(form.notes),
  }
}

export function supplierRefundTotal(note) {
  if (note?.totalSupplierRefund !== undefined && note?.totalSupplierRefund !== null) {
    return toNumber(note.totalSupplierRefund)
  }
  if (note?.supplierRefundTotal !== undefined && note?.supplierRefundTotal !== null) {
    return toNumber(note.supplierRefundTotal)
  }
  return (note?.items || []).reduce(
    (sum, item) => sum + toNumber(item.supplierRefundAmount ?? item.unitCostSmallest * item.qtySmallestUnit),
    0
  )
}

export function canEditReturnNote(note) {
  return !note || Number(note.status) === ReturnNoteStatus.Draft
}

export function emptyHeader() {
  return { supplierId: '', returnDate: today(), nbtAmount: '', notes: '' }
}

export function emptyItemForm() {
  return {
    goodsReceiptLineId: '',
    qtySmallestUnit: '',
    unitCostSmallest: '',
    returnReason: '',
    refInvoiceNo: '',
    refInvoiceDate: '',
    batchNo: '',
    expiryDate: '',
    notes: '',
    stockReturnEntryId: '',
  }
}

export function getEntryAvailableQty(entry) {
  return toNumber(entry?.availableQty ?? entry?.qtyAvailable ?? entry?.qty)
}

export function getEntryUnitCost(entry) {
  return toNumber(entry?.unitCostSmallest ?? entry?.unitCost)
}

export function getEntryMrp(entry) {
  return toNumber(entry?.mrp ?? entry?.MRP)
}

export function getEntrySource(entry) {
  const raw = entry?.sourceLabel ?? entry?.returnSourceLabel ?? entry?.returnSource ?? entry?.source ?? ''
  const source = String(raw)
  const normalized = source.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (normalized === 'salesreturn' || normalized === '1') return 'SALES RETURN'
  if (normalized === 'instorereturn' || normalized === '2') return 'IN-STORE'
  return source ? source.toUpperCase() : '-'
}

export function productOptionLabel(product) {
  const sku = String(product?.sku || '').trim()
  const name = String(product?.name || '').trim()
  if (!sku) return name || 'Unknown product'
  if (!name || name.toLowerCase() === sku.toLowerCase()) return sku
  return `${sku} - ${name}`
}
