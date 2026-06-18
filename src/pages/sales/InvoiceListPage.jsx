import dayjs from 'dayjs'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { salesService } from '@/services/api/salesService'

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function uniqueRoutes(customers) {
  const routes = new Map()

  customers.forEach((customer) => {
    if (customer.salesRouteId) {
      routes.set(customer.salesRouteId, customer.salesRouteId)
    }
  })

  return Array.from(routes.values())
}

export default function InvoiceListPage() {
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [salesRouteId, setSalesRouteId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const customerNameById = useMemo(() => {
    return customers.reduce((map, customer) => {
      map[customer.id] = customer.name
      return map
    }, {})
  }, [customers])

  const routeOptions = useMemo(() => uniqueRoutes(customers), [customers])

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return invoices

    return invoices.filter((invoice) => {
      const customerName = customerNameById[invoice.customerId] || ''
      return (
        invoice.invoiceNumber.toLowerCase().includes(term) ||
        invoice.id.toLowerCase().includes(term) ||
        customerName.toLowerCase().includes(term)
      )
    })
  }, [customerNameById, invoices, search])

  useEffect(() => {
    async function loadCustomers() {
      try {
        const result = await salesService.listCustomers({ page: 1, pageSize: 100, isActive: true })
        setCustomers(result.items || [])
      } catch (loadError) {
        setError(loadError.message)
      }
    }

    loadCustomers()
  }, [])

  async function loadInvoices() {
    setIsLoading(true)
    setError('')

    try {
      const result = customerId
        ? await salesService.listOutstandingInvoicesByCustomer(customerId)
        : await salesService.listInvoicesByRouteAndDate({
            salesRouteId,
            date: dayjs(invoiceDate).toISOString(),
          })

      setInvoices(result)
    } catch (loadError) {
      setError(loadError.message)
      setInvoices([])
      toast.error(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (customerId || (salesRouteId && invoiceDate)) {
      loadInvoices()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Sales Invoices
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Search by customer outstanding invoices, or by sales route and date.
          </p>
        </div>
      </div>

      <div className="panel" style={{ padding: 16, display: 'grid', gap: 12 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <select
            className="form-input"
            value={customerId}
            onChange={(event) => {
              setCustomerId(event.target.value)
              if (event.target.value) setSalesRouteId('')
            }}
          >
            <option value="">Customer outstanding...</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>

          <select
            className="form-input"
            value={salesRouteId}
            onChange={(event) => {
              setSalesRouteId(event.target.value)
              if (event.target.value) setCustomerId('')
            }}
            disabled={Boolean(customerId)}
          >
            <option value="">Sales route...</option>
            {routeOptions.map((routeId) => (
              <option key={routeId} value={routeId}>
                {routeId}
              </option>
            ))}
          </select>

          <input
            className="form-input"
            type="date"
            value={invoiceDate}
            onChange={(event) => setInvoiceDate(event.target.value)}
            disabled={Boolean(customerId)}
          />

          <button
            className="button-primary"
            type="button"
            onClick={loadInvoices}
            disabled={isLoading || (!customerId && !salesRouteId)}
          >
            {isLoading ? 'Loading...' : 'Load Invoices'}
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <Search
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              color: 'var(--color-text-dim)',
            }}
          />
          <input
            className="form-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter loaded invoices..."
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      {error && (
        <div className="panel" style={{ padding: 16, color: 'var(--color-danger)' }}>
          {error}
        </div>
      )}

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Date</th>
                <th className="text-right">Net Amount</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Outstanding</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <span className="mono text-sm" style={{ color: 'var(--color-amber)' }}>
                      {invoice.invoiceNumber}
                    </span>
                  </td>
                  <td>{customerNameById[invoice.customerId] || invoice.customerId}</td>
                  <td>{dayjs(invoice.invoiceDate).format('DD MMM YYYY')}</td>
                  <td className="text-right mono">{money(invoice.netAmount)}</td>
                  <td className="text-right mono">{money(invoice.paidAmount)}</td>
                  <td className="text-right mono">{money(invoice.outstandingAmount)}</td>
                  <td>
                    <StatusBadge status={invoice.status.toUpperCase()} />
                  </td>
                </tr>
              ))}

              {!isLoading && filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: 'center' }}>
                    No invoices loaded.
                  </td>
                </tr>
              )}

              {isLoading && (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: 'center' }}>
                    Loading invoices...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
