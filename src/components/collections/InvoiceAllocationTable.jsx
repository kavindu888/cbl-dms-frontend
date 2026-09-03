import { Search, WandSparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatDate } from '@/utils'
import { money } from '@/pages/collections/collectionsUi'

// The number a customer actually recognizes is the serial number they were handed on the printed
// invoice — the system-generated invoice number is an internal reference they rarely quote back.
const invoiceLabel = (invoice) => invoice.serialNumber || invoice.invoiceNumber

export default function InvoiceAllocationTable({
  invoices = [],
  allocations,
  onChange,
  totalPayment,
}) {
  const [search, setSearch] = useState('')
  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return invoices
    return invoices.filter((invoice) =>
      [invoice.serialNumber, invoice.invoiceNumber]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    )
  }, [invoices, search])
  const setAllocation = (invoice, amount) => {
    const numeric = Math.max(
      0,
      Math.min(Number(amount || 0), Number(invoice.outstandingAmount || 0))
    )
    const next = allocations.filter((row) => row.invoiceId !== invoice.invoiceId)
    if (amount !== '') {
      next.push({
        invoiceId: invoice.invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        serialNumber: invoice.serialNumber,
        outstanding: Number(invoice.outstandingAmount || 0),
        allocated: amount === '' ? '' : String(numeric),
      })
    }
    onChange(next)
  }

  const autoAllocate = () => {
    let remaining = Number(totalPayment || 0)
    const next = []
    ;[...invoices]
      .sort(
        (a, b) =>
          new Date(a.dueDate || a.invoiceDate || 0) - new Date(b.dueDate || b.invoiceDate || 0)
      )
      .forEach((invoice) => {
        if (remaining <= 0) return
        const allocated = Math.min(remaining, Number(invoice.outstandingAmount || 0))
        if (allocated > 0) {
          next.push({
            invoiceId: invoice.invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            serialNumber: invoice.serialNumber,
            outstanding: Number(invoice.outstandingAmount || 0),
            allocated: allocated.toFixed(2),
          })
          remaining = Number((remaining - allocated).toFixed(2))
        }
      })
    onChange(next)
  }

  if (!invoices.length) {
    return (
      <div style={{ padding: 18, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No outstanding invoices.
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span className="form-label" style={{ margin: 0 }}>
          Outstanding invoices
        </span>
        <button
          type="button"
          className="button-ghost"
          onClick={autoAllocate}
          disabled={!Number(totalPayment)}
        >
          <WandSparkles size={13} /> Auto-allocate oldest first
        </button>
      </div>
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-dim)',
          }}
        />
        <input
          className="form-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by serial number..."
          style={{ paddingLeft: 32, height: 34 }}
        />
      </div>
      <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 8 }}>
        <table className="data-table" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Due</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'right' }}>Paid</th>
              <th style={{ textAlign: 'right' }}>Outstanding</th>
              <th style={{ textAlign: 'right' }}>Allocate</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No invoices match "{search}".
                </td>
              </tr>
            ) : null}
            {filteredInvoices.map((invoice) => {
              const allocation = allocations.find((row) => row.invoiceId === invoice.invoiceId)
              return (
                <tr key={invoice.invoiceId}>
                  <td>
                    <span className="mono" style={{ color: 'var(--color-amber)', fontWeight: 700 }}>
                      {invoiceLabel(invoice)}
                    </span>
                    {invoice.status === 'PartiallyPaid' ? (
                      <span
                        style={{
                          marginLeft: 7,
                          padding: '1px 5px',
                          borderRadius: 4,
                          border: '1px solid var(--color-amber)',
                          color: 'var(--color-amber)',
                          fontSize: 9,
                        }}
                      >
                        PARTIAL
                      </span>
                    ) : null}
                    {Number(invoice.daysOverdue || 0) > 0 ? (
                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 10,
                          color:
                            Number(invoice.daysOverdue) > 14
                              ? 'var(--color-danger)'
                              : 'var(--color-amber)',
                        }}
                      >
                        {invoice.daysOverdue} days overdue
                      </div>
                    ) : null}
                  </td>
                  <td>{formatDate(invoice.dueDate || invoice.invoiceDate)}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {money(invoice.netAmount)}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--color-teal)' }}>
                    {money(invoice.amountPaid)}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 750 }}>
                    {money(invoice.outstandingAmount)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <input
                      type="number"
                      min="0"
                      max={invoice.outstandingAmount}
                      step="0.01"
                      className="form-input mono"
                      value={allocation?.allocated || ''}
                      onChange={(event) => setAllocation(invoice, event.target.value)}
                      placeholder="0.00"
                      style={{
                        width: 112,
                        height: 34,
                        textAlign: 'right',
                        background: 'var(--color-bg-base)',
                      }}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
