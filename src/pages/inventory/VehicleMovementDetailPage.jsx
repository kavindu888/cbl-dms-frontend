import { ArrowLeft, CheckCircle2, PackageX, Pencil, Plus, Search, Trash2, X, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import EmptyState from '@components/ui/EmptyState'
import Modal from '@components/ui/Modal'
import StatusBadge from '@components/ui/StatusBadge'
import {
  useAdminAddAppliedLoadingLine,
  useAdminRemoveAppliedLoadingLine,
  useAdminRemoveAppliedUnloadingLine,
  useAdminUpdateAppliedLoadingLineQty,
  useAdminUpdateAppliedUnloadingLineQty,
  useVehicles,
} from '@/hooks/useVehicle'
import { inventoryService } from '@/services/api/inventoryService'
import { masterService } from '@/services/api/masterService'
import { usersService } from '@/services/api/usersService'
import { useAuthStore } from '@stores/authStore'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'
import { formatDateTime } from '@/utils/formatDate'
import { formatLKR } from '@/utils/formatCurrency'
import {
  formatNumber,
  getQtyAvailable,
  getMrp,
  getUnitCost,
  movementStatusLabel,
  vehicleLabel,
} from './vehicleMovementUtils'

function AdminAddLoadingLineModal({ open, onOpenChange, onAdd, isSubmitting }) {
  const [products, setProducts] = useState([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [batches, setBatches] = useState([])
  const [isLoadingBatches, setIsLoadingBatches] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [qty, setQty] = useState('')

  useEffect(() => {
    if (!open) return
    setProductSearch('')
    setSelectedProduct(null)
    setBatches([])
    setSelectedBatch(null)
    setQty('')
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    let active = true
    setIsLoadingProducts(true)
    masterService
      .listAllProducts({ pageSize: 100, status: 'Active' })
      .then((items) => {
        if (active) setProducts(items || [])
      })
      .catch(() => {
        if (active) setProducts([])
      })
      .finally(() => {
        if (active) setIsLoadingProducts(false)
      })
    return () => {
      active = false
    }
  }, [open])

  useEffect(() => {
    if (!selectedProduct) {
      setBatches([])
      setSelectedBatch(null)
      return undefined
    }
    let active = true
    setIsLoadingBatches(true)
    inventoryService
      .listStockBatches(selectedProduct.id, {})
      .then((rows) => {
        if (active) setBatches((rows || []).filter((batch) => getQtyAvailable(batch) > 0))
      })
      .catch(() => {
        if (active) setBatches([])
      })
      .finally(() => {
        if (active) setIsLoadingBatches(false)
      })
    return () => {
      active = false
    }
  }, [selectedProduct])

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase()
    if (!term) return products.slice(0, 30)
    return products
      .filter((product) =>
        `${product.name} ${product.sku} ${product.barcode || ''}`.toLowerCase().includes(term)
      )
      .slice(0, 30)
  }, [productSearch, products])

  async function handleSubmit() {
    const requestedQty = Number(qty)
    if (!selectedProduct || !selectedBatch) {
      toast.error('Select a product and a main-stock batch first.')
      return
    }
    if (!requestedQty || requestedQty <= 0) {
      toast.error('Enter a quantity greater than zero.')
      return
    }
    if (requestedQty > getQtyAvailable(selectedBatch)) {
      toast.error('Quantity cannot exceed the available batch quantity.')
      return
    }
    await onAdd({
      productId: selectedProduct.id,
      productSku: selectedProduct.sku,
      sourceBatchId: selectedBatch.id,
      qtySmallest: requestedQty,
    })
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Line to Applied Loading"
      description="Pick a product and a main-stock batch. Stock moves to the vehicle immediately."
      maxWidth="620px"
      contentStyle={{ borderRadius: 12, overflow: 'hidden', padding: 24 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label>
          <span className="form-label">Product</span>
          <input
            className="form-input"
            value={productSearch}
            onChange={(event) => {
              setProductSearch(event.target.value)
              setSelectedProduct(null)
            }}
            placeholder="Search SKU, barcode, or product name"
          />
        </label>
        {!selectedProduct && productSearch.trim() ? (
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            {isLoadingProducts ? (
              <div style={{ color: 'var(--color-text-muted)', padding: 12 }}>Loading products...</div>
            ) : filteredProducts.length ? (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedProduct(product)}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    display: 'block',
                    padding: '9px 12px',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <strong style={{ color: 'var(--color-text-primary)', display: 'block' }}>
                    {product.name}
                  </strong>
                  <span className="mono" style={{ color: 'var(--color-teal)', fontSize: 11 }}>
                    {product.sku}
                  </span>
                </button>
              ))
            ) : (
              <div style={{ color: 'var(--color-text-muted)', padding: 12 }}>No products found.</div>
            )}
          </div>
        ) : null}
        {selectedProduct ? (
          <>
            <div
              style={{
                alignItems: 'center',
                background: 'var(--color-bg-hover)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                display: 'flex',
                gap: 10,
                padding: '9px 12px',
              }}
            >
              <span className="product-sku-badge mono">{selectedProduct.sku}</span>
              <strong style={{ color: 'var(--color-text-primary)', flex: 1 }}>{selectedProduct.name}</strong>
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setSelectedProduct(null)
                  setProductSearch('')
                }}
                style={{ height: 28 }}
              >
                Change
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Batch No</th>
                    <th className="text-right">Available Qty</th>
                    <th className="text-right">Unit Cost</th>
                    <th className="text-right">MRP</th>
                    <th className="text-right">Select</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingBatches ? (
                    <tr>
                      <td colSpan={5}>Loading batches...</td>
                    </tr>
                  ) : batches.length ? (
                    batches.map((batch) => (
                      <tr
                        key={batch.id}
                        style={{
                          boxShadow:
                            selectedBatch?.id === batch.id ? 'inset 3px 0 var(--color-teal)' : 'none',
                        }}
                      >
                        <td className="mono">{batch.batchNo || '—'}</td>
                        <td className="mono text-right">{formatNumber(getQtyAvailable(batch))}</td>
                        <td className="mono text-right">{formatLKR(getUnitCost(batch))}</td>
                        <td className="mono text-right">{formatLKR(getMrp(batch))}</td>
                        <td className="text-right">
                          <button
                            type="button"
                            className={selectedBatch?.id === batch.id ? 'button-primary' : 'button-secondary'}
                            onClick={() => setSelectedBatch(batch)}
                            style={{ height: 28 }}
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>No available main-stock batches for this product.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
        {selectedBatch ? (
          <label>
            <span className="form-label">Quantity *</span>
            <input
              className="form-input mono"
              type="number"
              min="0.0001"
              step="0.0001"
              max={getQtyAvailable(selectedBatch)}
              value={qty}
              onChange={(event) => setQty(event.target.value)}
            />
            <small className="mono" style={{ color: 'var(--color-text-muted)' }}>
              Max available: {formatNumber(getQtyAvailable(selectedBatch))}
            </small>
          </label>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            className="button-secondary"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button-primary"
            disabled={isSubmitting || !selectedBatch || !qty}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Adding...' : 'Add Line'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function InfoTile({ label, value, mono = false }) {
  return (
    <div
      style={{
        background: 'var(--color-bg-base)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        minHeight: 72,
        padding: 12,
      }}
    >
      <div className="form-label" style={{ fontSize: 10 }}>
        {label}
      </div>
      <div
        className={mono ? 'mono' : undefined}
        style={{
          color: 'var(--color-text-primary)',
          fontSize: 13,
          fontWeight: 650,
          marginTop: 7,
          overflowWrap: 'anywhere',
        }}
      >
        {value || '—'}
      </div>
    </div>
  )
}

function formatUserId(value) {
  if (!value) return '—'
  return value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value
}

export default function VehicleMovementDetailPage({
  kind,
  basePath,
  useDetail,
  useApply,
  useCancel,
}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: movement, isLoading } = useDetail(id)
  const { data: vehicles = [] } = useVehicles()
  const applyMovement = useApply()
  const cancelMovement = useCancel()
  const { user } = useAuthStore()
  const canManageVehicles = userHasPermission(user, PERMISSIONS.inventory.vehicleManage)
  const removeAppliedUnloadingLine = useAdminRemoveAppliedUnloadingLine(id)
  const updateAppliedUnloadingLineQty = useAdminUpdateAppliedUnloadingLineQty(id)
  const removeAppliedLoadingLine = useAdminRemoveAppliedLoadingLine(id)
  const updateAppliedLoadingLineQty = useAdminUpdateAppliedLoadingLineQty(id)
  const addAppliedLoadingLine = useAdminAddAppliedLoadingLine(id)
  const [deliveryRuns, setDeliveryRuns] = useState([])
  const [productById, setProductById] = useState({})
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [createdByName, setCreatedByName] = useState('')
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [lineSearch, setLineSearch] = useState('')
  const [editingLineId, setEditingLineId] = useState(null)
  const [editingQty, setEditingQty] = useState('')
  const [isAddLineModalOpen, setIsAddLineModalOpen] = useState(false)
  const vehicle = vehicles.find((item) => item.id === movement?.vehicleLocationId)
  const status = movementStatusLabel(movement?.status)
  const isUnloading = kind === 'Unloading'
  const showAdminLineControls = status === 'Applied' && canManageVehicles
  const removeAppliedLine = isUnloading ? removeAppliedUnloadingLine : removeAppliedLoadingLine
  const updateAppliedLineQty = isUnloading ? updateAppliedUnloadingLineQty : updateAppliedLoadingLineQty
  const adminLineActionPending =
    removeAppliedLine.isPending || updateAppliedLineQty.isPending || addAppliedLoadingLine.isPending

  function startEditingLine(line) {
    setEditingLineId(line.id)
    setEditingQty(String(line.qtySmallest))
  }

  function cancelEditingLine() {
    setEditingLineId(null)
    setEditingQty('')
  }

  async function saveEditingLine(lineId) {
    const qty = Number(editingQty)
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Enter a quantity greater than zero.')
      return
    }
    try {
      await updateAppliedLineQty.mutateAsync({ lineId, qtySmallest: qty })
      cancelEditingLine()
    } catch {
      /* The mutation hook displays the API error. */
    }
  }

  async function deleteAppliedLine(lineId) {
    if (!window.confirm('Remove this line and reverse its stock movement? This cannot be undone.'))
      return
    try {
      await removeAppliedLine.mutateAsync(lineId)
    } catch {
      /* The mutation hook displays the API error. */
    }
  }

  async function addAppliedLine(payload) {
    try {
      await addAppliedLoadingLine.mutateAsync(payload)
      setIsAddLineModalOpen(false)
    } catch {
      /* The mutation hook displays the API error. */
    }
  }
  const deliveryRunById = useMemo(
    () => Object.fromEntries(deliveryRuns.map((run) => [run.id, run])),
    [deliveryRuns]
  )
  const filteredLines = useMemo(() => {
    const lines = movement?.lines || []
    const query = lineSearch.trim().toLowerCase()
    if (!query) return lines

    return lines.filter((line) => {
      const product = productById[line.productId]
      return [
        line.productName,
        line.productSku,
        line.productId,
        line.sourceBatchNo,
        line.sourceBatchId,
        line.batchNo,
        line.batchNumber,
        line.stockBatchId,
        product?.name,
        product?.sku,
        product?.barcode,
      ].some((value) => String(value || '').toLowerCase().includes(query))
    })
  }, [lineSearch, movement?.lines, productById])

  const duplicateProductIds = useMemo(() => {
    const counts = {}
    for (const line of movement?.lines || []) {
      counts[line.productId] = (counts[line.productId] || 0) + 1
    }
    return new Set(Object.keys(counts).filter((productId) => counts[productId] > 1))
  }, [movement?.lines])

  useEffect(() => {
    setLineSearch('')
  }, [id])

  useEffect(() => {
    let active = true

    masterService
      .listAllDeliveryRuns({ pageSize: 100 })
      .then((items) => {
        if (active) setDeliveryRuns(items || [])
      })
      .catch(() => {
        if (active) setDeliveryRuns([])
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const createdByUserId = movement?.createdByUserId
    if (!createdByUserId) {
      setCreatedByName('')
      return undefined
    }

    let active = true
    setCreatedByName('')

    usersService
      .getUser(createdByUserId)
      .then((user) => {
        if (active) setCreatedByName(user?.username || '')
      })
      .catch(() => {
        if (active) setCreatedByName('')
      })

    return () => {
      active = false
    }
  }, [movement?.createdByUserId])

  useEffect(() => {
    const productIds = [
      ...new Set((movement?.lines || []).map((line) => line.productId).filter(Boolean)),
    ]

    if (!productIds.length) {
      setProductById({})
      setIsLoadingProducts(false)
      return undefined
    }

    let active = true
    setProductById({})
    setIsLoadingProducts(true)

    masterService
      .getProductsByIds(productIds)
      .then((fetchedProducts) => {
        if (!active) return
        setProductById(Object.fromEntries(fetchedProducts.map((product) => [product.id, product])))
      })
      .finally(() => {
        if (active) setIsLoadingProducts(false)
      })

    return () => {
      active = false
    }
  }, [movement?.lines])

  async function handleApply(event) {
    event.preventDefault()
    try {
      await applyMovement.mutateAsync(id)
      setIsApplyModalOpen(false)
      navigate(basePath)
    } catch {
      /* The mutation hook displays the API error. */
    }
  }

  async function handleCancel(event) {
    event.preventDefault()
    if (!cancelReason.trim()) return toast.error('A cancellation reason is required.')

    try {
      await cancelMovement.mutateAsync({ id, reason: cancelReason.trim() })
      setIsCancelModalOpen(false)
      navigate(basePath)
    } catch {
      /* The mutation hook displays the API error. */
    }
  }

  if (isLoading)
    return (
      <div className="panel p-8 text-sm text-text-muted">
        Loading vehicle {kind.toLowerCase()}...
      </div>
    )
  if (!movement)
    return (
      <EmptyState
        icon={<PackageX className="size-8" />}
        title={`Vehicle ${kind.toLowerCase()} not found`}
        description="The selected inventory movement could not be loaded."
      />
    )

  const number = movement[isUnloading ? 'unloadingNo' : 'loadingNo'] || movement.id
  const movementDate = movement[isUnloading ? 'unloadingDate' : 'loadingDate']
  const deliveryRun = movement?.deliveryRunId ? deliveryRunById[movement.deliveryRunId] : null
  const deliveryRunLabel = deliveryRun
    ? `${deliveryRun.code} - ${deliveryRun.name}`
    : movement.deliveryRunId || 'Not assigned'
  const isDraft = status === 'Draft'
  const actionPending = applyMovement.isPending || cancelMovement.isPending
  const totalQty = (movement.lines || []).reduce(
    (sum, line) => sum + Number(line.qtySmallest || 0),
    0
  )
  const totalValue = (movement.lines || []).reduce((sum, line) => {
    const unitCost = Number(line.unitCostSmallest || 0)
    const qty = Number(line.qtySmallest || 0)
    const sellingPrice = unitCost + (unitCost * 0.067)
    return sum + (sellingPrice * qty)
  }, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header className="panel" style={{ padding: 18 }}>
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            className="button-secondary"
            onClick={() => navigate(basePath)}
            style={{ height: 36 }}
          >
            <ArrowLeft size={16} /> Back to List
          </button>
          {isDraft ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button
                type="button"
                className="button-primary"
                disabled={actionPending || !movement.lines?.length}
                onClick={() => setIsApplyModalOpen(true)}
                style={{
                  backgroundColor: 'var(--color-teal)',
                  borderColor: 'var(--color-teal)',
                  color: '#000',
                  fontWeight: 700,
                  height: 38,
                  padding: '0 16px',
                }}
              >
                <CheckCircle2 size={16} />
                {isUnloading ? 'Unload to Main Inventory' : 'Load to Vehicle'}
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={actionPending}
                onClick={() => setIsCancelModalOpen(true)}
                style={{
                  color: 'var(--color-danger)',
                  borderColor: 'var(--color-danger)',
                  height: 38,
                  padding: '0 16px',
                }}
              >
                <XCircle size={16} /> Cancel {kind}
              </button>
            </div>
          ) : null}
        </div>

        <hr
          style={{
            border: 'none',
            borderBottom: '1px solid var(--color-border)',
            margin: '16px 0',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <h1
              className="mono"
              style={{ color: 'var(--color-text-primary)', fontSize: 24, fontWeight: 800 }}
            >
              {number}
            </h1>
            <StatusBadge status={status} />
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
            Vehicle {kind.toLowerCase()} inventory movement
          </p>
        </div>
      </header>

      {isDraft ? (
        <section
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 10,
            padding: '12px 14px',
          }}
        >
          <p style={{ color: 'var(--color-amber)', fontSize: 13, fontWeight: 700 }}>
            Draft — inventory has not moved yet
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 3 }}>
            Review the vehicle and batch quantities below, then apply or cancel this draft.
          </p>
        </section>
      ) : null}

      {status === 'Applied' ? (
        <section className="rounded-lg border border-green-700/50 bg-green-500/10 p-4 text-sm text-green-300">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={17} /> Applied
          </div>
          <p className="mt-1 text-green-300/80">
            Stock has been moved{' '}
            {isUnloading
              ? 'from the vehicle to main inventory'
              : 'from main inventory to the vehicle'}
            .
          </p>
        </section>
      ) : null}

      {showAdminLineControls ? (
        <section className="rounded-lg border border-amber-700/50 bg-amber-500/10 p-4 text-sm text-amber-300">
          <p className="font-semibold">Admin override</p>
          <p className="mt-1 text-amber-200/80">
            {isUnloading
              ? "You can edit or remove lines on this applied unloading. Doing so reverses the associated stock movement — it's blocked if that stock has already moved on elsewhere."
              : "You can add, edit, or remove lines on this applied loading. Adding or editing moves real stock from main to the vehicle immediately; editing or removing an existing line reverses its movement first — it's blocked if that stock has already moved on elsewhere."}
          </p>
        </section>
      ) : null}

      <section className="panel" style={{ padding: 18 }}>
        <div style={{ marginBottom: 14 }}>
          <p className="eyebrow">Movement Details</p>
          <h2
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 16,
              fontWeight: 750,
              marginTop: 4,
            }}
          >
            {kind} Summary
          </h2>
        </div>
        <div
          className="responsive-field-grid"
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(5, minmax(150px, 1fr))',
          }}
        >
          <InfoTile
            label="Vehicle"
            value={vehicle ? vehicleLabel(vehicle) : movement.vehicleLocationId}
          />
          {isUnloading ? (
            <InfoTile
              label="Applied Loading"
              value={movement.vehicleLoadingNo || movement.vehicleLoadingId || 'Not assigned'}
              mono
            />
          ) : null}
          <InfoTile label="Delivery Run" value={deliveryRunLabel} />
          <InfoTile label={`${kind} Date`} value={formatDateTime(movementDate)} mono />
          <InfoTile
            label="Created By"
            value={createdByName || formatUserId(movement.createdByUserId)}
            mono={!createdByName}
          />
          <InfoTile label="Applied On" value={formatDateTime(movement.appliedOn)} mono />
          <InfoTile label="Total Lines" value={movement.lines?.length ?? 0} mono />
          <InfoTile label="Total Value" value={formatLKR(totalValue)} mono />
        </div>
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            marginTop: 16,
            paddingTop: 14,
          }}
        >
          <p className="form-label">Notes</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 6 }}>
            {movement.notes || `No notes recorded for this vehicle ${kind.toLowerCase()}.`}
          </p>
        </div>
        {movement.cancelReason ? (
          <div
            style={{
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              marginTop: 12,
              padding: 12,
            }}
          >
            <p className="form-label">Cancel Reason</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 6 }}>
              {movement.cancelReason}
            </p>
          </div>
        ) : null}
      </section>

      <section className="panel" style={{ padding: 18 }}>
        <div
          style={{
            alignItems: 'flex-end',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div>
            <p className="eyebrow">Stock Lines</p>
            <h2
              style={{
                color: 'var(--color-text-primary)',
                fontSize: 16,
                fontWeight: 750,
                marginTop: 4,
              }}
            >
              Batch Movement Lines
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 4 }}>
              {lineSearch.trim()
                ? `${filteredLines.length} of ${movement.lines?.length || 0} batch lines match`
                : `${movement.lines?.length || 0} batch line${movement.lines?.length === 1 ? '' : 's'} in this ${kind.toLowerCase()}`}
            </p>
            {duplicateProductIds.size > 0 ? (
              <p style={{ color: 'var(--color-amber)', fontSize: 12, marginTop: 4, fontWeight: 700 }}>
                ⚠ {duplicateProductIds.size} product{duplicateProductIds.size === 1 ? ' has' : 's have'} more
                than one line (highlighted below) — check the Batch No column and remove the extra one(s).
              </p>
            ) : null}
          </div>
          <div style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
            {!isUnloading && showAdminLineControls ? (
              <button
                type="button"
                className="button-primary"
                disabled={adminLineActionPending}
                onClick={() => setIsAddLineModalOpen(true)}
                style={{ height: 38, whiteSpace: 'nowrap' }}
              >
                <Plus size={15} /> Add Line
              </button>
            ) : null}
            {movement.lines?.length ? (
            <div
              style={{ minWidth: 240, position: 'relative', width: 'min(100%, 360px)' }}
            >
              <Search
                aria-hidden="true"
                size={15}
                style={{
                  color: 'var(--color-text-muted)',
                  left: 11,
                  pointerEvents: 'none',
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
              <input
                aria-label="Search batch movement lines"
                className="form-input"
                type="text"
                value={lineSearch}
                onChange={(event) => setLineSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setLineSearch('')
                }}
                placeholder="Search product name, SKU, or batch..."
                style={{ height: 38, paddingLeft: 34, paddingRight: lineSearch ? 34 : 10 }}
              />
              {lineSearch ? (
                <button
                  aria-label="Clear stock line search"
                  type="button"
                  onClick={() => setLineSearch('')}
                  style={{
                    alignItems: 'center',
                    background: 'transparent',
                    border: 0,
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    padding: 4,
                    position: 'absolute',
                    right: 7,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>
          ) : null}
          </div>
        </div>
        {movement.lines?.length ? (
          <div className="responsive-table-shell" style={{ overflowX: 'auto' }}>
            <table
              className="data-table master-table-compact"
              style={{ minWidth: 760, tableLayout: 'fixed', width: '100%' }}
            >
              <colgroup>
                <col style={{ width: showAdminLineControls ? '22%' : '26%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '16%' }} />
                {showAdminLineControls ? <col style={{ width: '12%' }} /> : null}
              </colgroup>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Batch No</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Selling Price</th>
                  <th style={{ textAlign: 'right' }}>MRP</th>
                  <th style={{ textAlign: 'right' }}>Value</th>
                  {showAdminLineControls ? <th style={{ textAlign: 'right' }}>Admin</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredLines.map((line) => {
                  const productName = line.productName || productById[line.productId]?.name
                  const unitCost = Number(line.unitCostSmallest || 0)
                  const qty = Number(line.qtySmallest || 0)
                  const sellingPrice = unitCost + (unitCost * 0.067)
                  const value = sellingPrice * qty
                  const isEditingThisLine = editingLineId === line.id
                  const isPossibleDuplicate = duplicateProductIds.has(line.productId)

                  return (
                    <tr
                      key={line.id}
                      style={
                        isPossibleDuplicate
                          ? { background: 'rgba(245, 158, 11, 0.08)' }
                          : undefined
                      }
                    >
                      <td>
                        <strong style={{ color: 'var(--color-text-primary)', display: 'block' }}>
                          {productName ||
                            (isLoadingProducts ? 'Loading product...' : 'Product name unavailable')}
                        </strong>
                        <span className="product-sku-badge mono">{line.productSku}</span>
                        {isPossibleDuplicate ? (
                          <span
                            style={{
                              display: 'inline-block',
                              marginTop: 4,
                              fontSize: 10,
                              fontWeight: 800,
                              color: 'var(--color-amber)',
                            }}
                          >
                            ⚠ multiple lines for this product
                          </span>
                        ) : null}
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {line.sourceBatchNo || line.batchNo || '—'}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                        {isEditingThisLine ? (
                          <input
                            type="number"
                            min="1"
                            className="form-input"
                            autoFocus
                            value={editingQty}
                            onChange={(event) => setEditingQty(event.target.value)}
                            style={{ height: 30, textAlign: 'right', width: 90 }}
                          />
                        ) : (
                          formatNumber(qty)
                        )}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {formatLKR(sellingPrice)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {formatLKR(line.mrp)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatLKR(value)}
                      </td>
                      {showAdminLineControls ? (
                        <td style={{ textAlign: 'right' }}>
                          {isEditingThisLine ? (
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="button-primary"
                                disabled={adminLineActionPending}
                                onClick={() => saveEditingLine(line.id)}
                                style={{ height: 28, fontSize: 11, padding: '0 8px' }}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="button-secondary"
                                disabled={adminLineActionPending}
                                onClick={cancelEditingLine}
                                style={{ height: 28, fontSize: 11, padding: '0 8px' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                aria-label="Edit line quantity"
                                className="button-secondary"
                                disabled={adminLineActionPending}
                                onClick={() => startEditingLine(line)}
                                style={{ height: 28, padding: '0 8px' }}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                aria-label="Remove line"
                                className="button-secondary"
                                disabled={adminLineActionPending}
                                onClick={() => deleteAppliedLine(line.id)}
                                style={{ color: 'var(--color-danger)', height: 28, padding: '0 8px' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
                {!filteredLines.length ? (
                  <tr>
                    <td
                      colSpan={showAdminLineControls ? 7 : 6}
                      style={{ color: 'var(--color-text-muted)', padding: 24, textAlign: 'center' }}
                    >
                      No stock lines match &ldquo;{lineSearch.trim()}&rdquo;.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<PackageX className="size-8" />}
            title="No stock lines"
            description="No batch movement lines were recorded."
          />
        )}
      </section>

      {isApplyModalOpen ? (
        <Modal
          open={isApplyModalOpen}
          onOpenChange={setIsApplyModalOpen}
          title={isUnloading ? 'Unload to Main Inventory' : 'Load Stock to Vehicle'}
          description="Review the movement details before confirming."
          maxWidth="520px"
          contentStyle={{ borderRadius: 12, overflow: 'hidden', padding: 24 }}
        >
          <form
            onSubmit={handleApply}
            style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
          >
            <div
              style={{
                display: 'grid',
                gap: 10,
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              }}
            >
              <InfoTile
                label="Vehicle"
                value={vehicle ? vehicleLabel(vehicle) : movement.vehicleLocationId}
              />
              <InfoTile label="Lines" value={movement.lines?.length || 0} mono />
              <InfoTile label="Total Qty" value={formatNumber(totalQty)} mono />
            </div>
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: 8,
                color: 'var(--color-amber)',
                fontSize: 13,
                lineHeight: 1.6,
                padding: 12,
              }}
            >
              <strong style={{ display: 'block', marginBottom: 3 }}>
                Inventory movement warning
              </strong>
              <span style={{ color: 'var(--color-text-muted)' }}>
                {isUnloading
                  ? 'All listed stock will move from the vehicle to main inventory.'
                  : 'All listed stock will move from main inventory to the selected vehicle.'}{' '}
                This action cannot be undone.
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="button-secondary"
                disabled={applyMovement.isPending}
                onClick={() => setIsApplyModalOpen(false)}
              >
                Keep Draft
              </button>
              <button
                type="submit"
                className="button-primary"
                disabled={applyMovement.isPending}
                style={{
                  backgroundColor: 'var(--color-teal)',
                  borderColor: 'var(--color-teal)',
                  color: '#000',
                  fontWeight: 600,
                }}
              >
                {applyMovement.isPending
                  ? 'Processing...'
                  : isUnloading
                    ? 'Confirm Unloading'
                    : 'Confirm Loading'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {isCancelModalOpen ? (
        <Modal
          open={isCancelModalOpen}
          onOpenChange={setIsCancelModalOpen}
          title={`Cancel Vehicle ${kind}`}
          maxWidth="520px"
          contentStyle={{ borderRadius: 12, overflow: 'hidden', padding: 24 }}
        >
          <form
            onSubmit={handleCancel}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className="form-label" style={{ fontSize: 11 }}>
                Cancellation Reason <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <textarea
                className="form-input"
                required
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder={`State the reason why this vehicle ${kind.toLowerCase()} is cancelled...`}
                rows={3}
                style={{
                  padding: 10,
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  color: '#fff',
                  background: 'rgba(0,0,0,0.1)',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="button-secondary"
                disabled={cancelMovement.isPending}
                onClick={() => setIsCancelModalOpen(false)}
              >
                Close
              </button>
              <button
                type="submit"
                className="button-primary"
                disabled={cancelMovement.isPending}
                style={{ backgroundColor: 'var(--color-danger)', border: 'none', color: '#fff' }}
              >
                {cancelMovement.isPending ? 'Processing...' : 'Confirm Cancel'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {!isUnloading && showAdminLineControls ? (
        <AdminAddLoadingLineModal
          open={isAddLineModalOpen}
          onOpenChange={setIsAddLineModalOpen}
          onAdd={addAppliedLine}
          isSubmitting={addAppliedLoadingLine.isPending}
        />
      ) : null}
    </div>
  )
}
