import dayjs from 'dayjs'
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StatusBadge from '@components/ui/StatusBadge'
import { salesService } from '@/services/api/salesService'

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value) {
  return value ? dayjs(value).format('DD MMM YYYY HH:mm') : '-'
}

// Admin "watch" report for the serial-number-duplication issue the business owner reported —
// lists every invoice that shares its serial number with at least one other invoice, grouped so
// each duplicate pair/set can be reviewed and corrected one by one. Read-only — this page does
// not edit invoices; use the normal invoice edit screen to change a serial number or cancel one.
export default function DuplicateSerialNumbersPage() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async (isRefresh) => {
    isRefresh ? setRefreshing(true) : setLoading(true)
    setError(null)
    try {
      const data = await salesService.getDuplicateSerialNumberInvoices()
      setGroups(data)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load(false)
  }, [load])

  const totalDuplicateInvoices = groups.reduce((sum, g) => sum + g.invoices.length, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Duplicate Serial Numbers</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-dim)', fontSize: 13 }}>
            Invoices that share the same serial number with at least one other invoice. New invoices can no
            longer be saved with a serial number already in use, but this watches for any that already exist.
          </p>
        </div>
        <button
          type="button"
          className="button-secondary"
          onClick={() => load(true)}
          style={{ height: 38 }}
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="panel" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Duplicate serial numbers</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{groups.length}</div>
        </div>
        <div className="panel" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Invoices involved</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{totalDuplicateInvoices}</div>
        </div>
      </div>

      {loading ? (
        <div className="panel" style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-dim)' }}>
          Scanning invoices...
        </div>
      ) : error ? (
        <div className="panel" style={{ padding: 24, textAlign: 'center', color: 'var(--color-red)' }}>
          {error.message || 'Could not load duplicate serial numbers.'}
        </div>
      ) : groups.length === 0 ? (
        <div className="panel" style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-dim)' }}>
          <CheckCircle2 size={27} style={{ margin: '0 auto 8px' }} />
          No duplicate serial numbers found.
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.serialNumber} className="panel" style={{ overflow: 'hidden' }}>
            <div
              style={{
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'color-mix(in srgb, var(--color-bg-elevated) 45%, transparent)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <AlertTriangle size={15} color="var(--color-amber)" />
              <strong style={{ fontSize: 13 }}>
                Serial number <span className="mono">{group.serialNumber}</span> — used by{' '}
                {group.invoices.length} invoices
              </strong>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table product-table-compact">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Invoice date</th>
                    <th style={{ textAlign: 'right' }}>Net amount</th>
                    <th style={{ textAlign: 'right' }}>Outstanding</th>
                    <th>Created by</th>
                    <th>Created on</th>
                  </tr>
                </thead>
                <tbody>
                  {group.invoices.map((row) => (
                    <tr key={row.invoiceId}>
                      <td>
                        <Link
                          className="mono"
                          style={{ color: 'var(--color-cyan)' }}
                          to={`/sales/invoices/${row.invoiceId}`}
                        >
                          {row.invoiceNumber}
                        </Link>
                      </td>
                      <td>{row.customerName}</td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {formatDate(row.invoiceDate)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {formatMoney(row.netAmount)}
                      </td>
                      <td
                        className="mono"
                        style={{
                          textAlign: 'right',
                          color: Number(row.outstandingAmount) > 0 ? 'var(--color-amber)' : 'var(--color-teal)',
                        }}
                      >
                        {formatMoney(row.outstandingAmount)}
                      </td>
                      <td>{row.salesPersonName || '-'}</td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {formatDate(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  )
}
