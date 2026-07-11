import dayjs from 'dayjs'
import { PackageSearch, Plus, Save, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { inventoryService } from '@/services/api/inventoryService'
import { purchasingService } from '@/services/api/purchasingService'
import { GrnStatus } from '@/types/purchasing.types'
import { formatDate } from '@/utils'
import {
  emptyItemForm,
  formatMoney,
  getEditableItemPayload,
  getEntryAvailableQty,
  getEntrySource,
  getEntryUnitCost,
  getItemPayload,
  productOptionLabel,
  sanitizeText,
  toNumber,
} from '../returnNoteHelpers'

function Field({ label, children, required = false }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span className="form-label" style={{ marginBottom: 0 }}>
        {label}
        {required ? <span style={{ color: 'var(--color-danger)' }}> *</span> : null}
      </span>
      {children}
    </label>
  )
}

function OptionalDateInput({ value, onChange }) {
  const [isFocused, setIsFocused] = useState(false)
  return (
    <input
      type={isFocused || value ? 'date' : 'text'}
      className="form-input"
      value={value}
      placeholder="Optional date"
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function lineOptionLabel(line) {
  return `${line.productSku} - ${line.productName} (${line.qtySmallestUnit} ${line.smallestUomCode})`
}

export default function ReturnItemForm({
  supplierId,
  products = [],
  editingItem,
  isSaving = false,
  onAddLine,
  onUpdateLine,
  onCancelEdit,
}) {
  const [productSearch, setProductSearch] = useState('')
  const [productId, setProductId] = useState('')
  const [showManualForm, setShowManualForm] = useState(false)
  const [allAvailableEntries, setAllAvailableEntries] = useState([])
  const [entries, setEntries] = useState([])
  const [isLoadingEntries, setIsLoadingEntries] = useState(true)
  const [receipts, setReceipts] = useState([])
  const [receiptId, setReceiptId] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [form, setForm] = useState(emptyItemForm)

  const uniqueProducts = useMemo(() => {
    const seen = new Set()
    return allAvailableEntries
      .filter((entry) => {
        if (!entry.productId || seen.has(entry.productId)) return false
        seen.add(entry.productId)
        return true
      })
      .map((entry) => ({
        id: entry.productId,
        sku: entry.productSku || entry.productId,
        name: entry.productName || entry.productSku || entry.productId,
      }))
      .sort((a, b) => a.sku.localeCompare(b.sku))
  }, [allAvailableEntries])
  const selectedProduct = useMemo(
    () =>
      uniqueProducts.find((product) => product.id === productId) ||
      products.find((product) => product.id === productId) ||
      null,
    [productId, products, uniqueProducts]
  )
  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === form.stockReturnEntryId) || null,
    [entries, form.stockReturnEntryId]
  )
  const selectedLine = useMemo(
    () => (receipt?.lines || []).find((line) => line.id === form.goodsReceiptLineId) || null,
    [form.goodsReceiptLineId, receipt]
  )

  const hasSelectedStagedEntry = Boolean(selectedEntry)

  useEffect(() => {
    if (!editingItem) return
    setProductId(editingItem.productId || '')
    setShowManualForm(true)
    setEntries([])
    setReceiptId('')
    setReceipt(null)
    setForm({
      goodsReceiptLineId: editingItem.goodsReceiptLineId || '',
      qtySmallestUnit: String(editingItem.qtySmallestUnit ?? ''),
      unitCostSmallest: String(editingItem.unitCostSmallest ?? ''),
      returnReason: editingItem.returnReason || '',
      refInvoiceNo: editingItem.refInvoiceNo || '',
      refInvoiceDate: editingItem.refInvoiceDate ? dayjs(editingItem.refInvoiceDate).format('YYYY-MM-DD') : '',
      batchNo: editingItem.batchNo || '',
      expiryDate: editingItem.expiryDate ? dayjs(editingItem.expiryDate).format('YYYY-MM-DD') : '',
      notes: editingItem.notes || '',
      stockReturnEntryId: editingItem.stockReturnEntryId || '',
    })
  }, [editingItem])

  useEffect(() => {
    let isCurrent = true
    setIsLoadingEntries(true)
    inventoryService
      .listReturnStock({ status: 'Available' })
      .then((result) => {
        const items = result?.items || []
        if (isCurrent) setAllAvailableEntries(items)
      })
      .catch((error) => {
        if (isCurrent) {
          setAllAvailableEntries([])
          toast.error(`Failed to load return stock: ${error.message}`)
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingEntries(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    if (!supplierId) {
      setReceipts([])
      setReceiptId('')
      setReceipt(null)
      return
    }

    async function loadReceipts() {
      try {
        const result = await purchasingService.listGoodsReceipts({
          page: 1,
          pageSize: 100,
          supplierId,
          status: GrnStatus.Verified,
        })
        setReceipts(result?.items || [])
      } catch (error) {
        toast.error(`Unable to load verified GRNs: ${error.message}`)
        setReceipts([])
      }
    }
    loadReceipts()
  }, [supplierId])

  useEffect(() => {
    if (!receiptId) {
      setReceipt(null)
      return
    }
    purchasingService
      .getGoodsReceipt(receiptId)
      .then(setReceipt)
      .catch((error) => {
        toast.error(error.message)
        setReceipt(null)
      })
  }, [receiptId])

  function updateForm(field, value) {
    const sanitizedFields = ['returnReason', 'batchNo', 'refInvoiceNo', 'notes']
    setForm((current) => ({
      ...current,
      [field]: sanitizedFields.includes(field) ? sanitizeText(value) : value,
    }))
  }

  function resetForm() {
    setProductId('')
    setProductSearch('')
    setShowManualForm(false)
    setEntries([])
    setReceiptId('')
    setReceipt(null)
    setForm(emptyItemForm())
    onCancelEdit?.()
  }

  function clearStagedSelection() {
    setForm(emptyItemForm())
  }

  function handleProductSelect(nextProductId) {
    setProductId(nextProductId)
    setProductSearch('')
    setShowManualForm(false)
    setForm(emptyItemForm())
    setEntries(allAvailableEntries.filter((entry) => entry.productId === nextProductId))
  }

  function selectEntry(entry) {
    setShowManualForm(false)
    setForm({
      ...emptyItemForm(),
      stockReturnEntryId: entry.id,
      qtySmallestUnit: String(getEntryAvailableQty(entry)),
      unitCostSmallest: String(getEntryUnitCost(entry)),
      returnReason: entry.reason || '',
      batchNo: entry.batchNo || '',
    })
  }

  function validate() {
    if (!editingItem && !selectedEntry && !selectedLine) {
      return 'Select a staged return stock entry or a verified GRN item.'
    }
    if (toNumber(form.qtySmallestUnit) <= 0) return 'Return quantity must be greater than zero.'
    if (toNumber(form.qtySmallestUnit) !== Math.floor(toNumber(form.qtySmallestUnit))) {
      return 'Return quantity must be a whole smallest-unit quantity.'
    }
    if (toNumber(form.unitCostSmallest) < 0) return 'Unit cost cannot be negative.'
    if (selectedEntry && toNumber(form.qtySmallestUnit) > getEntryAvailableQty(selectedEntry)) {
      return `Return quantity cannot exceed staged quantity (${getEntryAvailableQty(selectedEntry)}).`
    }
    return ''
  }

  async function submitItem() {
    const error = validate()
    if (error) {
      toast.error(error)
      return
    }

    if (editingItem) {
      await onUpdateLine?.(editingItem.id, getEditableItemPayload(form))
    } else {
      await onAddLine?.(getItemPayload(selectedLine, form, selectedEntry, selectedProduct))
    }
    resetForm()
  }

  async function addSelectedStagedEntry() {
    if (!selectedEntry) return
    const availableQty = getEntryAvailableQty(selectedEntry)
    const qty = toNumber(form.qtySmallestUnit)

    if (qty < 1) {
      toast.error('Return quantity must be greater than zero.')
      return
    }
    if (qty > availableQty) {
      toast.error(`Maximum returnable quantity is ${availableQty}.`)
      return
    }

    try {
      await onAddLine?.(getItemPayload(null, form, selectedEntry, selectedProduct))
      clearStagedSelection()
    } catch {
      // The parent add handler owns API error toasts.
    }
  }

  return (
    <section
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--color-bg-surface)',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PackageSearch size={16} color="var(--color-teal)" />
          <strong style={{ fontSize: 14 }}>Add Return Item</strong>
        </div>
        {editingItem ? (
          <button type="button" className="icon-button" onClick={resetForm}>
            <X size={15} />
          </button>
        ) : null}
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Product" required>
          <select
            className="form-input"
            value={productId}
            onChange={(event) => handleProductSelect(event.target.value)}
            disabled={isLoadingEntries || editingItem}
            style={{ height: 42 }}
          >
            <option value="">
              {isLoadingEntries ? 'Loading return stock...' : 'Select a product to return...'}
            </option>
            {uniqueProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {productOptionLabel(product)}
              </option>
            ))}
          </select>
          {!isLoadingEntries && uniqueProducts.length === 0 ? (
            <span style={{ fontSize: 11, color: 'var(--color-amber)' }}>
              No products available in return stock.
            </span>
          ) : uniqueProducts.length > 0 ? (
            <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
              {uniqueProducts.length} product{uniqueProducts.length === 1 ? '' : 's'} available to return.
            </span>
          ) : null}
        </Field>

        {productId && !showManualForm && !hasSelectedStagedEntry ? (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ fontSize: 12 }}>Available Return Stock</strong>
              <button type="button" className="button-secondary" onClick={() => setShowManualForm(true)}>
                <Plus size={14} /> Add Manually
              </button>
            </div>
            {isLoadingEntries ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: 16 }}>
                Loading staged return stock...
              </div>
            ) : entries.length ? (
              <>
              <p style={{ fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 8 }}>
                {entries.length} staged entr{entries.length === 1 ? 'y' : 'ies'} available.
              </p>
              <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                <table className="data-table product-table-compact" style={{ minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Batch</th>
                      <th style={{ textAlign: 'right' }}>Available</th>
                      <th style={{ textAlign: 'right' }}>Unit Cost</th>
                      <th>Reason</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => {
                      const selected = entry.id === form.stockReturnEntryId
                      return (
                        <tr key={entry.id} style={{ background: selected ? 'color-mix(in srgb, var(--color-amber) 10%, transparent)' : undefined }}>
                          <td className="mono">{getEntrySource(entry)}</td>
                          <td className="mono">{entry.batchNo || '-'}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{getEntryAvailableQty(entry)}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{formatMoney(getEntryUnitCost(entry))}</td>
                          <td>{entry.reason || '-'}</td>
                          <td style={{ textAlign: 'right' }}>
                            {selected ? (
                              <span style={{ color: 'var(--color-teal)', fontSize: 12, fontWeight: 700 }}>
                                Selected
                              </span>
                            ) : (
                              <button type="button" className="button-secondary" onClick={() => selectEntry(entry)}>
                                Select
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              </>
            ) : (
              <div
                style={{
                  border: '1px dashed var(--color-border)',
                  borderRadius: 8,
                  padding: 16,
                  color: 'var(--color-text-muted)',
                  fontSize: 13,
                }}
              >
                No staged return stock for this product.
              </div>
            )}
          </section>
        ) : null}

        {selectedEntry ? (
          <section style={{ border: '1px solid color-mix(in srgb, var(--color-teal) 35%, var(--color-border))', borderRadius: 8, overflow: 'hidden' }}>
            <div
              style={{
                padding: '11px 14px',
                background: 'color-mix(in srgb, var(--color-teal) 10%, transparent)',
                borderBottom: '1px solid color-mix(in srgb, var(--color-teal) 25%, transparent)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 12,
                fontSize: 12,
              }}
            >
              <span className="mono" style={{ color: 'var(--color-teal)', fontWeight: 800 }}>
                {getEntrySource(selectedEntry)}
              </span>
              <span className="mono" style={{ color: 'var(--color-text-muted)' }}>
                Batch: {selectedEntry.batchNo || '-'}
              </span>
              <span>Available: <span className="mono">{getEntryAvailableQty(selectedEntry)}</span></span>
              <span>Unit Cost: <span className="mono">{formatMoney(getEntryUnitCost(selectedEntry))}</span></span>
              <span>Reason: {selectedEntry.reason || '-'}</span>
            </div>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) minmax(180px, 1fr) minmax(220px, 1.2fr)', gap: 12, alignItems: 'end' }}>
              <Field label="Qty to Return" required>
                <input
                  className="form-input mono"
                  type="number"
                  min="1"
                  max={getEntryAvailableQty(selectedEntry)}
                  value={form.qtySmallestUnit}
                  onChange={(event) => {
                    const value = Math.max(1, Math.min(toNumber(event.target.value), getEntryAvailableQty(selectedEntry)))
                    updateForm('qtySmallestUnit', String(value))
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>Max: {getEntryAvailableQty(selectedEntry)}</span>
              </Field>
              <Field label="Supplier Refund">
                <p className="mono" style={{ marginTop: 9, color: 'var(--color-teal)', fontWeight: 800 }}>
                  {formatMoney(toNumber(form.qtySmallestUnit) * toNumber(form.unitCostSmallest))}
                </p>
                <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                  {toNumber(form.qtySmallestUnit)} x {formatMoney(form.unitCostSmallest)}
                </span>
              </Field>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="button-secondary" onClick={clearStagedSelection} disabled={isSaving}>
                  Clear
                </button>
                <button type="button" className="button-primary" onClick={addSelectedStagedEntry} disabled={isSaving}>
                  <Plus size={16} /> Add to Return
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {!hasSelectedStagedEntry ? (
          <div>
            {!editingItem ? (
              <button
                type="button"
                onClick={() => setShowManualForm((current) => !current)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {showManualForm ? 'Hide' : '+ Add Manually'} <span style={{ color: 'var(--color-text-dim)' }}>(for items not in return stock)</span>
              </button>
            ) : null}
          {(showManualForm || editingItem) ? (
          <section style={{ marginTop: 10, border: '1px solid var(--color-border)', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong style={{ fontSize: 12 }}>Manual Entry</strong>
              {!editingItem ? (
                <button type="button" className="button-secondary" onClick={() => setShowManualForm(false)}>
                  Back to staged entries
                </button>
              ) : null}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Verified GRN">
                <select className="form-input" value={receiptId} onChange={(event) => setReceiptId(event.target.value)}>
                  <option value="">Select verified GRN</option>
                  {receipts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.grNumber} - {formatDate(item.receiptDate || item.createdAt)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="GRN Item">
                <select className="form-input" value={form.goodsReceiptLineId} onChange={(event) => {
                  const nextLine = (receipt?.lines || []).find((line) => line.id === event.target.value)
                  setForm((current) => ({
                    ...current,
                    goodsReceiptLineId: event.target.value,
                    unitCostSmallest: String(nextLine?.unitCostSmallest ?? current.unitCostSmallest),
                    batchNo: nextLine?.batchNo || current.batchNo,
                    qtySmallestUnit: current.qtySmallestUnit || '1',
                  }))
                }}>
                  <option value="">Select item</option>
                  {(receipt?.lines || []).map((line) => (
                    <option key={line.id} value={line.id}>
                      {lineOptionLabel(line)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>
          ) : null}
          </div>
        ) : null}

        {(!hasSelectedStagedEntry && (showManualForm || editingItem)) ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
              <Field label="Qty" required>
                <input className="form-input mono" type="number" min="1" value={form.qtySmallestUnit} onChange={(event) => updateForm('qtySmallestUnit', event.target.value)} readOnly={Boolean(selectedEntry)} />
              </Field>
              <Field label="Unit Cost" required>
                <input className="form-input mono" type="number" min="0" step="0.01" value={form.unitCostSmallest} onChange={(event) => updateForm('unitCostSmallest', event.target.value)} readOnly={Boolean(selectedEntry)} />
              </Field>
              <Field label="Reason">
                <input className="form-input" value={form.returnReason} onChange={(event) => updateForm('returnReason', event.target.value)} />
              </Field>
              <Field label="Batch">
                <input className="form-input mono" value={form.batchNo} onChange={(event) => updateForm('batchNo', event.target.value)} readOnly={Boolean(selectedEntry)} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 180px 1fr', gap: 10 }}>
              <Field label="Expiry">
                <OptionalDateInput value={form.expiryDate} onChange={(value) => updateForm('expiryDate', value)} />
              </Field>
              <Field label="Ref Invoice Date">
                <OptionalDateInput value={form.refInvoiceDate} onChange={(value) => updateForm('refInvoiceDate', value)} />
              </Field>
              <Field label="Ref Invoice No">
                <input className="form-input" value={form.refInvoiceNo} onChange={(event) => updateForm('refInvoiceNo', event.target.value)} />
              </Field>
            </div>
            <Field label="Item Notes">
              <input className="form-input" value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="button-secondary" onClick={resetForm} disabled={isSaving}>
                Clear
              </button>
              <button type="button" className="button-primary" onClick={submitItem} disabled={isSaving}>
                <Save size={16} /> {editingItem ? 'Update Item' : 'Add to Return'}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
