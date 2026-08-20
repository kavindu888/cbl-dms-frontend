import dayjs from 'dayjs'
import { CalendarDays, ChevronRight, ClipboardList, FileText, Pencil, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '@components/ui/StatusBadge'
import SimplePagination from '@components/ui/SimplePagination'
import { masterService } from '@/services/api/masterService'
import { salesService } from '@/services/api/salesService'
import InvoiceDetailPanel from './InvoiceDetailPanel'

const invoicePageSize = 5

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Unpaid', label: 'Unpaid' },
  { value: 'PartiallyPaid', label: 'Partially Paid' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Cancelled', label: 'Cancelled' },
]

const statusMap = {
  Draft: 1,
  Unpaid: 2,
  PartiallyPaid: 3,
  Paid: 4,
  Cancelled: 5,
}

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value) {
  return value ? dayjs(value).format('DD MMM YYYY') : '-'
}

function invoiceStatusLabel(status) {
  return String(status || '').replace(/([a-z])([A-Z])/g, '$1 $2')
}

function amountTone(value) {
  return Number(value || 0) > 0 ? 'var(--color-amber)' : 'var(--color-teal)'
}

export default function InvoiceListPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [salesRouteId, setSalesRouteId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [selectedCustomerName, setSelectedCustomerName] = useState('')
  const [selectedSalesRouteName, setSelectedSalesRouteName] = useState('')
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [error, setError] = useState('')
  const [invoicePage, setInvoicePage] = useState(1)
  const [allRoutes, setAllRoutes] = useState([])

  const customerNameById = useMemo(() => {
    return customers.reduce((map, customer) => {
      map[customer.id] = customer.name
      return map
    }, {})
  }, [customers])

  const routeNameById = useMemo(() => {
    return allRoutes.reduce((map, route) => {
      map[route.id] = route.name
      return map
    }, {})
  }, [allRoutes])

  const productById = useMemo(() => {
    return products.reduce((map, product) => {
      map[product.id] = product
      return map
    }, {})
  }, [products])

  const productByLookup = useMemo(() => {
    return products.reduce((map, product) => {
      ;[product.id, product.sku, product.barcode].forEach((key) => {
        const normalized = String(key || '')
          .trim()
          .toLowerCase()
        if (normalized) map[normalized] = product
      })
      return map
    }, {})
  }, [products])

  const loadInvoices = useCallback(async () => {
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
        fetchedInvoices = await salesService.listInvoices({
          status: status ? statusMap[status] : null,
          pageSize: 1000,
        })
      }

      fetchedInvoices.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))
      setInvoices(fetchedInvoices)
    } catch (requestError) {
      setError(requestError.message)
      setInvoices([])
    } finally {
      setIsLoading(false)
    }
  }, [invoiceDate, salesRouteId, status])

  useEffect(() => {
    let isCurrent = true

    async function loadReferenceData() {
      try {
        const [customerResult, territoriesList] = await Promise.all([
          salesService.listCustomers({ page: 1, pageSize: 100, isActive: true }),
          masterService.listTerritories(),
        ])
        if (!isCurrent) return

        setCustomers(customerResult.items || [])

        const routeResults = await Promise.all(
          territoriesList.map((territory) =>
            masterService
              .listSalesRoutes({ territoryId: territory.id, page: 1, pageSize: 100 })
              .catch(() => ({ items: [] }))
          )
        )
        if (!isCurrent) return

        setAllRoutes(routeResults.flatMap((result) => result.items || []))
      } catch (requestError) {
        if (isCurrent) setError(requestError.message)
      }
    }

    loadReferenceData()

    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  useEffect(() => {
    if (!selectedId) {
      setSelectedInvoice(null)
      setProducts([])
      return
    }

    let isCurrent = true

    async function loadInvoiceDetail() {
      setIsLoadingDetail(true)
      setError('')

      try {
        const invoice = await salesService.getInvoice(selectedId)
        if (!isCurrent) return

        setSelectedInvoice(invoice)
        setSelectedCustomerName('')
        setSelectedSalesRouteName('')
        setProducts([])

        const detailRequests = []

        if (invoice.customerId) {
          detailRequests.push(
            salesService
              .getCustomer(invoice.customerId)
              .then((customer) => {
                if (isCurrent) setSelectedCustomerName(customer?.name || '')
              })
              .catch(() => {
                if (isCurrent) setSelectedCustomerName('')
              })
          )
        }

        if (invoice.salesRouteId) {
          detailRequests.push(
            masterService
              .getSalesRoute(invoice.salesRouteId)
              .then((route) => {
                if (isCurrent) setSelectedSalesRouteName(route?.name || '')
              })
              .catch(() => {
                if (isCurrent) setSelectedSalesRouteName('')
              })
          )
        }

        const returnLines = (invoice.returnSections || []).flatMap((section) => section.lines || [])
        const productIds = Array.from(
          new Set(
            [
              ...(invoice.lines || []).map((line) => line.productId),
              ...returnLines.map((line) => line.productId),
            ].filter(Boolean)
          )
        )

        if (productIds.length || returnLines.length) {
          detailRequests.push(
            Promise.all([
              Promise.allSettled(
                productIds.map((productId) => masterService.getProduct(productId))
              ),
              returnLines.length
                ? masterService
                    .listAllProducts({ pageSize: 1000, status: 'Active' })
                    .catch(() => [])
                : Promise.resolve([]),
            ])
              .then(([directResponses, catalogProducts]) => {
                if (!isCurrent) return
                const resolvedProducts = [
                  ...directResponses.flatMap((response) =>
                    response.status === 'fulfilled' && response.value ? [response.value] : []
                  ),
                  ...(catalogProducts || []),
                ]
                setProducts(
                  Array.from(
                    new Map(resolvedProducts.map((product) => [product.id, product])).values()
                  )
                )
              })
              .catch(() => {
                if (isCurrent) setProducts([])
              })
          )
        }

        await Promise.all(detailRequests)
      } catch (requestError) {
        if (!isCurrent) return
        setError(`Unable to load invoice details: ${requestError.message}`)
        setSelectedInvoice(null)
      } finally {
        if (isCurrent) setIsLoadingDetail(false)
      }
    }

    loadInvoiceDetail()

    return () => {
      isCurrent = false
    }
  }, [selectedId])

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = invoices.filter((invoice) => {
      const customerName = customerNameById[invoice.customerId] || ''
      const routeName = routeNameById[invoice.salesRouteId] || invoice.salesRouteName || ''
      const invoiceDay = dayjs(invoice.invoiceDate).format('YYYY-MM-DD')

      const matchesSearch =
        !query ||
        invoice.invoiceNumber?.toLowerCase().includes(query) ||
        invoice.id?.toLowerCase().includes(query) ||
        customerName.toLowerCase().includes(query) ||
        routeName.toLowerCase().includes(query)
      const matchesStatus = !status || invoice.status === status
      const matchesRoute = !salesRouteId || invoice.salesRouteId === salesRouteId
      const matchesDate = !invoiceDate || invoiceDay === invoiceDate

      return matchesSearch && matchesStatus && matchesRoute && matchesDate
    })

    return [...filtered].sort((a, b) => {
      const activityA = a.status === 'Draft' ? a.updatedAt || a.invoiceDate : a.invoiceDate
      const activityB = b.status === 'Draft' ? b.updatedAt || b.invoiceDate : b.invoiceDate
      const dateA = dayjs(activityA)
      const dateB = dayjs(activityB)
      if (!dateA.isSame(dateB)) return dateB.isAfter(dateA) ? 1 : -1
      return String(b.invoiceNumber || '').localeCompare(String(a.invoiceNumber || ''), undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    })
  }, [customerNameById, invoices, invoiceDate, routeNameById, salesRouteId, search, status])

  const pagedInvoices = useMemo(() => {
    const start = (invoicePage - 1) * invoicePageSize
    return filteredInvoices.slice(start, start + invoicePageSize)
  }, [filteredInvoices, invoicePage])

  useEffect(() => {
    setInvoicePage(1)
  }, [invoiceDate, salesRouteId, search, status])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / invoicePageSize))
    if (invoicePage > totalPages) setInvoicePage(totalPages)
  }, [filteredInvoices.length, invoicePage])

  useEffect(() => {
    if (filteredInvoices.length > 0) {
      const exists = filteredInvoices.some((invoice) => invoice.id === selectedId)
      if (!exists) setSelectedId(filteredInvoices[0].id)
    } else {
      setSelectedId(null)
    }
  }, [filteredInvoices, selectedId])

  function clearFilters() {
    setSearch('')
    setStatus('')
    setSalesRouteId('')
    setInvoiceDate('')
    setSelectedId(null)
  }

  const hasActiveFilters = Boolean(search.trim() || status || salesRouteId || invoiceDate)
  const displayInvoice = useMemo(() => {
    if (!selectedInvoice) return null

    return {
      ...selectedInvoice,
      returnSections: (selectedInvoice.returnSections || []).map((section) => ({
        ...section,
        lines: (section.lines || []).map((line) => {
          const lookupKeys = [line.productId, line.productSku, line.productName]
            .map((value) =>
              String(value || '')
                .trim()
                .toLowerCase()
            )
            .filter(Boolean)
          const product = lookupKeys.map((key) => productByLookup[key]).find(Boolean)
          const productCode = line.productSku || product?.sku || line.productId || line.productName
          const rawProductName = String(line.productName || '').trim()
          const productName =
            rawProductName && rawProductName !== productCode && rawProductName !== product?.sku
              ? rawProductName
              : product?.name || ''

          return {
            ...line,
            productName: <ReturnProductLabel code={productCode} name={productName} />,
          }
        }),
      })),
    }
  }, [productByLookup, selectedInvoice])

  return (
    <div
      className="responsive-page"
      style={{
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflow: 'hidden',
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            lineHeight: 1.2,
          }}
        >
          Sales Invoices
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Search by customer, invoice number, or filter by route/status.
        </p>
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
            placeholder="Search by invoice number or customer..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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

        <SelectShell width={180}>
          <select
            className="form-input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            style={selectStyle}
          >
            {statusOptions.map((option) => (
              <option
                key={option.label}
                value={option.value}
                style={{ background: 'var(--color-bg-elevated)' }}
              >
                {option.label}
              </option>
            ))}
          </select>
        </SelectShell>

        <SelectShell width={190}>
          <select
            className="form-input"
            value={salesRouteId}
            onChange={(event) => setSalesRouteId(event.target.value)}
            style={selectStyle}
          >
            <option value="" style={{ background: 'var(--color-bg-elevated)' }}>
              Sales route
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
        </SelectShell>

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

        {hasActiveFilters && (
          <button
            type="button"
            className="button-secondary"
            onClick={clearFilters}
            style={{ height: 40, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <X style={{ width: 15, height: 15 }} />
            Clear
          </button>
        )}
      </div>

      <div
        className="responsive-master-detail"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 380px) minmax(0, 1fr)',
          gap: 16,
          alignItems: 'stretch',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <section
          className="panel responsive-queue-panel"
          style={{
            padding: 12,
            display: 'grid',
            gridTemplateRows: 'auto minmax(0, 1fr) auto',
            minHeight: 0,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '4px 4px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--color-teal)',
                  background: 'rgba(142, 232, 240, 0.1)',
                  border: '1px solid rgba(142, 232, 240, 0.2)',
                }}
              >
                <ClipboardList style={{ width: 17, height: 17 }} />
              </div>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Invoice register
                </h2>
                <p style={{ marginTop: 2, fontSize: 11, color: 'var(--color-text-dim)' }}>
                  Select an invoice to view details
                </p>
              </div>
            </div>
            <span
              style={{
                padding: '4px 9px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--color-teal)',
                background: 'rgba(142, 232, 240, 0.1)',
              }}
            >
              {filteredInvoices.length}
            </span>
          </div>

          <div style={{ minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
            {error && !selectedId ? (
              <div className="p-6 text-sm text-danger">{error}</div>
            ) : isLoading ? (
              <QueueMessage>Loading invoices...</QueueMessage>
            ) : filteredInvoices.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pagedInvoices.map((invoice) => {
                  const isSelected = invoice.id === selectedId
                  const customerName = customerNameById[invoice.customerId] || 'Unknown customer'
                  const routeName =
                    routeNameById[invoice.salesRouteId] || invoice.salesRouteName || 'No route'

                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      key={invoice.id}
                      onClick={() => {
                        setError('')
                        setSelectedId(invoice.id)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setError('')
                          setSelectedId(invoice.id)
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: 13,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 11,
                        textAlign: 'left',
                        borderRadius: 8,
                        border: isSelected
                          ? '1px solid color-mix(in srgb, var(--color-teal) 45%, transparent)'
                          : '1px solid var(--color-border)',
                        background: isSelected
                          ? 'color-mix(in srgb, var(--color-teal) 10%, transparent)'
                          : 'var(--color-bg-elevated)',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                        }}
                      >
                        <span
                          className="mono"
                          style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-teal)' }}
                        >
                          {invoice.invoiceNumber}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <StatusBadge status={invoiceStatusLabel(invoice.status)} />
                          {invoice.status === 'Draft' ? (
                            <button
                              type="button"
                              className="button-primary"
                              onClick={(event) => {
                                event.stopPropagation()
                                navigate(`/sales/invoices/${invoice.id}/edit`)
                              }}
                              style={{ height: 28, padding: '0 10px' }}
                            >
                              <Pencil style={{ width: 13, height: 13 }} />
                              Edit
                            </button>
                          ) : null}
                          <ChevronRight
                            style={{
                              width: 15,
                              height: 15,
                              color: isSelected ? 'var(--color-teal)' : 'var(--color-text-dim)',
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          title={customerName}
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {customerName}
                        </div>
                        <div
                          title={routeName}
                          style={{
                            marginTop: 3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 11,
                            color: 'var(--color-text-dim)',
                          }}
                        >
                          {routeName}
                        </div>
                      </div>
                      <div
                        style={{
                          paddingTop: 10,
                          borderTop: '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 11,
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          <CalendarDays style={{ width: 13, height: 13 }} />
                          {formatDate(invoice.invoiceDate)}
                        </span>
                        <span
                          className="mono"
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: amountTone(invoice.outstandingAmount),
                          }}
                        >
                          {formatMoney(invoice.outstandingAmount)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <QueueMessage>No invoices match the selected filters.</QueueMessage>
            )}
          </div>

          <SimplePagination
            page={invoicePage}
            pageSize={invoicePageSize}
            totalItems={filteredInvoices.length}
            onPageChange={setInvoicePage}
            itemLabel="invoices"
          />
        </section>

        <section
          className="panel responsive-detail-panel"
          style={{ padding: 16, minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden' }}
        >
          {isLoadingDetail ? (
            <DetailMessage>Loading invoice details...</DetailMessage>
          ) : selectedInvoice ? (
            <InvoiceDetailPanel
              customerName={selectedCustomerName || customerNameById[selectedInvoice.customerId]}
              invoice={displayInvoice}
              productById={productById}
              salesRouteName={
                selectedSalesRouteName ||
                routeNameById[selectedInvoice.salesRouteId] ||
                selectedInvoice.salesRouteName
              }
            />
          ) : error ? (
            <DetailMessage>{error}</DetailMessage>
          ) : (
            <DetailMessage icon>Select an invoice to view details</DetailMessage>
          )}
        </section>
      </div>
    </div>
  )
}

const selectStyle = {
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
}

function SelectShell({ children, width }) {
  return (
    <div style={{ position: 'relative', width }}>
      {children}
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
  )
}

function QueueMessage({ children }) {
  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        fontSize: 13,
      }}
    >
      {children}
    </div>
  )
}

function ReturnProductLabel({ code, name }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span className="mono" style={{ fontSize: 12, color: 'var(--color-accent)' }}>
        {code || '-'}
      </span>
      {name ? <span className="product-info-sub">{name}</span> : null}
    </span>
  )
}

function DetailMessage({ children, icon = false }) {
  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        fontSize: 12,
      }}
    >
      {icon ? (
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--color-text-dim)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--color-border)',
          }}
        >
          <FileText style={{ width: 25, height: 25 }} />
        </div>
      ) : null}
      {children}
    </div>
  )
}
