import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  PackageSearch,
  PackageX,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import ConfirmDialog from '@components/ui/ConfirmDialog'
import EmptyState from '@components/ui/EmptyState'
import StatusBadge from '@components/ui/StatusBadge'
import {
  useAddInStoreReturnLine,
  useApplyInStoreReturn,
  useApproveInStoreReturn,
  useCancelInStoreReturn,
  useInStoreReturn,
  useRemoveInStoreReturnLine,
  useSubmitInStoreReturn,
} from '@/hooks/useInStoreReturn'
import { inventoryService } from '@/services/api/inventoryService'
import { masterService } from '@/services/api/masterService'
import {
  IN_STORE_RETURN_REASONS,
  formatDate,
  formatNumber,
  getMrp,
  getQtyAvailable,
  getUnitCost,
  reasonLabel,
  statusLabel,
} from './inStoreReturnUtils'

function InfoTile({ label, value, mono = false }) {
  return (
    <div className="rounded-lg border border-border bg-bg-base/50 p-3">
      <div className="form-label">{label}</div>
      <div className={`mt-1 text-sm font-semibold text-text-primary ${mono ? 'mono' : ''}`}>
        {value || '-'}
      </div>
    </div>
  )
}

function LinesTable({ lines = [], onRemove, removable, headerReason }) {
  if (!lines.length) {
    return (
      <EmptyState
        icon={<PackageX className="size-8" />}
        title="No return lines"
        description="Select a product batch and add the quantity that should move to return stock."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Product SKU</th>
            <th>Batch No</th>
            <th>Qty</th>
            <th>Unit Cost</th>
            <th>MRP</th>
            <th>Reason</th>
            {removable ? <th className="text-right">Delete</th> : null}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id}>
              <td className="mono font-semibold">{line.productSku}</td>
              <td className="mono">{line.batchNo || '-'}</td>
              <td className="mono">{formatNumber(line.qtySmallest)}</td>
              <td className="mono">LKR {formatNumber(line.unitCostSmallest)}</td>
              <td className="mono">LKR {formatNumber(line.mrp)}</td>
              <td>{line.lineReason ? reasonLabel(line.lineReason) : `${reasonLabel(headerReason)} (header)`}</td>
              {removable ? (
                <td className="text-right">
                  <ConfirmDialog
                    title="Remove return line?"
                    description="This removes the line from the draft return."
                    confirmLabel="Remove"
                    loadingLabel="Removing..."
                    onConfirm={() => onRemove(line.id)}
                    trigger={
                      <button type="button" className="button-danger">
                        <Trash2 size={15} />
                        Delete
                      </button>
                    }
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function InStoreReturnDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: inStoreReturn, isLoading } = useInStoreReturn(id)
  const addLineMutation = useAddInStoreReturnLine(id)
  const removeLineMutation = useRemoveInStoreReturnLine(id)
  const submitMutation = useSubmitInStoreReturn()
  const approveMutation = useApproveInStoreReturn()
  const applyMutation = useApplyInStoreReturn()
  const cancelMutation = useCancelInStoreReturn()

  const [products, setProducts] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [batches, setBatches] = useState([])
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [qty, setQty] = useState('')
  const [lineReason, setLineReason] = useState('')
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isLoadingBatches, setIsLoadingBatches] = useState(false)

  const status = statusLabel(inStoreReturn?.status)
  const isDraft = status === 'Draft'
  const isSubmitted = status === 'Submitted'
  const isApproved = status === 'Approved'

  useEffect(() => {
    if (!isDraft) return
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
  }, [isDraft])

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

  async function handleAddLine(event) {
    event.preventDefault()
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

    await addLineMutation.mutateAsync({
      productId: selectedProduct.id,
      productSku: selectedProduct.sku,
      batchId: selectedBatch.id,
      qtySmallest: requestedQty,
      lineReason: lineReason ? Number(lineReason) : null,
    })
    setSelectedBatchId('')
    setQty('')
    setLineReason('')
  }

  async function handleCancel() {
    const reason = window.prompt('Enter cancellation reason')
    if (!reason?.trim()) {
      toast.error('Cancellation reason is required.')
      return
    }
    await cancelMutation.mutateAsync({ id, reason: reason.trim() })
  }

  if (isLoading) {
    return <div className="panel p-8 text-sm text-text-muted">Loading in-store return...</div>
  }

  if (!inStoreReturn) {
    return (
      <EmptyState
        icon={<PackageX className="size-8" />}
        title="In-store return not found"
        description="The selected in-store return could not be loaded."
      />
    )
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <button
            type="button"
            className="button-secondary mb-4"
            onClick={() => navigate('/inventory/in-store-returns')}
          >
            <ArrowLeft size={16} />
            Back to List
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="mono text-3xl font-bold text-text-primary">
              {inStoreReturn.inStoreReturnNo || inStoreReturn.id}
            </h1>
            <StatusBadge status={status} />
            <StatusBadge status={reasonLabel(inStoreReturn.reason)} />
          </div>
          <p className="mt-3 max-w-3xl text-sm text-text-muted">
            {inStoreReturn.notes || 'No notes recorded for this in-store return.'}
          </p>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <InfoTile label="Created By" value={inStoreReturn.createdByUserId} mono />
        <InfoTile label="Approved By" value={inStoreReturn.approvedByUserId} mono />
        <InfoTile label="Applied On" value={formatDate(inStoreReturn.appliedOn)} mono />
        <InfoTile label="Cancelled On" value={formatDate(inStoreReturn.cancelledOn)} mono />
        <InfoTile label="Lines" value={inStoreReturn.lines?.length ?? 0} mono />
      </section>

      {isDraft ? (
        <section className="panel space-y-5 p-5">
          <div>
            <p className="eyebrow">Add Return Line</p>
            <h2 className="mt-2 text-xl font-semibold text-text-primary">Select Product Batch</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div className="space-y-3">
              <label className="form-label" htmlFor="product-search">
                Step 1 - Product
              </label>
              <input
                id="product-search"
                className="form-input"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Search SKU, barcode, or product name"
              />
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                {isLoadingProducts ? (
                  <div className="p-4 text-sm text-text-muted">Loading products...</div>
                ) : filteredProducts.length ? (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className={`flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 ${
                        selectedProductId === product.id ? 'bg-amber/10 text-text-primary' : 'text-text-muted'
                      }`}
                      onClick={() => setSelectedProductId(product.id)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-text-primary">
                          {product.name}
                        </span>
                        <span className="mono block text-xs">{product.sku}</span>
                      </span>
                      <PackageSearch size={16} />
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-sm text-text-muted">No products found.</div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="form-label">Step 2 - Available Batches</div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Batch No</th>
                      <th>Available Qty</th>
                      <th>Unit Cost</th>
                      <th>MRP</th>
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
                        <tr key={batch.id}>
                          <td className="mono">{batch.batchNo || '-'}</td>
                          <td className="mono">{formatNumber(getQtyAvailable(batch))}</td>
                          <td className="mono">LKR {formatNumber(getUnitCost(batch))}</td>
                          <td className="mono">LKR {formatNumber(getMrp(batch))}</td>
                          <td className="mono">{formatDate(batch.expiryDate)}</td>
                          <td className="text-right">
                            <button
                              type="button"
                              className={
                                selectedBatchId === batch.id ? 'button-primary' : 'button-secondary'
                              }
                              onClick={() => setSelectedBatchId(batch.id)}
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6}>
                          {selectedProductId ? 'No available batches found.' : 'Select a product first.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {selectedBatch ? (
            <form className="grid gap-4 rounded-lg border border-border bg-bg-base/50 p-4 lg:grid-cols-5" onSubmit={handleAddLine}>
              <InfoTile label="Batch No" value={selectedBatch.batchNo} mono />
              <InfoTile label="Available Qty" value={formatNumber(getQtyAvailable(selectedBatch))} mono />
              <InfoTile label="Unit Cost" value={`LKR ${formatNumber(getUnitCost(selectedBatch))}`} mono />
              <InfoTile label="MRP" value={`LKR ${formatNumber(getMrp(selectedBatch))}`} mono />
              <div>
                <label className="form-label" htmlFor="qty-smallest">
                  Qty to Return
                </label>
                <input
                  id="qty-smallest"
                  className="form-input mt-2 mono"
                  type="number"
                  min="0"
                  step="0.0001"
                  max={getQtyAvailable(selectedBatch)}
                  value={qty}
                  onChange={(event) => setQty(event.target.value)}
                  required
                />
              </div>
              <div className="lg:col-span-4">
                <label className="form-label" htmlFor="line-reason">
                  Per-line Reason
                </label>
                <select
                  id="line-reason"
                  className="form-input mt-2"
                  value={lineReason}
                  onChange={(event) => setLineReason(event.target.value)}
                >
                  <option value="">Use header reason</option>
                  {IN_STORE_RETURN_REASONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="button-primary w-full" disabled={addLineMutation.isPending}>
                  {addLineMutation.isPending ? 'Adding...' : 'Add Line'}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      <section className="panel space-y-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Return Lines</p>
            <h2 className="mt-2 text-xl font-semibold text-text-primary">Batch Movement Lines</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {isDraft ? (
              <>
                <ConfirmDialog
                  title="Submit for approval?"
                  description="The return becomes read-only for warehouse staff after submission."
                  confirmLabel="Submit"
                  loadingLabel="Submitting..."
                  tone="warning"
                  icon={Send}
                  onConfirm={() => submitMutation.mutateAsync(id)}
                  trigger={
                    <button type="button" className="button-primary" disabled={!inStoreReturn.lines?.length}>
                      <Send size={16} />
                      Submit for Approval
                    </button>
                  }
                />
                <button type="button" className="button-secondary" onClick={handleCancel}>
                  <XCircle size={16} />
                  Cancel
                </button>
              </>
            ) : null}
            {isSubmitted ? (
              <>
                <ConfirmDialog
                  title="Approve in-store return?"
                  description="Approved returns can be applied to inventory by moving stock to the return location."
                  confirmLabel="Approve"
                  loadingLabel="Approving..."
                  tone="warning"
                  icon={CheckCircle2}
                  onConfirm={() => approveMutation.mutateAsync(id)}
                  trigger={
                    <button type="button" className="button-primary">
                      <CheckCircle2 size={16} />
                      Approve
                    </button>
                  }
                />
                <button type="button" className="button-secondary" onClick={handleCancel}>
                  <XCircle size={16} />
                  Cancel
                </button>
              </>
            ) : null}
            {isApproved ? (
              <ConfirmDialog
                title="Apply return to inventory?"
                description="Applying will permanently move stock from main inventory to return stock. This cannot be undone."
                details="This is the irreversible step. Source batches and stock levels will be adjusted immediately."
                confirmLabel="Apply to Inventory"
                loadingLabel="Applying..."
                tone="danger"
                icon={AlertTriangle}
                onConfirm={() => applyMutation.mutateAsync(id)}
                trigger={
                  <button type="button" className="button-danger">
                    <AlertTriangle size={16} />
                    Apply to Inventory
                  </button>
                }
              />
            ) : null}
          </div>
        </div>

        {isApproved ? (
          <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] p-3 text-sm text-text-primary">
            Applying will permanently move stock from main inventory to return stock. This cannot be undone.
          </div>
        ) : null}

        <LinesTable
          lines={inStoreReturn.lines}
          removable={isDraft}
          headerReason={inStoreReturn.reason}
          onRemove={(lineId) => removeLineMutation.mutateAsync(lineId)}
        />
      </section>

      {inStoreReturn.cancelReason ? (
        <section className="panel p-5">
          <p className="eyebrow">Cancel Reason</p>
          <p className="mt-2 text-sm text-text-muted">{inStoreReturn.cancelReason}</p>
        </section>
      ) : null}
    </div>
  )
}
