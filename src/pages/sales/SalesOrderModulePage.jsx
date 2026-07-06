import dayjs from 'dayjs'
import { CheckCircle2, FileText, PackagePlus, RefreshCw, Search, Trash2, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import SimplePagination from '@components/ui/SimplePagination'
import StatusBadge from '@components/ui/StatusBadge'
import { masterService } from '@/services/api/masterService'
import { salesService } from '@/services/api/salesService'

const orderPageSize = 5

const emptyHeader = {
  customerId: '',
  deliveryDate: '',
  notes: '',
}

const emptyLine = {
  productId: '',
  quantity: '',
  discountPercent: '0',
}

const emptyConversion = {
  vehicleId: '',
  dueDate: '',
  notes: '',
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

function toIsoDate(value) {
  return value ? dayjs(value).toISOString() : null
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function statusLabel(status) {
  return String(status || '').replace(/([a-z])([A-Z])/g, '$1 $2')
}

function DetailItem({ label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <span className="form-label">{label}</span>
      <div
        className="form-input"
        title={String(value || '-')}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 38,
          fontWeight: 700,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value || '-'}
      </div>
    </div>
  )
}

function AmountLine({ label, value, strong = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
      <span style={{ color: strong ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
        {label}
      </span>
      <span
        className="mono"
        style={{ fontWeight: strong ? 800 : 600, color: strong ? 'var(--color-amber)' : undefined }}
      >
        {formatMoney(value)}
      </span>
    </div>
  )
}

export default function SalesOrderModulePage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [header, setHeader] = useState(emptyHeader)
  const [line, setLine] = useState(emptyLine)
  const [lineDrafts, setLineDrafts] = useState({})
  const [conversion, setConversion] = useState(emptyConversion)
  const [cancelReason, setCancelReason] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const customerById = useMemo(() => {
    return customers.reduce((map, customer) => {
      map[customer.id] = customer
      return map
    }, {})
  }, [customers])

  const productById = useMemo(() => {
    return products.reduce((map, product) => {
      map[product.id] = product
      return map
    }, {})
  }, [products])

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()

    return orders
      .filter((order) => {
        if (!query) return true
        return (
          order.orderNumber?.toLowerCase().includes(query) ||
          order.customerName?.toLowerCase().includes(query) ||
          order.customerId?.toLowerCase().includes(query) ||
          order.status?.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
  }, [orders, search])

  const pagedOrders = useMemo(() => {
    const startIndex = (page - 1) * orderPageSize
    return filteredOrders.slice(startIndex, startIndex + orderPageSize)
  }, [filteredOrders, page])

  const isDraft = selectedOrder?.status === 'Draft'
  const isConfirmed = selectedOrder?.status === 'Confirmed'

  async function loadReferenceData() {
    const [customerResult, productResult] = await Promise.all([
      salesService.listCustomers({ page: 1, pageSize: 100, isActive: true }),
      masterService.listProducts({ page: 1, pageSize: 100, status: 'Active' }),
    ])

    setCustomers(customerResult.items || [])
    setProducts(productResult.items || [])
  }

  async function loadOrders() {
    setIsLoading(true)
    try {
      const result = await salesService.listMySalesOrders()
      setOrders(result)
      setSelectedOrderId((currentId) => {
        if (result.some((order) => order.id === currentId)) return currentId
        return result[0]?.id || ''
      })
    } catch (error) {
      toast.error(error.message || 'Unable to load sales orders.')
      setOrders([])
      setSelectedOrderId('')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadSelectedOrder(orderId) {
    if (!orderId) {
      setSelectedOrder(null)
      setLineDrafts({})
      return
    }

    setIsLoadingDetail(true)
    try {
      const order = await salesService.getSalesOrder(orderId)
      setSelectedOrder(order)
      setLineDrafts(
        (order.lines || []).reduce((map, item) => {
          map[item.id] = {
            quantity: String(item.quantity),
            discountPercent: String(item.discountPercent),
          }
          return map
        }, {})
      )
    } catch (error) {
      toast.error(error.message || 'Unable to load order detail.')
      setSelectedOrder(null)
      setLineDrafts({})
    } finally {
      setIsLoadingDetail(false)
    }
  }

  useEffect(() => {
    async function loadPage() {
      try {
        await loadReferenceData()
        await loadOrders()
      } catch (error) {
        toast.error(error.message || 'Unable to load sales order data.')
      }
    }

    loadPage()
  }, [])

  useEffect(() => {
    loadSelectedOrder(selectedOrderId)
  }, [selectedOrderId])

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / orderPageSize))
    if (page > totalPages) setPage(totalPages)
  }, [filteredOrders.length, page])

  function updateHeader(field, value) {
    setHeader((current) => ({ ...current, [field]: value }))
  }

  function updateLine(field, value) {
    setLine((current) => ({ ...current, [field]: value }))
  }

  function updateLineDraft(lineId, field, value) {
    setLineDrafts((current) => ({
      ...current,
      [lineId]: {
        ...current[lineId],
        [field]: value,
      },
    }))
  }

  async function createOrder(event) {
    event.preventDefault()

    if (!header.customerId) {
      toast.error('Select a customer.')
      return
    }

    setIsSaving(true)
    try {
      const created = await salesService.createSalesOrder({
        customerId: header.customerId,
        deliveryDate: toIsoDate(header.deliveryDate),
        notes: header.notes.trim() || null,
      })
      toast.success('Sales order created.')
      setHeader(emptyHeader)
      setSelectedOrderId(created.id)
      await loadOrders()
    } catch (error) {
      toast.error(error.message || 'Unable to create sales order.')
    } finally {
      setIsSaving(false)
    }
  }

  async function addLine(event) {
    event.preventDefault()

    if (!selectedOrder || !line.productId) {
      toast.error('Select a draft order and product.')
      return
    }

    if (toNumber(line.quantity) <= 0) {
      toast.error('Quantity must be greater than zero.')
      return
    }

    setIsSaving(true)
    try {
      await salesService.addSalesOrderLine(selectedOrder.id, {
        productId: line.productId,
        quantity: toNumber(line.quantity),
        discountPercent: toNumber(line.discountPercent),
      })
      toast.success('Order line added.')
      setLine(emptyLine)
      await loadOrders()
      await loadSelectedOrder(selectedOrder.id)
    } catch (error) {
      toast.error(error.message || 'Unable to add order line.')
    } finally {
      setIsSaving(false)
    }
  }

  async function updateOrderLine(lineId) {
    const draft = lineDrafts[lineId]
    if (!draft) return

    setIsSaving(true)
    try {
      await salesService.updateSalesOrderLine(selectedOrder.id, lineId, {
        quantity: toNumber(draft.quantity),
        discountPercent: toNumber(draft.discountPercent),
      })
      toast.success('Order line updated.')
      await loadOrders()
      await loadSelectedOrder(selectedOrder.id)
    } catch (error) {
      toast.error(error.message || 'Unable to update order line.')
    } finally {
      setIsSaving(false)
    }
  }

  async function removeOrderLine(lineId) {
    setIsSaving(true)
    try {
      await salesService.removeSalesOrderLine(selectedOrder.id, lineId)
      toast.success('Order line removed.')
      await loadOrders()
      await loadSelectedOrder(selectedOrder.id)
    } catch (error) {
      toast.error(error.message || 'Unable to remove order line.')
    } finally {
      setIsSaving(false)
    }
  }

  async function confirmOrder() {
    setIsSaving(true)
    try {
      await salesService.confirmSalesOrder(selectedOrder.id)
      toast.success('Sales order confirmed.')
      await loadOrders()
      await loadSelectedOrder(selectedOrder.id)
    } catch (error) {
      toast.error(error.message || 'Unable to confirm sales order.')
    } finally {
      setIsSaving(false)
    }
  }

  async function cancelOrder(event) {
    event.preventDefault()

    if (!cancelReason.trim()) {
      toast.error('Cancellation reason is required.')
      return
    }

    setIsSaving(true)
    try {
      await salesService.cancelSalesOrder(selectedOrder.id, cancelReason.trim())
      toast.success('Sales order cancelled.')
      setCancelReason('')
      await loadOrders()
      await loadSelectedOrder(selectedOrder.id)
    } catch (error) {
      toast.error(error.message || 'Unable to cancel sales order.')
    } finally {
      setIsSaving(false)
    }
  }

  async function convertToInvoice(event) {
    event.preventDefault()

    if (!conversion.vehicleId.trim()) {
      toast.error('Vehicle ID is required to convert the order.')
      return
    }

    setIsSaving(true)
    try {
      const result = await salesService.convertSalesOrderToInvoice(selectedOrder.id, {
        vehicleId: conversion.vehicleId.trim(),
        dueDate: toIsoDate(conversion.dueDate),
        notes: conversion.notes.trim() || null,
      })
      toast.success('Sales order converted to invoice.')
      setConversion(emptyConversion)
      await loadOrders()
      if (result.invoiceId) navigate(`/sales/invoices/${result.invoiceId}`)
    } catch (error) {
      toast.error(error.message || 'Unable to convert sales order.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="responsive-page"
      style={{
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'minmax(360px, 430px) minmax(0, 1fr)',
        gap: 14,
      }}
    >
      <section className="panel" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 14, borderBottom: '1px solid var(--color-border)' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Sales Orders</h1>
          <p style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 13 }}>
            Create draft orders, manage lines, and convert confirmed orders to invoices.
          </p>
        </div>

        <form
          onSubmit={createOrder}
          style={{
            padding: 14,
            display: 'grid',
            gap: 10,
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 800 }}>New Order</h2>
          <label>
            <span className="form-label">Customer</span>
            <select
              className="form-input"
              value={header.customerId}
              onChange={(event) => updateHeader('customerId', event.target.value)}
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="form-label">Delivery Date</span>
            <input
              className="form-input"
              type="date"
              value={header.deliveryDate}
              onChange={(event) => updateHeader('deliveryDate', event.target.value)}
            />
          </label>
          <label>
            <span className="form-label">Notes</span>
            <input
              className="form-input"
              value={header.notes}
              onChange={(event) => updateHeader('notes', event.target.value)}
              placeholder="Optional order notes"
            />
          </label>
          <button className="button-primary" type="submit" disabled={isSaving}>
            <PackagePlus style={{ width: 15, height: 15 }} />
            Create Draft Order
          </button>
        </form>

        <div style={{ padding: 14, borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ position: 'relative' }}>
            <Search
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                width: 16,
                height: 16,
                transform: 'translateY(-50%)',
                color: 'var(--color-text-dim)',
              }}
            />
            <input
              className="form-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search orders"
              style={{ paddingLeft: 38 }}
            />
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 14, color: 'var(--color-text-muted)' }}>Loading orders...</div>
          ) : filteredOrders.length ? (
            <table className="data-table product-table-compact" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {pagedOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    style={{
                      cursor: 'pointer',
                      background:
                        order.id === selectedOrderId
                          ? 'color-mix(in srgb, var(--color-amber) 10%, transparent)'
                          : undefined,
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span className="mono" style={{ fontWeight: 800 }}>
                          {order.orderNumber}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                          {formatDate(order.orderDate)}
                        </span>
                      </div>
                    </td>
                    <td>{order.customerName || customerById[order.customerId]?.name || '-'}</td>
                    <td>
                      <StatusBadge status={statusLabel(order.status)} />
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {formatMoney(order.netAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 14, color: 'var(--color-text-muted)' }}>No sales orders found.</div>
          )}
        </div>

        <div style={{ padding: '0 14px 12px' }}>
          <SimplePagination
            page={page}
            pageSize={orderPageSize}
            totalItems={filteredOrders.length}
            onPageChange={setPage}
            itemLabel="orders"
          />
        </div>
      </section>

      <section
        className="panel"
        style={{
          minHeight: 0,
          overflow: 'auto',
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {isLoadingDetail ? (
          <div style={{ color: 'var(--color-text-muted)' }}>Loading order detail...</div>
        ) : selectedOrder ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800 }}>
                  Sales Order: {selectedOrder.orderNumber}
                </h2>
                <p style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 13 }}>
                  Created on {formatDate(selectedOrder.orderDate)}
                </p>
              </div>
              <StatusBadge status={statusLabel(selectedOrder.status)} />
            </div>

            <div
              className="responsive-field-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 10,
              }}
            >
              <DetailItem label="Customer" value={selectedOrder.customerName || selectedOrder.customerId} />
              <DetailItem label="Sales Route" value={selectedOrder.salesRouteId} />
              <DetailItem label="Sales Person" value={selectedOrder.salesPersonId} />
              <DetailItem label="Delivery Date" value={formatDate(selectedOrder.deliveryDate)} />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 280px',
                gap: 12,
                alignItems: 'start',
              }}
            >
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)' }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800 }}>Order Lines</h3>
                </div>
                <div className="responsive-table-shell" style={{ overflow: 'auto' }}>
                  <table className="data-table" style={{ minWidth: 820 }}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th style={{ textAlign: 'right' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Unit Price</th>
                        <th style={{ textAlign: 'right' }}>Disc %</th>
                        <th style={{ textAlign: 'right' }}>VAT</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                        {isDraft ? <th style={{ textAlign: 'right' }}>Actions</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.lines || []).length ? (
                        selectedOrder.lines.map((orderLine) => {
                          const product = productById[orderLine.productId]
                          const draft = lineDrafts[orderLine.id] || {}

                          return (
                            <tr key={orderLine.id}>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                  <span className="product-sku-badge mono" style={{ fontSize: 10 }}>
                                    {product?.sku || orderLine.productId}
                                  </span>
                                  <span style={{ fontWeight: 700 }}>
                                    {product?.name || 'Unknown Product'}
                                  </span>
                                </div>
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                {isDraft ? (
                                  <input
                                    className="form-input"
                                    type="number"
                                    min="0"
                                    value={draft.quantity || ''}
                                    onChange={(event) =>
                                      updateLineDraft(orderLine.id, 'quantity', event.target.value)
                                    }
                                    style={{ width: 90, height: 32, textAlign: 'right' }}
                                  />
                                ) : (
                                  `${orderLine.quantity} ${orderLine.unitId}`
                                )}
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                {formatMoney(orderLine.unitPrice)}
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                {isDraft ? (
                                  <input
                                    className="form-input"
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={draft.discountPercent || ''}
                                    onChange={(event) =>
                                      updateLineDraft(orderLine.id, 'discountPercent', event.target.value)
                                    }
                                    style={{ width: 78, height: 32, textAlign: 'right' }}
                                  />
                                ) : (
                                  `${orderLine.discountPercent}%`
                                )}
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                {formatMoney(orderLine.vatAmount)}
                              </td>
                              <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                                {formatMoney(orderLine.lineTotal)}
                              </td>
                              {isDraft ? (
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <button
                                    className="button-secondary"
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => updateOrderLine(orderLine.id)}
                                    style={{ height: 30, paddingInline: 10, marginRight: 6 }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    className="button-secondary"
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => removeOrderLine(orderLine.id)}
                                    style={{ height: 30, paddingInline: 10 }}
                                  >
                                    <Trash2 style={{ width: 13, height: 13 }} />
                                  </button>
                                </td>
                              ) : null}
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={isDraft ? 7 : 6} style={{ color: 'var(--color-text-muted)' }}>
                            No order lines added yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>Totals</h3>
                <AmountLine label="Gross" value={selectedOrder.grossAmount} />
                <AmountLine label="Discount" value={selectedOrder.totalDiscountAmount} />
                <AmountLine label="Supplier Discount" value={selectedOrder.totalSupplierDiscountAmount} />
                <AmountLine
                  label="Distributor Discount"
                  value={selectedOrder.totalDistributorDiscountAmount}
                />
                <AmountLine label="VAT" value={selectedOrder.vatAmount} />
                <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
                <AmountLine label="Net" value={selectedOrder.netAmount} strong />
              </aside>
            </div>

            {isDraft ? (
              <form
                onSubmit={addLine}
                className="responsive-field-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(220px, 1fr) 120px 120px auto',
                  gap: 10,
                  alignItems: 'end',
                  paddingTop: 12,
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                <label>
                  <span className="form-label">Product</span>
                  <select
                    className="form-input"
                    value={line.productId}
                    onChange={(event) => updateLine('productId', event.target.value)}
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku ? `${product.sku} - ${product.name}` : product.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="form-label">Qty</span>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    value={line.quantity}
                    onChange={(event) => updateLine('quantity', event.target.value)}
                  />
                </label>
                <label>
                  <span className="form-label">Discount %</span>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    max="10"
                    value={line.discountPercent}
                    onChange={(event) => updateLine('discountPercent', event.target.value)}
                  />
                </label>
                <button className="button-primary" type="submit" disabled={isSaving}>
                  <PackagePlus style={{ width: 15, height: 15 }} />
                  Add Line
                </button>
              </form>
            ) : null}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                gap: 12,
                paddingTop: 12,
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {isDraft ? (
                  <button
                    className="button-primary"
                    type="button"
                    disabled={isSaving}
                    onClick={confirmOrder}
                  >
                    <CheckCircle2 style={{ width: 15, height: 15 }} />
                    Confirm Order
                  </button>
                ) : null}

                {!['Cancelled', 'Converted'].includes(selectedOrder.status) ? (
                  <form onSubmit={cancelOrder} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                    <input
                      className="form-input"
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      placeholder="Cancel reason"
                    />
                    <button className="button-secondary" type="submit" disabled={isSaving}>
                      <XCircle style={{ width: 15, height: 15 }} />
                      Cancel
                    </button>
                  </form>
                ) : null}
              </div>

              {isConfirmed ? (
                <form onSubmit={convertToInvoice} style={{ display: 'grid', gap: 8 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800 }}>Convert To Invoice</h3>
                  <input
                    className="form-input"
                    value={conversion.vehicleId}
                    onChange={(event) =>
                      setConversion((current) => ({ ...current, vehicleId: event.target.value }))
                    }
                    placeholder="Vehicle ID"
                  />
                  <input
                    className="form-input"
                    type="date"
                    value={conversion.dueDate}
                    onChange={(event) =>
                      setConversion((current) => ({ ...current, dueDate: event.target.value }))
                    }
                  />
                  <input
                    className="form-input"
                    value={conversion.notes}
                    onChange={(event) =>
                      setConversion((current) => ({ ...current, notes: event.target.value }))
                    }
                    placeholder="Invoice notes"
                  />
                  <button className="button-primary" type="submit" disabled={isSaving}>
                    <FileText style={{ width: 15, height: 15 }} />
                    Convert
                  </button>
                </form>
              ) : null}
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--color-text-muted)' }}>Select or create a sales order.</div>
        )}
      </section>
    </div>
  )
}
