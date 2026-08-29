import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Fragment } from 'react'
import { ArrowLeft, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { formatDate } from '@/utils/formatDate'
import { inventoryService } from '@/services/api/inventoryService'
import { useVehicles } from '@/hooks/useVehicle'
import { vehicleLabel, formatNumber } from '../vehicleMovementUtils'

const emptyStateStyle = {
  padding: 26,
  textAlign: 'center',
  color: 'var(--color-text-muted)',
  border: '1px dashed var(--color-border)',
  borderRadius: 14,
  background: 'color-mix(in srgb, var(--color-bg-elevated) 32%, transparent)',
}

export default function VehicleLoadingSalesReportPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: vehicles = [] } = useVehicles()
  const [report, setReport] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [expanded, setExpanded] = useState({})

  function load() {
    setIsLoading(true)
    setLoadError('')
    inventoryService
      .getVehicleLoadingSalesReport(id)
      .then(setReport)
      .catch((error) => {
        setLoadError(error.message || 'Unable to load the vehicle sales report.')
        toast.error(error.message || 'Unable to load the vehicle sales report.')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const vehicle = vehicles.find((v) => v.id === report?.vehicleLocationId)
  const lines = report?.lines || []
  const totals = lines.reduce(
    (acc, line) => ({
      loaded: acc.loaded + Number(line.qtyLoaded || 0),
      sold: acc.sold + Number(line.qtySold || 0),
      remaining: acc.remaining + Number(line.qtyRemaining || 0),
    }),
    { loaded: 0, sold: 0, remaining: 0 }
  )

  return (
    <div className="responsive-page" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <button
          type="button"
          onClick={() => navigate('/inventory/vehicle-loadings')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 10,
            border: 0,
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: 13,
            padding: 0,
          }}
        >
          <ArrowLeft size={14} /> Back to vehicle loadings
        </button>
      </div>

      <header style={{ display: 'flex', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="eyebrow">Inventory</p>
          <h1 style={{ color: 'var(--color-text-primary)', fontSize: 26, fontWeight: 700 }}>
            Vehicle Sales Report
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>
            {report ? (
              <>
                {report.loadingNo} — {vehicle ? vehicleLabel(vehicle) : report.vehicleLocationId} —{' '}
                {formatDate(report.loadingDate)}
                {report.isUnloaded ? ' (unloaded)' : ' (still out)'}
              </>
            ) : (
              'Loading...'
            )}
          </p>
        </div>
        <button type="button" className="button-secondary" onClick={load} style={{ height: 38 }}>
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      <section className="panel" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div style={emptyStateStyle}>Loading report...</div>
          ) : loadError ? (
            <div style={emptyStateStyle}>{loadError}</div>
          ) : lines.length === 0 ? (
            <div style={emptyStateStyle}>No loaded, sold, or remaining stock found for this loading.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Product</th>
                  <th className="text-right">Loaded</th>
                  <th className="text-right">Sold</th>
                  <th className="text-right">Remaining to Unload</th>
                  <th className="text-right">Invoices</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const isOpen = Boolean(expanded[line.productId])
                  return (
                    <Fragment key={line.productId}>
                      <tr
                        onClick={() =>
                          setExpanded((current) => ({ ...current, [line.productId]: !current[line.productId] }))
                        }
                        style={{ cursor: line.invoices.length ? 'pointer' : 'default' }}
                      >
                        <td style={{ width: 24 }}>
                          {line.invoices.length ? (
                            isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />
                          ) : null}
                        </td>
                        <td className="mono" style={{ color: 'var(--color-amber)', fontWeight: 800 }}>
                          {line.productSku}
                        </td>
                        <td className="mono text-right">{formatNumber(line.qtyLoaded, 0)}</td>
                        <td className="mono text-right">{formatNumber(line.qtySold, 0)}</td>
                        <td
                          className="mono text-right"
                          style={{
                            fontWeight: 800,
                            color: line.qtyRemaining > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                          }}
                        >
                          {formatNumber(line.qtyRemaining, 0)}
                        </td>
                        <td className="mono text-right">{line.invoices.length}</td>
                      </tr>
                      {isOpen && line.invoices.length > 0 ? (
                        <tr>
                          <td></td>
                          <td colSpan={5} style={{ padding: 0 }}>
                            <table className="data-table" style={{ width: '100%' }}>
                              <thead>
                                <tr>
                                  <th>Invoice #</th>
                                  <th>Customer</th>
                                  <th className="text-right">Qty Deducted</th>
                                </tr>
                              </thead>
                              <tbody>
                                {line.invoices.map((inv) => (
                                  <tr key={inv.invoiceId}>
                                    <td
                                      className="mono"
                                      style={{ color: 'var(--color-teal)', cursor: 'pointer' }}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        navigate(`/sales/invoices/${inv.invoiceId}`)
                                      }}
                                    >
                                      {inv.invoiceNumber}
                                    </td>
                                    <td>{inv.customerName}</td>
                                    <td className="mono text-right">{formatNumber(inv.qty, 0)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 800 }}>
                  <td></td>
                  <td>Total</td>
                  <td className="mono text-right">{formatNumber(totals.loaded, 0)}</td>
                  <td className="mono text-right">{formatNumber(totals.sold, 0)}</td>
                  <td className="mono text-right">{formatNumber(totals.remaining, 0)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
