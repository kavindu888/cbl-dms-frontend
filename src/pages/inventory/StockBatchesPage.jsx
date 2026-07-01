import { RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { inventoryService } from '@services/api/inventoryService'
import { masterService } from '@services/api/masterService'
import { firstValidationMessage, positiveInteger, required } from '@/utils/validation'

function getErrorMessage(error, fallback) {
  return error?.message || fallback
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatBoolean(value) {
  return value ? 'Yes' : 'No'
}

function productLabel(product) {
  if (!product) return ''
  return `${product.sku || product.id} - ${product.name || 'Unnamed product'}`
}

function SelectControl({ children }) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {children}
      <span
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--color-text-dim)',
          fontSize: 12,
        }}
      >
        v
      </span>
    </div>
  )
}

function EmptyRow({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-sm text-text-muted">
        {message}
      </td>
    </tr>
  )
}

function LoadingRow({ colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-sm text-text-muted">
        Loading batches...
      </td>
    </tr>
  )
}

function ErrorRow({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-sm text-danger">
        {message}
      </td>
    </tr>
  )
}

function BatchSummary({ batches }) {
  const summary = useMemo(() => {
    return batches.reduce(
      (current, batch) => ({
        received: current.received + Number(batch.qtyReceived || 0),
        available: current.available + Number(batch.qtyAvailable || 0),
        reserved: current.reserved + Number(batch.qtyReserved || 0),
        sellable: current.sellable + Number(batch.sellableQty || 0),
        expiringSoon: current.expiringSoon + (batch.isExpiringSoon ? 1 : 0),
      }),
      { received: 0, available: 0, reserved: 0, sellable: 0, expiringSoon: 0 }
    )
  }, [batches])

  const metrics = [
    ['Batches', batches.length],
    ['Received', formatNumber(summary.received)],
    ['Available', formatNumber(summary.available)],
    ['Reserved', formatNumber(summary.reserved)],
    ['Sellable', formatNumber(summary.sellable)],
    ['Expiring Soon', summary.expiringSoon],
  ]

  return (
    <div className="panel" style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(6, minmax(110px, 1fr))', gap: 12 }}>
      {metrics.map(([label, value]) => (
        <div key={label} style={{ minWidth: 0 }}>
          <p style={{ color: 'var(--color-text-dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</p>
          <p style={{ marginTop: 4, color: 'var(--color-text-primary)', fontWeight: 650 }}>{value}</p>
        </div>
      ))}
    </div>
  )
}

function BatchTable({ batches, isLoading, error }) {
  return (
    <div className="panel responsive-table-shell" style={{ padding: 14, display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <div style={{ overflow: 'auto', flex: 1 }}>
        <table className="data-table master-table-compact">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product ID</th>
              <th>Product SKU</th>
              <th>Location ID</th>
              <th>Location</th>
              <th>Batch No</th>
              <th>GRN Line ID</th>
              <th>Received</th>
              <th>Available</th>
              <th>Reserved</th>
              <th>Sellable</th>
              <th>Unit Cost Smallest</th>
              <th>Selling Price</th>
              <th>MRP</th>
              <th>Expiry</th>
              <th>Received Date</th>
              <th>Status</th>
              <th>Expiring Soon</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <LoadingRow colSpan={18} /> : null}
            {!isLoading && error ? <ErrorRow colSpan={18} message={error} /> : null}
            {!isLoading && !error && batches.length === 0 ? <EmptyRow colSpan={18} message="No batches found." /> : null}
            {!isLoading && !error ? batches.map((item) => {
              const status = item.isExpiringSoon ? 'Expiring Soon' : item.status
              return (
                <tr key={item.id}>
                  <td className="mono">{item.id}</td>
                  <td className="mono">{item.productId}</td>
                  <td><span className="mono" style={{ color: 'var(--color-amber)' }}>{item.productSku}</span></td>
                  <td className="mono">{item.stockLocationId}</td>
                  <td>{item.stockLocationName || item.locationName || '-'}</td>
                  <td>{item.batchNo || '-'}</td>
                  <td className="mono">{item.grnLineId}</td>
                  <td className="amount">{formatNumber(item.qtyReceived)}</td>
                  <td className="amount-primary">{formatNumber(item.qtyAvailable)}</td>
                  <td className="amount">{formatNumber(item.qtyReserved)}</td>
                  <td className="amount-success">{formatNumber(item.sellableQty)}</td>
                  <td className="amount">{formatCurrency(item.unitCostSmallest)}</td>
                  <td className="amount">{formatCurrency(item.sellingPrice)}</td>
                  <td className="amount">{formatCurrency(item.mrp)}</td>
                  <td>{formatDate(item.expiryDate)}</td>
                  <td>{formatDate(item.receivedDate)}</td>
                  <td><StatusBadge status={status} /></td>
                  <td>{formatBoolean(item.isExpiringSoon)}</td>
                </tr>
              )
            }) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function StockBatchesPage() {
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [withinDays, setWithinDays] = useState(30)
  const [batches, setBatches] = useState([])
  const [mode, setMode] = useState('product')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProducts() {
      setIsLoadingProducts(true)
      try {
        const pageSize = 100
        let page = 1
        let allProducts = []
        let hasMore = true

        while (hasMore) {
          const result = await masterService.listProducts({ page, pageSize, sortBy: 'sku', sortDir: 'asc' })
          const items = result.items || []
          allProducts = [...allProducts, ...items]
          const totalPages = result.totalPages || Math.ceil((result.totalItems || allProducts.length) / pageSize)
          hasMore = page < totalPages && items.length > 0
          page += 1
        }

        setProducts(allProducts)
      } catch (loadError) {
        toast.error(getErrorMessage(loadError, 'Unable to load products.'))
      } finally {
        setIsLoadingProducts(false)
      }
    }

    loadProducts()
  }, [])

  const loadProductBatches = useCallback(async () => {
    const selectedProductId = productId.trim()
    const validationMessage = firstValidationMessage([
      required(selectedProductId, 'Select or enter a product first.'),
    ])
    if (validationMessage) {
      toast.error(validationMessage)
      return
    }

    setMode('product')
    setIsLoading(true)
    setError('')
    try {
      const items = await inventoryService.listStockBatches(selectedProductId)
      setBatches(items)
    } catch (loadError) {
      setBatches([])
      setError(getErrorMessage(loadError, 'Unable to load stock batches.'))
    } finally {
      setIsLoading(false)
    }
  }, [productId])

  const loadExpiringBatches = useCallback(async () => {
    const validationMessage = firstValidationMessage([
      positiveInteger(withinDays, 'Expiry window must be a positive whole number.'),
    ])
    if (validationMessage) {
      toast.error(validationMessage)
      return
    }
    const days = Number(withinDays)
    setWithinDays(days)
    setMode('expiring')
    setIsLoading(true)
    setError('')
    try {
      const items = await inventoryService.listExpiringBatches({ withinDays: days })
      setBatches(items)
    } catch (loadError) {
      setBatches([])
      setError(getErrorMessage(loadError, 'Unable to load expiring batches.'))
    } finally {
      setIsLoading(false)
    }
  }, [withinDays])

  const title = mode === 'expiring' ? `Expiring Batches - Next ${withinDays} Days` : 'Product Batches'

  return (
    <div className="responsive-page" style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>Stock Batches</h1>
          <p style={{ marginTop: 6, color: 'var(--color-text-muted)', fontSize: 14 }}>
            View backend stock batch details by product or by expiry window.
          </p>
        </div>
        <button type="button" className="button-secondary" onClick={mode === 'expiring' ? loadExpiringBatches : loadProductBatches} disabled={isLoading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="panel responsive-filter-bar" style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr auto 150px auto', gap: 12 }}>
        <SelectControl>
          <select
            className="form-input"
            value={productId}
            disabled={isLoadingProducts}
            onChange={(event) => setProductId(event.target.value)}
            style={{ appearance: 'none', backgroundImage: 'none', paddingRight: 36 }}
          >
            <option value="">{isLoadingProducts ? 'Loading products...' : 'Select product'}</option>
            {products.map((product) => <option key={product.id} value={product.id}>{productLabel(product)}</option>)}
          </select>
        </SelectControl>
        <input
          className="form-input mono"
          value={productId}
          placeholder="Or paste product ID"
          onChange={(event) => setProductId(event.target.value)}
        />
        <button type="button" className="button-primary" onClick={loadProductBatches} disabled={isLoading}>
          <Search size={16} /> Load Batches
        </button>
        <input
          className="form-input"
          type="number"
          min="1"
          value={withinDays}
          onChange={(event) => setWithinDays(event.target.value)}
          aria-label="Expiring within days"
        />
        <button type="button" className="button-secondary" onClick={loadExpiringBatches} disabled={isLoading}>
          Expiring
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <h2 style={{ fontSize: 16, fontWeight: 650 }}>{title}</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
          Showing {batches.length} batch{batches.length === 1 ? '' : 'es'}
        </p>
      </div>

      <BatchSummary batches={batches} />
      <BatchTable batches={batches} isLoading={isLoading} error={error} />
    </div>
  )
}



