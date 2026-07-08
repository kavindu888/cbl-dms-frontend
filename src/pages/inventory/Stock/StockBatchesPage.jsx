import dayjs from 'dayjs'
import { ArrowLeft, CalendarDays, RefreshCw, AlertTriangle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { useStockBatches, useStockMovements } from '@/hooks/useStock'
import { masterService } from '@/services/api/masterService'

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function StockBatchesPage() {
  const { productId } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [isLoadingProduct, setIsLoadingProduct] = useState(false)

  // Movements filters state
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // Hooks
  const { data: batches, isLoading: isLoadingBatches, refetch: refetchBatches } = useStockBatches(productId)
  
  // Memoized query params for movements
  const movementsParams = useMemo(() => {
    return {
      productId,
      from: from || undefined,
      to: to || undefined,
    }
  }, [productId, from, to])

  const { data: rawMovements, isLoading: isLoadingMovements, refetch: refetchMovements } = useStockMovements(movementsParams)

  // Load product details
  useEffect(() => {
    if (!productId) return
    setIsLoadingProduct(true)
    masterService.getProduct(productId)
      .then(setProduct)
      .catch((err) => toast.error('Failed to load product details.'))
      .finally(() => setIsLoadingProduct(false))
  }, [productId])

  function handleRefresh() {
    refetchBatches()
    refetchMovements()
  }

  // Check if any batch expires within 30 days
  const hasExpiringSoonBatch = useMemo(() => {
    if (!batches || batches.length === 0) return false
    return batches.some((batch) => {
      if (!batch.expiryDate) return false
      const diff = dayjs(batch.expiryDate).diff(dayjs(), 'day')
      return diff >= 0 && diff <= 30
    })
  }, [batches])

  // Expiry styling
  function getExpiryStyle(expiryDate) {
    if (!expiryDate) return { color: 'var(--color-text-muted)' }
    const diff = dayjs(expiryDate).diff(dayjs(), 'day')
    if (diff <= 0) return { color: 'var(--color-danger)', fontWeight: 600 }
    if (diff <= 30) return { color: 'var(--color-warning)', fontWeight: 600 }
    return { color: 'var(--color-teal)' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/inventory/stock')}
            className="button-secondary"
            style={{ height: 36, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--color-text-dim)' }}>
              Stock Batches & Movements
            </span>
            <h1 className="mono" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
              {product ? `${product.sku} - ${product.name}` : 'Product Details'}
            </h1>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="button-secondary"
          style={{ height: 40, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Expiring Soon Banner */}
      {hasExpiringSoonBatch && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, backgroundColor: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 6, color: 'var(--color-warning)' }}>
          <AlertTriangle size={18} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Warning: Some stock batches expire within 30 days. Stage these for returns or adjust.</span>
        </div>
      )}

      {/* Product Information Card */}
      <div className="panel" style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div>
          <p style={{ fontSize: 10, color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>UOM Base</p>
          <p style={{ fontWeight: 600, marginTop: 4 }}>{product?.uomBase || '-'}</p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Unit Cost</p>
          <p className="mono" style={{ fontWeight: 600, marginTop: 4 }}>LKR {formatCurrency(product?.unitCost)}</p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Unit Price</p>
          <p className="mono" style={{ fontWeight: 600, marginTop: 4 }}>LKR {formatCurrency(product?.unitPrice)}</p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Reorder Level</p>
          <p style={{ fontWeight: 600, marginTop: 4 }}>{product?.minValue || '-'}</p>
        </div>
      </div>

      {/* Batches Panel */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: 14, borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>FEFO Ordered Stock Batches</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table master-table-compact">
            <thead>
              <tr>
                <th>Batch No</th>
                <th>Expiry Date</th>
                <th style={{ textAlign: 'right' }}>Qty Received</th>
                <th style={{ textAlign: 'right' }}>Qty Available</th>
                <th style={{ textAlign: 'right' }}>Reserved</th>
                <th style={{ textAlign: 'right' }}>Sellable</th>
                <th style={{ textAlign: 'right' }}>Unit Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingBatches ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-dim)' }}>
                    Loading stock batches...
                  </td>
                </tr>
              ) : !batches || batches.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-dim)' }}>
                    No stock batches found for this product.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const sellable = Number(batch.qtyAvailable || 0) - Number(batch.qtyReserved || 0)
                  const uom = batch.smallestUnitCode || 'PCS'
                  return (
                    <tr key={batch.id}>
                      <td className="mono" style={{ fontWeight: 700, color: 'var(--color-amber)' }}>
                        {batch.batchNo}
                      </td>
                      <td className="mono" style={getExpiryStyle(batch.expiryDate)}>
                        {batch.expiryDate ? dayjs(batch.expiryDate).format('DD MMM YYYY') : '-'}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {formatNumber(batch.qtyReceived)} <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>{uom}</span>
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatNumber(batch.qtyAvailable)} <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>{uom}</span>
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {formatNumber(batch.qtyReserved)} <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>{uom}</span>
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: sellable <= 0 ? 'var(--color-danger)' : 'var(--color-teal)' }}>
                        {formatNumber(sellable)} <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>{uom}</span>
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {formatCurrency(batch.unitCostSmallest || batch.unitCost || 0)}
                      </td>
                      <td>
                        <StatusBadge status={batch.status || 'Active'} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movements Ledger Panel */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: 14, borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Stock Movements Ledger</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>From:</span>
            <input
              type="date"
              className="form-input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ height: 32, padding: '0 8px', fontSize: 12 }}
            />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>To:</span>
            <input
              type="date"
              className="form-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ height: 32, padding: '0 8px', fontSize: 12 }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table master-table-compact">
            <thead>
              <tr>
                <th>Date</th>
                <th>Movement Type</th>
                <th style={{ textAlign: 'right' }}>Quantity</th>
                <th>Reference</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingMovements ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-dim)' }}>
                    Loading stock movements...
                  </td>
                </tr>
              ) : !rawMovements || rawMovements.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-dim)' }}>
                    No stock movements recorded in this date range.
                  </td>
                </tr>
              ) : (
                rawMovements.map((movement) => {
                  const isNegative = Number(movement.quantity || 0) < 0
                  const uom = batches?.[0]?.smallestUnitCode || 'PCS'
                  return (
                    <tr key={movement.id}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <CalendarDays size={13} color="var(--color-text-dim)" />
                          {dayjs(movement.occurredOn || movement.createdAt).format('DD MMM YYYY HH:mm')}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={movement.movementType} />
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: isNegative ? 'var(--color-danger)' : 'var(--color-teal)' }}>
                        {isNegative ? '' : '+'}{formatNumber(movement.quantity)} <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>{uom}</span>
                      </td>
                      <td className="mono" style={{ color: 'var(--color-amber)' }}>
                        {movement.referenceId || '-'}
                      </td>
                      <td>{movement.notes || '-'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
