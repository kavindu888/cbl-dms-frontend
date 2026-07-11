import dayjs from 'dayjs'
import { CalendarDays, ChevronRight, ClipboardCheck, Plus, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import SimplePagination from '@components/ui/SimplePagination'
import { useAuthStore } from '@stores/authStore'
import { salesService } from '@/services/api/salesService'
import { useCreateCrn } from '@/hooks/useCrn'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'

function money(value) {
  return Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const pageSize = 10

function SearchableSelect({ value, onChange, options, placeholder, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = options.find((option) => option.value === value)
  const visibleOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase())
  )

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="form-input"
        disabled={disabled}
        value={isOpen ? query : selected?.label || ''}
        placeholder={placeholder}
        onFocus={() => {
          setQuery('')
          setIsOpen(true)
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        style={{ width: '100%' }}
      />
      {isOpen && !disabled ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: 220,
            overflowY: 'auto',
            zIndex: 20,
            border: '1px solid var(--color-border)',
            borderRadius: 7,
            background: 'var(--color-bg-surface)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {visibleOptions.length ? visibleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
                setQuery('')
              }}
              style={{
                width: '100%',
                padding: '9px 11px',
                borderBottom: '1px solid var(--color-border)',
                background: option.value === value ? 'var(--color-bg-hover)' : 'transparent',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 12,
              }}
            >
              {option.label}
            </button>
          )) : (
            <div style={{ padding: 10, color: 'var(--color-text-muted)', fontSize: 12 }}>
              No matching records.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function CrnListPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [customers, setCustomers] = useState([])
  const [crns, setCrns] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [customerIdFilter, setCustomerIdFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  // New CRN Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newCustomerId, setNewCustomerId] = useState('')
  const [newInvoiceId, setNewInvoiceId] = useState('')
  const [newReturnDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [newNotes, setNewNotes] = useState('')
  const [customerInvoices, setCustomerInvoices] = useState([])
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false)

  const createCrnMutation = useCreateCrn()
  const canCreate = userHasPermission(user, PERMISSIONS.sales.crnCreate)

  const customerNameById = useMemo(() => {
    return customers.reduce((map, customer) => {
      map[customer.id] = customer.name
      return map
    }, {})
  }, [customers])
  const customerOptions = useMemo(
    () => customers.map((customer) => ({
      value: customer.id,
      label: `${customer.code ? `${customer.code} - ` : ''}${customer.name}`,
    })),
    [customers]
  )
  const invoiceOptions = useMemo(
    () => customerInvoices.map((invoice) => ({
      value: invoice.id,
      label: `${invoice.invoiceNumber}${invoice.status === 'Paid' ? ' ✓' : ''} | ${dayjs(invoice.invoiceDate).format('DD MMM YYYY')} | Rs. ${money(invoice.netAmount)}`,
    })),
    [customerInvoices]
  )

  // Load Customers
  useEffect(() => {
    async function loadCustomers() {
      try {
        const result = await salesService.listCustomers({ page: 1, pageSize: 100, isActive: true })
        setCustomers(result.items || [])
      } catch (err) {
        console.error('Failed to load customers:', err)
      }
    }
    loadCustomers()
  }, [])

  // Load CRNs (since list query endpoint isn't fully separate, list by customer or my-returns)
  const loadCrns = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      let fetched = []
      if (customerIdFilter) {
        fetched = await salesService.listCrnsByCustomer(customerIdFilter)
      } else {
        fetched = await salesService.listMyReturnNotes()
      }
      setCrns(fetched || [])
    } catch (err) {
      setError(err.message || 'Unable to load return notes.')
      setCrns([])
    } finally {
      setIsLoading(false)
    }
  }, [customerIdFilter])

  useEffect(() => {
    loadCrns()
  }, [loadCrns])

  // Load Invoices for selected customer in creation modal
  useEffect(() => {
    if (!newCustomerId) {
      setCustomerInvoices([])
      setNewInvoiceId('')
      return
    }

    async function loadInvoices() {
      setIsLoadingInvoices(true)
      try {
        const list = await salesService.getInvoicesByCustomer(newCustomerId)
        setCustomerInvoices(list || [])
      } catch (err) {
        toast.error('Failed to load customer invoices.')
      } finally {
        setIsLoadingInvoices(false)
      }
    }
    loadInvoices()
  }, [newCustomerId])

  const filteredCrns = useMemo(() => {
    let result = crns

    const term = search.trim().toLowerCase()
    if (term) {
      result = result.filter((crn) => {
        const customerName = crn.customerName || customerNameById[crn.customerId] || ''
        const returnNumber = crn.returnNumber || crn.id || ''
        return (
          returnNumber.toLowerCase().includes(term) ||
          customerName.toLowerCase().includes(term)
        )
      })
    }

    if (statusFilter) {
      result = result.filter((crn) => crn.status === statusFilter)
    }

    if (dateFilter) {
      result = result.filter((crn) => {
        return dayjs(crn.createdAt || crn.returnDate).format('YYYY-MM-DD') === dateFilter
      })
    }

    return result
  }, [customerNameById, crns, search, statusFilter, dateFilter])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, dateFilter, search])

  const pagedCrns = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return filteredCrns.slice(startIndex, startIndex + pageSize)
  }, [filteredCrns, page])

  function clearFilters() {
    setStatusFilter('')
    setCustomerIdFilter('')
    setDateFilter('')
    setSearch('')
  }

  async function handleCreateDraft(e) {
    e.preventDefault()
    if (!newCustomerId) return toast.error('Customer is required.')

    createCrnMutation.mutate({
      customerId: newCustomerId,
      invoiceId: newInvoiceId || null,
      notes: newNotes.trim() || null,
    }, {
      onSuccess: (data) => {
        setIsModalOpen(false)
        // Reset form
        setNewCustomerId('')
        setNewInvoiceId('')
        setNewNotes('')
        
        // Navigate to detail page
        if (data?.id) {
          navigate(`/sales/return-notes/${data.id}`)
        } else {
          loadCrns()
        }
      }
    })
  }

  function closeCreatePanel() {
    setIsModalOpen(false)
    setNewCustomerId('')
    setNewInvoiceId('')
    setNewNotes('')
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
            Customer Return Notes
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Manage bad goods returns, claim validation, and issue customer credits.
          </p>
        </div>
        {canCreate ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="button-primary"
            style={{ height: 40, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} /> New Return Note
          </button>
        ) : null}
      </div>

      <div
        className="responsive-master-detail"
        style={{
          display: 'grid',
          gridTemplateColumns: isModalOpen ? 'minmax(0, 1fr) 380px' : 'minmax(0, 1fr)',
          gap: 14,
          flex: 1,
          minHeight: 0,
        }}
      >
        <main style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
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
            placeholder="Search return note # or customer"
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

        <div style={{ position: 'relative', width: 220 }}>
          <select
            className="form-input"
            value={customerIdFilter}
            onChange={(event) => setCustomerIdFilter(event.target.value)}
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
              All Customers (My Returns)
            </option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id} style={{ background: 'var(--color-bg-elevated)' }}>
                {customer.name}
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
            <option value="Draft" style={{ background: 'var(--color-bg-elevated)' }}>Draft</option>
            <option value="Submitted" style={{ background: 'var(--color-bg-elevated)' }}>Submitted</option>
            <option value="Verified" style={{ background: 'var(--color-bg-elevated)' }}>Verified</option>
            <option value="Rejected" style={{ background: 'var(--color-bg-elevated)' }}>Rejected</option>
            <option value="Cancelled" style={{ background: 'var(--color-bg-elevated)' }}>Cancelled</option>
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
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
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
            <ClipboardCheck size={16} color="var(--color-teal)" />
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>Customer Return Notes Log</h2>
          </div>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {filteredCrns.length} notes
          </span>
        </div>

        {error ? (
          <EmptyMessage>{error}</EmptyMessage>
        ) : isLoading ? (
          <EmptyMessage>Loading return notes...</EmptyMessage>
        ) : filteredCrns.length ? (
          <div style={{ overflowX: 'auto', flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <table className="data-table product-table-compact" style={{ minWidth: 920 }}>
              <thead>
                <tr>
                  <th>Return #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Total Credit Amount (LKR)</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {pagedCrns.map((crn) => (
                  <tr key={crn.id}>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--color-amber)' }}>
                      {crn.returnNumber || crn.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td>{crn.customerName || customerNameById[crn.customerId] || crn.customerId}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <CalendarDays size={13} color="var(--color-text-dim)" />
                        {dayjs(crn.createdAt || crn.returnDate).format('DD MMM YYYY')}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={crn.reason} />
                    </td>
                    <td>
                      <StatusBadge status={crn.status} />
                    </td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-teal)' }}>
                      {money(crn.totalCreditAmount)}
                    </td>
                    <td>
                      <Link
                        className="btn-table-action btn-table-action-view"
                        to={`/sales/return-notes/${crn.id}`}
                        title="View details"
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
          <EmptyMessage>No return notes found.</EmptyMessage>
        )}

        <div style={{ padding: '0 16px 12px' }}>
          <SimplePagination
            page={page}
            pageSize={pageSize}
            totalItems={filteredCrns.length}
            onPageChange={setPage}
            itemLabel="notes"
          />
        </div>
          </section>
        </main>

        {isModalOpen ? (
          <aside
            className="panel"
            style={{
              minHeight: 0,
              overflowY: 'auto',
              alignSelf: 'stretch',
              padding: 16,
              borderTop: '3px solid var(--color-teal)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
                paddingBottom: 14,
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 800 }}>New Return Note</h2>
                  <StatusBadge status="Draft" />
                </div>
                <p style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Create the draft before adding return lines.
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={closeCreatePanel}
                aria-label="Close create return note panel"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleCreateDraft} style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="form-label">Customer <span style={{ color: 'var(--color-danger)' }}>*</span></span>
                <SearchableSelect
                  value={newCustomerId}
                  onChange={setNewCustomerId}
                  options={customerOptions}
                  placeholder="Search customer..."
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="form-label">Return Date</span>
                <input className="form-input mono" type="date" value={newReturnDate} readOnly />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="form-label">Link to Invoice</span>
                <SearchableSelect
                  value={newInvoiceId}
                  onChange={setNewInvoiceId}
                  options={invoiceOptions}
                  placeholder={isLoadingInvoices ? 'Loading invoices...' : 'Search customer invoice...'}
                  disabled={!newCustomerId || isLoadingInvoices}
                />
                <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                  Optional. Select a customer first to load invoices.
                </span>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="form-label">Notes</span>
                <textarea
                  className="form-input"
                  value={newNotes}
                  onChange={(event) => setNewNotes(event.target.value)}
                  placeholder="Optional return details or batch references..."
                  rows={4}
                  style={{ paddingTop: 10, resize: 'vertical' }}
                />
              </label>

              <button
                type="submit"
                className="button-primary"
                disabled={createCrnMutation.isPending}
                style={{ width: '100%', height: 42, justifyContent: 'center', marginTop: 4 }}
              >
                {createCrnMutation.isPending ? 'Saving Draft...' : 'Save Draft'}
              </button>
            </form>
          </aside>
        ) : null}
      </div>
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
