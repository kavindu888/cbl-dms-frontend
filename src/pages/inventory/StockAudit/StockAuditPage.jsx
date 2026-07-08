import dayjs from 'dayjs'
import { ClipboardList, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { inventoryService } from '@/services/api/inventoryService'
import { masterService } from '@/services/api/masterService'

function number(value) {
  return Number(value || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 })
}

function expiryStyle(value) {
  if (!value) return undefined
  const days = dayjs(value).startOf('day').diff(dayjs().startOf('day'), 'day')
  if (days < 0) return { color: 'var(--color-danger)', fontWeight: 700 }
  if (days <= 30) return { color: 'var(--color-amber)', fontWeight: 700 }
  return undefined
}

const movementColors = {
  'Grn Receipt': 'var(--color-success)',
  'Sales Issue': 'var(--color-danger)',
  'Sales Return': 'var(--color-blue)',
  'Purchase Return': 'var(--color-warning)',
  'Adjustment In': 'var(--color-teal)',
  'Adjustment Out': 'var(--color-amber)',
}

function Metric({ label, value, tone = 'var(--color-text-primary)' }) {
  return (
    <div style={{ padding: 14, border: '1px solid var(--color-border)', borderRadius: 8 }}>
      <span className="form-label">{label}</span>
      <div className="mono" style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: tone }}>
        {number(value)}
      </div>
    </div>
  )
}

export default function StockAuditPage() {
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [audit, setAudit] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    masterService
      .listProducts({ page: 1, pageSize: 50, isActive: true })
      .then((result) => setProducts(result.items || []))
      .catch((error) => toast.error(error.message || 'Unable to load products.'))
  }, [])

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []
    return products
      .filter(
        (product) =>
          product.sku?.toLowerCase().includes(term) ||
          product.name?.toLowerCase().includes(term)
      )
      .slice(0, 12)
  }, [products, query])

  async function selectProduct(product) {
    setSelectedProduct(product)
    setQuery(`${product.sku} - ${product.name}`)
    setIsLoading(true)
    setAudit(null)
    try {
      const [position, batches, movements, staged] = await Promise.all([
        inventoryService.getStockAvailability(product.id),
        inventoryService.listStockBatches(product.id),
        inventoryService.listStockMovements({ productId: product.id, page: 1, pageSize: 50 }),
        inventoryService.listReturnStock({ productId: product.id }),
      ])
      setAudit({
        position,
        batches: [...(batches || [])].sort((a, b) => {
          if (!a.expiryDate) return 1
          if (!b.expiryDate) return -1
          return new Date(a.expiryDate) - new Date(b.expiryDate)
        }),
        movements: movements || [],
        staged: staged?.items || [],
      })
    } catch (error) {
      toast.error(error.message || 'Unable to load the stock audit.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>Stock Audit</h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Trace current stock, FEFO batches, movements, and supplier-return staging by product.
        </p>
      </div>

      <section className="panel" style={{ padding: 14, position: 'relative', zIndex: 5 }}>
        <label className="form-label">Product SKU or name</label>
        <div style={{ position: 'relative', maxWidth: 620 }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 12, top: 12, color: 'var(--color-text-dim)' }}
          />
          <input
            className="form-input"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setSelectedProduct(null)
              setAudit(null)
            }}
            placeholder="Search SKU or product name..."
            style={{ width: '100%', paddingLeft: 38 }}
          />
          {!selectedProduct && matches.length ? (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 'calc(100% + 4px)',
                border: '1px solid var(--color-border)',
                borderRadius: 7,
                background: 'var(--color-bg-surface)',
                boxShadow: 'var(--shadow-lg)',
                maxHeight: 280,
                overflowY: 'auto',
              }}
            >
              {matches.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => selectProduct(product)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    display: 'flex',
                    gap: 10,
                    borderBottom: '1px solid var(--color-border)',
                    background: 'transparent',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span className="product-sku-badge mono">{product.sku}</span>
                  <span>{product.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {isLoading ? (
        <section className="panel" style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading stock flow...
        </section>
      ) : audit ? (
        <>
          <section className="panel" style={{ padding: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Current Position</h2>
            <div className="responsive-field-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              <Metric label="Total Available" value={audit.position.totalAvailable} tone="var(--color-teal)" />
              <Metric label="Total Reserved" value={audit.position.totalReserved} tone="var(--color-amber)" />
              <Metric label="Sellable" value={audit.position.sellable} tone="var(--color-blue)" />
            </div>
          </section>

          <AuditTable title="Active Batches" count={audit.batches.length} minWidth={1040}>
            <thead><tr><th>Batch No</th><th>Expiry</th><th style={{ textAlign: 'right' }}>Received</th><th style={{ textAlign: 'right' }}>Available</th><th style={{ textAlign: 'right' }}>Reserved</th><th>Status</th><th style={{ textAlign: 'right' }}>Cost</th><th>Source (GRN Line)</th></tr></thead>
            <tbody>
              {audit.batches.length ? audit.batches.map((batch, index) => (
                <tr key={batch.id}>
                  <td className="mono">{batch.batchNo || '-'}</td>
                  <td className="mono" style={expiryStyle(batch.expiryDate)}>{batch.expiryDate ? dayjs(batch.expiryDate).format('DD MMM YYYY') : '-'} {index === audit.batches.findIndex((item) => Number(item.sellableQty) > 0) ? <span style={{ color: 'var(--color-teal)', fontSize: 10 }}>FEFO FIRST</span> : null}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{number(batch.qtyReceived)}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{number(batch.qtyAvailable)}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{number(batch.qtyReserved)}</td>
                  <td><StatusBadge status={batch.status} /></td>
                  <td className="mono" style={{ textAlign: 'right' }}>{number(batch.unitCostSmallest)}</td>
                  <td className="mono">{batch.grnLineId || '-'}</td>
                </tr>
              )) : <EmptyRow columns={8} />}
            </tbody>
          </AuditTable>

          <AuditTable title="Recent Movements" count={audit.movements.length} minWidth={940}>
            <thead><tr><th>Date</th><th>Type</th><th style={{ textAlign: 'right' }}>Qty</th><th>Reference Type</th><th>Reference ID</th><th>Notes</th></tr></thead>
            <tbody>
              {audit.movements.length ? audit.movements.map((movement) => (
                <tr key={movement.id} style={{ boxShadow: `inset 3px 0 ${movementColors[movement.movementType] || 'transparent'}` }}>
                  <td>{dayjs(movement.occurredOn).format('DD MMM YYYY HH:mm')}</td>
                  <td><StatusBadge status={movement.movementType} /></td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: Number(movement.quantity) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{Number(movement.quantity) > 0 ? '+' : ''}{number(movement.quantity)}</td>
                  <td>{movement.referenceType}</td>
                  <td className="mono">{movement.referenceId}</td>
                  <td>{movement.notes || '-'}</td>
                </tr>
              )) : <EmptyRow columns={6} />}
            </tbody>
          </AuditTable>

          <AuditTable title="Staged for Return" count={audit.staged.length} minWidth={720}>
            <thead><tr><th>Batch No</th><th>Expiry</th><th style={{ textAlign: 'right' }}>Qty</th><th>Reason</th><th>Status</th><th>Flagged On</th></tr></thead>
            <tbody>
              {audit.staged.length ? audit.staged.map((entry) => (
                <tr key={entry.id}>
                  <td className="mono">{entry.batchNo || '-'}</td>
                  <td className="mono" style={expiryStyle(entry.expiryDate)}>{entry.expiryDate ? dayjs(entry.expiryDate).format('DD MMM YYYY') : '-'}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{number(entry.qty)}</td>
                  <td><StatusBadge status={entry.reason} /></td>
                  <td><StatusBadge status={entry.status} /></td>
                  <td>{entry.flaggedOn ? dayjs(entry.flaggedOn).format('DD MMM YYYY HH:mm') : '-'}</td>
                </tr>
              )) : <EmptyRow columns={6} />}
            </tbody>
          </AuditTable>
        </>
      ) : (
        <section className="panel" style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: 'var(--color-text-muted)' }}>
          <div style={{ textAlign: 'center' }}><ClipboardList size={32} style={{ margin: '0 auto 8px' }} />Select a product to inspect its stock flow.</div>
        </section>
      )}
    </div>
  )
}

function AuditTable({ title, count, minWidth, children }) {
  return (
    <section className="panel" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '11px 14px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 800 }}>{title}</h2>
        <span className="mono" style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{count}</span>
      </div>
      <div style={{ overflowX: 'auto' }}><table className="data-table product-table-compact" style={{ minWidth }}>{children}</table></div>
    </section>
  )
}

function EmptyRow({ columns }) {
  return <tr><td colSpan={columns} style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)' }}>No records found.</td></tr>
}
