import { Link } from 'react-router-dom'
import Modal from '@components/ui/Modal'
import { useInvoicePaymentAudit } from '@/hooks/useCollections'
import { formatDate } from '@/utils'
import { money } from '@/pages/collections/collectionsUi'

// Admin audit trail: every collection session that ever collected money against one invoice, plus
// anything recorded directly on the invoice in Sales — answers "this shows partially paid, which
// session collected the rest?" (or "nothing collected it — where did this come from?") without
// hunting through sessions or Sales records by hand.
export default function InvoicePaymentAuditModal({ invoiceId, invoiceLabel, onClose }) {
  const audit = useInvoicePaymentAudit(invoiceId)
  const data = audit.data

  return (
    <Modal
      open={Boolean(invoiceId)}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
      title="Payment Audit"
      description={invoiceLabel ? `Every collection session that applied money to invoice ${invoiceLabel}.` : ''}
      maxWidth="640px"
    >
      {audit.isLoading ? (
        <div style={{ padding: 18, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading payment history...
        </div>
      ) : audit.isError ? (
        <div style={{ padding: 18, textAlign: 'center', color: 'var(--color-danger)' }}>
          {audit.error?.message || 'Unable to load payment history for this invoice.'}
        </div>
      ) : data ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 9, gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>Invoice total</div>
              <div className="mono" style={{ fontWeight: 750 }}>
                {money(data.netAmount)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>Amount paid</div>
              <div className="mono" style={{ fontWeight: 750 }}>
                {money(data.amountPaid)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>Still outstanding</div>
              <div
                className="mono"
                style={{
                  fontWeight: 750,
                  color: data.outstandingAmount > 0 ? 'var(--color-danger)' : 'var(--color-teal)',
                }}
              >
                {data.outstandingAmount > 0 ? money(data.outstandingAmount) : '✓ Settled'}
              </div>
            </div>
          </div>

          {data.sessions?.length ? (
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
              <table className="data-table product-table-compact">
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Date</th>
                    <th>Collector</th>
                    <th>Method</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((row) => (
                    <tr key={row.allocationId}>
                      <td>
                        <Link
                          className="mono"
                          style={{ color: 'var(--color-cyan)' }}
                          to={`/collections/sessions/${row.sessionId}/reconciliation`}
                        >
                          {row.sessionNumber || row.sessionId.slice(-8)}
                        </Link>
                        {row.sessionStatus ? (
                          <div style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>
                            {row.sessionStatus}
                          </div>
                        ) : null}
                      </td>
                      <td className="mono">
                        {row.sessionDate ? formatDate(row.sessionDate) : formatDate(row.allocatedOn)}
                      </td>
                      <td>{row.collectorName || '—'}</td>
                      <td>{row.paymentMethod}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        <div>{money(row.allocatedAmount)}</div>
                        {row.writeOffAmount > 0 ? (
                          <div style={{ fontSize: 10, color: 'var(--color-danger)' }}>
                            −{money(row.writeOffAmount)} written off
                            {row.writeOffReason ? ` (${row.writeOffReason})` : ''}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 14, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No collection session has ever applied money to this invoice — see below if it was
              instead recorded directly on the invoice.
            </div>
          )}

          {data.directPayments?.length ? (
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 6 }}>
                Recorded directly on the invoice (Sales) — not through a collection session
              </div>
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                <table className="data-table product-table-compact">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th>Paid date</th>
                      <th>Details</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.directPayments.map((row) => (
                      <tr key={row.paymentId}>
                        <td>{row.paymentMethod}</td>
                        <td className="mono">{formatDate(row.paidDate)}</td>
                        <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {row.chequeNumber
                            ? `Cheque ${row.chequeNumber}${row.bankName ? ` — ${row.bankName}` : ''}`
                            : row.collectionJournalId
                              ? 'Settled via credit note'
                              : '—'}
                        </td>
                        <td className="mono" style={{ textAlign: 'right' }}>
                          {money(row.amount)}
                        </td>
                        <td className="mono" style={{ fontSize: 11 }}>
                          {formatDate(row.recordedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {data.unreconciledAmount > 0 ? (
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-amber)',
                border: '1px solid color-mix(in srgb, var(--color-amber) 35%, transparent)',
                borderRadius: 6,
                padding: '8px 10px',
              }}
            >
              {money(data.unreconciledAmount)} of the amount paid isn't explained by a collection
              session or a direct invoice payment above — worth double-checking.
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}
