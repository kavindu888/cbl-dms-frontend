import dayjs from 'dayjs'
import { AlertTriangle, CheckCircle2, RefreshCw, Wrench } from 'lucide-react'
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
  return value ? dayjs(value).format('DD MMM YYYY') : '-'
}

const REVIEWED_STORAGE_KEY = 'free-item-mismatches:reviewed'

function loadReviewed() {
  try {
    const raw = localStorage.getItem(REVIEWED_STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveReviewed(set) {
  try {
    localStorage.setItem(REVIEWED_STORAGE_KEY, JSON.stringify([...set]))
  } catch {
    // Per-browser convenience only.
  }
}

// Admin checklist for the free-item Gross/Net/Outstanding inflation bug: a free line's full
// "would-be" MRP value was counting toward Gross with nothing cancelling it out of Net, so every
// invoice with a free line before the fix had its Outstanding overstated by exactly that value.
// Lists only invoices where recalculating would actually change something; "Fix" re-derives the
// totals from the invoice's existing lines (no price/discount is touched) and, if the customer had
// already paid against the inflated amount, the excess becomes customer credit automatically.
export default function FreeItemMismatchesPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [reviewed, setReviewed] = useState(() => loadReviewed())
  const [fixingId, setFixingId] = useState(null)

  const load = useCallback(async (isRefresh) => {
    isRefresh ? setRefreshing(true) : setLoading(true)
    setError(null)
    try {
      const data = await salesService.getFreeItemAmountMismatches()
      setRows(data)
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

  useEffect(() => {
    saveReviewed(reviewed)
  }, [reviewed])

  function toggleReviewed(invoiceId) {
    setReviewed((current) => {
      const next = new Set(current)
      if (next.has(invoiceId)) next.delete(invoiceId)
      else next.add(invoiceId)
      return next
    })
  }

  async function handleFix(row) {
    setFixingId(row.invoiceId)
    try {
      await salesService.recalculateInvoiceAmounts(row.invoiceId, {
        reason: 'Free-item Gross/Net inflation correction',
      })
      setRows((current) => current.filter((r) => r.invoiceId !== row.invoiceId))
    } catch (err) {
      setError(err)
    } finally {
      setFixingId(null)
    }
  }

  const totalOverstated = rows.reduce((sum, row) => sum + Number(row.difference || 0), 0)
  const reviewedCount = rows.filter((row) => reviewed.has(row.invoiceId)).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Free Item Amount Corrections</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-dim)', fontSize: 13, maxWidth: 720 }}>
            Invoices whose Net/Outstanding doesn't match what a free (promotional) line on them
            should give — usually overstated, but a row can also be understated if it was Fixed by
            an earlier, buggy version of this tool. Fix always recomputes to the correct value
            either way, and is safe to click more than once.
          </p>
        </div>
        <button type="button" className="button-secondary" onClick={() => load(true)} style={{ height: 38 }}>
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="panel" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Invoices affected</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{rows.length}</div>
        </div>
        <div className="panel" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
            Net total difference{totalOverstated < 0 ? ' (understated)' : ''}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-amber)' }}>
            {totalOverstated < 0 ? '-' : ''}
            {formatMoney(Math.abs(totalOverstated))}
          </div>
        </div>
        <div className="panel" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Reviewed by you</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {reviewedCount} / {rows.length}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="panel" style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-dim)' }}>
          Scanning invoices...
        </div>
      ) : error ? (
        <div className="panel" style={{ padding: 24, textAlign: 'center', color: 'var(--color-red)' }}>
          {error.message || 'Could not load free-item amount mismatches.'}
        </div>
      ) : rows.length === 0 ? (
        <div className="panel" style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-dim)' }}>
          <CheckCircle2 size={27} style={{ margin: '0 auto 8px' }} />
          No invoice needs this correction.
        </div>
      ) : (
        <section className="panel" style={{ overflow: 'hidden' }}>
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
            <strong style={{ fontSize: 13 }}>Invoices needing a Gross/Net correction</strong>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table product-table-compact">
              <thead>
                <tr>
                  <th style={{ width: 36 }} />
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Gross</th>
                  <th style={{ textAlign: 'right' }}>Current Net</th>
                  <th style={{ textAlign: 'right' }}>Corrected Net</th>
                  <th style={{ textAlign: 'right' }}>Difference</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isReviewed = reviewed.has(row.invoiceId)
                  return (
                    <tr key={row.invoiceId} style={isReviewed ? { opacity: 0.6 } : undefined}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isReviewed}
                          onChange={() => toggleReviewed(row.invoiceId)}
                          title="Mark as reviewed (remembered on this device)"
                        />
                      </td>
                      <td>
                        <Link
                          className="mono"
                          style={{ color: 'var(--color-cyan)' }}
                          to={`/sales/invoices/${row.invoiceId}`}
                        >
                          {row.serialNumber || row.invoiceNumber}
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
                        {formatMoney(row.grossAmount)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {formatMoney(row.currentNetAmount)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--color-teal)' }}>
                        {formatMoney(row.correctedNetAmount)}
                      </td>
                      <td
                        className="mono"
                        style={{
                          textAlign: 'right',
                          fontWeight: 750,
                          color: 'var(--color-amber)',
                        }}
                        title={
                          Number(row.difference) >= 0
                            ? 'Current Net is overstated by this much — Fix will lower it.'
                            : 'Current Net is understated by this much (likely from an earlier version of this tool) — Fix will raise it back up.'
                        }
                      >
                        {Number(row.difference) >= 0
                          ? formatMoney(row.difference)
                          : `-${formatMoney(Math.abs(row.difference))}`}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button-secondary"
                          disabled={fixingId === row.invoiceId}
                          style={{ height: 28, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6 }}
                          onClick={() => handleFix(row)}
                        >
                          <Wrench size={12} />
                          {fixingId === row.invoiceId ? 'Fixing...' : 'Fix'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
