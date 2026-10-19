import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import Modal from '@components/ui/Modal'
import { useInvoicePaymentAudit } from '@/hooks/useCollections'
import { salesService } from '@/services/api/salesService'
import { formatDate } from '@/utils'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'
import { useAuthStore } from '@stores/authStore'
import { money } from '@/pages/collections/collectionsUi'

// Admin audit trail: every collection session that ever collected money against one invoice, plus
// anything recorded directly on the invoice in Sales — answers "this shows partially paid, which
// session collected the rest?" (or "nothing collected it — where did this come from?") without
// hunting through sessions or Sales records by hand.
export default function InvoicePaymentAuditModal({ invoiceId, invoiceLabel, onClose }) {
  const audit = useInvoicePaymentAudit(invoiceId)
  const data = audit.data
  const { user } = useAuthStore()
  const canReset = userHasPermission(user, PERMISSIONS.sales.invoiceAdminEditLines)
  const queryClient = useQueryClient()
  const [showResetForm, setShowResetForm] = useState(false)
  const [resetReason, setResetReason] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  // Mirrors the backend's own refusal rule exactly: only offer this when NOTHING real backs the
  // paid amount — any real collection/cheque/transfer/direct payment, even a tiny one, means the
  // button stays hidden and that money has to be sorted out at its own source instead.
  const explainedAmount =
    Number(data?.totalAllocatedViaCollections || 0) +
    Number(data?.totalWrittenOff || 0) +
    Number(data?.totalDirectPayments || 0)
  const isGhostPayment = Boolean(data) && Number(data.amountPaid || 0) > 0.01 && explainedAmount <= 0.01

  async function submitReset() {
    if (!resetReason.trim()) {
      toast.error('A reason is required.')
      return
    }
    setIsResetting(true)
    try {
      await salesService.resetGhostInvoicePayment(invoiceId, { reason: resetReason.trim() })
      toast.success('Invoice reset to unpaid.')
      queryClient.invalidateQueries({ queryKey: ['invoice-payment-audit', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['unreconciled-invoice-payments'] })
      setShowResetForm(false)
      setResetReason('')
    } catch (error) {
      toast.error(error.message || 'Unable to reset this invoice.')
    } finally {
      setIsResetting(false)
    }
  }

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

          {isGhostPayment && canReset ? (
            <div
              style={{
                border: '1px solid color-mix(in srgb, var(--color-danger) 35%, transparent)',
                borderRadius: 8,
                padding: 12,
              }}
            >
              {!showResetForm ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Nothing above explains this payment — admin can reset the invoice back to
                    unpaid with the full amount outstanding.
                  </div>
                  <button
                    type="button"
                    className="button-secondary"
                    style={{ height: 32, flexShrink: 0, borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                    onClick={() => setShowResetForm(true)}
                  >
                    Reset to unpaid
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-danger)' }}>
                    Reset this invoice to unpaid ({money(data.amountPaid)} will become outstanding
                    again)
                  </div>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Reason (required) — e.g. confirmed ghost payment from a failed collection save on 2026-10-15"
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="button"
                      className="button-secondary"
                      style={{ height: 32 }}
                      disabled={isResetting}
                      onClick={() => {
                        setShowResetForm(false)
                        setResetReason('')
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="button-primary"
                      style={{ height: 32, background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                      disabled={isResetting}
                      onClick={submitReset}
                    >
                      {isResetting ? 'Resetting...' : 'Confirm reset'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}
