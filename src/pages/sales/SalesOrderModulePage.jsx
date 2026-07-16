import dayjs from 'dayjs'
import { ArrowLeft, CheckCircle2, FileText, PackagePlus, RefreshCw, Search, Trash2, XCircle } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import SimplePagination from '@components/ui/SimplePagination'
import StatusBadge from '@components/ui/StatusBadge'
import { useStockAvailability, useStockBatches } from '@/hooks/useStock'
import { masterService } from '@/services/api/masterService'
import { salesService } from '@/services/api/salesService'
import { usersService } from '@/services/api/usersService'
import { formatDate as formatSriLankaDate } from '@/utils'

const orderPageSize = 10

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
  return formatSriLankaDate(value)
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

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  emptyLabel = 'No matches found',
  getLabel,
  getMeta = () => '',
  menuPlacement = 'bottom',
}) {
  const containerRef = useRef(null)
  const selected = options.find((option) => option.id === value) || null
  const selectedLabel = selected ? getLabel(selected) : ''
  const [query, setQuery] = useState(selectedLabel)
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  useEffect(() => {
    if (selectedLabel) {
      setQuery(selectedLabel)
    } else if (!open) {
      setQuery('')
    }
  }, [selectedLabel, open])

  useEffect(() => {
    if (!open) return undefined

    function handleOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  const filteredOptions = useMemo(() => {
    const text = query.trim().toLowerCase()
    const filtered = text
      ? options.filter((option) =>
          `${getLabel(option)} ${getMeta(option)}`.toLowerCase().includes(text)
        )
      : options

    return filtered.slice(0, 60)
  }, [getLabel, getMeta, options, query])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [query])

  function selectOption(option) {
    const label = getLabel(option)
    onChange(option.id)
    setQuery(label)
    setOpen(false)
  }

  const opensUp = menuPlacement === 'top'

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <Search
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 11,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 14,
          height: 14,
          color: 'var(--color-text-muted)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <input
        className="form-input"
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          const nextQuery = event.target.value
          setQuery(nextQuery)
          setOpen(true)
          if (value) onChange('')
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            if (open && filteredOptions[highlightedIndex]) {
              selectOption(filteredOptions[highlightedIndex])
            }
          } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
            setHighlightedIndex((current) =>
              Math.min(current + 1, Math.max(filteredOptions.length - 1, 0))
            )
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setHighlightedIndex((current) => Math.max(current - 1, 0))
          } else if (event.key === 'Escape') {
            setOpen(false)
            setQuery(selectedLabel)
          }
        }}
        style={{ width: '100%', height: 38, paddingLeft: 32 }}
      />
      {open ? (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 120,
            top: opensUp ? 'auto' : 'calc(100% + 4px)',
            bottom: opensUp ? 'calc(100% + 4px)' : 'auto',
            left: 0,
            right: 0,
            maxHeight: 260,
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            background: 'var(--color-bg-surface)',
            boxShadow: '0 16px 34px rgba(0, 0, 0, 0.4)',
          }}
        >
          {filteredOptions.length ? (
            filteredOptions.map((option, index) => {
              const label = getLabel(option)
              const meta = getMeta(option)
              const isHighlighted = index === highlightedIndex

              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={option.id === value}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    selectOption(option)
                  }}
                  style={{
                    display: 'grid',
                    gap: 3,
                    width: '100%',
                    padding: '10px 12px',
                    border: 0,
                    borderBottom: '1px solid var(--color-border)',
                    background: isHighlighted ? 'rgba(125, 224, 232, 0.12)' : 'transparent',
                    color: 'var(--color-text-primary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{label}</span>
                  {meta ? (
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{meta}</span>
                  ) : null}
                </button>
              )
            })
          ) : (
            <div style={{ padding: 12, color: 'var(--color-text-muted)', fontSize: 12 }}>{emptyLabel}</div>
          )}
        </div>
      ) : null}
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
  const [viewDetail, setViewDetail] = useState(false)
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
  const [salesRouteName, setSalesRouteName] = useState('')
  const [salesPersonName, setSalesPersonName] = useState('')

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
  const selectedLineProduct = productById[line.productId] || null
  const {
    data: availabilityData,
    isLoading: loadingAvailability,
  } = useStockAvailability(line.productId)
  const { data: selectedProductBatches = [] } = useStockBatches(line.productId)
  const inventoryUnitCode =
    availabilityData?.smallestUnitCode ||
    availabilityData?.unitCode ||
    availabilityData?.uomCode ||
    availabilityData?.baseUomCode ||
    selectedProductBatches.find((batch) => batch.smallestUnitCode)?.smallestUnitCode ||
    ''
  const sellableQty = Number(availabilityData?.sellable ?? 0)
  const totalReserved = Number(availabilityData?.totalReserved ?? 0)
  const totalAvailable = Number(availabilityData?.totalAvailable ?? 0)
  const unitCode =
    inventoryUnitCode ||
    selectedLineProduct?.smallestUnitCode ||
    selectedLineProduct?.smallestUnitId ||
    selectedLineProduct?.uomBase ||
    ''
  const lineQtyNumber = toNumber(line.quantity)
  const hasAvailabilityData = Boolean(availabilityData)
  const qtyExceedsSellable =
    hasAvailabilityData && Boolean(line.quantity) && lineQtyNumber > sellableQty && sellableQty > 0
  const noSellableStock =
    hasAvailabilityData && Boolean(line.quantity) && sellableQty <= 0 && Boolean(line.productId)

  const computedGross = useMemo(() => {
    return selectedOrder?.lines?.reduce((sum, l) => sum + (toNumber(l.quantity) * toNumber(l.unitPrice)), 0) ?? 0
  }, [selectedOrder])

  const computedSupplierDiscount = useMemo(() => {
    return selectedOrder?.lines?.reduce((sum, l) => {
      const price = toNumber(l.unitPrice)
      const qty = toNumber(l.quantity)
      const disc = toNumber(l.discountPercent)
      const supplierDisc = Math.min(disc, 8)
      return sum + (price * qty * supplierDisc / 100)
    }, 0) ?? 0
  }, [selectedOrder])

  const computedDistributorDiscount = useMemo(() => {
    return selectedOrder?.lines?.reduce((sum, l) => {
      const price = toNumber(l.unitPrice)
      const qty = toNumber(l.quantity)
      const disc = toNumber(l.discountPercent)
      const distributorDisc = Math.max(0, disc - 8)
      return sum + (price * qty * distributorDisc / 100)
    }, 0) ?? 0
  }, [selectedOrder])

  const computedDiscount = computedSupplierDiscount + computedDistributorDiscount

  const computedVat = useMemo(() => {
    return selectedOrder?.lines?.reduce((sum, l) => {
      if (!l.isVatApplicable) return sum
      const price = toNumber(l.unitPrice)
      const qty = toNumber(l.quantity)
      const disc = toNumber(l.discountPercent)
      const afterDiscount = (price * qty) - (price * qty * disc / 100)
      return sum + Math.round(afterDiscount * 0.18 * 100) / 100
    }, 0) ?? 0
  }, [selectedOrder])

  const computedNet = computedGross - computedDiscount + computedVat

  const gross = selectedOrder?.grossAmount > 0 ? selectedOrder.grossAmount : computedGross
  const discount = selectedOrder?.totalDiscountAmount > 0 ? selectedOrder.totalDiscountAmount : computedDiscount
  const supplierDiscount = selectedOrder?.totalSupplierDiscountAmount > 0 ? selectedOrder.totalSupplierDiscountAmount : computedSupplierDiscount
  const distributorDiscount = selectedOrder?.totalDistributorDiscountAmount > 0 ? selectedOrder.totalDistributorDiscountAmount : computedDistributorDiscount
  const vat = selectedOrder?.vatAmount > 0 ? selectedOrder.vatAmount : computedVat
  const net = selectedOrder?.netAmount > 0 ? selectedOrder.netAmount : computedNet

  async function loadReferenceData() {
    const [customerResult, productResult] = await Promise.all([
      salesService.listAllCustomers({ pageSize: 100, isActive: true }),
      masterService.listAllProducts({ pageSize: 100, status: 'Active' }),
    ])

    setCustomers(customerResult || [])
    setProducts(productResult || [])
  }

  async function loadOrders() {
    setIsLoading(true)
    try {
      const result = await salesService.listSalesOrders({ page: 1, pageSize: 100 })
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
      setSalesRouteName('')
      setSalesPersonName('')
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

      // Fetch sales route name
      if (order.salesRouteId) {
        masterService.getSalesRoute(order.salesRouteId)
          .then(r => setSalesRouteName(r?.name || ''))
          .catch(() => setSalesRouteName(''))
      } else {
        setSalesRouteName('')
      }

      // Fetch sales person name
      if (order.salesPersonId) {
        usersService.getUser(order.salesPersonId)
          .then(u => setSalesPersonName(u?.username || u?.email || ''))
          .catch(() => setSalesPersonName(''))
      } else {
        setSalesPersonName('')
      }
    } catch (error) {
      toast.error(error.message || 'Unable to load order detail.')
      setSelectedOrder(null)
      setLineDrafts({})
      setSalesRouteName('')
      setSalesPersonName('')
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

  function handleProductSelect(productId) {
    setLine((current) => ({
      ...current,
      productId,
      quantity: '',
    }))
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
      setViewDetail(true)
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

    setIsSaving(true)
    try {
      const result = await salesService.convertSalesOrderToInvoice(selectedOrder.id, {
        vehicleId: conversion.vehicleId.trim() || null,
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
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        paddingBottom: 16,
      }}
    >
      <div
        className="responsive-master-detail"
        style={{
          display: 'grid',
          gridTemplateColumns: viewDetail ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 380px',
          gap: 14,
          flex: 1,
          minHeight: 0,
        }}
      >
        <main style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          {!viewDetail ? (
            <>
              <section className="panel" style={{ padding: 14 }}>
                <div style={{ position: 'relative', maxWidth: 420, minWidth: 0 }}>
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
              </section>

              <section
                className="panel"
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                }}
              >
                <div
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <h2 style={{ fontSize: 15, fontWeight: 800 }}>Sales Orders List</h2>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="responsive-table-shell" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                  {isLoading ? (
                    <div style={{ padding: 16, color: 'var(--color-text-muted)' }}>Loading orders...</div>
                  ) : filteredOrders.length ? (
                    <table className="data-table product-table-compact" style={{ minWidth: 760 }}>
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
                            onClick={() => {
                              setSelectedOrderId(order.id)
                              setViewDetail(true)
                            }}
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
                    <div style={{ padding: 16, color: 'var(--color-text-muted)' }}>No sales orders found.</div>
                  )}
                </div>

                {filteredOrders.length ? (
                  <div style={{ padding: '0 12px 10px', flexShrink: 0 }}>
                    <SimplePagination
                      page={page}
                      pageSize={orderPageSize}
                      totalItems={filteredOrders.length}
                      onPageChange={setPage}
                      itemLabel="orders"
                    />
                  </div>
                ) : null}
              </section>
            </>
          ) : (
            <>
              {isLoadingDetail ? (
                <div className="panel" style={{ padding: 24, color: 'var(--color-text-muted)' }}>
                  Loading order detail...
                </div>
              ) : selectedOrder ? (
                <>
                  <section className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                          onClick={() => {
                            setViewDetail(false)
                            setSelectedOrderId('')
                          }}
                          className="button-secondary"
                          style={{ height: 34, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                        >
                          <ArrowLeft size={15} /> Back
                        </button>
                        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>
                          Sales Order: <span className="mono" style={{ color: 'var(--color-amber)' }}>{selectedOrder.orderNumber}</span>
                        </h2>
                      </div>
                      <StatusBadge status={statusLabel(selectedOrder.status)} />
                    </div>

                    <hr style={{ border: 'none', borderBottom: '1px solid var(--color-border)', margin: 0 }} />

                    <div
                      className="responsive-field-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                        gap: 10,
                      }}
                    >
                      <DetailItem label="Customer" value={selectedOrder.customerName || selectedOrder.customerId} />
                      <DetailItem label="Sales Route" value={salesRouteName || selectedOrder.salesRouteId} />
                      <DetailItem label="Sales Person" value={salesPersonName || selectedOrder.salesPersonId} />
                      <DetailItem label="Delivery Date" value={formatDate(selectedOrder.deliveryDate)} />
                    </div>
                  </section>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) 280px',
                      gap: 14,
                      alignItems: 'start',
                      flex: 1,
                      minHeight: 0,
                    }}
                  >
                    <section
                      className="panel"
                      style={{
                        height: '100%',
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <FileText size={16} color="var(--color-teal)" />
                        <h3 style={{ fontSize: 15, fontWeight: 800 }}>Order Lines</h3>
                      </div>
                      <div className="responsive-table-shell" style={{ overflow: 'auto', flex: 1 }}>
                        <table className="data-table" style={{ minWidth: 820 }}>
                          <thead>
                            <tr>
                              <th>Item / Batch</th>
                              <th style={{ textAlign: 'right' }}>Qty</th>
                              <th style={{ textAlign: 'right' }}>Selling Price</th>
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

                                if (!isDraft && orderLine.isPicked && orderLine.batchPicks?.length > 0) {
                                  return (
                                    <React.Fragment key={orderLine.id}>
                                      {/* Header row for product name */}
                                      <tr style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                                        <td colSpan={6} style={{ padding: '8px 12px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className="product-sku-badge mono" style={{ fontSize: 10 }}>
                                              {product?.sku || orderLine.productId}
                                            </span>
                                            <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                              {product?.name || 'Unknown Product'}
                                            </span>
                                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>
                                              ({orderLine.quantitySmallest} {orderLine.smallestUnitCode || 'PCS'} total)
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                      {orderLine.batchPicks
                                        .slice()
                                        .sort((a, b) => a.pickOrder - b.pickOrder)
                                        .map((pick) => {
                                          const pickSellingPrice = pick.sellingPrice ?? Math.round(pick.mrp * (1 - orderLine.discountPercent / 100) * 100) / 100;
                                          const pickSubtotal = pickSellingPrice * pick.qtyPicked;
                                          const pickVat = orderLine.isVatApplicable
                                            ? Math.round(pickSubtotal * 0.18 * 100) / 100
                                            : 0;
                                          const pickTotal = pickSubtotal + pickVat;

                                          return (
                                            <tr key={pick.batchId} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
                                              <td style={{ paddingLeft: 24 }}>
                                                <span className="mono text-cyan-600" style={{ fontSize: 11 }}>
                                                  {pick.batchNo || 'No Batch'}
                                                </span>
                                              </td>
                                              <td className="mono" style={{ textAlign: 'right' }}>
                                                {pick.qtyPicked} <span className="font-mono text-xs text-gray-300">{orderLine.smallestUnitCode || 'PCS'}</span>
                                              </td>
                                              <td className="mono" style={{ textAlign: 'right' }}>
                                                <div>{formatMoney(pickSellingPrice)}</div>
                                                <div className="text-xs text-gray-500 font-mono">
                                                  MRP: {formatMoney(pick.mrp)}
                                                </div>
                                              </td>
                                              <td className="mono" style={{ textAlign: 'right' }}>
                                                {orderLine.discountPercent}%
                                              </td>
                                              <td className="mono" style={{ textAlign: 'right' }}>
                                                {orderLine.isVatApplicable ? formatMoney(pickVat) : '—'}
                                              </td>
                                              <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                                                {formatMoney(pickTotal)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                    </React.Fragment>
                                  );
                                }

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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
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
                                          <span className="font-mono text-xs text-gray-300">
                                            {orderLine.smallestUnitCode || 'PCS'}
                                          </span>
                                        </div>
                                      ) : (
                                        <div>
                                          {orderLine.quantity} <span className="font-mono text-xs text-gray-300">{orderLine.smallestUnitCode || 'PCS'}</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="mono" style={{ textAlign: 'right' }}>
                                      {orderLine.unitPrice > 0 ? (
                                        <>
                                          <div className="font-mono text-white">{formatMoney(orderLine.unitPrice)}</div>
                                          {isDraft ? (
                                            <div className="text-xs text-gray-500 font-mono">
                                              Draft — final price after confirmation
                                            </div>
                                          ) : (
                                            orderLine.mrp > 0 && (
                                              <div className="text-xs text-gray-500 font-mono">
                                                MRP: {formatMoney(orderLine.mrp)}
                                              </div>
                                            )
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-gray-500 text-xs">Pending confirm</span>
                                      )}
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
                                      {isDraft ? '—' : formatMoney(orderLine.vatAmount)}
                                    </td>
                                    <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                                      {orderLine.lineTotal > 0
                                        ? formatMoney(orderLine.lineTotal)
                                        : formatMoney(orderLine.quantity * orderLine.unitPrice * (1 - (orderLine.discountPercent || 0) / 100))
                                      }
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
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={isDraft ? 7 : 6} style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 24 }}>
                                  No order lines added yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {isDraft ? (
                        <div style={{ padding: 12, borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-surface)', flexShrink: 0 }}>
                          <form
                            onSubmit={addLine}
                            className="responsive-field-grid"
                            style={{
                              display: 'grid',
                              gridTemplateColumns:
                                'minmax(280px, 1.6fr) minmax(110px, 140px) minmax(110px, 140px) 130px',
                              gap: 12,
                              alignItems: 'start',
                              overflow: 'visible',
                            }}
                          >
                            <label style={{ minWidth: 0 }}>
                              <span className="form-label">Product</span>
                              <SearchableSelect
                                value={line.productId}
                                onChange={handleProductSelect}
                                options={products}
                                placeholder="Search product"
                                emptyLabel="No products found"
                                menuPlacement="top"
                                getLabel={(product) => {
                                  const sku = product.sku || product.productSku || ''
                                  const name = product.name || product.productName || ''
                                  return [sku, name].filter(Boolean).join(' - ') || product.id || ''
                                }}
                                getMeta={(product) =>
                                  [
                                    product.barcode,
                                    product.unitCode,
                                    product.uomBase || product.baseUom,
                                    product.brandName,
                                    product.category?.name,
                                  ]
                                    .filter(Boolean)
                                    .join(' • ')
                                }
                              />
                              <div className="sellable-qty-message" aria-live="polite">
                                {loadingAvailability && line.productId ? (
                                  <span className="sellable-qty-muted">
                                    <RefreshCw className="sellable-qty-spinner" size={12} />
                                    Checking stock...
                                  </span>
                                ) : null}
                                {!loadingAvailability && line.productId && availabilityData ? (
                                  <span
                                    className={
                                      sellableQty <= 0
                                        ? 'sellable-qty-danger'
                                        : 'sellable-qty-available'
                                    }
                                    title={`Total available: ${totalAvailable.toLocaleString()}${
                                      unitCode ? ` ${unitCode}` : ''
                                    }`}
                                  >
                                    <span
                                      className={
                                        sellableQty <= 0
                                          ? 'sellable-qty-dot sellable-qty-dot--danger'
                                          : 'sellable-qty-dot sellable-qty-dot--available'
                                      }
                                    />
                                    {sellableQty <= 0 ? (
                                      'Out of stock'
                                    ) : (
                                      <>
                                        <strong>{sellableQty.toLocaleString()}</strong>
                                        {unitCode ? <span>{unitCode}</span> : null}
                                        <span>sellable</span>
                                        {totalReserved > 0 ? (
                                          <span>
                                            ({totalReserved.toLocaleString()} reserved)
                                          </span>
                                        ) : null}
                                      </>
                                    )}
                                  </span>
                                ) : null}
                              </div>
                            </label>
                            <label>
                              <span className="form-label">
                                Qty{unitCode ? ` (${unitCode})` : ''}
                              </span>
                              <input
                                className={`form-input ${qtyExceedsSellable || noSellableStock ? 'warning' : ''}`}
                                type="number"
                                min="0"
                                value={line.quantity}
                                onChange={(event) => updateLine('quantity', event.target.value)}
                              />
                              <div className="sellable-qty-message" aria-live="polite">
                                {qtyExceedsSellable ? (
                                  <span className="sellable-qty-warning">
                                    Exceeds sellable ({sellableQty.toLocaleString()}
                                    {unitCode ? ` ${unitCode}` : ''})
                                  </span>
                                ) : null}
                                {noSellableStock ? (
                                  <span className="sellable-qty-danger">
                                    No stock available for this product
                                  </span>
                                ) : null}
                              </div>
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
                            <button
                              className="button-primary"
                              type="submit"
                              disabled={
                                isSaving ||
                                !line.productId ||
                                !line.quantity ||
                                lineQtyNumber <= 0
                              }
                              style={{ height: 38, justifyContent: 'center', marginTop: 22 }}
                            >
                              <PackagePlus style={{ width: 15, height: 15 }} />
                              Add Line
                            </button>
                          </form>
                        </div>
                      ) : null}
                    </section>

                    <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <section
                        className="panel"
                        style={{
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <h3 style={{ fontSize: 15, fontWeight: 800 }}>Totals</h3>
                        <AmountLine label="Gross" value={gross} />
                        <AmountLine label="Discount" value={discount} />
                        <AmountLine label="Supplier Discount" value={supplierDiscount} />
                        <AmountLine
                          label="Distributor Discount"
                          value={distributorDiscount}
                        />
                        <AmountLine label="VAT" value={vat} />
                        <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
                        <AmountLine label="Net" value={net} strong />
                      </section>

                      <section className="panel" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {isDraft ? (
                            <button
                              className="button-primary"
                              type="button"
                              disabled={isSaving}
                              onClick={confirmOrder}
                              style={{ width: '100%' }}
                            >
                              <CheckCircle2 style={{ width: 15, height: 15 }} />
                              Confirm Order
                            </button>
                          ) : null}

                          {!['Cancelled', 'Converted'].includes(selectedOrder.status) ? (
                            <form onSubmit={cancelOrder} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <input
                                className="form-input"
                                value={cancelReason}
                                onChange={(event) => setCancelReason(event.target.value)}
                                placeholder="Cancel reason"
                              />
                              <button className="button-secondary" type="submit" disabled={isSaving} style={{ width: '100%' }}>
                                <XCircle style={{ width: 15, height: 15 }} />
                                Cancel Order
                              </button>
                            </form>
                          ) : null}
                        </div>

                        {isConfirmed ? (
                          <form onSubmit={convertToInvoice} style={{ display: 'grid', gap: 8, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 800 }}>Convert To Invoice</h3>
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
                            <button className="button-primary" type="submit" disabled={isSaving} style={{ width: '100%' }}>
                              <FileText style={{ width: 15, height: 15 }} />
                              Convert
                            </button>
                          </form>
                        ) : null}
                      </section>
                    </aside>
                  </div>
                </>
              ) : (
                <div className="panel" style={{ padding: 24, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Select or create a sales order to view details.
                </div>
              )}
            </>
          )}
        </main>

        {!viewDetail && (
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
            <section className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>Sales Orders</h1>
                <p style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.4 }}>
                  Create draft orders, manage lines, and convert confirmed orders to invoices.
                </p>
              </div>

              <form
                onSubmit={createOrder}
                style={{
                  display: 'grid',
                  gap: 10,
                }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 800 }}>New Order</h2>
                <label>
                  <span className="form-label">Customer</span>
                  <SearchableSelect
                    value={header.customerId}
                    onChange={(customerId) => updateHeader('customerId', customerId)}
                    options={customers}
                    placeholder="Search customer"
                    emptyLabel="No customers found"
                    getLabel={(customer) =>
                      [customer.code, customer.name || customer.customerName]
                        .filter(Boolean)
                        .join(' - ') ||
                      customer.id ||
                      ''
                    }
                    getMeta={(customer) =>
                      [customer.primaryContactPhone, customer.phone, customer.routeName, customer.salesRouteName]
                        .filter(Boolean)
                        .join(' ')
                    }
                  />
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
                <button className="button-primary" type="submit" disabled={isSaving} style={{ width: '100%' }}>
                  <PackagePlus style={{ width: 15, height: 15 }} />
                  Create Draft Order
                </button>
              </form>
            </section>
          </aside>
        )}
      </div>
    </div>
  )
}
