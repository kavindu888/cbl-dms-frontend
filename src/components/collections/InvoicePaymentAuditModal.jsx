import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import Modal from '@components/ui/Modal'
import { useForceRemoveInvoicePayments, useInvoicePaymentAudit } from '@/hooks/useCollections'
import { salesService } from '@/services/api/salesService'
import { usersService } from '@/services/api/usersService'
import { formatDate, formatDateTime } from '@/utils'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'
import { useAuthStore } from '@stores/authStore'
import { money } from '@/pages/collections/collectionsUi'

function formatUserId(value) {
  if (!value) return '—'
  return value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value
}

// Admin audit trail: every collection session that ever collected money against one invoice, plus
// anything recorded directly on the invoice in Sales — answers "this shows partially paid, which
// session collected the rest?" (or "nothing collected it — where did this come from?") without
// hunting through sessions or Sales records by hand.
export default function InvoicePaymentAuditModal({ invoiceId, invoiceLabel, onClose }) {
  const audit = useInvoicePaymentAudit(invoiceId)
  const data = audit.data
  const { user } = useAuthStore()
  const canReset = userHasPermission(user, PERMISSIONS.sales.invoiceAdminEditLines)
  const canForceRemove = userHasPermission(user, PERMISSIONS.collections.sessionDelete)
  const queryClient = useQueryClient()
  const [showResetForm, setShowResetForm] = useState(false)
  const [resetReason, setResetReason] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [userNames, setUserNames] = useState({})
  const [showForceForm, setShowForceForm] = useState(false)
  const [forceReason, setForceReason] = useState('')
  const [forceAcknowledged, setForceAcknowledged] = useState(false)
  const [forceResult, setForceResult] = useState(null)
  const forceRemove = useForceRemoveInvoicePayments()

  // Resolve "recorded by" usernames for session rows that have one (Cash only — see
  // InvoicePaymentAuditRowDto.RecordedByUserId on the backend for why Cheque/BankTransfer never
  // have this).
  useEffect(() => {
    const ids = [...new Set((data?.sessions || []).map((s) => s.recordedByUserId).filter(Boolean))]
    if (!ids.length) return undefined
    let active = true
    Promise.all(
      ids.map((id) =>
        usersService
          .getUser(id)
          .then((u) => [id, u?.username || ''])
          .catch(() => [id, ''])
      )
    ).then((pairs) => {
      if (active) setUserNames(Object.fromEntries(pairs))
    })
    return () => {
      active = false
    }
  }, [data?.sessions])

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

  async function submitForceRemove() {
    if (!forceReason.trim()) {
      toast.error('A reason is required.')
      return
    }
    try {
      const result = await forceRemove.mutateAsync({ invoiceId, reason: forceReason.trim() })
      setForceResult(result)
      setShowForceForm(false)
      setForceReason('')
      setForceAcknowledged(false)
      if (result?.recordsSkipped > 0) {
        toast.warning(
          `Removed ${result.recordsRemoved} payment record(s). ${result.recordsSkipped} were skipped — see details below.`
        )
      } else {
        toast.success(`Invoice reset to unpaid. ${result?.recordsRemoved || 0} payment record(s) removed.`)
      }
    } catch {
      // Toast is already shown by useForceRemoveInvoicePayments' onError.
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
                    <th>Recorded by</th>
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
                      <td
                        className={row.recordedByUserId && !userNames[row.recordedByUserId] ? 'mono' : ''}
                        style={{ fontSize: 11 }}
                        title={
                          row.recordedByUserId
                            ? undefined
                            : 'Not tracked for this payment method (only Cash collections record who entered them)'
                        }
                      >
                        {row.recordedByUserId
                          ? userNames[row.recordedByUserId] || formatUserId(row.recordedByUserId)
                          : 'Not tracked'}
                      </td>
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

          {data.creditLedgerHistory?.length ? (
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 6 }}>
                {data.customerName}'s full credit history — shows where a CreditNote payment's money
                actually came from (an earlier overpayment, a return, etc.). The system doesn't
                record which user applied or earned each entry.
              </div>
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                <table className="data-table product-table-compact">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'right' }}>Balance after</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.creditLedgerHistory.map((row) => {
                      const isEarned = row.creditType === 'Earned'
                      return (
                        <tr key={row.id}>
                          <td>
                            <span
                              className={`rounded border px-2 py-0.5 text-xs font-semibold ${
                                isEarned
                                  ? 'border-green-800/50 bg-green-900/20 text-green-400'
                                  : 'border-amber-800/50 bg-amber-900/20 text-amber-400'
                              }`}
                            >
                              {isEarned ? '+ Earned' : '− Consumed'}
                            </span>
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                            {row.description}
                          </td>
                          <td
                            className="mono"
                            style={{ textAlign: 'right', color: isEarned ? '#4ade80' : 'var(--color-amber)' }}
                          >
                            {isEarned ? '+' : '−'}
                            {money(row.amount)}
                          </td>
                          <td className="mono" style={{ textAlign: 'right' }}>
                            {money(row.balanceAfter)}
                          </td>
                          <td className="mono" style={{ fontSize: 11 }}>
                            {formatDateTime(row.transactionDate)}
                          </td>
                        </tr>
                      )
                    })}
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

          {Number(data.amountPaid || 0) > 0.01 && canForceRemove ? (
            <div
              style={{
                border: '1px solid color-mix(in srgb, var(--color-danger) 50%, transparent)',
                borderRadius: 8,
                padding: 12,
                background: 'color-mix(in srgb, var(--color-danger) 6%, transparent)',
              }}
            >
              {!showForceForm ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    <strong style={{ color: 'var(--color-danger)' }}>Danger zone:</strong> force-remove
                    every payment on this invoice — works even on real sessions, cheques, transfers
                    and credit notes shown above, not just ghost payments.
                  </div>
                  <button
                    type="button"
                    className="button-primary"
                    style={{
                      height: 32,
                      flexShrink: 0,
                      background: 'var(--color-danger)',
                      borderColor: 'var(--color-danger)',
                    }}
                    onClick={() => setShowForceForm(true)}
                  >
                    Force remove all
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-danger)' }}>
                    Force-remove every payment on this invoice ({money(data.amountPaid)} will become
                    outstanding again)
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    Deletes the real sessions/cheques/transfers/credit notes behind this invoice's
                    payments, reverses the customer's ledger, and resets this invoice to unpaid. A
                    money record shared with other invoices, or a cheque already deposited/cleared,
                    is skipped and reported — not partially altered.
                  </div>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Reason (required) — e.g. customer disputes this invoice, reversing by agreement"
                    value={forceReason}
                    onChange={(e) => setForceReason(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11 }}>
                    <input
                      type="checkbox"
                      checked={forceAcknowledged}
                      onChange={(e) => setForceAcknowledged(e.target.checked)}
                      style={{ marginTop: 2 }}
                    />
                    I understand this removes real payment records, not just untraceable ones, and
                    cannot be undone automatically.
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="button"
                      className="button-secondary"
                      style={{ height: 32 }}
                      disabled={forceRemove.isPending}
                      onClick={() => {
                        setShowForceForm(false)
                        setForceReason('')
                        setForceAcknowledged(false)
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="button-primary"
                      style={{ height: 32, background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                      disabled={forceRemove.isPending || !forceAcknowledged}
                      onClick={submitForceRemove}
                    >
                      {forceRemove.isPending ? 'Removing...' : 'Confirm force remove'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {forceResult ? (
            <div
              style={{
                fontSize: 12,
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                padding: '8px 10px',
              }}
            >
              <strong>{forceResult.recordsRemoved}</strong> payment record(s) removed.
              {forceResult.recordsSkipped > 0 ? (
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--color-amber)' }}>
                  {forceResult.skipReasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}
