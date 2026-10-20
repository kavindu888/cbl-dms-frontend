import { AlertTriangle, RefreshCw, ShieldAlert, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { inventoryService } from '@/services/api/inventoryService'
import { formatDate, formatShortDateTime } from '@/utils'

function number(value) {
  return Number(value || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 })
}

function varianceColor(value) {
  const v = Number(value || 0)
  if (v < 0) return 'var(--color-danger)'
  if (v > 0) return 'var(--color-amber)'
  return 'var(--color-text-primary)'
}

function Tab({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '9px 16px',
        borderRadius: 7,
        border: active
          ? '1px solid color-mix(in srgb, var(--color-teal) 35%, transparent)'
          : '1px solid transparent',
        background: active ? 'color-mix(in srgb, var(--color-teal) 14%, transparent)' : 'transparent',
        color: active ? 'var(--color-teal)' : 'var(--color-text-muted)',
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      <Icon size={14} />
      {children}
    </button>
  )
}

// Two admin "integrity" reports pulled together on one page: the stocktake variance report (the
// actual theft/shrinkage-detection tool — system-expected stock vs what was physically counted),
// and the vehicle handling report (what each lorry run loaded vs sold vs brought back).
export default function StockIntegrityReportPage() {
  const [tab, setTab] = useState('stocktake')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>Stock Integrity Reports</h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Stocktake shortages and lorry-run accounting — where stock may be going missing.
        </p>
      </div>

      <div className="panel" style={{ padding: 6, display: 'flex', gap: 4, width: 'fit-content' }}>
        <Tab active={tab === 'stocktake'} onClick={() => setTab('stocktake')} icon={ShieldAlert}>
          Stocktake Variance
        </Tab>
        <Tab active={tab === 'vehicle'} onClick={() => setTab('vehicle')} icon={Truck}>
          Vehicle Handling
        </Tab>
      </div>

      {tab === 'stocktake' ? <StocktakeVarianceTab /> : <VehicleHandlingTab />}
    </div>
  )
}

function StocktakeVarianceTab() {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [minAbsVariance, setMinAbsVariance] = useState('')

  async function load() {
    setIsLoading(true)
    try {
      const params = {}
      if (minAbsVariance) params.minAbsVariance = minAbsVariance
      const result = await inventoryService.getStocktakeVarianceReport(params)
      setRows(result || [])
    } catch (error) {
      toast.error(error.message || 'Unable to load the stocktake variance report.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shortages = rows.filter((r) => Number(r.varianceQty) < 0)
  const totalShortageQty = shortages.reduce((sum, r) => sum + Math.abs(Number(r.varianceQty)), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <section className="panel" style={{ padding: 14 }}>
          <span className="form-label">Products With Variance</span>
          <div className="mono" style={{ marginTop: 6, fontSize: 24, fontWeight: 800 }}>{rows.length}</div>
        </section>
        <section className="panel" style={{ padding: 14 }}>
          <span className="form-label">Shortages (Counted &lt; Expected)</span>
          <div className="mono" style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: 'var(--color-danger)' }}>
            {shortages.length}
          </div>
        </section>
        <section className="panel" style={{ padding: 14 }}>
          <span className="form-label">Total Missing Qty (All Shortages)</span>
          <div className="mono" style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: 'var(--color-danger)' }}>
            {number(totalShortageQty)}
          </div>
        </section>
      </div>

      <section className="panel" style={{ padding: 14, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div>
          <label className="form-label">Minimum |variance| to show</label>
          <input
            className="form-input"
            type="number"
            min="0"
            step="any"
            value={minAbsVariance}
            onChange={(event) => setMinAbsVariance(event.target.value)}
            placeholder="0"
            style={{ width: 160 }}
          />
        </div>
        <button type="button" className="button-secondary" onClick={load} disabled={isLoading} style={{ height: 38 }}>
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </section>

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '11px 14px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800 }}>Expected vs Counted, worst shortage first</h2>
          <span className="mono" style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{rows.length}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table product-table-compact" style={{ minWidth: 1040 }}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Location</th>
                <th style={{ textAlign: 'right' }}>Expected</th>
                <th style={{ textAlign: 'right' }}>Counted</th>
                <th style={{ textAlign: 'right' }}>Variance</th>
                <th>Stocktake</th>
                <th>Completed</th>
                <th>Counted By</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</td></tr>
              ) : rows.length ? (
                rows.map((row) => (
                  <tr key={`${row.stocktakeId}-${row.productId}`}>
                    <td>
                      <div className="mono" style={{ color: 'var(--color-accent)', fontSize: 12 }}>{row.productSku}</div>
                      <div style={{ fontSize: 12 }}>{row.productName}</div>
                    </td>
                    <td>{row.stockLocationName}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{number(row.expectedQty)}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{number(row.countedQty)}</td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: varianceColor(row.varianceQty) }}>
                      {Number(row.varianceQty) > 0 ? '+' : ''}{number(row.varianceQty)}
                    </td>
                    <td className="mono">{row.stocktakeNo}</td>
                    <td className="mono">{row.completedOn ? formatDate(row.completedOn) : '-'}</td>
                    <td style={{ fontSize: 12 }}>{row.createdByUserName || 'Unknown user'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No variance found — every completed stocktake matched expected stock exactly.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function VehicleHandlingTab() {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  async function load() {
    setIsLoading(true)
    try {
      const result = await inventoryService.getVehicleHandlingReport()
      setRows(result || [])
    } catch (error) {
      toast.error(error.message || 'Unable to load the vehicle handling report.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const unexplained = rows.filter((r) => r.isUnloaded && Math.abs(Number(r.varianceQty)) > 0.01)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <section className="panel" style={{ padding: 14 }}>
          <span className="form-label">Loadings Reviewed</span>
          <div className="mono" style={{ marginTop: 6, fontSize: 24, fontWeight: 800 }}>{rows.length}</div>
        </section>
        <section className="panel" style={{ padding: 14 }}>
          <span className="form-label">Unloaded Runs With Unexplained Qty</span>
          <div className="mono" style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: unexplained.length ? 'var(--color-danger)' : 'var(--color-teal)' }}>
            {unexplained.length}
          </div>
        </section>
      </div>

      <section className="panel" style={{ padding: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="button-secondary" onClick={load} disabled={isLoading} style={{ height: 38 }}>
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </section>

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '11px 14px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800 }}>Loaded vs Sold vs Unloaded, per lorry run</h2>
          <span className="mono" style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{rows.length}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table product-table-compact" style={{ minWidth: 1180 }}>
            <thead>
              <tr>
                <th>Loading</th>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Delivery Run</th>
                <th>Created By</th>
                <th>Unloaded?</th>
                <th style={{ textAlign: 'right' }}>Loaded</th>
                <th style={{ textAlign: 'right' }}>Sold</th>
                <th style={{ textAlign: 'right' }}>Unloaded</th>
                <th style={{ textAlign: 'right' }}>Variance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</td></tr>
              ) : rows.length ? (
                rows.map((row) => {
                  const flagged = row.isUnloaded && Math.abs(Number(row.varianceQty)) > 0.01
                  return (
                    <tr key={row.vehicleLoadingId} style={flagged ? { boxShadow: 'inset 3px 0 var(--color-danger)' } : undefined}>
                      <td>
                        <Link className="mono" style={{ color: 'var(--color-cyan)' }} to={`/inventory/vehicle-loadings/${row.vehicleLoadingId}`}>
                          {row.loadingNo}
                        </Link>
                      </td>
                      <td className="mono">{formatShortDateTime(row.loadingDate)}</td>
                      <td>{row.vehicleLocationName}</td>
                      <td>{row.deliveryRunName}</td>
                      <td style={{ fontSize: 12 }}>{row.createdByUserName || 'Unknown user'}</td>
                      <td>{row.isUnloaded ? 'Yes' : 'Not yet'}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{number(row.loadedQty)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{number(row.soldQty)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{number(row.unloadedQty)}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: flagged ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                        {flagged ? <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} /> : null}
                        {Number(row.varianceQty) > 0 ? '+' : ''}{number(row.varianceQty)}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No applied vehicle loadings found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--color-text-dim)', borderTop: '1px solid var(--color-border)' }}>
          Variance = Loaded − Sold − Unloaded. A run still out on the road normally shows a positive
          variance (stock that's on the lorry, not sold yet) — the real flag is a nonzero variance on
          a run that's already confirmed unloaded (highlighted in red).
        </div>
      </section>
    </div>
  )
}
