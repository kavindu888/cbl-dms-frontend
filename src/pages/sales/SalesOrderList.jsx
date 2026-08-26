import dayjs from 'dayjs'
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  Package,
  Search,
  X,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import SimplePagination from '@components/ui/SimplePagination'
import { masterService } from '@/services/api/masterService'
import { salesService } from '@/services/api/salesService'
import {
  toNumber,
  getReturnCreditAmount,
  calculateSalesOrderSummary,
} from '@/utils/salesOrderCalculations'

const orderPageSize = 5

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Converted', label: 'Converted' },
  { value: 'Cancelled', label: 'Cancelled' },
]

const statusTone = {
  Draft: { color: '#d1d5db', background: 'rgba(156, 163, 175, 0.14)', border: 'rgba(156, 163, 175, 0.26)' },
  Confirmed: { color: '#93c5fd', background: 'rgba(37, 99, 235, 0.16)', border: 'rgba(96, 165, 250, 0.28)' },
  Converted: { color: '#86efac', background: 'rgba(22, 163, 74, 0.16)', border: 'rgba(74, 222, 128, 0.28)' },
  Cancelled: { color: '#fca5a5', background: 'rgba(220, 38, 38, 0.16)', border: 'rgba(248, 113, 113, 0.28)' },
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

function normalizeStatus(status) {
  const value = String(status || 'Draft')
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function buildDetailSummary(order) {
  const saleLines = (order.lines || []).filter((line) => !line.isReturnLine)
  const returnLines = (order.lines || []).filter((line) => line.isReturnLine)

  const calculated = saleLines.reduce(
    (sum, line) => {
      const quantity = Math.abs(toNumber(line.quantity))
      const mrp = toNumber(line.mrp || line.unitPrice)
      const lineGross =
        line.grossAmount !== null && line.grossAmount !== undefined
          ? toNumber(line.grossAmount)
          : mrp * quantity
      const categoryDiscount =
        line.categoryDiscountAmount !== null && line.categoryDiscountAmount !== undefined
          ? toNumber(line.categoryDiscountAmount)
          : lineGross * (toNumber(line.categoryDiscountPercent) / 100)

      return {
        gross: sum.gross + lineGross,
        categoryDiscount: sum.categoryDiscount + categoryDiscount,
      }
    },
    { gross: 0, categoryDiscount: 0 }
  )

  const grossBeforeCategory =
    order.grossAmount !== null && order.grossAmount !== undefined
      ? toNumber(order.grossAmount)
      : calculated.gross
  const categoryDiscount =
    order.totalCategoryDiscountAmount !== null && order.totalCategoryDiscountAmount !== undefined
      ? toNumber(order.totalCategoryDiscountAmount)
      : calculated.categoryDiscount
  const gross = Math.max(0, grossBeforeCategory - categoryDiscount)
  const skuDiscount = toNumber(order.totalSkuDiscountAmount)
  const specialDiscount = toNumber(order.totalSpecialDiscountAmount)
  const returnAmount =
    order.returnCreditAmount !== null && order.returnCreditAmount !== undefined
      ? toNumber(order.returnCreditAmount)
      : returnLines.reduce((sum, line) => sum + getReturnCreditAmount(line), 0)
  const vat = toNumber(order.vatAmount)
  const net = gross - skuDiscount - specialDiscount - returnAmount + vat

  return {
    gross,
    skuDiscount,
    specialDiscount,
    returnAmount,
    vat,
    net,
  }
}

function buildInvoiceConversionState(order, productById, salesRouteName) {
  const summary = calculateSalesOrderSummary(order)
  return {
    fromSalesOrder: true,
    salesOrderId: order.id,
    salesOrderNumber: order.orderNumber,
    customerId: order.customerId,
    customerName: order.customerName,
    salesRouteId: order.salesRouteId,
    salesRouteName,
    isVatApplicable: order.isVatApplicable,
    customerVatTin: order.customerVatTin,
    deliveryDate: order.deliveryDate,
    summary,
    lines: (order.lines || []).map((orderLine) => {
      const product = productById[orderLine.productId] || null

      return {
        productId: orderLine.productId,
        productName: product?.name || product?.productName || '',
        productSku: product?.sku || product?.productSku || '',
        unitId: orderLine.unitId || orderLine.smallestUnitCode || '',
        unitName: orderLine.smallestUnitCode || orderLine.unitName || '',
        smallestUnitName: orderLine.smallestUnitCode || orderLine.unitName || '',
        mrp: orderLine.mrp || orderLine.unitPrice || 0,
        quantity: orderLine.quantity,
        categoryDiscountPercent: orderLine.categoryDiscountPercent ?? 0,
        skuDiscountPercent: orderLine.skuDiscountPercent ?? 0,
        specialDiscountPercent: orderLine.specialDiscountPercent ?? 0,
        totalDiscountPercent: orderLine.totalDiscountPercent ?? orderLine.discountPercent ?? 0,
        isReturnLine: Boolean(orderLine.isReturnLine),
        returnReason: orderLine.returnReason ?? null,
      }
    }),
  }
}

export default function SalesOrderList() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [salesRouteId, setSalesRouteId] = useState('')
  const [orderDate, setOrderDate] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [orderPage, setOrderPage] = useState(1)
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

  const loadOrders = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const fetchedOrders =
        salesRouteId && orderDate
          ? await salesService.listSalesOrdersByRouteAndDate({ salesRouteId, date: orderDate })
          : await salesService.listSalesOrders({ page: 1, pageSize: 1000 })

      setOrders(fetchedOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)))
    } catch (requestError) {
      setError(requestError.message)
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }, [orderDate, salesRouteId])

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
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    if (!selectedId) {
      setSelectedOrder(null)
      setProducts([])
      return
    }

    let isCurrent = true

    async function loadOrderDetail() {
      setIsLoadingDetail(true)
      setError('')

      try {
        const order = await salesService.getSalesOrder(selectedId)
        if (!isCurrent) return

        setSelectedOrder(order)
        setProducts([])

        const productIds = Array.from(
          new Set((order.lines || []).map((line) => line.productId).filter(Boolean))
        )

        if (productIds.length) {
          const fetchedProducts = await masterService.getProductsByIds(productIds)
          if (!isCurrent) return
          setProducts(fetchedProducts)
        }
      } catch (requestError) {
        if (!isCurrent) return
        setError(`Unable to load order details: ${requestError.message}`)
        setSelectedOrder(null)
      } finally {
        if (isCurrent) setIsLoadingDetail(false)
      }
    }

    loadOrderDetail()
    return () => {
      isCurrent = false
    }
  }, [selectedId])

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = orders.filter((order) => {
      const orderStatus = normalizeStatus(order.status)
      const customerName = order.customerName || customerNameById[order.customerId] || ''
      const routeName = order.salesRouteName || routeNameById[order.salesRouteId] || ''
      const day = dayjs(order.deliveryDate || order.orderDate).format('YYYY-MM-DD')

      const matchesSearch =
        !query ||
        order.orderNumber?.toLowerCase().includes(query) ||
        order.id?.toLowerCase().includes(query) ||
        customerName.toLowerCase().includes(query)
      const matchesStatus = !status || orderStatus === status
      const matchesRoute = !salesRouteId || order.salesRouteId === salesRouteId
      const matchesDate = !orderDate || day === orderDate

      return matchesSearch && matchesStatus && matchesRoute && matchesDate
    })

    return [...filtered].sort((a, b) => {
      const dateA = dayjs(a.deliveryDate || a.orderDate)
      const dateB = dayjs(b.deliveryDate || b.orderDate)
      if (!dateA.isSame(dateB)) return dateB.isAfter(dateA) ? 1 : -1
      return String(b.orderNumber || '').localeCompare(String(a.orderNumber || ''), undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    })
  }, [customerNameById, orderDate, orders, routeNameById, salesRouteId, search, status])

  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * orderPageSize
    return filteredOrders.slice(start, start + orderPageSize)
  }, [filteredOrders, orderPage])

  useEffect(() => {
    setOrderPage(1)
  }, [orderDate, salesRouteId, search, status])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / orderPageSize))
    if (orderPage > totalPages) setOrderPage(totalPages)
  }, [filteredOrders.length, orderPage])

  useEffect(() => {
    if (filteredOrders.length > 0) {
      const exists = filteredOrders.some((order) => order.id === selectedId)
      if (!exists) setSelectedId(filteredOrders[0].id)
    } else {
      setSelectedId(null)
    }
  }, [filteredOrders, selectedId])

  function clearFilters() {
    setSearch('')
    setStatus('')
    setSalesRouteId('')
    setOrderDate('')
    setSelectedId(null)
  }

  async function refreshSelectedOrder() {
    await loadOrders()
    if (selectedId) {
      const order = await salesService.getSalesOrder(selectedId)
      setSelectedOrder(order)
    }
  }

  async function confirmOrder() {
    if (!selectedOrder) return

    setIsSaving(true)
    try {
      await salesService.confirmSalesOrder(selectedOrder.id)
      toast.success('Sales order confirmed.')
      await refreshSelectedOrder()
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to confirm sales order.')
    } finally {
      setIsSaving(false)
    }
  }

  async function cancelOrder(event) {
    event.preventDefault()
    if (!selectedOrder) return
    if (!cancelReason.trim()) {
      toast.error('Cancellation reason is required.')
      return
    }

    setIsSaving(true)
    try {
      await salesService.cancelSalesOrder(selectedOrder.id, cancelReason.trim())
      toast.success('Sales order cancelled.')
      setCancelReason('')
      await refreshSelectedOrder()
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to cancel sales order.')
    } finally {
      setIsSaving(false)
    }
  }

  function convertToInvoice() {
    if (!selectedOrder) return

    const salesRouteName = selectedOrder.salesRouteName || routeNameById[selectedOrder.salesRouteId] || ''
    navigate('/sales/invoices/new', {
      state: buildInvoiceConversionState(selectedOrder, productById, salesRouteName),
    })
  }

  function editDraftOrder() {
    if (!selectedOrder) return
    navigate(`/sales/orders/${selectedOrder.id}/edit`)
  }

  const hasActiveFilters = Boolean(search.trim() || status || salesRouteId || orderDate)

  return (
    <div className="responsive-page" style={pageShellStyle}>
      <div>
        <div>
          <h1 style={titleStyle}>Sales Orders</h1>
          <p style={subtitleStyle}>Search by customer, order number, or filter by route/status.</p>
        </div>
      </div>

      <div className="panel responsive-filter-bar" style={filterBarStyle}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={searchIconStyle} />
          <input
            className="form-input"
            placeholder="Search by order number or customer..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={searchInputStyle}
          />
        </div>

        <SelectShell width={180}>
          <select className="form-input" value={status} onChange={(event) => setStatus(event.target.value)} style={selectStyle}>
            {statusOptions.map((option) => (
              <option key={option.label} value={option.value} style={{ background: 'var(--color-bg-elevated)' }}>
                {option.label}
              </option>
            ))}
          </select>
        </SelectShell>

        <SelectShell width={190}>
          <select className="form-input" value={salesRouteId} onChange={(event) => setSalesRouteId(event.target.value)} style={selectStyle}>
            <option value="" style={{ background: 'var(--color-bg-elevated)' }}>Sales route</option>
            {allRoutes.map((route) => (
              <option key={route.id} value={route.id} style={{ background: 'var(--color-bg-elevated)' }}>
                {route.name || route.id}
              </option>
            ))}
          </select>
        </SelectShell>

        <div style={{ width: 150 }}>
          <input className="form-input" type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} style={dateInputStyle} />
        </div>

        {hasActiveFilters && (
          <button type="button" className="button-secondary" onClick={clearFilters} style={clearButtonStyle}>
            <X style={{ width: 15, height: 15 }} />
            Clear
          </button>
        )}
      </div>

      <div className="responsive-master-detail" style={masterDetailStyle}>
        <section className="panel responsive-queue-panel" style={queuePanelStyle}>
          <div style={queueHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={queueIconStyle}>
                <ClipboardList style={{ width: 17, height: 17 }} />
              </div>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>Sales Orders Register</h2>
                <p style={{ marginTop: 2, fontSize: 11, color: 'var(--color-text-dim)' }}>Select an order to view details</p>
              </div>
            </div>
            <span style={countPillStyle}>{filteredOrders.length}</span>
          </div>

          <div style={{ minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
            {error && !selectedId ? (
              <div className="p-6 text-sm text-danger">{error}</div>
            ) : isLoading ? (
              <QueueMessage>Loading orders...</QueueMessage>
            ) : filteredOrders.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pagedOrders.map((order) => {
                  const isSelected = order.id === selectedId
                  const orderStatus = normalizeStatus(order.status)
                  const customerName = order.customerName || customerNameById[order.customerId] || 'Unknown customer'
                  const routeName = order.salesRouteName || routeNameById[order.salesRouteId] || 'No route'

                  return (
                    <button key={order.id} type="button" onClick={() => { setError(''); setSelectedId(order.id) }} style={cardStyle(isSelected)}>
                      <div style={cardTopStyle}>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-teal)' }}>{order.orderNumber}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <OrderStatusBadge status={orderStatus} />
                          <ChevronRight style={{ width: 15, height: 15, color: isSelected ? 'var(--color-teal)' : 'var(--color-text-dim)' }} />
                        </div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div title={customerName} style={ellipsisPrimaryStyle}>{customerName}</div>
                        <div title={routeName} style={ellipsisSecondaryStyle}>{routeName}</div>
                      </div>
                      <div style={cardBottomStyle}>
                        <span style={dateTextStyle}>
                          <CalendarDays style={{ width: 13, height: 13 }} />
                          {formatDate(order.deliveryDate || order.orderDate)}
                        </span>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-teal)' }}>
                          {formatMoney(order.netAmount)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <QueueMessage>No sales orders match the selected filters.</QueueMessage>
            )}
          </div>

          <SimplePagination page={orderPage} pageSize={orderPageSize} totalItems={filteredOrders.length} onPageChange={setOrderPage} itemLabel="orders" />
        </section>

        <section className="panel responsive-detail-panel" style={detailPanelShellStyle}>
          {isLoadingDetail ? (
            <DetailMessage>Loading order details...</DetailMessage>
          ) : selectedOrder ? (
            <SalesOrderDetailPanel
              cancelReason={cancelReason}
              onConvertToInvoice={convertToInvoice}
              isSaving={isSaving}
              onCancel={cancelOrder}
              onCancelReasonChange={setCancelReason}
              onConfirm={confirmOrder}
              onEdit={editDraftOrder}
              order={selectedOrder}
              productById={productById}
              salesRouteName={selectedOrder.salesRouteName || routeNameById[selectedOrder.salesRouteId]}
            />
          ) : error ? (
            <DetailMessage>{error}</DetailMessage>
          ) : (
            <DetailMessage icon>Select an order to view details</DetailMessage>
          )}
        </section>
      </div>
    </div>
  )
}

function SalesOrderDetailPanel({
  order,
  productById,
  salesRouteName,
  cancelReason,
  onCancelReasonChange,
  onCancel,
  onConfirm,
  onEdit,
  onConvertToInvoice,
  isSaving,
}) {
  const displaySummary = useMemo(
    () => buildDetailSummary(order),
    [order]
  )

  const orderStatus = normalizeStatus(order.status)
  const canConfirm = orderStatus === 'Draft' && (order.lines || []).length > 0
  const canCancel = orderStatus === 'Confirmed'
  const canConvertToInvoice = orderStatus === 'Confirmed'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
      <div style={detailHeaderStyle}>
        <div>
          <div className="mono" style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-teal)' }}>{order.orderNumber}</div>
          <h2 style={{ marginTop: 4, fontSize: 18, fontWeight: 800 }}>{order.customerName || 'Unknown customer'}</h2>
          <p style={{ marginTop: 3, fontSize: 12, color: 'var(--color-text-muted)' }}>{salesRouteName || 'No route'} · Delivery {formatDate(order.deliveryDate)}</p>
        </div>
        <OrderStatusBadge status={orderStatus} />
      </div>

      <div style={itemsPanelStyle}>
        <div style={itemsHeaderStyle}>
          <Package style={{ width: 15, height: 15, color: 'var(--color-teal)' }} />
          <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>Order Lines</h3>
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{(order.lines || []).length} item{(order.lines || []).length === 1 ? '' : 's'}</span>
        </div>
        <div className="responsive-table-shell" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <table className="data-table product-table-compact" style={{ minWidth: 820 }}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>UNIT</th>
                <th style={{ textAlign: 'right' }}>QTY</th>
                <th style={{ textAlign: 'right' }}>MRP</th>
                <th style={{ textAlign: 'right' }}>CAT.DISC%</th>
                <th style={{ textAlign: 'right' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {(order.lines || []).map((line) => {
                const product = productById[line.productId]
                const sku = product?.sku || product?.productSku || line.productId
                const name = product?.name || product?.productName || 'Unknown Product'
                const isReturnLine = Boolean(line.isReturnLine)

                return (
                  <tr key={line.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="mono" style={{ fontSize: 12, color: 'var(--color-accent)' }}>{sku}</span>
                          {isReturnLine && (
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: 4,
                                border: '1px solid rgba(32, 212, 191, 0.35)',
                                background: 'rgba(32, 212, 191, 0.1)',
                                color: 'var(--color-teal)',
                                fontSize: 9,
                                fontWeight: 'bold'
                              }}
                            >
                              RETURN
                            </span>
                          )}
                        </div>
                        <span className="product-info-sub">{name}</span>
                      </div>
                    </td>
                    <td className="mono">{isReturnLine ? 'RET' : (line.smallestUnitCode || line.unitId || '-')}</td>
                    <td className="mono text-right">{isReturnLine ? `-${Math.abs(Number(line.quantity))}` : line.quantity}</td>
                    <td className="mono text-right">{formatMoney(line.mrp || line.unitPrice)}</td>
                    <td className="mono text-right">{isReturnLine ? '-' : `${Number(line.categoryDiscountPercent || 0).toFixed(2)}%`}</td>
                    <td className="mono text-right font-semibold">{formatMoney(isReturnLine ? getReturnCreditAmount(line) : toNumber(line.lineTotal))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={detailFooterGridStyle}>
        <div style={summaryPanelStyle}>
          <SummaryRow label="Gross" value={formatMoney(displaySummary.gross)} />
          <SummaryRow label="SKU Disc" value={formatMoney(displaySummary.skuDiscount)} />
          <SummaryRow label="Special Disc" value={formatMoney(displaySummary.specialDiscount)} />
          <SummaryRow label="VAT" value={formatMoney(displaySummary.vat)} />
          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 3, paddingTop: 10 }}>
            <SummaryRow label="Net" value={formatMoney(displaySummary.net)} strong />
          </div>
        </div>

        <div style={actionsPanelStyle}>
          {canConfirm ? (
            <button className="button-primary" type="button" disabled={isSaving} onClick={onEdit} style={{ width: '100%' }}>
              <FileText style={{ width: 15, height: 15 }} />
              Edit Order
            </button>
          ) : null}
          {canConfirm ? (
            <button className="button-secondary" type="button" disabled={isSaving} onClick={onConfirm} style={{ width: '100%' }}>
              <CheckCircle2 style={{ width: 15, height: 15 }} />
              Confirm Order
            </button>
          ) : null}
          {canCancel ? (
            <form onSubmit={onCancel} style={{ display: 'grid', gap: 8 }}>
              <input className="form-input" value={cancelReason} onChange={(event) => onCancelReasonChange(event.target.value)} placeholder="Cancel reason" />
              <button className="button-secondary" type="submit" disabled={isSaving} style={{ width: '100%' }}>
                <XCircle style={{ width: 15, height: 15 }} />
                Cancel Order
              </button>
            </form>
          ) : null}
          {canConvertToInvoice ? (
            <section style={{ display: 'grid', gap: 8, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800 }}>Convert To Invoice</h3>
              <button className="button-primary" type="button" disabled={isSaving} onClick={onConvertToInvoice} style={{ width: '100%' }}>
                <FileText style={{ width: 15, height: 15 }} />
                Convert To Invoice
              </button>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function OrderStatusBadge({ status }) {
  const tone = statusTone[status] || statusTone.Draft
  return <span style={{ padding: '4px 8px', borderRadius: 999, border: `1px solid ${tone.border}`, background: tone.background, color: tone.color, fontSize: 10, fontWeight: 900 }}>{status.toUpperCase()}</span>
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
      <span style={{ fontWeight: strong ? 700 : 500, color: strong ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{label}</span>
      <span className="mono" style={{ fontSize: strong ? 14 : 12, fontWeight: strong ? 800 : 500 }}>{value}</span>
    </div>
  )
}

function SelectShell({ children, width }) {
  return (
    <div style={{ position: 'relative', width }}>
      {children}
      <div style={{ pointerEvents: 'none', position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }}>
        <svg style={{ width: 14, height: 14, fill: 'currentColor' }} viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>
  )
}

function QueueMessage({ children }) {
  return <div style={{ height: '100%', minHeight: 0, display: 'grid', placeItems: 'center', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>{children}</div>
}

function DetailMessage({ children, icon = false }) {
  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
      {icon ? (
        <div style={{ width: 52, height: 52, borderRadius: 12, display: 'grid', placeItems: 'center', color: 'var(--color-text-dim)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--color-border)' }}>
          <FileText style={{ width: 25, height: 25 }} />
        </div>
      ) : null}
      {children}
    </div>
  )
}

const pageShellStyle = { height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }
const titleStyle = { fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }
const subtitleStyle = { marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }
const filterBarStyle = { padding: 16, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }
const searchIconStyle = { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--color-text-dim)' }
const searchInputStyle = { width: '100%', height: 40, paddingLeft: 36, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-primary)', fontSize: 14 }
const selectStyle = { width: '100%', height: 40, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-primary)', fontSize: 14, cursor: 'pointer', appearance: 'none', paddingLeft: 12, paddingRight: 36 }
const dateInputStyle = { width: '100%', height: 40, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-primary)', fontSize: 14 }
const clearButtonStyle = { height: 40, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7 }
const masterDetailStyle = { display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) minmax(0, 1fr)', gap: 16, alignItems: 'stretch', flex: 1, minHeight: 0, overflow: 'hidden' }
const queuePanelStyle = { padding: 12, display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) auto', minHeight: 0, height: '100%', overflow: 'hidden' }
const queueHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '4px 4px 14px' }
const queueIconStyle = { width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--color-teal)', background: 'rgba(142, 232, 240, 0.1)', border: '1px solid rgba(142, 232, 240, 0.2)' }
const countPillStyle = { padding: '4px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: 'var(--color-teal)', background: 'rgba(142, 232, 240, 0.1)' }
const cardTopStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }
const cardBottomStyle = { paddingTop: 10, borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }
const dateTextStyle = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }
const ellipsisPrimaryStyle = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }
const ellipsisSecondaryStyle = { marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: 'var(--color-text-dim)' }
const detailPanelShellStyle = { padding: 16, minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden' }
const detailHeaderStyle = { padding: 14, border: '1px solid var(--color-border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }
const itemsPanelStyle = { minHeight: 150, overflow: 'hidden', border: '1px solid var(--color-border)', borderRadius: 8, display: 'flex', flexDirection: 'column', flex: 1 }
const itemsHeaderStyle = { padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--color-border)' }
const detailFooterGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(220px, 280px)', gap: 10 }
const summaryPanelStyle = { padding: 14, border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg-elevated)', display: 'flex', flexDirection: 'column', gap: 8 }
const actionsPanelStyle = { padding: 14, border: '1px solid var(--color-border)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10, alignSelf: 'stretch' }

function cardStyle(isSelected) {
  return {
    width: '100%',
    padding: 13,
    display: 'flex',
    flexDirection: 'column',
    gap: 11,
    textAlign: 'left',
    borderRadius: 8,
    border: isSelected ? '1px solid color-mix(in srgb, var(--color-teal) 45%, transparent)' : '1px solid var(--color-border)',
    background: isSelected ? 'color-mix(in srgb, var(--color-teal) 10%, transparent)' : 'var(--color-bg-elevated)',
    cursor: 'pointer',
  }
}
