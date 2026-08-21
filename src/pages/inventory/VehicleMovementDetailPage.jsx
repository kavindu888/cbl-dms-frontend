import { ArrowLeft, CheckCircle2, PackageX, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import EmptyState from '@components/ui/EmptyState'
import Modal from '@components/ui/Modal'
import StatusBadge from '@components/ui/StatusBadge'
import { useVehicles } from '@/hooks/useVehicle'
import { masterService } from '@/services/api/masterService'
import { usersService } from '@/services/api/usersService'
import { formatDateTime } from '@/utils/formatDate'
import { formatLKR } from '@/utils/formatCurrency'
import {
  formatNumber,
  movementStatusLabel,
  returnReasonLabel,
  unloadingTypeLabel,
  vehicleLabel,
} from './vehicleMovementUtils'

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
  const [deliveryRuns, setDeliveryRuns] = useState([])
  const [productById, setProductById] = useState({})
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [createdByName, setCreatedByName] = useState('')
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const vehicle = vehicles.find((item) => item.id === movement?.vehicleLocationId)
  const status = movementStatusLabel(movement?.status)
  const isUnloading = kind === 'Unloading'
  const deliveryRunById = useMemo(
    () => Object.fromEntries(deliveryRuns.map((run) => [run.id, run])),
    [deliveryRuns]
  )
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

    Promise.allSettled(productIds.map((productId) => masterService.getProduct(productId)))
      .then((results) => {
        if (!active) return

        const products = {}
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            products[productIds[index]] = result.value
          }
        })
        setProductById(products)
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
        <div style={{ marginBottom: 14 }}>
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
            {movement.lines?.length || 0} batch line{movement.lines?.length === 1 ? '' : 's'} in
            this draft
          </p>
        </div>
        {movement.lines?.length ? (
          <div className="responsive-table-shell" style={{ overflowX: 'auto' }}>
            <table
              className="data-table master-table-compact"
              style={{ minWidth: 760, tableLayout: 'fixed', width: '100%' }}
            >
              <colgroup>
                <col style={{ width: '30%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Selling Price</th>
                  <th style={{ textAlign: 'right' }}>MRP</th>
                  <th style={{ textAlign: 'right' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {movement.lines.map((line) => {
                  const productName = line.productName || productById[line.productId]?.name
                  const unitCost = Number(line.unitCostSmallest || 0)
                  const qty = Number(line.qtySmallest || 0)
                  const sellingPrice = unitCost + (unitCost * 0.067)
                  const value = sellingPrice * qty

                  return (
                    <tr key={line.id}>
                      <td>
                        <strong style={{ color: 'var(--color-text-primary)', display: 'block' }}>
                          {productName ||
                            (isLoadingProducts ? 'Loading product...' : 'Product name unavailable')}
                        </strong>
                        <span className="product-sku-badge mono">{line.productSku}</span>
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatNumber(qty)}
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
                    </tr>
                  )
                })}
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
    </div>
  )
}
