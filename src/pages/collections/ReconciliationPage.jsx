import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Printer, Scale } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import ConfirmDialog from '@components/ui/ConfirmDialog'
import StatusBadge from '@components/ui/StatusBadge'
import AgingBadge from '@/components/collections/AgingBadge'
import { useCollectionSession, useVerifySession } from '@/hooks/useCollections'
import { salesService } from '@/services/api/salesService'
import { daysOverdue, formatDate } from '@/utils'
import { Blank, Busy, Metric, PageTitle, Problem, money } from './collectionsUi'

export default function ReconciliationPage() {
  const { id } = useParams()
  const session = useCollectionSession(id)
  const verify = useVerifySession()
  const customerIds = useMemo(
    () => [...new Set((session.data?.collections || []).map((row) => row.customerId))],
    [session.data]
  )
  const invoiceIds = useMemo(
    () => [
      ...new Set((session.data?.collections || []).map((row) => row.invoiceId).filter(Boolean)),
    ],
    [session.data]
  )
  const customers = useQuery({
    queryKey: ['sales', 'customers', 'reconciliation', customerIds],
    queryFn: () =>
      Promise.all(customerIds.map((customerId) => salesService.getCustomer(customerId))),
    enabled: customerIds.length > 0,
  })
  const invoices = useQuery({
    queryKey: ['sales', 'invoices', 'reconciliation', invoiceIds],
    queryFn: () => Promise.all(invoiceIds.map((invoiceId) => salesService.getInvoice(invoiceId))),
    enabled: invoiceIds.length > 0,
  })
  const report = useMemo(() => {
    const customerById = Object.fromEntries((customers.data || []).map((row) => [row.id, row]))
    const invoiceById = Object.fromEntries((invoices.data || []).map((row) => [row.id, row]))
    const grouped = new Map()
    for (const collection of session.data?.collections || []) {
      const line = grouped.get(collection.customerId) || {
        customerId: collection.customerId,
        customerName: customerById[collection.customerId]?.name || collection.customerId,
        cash: 0,
        cheques: 0,
        invoiceIds: new Set(),
      }
      if (collection.method === 'Cash') line.cash += Number(collection.amount || 0)
      else if (collection.method === 'Cheque') line.cheques += Number(collection.amount || 0)
      if (collection.invoiceId) line.invoiceIds.add(collection.invoiceId)
      grouped.set(collection.customerId, line)
    }
    const lines = [...grouped.values()].map((line) => {
      const linked = [...line.invoiceIds].map((invoiceId) => invoiceById[invoiceId]).filter(Boolean)
      const invoiced = linked.reduce(
        (sum, invoice) => sum + Number(invoice.netAmount ?? invoice.totalAmount ?? 0),
        0
      )
      const outstanding = Math.max(0, invoiced - line.cash - line.cheques)
      const dueDate = linked
        .map((invoice) => invoice.dueDate)
        .filter(Boolean)
        .sort()[0]
      return {
        ...line,
        invoiced,
        outstanding,
        dueDate,
        overdue: dueDate ? Math.max(0, daysOverdue(dueDate)) : 0,
      }
    })
    const invoiced = lines.reduce((sum, line) => sum + line.invoiced, 0)
    const collected = Number(session.data?.totalAmount || 0)
    return { lines, invoiced, collected, variance: invoiceIds.length ? invoiced - collected : 0 }
  }, [customers.data, invoiceIds.length, invoices.data, session.data])

  if (session.isLoading) return <Busy label="Preparing reconciliation..." />
  if (session.isError) return <Problem error={session.error} />
  const data = session.data
  if (!data) return <Blank>Session was not found.</Blank>
  const hasInvoiceBasis = invoiceIds.length > 0
  const balanced = hasInvoiceBasis ? Math.abs(report.variance) < 0.01 : true

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
      {!hasInvoiceBasis ? (
        <div
          style={{
            padding: 11,
            borderRadius: 8,
            display: 'flex',
            gap: 8,
            color: 'var(--color-amber)',
            border: '1px solid rgba(245,158,11,.25)',
            background: 'rgba(245,158,11,.07)',
          }}
        >
          <AlertTriangle size={16} /> No collection entries are linked to invoices. The backend does
          not expose a reconciliation endpoint, so invoiced variance cannot be calculated for
          unallocated payments.
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric
          label="Invoiced (linked)"
          value={hasInvoiceBasis ? money(report.invoiced) : 'Not available'}
        />
        <Metric
          label="Collected"
          value={money(report.collected)}
          tone="var(--color-teal)"
          helper={`${money(data.totalCash)} cash · ${money(data.totalCheques)} cheques`}
        />
        <Metric
          label="Variance"
          value={hasInvoiceBasis ? money(report.variance) : 'Not available'}
          tone={balanced ? 'var(--color-teal)' : 'var(--color-danger)'}
          helper={
            balanced ? 'Collection totals accounted for' : 'Review linked invoices and payments'
          }
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
            ['Total collected', data.totalAmount],
          ].map(([label, value], index) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: index === 2 ? 10 : 0,
                borderTop: index === 2 ? '1px solid var(--color-border)' : 0,
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
        {report.lines.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 850 }}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Due date</th>
                  <th>Overdue</th>
                  <th style={{ textAlign: 'right' }}>Invoiced</th>
                  <th style={{ textAlign: 'right' }}>Cash</th>
                  <th style={{ textAlign: 'right' }}>Cheques</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {report.lines.map((line) => (
                  <tr key={line.customerId}>
                    <td>{line.customerName}</td>
                    <td>{formatDate(line.dueDate)}</td>
                    <td>
                      <AgingBadge daysOverdue={line.overdue} />
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {line.invoiceIds.size ? money(line.invoiced) : 'Unallocated'}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {money(line.cash)}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {money(line.cheques)}
                    </td>
                    <td
                      className="mono"
                      style={{
                        textAlign: 'right',
                        color: line.outstanding > 0 ? 'var(--color-danger)' : 'inherit',
                      }}
                    >
                      {line.invoiceIds.size ? money(line.outstanding) : '—'}
                    </td>
                  </tr>
                ))}
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
