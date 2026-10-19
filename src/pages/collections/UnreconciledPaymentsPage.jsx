import { History, RefreshCw, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import InvoicePaymentAuditModal from '@/components/collections/InvoicePaymentAuditModal'
import StatusBadge from '@components/ui/StatusBadge'
import { useUnreconciledInvoicePayments } from '@/hooks/useCollections'
import { formatDateTime } from '@/utils'
import { Blank, Busy, Metric, PageTitle, Problem, money } from './collectionsUi'

// Admin sweep: every invoice org-wide whose amount paid isn't fully explained by either a
// Collections allocation or a direct Sales invoice payment — the same gap InvoicePaymentAuditModal
// investigates one invoice at a time, surfaced for every affected invoice at once so this can be
// caught proactively instead of after a customer or staff member notices a mismatch.
export default function UnreconciledPaymentsPage() {
  const report = useUnreconciledInvoicePayments()
  const [auditInvoice, setAuditInvoice] = useState(null)

  if (report.isLoading) return <Busy label="Scanning invoices..." />
  if (report.isError) return <Problem error={report.error} />

  const rows = report.data || []
  const totalGap = rows.reduce((sum, row) => sum + Number(row.unreconciledAmount || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageTitle
        title="Unreconciled Payments"
        subtitle="Invoices showing money as paid that no collection session or direct payment record explains."
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Metric
          label="Invoices affected"
          value={rows.length}
          tone={rows.length > 0 ? 'var(--color-danger)' : 'var(--color-teal)'}
        />
        <Metric
          label="Total unexplained amount"
          value={money(totalGap)}
          tone={totalGap > 0 ? 'var(--color-danger)' : 'var(--color-teal)'}
          helper="Sum of the gap between amount paid and what's actually on record for it"
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
          <ShieldAlert size={15} color="var(--color-amber)" />
          <strong style={{ fontSize: 13 }}>Invoices with an unexplained payment gap</strong>
        </div>

        {rows.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table product-table-compact">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Net amount</th>
                  <th style={{ textAlign: 'right' }}>Amount paid</th>
                  <th style={{ textAlign: 'right' }}>Explained</th>
                  <th style={{ textAlign: 'right' }}>Unexplained gap</th>
                  <th>Invoice last updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.invoiceId}>
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
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {money(row.explainedAmount)}
                    </td>
                    <td
                      className="mono"
                      style={{ textAlign: 'right', fontWeight: 750, color: 'var(--color-danger)' }}
                    >
                      {money(row.unreconciledAmount)}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {formatDateTime(row.updatedAt)}
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Blank>No unexplained payment gaps found — every invoice's amount paid is accounted for.</Blank>
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
