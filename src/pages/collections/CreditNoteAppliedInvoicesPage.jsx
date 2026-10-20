import { CheckCircle2, CreditCard, History, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import InvoicePaymentAuditModal from '@/components/collections/InvoicePaymentAuditModal'
import StatusBadge from '@components/ui/StatusBadge'
import { useCreditNoteAppliedInvoices } from '@/hooks/useCollections'
import { formatDateTime } from '@/utils'
import { Blank, Busy, Metric, PageTitle, Problem, money } from './collectionsUi'

const REVIEWED_STORAGE_KEY = 'credit-note-applied-invoices:reviewed'

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
    // Per-browser convenience only — fine if it can't persist (private window, storage blocked).
  }
}

// Admin sweep: every invoice that ever had a customer-credit-note payment auto-applied to it —
// a leftover credit from some unrelated earlier invoice/overpayment, automatically swept onto a
// brand-new invoice the moment it's finalized (see CreateDirectInvoiceCommand). Not inherently
// wrong — it's deliberate system behavior — but it looks identical to an unexplained payment on
// the invoice list, so this gives an admin a dedicated, tickable checklist to go through one by
// one, with the same per-invoice audit (and correction tools) InvoicePaymentAuditModal provides
// everywhere else.
export default function CreditNoteAppliedInvoicesPage() {
  const report = useCreditNoteAppliedInvoices()
  const [auditInvoice, setAuditInvoice] = useState(null)
  const [reviewed, setReviewed] = useState(() => loadReviewed())

  useEffect(() => {
    saveReviewed(reviewed)
  }, [reviewed])

  if (report.isLoading) return <Busy label="Scanning invoices..." />
  if (report.isError) return <Problem error={report.error} />

  const rows = report.data || []
  const totalCreditApplied = rows.reduce((sum, row) => sum + Number(row.creditNoteAmount || 0), 0)
  const reviewedCount = rows.filter((row) => reviewed.has(row.invoiceId)).length

  function toggleReviewed(invoiceId) {
    setReviewed((current) => {
      const next = new Set(current)
      if (next.has(invoiceId)) next.delete(invoiceId)
      else next.add(invoiceId)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageTitle
        title="Credit Note Applied Invoices"
        subtitle="Invoices whose paid amount includes a customer credit note auto-applied at invoice creation — not necessarily wrong, but worth reviewing one by one."
        actions={
          <button
            type="button"
            className="button-secondary"
            onClick={() => report.refetch()}
            style={{ height: 38 }}
          >
            <RefreshCw size={15} className={report.isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric label="Invoices affected" value={rows.length} />
        <Metric
          label="Total credit applied"
          value={money(totalCreditApplied)}
          helper="Sum of every CreditNote payment across these invoices"
        />
        <Metric
          label="Reviewed by you"
          value={`${reviewedCount} / ${rows.length}`}
          tone={reviewedCount === rows.length && rows.length > 0 ? 'var(--color-teal)' : undefined}
          helper="Ticked rows are remembered on this device"
        />
      </div>

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
          <CreditCard size={15} color="var(--color-amber)" />
          <strong style={{ fontSize: 13 }}>Invoices with an auto-applied credit note</strong>
        </div>

        {rows.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table product-table-compact">
              <thead>
                <tr>
                  <th style={{ width: 36 }} />
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Net amount</th>
                  <th style={{ textAlign: 'right' }}>Amount paid</th>
                  <th style={{ textAlign: 'right' }}>Credit note amount</th>
                  <th>Applied on</th>
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
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {money(row.netAmount)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {money(row.amountPaid)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 750, color: 'var(--color-amber)' }}>
                        {money(row.creditNoteAmount)}
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {formatDateTime(row.latestCreditNoteAppliedOn)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button-secondary"
                          style={{ height: 28, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6 }}
                          onClick={() =>
                            setAuditInvoice({
                              invoiceId: row.invoiceId,
                              label: row.serialNumber || row.invoiceNumber,
                            })
                          }
                        >
                          <History size={12} />
                          Audit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Blank>
            <CheckCircle2 size={27} style={{ margin: '0 auto 8px', color: 'var(--color-text-dim)' }} />
            No invoice has ever had a credit note auto-applied.
          </Blank>
        )}
      </section>

      <InvoicePaymentAuditModal
        invoiceId={auditInvoice?.invoiceId}
        invoiceLabel={auditInvoice?.label}
        onClose={() => setAuditInvoice(null)}
      />
    </div>
  )
}
