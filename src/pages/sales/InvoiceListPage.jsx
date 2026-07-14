import dayjs from 'dayjs'
import { CalendarDays, ChevronRight, ClipboardCheck, FileText, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { masterService } from '@/services/api/masterService'
import { salesService } from '@/services/api/salesService'
import SimplePagination from '@components/ui/SimplePagination'
import { formatDate } from '@/utils'

function money(value) {
  return Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const pageSize = 12

function invoiceStatusLabel(status) {
  return String(status || '').replace(/([a-z])([A-Z])/g, '$1 $2')
}

export default function InvoiceListPage() {
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [salesRouteId, setSalesRouteId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [allRoutes, setAllRoutes] = useState([])

  const customerNameById = useMemo(() => {
    return customers.reduce((map, customer) => {
      map[customer.id] = customer.name
      return map
    }, {})
  }, [customers])

  useEffect(() => {
    let isCurrent = true

    async function loadRoutes() {
      try {
        const territoriesList = await masterService.listTerritories()
        if (!isCurrent) return

        const results = await Promise.all(
          territoriesList.map((t) =>
            masterService
              .listSalesRoutes({ territoryId: t.id, page: 1, pageSize: 100 })
              .catch(() => ({ items: [] }))
          )
        )
        if (!isCurrent) return

        const routes = results.flatMap((r) => r.items || [])
        setAllRoutes(routes)
      } catch (e) {
        console.error('Failed to load sales routes:', e)
      }
    }
    loadRoutes()

    return () => {
      isCurrent = false
    }
  }, [])

  const filteredInvoices = useMemo(() => {
    let result = invoices

    const term = search.trim().toLowerCase()
    if (term) {
      result = result.filter((invoice) => {
        const customerName = customerNameById[invoice.customerId] || ''
        return (
          invoice.invoiceNumber.toLowerCase().includes(term) ||
          invoice.id.toLowerCase().includes(term) ||
          customerName.toLowerCase().includes(term)
        )
      })
    }

    if (statusFilter) {
      result = result.filter((invoice) => invoice.status === statusFilter)
    }

    if (salesRouteId) {
      result = result.filter((invoice) => invoice.salesRouteId === salesRouteId)
    }

    if (invoiceDate) {
      result = result.filter((invoice) => {
        return dayjs(invoice.invoiceDate).format('YYYY-MM-DD') === invoiceDate
      })
    }

    return result
  }, [customerNameById, invoices, search, statusFilter, salesRouteId, invoiceDate])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, salesRouteId, invoiceDate, search])

  const pagedInvoices = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return filteredInvoices.slice(startIndex, startIndex + pageSize)
  }, [filteredInvoices, page])

  useEffect(() => {
    let isCurrent = true
    async function loadCustomers() {
      try {
        const result = await salesService.listAllCustomers({ pageSize: 100, isActive: true })
        if (!isCurrent) return
        setCustomers(result || [])
      } catch (loadError) {
        if (!isCurrent) return
        setError(loadError.message)
      }
    }
    loadCustomers()
    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    if (customers.length === 0) return

    let isCurrent = true

    async function loadInvoicesData() {
      setIsLoading(true)
      setError('')
      try {
        let fetchedInvoices = []
        if (salesRouteId && invoiceDate) {
          fetchedInvoices = await salesService.listInvoicesByRouteAndDate({
            salesRouteId,
            date: invoiceDate,
          })
        } else {
          const statusMap = {
            Draft: 1,
            Unpaid: 2,
            PartiallyPaid: 3,
            Paid: 4,
            Cancelled: 5,
          }
          const statusInt = statusFilter ? statusMap[statusFilter] : null
          fetchedInvoices = await salesService.listInvoices({
            status: statusInt,
            pageSize: 1000,
          })
        }

        if (!isCurrent) return

        fetchedInvoices.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))
        setInvoices(fetchedInvoices)
      } catch (loadError) {
        if (!isCurrent) return
        setError(loadError.message)
        setInvoices([])
        toast.error(loadError.message)
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    loadInvoicesData()

    return () => {
      isCurrent = false
    }
  }, [customers, salesRouteId, invoiceDate, statusFilter])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize))
    if (page > totalPages) setPage(totalPages)
  }, [filteredInvoices.length, page])

  function clearFilters() {
    setStatusFilter('')
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
      </div>

      <div
        className="panel responsive-filter-bar"
        style={{
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
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
            placeholder="Invoice, ID, or customer"
            style={{
              width: '100%',
              height: 40,
              paddingLeft: 36,
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ position: 'relative', width: 160 }}>
          <select
            className="form-input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={{
              width: '100%',
              height: 40,
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              fontSize: 14,
              cursor: 'pointer',
              appearance: 'none',
              paddingLeft: 12,
              paddingRight: 36,
            }}
          >
            <option value="" style={{ background: 'var(--color-bg-elevated)' }}>
              All statuses
            </option>
            <option value="Draft" style={{ background: 'var(--color-bg-elevated)' }}>
              Draft
            </option>
            <option value="Unpaid" style={{ background: 'var(--color-bg-elevated)' }}>
              Unpaid
            </option>
            <option value="PartiallyPaid" style={{ background: 'var(--color-bg-elevated)' }}>
              Partially Paid
            </option>
            <option value="Paid" style={{ background: 'var(--color-bg-elevated)' }}>
              Paid
            </option>
            <option value="Cancelled" style={{ background: 'var(--color-bg-elevated)' }}>
              Cancelled
            </option>
          </select>
          <div
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-dim)',
            }}
          >
            <svg style={{ width: 14, height: 14, fill: 'currentColor' }} viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>

        <div style={{ position: 'relative', width: 180 }}>
          <select
            className="form-input"
            value={salesRouteId}
            onChange={(event) => setSalesRouteId(event.target.value)}
            style={{
              width: '100%',
              height: 40,
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              fontSize: 14,
              cursor: 'pointer',
              appearance: 'none',
              paddingLeft: 12,
              paddingRight: 36,
            }}
          >
            <option value="" style={{ background: 'var(--color-bg-elevated)' }}>
              Sales route...
            </option>
            {allRoutes.map((route) => (
              <option
                key={route.id}
                value={route.id}
                style={{ background: 'var(--color-bg-elevated)' }}
              >
                {route.name || route.id}
              </option>
            ))}
          </select>
          <div
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-dim)',
            }}
          >
            <svg style={{ width: 14, height: 14, fill: 'currentColor' }} viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>

        <div style={{ width: 150 }}>
          <input
            className="form-input"
            type="date"
            value={invoiceDate}
            onChange={(event) => setInvoiceDate(event.target.value)}
            style={{
              width: '100%',
              height: 40,
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              fontSize: 14,
            }}
          />
        </div>

        <button
          type="button"
          className="button-secondary"
          onClick={clearFilters}
          style={{ height: 40, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7 }}
        >
          <X size={15} /> Clear
        </button>
      </div>

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

        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.05)' }}>
          {[
            { label: 'All',            value: '' },
            { label: 'Unpaid',         value: 'Unpaid' },
            { label: 'Partially Paid', value: 'PartiallyPaid' },
            { label: 'Paid',           value: 'Paid' },
            { label: 'Cancelled',      value: 'Cancelled' },
          ].map(tab => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '1px solid ' + (isActive ? 'var(--color-teal)' : 'rgba(255,255,255,0.1)'),
                  background: isActive ? 'rgba(32,212,191,0.15)' : 'rgba(0,0,0,0.2)',
                  color: isActive ? 'var(--color-teal)' : 'var(--color-text-dim)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
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
                        {formatDate(invoice.invoiceDate)}
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
