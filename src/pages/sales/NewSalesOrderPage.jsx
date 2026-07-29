import dayjs from 'dayjs'
import { CheckCircle2, FileText, Plus, RefreshCw, Search, Trash2, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useStockAvailability } from '@/hooks/useStock'
import { masterService } from '@/services/api/masterService'
import { salesService } from '@/services/api/salesService'

const emptyHeader = {
  customerId: '',
  deliveryDate: '',
  notes: '',
}

const emptyLine = {
  productId: '',
  quantity: '1',
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
  if (!value) return '-'
  const date = dayjs(value)
  return date.isValid() ? date.format('DD MMM YYYY') : '-'
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = dayjs(value)
  return date.isValid() ? date.format('DD MMM YYYY, hh:mm A') : '-'
}

function toDateInputValue(value) {
  if (!value) return ''
  const date = dayjs(value)
  return date.isValid() ? date.format('YYYY-MM-DD') : ''
}

function toIsoDate(value) {
  if (!value) return null
  const date = dayjs(value)
  return date.isValid() ? date.startOf('day').toISOString() : null
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeStatus(status) {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function statusLabel(status) {
  return String(status || 'Draft').replace(/([a-z])([A-Z])/g, '$1 $2')
}

function statusClasses(status) {
  const normalized = normalizeStatus(status)

  if (normalized === 'cancelled' || normalized === 'canceled') {
    return 'border-[#ff7b8a]/30 bg-[#ff7b8a]/10 text-[#ff7b8a]'
  }
  if (normalized === 'converted' || normalized === 'confirmed' || normalized === 'submitted') {
    return 'border-[#8ee8f0]/30 bg-[#8ee8f0]/10 text-[#8ee8f0]'
  }
  return 'border-border bg-bg-base text-text-muted'
}

function getOrderLines(order) {
  return Array.isArray(order?.lines) ? order.lines : []
}

function getUserRoles(user) {
  const roles = Array.isArray(user?.roles)
    ? user.roles
    : user?.role
      ? [user.role]
      : user?.roleName
        ? [user.roleName]
        : user?.userRole
          ? [user.userRole]
          : []

  return roles
    .map((role) =>
      typeof role === 'string'
        ? role.trim()
        : String(
            role?.name || role?.Name || role?.roleName || role?.RoleName || role?.userRole || ''
          ).trim()
    )
    .filter(Boolean)
}

function isAdminUser(user) {
  return getUserRoles(user).some((role) => role.toLowerCase() === 'admin')
}

function getCurrentUserId(user) {
  return normalizeText(user?.id || user?.userId || user?.sub || user?.userID)
}

function canEditDraftOrder(order, user) {
  if (!order || normalizeStatus(order.status) !== 'draft') return false
  if (isAdminUser(user)) return true

  const currentUserId = getCurrentUserId(user)
  const orderOwnerId = normalizeText(order.salesPersonId || order.salesPerson?.id || order.ownerId)
  return Boolean(currentUserId && orderOwnerId && currentUserId === orderOwnerId)
}

function resolveOrderId(response) {
  if (!response) return ''
  if (typeof response === 'string') return response
  return normalizeText(
    response.id ||
      response.orderId ||
      response.salesOrderId ||
      response.value ||
      response.data?.id ||
      response.data?.value ||
      response.data?.salesOrderId ||
      ''
  )
}

function isOrderDraft(order) {
  return normalizeStatus(order?.status) === 'draft'
}

function FieldCard({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
        {label}
      </div>
      <div className="flex min-h-10 items-center rounded-[6px] border border-border bg-bg-base px-3 py-2 text-[14px] font-semibold text-text-primary">
        {value || '-'}
      </div>
    </div>
  )
}

function AmountLine({ label, value, strong = false, negative = false }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-1.5">
      <span
        className={`text-[12px] ${
          strong ? 'font-bold text-text-primary' : 'font-medium text-text-primary'
        }`}
      >
        {label}
      </span>
      <span
        className={`font-mono text-right text-[12px] ${
          strong ? 'font-extrabold text-text-primary' : 'font-semibold text-text-muted'
        } ${negative ? 'text-[#8ee8f0]' : ''}`}
      >
        {negative ? `- ${formatMoney(value)}` : formatMoney(value)}
      </span>
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
            top: 'calc(100% + 4px)',
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
            <div style={{ padding: 12, color: 'var(--color-text-muted)', fontSize: 12 }}>
              {emptyLabel}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function StockAvailabilityHint({ productId }) {
  const { data, isLoading, isError, error } = useStockAvailability(productId)

  if (!productId) return null

  const availability = data?.data ?? data ?? {}
  const sellableQty = Number(
    availability.sellable ??
      availability.sellableQuantity ??
      availability.availableQuantity ??
      availability.availableQty ??
      availability.quantityAvailable ??
      availability.totalAvailable ??
      availability.qty ??
      0
  )
  const totalAvailable = Number(
    availability.totalAvailable ?? availability.availableQuantity ?? sellableQty
  )
  const totalReserved = Number(availability.totalReserved ?? availability.reservedQuantity ?? 0)
  const unitCode =
    availability.smallestUnitCode ||
    availability.unitCode ||
    availability.uomCode ||
    availability.baseUomCode ||
    availability.unit ||
    ''

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

      {!isLoading && isError ? (
        <span
          title={error?.message || 'Unable to check stock'}
          style={{ color: 'var(--color-danger)', fontWeight: 700 }}
        >
          Unable to check stock
        </span>
      ) : null}

      {!isLoading && !isError ? (
        sellableQty > 0 ? (
          <span
            title={`Total available: ${totalAvailable.toLocaleString('en-LK')}${unitCode ? ` ${unitCode}` : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 6,
              color: 'var(--color-text-primary)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: 'var(--color-teal)',
                boxShadow: '0 0 0 3px rgba(142, 232, 240, 0.16)',
                flexShrink: 0,
              }}
            />
            <strong
              className="mono"
              style={{ color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 900 }}
            >
              {sellableQty.toLocaleString('en-LK')}
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
                }}
              >
                {unitCode}
              </span>
            ) : null}
            <span>sellable</span>
            {totalReserved > 0 ? (
              <span style={{ color: 'var(--color-text-dim)' }}>
                ({totalReserved.toLocaleString('en-LK')} reserved)
              </span>
            ) : null}
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--color-danger)',
              fontWeight: 800,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: 'var(--color-danger)',
                boxShadow: '0 0 0 3px rgba(255, 100, 116, 0.16)',
              }}
            />
            Out of stock
          </span>
        )
      ) : null}
    </div>
  )
}

function LineRow({ line, index, product, draft, canEdit, onDraftChange, onSave, onRemove }) {
  const itemName =
    product?.name ||
    product?.productName ||
    line?.productName ||
    line?.productCode ||
    product?.sku ||
    line?.productSku ||
    `Line ${index + 1}`
  const itemCode = product?.sku || line?.productCode || line?.productId || '-'
  const unit = line?.smallestUnitCode || product?.smallestUnitName || product?.uomBase || '-'
  const lineTotal =
    line?.lineTotal > 0
      ? line.lineTotal
      : Number(line?.quantity || 0) *
        Number(line?.unitPrice || 0) *
        (1 - Number(line?.discountPercent || 0) / 100)
  const draftQuantity = draft?.quantity ?? String(line?.quantity ?? '')
  const draftDiscount = draft?.discountPercent ?? String(line?.discountPercent ?? '0')

  return (
    <tr className="sales-new-order-line-row hover:bg-bg-elevated/40">
      <td data-label="Item">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <span className="product-sku-badge mono">{itemCode}</span>
          <span
            className="product-info-sub"
            style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}
          >
            {itemName}
          </span>
        </div>
      </td>
      <td className="mono text-right" data-label="Qty">
        {canEdit ? (
          <input
            className="sales-new-order-line-input"
            style={{
              height: 32,
              width: 82,
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
            value={draftQuantity}
            onChange={(event) => onDraftChange(line.id, 'quantity', event.target.value)}
          />
        ) : (
          <>
            {Number(line.quantity || 0).toLocaleString('en-LK')}{' '}
            <span className="text-[11px] font-medium text-text-dim">{unit}</span>
          </>
        )}
      </td>
      <td className="mono text-right" data-label="Selling Price">
        {formatMoney(line.unitPrice)}
      </td>
      <td className="mono text-right" data-label="Disc %">
        {canEdit ? (
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
            value={draftDiscount}
            onChange={(event) => onDraftChange(line.id, 'discountPercent', event.target.value)}
          />
        ) : (
          `${Number(line.discountPercent || 0).toLocaleString('en-LK')}%`
        )}
      </td>
      <td className="mono text-right font-semibold" data-label="Total">
        {formatMoney(lineTotal)}
      </td>
      {canEdit ? (
        <td className="text-right" data-label="Actions">
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
            className="sales-new-order-line-remove"
            style={{
              height: 28,
              width: 32,
              borderRadius: 4,
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-elevated)',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
            aria-label="Remove line"
          >
            <Trash2 size={14} />
          </button>
        </td>
      ) : null}
    </tr>
  )
}

export default function NewSalesOrderPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const orderIdParam = searchParams.get('orderId')
  const sessionUser = useAuthStore((state) => state.user)

  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [header, setHeader] = useState(emptyHeader)
  const [line, setLine] = useState(emptyLine)
  const [lineDrafts, setLineDrafts] = useState({})
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isCreatingDraft, setIsCreatingDraft] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [salesRouteName, setSalesRouteName] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  const currentDraftOrderIdRef = useRef('')
  const draftCreationPromiseRef = useRef(null)
  const autoCreateTimerRef = useRef(null)
  const isMountedRef = useRef(true)

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

  const selectedCustomer = customerById[header.customerId] || null
  const selectedCustomerRouteName =
    salesRouteName ||
    selectedCustomer?.salesRouteName ||
    selectedCustomer?.routeName ||
    selectedOrder?.salesRouteName ||
    selectedOrder?.routeName ||
    ''
  const selectedOrderLines = getOrderLines(selectedOrder)
  const canEditCurrentDraft =
    !selectedOrder || (isOrderDraft(selectedOrder) && canEditDraftOrder(selectedOrder, sessionUser))
  const currentUserLabel =
    sessionUser?.username || sessionUser?.email || sessionUser?.employeeCode || 'your account'

  const gross = selectedOrderLines.reduce(
    (sum, orderLine) => sum + Number(orderLine.quantity || 0) * Number(orderLine.unitPrice || 0),
    0
  )
  const discount = selectedOrderLines.reduce(
    (sum, orderLine) =>
      sum +
      Number(orderLine.quantity || 0) *
        Number(orderLine.unitPrice || 0) *
        (Number(orderLine.discountPercent || 0) / 100),
    0
  )
  const vat = Number(selectedOrder?.vatAmount || 0)
  const net = Number(selectedOrder?.netAmount || gross - discount + vat)
  const paid = Number(selectedOrder?.paidAmount || 0)
  const outstanding = Number(selectedOrder?.outstandingAmount || net - paid)

  useEffect(() => {
    isMountedRef.current = true

    async function loadInitialData() {
      setIsLoadingInitialData(true)
      try {
        const [customerList, productList] = await Promise.all([
          salesService.listAllCustomers({ pageSize: 100, isActive: true }),
          masterService.listAllProducts({ page: 1, pageSize: 200, isActive: true }),
        ])

        if (!isMountedRef.current) return
        setCustomers(Array.isArray(customerList) ? customerList : [])
        setProducts(Array.isArray(productList) ? productList : [])
      } catch (error) {
        if (!isMountedRef.current) return
        toast.error(error.message || 'Unable to load sales order data.')
      } finally {
        if (isMountedRef.current) setIsLoadingInitialData(false)
      }
    }

    loadInitialData()

    return () => {
      isMountedRef.current = false
      if (autoCreateTimerRef.current) {
        clearTimeout(autoCreateTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!orderIdParam) {
      currentDraftOrderIdRef.current = ''
      draftCreationPromiseRef.current = null
      setSelectedOrder(null)
      setHeader(emptyHeader)
      setLine(emptyLine)
      setLineDrafts({})
      setSalesRouteName('')
      setCancelReason('')
      setDetailError('')
      return
    }

    let isCurrent = true

    async function loadDraft() {
      setIsLoadingDetail(true)
      setDetailError('')

      try {
        const order = await salesService.getSalesOrder(orderIdParam)
        if (!isCurrent) return

        if (!order) {
          toast.error('Draft not found.')
          setDetailError('Draft not found.')
          setSelectedOrder(null)
          return
        }

        if (!isOrderDraft(order)) {
          toast.error('This order is no longer Draft.')
          setDetailError('This order is no longer Draft.')
          setSelectedOrder(order)
          return
        }

        if (!canEditDraftOrder(order, sessionUser)) {
          toast.error('You are not allowed to edit this draft.')
          setDetailError('You are not allowed to edit this draft.')
          setSelectedOrder(order)
          return
        }

        currentDraftOrderIdRef.current = order.id
        setSelectedOrder(order)
        setHeader({
          customerId: order.customerId || '',
          deliveryDate: toDateInputValue(order.deliveryDate),
          notes: order.notes || '',
        })
        setLineDrafts(
          Object.fromEntries(
            getOrderLines(order).map((orderLine) => [
              orderLine.id,
              {
                quantity: String(orderLine.quantity ?? ''),
                discountPercent: String(orderLine.discountPercent ?? '0'),
              },
            ])
          )
        )
        setSalesRouteName(
          customerById[order.customerId]?.salesRouteName ||
            customerById[order.customerId]?.routeName ||
            order.salesRouteName ||
            order.routeName ||
            ''
        )
        setCancelReason('')
      } catch (error) {
        if (!isCurrent) return
        toast.error(error.message || 'Unable to load draft order.')
        setDetailError(error.message || 'Unable to load draft order.')
        setSelectedOrder(null)
      } finally {
        if (isCurrent) setIsLoadingDetail(false)
      }
    }

    loadDraft()

    return () => {
      isCurrent = false
    }
  }, [orderIdParam, customerById, sessionUser])

  useEffect(() => {
    if (orderIdParam) return undefined
    if (!header.customerId || !header.deliveryDate) return undefined
    if (currentDraftOrderIdRef.current || draftCreationPromiseRef.current) return undefined

    autoCreateTimerRef.current = setTimeout(() => {
      if (currentDraftOrderIdRef.current || draftCreationPromiseRef.current) return

      const promise = (async () => {
        setIsCreatingDraft(true)
        try {
          const created = await salesService.createSalesOrder({
            customerId: header.customerId,
            deliveryDate: toIsoDate(header.deliveryDate),
            notes: normalizeText(header.notes) || null,
          })

          const draftOrderId = resolveOrderId(created)
          if (!draftOrderId) {
            throw new Error('Draft creation failed.')
          }

          currentDraftOrderIdRef.current = draftOrderId
          const order = await salesService.getSalesOrder(draftOrderId)
          if (!isMountedRef.current) return

          setSelectedOrder(order)
          setLineDrafts(
            Object.fromEntries(
              getOrderLines(order).map((orderLine) => [
                orderLine.id,
                {
                  quantity: String(orderLine.quantity ?? ''),
                  discountPercent: String(orderLine.discountPercent ?? '0'),
                },
              ])
            )
          )
          setSalesRouteName(
            customerById[order.customerId]?.salesRouteName ||
              customerById[order.customerId]?.routeName ||
              order.salesRouteName ||
              order.routeName ||
              ''
          )
          setCancelReason('')
        } catch (error) {
          toast.error(error.message || 'Draft creation failed.')
        } finally {
          if (isMountedRef.current) setIsCreatingDraft(false)
          draftCreationPromiseRef.current = null
        }
      })()

      draftCreationPromiseRef.current = promise
    }, 450)

    return () => {
      if (autoCreateTimerRef.current) {
        clearTimeout(autoCreateTimerRef.current)
      }
    }
  }, [orderIdParam, header.customerId, header.deliveryDate, header.notes, customerById])

  useEffect(() => {
    let isCurrent = true

    async function loadSalesRouteName() {
      const routeId = selectedCustomer?.salesRouteId || selectedOrder?.salesRouteId || ''

      if (selectedCustomer?.salesRouteName) {
        setSalesRouteName(selectedCustomer.salesRouteName)
        return
      }

      if (selectedCustomer?.routeName) {
        setSalesRouteName(selectedCustomer.routeName)
        return
      }

      if (!routeId) {
        setSalesRouteName('')
        return
      }

      try {
        const route = await masterService.getSalesRoute(routeId)
        if (!isCurrent) return

        setSalesRouteName(
          route?.name || route?.routeName || route?.salesRouteName || route?.code || ''
        )
      } catch {
        if (isCurrent) {
          setSalesRouteName('')
        }
      }
    }

    void loadSalesRouteName()

    return () => {
      isCurrent = false
    }
  }, [
    selectedCustomer?.salesRouteId,
    selectedCustomer?.salesRouteName,
    selectedCustomer?.routeName,
    selectedOrder?.salesRouteId,
    selectedOrder?.salesRouteName,
    selectedOrder?.routeName,
  ])

  function updateHeader(field, value) {
    setHeader((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateLine(field, value) {
    setLine((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateLineDraft(lineId, field, value) {
    setLineDrafts((current) => ({
      ...current,
      [lineId]: {
        ...(current[lineId] || {}),
        [field]: value,
      },
    }))
  }

  function resetLineForm() {
    setLine({ ...emptyLine })
  }

  function resetNewOrderForm() {
    if (autoCreateTimerRef.current) {
      clearTimeout(autoCreateTimerRef.current)
      autoCreateTimerRef.current = null
    }

    currentDraftOrderIdRef.current = ''
    draftCreationPromiseRef.current = null
    setSelectedOrder(null)
    setHeader({ ...emptyHeader })
    setLine({ ...emptyLine })
    setLineDrafts({})
    setSalesRouteName('')
    setCancelReason('')
    setDetailError('')
    setIsCreatingDraft(false)
    setIsSaving(false)
    setSearchParams({}, { replace: true })
  }

  async function reloadOrder(orderId) {
    const order = await salesService.getSalesOrder(orderId)
    if (!isMountedRef.current) return order

    setSelectedOrder(order)
    setLineDrafts(
      Object.fromEntries(
        getOrderLines(order).map((orderLine) => [
          orderLine.id,
          {
            quantity: String(orderLine.quantity ?? ''),
            discountPercent: String(orderLine.discountPercent ?? '0'),
          },
        ])
      )
    )
    setSalesRouteName(
      customerById[order.customerId]?.salesRouteName ||
        customerById[order.customerId]?.routeName ||
        order.salesRouteName ||
        order.routeName ||
        ''
    )
    return order
  }

  async function ensureDraftOrder() {
    if (currentDraftOrderIdRef.current) {
      return selectedOrder?.id === currentDraftOrderIdRef.current
        ? selectedOrder
        : reloadOrder(currentDraftOrderIdRef.current)
    }

    if (!header.customerId) {
      toast.error('Customer is required.')
      return null
    }

    if (!header.deliveryDate) {
      toast.error('Delivery Date is required.')
      return null
    }

    if (draftCreationPromiseRef.current) {
      return draftCreationPromiseRef.current
    }

    const promise = (async () => {
      setIsCreatingDraft(true)
      try {
        const created = await salesService.createSalesOrder({
          customerId: header.customerId,
          deliveryDate: toIsoDate(header.deliveryDate),
          notes: normalizeText(header.notes) || null,
        })

        const draftOrderId = resolveOrderId(created)
        if (!draftOrderId) {
          throw new Error('Draft creation failed.')
        }

        currentDraftOrderIdRef.current = draftOrderId
        return await reloadOrder(draftOrderId)
      } catch (error) {
        toast.error(error.message || 'Draft creation failed.')
        throw error
      } finally {
        if (isMountedRef.current) {
          setIsCreatingDraft(false)
        }
        draftCreationPromiseRef.current = null
      }
    })()

    draftCreationPromiseRef.current = promise
    return promise
  }

  function validateLineInput() {
    if (!line.productId) {
      toast.error('Product is required.')
      return false
    }

    if (Number(line.quantity || 0) <= 0) {
      toast.error('Quantity must be greater than zero.')
      return false
    }

    const discountPercent = Number(line.discountPercent || 0)
    if (discountPercent < 0 || discountPercent > 10) {
      toast.error('Discount percent must be between 0 and 10.')
      return false
    }

    if (line.isReturnLine && !normalizeText(line.returnReason)) {
      toast.error('Return reason is required.')
      return false
    }

    return true
  }

  async function addLine(event) {
    event.preventDefault()
    if (!canEditCurrentDraft) {
      toast.error('This draft cannot be edited.')
      return
    }

    if (!validateLineInput()) return

    try {
      setIsSaving(true)
      const draftOrder = await ensureDraftOrder()
      if (!draftOrder) return

      await salesService.addSalesOrderLine(draftOrder.id, {
        productId: line.productId,
        quantity: Number(line.quantity),
        discountPercent: Number(line.discountPercent || 0),
      })

      await reloadOrder(draftOrder.id)
      resetLineForm()
      toast.success('Line added.')
    } catch (error) {
      toast.error(error.message || 'Unable to add order line.')
    } finally {
      setIsSaving(false)
    }
  }

  async function saveLine(lineId) {
    const draftOrder = selectedOrder
    if (!draftOrder) return
    if (!canEditCurrentDraft) {
      toast.error('This draft cannot be edited.')
      return
    }

    const draft = lineDrafts[lineId] || {}
    const quantity = Number(draft.quantity || 0)
    const discountPercent = Number(draft.discountPercent || 0)

    if (quantity <= 0) {
      toast.error('Quantity must be greater than zero.')
      return
    }

    if (discountPercent < 0 || discountPercent > 10) {
      toast.error('Discount percent must be between 0 and 10.')
      return
    }

    try {
      setIsSaving(true)
      await salesService.updateSalesOrderLine(draftOrder.id, lineId, {
        quantity,
        discountPercent,
      })
      await reloadOrder(draftOrder.id)
      toast.success('Line saved.')
    } catch (error) {
      toast.error(error.message || 'Unable to update order line.')
    } finally {
      setIsSaving(false)
    }
  }

  async function removeLine(lineId) {
    const draftOrder = selectedOrder
    if (!draftOrder) return
    if (!canEditCurrentDraft) {
      toast.error('This draft cannot be edited.')
      return
    }

    try {
      setIsSaving(true)
      await salesService.removeSalesOrderLine(draftOrder.id, lineId)
      await reloadOrder(draftOrder.id)
      toast.success('Line removed.')
    } catch (error) {
      toast.error(error.message || 'Unable to remove order line.')
    } finally {
      setIsSaving(false)
    }
  }

  async function savePendingLineEdits(orderId) {
    const lines = getOrderLines(selectedOrder)
    const dirtyLines = lines.filter((orderLine) => {
      const draft = lineDrafts[orderLine.id]
      if (!draft) return false
      return (
        String(draft.quantity ?? '').trim() !== String(orderLine.quantity ?? '') ||
        String(draft.discountPercent ?? '').trim() !== String(orderLine.discountPercent ?? '0')
      )
    })

    for (const orderLine of dirtyLines) {
      const draft = lineDrafts[orderLine.id]
      const quantity = Number(draft.quantity || 0)
      const discountPercent = Number(draft.discountPercent || 0)

      if (quantity <= 0) {
        throw new Error('Quantity must be greater than zero.')
      }

      if (discountPercent < 0 || discountPercent > 10) {
        throw new Error('Discount percent must be between 0 and 10.')
      }

      await salesService.updateSalesOrderLine(orderId, orderLine.id, {
        quantity,
        discountPercent,
      })
    }
  }

  async function confirmOrder() {
    if (!canEditCurrentDraft) {
      toast.error('This draft cannot be edited.')
      return
    }

    if (!header.customerId) {
      toast.error('Customer is required.')
      return
    }

    if (!header.deliveryDate) {
      toast.error('Delivery Date is required.')
      return
    }

    try {
      setIsConfirming(true)
      const draftOrder = await ensureDraftOrder()
      if (!draftOrder) return

      await savePendingLineEdits(draftOrder.id)

      const latestOrder = await reloadOrder(draftOrder.id)
      if (!getOrderLines(latestOrder).length) {
        toast.error('No order lines to confirm.')
        return
      }

      await salesService.confirmSalesOrder(draftOrder.id)
      toast.success('Sales order confirmed.')
      resetNewOrderForm()
      navigate('/sales/orders', { replace: true })
    } catch (error) {
      toast.error(error.message || 'Unable to confirm sales order.')
    } finally {
      setIsConfirming(false)
    }
  }

  async function cancelOrder(event) {
    event.preventDefault()
    if (!selectedOrder) return
    if (!canEditCurrentDraft) {
      toast.error('This draft cannot be edited.')
      return
    }

    const reason = normalizeText(cancelReason) || 'Cancelled by user'

    try {
      setIsSaving(true)
      await salesService.cancelSalesOrder(selectedOrder.id, reason)
      toast.success('Sales order cancelled.')
      resetNewOrderForm()
      navigate('/sales/orders/my-orders', { replace: true })
    } catch (error) {
      toast.error(error.message || 'Unable to cancel sales order.')
    } finally {
      setIsSaving(false)
    }
  }

  const pageSubtitle = orderIdParam
    ? `Editing draft order for ${currentUserLabel}.`
    : 'Start a new draft order, add lines, and confirm when ready.'

  const orderStatus = selectedOrder?.status || 'Draft'

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
            }}
          >
            Product Entry
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            {pageSubtitle}
          </p>
        </div>
        <OrderStatusBadge status={orderStatus} />
      </div>

      <section
        className="panel"
        style={{
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-[6px] border border-border bg-bg-base px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-text-muted">
            Product
          </span>
          <span className="inline-flex items-center rounded-[6px] border border-border bg-bg-base px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-text-muted">
            + Sale
          </span>
        </div> */}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(180px,220px)_minmax(180px,220px)]">
          <label className="min-w-0">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
              Customer
            </div>
            <SearchableSelect
              value={header.customerId}
              onChange={(customerId) => updateHeader('customerId', customerId)}
              options={customers}
              placeholder="Search customer"
              emptyLabel="No customers found"
              getLabel={(customer) => customer.name || customer.code || ''}
              getMeta={(customer) => customer.salesRouteName || ''}
            />
          </label>

          <label>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
              Sales Route
            </div>
            <input
              className="form-input"
              value={selectedCustomerRouteName}
              readOnly
              placeholder="Auto-filled from customer"
              style={{ height: 38 }}
            />
          </label>

          <label>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
              Delivery Date
            </div>
            <input
              className="form-input"
              type="date"
              value={header.deliveryDate}
              onChange={(event) => updateHeader('deliveryDate', event.target.value)}
              disabled={Boolean(selectedOrder)}
              style={{ height: 38 }}
            />
          </label>
        </div>

        <label>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
            Notes
          </div>
          <textarea
            className="form-input"
            value={header.notes}
            onChange={(event) => updateHeader('notes', event.target.value)}
            rows={2}
            disabled={Boolean(selectedOrder)}
            placeholder="Optional note"
            style={{ minHeight: 44, resize: 'vertical' }}
          />
        </label>

        {selectedOrder ? (
          <div className="text-[12px] text-text-muted">
            Draft header is locked after creation because the reference sales backend exposes line,
            confirm, and cancel actions only.
          </div>
        ) : null}
      </section>

      <div
        className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]"
        style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
      >
        <section
          className="panel"
          style={{
            padding: 0,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* <div
            className="border-b border-border px-4 py-3"
            style={{ background: 'var(--color-bg-surface)' }}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#8ee8f0]" />
              <h3 className="text-[12px] font-bold text-text-primary">Order Lines</h3>
            </div>
          </div> */}

          <div className="flex-1 overflow-hidden">
            {isLoadingDetail ? (
              <div className="grid h-full place-items-center p-6 text-[13px] text-text-muted">
                Loading draft order...
              </div>
            ) : detailError ? (
              <div className="grid h-full place-items-center p-6 text-center text-[13px] text-text-muted">
                <div className="max-w-[320px]">
                  <div className="mb-2 text-[14px] font-semibold text-text-primary">
                    {detailError}
                  </div>
                  <div>Open a valid draft order from My Orders or create a new one.</div>
                </div>
              </div>
            ) : (
              <div
                className="sales-new-order-content-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1fr)',
                  gap: 16,
                  padding: 16,
                  minHeight: 0,
                }}
              >
                <div
                  className="sales-new-order-product-panel"
                  style={{
                    background: 'rgba(226, 246, 252, 0.55)',
                    border: '1px solid rgba(186, 211, 232, 0.9)',
                    borderRadius: 8,
                    padding: 12,
                    width: '100%',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    overflow: 'visible',
                  }}
                >
                  <form
                    onSubmit={addLine}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(200px,1.6fr)_100px_100px_auto]"
                    style={{ alignItems: 'end' }}
                  >
                    <label className="min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
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
                          className="inline-flex h-6 items-center gap-1 rounded-[6px] border px-2 text-[10px] font-bold uppercase tracking-[0.08em]"
                          style={{
                            borderColor: line.isReturnLine
                              ? 'rgba(245, 158, 11, 0.62)'
                              : 'var(--color-border)',
                            background: line.isReturnLine
                              ? 'rgba(245, 158, 11, 0.18)'
                              : 'var(--color-bg-base)',
                            color: line.isReturnLine
                              ? 'var(--color-amber)'
                              : 'var(--color-text-muted)',
                          }}
                        >
                          <span>{line.isReturnLine ? 'Return' : '+ Sale'}</span>
                        </button>
                      </div>
                      <SearchableSelect
                        value={line.productId}
                        onChange={(productId) => updateLine('productId', productId)}
                        options={products}
                        placeholder="Search product"
                        emptyLabel="No products found"
                        getLabel={(product) =>
                          [
                            product.sku || product.productSku || '',
                            product.name || product.productName || '',
                          ]
                            .filter(Boolean)
                            .join(' - ')
                        }
                        getMeta={(product) =>
                          [
                            product.barcode,
                            product.uomBase || product.baseUom,
                            product.category?.name,
                          ]
                            .filter(Boolean)
                            .join(' • ')
                        }
                      />
                      <StockAvailabilityHint productId={line.productId} />
                      {line.isReturnLine ? (
                        <div style={{ marginTop: 10 }}>
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
                            Return Reason *
                          </div>
                          <select
                            className="form-input"
                            value={line.returnReason}
                            onChange={(event) => updateLine('returnReason', event.target.value)}
                            style={{ height: 38 }}
                          >
                            <option value="">Select reason...</option>
                            <option value="Damaged">Damaged</option>
                            <option value="Expired">Expired</option>
                            <option value="Short Expiry">Short Expiry</option>
                            <option value="Unwanted">Unwanted</option>
                          </select>
                        </div>
                      ) : null}
                    </label>

                    <label>
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
                        Qty
                      </div>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        value={line.quantity}
                        onChange={(event) => updateLine('quantity', event.target.value)}
                        style={{ textAlign: 'right', height: 38 }}
                      />
                    </label>

                    <label>
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
                        Discount %
                      </div>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        max="10"
                        value={line.discountPercent}
                        onChange={(event) => updateLine('discountPercent', event.target.value)}
                        style={{ textAlign: 'right', height: 38 }}
                      />
                    </label>

                    <button
                      className="button-primary"
                      type="submit"
                      disabled={
                        isSaving || isCreatingDraft || isLoadingInitialData || !canEditCurrentDraft
                      }
                      style={{ height: 40 }}
                    >
                      <Plus className="h-4 w-4" />
                      {line.isReturnLine ? 'Add Return' : 'Add Line'}
                    </button>
                  </form>
                </div>

                <div
                  style={{
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-base)',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    minWidth: 0,
                    maxWidth: '100%',
                    minHeight: 420,
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
                    <h3
                      style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}
                    >
                      Order Lines
                    </h3>
                  </div>

                  <div
                    className="sales-new-order-table-shell responsive-table-shell"
                    style={{
                      flex: 1,
                      overflowX: 'auto',
                      overflowY: 'auto',
                      minHeight: 320,
                      maxHeight: 520,
                    }}
                  >
                    <table
                      className="data-table product-table-compact sales-new-order-lines-table"
                      style={{ minWidth: 760 }}
                    >
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th style={{ textAlign: 'right' }}>Qty</th>
                          <th style={{ textAlign: 'right' }}>Selling Price</th>
                          <th style={{ textAlign: 'right' }}>Disc %</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                          {canEditCurrentDraft ? (
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrderLines.length ? (
                          selectedOrderLines.map((orderLine, index) => (
                            <LineRow
                              key={orderLine.id}
                              line={orderLine}
                              index={index}
                              product={productById[orderLine.productId]}
                              draft={lineDrafts[orderLine.id] || {}}
                              canEdit={canEditCurrentDraft}
                              onDraftChange={updateLineDraft}
                              onSave={saveLine}
                              onRemove={removeLine}
                            />
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={canEditCurrentDraft ? 6 : 5}
                              className="px-4 py-6 text-center text-[13px] text-text-dim"
                            >
                              No order lines added yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside
          className="sales-new-order-sidebar"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minWidth: 0,
            maxWidth: '100%',
          }}
        >
          <div
            className="panel"
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
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Totals
            </h3>
            <AmountLine label="Gross" value={gross} />
            <AmountLine label="Discount" value={discount} />
            <AmountLine label="VAT" value={vat} />
            <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
            <AmountLine label="Net" value={net} strong />
            <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
            <AmountLine label="Paid" value={paid} />
            <AmountLine label="Outstanding" value={outstanding} strong />
          </div>

          <div
            className="panel"
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
            {selectedOrder && canEditCurrentDraft ? (
              <button
                type="button"
                disabled={isSaving || isCreatingDraft || isConfirming}
                onClick={confirmOrder}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] bg-[#11809f] px-4 text-[13px] font-semibold text-[#08131a] transition hover:bg-[#0d748f] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm Order
              </button>
            ) : selectedOrder ? (
              <div
                style={{
                  borderRadius: 8,
                  border: '1px dashed var(--color-border)',
                  padding: 12,
                  color: 'var(--color-text-muted)',
                  fontSize: 12,
                }}
              >
                This draft cannot be edited by the current user.
              </div>
            ) : null}

            {selectedOrder && canEditCurrentDraft ? (
              <form
                onSubmit={cancelOrder}
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <input
                  className="form-input"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Cancel reason"
                />
                <button
                  type="submit"
                  disabled={isSaving || isConfirming}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] border border-border px-4 text-[13px] font-semibold text-text-primary transition hover:bg-bg-elevated disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Order
                </button>
              </form>
            ) : null}

            {!selectedOrder ? (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Select a customer and delivery date to auto-create a draft when you start adding
                lines.
              </div>
            ) : null}
          </div>

          <div
            className="panel"
            style={{
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-elevated)',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <FieldCard
              label="Customer"
              value={selectedOrder?.customerName || selectedCustomer?.name || header.customerId}
            />
            <FieldCard label="Sales Route" value={selectedCustomerRouteName} />
            <FieldCard label="Delivery Date" value={formatDate(header.deliveryDate)} />
            <FieldCard label="Notes" value={normalizeText(header.notes) || '-'} />
            <FieldCard label="Status" value={statusLabel(orderStatus)} />
            <FieldCard label="Order Date" value={formatDateTime(selectedOrder?.orderDate)} />
          </div>
        </aside>
      </div>
    </div>
  )
}
