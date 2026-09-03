import { CheckCircle2, ChevronDown, ChevronRight, Printer, Scale } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AgingBadge from '@/components/collections/AgingBadge'
import ConfirmDialog from '@components/ui/ConfirmDialog'
import StatusBadge from '@components/ui/StatusBadge'
import { useReconciliation, useVerifySession } from '@/hooks/useCollections'
import { formatDate } from '@/utils'
import { Blank, Busy, Metric, PageTitle, Problem, money } from './collectionsUi'

const amountOrDash = (value) => (Number(value || 0) > 0 ? money(value) : '—')

export default function ReconciliationPage() {
  const { id } = useParams()
  const reconciliation = useReconciliation(id)
  const verify = useVerifySession()
  const [expandedCustomers, setExpandedCustomers] = useState({})

  if (reconciliation.isLoading) return <Busy label="Preparing reconciliation..." />
  if (reconciliation.isError) return <Problem error={reconciliation.error} />
  const data = reconciliation.data
  if (!data) return <Blank>Session was not found.</Blank>

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

  return (
    <div
      className="collections-print-report"
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <PageTitle
        title="Daily Reconciliation"
        subtitle={`${data.sessionNumber} · Route ${data.routeId} · ${formatDate(data.sessionDate)}`}
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
        </div>
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
                              <td className="mono" style={{ textAlign: 'right', color: 'var(--color-teal)' }}>
                                {amountOrDash(invoice.sessionCashAmount)}
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                {amountOrDash(invoice.sessionChequeAmount)}
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
    </div>
  )
}
