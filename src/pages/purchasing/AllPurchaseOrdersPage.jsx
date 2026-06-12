import dayjs from 'dayjs'
import {
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  Package,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '@components/ui/StatusBadge'
import SimplePagination from '@components/ui/SimplePagination'
import { purchasingService } from '@services/api/purchasingService'
import { PurchaseOrderStatus } from '@/types/purchasing.types'

const orderPageSize = 3
const itemPageSize = 5

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: PurchaseOrderStatus.Submitted, label: 'Pending Approval' },
  { value: PurchaseOrderStatus.Approved, label: 'Approved' },
  { value: PurchaseOrderStatus.Rejected, label: 'Rejected' },
  { value: PurchaseOrderStatus.Cancelled, label: 'Cancelled' },
]

const rangeOptions = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
]

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getStatusLabel(order) {
  if (
    Number(order.status) === Number(PurchaseOrderStatus.Submitted) ||
    order.statusLabel?.toLowerCase() === 'submitted'
  ) {
    return 'Pending Approval'
  }

  return order.statusLabel || 'Unknown'
}

function getDateRange(range) {
  const today = dayjs()

  if (range === 'today') {
    const date = today.format('YYYY-MM-DD')
    return { from: date, to: date }
  }
  if (range === 'month') {
    return {
      from: today.startOf('month').format('YYYY-MM-DD'),
      to: today.endOf('month').format('YYYY-MM-DD'),
    }
  }
  if (range === 'year') {
    return {
      from: today.startOf('year').format('YYYY-MM-DD'),
      to: today.endOf('year').format('YYYY-MM-DD'),
    }
  }

  return { from: '', to: '' }
}

export default function AllPurchaseOrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [error, setError] = useState('')
  const [orderPage, setOrderPage] = useState(1)
  const [itemPage, setItemPage] = useState(1)

  const loadPurchaseOrders = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setOrders(await purchasingService.listAllPurchaseOrders())
    } catch (requestError) {
      setError(requestError.message)
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPurchaseOrders()
  }, [loadPurchaseOrders])

  useEffect(() => {
    if (!selectedId) {
      setSelectedOrder(null)
      return
    }

    async function loadOrderDetail() {
      setIsLoadingDetail(true)
      try {
        setSelectedOrder(await purchasingService.getPurchaseOrder(selectedId))
      } catch (requestError) {
        setError(`Unable to load purchase order details: ${requestError.message}`)
        setSelectedOrder(null)
      } finally {
        setIsLoadingDetail(false)
      }
    }

    loadOrderDetail()
  }, [selectedId])

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = orders.filter((order) => {
      const orderDate = dayjs(order.orderDate).format('YYYY-MM-DD')
      const matchesSearch =
        !query ||
        order.poNumber?.toLowerCase().includes(query) ||
        order.supplierName?.toLowerCase().includes(query) ||
        order.supplierCode?.toLowerCase().includes(query)
      const matchesStatus = !status || Number(order.status) === Number(status)
      const matchesFrom = !fromDate || orderDate >= fromDate
      const matchesTo = !toDate || orderDate <= toDate

      return matchesSearch && matchesStatus && matchesFrom && matchesTo
    })

    return [...filtered].sort((a, b) => {
      const dateA = dayjs(a.orderDate)
      const dateB = dayjs(b.orderDate)
      if (!dateA.isSame(dateB)) {
        return dateB.isAfter(dateA) ? 1 : -1
      }
      return b.poNumber.localeCompare(a.poNumber, undefined, { numeric: true, sensitivity: 'base' })
    })
  }, [fromDate, orders, search, status, toDate])

  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * orderPageSize
    return filteredOrders.slice(start, start + orderPageSize)
  }, [filteredOrders, orderPage])

  const pagedItems = useMemo(() => {
    const lines = selectedOrder?.lines || []
    const start = (itemPage - 1) * itemPageSize
    return lines.slice(start, start + itemPageSize)
  }, [itemPage, selectedOrder])

  useEffect(() => {
    setOrderPage(1)
  }, [dateRange, fromDate, search, status, toDate])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / orderPageSize))
    if (orderPage > totalPages) setOrderPage(totalPages)
  }, [filteredOrders.length, orderPage])

  useEffect(() => {
    if (filteredOrders.length > 0) {
      const exists = filteredOrders.some((o) => o.id === selectedId)
      if (!exists) {
        setSelectedId(filteredOrders[0].id)
      }
    } else {
      setSelectedId(null)
    }
  }, [filteredOrders, selectedId])

  useEffect(() => {
    setItemPage(1)
  }, [selectedId])

  function changeDateRange(event) {
    const value = event.target.value
    setDateRange(value)

    if (value !== 'custom') {
      const range = getDateRange(value)
      setFromDate(range.from)
      setToDate(range.to)
    }
  }

  function clearFilters() {
    setSearch('')
    setStatus('')
    setDateRange('all')
    setFromDate('')
    setToDate('')
    setSelectedId(null)
  }

  return (
    <div
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
          All Purchase Orders
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Track and review purchase orders across every status and order date.
        </p>
      </div>

      <div
        className="panel"
        style={{
          padding: 16,
          display: 'grid',
          gridTemplateColumns:
            'minmax(220px, 1fr) 190px 180px repeat(2, minmax(145px, 170px)) auto auto',
          alignItems: 'end',
          gap: 12,
        }}
      >
        <FilterField label="Search">
          <div style={{ position: 'relative' }}>
            <Search
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                width: 16,
                height: 16,
                color: 'var(--color-text-dim)',
                transform: 'translateY(-50%)',
              }}
            />
            <input
              className="form-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="PO number or supplier"
              style={{ width: '100%', height: 40, paddingLeft: 36 }}
            />
          </div>
        </FilterField>

        <FilterField label="Status">
          <select
            className="form-input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            style={{ width: '100%', height: 40 }}
          >
            {statusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Date Range">
          <select
            className="form-input"
            value={dateRange}
            onChange={changeDateRange}
            style={{ width: '100%', height: 40 }}
          >
            {rangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="From Date">
          <input
            className="form-input"
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) => {
              setDateRange('custom')
              setFromDate(event.target.value)
            }}
            style={{ width: '100%', height: 40, colorScheme: 'dark' }}
          />
        </FilterField>

        <FilterField label="To Date">
          <input
            className="form-input"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => {
              setDateRange('custom')
              setToDate(event.target.value)
            }}
            style={{ width: '100%', height: 40, colorScheme: 'dark' }}
          />
        </FilterField>

        <button
          type="button"
          className="button-secondary"
          onClick={clearFilters}
          style={{ height: 40, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7 }}
        >
          <X style={{ width: 15, height: 15 }} />
          Clear
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={loadPurchaseOrders}
          disabled={isLoading}
          title="Refresh purchase orders"
          style={{ width: 40, height: 40 }}
        >
          <RefreshCw style={{ width: 16, height: 16 }} />
        </button>
      </div>

      <div
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
          className="panel"
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
                  Purchase order register
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
              {filteredOrders.length}
            </span>
          </div>

          <div style={{ minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
            {error && !selectedId ? (
              <div className="p-6 text-sm text-danger">{error}</div>
            ) : isLoading ? (
              <QueueMessage>Loading purchase orders...</QueueMessage>
            ) : filteredOrders.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pagedOrders.map((order) => {
                  const isSelected = order.id === selectedId
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
                          ? '1px solid color-mix(in srgb, var(--color-amber) 45%, transparent)'
                          : '1px solid var(--color-border)',
                        background: isSelected
                          ? 'color-mix(in srgb, var(--color-amber) 10%, transparent)'
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
                          style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-amber)' }}
                        >
                          {order.poNumber}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <StatusBadge status={getStatusLabel(order)} />
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
                          title={order.supplierName}
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {order.supplierName}
                        </div>
                        <div
                          className="mono"
                          style={{ marginTop: 3, fontSize: 10, color: 'var(--color-text-dim)' }}
                        >
                          {order.supplierCode}
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
                          {dayjs(order.orderDate).format('DD MMM YYYY')}
                        </span>
                        <span
                          className="mono"
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {formatMoney(order.totalAmount)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <QueueMessage>No purchase orders match the selected filters.</QueueMessage>
            )}
          </div>

          <SimplePagination
            page={orderPage}
            pageSize={orderPageSize}
            totalItems={filteredOrders.length}
            onPageChange={setOrderPage}
            itemLabel="orders"
          />
        </section>

        <section
          className="panel"
          style={{ padding: 16, minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden' }}
        >
          {isLoadingDetail ? (
            <DetailMessage>Loading purchase order details...</DetailMessage>
          ) : selectedOrder ? (
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
                  padding: 16,
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-elevated)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 24,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      className="mono"
                      style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-amber)' }}
                    >
                      {selectedOrder.poNumber}
                    </span>
                    <StatusBadge status={getStatusLabel(selectedOrder)} />
                    {Number(selectedOrder.status) === Number(PurchaseOrderStatus.Rejected) && (
                      <button
                        type="button"
                        className="button-primary"
                        onClick={() =>
                          navigate('/purchasing/place-order', {
                            state: { editPoId: selectedOrder.id },
                          })
                        }
                        style={{ height: 28, padding: '0 10px', fontSize: 11 }}
                      >
                        Edit Order
                      </button>
                    )}
                  </div>
                  <p style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Complete purchase order information and item values.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <HeaderDetail
                    icon={Building2}
                    label="Supplier"
                    value={selectedOrder.supplierName || 'Not specified'}
                  />
                  <HeaderDetail
                    icon={CalendarDays}
                    label="Expected"
                    value={
                      selectedOrder.expectedDeliveryDate
                        ? dayjs(selectedOrder.expectedDeliveryDate).format('DD MMM YYYY')
                        : 'Not specified'
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  minHeight: 160,
                  overflow: 'hidden',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
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
                  }}
                >
                  <Package style={{ width: 15, height: 15, color: 'var(--color-teal)' }} />
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Order items
                  </h3>
                  <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                    {selectedOrder.lines?.length || 0} item
                    {selectedOrder.lines?.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  <table className="data-table product-table-compact">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th style={{ textAlign: 'right' }}>Base Qty</th>
                        <th style={{ textAlign: 'right' }}>Smallest Qty</th>
                        <th>Smallest UOM</th>
                        <th style={{ textAlign: 'right' }}>Cost / Smallest</th>
                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedItems.map((line) => (
                        <tr key={line.id}>
                          <td>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: 3,
                              }}
                            >
                              <span className="product-sku-badge mono">{line.productSku}</span>
                              <span className="product-info-sub">{line.productName}</span>
                            </div>
                          </td>
                          <td className="mono text-right text-sm">
                            {Number(line.qtyBaseUnit).toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 4,
                            })}
                          </td>
                          <td className="mono text-right text-sm">
                            {Number(line.qtySmallestUnit).toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 4,
                            })}
                          </td>
                          <td>
                            <span className="uom-badge">{line.smallestUomCode}</span>
                          </td>
                          <td className="mono text-right font-semibold text-sm">
                            {formatMoney(line.unitCostSmallest)}
                          </td>
                          <td className="mono text-right font-semibold text-sm">
                            {formatMoney(line.lineSubtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '0 12px 8px' }}>
                  <SimplePagination
                    page={itemPage}
                    pageSize={itemPageSize}
                    totalItems={selectedOrder.lines?.length || 0}
                    onPageChange={setItemPage}
                    itemLabel="items"
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 330px',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    padding: 14,
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText style={{ width: 15, height: 15, color: 'var(--color-text-dim)' }} />
                    <span className="form-label">Order notes</span>
                  </div>
                  <p
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      lineHeight: 1.6,
                      color: selectedOrder.notes
                        ? 'var(--color-text-muted)'
                        : 'var(--color-text-dim)',
                    }}
                  >
                    {selectedOrder.notes || 'No notes were added to this purchase order.'}
                  </p>
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
                  <SummaryRow label="Sub total" value={formatMoney(selectedOrder.subtotal)} />
                  <SummaryRow
                    label={`VAT (${Number(selectedOrder.vatRate || 0)}%)`}
                    value={formatMoney(selectedOrder.vatAmount)}
                  />
                  <div
                    style={{
                      paddingTop: 10,
                      marginTop: 3,
                      borderTop: '1px solid var(--color-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      Grand total
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-amber)' }}
                    >
                      {formatMoney(selectedOrder.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : error ? (
            <DetailMessage>{error}</DetailMessage>
          ) : (
            <DetailMessage icon>
              Select a purchase order to review its supplier, products, status, dates, and totals.
            </DetailMessage>
          )}
        </section>
      </div>
    </div>
  )
}

function FilterField({ label, children }) {
  return (
    <div style={{ display: 'flex', minWidth: 0, flexDirection: 'column', gap: 7 }}>
      <span className="form-label">{label}</span>
      {children}
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
          <ClipboardList style={{ width: 25, height: 25 }} />
        </div>
      ) : null}
      {children}
    </div>
  )
}

function HeaderDetail({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon style={{ width: 16, height: 16, color: 'var(--color-text-dim)' }} />
      <div>
        <div style={{ fontSize: 10, color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div
          style={{
            marginTop: 2,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          {value}
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-text-muted">{label}</span>
      <span className="mono">{value}</span>
    </div>
  )
}
