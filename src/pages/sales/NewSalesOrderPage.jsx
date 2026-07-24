import dayjs from 'dayjs'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  FileText,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useStockAvailability, useStockBatches } from '@/hooks/useStock'
import { masterService } from '@/services/api/masterService'
import { salesService } from '@/services/api/salesService'
import { usersService } from '@/services/api/usersService'

const orderPageSize = 100

const emptyHeader = {
  customerId: '',
  deliveryDate: '',
  notes: '',
}

const emptyLine = {
  productId: '',
  quantity: '',
  discountPercent: '0',
  isReturnLine: false,
  returnReason: '',
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
  return String(status || 'Draft').replace(/([a-z])([A-Z])/g, '$1 $2')
}

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function statusClasses(status) {
  const normalized = normalizeStatus(status)

  if (normalized === 'cancelled' || normalized === 'canceled') {
    return 'border-[#ff7b8a]/30 bg-[#ff7b8a]/10 text-[#ff7b8a]'
  }
  if (normalized === 'converted' || normalized === 'confirmed' || normalized === 'submitted') {
    return 'border-[#8ee8f0]/30 bg-[#8ee8f0]/10 text-[#8ee8f0]'
  }
  if (normalized === 'draft') {
    return 'border-border bg-bg-base text-text-muted'
  }
  return 'border-border bg-bg-base text-text-muted'
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

function getOrderLines(order) {
  return Array.isArray(order?.lines) ? order.lines : []
}

function getComputedTotals(order) {
  const lines = getOrderLines(order).filter((line) => !line.isReturnLine)
  const gross = lines.reduce((sum, line) => sum + toNumber(line.quantity) * toNumber(line.unitPrice), 0)
  const discount = lines.reduce(
    (sum, line) => sum + toNumber(line.quantity) * toNumber(line.unitPrice) * (toNumber(line.discountPercent) / 100),
    0
  )
  const vat = lines.reduce((sum, line) => {
    if (!line.isVatApplicable) return sum
    const subtotal = toNumber(line.quantity) * toNumber(line.unitPrice)
    const afterDiscount = subtotal - subtotal * (toNumber(line.discountPercent) / 100)
    return sum + Math.round(afterDiscount * 0.18 * 100) / 100
  }, 0)
  const returnCredit = getOrderLines(order)
    .filter((line) => line.isReturnLine)
    .reduce((sum, line) => {
      const lineTotal = toNumber(line.lineTotal)
      if (lineTotal > 0) return sum + lineTotal
      return sum + toNumber(line.quantity) * toNumber(line.unitPrice) * (1 - toNumber(line.discountPercent) / 100)
    }, 0)
  const net = gross - discount - returnCredit + vat

  return { gross, discount, vat, returnCredit, net }
}

function FieldCard({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">{label}</div>
      <div className="flex min-h-10 items-center rounded-[6px] border border-border bg-bg-base px-3 py-2 text-[14px] font-semibold text-text-primary">
        {value || '-'}
      </div>
    </div>
  )
}

function AmountLine({ label, value, strong = false, negative = false }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-1.5">
      <span className={`text-[12px] ${strong ? 'font-bold text-text-primary' : 'font-medium text-text-primary'}`}>
        {label}
      </span>
      <span
        className={`font-mono text-right text-[12px] ${strong ? 'font-extrabold text-text-primary' : 'font-semibold text-text-muted'} ${negative ? 'text-[#8ee8f0]' : ''}`}
      >
        {negative ? `- ${formatMoney(value)}` : formatMoney(value)}
      </span>
    </div>
  )
}

function StockAvailabilityHint({
  isLoading,
  productId,
  availabilityData,
  sellableQty,
  totalAvailable,
  totalReserved,
  unitCode,
}) {
  if (!productId) return null

  const isOutOfStock = availabilityData && sellableQty <= 0
  const dotColor = isOutOfStock ? 'var(--color-danger)' : 'var(--color-teal)'
  const dotGlow = isOutOfStock ? 'rgba(255, 100, 116, 0.16)' : 'rgba(142, 232, 240, 0.16)'
  const textColor = isOutOfStock ? 'var(--color-danger)' : 'var(--color-text-primary)'

  return (
    <div
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 24,
        marginTop: 8,
        paddingLeft: 2,
        color: 'var(--color-text-muted)',
        fontSize: 12,
        lineHeight: 1.2,
      }}
    >
      {isLoading ? (
        <>
          <RefreshCw
            size={12}
            style={{
              color: 'var(--color-teal)',
              animation: 'spin 1s linear infinite',
              flexShrink: 0,
            }}
          />
          <span>Checking stock...</span>
        </>
      ) : null}

      {!isLoading && availabilityData ? (
        <span
          title={`Total available: ${totalAvailable.toLocaleString()}${unitCode ? ` ${unitCode}` : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 6,
            color: textColor,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: dotColor,
              boxShadow: `0 0 0 3px ${dotGlow}`,
              flexShrink: 0,
            }}
          />
          {isOutOfStock ? (
            <span style={{ fontWeight: 800 }}>Out of stock</span>
          ) : (
            <>
              <strong
                className="mono"
                style={{
                  color: 'var(--color-text-primary)',
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                {sellableQty.toLocaleString()}
              </strong>
              {unitCode ? (
                <span
                  className="mono"
                  style={{
                    padding: '2px 6px',
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                    background: 'rgba(142, 232, 240, 0.08)',
                    color: 'var(--color-teal)',
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: '0.04em',
                  }}
                >
                  {unitCode}
                </span>
              ) : null}
              <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>sellable</span>
              {totalReserved > 0 ? (
                <span style={{ color: 'var(--color-text-dim)' }}>
                  ({totalReserved.toLocaleString()} reserved)
                </span>
              ) : null}
            </>
          )}
        </span>
      ) : null}
    </div>
  )
}

function OrderStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${statusClasses(
        status
      )}`}
    >
      {statusLabel(status).toUpperCase()}
    </span>
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
            zIndex: 240,
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

function LineRow({ line, index, draft, isDraft, onDraftChange, onSave, onRemove, product }) {
  const itemName =
    product?.name ||
    product?.productName ||
    line?.productName ||
    line?.productCode ||
    product?.sku ||
    product?.productSku ||
    `Line ${index + 1}`
  const itemCode = product?.sku || product?.productSku || line?.productCode || line?.productId || '-'
  const batchLabel =
    line?.batchNo ||
    line?.batchNumber ||
    line?.batchCode ||
    line?.batchPicks?.[0]?.batchNo ||
    line?.batchPicks?.[0]?.batchCode ||
    line?.batchPicks?.[0]?.batchId ||
    (Array.isArray(line?.batchPicks) && line.batchPicks.length > 1 ? `${line.batchPicks.length} batches` : '')
  const unit = line?.smallestUnitCode || line?.unitCode || line?.unitId || '-'
  const lineTotal =
    line?.lineTotal > 0 ? line.lineTotal : toNumber(line.quantity) * toNumber(line.unitPrice) * (1 - toNumber(line.discountPercent) / 100)

  return (
    <tr className="sales-new-order-line-row hover:bg-bg-elevated/40">
      <td data-label="Item">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <span className="product-sku-badge mono">{batchLabel || itemCode}</span>
            {batchLabel ? <span className="product-info-sub mono">{itemCode}</span> : null}
          </div>
          <span className="product-info-sub" style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {itemName}
          </span>
        </div>
      </td>
      <td className="mono text-right" data-label="Qty">
        {isDraft ? (
          <input
            className="sales-new-order-line-input"
            style={{
              height: 32,
              width: 80,
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              color: 'var(--color-text-primary)',
              fontSize: 12,
              textAlign: 'right',
              padding: '0 8px',
              outline: 'none',
            }}
            type="number"
            min="0"
            value={draft.quantity || ''}
            onChange={(event) => onDraftChange(line.id, 'quantity', event.target.value)}
          />
        ) : (
          <>
            {line.quantity}{' '}
            <span className="text-[11px] font-medium text-text-dim">{unit}</span>
          </>
        )}
      </td>
      <td className="mono text-right" data-label="Selling Price">
        {formatMoney(line.unitPrice)}
      </td>
      <td className="mono text-right" data-label="Disc %">
        {isDraft ? (
          <input
            className="sales-new-order-line-input"
            style={{
              height: 32,
              width: 60,
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              color: 'var(--color-text-primary)',
              fontSize: 12,
              textAlign: 'right',
              padding: '0 8px',
              outline: 'none',
            }}
            type="number"
            min="0"
            max="10"
            value={draft.discountPercent || ''}
            onChange={(event) => onDraftChange(line.id, 'discountPercent', event.target.value)}
          />
        ) : (
          `${line.discountPercent}%`
        )}
      </td>
      <td className="mono text-right font-semibold" data-label="Total">
        {formatMoney(lineTotal)}
      </td>
      {isDraft ? (
        <td className="sales-new-order-line-actions" style={{ textAlign: 'right', whiteSpace: 'nowrap' }} data-label="Actions">
          <button
            type="button"
            onClick={() => onSave(line.id)}
            className="sales-new-order-line-save"
            style={{
              height: 28,
              padding: '0 10px',
              borderRadius: 4,
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-elevated)',
              color: 'var(--color-text-primary)',
              fontSize: 11,
              fontWeight: 600,
              marginRight: 6,
              cursor: 'pointer',
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => onRemove(line.id)}
            style={{
              height: 28,
              padding: '0 8px',
              borderRadius: 4,
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-elevated)',
              color: 'var(--color-text-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Trash2 style={{ width: 13, height: 13 }} />
          </button>
        </td>
      ) : null}
    </tr>
  )
}

export default function NewSalesOrderPage() {
  const navigate = useNavigate()
  const sessionUser = useAuthStore((state) => state.user)
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [salesRouteName, setSalesRouteName] = useState('')
  const [salesPersonName, setSalesPersonName] = useState('')
  const [draftSalesRouteName, setDraftSalesRouteName] = useState('')
  const [header, setHeader] = useState(emptyHeader)
  const [line, setLine] = useState(emptyLine)
  const [lineDrafts, setLineDrafts] = useState({})
  const [cancelReason, setCancelReason] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

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

  const sessionSalesPersonName =
    sessionUser?.username || sessionUser?.email || sessionUser?.employeeCode || 'Admin'
  const selectedCustomer = customerById[header.customerId] || null
  const draftSalesPersonName = sessionSalesPersonName

  const isDraft = selectedOrder?.status === 'Draft'
  const lineQtyNumber = toNumber(line.quantity)

  const { data: availabilityData, isLoading: loadingAvailability } = useStockAvailability(line.productId)
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
    productById[line.productId]?.smallestUnitCode ||
    productById[line.productId]?.smallestUnitId ||
    productById[line.productId]?.uomBase ||
    ''
  const computedTotals = getComputedTotals(selectedOrder)
  const gross = selectedOrder?.grossAmount > 0 ? selectedOrder.grossAmount : computedTotals.gross
  const discount = selectedOrder?.totalDiscountAmount > 0 ? selectedOrder.totalDiscountAmount : computedTotals.discount
  const vat = selectedOrder?.vatAmount > 0 ? selectedOrder.vatAmount : computedTotals.vat
  const returnCredit =
    selectedOrder?.returnCreditAmount > 0 ? selectedOrder.returnCreditAmount : computedTotals.returnCredit
  const net = selectedOrder?.netAmount > 0 ? selectedOrder.netAmount : computedTotals.net
  const paid = Number(selectedOrder?.paidAmount ?? 0)
  const outstanding = Number(selectedOrder?.outstandingAmount ?? 0)

  useEffect(() => {
    let isCurrent = true

    async function loadReferenceData() {
      setIsLoading(true)
      setError('')

      try {
        const [customerResult, productResult] = await Promise.all([
          salesService.listAllCustomers({ pageSize: 100, isActive: true }),
          masterService.listAllProducts({ pageSize: 100, status: 'Active' }),
        ])

        if (!isCurrent) return
        setCustomers(customerResult || [])
        setProducts(productResult || [])
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.message || 'Unable to load reference data.')
        }
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    loadReferenceData()

    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    let isCurrent = true

    async function loadOrders() {
      try {
        const result = await salesService.listSalesOrders({ page: 1, pageSize: orderPageSize })
        if (!isCurrent) return

        const list = Array.isArray(result) ? result : result?.items || result?.data || []
        const sorted = [...list].sort((a, b) => new Date(getOrderDate(b)) - new Date(getOrderDate(a)))
        setOrders(sorted)

        const preferred = sorted.find((order) => order.status === 'Draft') || sorted[0] || null
        setSelectedOrderId((currentId) => currentId || preferred?.id || '')
      } catch (requestError) {
        if (!isCurrent) return
        toast.error(requestError.message || 'Unable to load sales orders.')
        setOrders([])
        setSelectedOrderId('')
      }
    }

    loadOrders()

    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    if (!selectedOrderId && orders.length) {
      const preferred = orders.find((order) => order.status === 'Draft') || orders[0]
      if (preferred) setSelectedOrderId(preferred.id)
    }
  }, [orders, selectedOrderId])

  useEffect(() => {
    let isCurrent = true

    async function resolveDraftSalesRouteName() {
      if (!selectedCustomer) {
        setDraftSalesRouteName('')
        return
      }

      if (selectedCustomer.salesRouteName || selectedCustomer.routeName) {
        setDraftSalesRouteName(selectedCustomer.salesRouteName || selectedCustomer.routeName || '')
        return
      }

      if (!selectedCustomer.salesRouteId) {
        setDraftSalesRouteName('')
        return
      }

      try {
        const route = await masterService.getSalesRoute(selectedCustomer.salesRouteId)
        if (isCurrent) setDraftSalesRouteName(route?.name || route?.code || '')
      } catch {
        if (isCurrent) setDraftSalesRouteName('')
      }
    }

    resolveDraftSalesRouteName()

    return () => {
      isCurrent = false
    }
  }, [selectedCustomer])

  useEffect(() => {
    if (!selectedOrderId) {
      setSelectedOrder(null)
      setLineDrafts({})
      setSalesRouteName('')
      setSalesPersonName('')
      return
    }

    let isCurrent = true

    async function loadSelectedOrder(orderId) {
      setIsLoadingDetail(true)
      try {
        const order = await salesService.getSalesOrder(orderId)
        if (!isCurrent) return

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

        if (order.salesRouteId) {
          masterService
            .getSalesRoute(order.salesRouteId)
            .then((route) => {
              if (isCurrent) setSalesRouteName(route?.name || '')
            })
            .catch(() => {
              if (isCurrent) setSalesRouteName('')
            })
        } else {
          setSalesRouteName('')
        }

        if (order.salesPersonId) {
          usersService
            .getUser(order.salesPersonId)
            .then((user) => {
              if (isCurrent) setSalesPersonName(user?.username || user?.email || '')
            })
            .catch(() => {
              if (isCurrent) setSalesPersonName('')
            })
        } else {
          setSalesPersonName('')
        }
      } catch (requestError) {
        if (!isCurrent) return
        toast.error(requestError.message || 'Unable to load order detail.')
        setSelectedOrder(null)
        setLineDrafts({})
      } finally {
        if (isCurrent) setIsLoadingDetail(false)
      }
    }

    loadSelectedOrder(selectedOrderId)

    return () => {
      isCurrent = false
    }
  }, [selectedOrderId])

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
      setLine(emptyLine)
      setCancelReason('')
      setSelectedOrderId(created.id)
      await loadOrdersAgain()
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to create sales order.')
    } finally {
      setIsSaving(false)
    }
  }

  async function loadOrdersAgain() {
    const result = await salesService.listSalesOrders({ page: 1, pageSize: orderPageSize })
    const list = Array.isArray(result) ? result : result?.items || result?.data || []
    const sorted = [...list].sort((a, b) => new Date(getOrderDate(b)) - new Date(getOrderDate(a)))
    setOrders(sorted)
  }

  async function addLine(event) {
    event.preventDefault()

    if (!selectedOrder || selectedOrder.status !== 'Draft') {
      toast.error('Select a draft order.')
      return
    }

    if (!line.productId) {
      toast.error('Select a product.')
      return
    }

    if (toNumber(line.quantity) <= 0) {
      toast.error('Quantity must be greater than zero.')
      return
    }

    if (line.isReturnLine && !line.returnReason) {
      toast.error('Select a return reason.')
      return
    }

    setIsSaving(true)
    try {
      await salesService.addSalesOrderLine(selectedOrder.id, {
        productId: line.productId,
        quantity: toNumber(line.quantity),
        discountPercent: toNumber(line.discountPercent),
        isReturnLine: Boolean(line.isReturnLine),
        returnReason: line.isReturnLine ? Number(line.returnReason) : null,
      })
      toast.success('Order line added.')
      setLine(emptyLine)
      await loadOrdersAgain()
      setSelectedOrderId(selectedOrder.id)
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to add order line.')
    } finally {
      setIsSaving(false)
    }
  }

  async function updateOrderLine(lineId) {
    const draft = lineDrafts[lineId]
    if (!draft || !selectedOrder) return

    setIsSaving(true)
    try {
      await salesService.updateSalesOrderLine(selectedOrder.id, lineId, {
        quantity: toNumber(draft.quantity),
        discountPercent: toNumber(draft.discountPercent),
      })
      toast.success('Order line updated.')
      await loadOrdersAgain()
      setSelectedOrderId(selectedOrder.id)
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to update order line.')
    } finally {
      setIsSaving(false)
    }
  }

  async function removeOrderLine(lineId) {
    if (!selectedOrder) return

    setIsSaving(true)
    try {
      await salesService.removeSalesOrderLine(selectedOrder.id, lineId)
      toast.success('Order line removed.')
      await loadOrdersAgain()
      setSelectedOrderId(selectedOrder.id)
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to remove order line.')
    } finally {
      setIsSaving(false)
    }
  }

  async function confirmOrder() {
    if (!selectedOrder) return

    setIsSaving(true)
    try {
      await salesService.confirmSalesOrder(selectedOrder.id)
      toast.success('Sales order confirmed.')
      await loadOrdersAgain()
      setSelectedOrderId(selectedOrder.id)
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
      setHeader(emptyHeader)
      setLine(emptyLine)
      setLineDrafts({})
      setCancelReason('')
      setSalesRouteName('')
      setSalesPersonName('')
      setSelectedOrder(null)
      setSelectedOrderId('')
      await loadOrdersAgain()
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to cancel sales order.')
    } finally {
      setIsSaving(false)
    }
  }

  const selectedLine = productById[line.productId] || null
  const canAddLine =
    Boolean(
      selectedOrder &&
      selectedOrder.status === 'Draft' &&
      line.productId &&
      line.quantity &&
      lineQtyNumber > 0 &&
      (!line.isReturnLine || line.returnReason)
    )
  const activeCustomerName = customerById[selectedOrder?.customerId]?.name || selectedOrder?.customerName || selectedOrder?.customerId
  const activeRoutesName = salesRouteName || selectedOrder?.salesRouteName || selectedOrder?.salesRouteId
  const activeSalesPerson = salesPersonName || selectedOrder?.salesPersonName || selectedOrder?.salesPersonId

  return (
    <div
      className="responsive-page sales-new-order-page"
      style={{
        height: 'calc(100dvh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
          New Sales Orders
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Create draft orders, manage lines, and convert confirmed orders to invoices.
        </p>
      </div> */}

      <div className="sales-new-order-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-visible overscroll-contain pr-1 pb-4">
        {/* Create New Order horizontal form */}
        <div
          className="panel"
          style={{
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Create New Order
          </h3>
          <form
            onSubmit={createOrder}
            className="sales-new-order-form-grid"
            style={{
              display: 'grid',
              gap: 14,
              gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr) minmax(0,0.9fr) minmax(0,0.9fr) minmax(0,1fr) auto',
              alignItems: 'end',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'block', marginBottom: 4, textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: 'var(--color-text-dim)' }}>
                Customer
              </span>
              <SearchableSelect
                value={header.customerId}
                onChange={(customerId) => updateHeader('customerId', customerId)}
                options={customers}
                placeholder="Search customer"
                emptyLabel="No customers found"
                getLabel={(customer) => [customer.code, customer.name || customer.customerName].filter(Boolean).join(' - ') || customer.id || ''}
                getMeta={(customer) =>
                  [customer.primaryContactPhone, customer.phone, customer.routeName, customer.salesRouteName]
                    .filter(Boolean)
                    .join(' ')
                }
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'block', marginBottom: 4, textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: 'var(--color-text-dim)' }}>
                Sales Route
              </span>
              <input
                className="form-input"
                value={draftSalesRouteName}
                readOnly
                tabIndex={-1}
                style={{ height: 40, background: 'rgba(0,0,0,0.12)', cursor: 'not-allowed' }}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'block', marginBottom: 4, textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: 'var(--color-text-dim)' }}>
                Sales Person
              </span>
              <input
                className="form-input"
                value={draftSalesPersonName}
                readOnly
                tabIndex={-1}
                style={{ height: 40, background: 'rgba(0,0,0,0.12)', cursor: 'not-allowed' }}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'block', marginBottom: 4, textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: 'var(--color-text-dim)' }}>
                Delivery Date
              </span>
              <input
                className="form-input"
                type="date"
                value={header.deliveryDate}
                onChange={(event) => updateHeader('deliveryDate', event.target.value)}
                style={{ height: 40 }}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'block', marginBottom: 4, textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: 'var(--color-text-dim)' }}>
                Notes
              </span>
              <input
                className="form-input"
                value={header.notes}
                onChange={(event) => updateHeader('notes', event.target.value)}
                placeholder="Optional order notes"
                style={{ height: 40 }}
              />
            </div>

            <button
              className="button-primary"
              type="submit"
              disabled={isSaving || !header.customerId}
              style={{
                height: 40,
                padding: '0 16px',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              <PackagePlus className="h-4 w-4" />
              Create Draft Order
            </button>
          </form>
        </div>

      {/* Selected Order Details (Full Width) */}
      <section
        className="panel responsive-detail-panel sales-new-order-detail-panel"
          style={{
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            height: '100%',
            overflow: 'visible',
          }}
        >
          {isLoadingDetail ? (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dim)' }}>
              Loading order details...
            </div>
          ) : selectedOrder ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Product Entry
                  </h2>
                  <p style={{ marginTop: 2, fontSize: 11, color: 'var(--color-text-dim)' }}>
                    Add products to the current draft order.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <OrderStatusBadge status={selectedOrder.status} />
                </div>
              </div>

              {/* Add Product Form */}
                  {isDraft ? (
                    <div
                      className="sales-new-order-product-panel"
                      style={{
                        background: line.isReturnLine ? 'rgba(245, 158, 11, 0.08)' : 'rgba(226, 246, 252, 0.55)',
                        border: line.isReturnLine ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(186, 211, 232, 0.9)',
                        borderRadius: 8,
                        padding: 12,
                        transition: 'background 150ms ease, border-color 150ms ease',
                      }}
                    >
                      <form
                        onSubmit={addLine}
                        className="sales-new-order-product-form grid grid-cols-1 sm:grid-cols-[minmax(200px,1.6fr)_100px_100px_auto]"
                        style={{
                          gap: 12,
                          alignItems: 'end',
                        }}
                      >
                        <label className="min-w-0" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>
                              Product
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setLine((current) => ({
                                  ...current,
                                  isReturnLine: !current.isReturnLine,
                                  returnReason: '',
                                }))
                              }
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                height: 24,
                                padding: '0 8px',
                                borderRadius: 6,
                                border: line.isReturnLine
                                  ? '1px solid rgba(245, 158, 11, 0.62)'
                                  : '1px solid var(--color-border)',
                                background: line.isReturnLine
                                  ? 'rgba(245, 158, 11, 0.18)'
                                  : 'var(--color-bg-base)',
                                color: line.isReturnLine ? 'var(--color-amber)' : 'var(--color-text-muted)',
                                fontSize: 10,
                                fontWeight: 900,
                                cursor: 'pointer',
                              }}
                            >
                              <span>{line.isReturnLine ? '↩ RETURN' : '+ SALE'}</span>
                            </button>
                          </div>
                          {line.isReturnLine ? (
                            <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                              <span style={{ color: 'var(--color-amber)', fontWeight: 900 }}>
                                ↩ Return Line
                              </span>
                              <span>stock adds back to inventory on invoice</span>
                            </div>
                          ) : null}
                          <SearchableSelect
                            value={line.productId}
                            onChange={(productId) => updateLine('productId', productId)}
                            options={products}
                            placeholder="Search product"
                            emptyLabel="No products found"
                            menuPlacement="bottom"
                            getLabel={(product) => [product.sku || product.productSku || '', product.name || product.productName || ''].filter(Boolean).join(' - ') || product.id || ''}
                            getMeta={(product) =>
                              [product.barcode, product.unitCode, product.uomBase || product.baseUom, product.brandName, product.category?.name]
                                .filter(Boolean)
                                .join(' • ')
                            }
                          />
                          <StockAvailabilityHint
                            isLoading={loadingAvailability}
                            productId={line.productId}
                            availabilityData={availabilityData}
                            sellableQty={sellableQty}
                            totalAvailable={totalAvailable}
                            totalReserved={totalReserved}
                            unitCode={unitCode}
                          />
                          {line.isReturnLine ? (
                            <div style={{ marginTop: 10 }}>
                              <span style={{ display: 'block', marginBottom: 4, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>
                                Return Reason *
                              </span>
                              <select
                                className="form-input"
                                value={line.returnReason}
                                onChange={(event) => updateLine('returnReason', event.target.value)}
                                style={{
                                  height: 38,
                                  borderColor: 'rgba(245, 158, 11, 0.45)',
                                  background: 'rgba(10, 10, 16, 0.72)',
                                  color: 'var(--color-text-primary)',
                                }}
                              >
                                <option value="">Select reason...</option>
                                <option value="1">Damaged → return stock</option>
                                <option value="2">Expired → return stock</option>
                                <option value="3">Short Expiry → main stock</option>
                                <option value="4">Unwanted → main stock</option>
                              </select>
                            </div>
                          ) : null}
                        </label>

                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>
                            Qty
                          </span>
                          <input
                            className="form-input"
                            style={{ textAlign: 'right' }}
                            type="number"
                            min="0"
                            value={line.quantity}
                            onChange={(event) => updateLine('quantity', event.target.value)}
                          />
                        </label>

                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>
                            Discount %
                          </span>
                          <input
                            className="form-input"
                            style={{ textAlign: 'right' }}
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
                          disabled={isSaving || !canAddLine}
                          style={{ height: 40 }}
                        >
                          <Plus className="h-4 w-4" />
                          {line.isReturnLine ? 'Add Return' : 'Add Line'}
                        </button>
                      </form>
                    </div>
                  ) : null}

              {/* Content Grid (Order Lines Table + Totals Sidebar) */}
              <div
                className="sales-new-order-content-grid grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]"
                style={{
                  gap: 16,
                  flex: 1,
                  minHeight: 0,
                }}
              >
                {/* Order Lines Card */}
                <div
                  style={{
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-base)',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    height: '100%',
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
                    <FileText className="h-4 w-4 text-[#8ee8f0]" />
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      Order Lines
                    </h3>
                  </div>

                  {/* Table area */}
                  <div
                    className="sales-new-order-table-shell responsive-table-shell"
                    style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
                  >
                    <table className="data-table product-table-compact sales-new-order-lines-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th style={{ textAlign: 'right' }}>Qty</th>
                          <th style={{ textAlign: 'right' }}>Selling Price</th>
                          <th style={{ textAlign: 'right' }}>Disc %</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                          {isDraft ? <th style={{ textAlign: 'right' }}>Actions</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {getOrderLines(selectedOrder).length ? (
                          getOrderLines(selectedOrder).map((orderLine, index) => (
                            <LineRow
                              key={orderLine.id}
                              line={orderLine}
                              index={index}
                              product={productById[orderLine.productId]}
                              draft={lineDrafts[orderLine.id] || {}}
                              isDraft={isDraft}
                              onDraftChange={updateLineDraft}
                              onSave={updateOrderLine}
                              onRemove={removeOrderLine}
                            />
                          ))
                        ) : (
                          <tr>
                            <td colSpan={isDraft ? 6 : 5} className="px-4 py-6 text-center text-[13px] text-text-dim">
                              No order lines added yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sidebar Cards */}
                <aside className="sales-new-order-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Totals */}
                  <div
                    className="sales-new-order-actions"
                    style={{
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-elevated)',
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                      Totals
                    </h3>
                    <AmountLine label="Gross" value={gross} />
                    <AmountLine label="Discount" value={discount} />
                    <AmountLine label="VAT" value={vat} />
                    {returnCredit > 0 ? <AmountLine label="Returns Credit" value={returnCredit} negative /> : null}
                    <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
                    <AmountLine label="Net" value={net} strong />
                    <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
                    <AmountLine label="Paid" value={paid} />
                    <AmountLine label="Outstanding" value={outstanding} strong />
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-elevated)',
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {isDraft ? (
                      <button
                        type="button"
                        disabled={isSaving || !selectedOrder}
                        onClick={confirmOrder}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] bg-[#11809f] px-4 text-[13px] font-semibold text-[#08131a] transition hover:bg-[#0d748f] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer sales-new-order-confirm-button"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm Order
                      </button>
                    ) : null}

                    {selectedOrder && !['Cancelled', 'Converted'].includes(selectedOrder.status) ? (
                      <form onSubmit={cancelOrder} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          className="form-input"
                          value={cancelReason}
                          onChange={(event) => setCancelReason(event.target.value)}
                          placeholder="Cancel reason"
                        />
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] border border-border px-4 text-[13px] font-semibold text-text-primary transition hover:bg-bg-elevated disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer sales-new-order-cancel-button"
                        >
                          <XCircle className="h-4 w-4" />
                          Cancel Order
                        </button>
                      </form>
                    ) : null}
                  </div>
                </aside>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dim)', fontSize: 13 }}>
              Create a draft order on the top to begin.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

