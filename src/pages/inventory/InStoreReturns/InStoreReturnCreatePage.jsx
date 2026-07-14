import { ArrowLeft, PackageSearch } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useCreateInStoreReturn, useSubmitAndApplyInStoreReturn } from '@/hooks/useInStoreReturn'
import { inventoryService } from '@/services/api/inventoryService'
import { masterService } from '@/services/api/masterService'
import { useAuthStore } from '@stores/authStore'
import {
  IN_STORE_RETURN_REASONS,
  formatDate,
  formatNumber,
  getMrp,
  getQtyAvailable,
  getUnitCost,
  reasonLabel,
} from './inStoreReturnUtils'

const DEFAULT_HEADER_REASON = 5

const reasonBadgeColors = {
  Damaged: 'bg-orange-900/30 text-orange-300 border-orange-800/50',
  Expired: 'bg-red-900/30 text-red-300 border-red-800/50',
  ShortExpiry: 'bg-amber-900/30 text-amber-300 border-amber-800/50',
  QualityIssue: 'bg-purple-900/30 text-purple-300 border-purple-800/50',
  Other: 'bg-gray-800 text-gray-400 border-gray-700',
}

const readOnlyChipStyle = {
  alignItems: 'center',
  backgroundColor: 'var(--color-bg-hover)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  display: 'flex',
  minHeight: 38,
}

export default function InStoreReturnCreatePage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const createMutation = useCreateInStoreReturn()
  const submitAndApplyMutation = useSubmitAndApplyInStoreReturn()

  const [notes, setNotes] = useState('')
  const [draftId, setDraftId] = useState('')
  const [returnLines, setReturnLines] = useState([])
  const [products, setProducts] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [batches, setBatches] = useState([])
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [qty, setQty] = useState('')
  const [lineReason, setLineReason] = useState('')
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isLoadingBatches, setIsLoadingBatches] = useState(false)
  const [isAddingLine, setIsAddingLine] = useState(false)

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
        if (active) setBatches(rows.filter((batch) => getQtyAvailable(batch) > 0))
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
    setLineReason('')
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

  async function ensureDraft() {
    if (draftId) return draftId

    const created = await createMutation.mutateAsync({
      reason: DEFAULT_HEADER_REASON,
      notes: notes.trim() || null,
    })
    const id = typeof created === 'string' ? created : created?.id || created?.value
    if (!id) throw new Error('Draft saved, but the new return id was not returned.')
    setDraftId(id)
    return id
  }

  async function handleAddLine(event) {
    event?.preventDefault()
    if (!selectedProduct || !selectedBatch) {
      toast.error('Select a product and batch first.')
      return
    }

    const requestedQty = Number(qty)
    const availableQty = getQtyAvailable(selectedBatch)
    if (!requestedQty || requestedQty <= 0) {
      toast.error('Enter a return quantity greater than zero.')
      return
    }
    if (requestedQty > availableQty) {
      toast.error('Return quantity cannot exceed available batch quantity.')
      return
    }
    if (!lineReason) {
      toast.error('Select a return reason.')
      return
    }

    setIsAddingLine(true)
    try {
      const isrId = await ensureDraft()
      const lineId = await inventoryService.addInStoreReturnLine(isrId, {
        productId: selectedProduct.id,
        productSku: selectedProduct.sku,
        batchId: selectedBatch.id,
        qtySmallest: requestedQty,
        lineReason: Number(lineReason),
      })

      setReturnLines((current) => [
        ...current,
        {
          id: lineId || `${selectedBatch.id}-${Date.now()}`,
          productName: selectedProduct.name,
          productSku: selectedProduct.sku,
          batchNo: selectedBatch.batchNo,
          qtySmallest: requestedQty,
          unitCostSmallest: getUnitCost(selectedBatch),
          lineReason: Number(lineReason),
        },
      ])
      toast.success('Return line added.')
      setSelectedBatchId('')
      setQty('')
      setLineReason('')
    } catch (error) {
      toast.error(error.message || 'Unable to add return line.')
    } finally {
      setIsAddingLine(false)
    }
  }

  async function handleSubmitReturn() {
    if (!draftId || !returnLines.length) return
    try {
      await submitAndApplyMutation.mutateAsync({ isrId: draftId, userId: user?.id })
      navigate('/inventory/in-store-returns')
    } catch {
      // Toast is handled by the hook.
    }
  }

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
          onClick={() => navigate('/inventory/in-store-returns')}
          style={{ height: 34, marginBottom: 12 }}
        >
          <ArrowLeft style={{ height: 15, width: 15 }} />
          Back to List
        </button>
        <p className="eyebrow">Inventory</p>
        <h1 style={{ color: 'var(--color-text-primary)', fontSize: 24, fontWeight: 800 }}>
          New In-Store Return
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>
          Select product batches, enter quantities and reasons, then submit to move stock to the return location.
        </p>
      </div>

      <div
        style={{
          alignItems: 'stretch',
          display: 'grid',
          flex: 1,
          gap: 16,
          gridTemplateColumns: 'minmax(0, 1fr) minmax(340px, 380px)',
          minHeight: 0,
        }}
      >
        <main style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
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
                  Add Return Line
                </h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 3 }}>
                  Search a product, select a stock batch, then add the return quantity.
                </p>
              </div>
              <div
                className="mono"
                style={{
                  color: selectedBatch ? 'var(--color-teal)' : 'var(--color-text-muted)',
                  fontSize: 12,
                  fontWeight: 700,
                  paddingTop: 3,
                }}
              >
                {selectedBatch ? 'BATCH SELECTED' : 'READY'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label" htmlFor="product-search">
                  Product
                </label>
                <input
                  id="product-search"
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
                <div
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    maxHeight: 230,
                    overflowY: 'auto',
                  }}
                >
                  {isLoadingProducts ? (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: 14 }}>
                      Loading products...
                    </div>
                  ) : filteredProducts.length ? (
                    filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setSelectedProductId(product.id)}
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
                          <span className="mono" style={{ display: 'block', fontSize: 11 }}>
                            {product.sku}
                          </span>
                        </span>
                        <PackageSearch style={{ flexShrink: 0, height: 16, width: 16 }} />
                      </button>
                    ))
                  ) : (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: 14 }}>
                      No products found.
                    </div>
                  )}
                </div>
              ) : null}

              {selectedProduct ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ ...readOnlyChipStyle, gap: 12, padding: '10px 12px' }}>
                    <span
                      className="mono"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-teal) 14%, transparent)',
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
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                        {batches.length} available
                      </span>
                    </div>
                    <div className="overflow-x-auto" style={{ borderRadius: 8 }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Batch No</th>
                            <th className="text-right">Available Qty</th>
                            <th className="text-right">Unit Cost</th>
                            <th className="text-right">MRP</th>
                            <th>Expiry</th>
                            <th className="text-right">Select</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isLoadingBatches ? (
                            <tr>
                              <td colSpan={6}>Loading batches...</td>
                            </tr>
                          ) : batches.length ? (
                            batches.map((batch) => (
                              <tr
                                key={batch.id}
                                style={{
                                  boxShadow:
                                    selectedBatchId === batch.id
                                      ? 'inset 3px 0 var(--color-teal)'
                                      : 'none',
                                }}
                              >
                                <td className="mono">{batch.batchNo || '-'}</td>
                                <td className="mono text-right">
                                  {formatNumber(getQtyAvailable(batch))}
                                </td>
                                <td className="mono text-right">
                                  Rs. {formatNumber(getUnitCost(batch))}
                                </td>
                                <td className="mono text-right">Rs. {formatNumber(getMrp(batch))}</td>
                                <td className="mono">{formatDate(batch.expiryDate)}</td>
                                <td className="text-right">
                                  <button
                                    type="button"
                                    className={
                                      selectedBatchId === batch.id
                                        ? 'button-primary'
                                        : 'button-secondary'
                                    }
                                    onClick={() => setSelectedBatchId(batch.id)}
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
                </div>
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
                    <label className="form-label" htmlFor="qty-smallest">
                      Quantity *
                    </label>
                    <input
                      id="qty-smallest"
                      className="form-input mono text-right"
                      type="number"
                      min="1"
                      step="0.0001"
                      max={getQtyAvailable(selectedBatch)}
                      value={qty}
                      onChange={(event) => {
                        const value = parseFloat(event.target.value) || 0
                        setQty(String(Math.min(value, getQtyAvailable(selectedBatch))))
                      }}
                    />
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 5 }}>
                      Max: {formatNumber(getQtyAvailable(selectedBatch))}
                    </p>
                  </div>

                  <div>
                    <label className="form-label" htmlFor="line-reason">
                      Reason *
                    </label>
                    <select
                      id="line-reason"
                      className="form-input"
                      value={lineReason}
                      onChange={(event) => setLineReason(event.target.value)}
                    >
                      <option value="">Select reason...</option>
                      {IN_STORE_RETURN_REASONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ alignSelf: 'start', paddingTop: 20 }}>
                    <button
                      type="button"
                      className="button-primary"
                      disabled={!qty || parseFloat(qty) <= 0 || !lineReason || isAddingLine}
                      onClick={handleAddLine}
                      style={{ height: 38, minWidth: 126 }}
                    >
                      {isAddingLine ? 'Adding...' : 'Add Line'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section
            className="panel"
            style={{
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
              padding: 0,
            }}
          >
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
                  Return Lines
                </h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 2 }}>
                  Saved batch movement lines.
                </p>
              </div>
              {returnLines.length ? (
                <span className="mono" style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                  {returnLines.length} line{returnLines.length !== 1 ? 's' : ''}
                </span>
              ) : null}
            </div>

            {returnLines.length === 0 ? (
              <div
                style={{
                  alignItems: 'center',
                  display: 'flex',
                  flex: 1,
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minHeight: 210,
                  padding: 24,
                  textAlign: 'center',
                }}
              >
                <PackageSearch
                  style={{ color: 'var(--color-text-muted)', height: 32, marginBottom: 12, width: 32 }}
                />
                <p style={{ color: 'var(--color-text-primary)', fontSize: 14, fontWeight: 700 }}>
                  No return lines added yet
                </p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 4 }}>
                  Search for a product above to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto" style={{ flex: 1, minHeight: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Batch</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Unit Cost</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnLines.map((line) => {
                      const lineReasonLabel = reasonLabel(line.lineReason)
                      return (
                        <tr key={line.id}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>
                                {line.productName}
                              </span>
                              <span className="mono" style={{ color: 'var(--color-teal)', fontSize: 11 }}>
                                {line.productSku}
                              </span>
                            </div>
                          </td>
                          <td className="mono">{line.batchNo ?? '-'}</td>
                          <td className="mono text-right">{formatNumber(line.qtySmallest)}</td>
                          <td className="mono text-right">
                            Rs. {formatNumber(line.unitCostSmallest)}
                          </td>
                          <td>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                                reasonBadgeColors[lineReasonLabel] || reasonBadgeColors.Other
                              }`}
                            >
                              {lineReasonLabel}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>

        <aside
          className="panel"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            height: '100%',
            overflowY: 'auto',
            padding: 16,
          }}
        >
          <div>
            <h2 style={{ color: 'var(--color-text-primary)', fontSize: 17, fontWeight: 800 }}>
              Return Details
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 4 }}>
              Draft is created when the first line is added.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
            <label className="form-label" htmlFor="isr-notes" style={{ fontSize: 10 }}>
              Notes
            </label>
            <input
              id="isr-notes"
              className="form-input"
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional context for the return"
            />
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
            <p className="form-label" style={{ fontSize: 10 }}>
              Summary
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Status</span>
                <span
                  className="mono"
                  style={{
                    color: draftId ? 'var(--color-amber)' : 'var(--color-text-muted)',
                    fontWeight: 800,
                  }}
                >
                  {draftId ? 'DRAFT' : 'NOT SAVED'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Lines</span>
                <span className="mono" style={{ color: 'var(--color-text-primary)', fontWeight: 800 }}>
                  {returnLines.length}
                </span>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', margin: '2px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Products</span>
                <span className="mono" style={{ color: 'var(--color-text-primary)' }}>
                  {new Set(returnLines.map((line) => line.productSku)).size}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button
              type="button"
              className="button-primary"
              disabled={!returnLines.length || submitAndApplyMutation.isPending}
              onClick={handleSubmitReturn}
              style={{ height: 40, width: '100%' }}
            >
              {submitAndApplyMutation.isPending ? 'Submitting...' : 'Submit Return'}
            </button>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 10, textAlign: 'center' }}>
              Stock moves to return location on submit.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
