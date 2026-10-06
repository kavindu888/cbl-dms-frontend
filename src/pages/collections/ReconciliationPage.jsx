import { CheckCircle2, ChevronDown, ChevronRight, Pencil, Printer, Scale } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AgingBadge from '@/components/collections/AgingBadge'
import ConfirmDialog from '@components/ui/ConfirmDialog'
import Modal from '@components/ui/Modal'
import StatusBadge from '@components/ui/StatusBadge'
import {
  useCollectors,
  useCorrectAllocationAmount,
  useReconciliation,
  useVerifySession,
} from '@/hooks/useCollections'
import { formatDate } from '@/utils'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'
import { useAuthStore } from '@stores/authStore'
import { Blank, Busy, Metric, PageTitle, Problem, inputStyle, money } from './collectionsUi'

const amountOrDash = (value) => (Number(value || 0) > 0 ? money(value) : '—')

// A per-invoice Cash/Cheques figure, with an admin-only edit affordance when there's actually an
// amount to correct — an empty cell means no payment was recorded at all, so there's nothing here
// to fix (recording a new payment is the right action for that, not this correction tool).
function AmountWithEdit({ value, canEdit, onEdit, color }) {
  const amount = Number(value || 0)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
      <span style={color ? { color } : undefined}>{amountOrDash(amount)}</span>
      {canEdit && amount > 0 ? (
        <button
          type="button"
          onClick={onEdit}
          className="no-print"
          title="Correct this amount"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            padding: 0,
            border: '1px solid var(--color-border)',
            borderRadius: 5,
            background: 'transparent',
            color: 'var(--color-text-dim)',
            cursor: 'pointer',
          }}
        >
          <Pencil size={11} />
        </button>
      ) : null}
    </div>
  )
}

export default function ReconciliationPage() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const canCorrectAmounts = userHasPermission(user, PERMISSIONS.collections.sessionDelete)
  const reconciliation = useReconciliation(id)
  const verify = useVerifySession()
  const collectors = useCollectors()
  const correctAmount = useCorrectAllocationAmount()
  const [expandedCustomers, setExpandedCustomers] = useState({})
  const [correction, setCorrection] = useState(null)

  if (reconciliation.isLoading) return <Busy label="Preparing reconciliation..." />
  if (reconciliation.isError) return <Problem error={reconciliation.error} />
  const data = reconciliation.data
  if (!data) return <Blank>Session was not found.</Blank>

  const collectorName =
    (collectors.data || []).find((c) => c.id === data.collectorId)?.name || data.collectorId
  const customers = data.customers || []
  const totalOutstanding = customers.reduce(
    (sum, customer) => sum + Number(customer.outstandingAmount || 0),
    0
  )
  const toggleCustomer = (customerId) =>
    setExpandedCustomers((current) => ({
      ...current,
      [customerId]: !current[customerId],
    }))

  function openCorrection(customer, invoice, method, currentAmount) {
    setCorrection({
      customerId: customer.customerId,
      customerName: customer.customerName || customer.customerCode,
      invoiceId: invoice.invoiceId,
      invoiceLabel: invoice.serialNumber || invoice.invoiceNumber,
      method,
      currentAmount,
      newAmount: String(currentAmount),
      reason: '',
    })
  }

  async function submitCorrection(event) {
    event.preventDefault()
    if (!correction) return
    try {
      await correctAmount.mutateAsync({
        sessionId: id,
        customerId: correction.customerId,
        invoiceId: correction.invoiceId,
        method: correction.method,
        newAmount: correction.newAmount,
        reason: correction.reason,
      })
      setCorrection(null)
    } catch {
      // Failure toast is already shown by useCorrectAllocationAmount's onError — keep the modal
      // open with what was entered so the admin can adjust and retry rather than re-typing it.
    }
  }

  return (
    <div
      className="collections-print-report"
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <PageTitle
        title="Daily Reconciliation"
        subtitle={`${data.sessionNumber} · Collector ${collectorName} · ${formatDate(data.sessionDate)}`}
        actions={
          <>
            <StatusBadge status={data.status} />
            <button className="button-secondary no-print" onClick={() => window.print()}>
              <Printer size={14} /> Print
            </button>
            {data.status === 'Closed' ? (
              <ConfirmDialog
                title="Verify this session?"
                description="This will finalize the session. Confirm the reconciliation totals before continuing."
                confirmLabel="Verify session"
                tone="warning"
                onConfirm={() => verify.mutateAsync(id)}
                trigger={
                  <button className="button-primary no-print">
                    <CheckCircle2 size={14} /> Verify
                  </button>
                }
              />
            ) : null}
          </>
        }
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric
          label="Total collected"
          value={money(data.totalCollected)}
          tone="var(--color-teal)"
          helper={`${money(data.totalCash)} cash · ${money(data.totalCheques)} cheques · ${money(data.totalBankTransfers)} transfers`}
        />
        <Metric
          label="Customer outstanding"
          value={money(totalOutstanding)}
          tone={totalOutstanding > 0 ? 'var(--color-danger)' : 'var(--color-teal)'}
          helper="Current balance across session invoices"
        />
        <Metric
          label="Customers"
          value={customers.length}
          helper={`${data.collectionCount} cash and cheque entries`}
        />
      </div>
      <section className="panel" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Scale size={17} color="var(--color-amber)" />
          <h2 style={{ fontSize: 15, fontWeight: 800 }}>Breakdown</h2>
        </div>
        <div style={{ marginTop: 14, display: 'grid', gap: 9 }}>
          {[
            ['Cash collected', data.totalCash],
            ['Cheques received', data.totalCheques],
            ['Bank transfers', data.totalBankTransfers],
            ['Total collected', data.totalCollected],
          ].map(([label, value], index) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: index === 3 ? 10 : 0,
                borderTop: index === 3 ? '1px solid var(--color-border)' : 0,
              }}
            >
              <span>{label}</span>
              <strong className="mono">{money(value)}</strong>
            </div>
          ))}
          {data.totalWrittenOff > 0 ? (
            <div
              style={{ display: 'flex', justifyContent: 'space-between' }}
              title="Bills recorded as fully collected, but part of the amount was written off instead of actually being handed over — e.g. cash lost or short after it was collected from the customer."
            >
              <span style={{ color: 'var(--color-danger)' }}>Missing / written off</span>
              <strong className="mono" style={{ color: 'var(--color-danger)' }}>
                {money(data.totalWrittenOff)}
              </strong>
            </div>
          ) : null}
          {data.totalUnallocatedSurplus > 0 ? (
            <div
              style={{ display: 'flex', justifyContent: 'space-between' }}
              title="Cash collected beyond what the bills picked for it needed, with no way to tell which customer overpaid — kept visible here until it's traced and assigned."
            >
              <span style={{ color: 'var(--color-amber)' }}>Unassigned surplus</span>
              <strong className="mono" style={{ color: 'var(--color-amber)' }}>
                {money(data.totalUnallocatedSurplus)}
              </strong>
            </div>
          ) : null}
          {data.totalCashShortage > 0 ? (
            <div
              style={{ display: 'flex', justifyContent: 'space-between' }}
              title="Bills closed at full value even though the cash counted fell short — not tied to any specific customer or bill."
            >
              <span style={{ color: 'var(--color-danger)' }}>Session cash shortage</span>
              <strong className="mono" style={{ color: 'var(--color-danger)' }}>
                {money(data.totalCashShortage)}
              </strong>
            </div>
          ) : null}
        </div>
      </section>
      <section className="panel" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Scale size={17} color="var(--color-amber)" />
          <h2 style={{ fontSize: 15, fontWeight: 800 }}>Cash & cheque reconciliation</h2>
        </div>
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          style={{ marginTop: 14 }}
        >
          <div>
            <p className="eyebrow">Cash</p>
            <div style={{ marginTop: 8, display: 'grid', gap: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Projected cash balance</span>
                <strong className="mono">{money(data.totalCash)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Physical cash balance</span>
                <strong className="mono">
                  {data.physicalCashAmount != null ? money(data.physicalCashAmount) : 'Not counted yet'}
                </strong>
              </div>
              {data.physicalCashAmount != null ? (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: 7,
                    borderTop: '1px solid var(--color-border)',
                    fontWeight: 800,
                  }}
                >
                  <span
                    style={{
                      color:
                        Math.abs(data.cashVariance) < 0.01
                          ? 'var(--color-teal)'
                          : 'var(--color-danger)',
                    }}
                  >
                    {Math.abs(data.cashVariance) < 0.01
                      ? 'Balanced'
                      : data.cashVariance > 0
                        ? 'Cash overage'
                        : 'Cash shortage'}
                  </span>
                  <strong
                    className="mono"
                    style={{
                      color:
                        Math.abs(data.cashVariance) < 0.01
                          ? 'var(--color-teal)'
                          : 'var(--color-danger)',
                    }}
                  >
                    {data.cashVariance > 0 ? '+' : ''}
                    {money(data.cashVariance)}
                  </strong>
                </div>
              ) : null}
            </div>
          </div>
          <div>
            <p className="eyebrow">Cheques</p>
            <div style={{ marginTop: 8, display: 'grid', gap: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Total cheque collection</span>
                <strong className="mono">{money(data.totalCheques)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Processed cheques</span>
                <strong className="mono">{money(data.processedCheques)}</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: 7,
                  borderTop: '1px solid var(--color-border)',
                  fontWeight: 800,
                }}
              >
                <span
                  style={{
                    color:
                      Math.abs(data.chequeVariance) < 0.01
                        ? 'var(--color-teal)'
                        : 'var(--color-danger)',
                  }}
                >
                  Difference
                </span>
                <strong
                  className="mono"
                  style={{
                    color:
                      Math.abs(data.chequeVariance) < 0.01
                        ? 'var(--color-teal)'
                        : 'var(--color-danger)',
                  }}
                >
                  {data.chequeVariance > 0 ? '+' : ''}
                  {money(data.chequeVariance)}
                </strong>
              </div>
            </div>
          </div>
        </div>
        {data.physicalCashAmount == null ? (
          <p style={{ marginTop: 12, fontSize: 11, color: 'var(--color-text-dim)' }}>
            Physical cash is counted when the session is closed.
          </p>
        ) : null}
      </section>
      <section className="panel" style={{ overflow: 'hidden' }}>
        <div
          style={{ padding: 14, borderBottom: '1px solid var(--color-border)', fontWeight: 800 }}
        >
          Customer reconciliation
        </div>
        {customers.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 1050 }}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Oldest due</th>
                  <th>Overdue</th>
                  <th style={{ textAlign: 'right' }}>Cash</th>
                  <th style={{ textAlign: 'right' }}>Cheques</th>
                  <th style={{ textAlign: 'right' }}>Transfers</th>
                  <th style={{ textAlign: 'right' }}>Collected</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const expanded = Boolean(expandedCustomers[customer.customerId])
                  return (
                    <Fragment key={customer.customerId}>
                      <tr
                        onClick={() => toggleCustomer(customer.customerId)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <div>
                              <div style={{ fontWeight: 750 }}>
                                {customer.customerName ||
                                  customer.customerCode ||
                                  customer.customerId?.slice(-8)}
                              </div>
                              {customer.customerCode ? (
                                <div className="mono" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                                  {customer.customerCode}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td>{customer.oldestDueDate ? formatDate(customer.oldestDueDate) : '—'}</td>
                        <td>
                          {customer.daysOverdue > 0 ? (
                            <AgingBadge daysOverdue={customer.daysOverdue} />
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="mono" style={{ textAlign: 'right', color: 'var(--color-teal)' }}>
                          {amountOrDash(customer.cashCollected)}
                        </td>
                        <td className="mono" style={{ textAlign: 'right' }}>
                          {amountOrDash(customer.chequesReceived)}
                        </td>
                        <td className="mono" style={{ textAlign: 'right' }}>
                          {amountOrDash(customer.bankTransfersReceived)}
                        </td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 750 }}>
                          {money(customer.totalCollected)}
                        </td>
                        <td
                          className="mono"
                          style={{
                            textAlign: 'right',
                            color:
                              customer.outstandingAmount > 0
                                ? 'var(--color-danger)'
                                : 'var(--color-teal)',
                            fontWeight: 750,
                          }}
                        >
                          {customer.outstandingAmount > 0
                            ? money(customer.outstandingAmount)
                            : '✓ Settled'}
                        </td>
                      </tr>
                      {expanded && !(customer.invoices || []).length ? (
                        <tr>
                          <td colSpan={8} style={{ paddingLeft: 42, color: 'var(--color-text-muted)' }}>
                            No invoice allocations in this session and no outstanding invoices.
                          </td>
                        </tr>
                      ) : null}
                      {expanded
                        ? (customer.invoices || []).map((invoice) => (
                            <tr key={invoice.invoiceId} style={{ background: 'var(--color-bg-base)' }}>
                              <td style={{ paddingLeft: 42 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                  <span className="mono" style={{ color: 'var(--color-cyan)' }}>
                                    {invoice.serialNumber || invoice.invoiceNumber}
                                  </span>
                                  <StatusBadge status={invoice.status} />
                                </div>
                              </td>
                              <td>{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</td>
                              <td className="mono" style={{ fontSize: 11 }}>
                                {money(invoice.netAmount)} total
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                <AmountWithEdit
                                  value={invoice.sessionCashAmount}
                                  color="var(--color-teal)"
                                  canEdit={canCorrectAmounts}
                                  onEdit={() =>
                                    openCorrection(customer, invoice, 'Cash', invoice.sessionCashAmount)
                                  }
                                />
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                <AmountWithEdit
                                  value={invoice.sessionChequeAmount}
                                  canEdit={canCorrectAmounts}
                                  onEdit={() =>
                                    openCorrection(customer, invoice, 'Cheque', invoice.sessionChequeAmount)
                                  }
                                />
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                {amountOrDash(invoice.sessionTransferAmount)}
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                {amountOrDash(invoice.sessionTotalCollected)}
                              </td>
                              <td
                                className="mono"
                                style={{
                                  textAlign: 'right',
                                  color:
                                    invoice.outstandingAmount > 0
                                      ? 'var(--color-danger)'
                                      : 'var(--color-teal)',
                                }}
                              >
                                {invoice.outstandingAmount > 0
                                  ? money(invoice.outstandingAmount)
                                  : '✓'}
                              </td>
                            </tr>
                          ))
                        : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Blank>No collection entries to reconcile.</Blank>
        )}
      </section>
      <div className="no-print">
        <Link className="button-secondary" to={`/collections/sessions/${id}`}>
          Back to session
        </Link>
      </div>

      <Modal
        open={Boolean(correction)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !correctAmount.isPending) setCorrection(null)
        }}
        title={`Correct ${correction?.method || ''} Amount`}
        description={
          correction
            ? `${correction.customerName} — invoice ${correction.invoiceLabel}. Reverses the old amount's effect on this invoice and the customer ledger, then reapplies the corrected amount, so everything stays consistent. Only works when this entry isn't split across other invoices and has no write-off.`
            : ''
        }
        maxWidth="440px"
      >
        {correction ? (
          <form onSubmit={submitCorrection} style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Current amount</span>
              <strong className="mono">{money(correction.currentAmount)}</strong>
            </div>
            <label>
              <span className="form-label">Corrected amount</span>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                className="form-input mono"
                style={{ ...inputStyle, marginTop: 6 }}
                value={correction.newAmount}
                onChange={(e) => setCorrection({ ...correction, newAmount: e.target.value })}
              />
            </label>
            <label>
              <span className="form-label">Reason (required)</span>
              <textarea
                required
                rows={3}
                className="form-input"
                style={{ ...inputStyle, height: 'auto', marginTop: 6, paddingTop: 8 }}
                value={correction.reason}
                onChange={(e) => setCorrection({ ...correction, reason: e.target.value })}
                placeholder="E.g. collector entered the wrong figure — confirmed with customer's receipt."
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setCorrection(null)}
                disabled={correctAmount.isPending}
                style={{ height: 36 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button-primary"
                disabled={correctAmount.isPending}
                style={{ height: 36 }}
              >
                {correctAmount.isPending ? 'Saving...' : 'Save correction'}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  )
}
