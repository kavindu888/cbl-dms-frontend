import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  LoaderCircle,
  PackageSearch,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  useAddStockAdjustmentLine,
  useCreateStockAdjustment,
  useRemoveStockAdjustmentLine,
  useSubmitAndApplyStockAdjustment,
} from '@/hooks/useStockAdjustment'
import { inventoryService } from '@/services/api/inventoryService'
import { masterService } from '@/services/api/masterService'
import { formatDate } from '@/utils/formatDate'
import {
  formatNumber,
  getMrp,
  getQtyAvailable,
  getUnitCost,
  makeTempId,
} from './stockAdjustmentUtils'

const ADJUSTMENT_REASONS = [
  'Physical Count Correction',
  'Damaged Stock Write-off',
  'Expired Stock Write-off',
  'System Error Correction',
  'Opening Stock Adjustment',
  'Other',
]

const readOnlyChipStyle = {
  alignItems: 'center',
  backgroundColor: 'var(--color-bg-hover)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  display: 'flex',
  minHeight: 38,
}

function typeColor(type) {
  return type === 'AdjustmentIn' ? '#4ade80' : 'var(--color-danger)'
}

function typeButtonColor(type) {
  return type === 'AdjustmentIn' ? '#15803d' : '#b91c1c'
}

export default function StockAdjustmentCreatePage() {
  const navigate = useNavigate()
  const createMutation = useCreateStockAdjustment()
  const submitApplyMutation = useSubmitAndApplyStockAdjustment()

  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [products, setProducts] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [batches, setBatches] = useState([])
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [adjustmentType, setAdjustmentType] = useState('AdjustmentIn')
  const [qty, setQty] = useState('')
  const [lineNotes, setLineNotes] = useState('')
  const [adjustmentId, setAdjustmentId] = useState('')
  const [adjustmentLines, setAdjustmentLines] = useState([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isLoadingBatches, setIsLoadingBatches] = useState(false)

  const addLineMutation = useAddStockAdjustmentLine(adjustmentId)
  const removeLineMutation = useRemoveStockAdjustmentLine(adjustmentId)

  useEffect(() => {
    let active = true

    async function loadProducts() {
      setIsLoadingProducts(true)
      try {
        const firstPage = await masterService.listProducts({ page: 1, pageSize: 100 })
        const allProducts = [...(firstPage.items || [])]
        const totalPages = Number(firstPage.totalPages || 1)
        if (totalPages > 1) {
          const remaining = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
              masterService.listProducts({ page: index + 2, pageSize: 100 })
            )
          )
          remaining.forEach((page) => allProducts.push(...(page.items || [])))
        }
        if (active) setProducts(allProducts)
      } catch (error) {
        if (active) toast.error(error.message || 'Unable to load products.')
      } finally {
        if (active) setIsLoadingProducts(false)
      }
    }

    loadProducts()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedProductId) {
      setBatches([])
      setSelectedBatchId('')
      return
    }

    let active = true
    async function loadBatches() {
      setIsLoadingBatches(true)
      try {
        const rows = await inventoryService.listStockBatches(selectedProductId)
        if (active) setBatches(rows)
      } catch (error) {
        if (active) {
          setBatches([])
          toast.error(error.message || 'Unable to load batches.')
        }
      } finally {
        if (active) setIsLoadingBatches(false)
      }
    }

    loadBatches()
    setSelectedBatchId('')
    setQty('')
    setLineNotes('')
    return () => {
      active = false
    }
  }, [selectedProductId])

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId]
  )

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) || null,
    [batches, selectedBatchId]
  )

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase()
    if (!term) return products.slice(0, 30)
    return products
      .filter(
        (product) =>
          product.name?.toLowerCase().includes(term) ||
          product.sku?.toLowerCase().includes(term) ||
          product.barcode?.toLowerCase().includes(term)
      )
      .slice(0, 30)
  }, [productSearch, products])

  const requestedQty = Number(qty)
  const selectedBatchQty = getQtyAvailable(selectedBatch)
  const draftedOutQty = adjustmentLines
    .filter((line) => line.batchId === selectedBatch?.id && line.adjustmentType === 'AdjustmentOut')
    .reduce((sum, line) => sum + Number(line.qtySmallest || 0), 0)
  const selectedAvailableQty = Math.max(0, selectedBatchQty - draftedOutQty)
  const exceedsAvailable = adjustmentType === 'AdjustmentOut' && requestedQty > selectedAvailableQty
  const canAddLine =
    selectedProduct &&
    selectedBatch &&
    requestedQty > 0 &&
    !exceedsAvailable &&
    !addLineMutation.isPending

  async function ensureDraftExists() {
    if (adjustmentId) return adjustmentId
    if (!reason) {
      toast.error('Select an adjustment reason first.')
      return null
    }

    const id = await createMutation.mutateAsync({ reason, notes: notes.trim() || null })
    if (!id || typeof id !== 'string') {
      throw new Error('Draft saved, but the adjustment id was not returned.')
    }
    setAdjustmentId(id)
    return id
  }

  async function handleAddLine() {
    if (!selectedProduct || !selectedBatch) {
      toast.error('Select a product and batch first.')
      return
    }
    if (!requestedQty || requestedQty <= 0) {
      toast.error('Enter a quantity greater than zero.')
      return
    }
    if (exceedsAvailable) {
      toast.error(
        `Cannot remove ${formatNumber(requestedQty)} — only ${formatNumber(
          selectedAvailableQty
        )} is available in this batch.`
      )
      return
    }

    try {
      const id = await ensureDraftExists()
      if (!id) return
      const lineId = await addLineMutation.mutateAsync({
        adjustmentId: id,
        productId: selectedProduct.id,
        productSku: selectedProduct.sku,
        batchId: selectedBatch.id,
        adjustmentType: adjustmentType === 'AdjustmentIn' ? 1 : 2,
        qtySmallest: requestedQty,
        lineNotes: lineNotes.trim() || null,
      })

      setAdjustmentLines((current) => [
        ...current,
        {
          id: lineId || makeTempId('adjustment-line'),
          productId: selectedProduct.id,
          productSku: selectedProduct.sku,
          productName: selectedProduct.name,
          batchId: selectedBatch.id,
          batchNo: selectedBatch.batchNo,
          adjustmentType,
          qtySmallest: requestedQty,
          lineNotes: lineNotes.trim() || null,
        },
      ])

      setSelectedProductId('')
      setSelectedBatchId('')
      setProductSearch('')
      setQty('')
      setLineNotes('')
      setAdjustmentType('AdjustmentIn')
    } catch {
      // Mutation hooks display the API error.
    }
  }

  async function handleRemoveLine(line) {
    if (!line.id || line.id.startsWith('adjustment-line-')) return
    try {
      await removeLineMutation.mutateAsync(line.id)
      setAdjustmentLines((current) => current.filter((item) => item.id !== line.id))
    } catch {
      // Mutation hook displays the API error.
    }
  }

  async function handleSubmit() {
    if (!adjustmentId || adjustmentLines.length === 0) {
      toast.error('Add at least one adjustment line first.')
      return
    }
    try {
      await submitApplyMutation.mutateAsync({ id: adjustmentId })
      navigate('/inventory/stock-adjustments')
    } catch {
      // Mutation hook displays the API error.
    }
  }

  const inLines = adjustmentLines.filter((line) => line.adjustmentType === 'AdjustmentIn')
  const outLines = adjustmentLines.filter((line) => line.adjustmentType === 'AdjustmentOut')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div>
        <button
          type="button"
          className="button-secondary"
          onClick={() => navigate('/inventory/stock-adjustments')}
          style={{ height: 34, marginBottom: 12 }}
        >
          <ArrowLeft size={15} />
          Back to List
        </button>
        <p className="eyebrow">Inventory</p>
        <h1 style={{ color: 'var(--color-text-primary)', fontSize: 24, fontWeight: 800 }}>
          New Stock Adjustment
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>
          Add or remove stock to correct physical count discrepancies.
        </p>
      </div>

      <div
        style={{
          alignItems: 'stretch',
          display: 'grid',
          flex: 1,
          gap: 16,
          gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 360px)',
          minHeight: 0,
        }}
      >
        <main
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          <section className="panel" style={{ padding: 16 }}>
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 800 }}>
                Adjustment Details
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 3 }}>
                The reason and notes are locked after the first line is saved.
              </p>
            </div>
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="form-label" htmlFor="stock-adjustment-reason">
                  Reason *
                </label>
                <select
                  id="stock-adjustment-reason"
                  className="form-input"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={Boolean(adjustmentId)}
                >
                  <option value="">Select reason...</option>
                  {ADJUSTMENT_REASONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="stock-adjustment-notes">
                  Notes
                </label>
                <input
                  id="stock-adjustment-notes"
                  className="form-input"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={Boolean(adjustmentId)}
                  placeholder="Optional adjustment context"
                />
              </div>
            </div>
          </section>

          {reason ? (
            <section className="panel" style={{ padding: 16 }}>
              <div
                style={{
                  alignItems: 'flex-start',
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <div>
                  <h2 style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 800 }}>
                    Add Adjustment Line
                  </h2>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 3 }}>
                    Select the direction, product batch, and quantity in the smallest unit.
                  </p>
                </div>
                <span
                  className="mono"
                  style={{
                    color: selectedBatch ? 'var(--color-teal)' : 'var(--color-text-muted)',
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {selectedBatch ? 'BATCH SELECTED' : 'READY'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">Adjustment Type *</label>
                  <div style={{ display: 'flex', width: 'fit-content' }}>
                    <TypeButton
                      active={adjustmentType === 'AdjustmentIn'}
                      color="#15803d"
                      icon={<ArrowUp size={15} />}
                      label="Add Stock (IN)"
                      onClick={() => setAdjustmentType('AdjustmentIn')}
                    />
                    <TypeButton
                      active={adjustmentType === 'AdjustmentOut'}
                      color="var(--color-danger)"
                      icon={<ArrowDown size={15} />}
                      label="Remove Stock (OUT)"
                      onClick={() => {
                        setAdjustmentType('AdjustmentOut')
                        if (requestedQty > selectedAvailableQty)
                          setQty(String(selectedAvailableQty || ''))
                      }}
                      right
                    />
                  </div>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 7 }}>
                    {adjustmentType === 'AdjustmentIn'
                      ? 'Increases stock when the physical count is higher than the system quantity.'
                      : 'Decreases stock when the physical count is lower than the system quantity.'}
                  </p>
                </div>

                <div>
                  <label className="form-label" htmlFor="stock-adjustment-product">
                    Product *
                  </label>
                  <input
                    id="stock-adjustment-product"
                    className="form-input"
                    value={productSearch}
                    onChange={(event) => {
                      setProductSearch(event.target.value)
                      setSelectedProductId('')
                      setSelectedBatchId('')
                      setQty('')
                    }}
                    placeholder="Search SKU, barcode, or product name"
                  />
                </div>

                {!selectedProduct && productSearch.trim().length >= 1 ? (
                  <ProductResults
                    products={filteredProducts}
                    loading={isLoadingProducts}
                    onSelect={setSelectedProductId}
                  />
                ) : null}

                {selectedProduct ? (
                  <>
                    <div style={{ ...readOnlyChipStyle, gap: 12, padding: '10px 12px' }}>
                      <span
                        className="mono"
                        style={{
                          background: 'color-mix(in srgb, var(--color-teal) 14%, transparent)',
                          borderRadius: 6,
                          color: 'var(--color-teal)',
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '3px 8px',
                        }}
                      >
                        {selectedProduct.sku}
                      </span>
                      <span
                        style={{
                          color: 'var(--color-text-primary)',
                          flex: 1,
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {selectedProduct.name}
                      </span>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => {
                          setSelectedProductId('')
                          setSelectedBatchId('')
                          setProductSearch('')
                          setQty('')
                        }}
                        style={{ height: 30 }}
                      >
                        Change
                      </button>
                    </div>

                    <BatchTable
                      batches={batches}
                      isLoading={isLoadingBatches}
                      selectedBatchId={selectedBatchId}
                      onSelect={setSelectedBatchId}
                    />
                  </>
                ) : null}

                {selectedBatch ? (
                  <div
                    style={{
                      borderTop: '1px solid var(--color-border)',
                      display: 'grid',
                      gap: 12,
                      gridTemplateColumns: 'minmax(160px, 0.8fr) minmax(220px, 1fr) auto',
                      paddingTop: 14,
                    }}
                  >
                    <div>
                      <label className="form-label" htmlFor="stock-adjustment-qty">
                        Qty to Adjust *
                      </label>
                      <input
                        id="stock-adjustment-qty"
                        className="form-input mono text-right"
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        max={adjustmentType === 'AdjustmentOut' ? selectedAvailableQty : undefined}
                        value={qty}
                        onChange={(event) => {
                          const raw = event.target.value
                          if (adjustmentType !== 'AdjustmentOut' || raw === '') {
                            setQty(raw)
                            return
                          }
                          const numericValue = Number(raw)
                          setQty(
                            Number.isFinite(numericValue)
                              ? String(Math.min(numericValue, selectedAvailableQty))
                              : ''
                          )
                        }}
                        style={{
                          borderColor: exceedsAvailable ? 'var(--color-danger)' : undefined,
                        }}
                      />
                      {adjustmentType === 'AdjustmentOut' ? (
                        <p
                          className="mono"
                          style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 5 }}
                        >
                          Max: {formatNumber(selectedAvailableQty)}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label className="form-label" htmlFor="stock-adjustment-line-notes">
                        Line Notes
                      </label>
                      <input
                        id="stock-adjustment-line-notes"
                        className="form-input"
                        value={lineNotes}
                        onChange={(event) => setLineNotes(event.target.value)}
                        placeholder="Optional line context"
                      />
                    </div>
                    <div style={{ alignSelf: 'start', paddingTop: 20 }}>
                      <button
                        type="button"
                        disabled={!canAddLine}
                        onClick={handleAddLine}
                        style={{
                          alignItems: 'center',
                          background: typeButtonColor(adjustmentType),
                          borderRadius: 7,
                          color: '#fff',
                          display: 'flex',
                          fontSize: 12,
                          fontWeight: 750,
                          gap: 7,
                          height: 38,
                          opacity: canAddLine ? 1 : 0.4,
                          padding: '0 16px',
                        }}
                      >
                        {adjustmentType === 'AdjustmentIn' ? (
                          <ArrowUp size={15} />
                        ) : (
                          <ArrowDown size={15} />
                        )}
                        {addLineMutation.isPending ? 'Adding...' : 'Add Line'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <AdjustmentLines
            lines={adjustmentLines}
            removing={removeLineMutation.isPending}
            onRemove={handleRemoveLine}
          />
        </main>

        <aside
          className="panel"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            height: '100%',
            overflowY: 'auto',
            padding: 16,
          }}
        >
          <div>
            <h2 style={{ color: 'var(--color-text-primary)', fontSize: 17, fontWeight: 800 }}>
              Adjustment Summary
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 4 }}>
              The draft is created when the first line is saved.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
            <SummaryRow
              label="Status"
              value={adjustmentId ? 'DRAFT' : 'NOT SAVED'}
              color={adjustmentId ? 'var(--color-amber)' : undefined}
            />
            <SummaryRow label="Reason" value={reason || '—'} />
            <SummaryRow label="Lines" value={adjustmentLines.length} mono />
            <SummaryRow label="In Lines" value={inLines.length} mono color="#4ade80" />
            <SummaryRow
              label="Out Lines"
              value={outLines.length}
              mono
              color="var(--color-danger)"
            />
          </div>

          <div
            style={{
              background: 'color-mix(in srgb, var(--color-amber) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-amber) 28%, transparent)',
              borderRadius: 8,
              color: 'var(--color-amber)',
              display: 'flex',
              fontSize: 11,
              gap: 9,
              lineHeight: 1.55,
              padding: 12,
            }}
          >
            <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Applying permanently changes stock levels. Adjustment OUT quantities cannot exceed the
              selected batch availability.
            </span>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button
              type="button"
              className="button-primary"
              disabled={!adjustmentLines.length || submitApplyMutation.isPending}
              onClick={handleSubmit}
              style={{ height: 42, width: '100%' }}
            >
              {submitApplyMutation.isPending ? (
                <>
                  <LoaderCircle className="animate-spin" size={17} />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle2 size={17} />
                  Apply Adjustment{adjustmentLines.length ? ` (${adjustmentLines.length})` : ''}
                </>
              )}
            </button>
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: 11,
                lineHeight: 1.5,
                marginTop: 9,
                textAlign: 'center',
              }}
            >
              Submit, approve, and apply run as one guided action.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function TypeButton({ active, color, icon, label, onClick, right = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        alignItems: 'center',
        background: active ? color : 'var(--color-bg-elevated)',
        border: `1px solid ${active ? color : 'var(--color-border)'}`,
        borderRadius: right ? '0 7px 7px 0' : '7px 0 0 7px',
        color: active ? '#fff' : 'var(--color-text-muted)',
        display: 'flex',
        fontSize: 12,
        fontWeight: 750,
        gap: 7,
        height: 38,
        padding: '0 16px',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function ProductResults({ products, loading, onSelect }) {
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        maxHeight: 230,
        overflowY: 'auto',
      }}
    >
      {loading ? (
        <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: 14 }}>
          Loading products...
        </div>
      ) : products.length ? (
        products.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => onSelect(product.id)}
            style={{
              alignItems: 'center',
              borderBottom: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
              display: 'flex',
              gap: 12,
              justifyContent: 'space-between',
              padding: '10px 12px',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  color: 'var(--color-text-primary)',
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {product.name}
              </span>
              <span
                className="mono"
                style={{ color: 'var(--color-teal)', display: 'block', fontSize: 11 }}
              >
                {product.sku}
              </span>
            </span>
            <PackageSearch size={16} style={{ flexShrink: 0 }} />
          </button>
        ))
      ) : (
        <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: 14 }}>
          No products found.
        </div>
      )}
    </div>
  )
}

function BatchTable({ batches, isLoading, selectedBatchId, onSelect }) {
  return (
    <div>
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <label className="form-label">Available Batches</label>
        <span className="mono" style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
          {batches.length} available
        </span>
      </div>
      <div className="overflow-x-auto" style={{ borderRadius: 8 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Batch No</th>
              <th className="text-right">Available</th>
              <th className="text-right">Unit Cost</th>
              <th className="text-right">MRP</th>
              <th>Expiry</th>
              <th className="text-right">Select</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6}>Loading batches...</td>
              </tr>
            ) : batches.length ? (
              batches.map((batch) => (
                <tr
                  key={batch.id}
                  style={{
                    boxShadow:
                      selectedBatchId === batch.id ? 'inset 3px 0 var(--color-teal)' : 'none',
                  }}
                >
                  <td className="mono">{batch.batchNo || '-'}</td>
                  <td className="mono text-right">{formatNumber(getQtyAvailable(batch))}</td>
                  <td className="mono text-right">Rs. {formatNumber(getUnitCost(batch))}</td>
                  <td className="mono text-right">Rs. {formatNumber(getMrp(batch))}</td>
                  <td className="mono">{formatDate(batch.expiryDate)}</td>
                  <td className="text-right">
                    <button
                      type="button"
                      className={
                        selectedBatchId === batch.id ? 'button-primary' : 'button-secondary'
                      }
                      onClick={() => onSelect(batch.id)}
                      style={{ height: 30 }}
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>No available batches found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdjustmentLines({ lines, removing, onRemove }) {
  return (
    <section className="panel" style={{ flexShrink: 0, overflow: 'hidden', padding: 0 }}>
      <div
        style={{
          alignItems: 'center',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          padding: '14px 16px',
        }}
      >
        <div>
          <h2 style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 800 }}>
            Adjustment Lines
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 2 }}>
            Saved batch adjustment lines.
          </p>
        </div>
        <span className="mono" style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
          {lines.length} line{lines.length === 1 ? '' : 's'}
        </span>
      </div>
      {lines.length ? (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Product</th>
                <th>Batch</th>
                <th className="text-right">Qty</th>
                <th>Notes</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const isIn = line.adjustmentType === 'AdjustmentIn'
                return (
                  <tr key={line.id}>
                    <td>
                      <span
                        className={`rounded border px-2 py-0.5 text-xs font-semibold ${isIn ? 'border-green-800/50 bg-green-900/20 text-green-400' : 'border-red-800/50 bg-red-900/20 text-red-400'}`}
                      >
                        {isIn ? '↑ IN' : '↓ OUT'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>
                        {line.productName}
                      </span>
                      <span
                        className="mono"
                        style={{ color: 'var(--color-teal)', display: 'block', fontSize: 11 }}
                      >
                        {line.productSku}
                      </span>
                    </td>
                    <td className="mono">{line.batchNo || '-'}</td>
                    <td
                      className="mono text-right"
                      style={{ color: typeColor(line.adjustmentType), fontWeight: 800 }}
                    >
                      {isIn ? '+' : '−'}
                      {formatNumber(line.qtySmallest)}
                    </td>
                    <td>{line.lineNotes || '—'}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="button-secondary"
                        disabled={removing}
                        onClick={() => onRemove(line)}
                        style={{ height: 30 }}
                        aria-label={`Remove ${line.productSku}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: 180,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <PackageSearch size={31} style={{ color: 'var(--color-text-dim)', marginBottom: 10 }} />
          <p style={{ color: 'var(--color-text-primary)', fontSize: 14, fontWeight: 700 }}>
            No adjustment lines added yet
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 4 }}>
            Select a reason and product batch to begin.
          </p>
        </div>
      )}
    </section>
  )
}

function SummaryRow({ label, value, mono = false, color }) {
  return (
    <div
      style={{ display: 'flex', fontSize: 12, justifyContent: 'space-between', marginBottom: 10 }}
    >
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span
        className={mono ? 'mono' : ''}
        style={{
          color: color || 'var(--color-text-primary)',
          fontWeight: 750,
          maxWidth: 170,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={String(value)}
      >
        {value}
      </span>
    </div>
  )
}
