import dayjs from 'dayjs'
import { CalendarDays, ChevronRight, ClipboardList, FileText, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import StatusBadge from '@components/ui/StatusBadge'
import SimplePagination from '@components/ui/SimplePagination'
import { masterService } from '@/services/api/masterService'
import { salesService } from '@/services/api/salesService'

const pageSize = 5

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'Converted', label: 'Converted' },
]

const detailLabels = [
  { key: 'customer', label: 'Customer' },
  { key: 'salesRoute', label: 'Sales Route' },
  { key: 'salesPerson', label: 'Sales Person' },
  { key: 'orderDate', label: 'Order Date' },
  { key: 'deliveryDate', label: 'Delivery Date' },
]

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value) {
  if (!value) return '-'
  const date = dayjs(value)
  return date.isValid() ? date.format('DD MMM YYYY') : '-'
}

function statusLabel(status) {
  return String(status || 'Draft')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[\s-]+/g, ' ')
}

function getOrderDate(order) {
  return order?.orderDate || order?.createdAt || order?.date || order?.submittedAt || ''
}

function getDeliveryDate(order) {
  return order?.deliveryDate || order?.expectedDeliveryDate || order?.dueDate || ''
}

function getOrderCustomer(order) {
  return order?.customerName || order?.customerCode || order?.customerId || '-'
}

function getSalesRoute(order) {
  return order?.salesRouteName || order?.salesRouteCode || order?.salesRouteId || '-'
}

function getSalesPerson(order) {
  return order?.salesPersonName || order?.salesPersonId || '-'
}

function getOrderTotal(order) {
  return Number(order?.netAmount ?? order?.totalAmount ?? 0)
}

function getOrderLines(order) {
  return Array.isArray(order?.lines) ? order.lines : []
}

function isSameDay(value, filterValue) {
  if (!value || !filterValue) return false
  const date = dayjs(value)
  return date.isValid() && date.format('YYYY-MM-DD') === filterValue
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

function DetailRow({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        padding: '6px 0',
        fontSize: 12,
      }}
    >
      <span style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function SummaryRow({ label, value, strong = false, valueColor }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        fontSize: 12,
      }}
    >
      <span
        style={{
          fontWeight: strong ? 700 : 500,
          color: strong ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        }}
      >
        {label}
      </span>
      <span
        className="mono"
        style={{
          fontSize: strong ? 14 : 12,
          fontWeight: strong ? 800 : 500,
          color: valueColor || (strong ? 'var(--color-text-primary)' : 'var(--color-text-primary)'),
        }}
      >
        {value}
      </span>
    </div>
  )
}

function LineRow({ line, index, product }) {
  const itemName = product?.name || line?.productName || line?.productCode || line?.productId || `Line ${index + 1}`
  const sku = product?.sku || line?.productCode || line?.productId || '-'
  const unit = line?.smallestUnitCode || line?.unitCode || line?.unitId || '-'

  return (
    <tr className="hover:bg-bg-elevated/40">
      <td>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 3,
          }}
        >
          <span className="product-sku-badge mono">
            {sku}
          </span>
          <span className="product-info-sub">{itemName}</span>
        </div>
      </td>
      <td className="mono">{unit}</td>
      <td className="mono text-right">{formatMoney(line?.mrp ?? line?.unitPrice)}</td>
      <td className="mono text-right">{Number(line?.quantity ?? 0).toLocaleString('en-LK')}</td>
      <td className="mono text-right">{Number(line?.discountPercent ?? 0).toLocaleString('en-LK')}%</td>
      <td className="mono text-right">{formatMoney(line?.unitPrice ?? line?.sellingPrice ?? line?.lineTotal)}</td>
      <td className="mono text-right font-semibold">{formatMoney(line?.lineTotal ?? line?.netAmount ?? line?.amount)}</td>
    </tr>
  )
}

export default function SalesListPage() {
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [salesRouteId, setSalesRouteId] = useState('')
  const [orderDate, setOrderDate] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [error, setError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [allRoutes, setAllRoutes] = useState([])
  const [products, setProducts] = useState([])

  const productById = useMemo(() => {
    return products.reduce((map, product) => {
      map[product.id] = product
      return map
    }, {})
  }, [products])

  useEffect(() => {
    let isCurrent = true

    async function loadOrders() {
      setIsLoading(true)
      setError('')

      try {
        const result = await salesService.listSalesOrders({ page: 1, pageSize: 1000 })
        if (!isCurrent) return

        const list = Array.isArray(result) ? result : result?.items || result?.data || []
        const sorted = [...list].sort((a, b) => new Date(getOrderDate(b)) - new Date(getOrderDate(a)))
        setOrders(sorted)
      } catch (requestError) {
        if (!isCurrent) return
        setOrders([])
        setError(requestError.message || 'Unable to load sales orders.')
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    loadOrders()

    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    let isCurrent = true

    async function loadRoutes() {
      try {
        const territories = await masterService.listTerritories()
        if (!isCurrent) return

        const routePages = await Promise.all(
          (territories || []).map((territory) =>
            masterService
              .listSalesRoutes({ territoryId: territory.id, page: 1, pageSize: 100 })
              .catch(() => ({ items: [] }))
          )
        )

        if (!isCurrent) return
        setAllRoutes(routePages.flatMap((result) => result.items || []))
      } catch {
        if (isCurrent) setAllRoutes([])
      }
    }

    loadRoutes()

    return () => {
      isCurrent = false
    }
  }, [])

  const routeOptions = useMemo(() => {
    const map = new Map()

    orders.forEach((order) => {
      const key = order?.salesRouteId || order?.salesRouteName || ''
      if (!key) return
      map.set(key, {
        id: order?.salesRouteId || order?.salesRouteName || '',
        name: order?.salesRouteName || order?.salesRouteCode || order?.salesRouteId || 'Sales route',
      })
    })

    allRoutes.forEach((route) => {
      if (!route?.id) return
      map.set(route.id, {
        id: route.id,
        name: route.name || route.code || route.id,
      })
    })

    return [...map.values()].sort((a, b) =>
      String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' })
    )
  }, [allRoutes, orders])

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = orders.filter((order) => {
      const routeId = order?.salesRouteId || order?.salesRouteName || ''
      const routeName = getSalesRoute(order)
      const haystack = [
        order?.orderNumber,
        getOrderCustomer(order),
        routeName,
        getSalesPerson(order),
        statusLabel(order?.status),
        getOrderDate(order),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch = !query || haystack.includes(query)
      const matchesStatus = !status || order?.status === status
      const matchesRoute = !salesRouteId || routeId === salesRouteId || routeName === salesRouteId
      const matchesDate = !orderDate || isSameDay(getOrderDate(order), orderDate)

      return matchesSearch && matchesStatus && matchesRoute && matchesDate
    })

    return [...filtered].sort((a, b) => {
      const dateA = dayjs(getOrderDate(a))
      const dateB = dayjs(getOrderDate(b))
      if (!dateA.isSame(dateB)) return dateB.isAfter(dateA) ? 1 : -1
      return String(b.orderNumber || '').localeCompare(String(a.orderNumber || ''), undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    })
  }, [orders, orderDate, salesRouteId, search, status])

  const totalItems = filteredOrders.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const pagedOrders = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredOrders.slice(start, start + pageSize)
  }, [filteredOrders, page])

  useEffect(() => {
    setPage(1)
  }, [orderDate, salesRouteId, search, status])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedId('')
      setSelectedOrder(null)
      return
    }

    const exists = filteredOrders.some((order) => order.id === selectedId)
    if (!selectedId || !exists) {
      setSelectedId(filteredOrders[0].id)
    }
  }, [filteredOrders, selectedId])

  useEffect(() => {
    if (!selectedId) {
      setSelectedOrder(null)
      setDetailError('')
      return
    }

    const cached = orders.find((order) => order.id === selectedId)
    if (cached && cached.lines) {
      setSelectedOrder(cached)
    }

    let isCurrent = true

    async function loadOrderDetail() {
      setIsLoadingDetail(true)
      setDetailError('')

      try {
        const detail = await salesService.getSalesOrder(selectedId)
        if (!isCurrent) return

        setSelectedOrder(detail || cached || null)
        setProducts([])

        const productIds = Array.from(
          new Set((detail?.lines || []).map((line) => line.productId).filter(Boolean))
        )

        if (productIds.length) {
          Promise.allSettled(productIds.map((productId) => masterService.getProduct(productId)))
            .then((responses) => {
              if (!isCurrent) return
              setProducts(
                responses.flatMap((response) =>
                  response.status === 'fulfilled' && response.value ? [response.value] : []
                )
              )
            })
            .catch(() => {
              if (isCurrent) setProducts([])
            })
        }
      } catch (requestError) {
        if (!isCurrent) return
        setDetailError(requestError.message || 'Unable to load order details.')
        setSelectedOrder(cached || null)
      } finally {
        if (isCurrent) setIsLoadingDetail(false)
      }
    }

    loadOrderDetail()

    return () => {
      isCurrent = false
    }
  }, [orders, selectedId])

  function clearFilters() {
    setSearch('')
    setStatus('')
    setSalesRouteId('')
    setOrderDate('')
  }

  const hasActiveFilters = Boolean(search.trim() || status || salesRouteId || orderDate)

  const selectedFallback = filteredOrders.find((order) => order.id === selectedId) || null
  const activeOrder = selectedOrder || selectedFallback
  const lines = getOrderLines(activeOrder)
  const gross = Number(activeOrder?.grossAmount ?? 0)
  const discount = Number(activeOrder?.totalDiscountAmount ?? 0)
  const supplierDiscount = Number(activeOrder?.totalSupplierDiscountAmount ?? 0)
  const distributorDiscount = Number(activeOrder?.totalDistributorDiscountAmount ?? 0)
  const vat = Number(activeOrder?.vatAmount ?? 0)
  const returnCredit = Number(activeOrder?.returnCreditAmount ?? 0)
  const net = Number(activeOrder?.netAmount ?? getOrderTotal(activeOrder))
  const paid = Number(activeOrder?.paidAmount ?? 0)
  const outstanding = Number(activeOrder?.outstandingAmount ?? 0)
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, totalItems)

  return (
    <div
      className="responsive-page sales-list-page"
      style={{
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        className="sales-list-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingRight: 2,
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
          Sales Orders
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Search by customer, order number, or filter by route/status.
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
            placeholder="Search by order number or customer..."
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
            {routeOptions.map((route) => (
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
            value={orderDate}
            onChange={(event) => setOrderDate(event.target.value)}
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
                  Sales register
                </h2>
                <p style={{ marginTop: 2, fontSize: 11, color: 'var(--color-text-dim)' }}>
                  Select an order to view details
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
              {totalItems}
            </span>
          </div>

          <div style={{ minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
            {error && !selectedId ? (
              <div className="p-6 text-sm text-danger">{error}</div>
            ) : isLoading ? (
              <QueueMessage>Loading orders...</QueueMessage>
            ) : totalItems ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pagedOrders.map((order) => {
                  const isSelected = order.id === selectedId
                  const customerName = getOrderCustomer(order)
                  const routeName = getSalesRoute(order)

                  return (
                    <button
                      type="button"
                      key={order.id}
                      onClick={() => {
                        setError('')
                        setSelectedId(order.id)
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
                          {order.orderNumber || '-'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <StatusBadge status={statusLabel(order.status)} />
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
                          {formatDate(getOrderDate(order))}
                        </span>
                        <span
                          className="mono"
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--color-teal)',
                          }}
                        >
                          {formatMoney(order.netAmount)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <QueueMessage>No sales orders found.</QueueMessage>
            )}
          </div>

          <SimplePagination
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            itemLabel="orders"
          />
        </section>

        <section
          className="panel responsive-detail-panel"
          style={{ padding: 16, minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden' }}
        >
          {isLoadingDetail ? (
            <DetailMessage>Loading order details...</DetailMessage>
          ) : activeOrder ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                minHeight: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '4px 4px 14px',
                  borderBottom: '1px solid var(--color-border)',
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
                      Sales Order Details
                    </h2>
                    <p style={{ marginTop: 2, fontSize: 11, color: 'var(--color-text-dim)' }}>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--color-teal)' }}>
                        {activeOrder.orderNumber || '-'}
                      </span>{' '}
                      • selected order summary and line items
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={statusLabel(activeOrder.status)} />
                </div>
              </div>

              <div className="min-h-0 flex-1 flex flex-col gap-2.5" style={{ paddingTop: 8 }}>
                {detailError ? (
                  <div className="mb-4 rounded-[8px] border border-[#ff7b8a]/25 bg-[#ff7b8a]/10 px-4 py-3 text-[13px] text-[#ff9aa5]">
                    {detailError}
                  </div>
                ) : null}

                <div
                  style={{
                    minWidth: 0,
                    overflow: 'hidden',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-base)',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      borderBottom: '1px solid var(--color-border)',
                      background: 'var(--color-bg-elevated)',
                    }}
                  >
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      Order Lines
                    </h3>
                    <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                      {lines.length} item{lines.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div
                    className="responsive-table-shell"
                    style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', minHeight: 0 }}
                  >
                    <table className="data-table product-table-compact">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Unit</th>
                          <th style={{ textAlign: 'right' }}>MRP</th>
                          <th style={{ textAlign: 'right' }}>Qty</th>
                          <th style={{ textAlign: 'right' }}>Disc %</th>
                          <th style={{ textAlign: 'right' }}>Selling Price</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.length ? (
                          lines.map((line, index) => <LineRow key={line.id || `${index}`} line={line} index={index} product={productById[line.productId]} />)
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-4 py-6 text-[13px] text-text-dim">
                              No order lines available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div
                  style={{
                    padding: 14,
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    background: 'var(--color-bg-elevated)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <SummaryRow label="Gross" value={formatMoney(gross)} strong />
                  <SummaryRow label="Discount" value={formatMoney(discount)} />
                  <SummaryRow label="Supplier Discount" value={formatMoney(supplierDiscount)} />
                  <SummaryRow label="Distributor Discount" value={formatMoney(distributorDiscount)} />
                  {returnCredit > 0 && (
                    <SummaryRow label="Returns Credit" value={`- ${formatMoney(returnCredit)}`} valueColor="var(--color-amber)" />
                  )}
                  <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 3, paddingTop: 10 }} />
                  <SummaryRow label="Net" value={formatMoney(net)} strong />
                  <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 3, paddingTop: 10 }} />
                  <SummaryRow label="Paid" value={formatMoney(paid)} />
                  <SummaryRow
                    label="Outstanding"
                    value={formatMoney(outstanding)}
                    strong
                    valueColor={outstanding > 0 ? 'var(--color-amber)' : 'var(--color-teal)'}
                  />
                </div>
              </div>
            </div>
          ) : error ? (
            <DetailMessage>{error}</DetailMessage>
          ) : (
            <DetailMessage icon>Select an order to view details</DetailMessage>
          )}
        </section>
      </div>
      </div>
    </div>
  )
}
