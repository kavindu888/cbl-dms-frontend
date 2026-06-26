import dayjs from 'dayjs'
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FilePlus2,
  FileText,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { salesService } from '@/services/api/salesService'
import SimplePagination from '@components/ui/SimplePagination'

function money(value) {
  return Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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

const pageSize = 12

function invoiceStatusLabel(status) {
  return String(status || '').replace(/([a-z])([A-Z])/g, '$1 $2')
}

export default function InvoiceListPage() {
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [salesRouteId, setSalesRouteId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
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
    setPage(1)
  }, [customerId, salesRouteId, invoiceDate, search])

  const pagedInvoices = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return filteredInvoices.slice(startIndex, startIndex + pageSize)
  }, [filteredInvoices, page])

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

  const loadInvoices = useCallback(async () => {
    if (!customerId && (!salesRouteId || !invoiceDate)) return

    setIsLoading(true)
    setError('')

    try {
      const result = customerId
        ? await salesService.listOutstandingInvoicesByCustomer(customerId)
        : await salesService.listInvoicesByRouteAndDate({
            salesRouteId,
            date: `${invoiceDate}T00:00:00Z`,
          })

      setInvoices(result)
    } catch (loadError) {
      setError(loadError.message)
      setInvoices([])
      toast.error(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [customerId, invoiceDate, salesRouteId])

  useEffect(() => {
    if (customerId || (salesRouteId && invoiceDate)) {
      loadInvoices()
    }
  }, [customerId, invoiceDate, loadInvoices, salesRouteId])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize))
    if (page > totalPages) setPage(totalPages)
  }, [filteredInvoices.length, page])

  function clearFilters() {
    setCustomerId('')
    setSalesRouteId('')
    setInvoiceDate('')
    setSearch('')
  }

  return (
    <div
      style={{
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Sales Invoices
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Search by customer outstanding invoices, or by sales route and date.
          </p>
        </div>
        <Link
          to="/sales/invoices/new"
          className="button-primary"
          style={{ height: 40, padding: '0 16px' }}
        >
          <FilePlus2 size={16} /> New Invoice
        </Link>
      </div>

      <section
        className="panel"
        style={{
          padding: 16,
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 1fr) repeat(3, minmax(145px, 180px)) auto auto',
          alignItems: 'end',
          gap: 12,
        }}
      >
        <Field label="Search">
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                color: 'var(--color-text-dim)',
                transform: 'translateY(-50%)',
              }}
            />
            <input
              className="form-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Invoice, ID, or customer"
              style={{ paddingLeft: 36 }}
            />
          </div>
        </Field>

        <Field label="Customer">
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
        </Field>

        <Field label="Sales Route">
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
        </Field>

        <Field label="Invoice Date">
          <input
            className="form-input"
            type="date"
            value={invoiceDate}
            onChange={(event) => setInvoiceDate(event.target.value)}
            disabled={Boolean(customerId)}
          />
        </Field>

        <button
          className="button-primary"
          type="button"
          onClick={loadInvoices}
          disabled={isLoading || (!customerId && !salesRouteId) || (salesRouteId && !invoiceDate)}
          style={{ height: 40 }}
        >
          {isLoading ? 'Loading...' : 'Load'}
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={clearFilters}
          style={{ height: 40 }}
        >
          <X size={15} /> Clear
        </button>
      </section>

      <section
        className="panel"
        style={{
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        <div
          style={{
            padding: '13px 16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color="var(--color-teal)" />
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>Invoice Register</h2>
          </div>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {filteredInvoices.length} invoices
          </span>
        </div>

        {error ? (
          <EmptyMessage>{error}</EmptyMessage>
        ) : isLoading ? (
          <EmptyMessage>Loading invoices...</EmptyMessage>
        ) : filteredInvoices.length ? (
          <div style={{ overflowX: 'auto', flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <table className="data-table product-table-compact" style={{ minWidth: 920 }}>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Net Amount (Rs.)</th>
                  <th style={{ textAlign: 'right' }}>Paid (Rs.)</th>
                  <th style={{ textAlign: 'right' }}>Outstanding (Rs.)</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {pagedInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--color-amber)' }}>
                      {invoice.invoiceNumber}
                    </td>
                    <td>{customerNameById[invoice.customerId] || invoice.customerId}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <CalendarDays size={13} color="var(--color-text-dim)" />
                        {dayjs(invoice.invoiceDate).format('DD MMM YYYY')}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={invoiceStatusLabel(invoice.status)} />
                    </td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                      {money(invoice.netAmount)}
                    </td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                      {money(invoice.paidAmount)}
                    </td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                      {money(invoice.outstandingAmount)}
                    </td>
                    <td>
                      <Link
                        className="btn-table-action btn-table-action-view"
                        to={`/sales/invoices/${invoice.id}`}
                        title="View invoice"
                      >
                        <span>View</span>
                        <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyMessage>No invoices loaded.</EmptyMessage>
        )}

        <div style={{ padding: '0 16px 12px' }}>
          <SimplePagination
            page={page}
            pageSize={pageSize}
            totalItems={filteredInvoices.length}
            onPageChange={setPage}
            itemLabel="invoices"
          />
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
      <span className="form-label" style={{ marginBottom: 0 }}>
        {label}
      </span>
      {children}
    </label>
  )
}

function EmptyMessage({ children }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        color: 'var(--color-text-muted)',
        textAlign: 'center',
        fontSize: 13,
      }}
    >
      <div>
        <ClipboardCheck
          size={34}
          style={{ margin: '0 auto 10px', color: 'var(--color-text-dim)' }}
        />
        {children}
      </div>
    </div>
  )
}
