import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  Pencil,
  RefreshCw,
  Search,
  ShoppingBag,
  UserCircle2,
} from 'lucide-react'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SimplePagination from '@components/ui/SimplePagination'
import StatusBadge from '@components/ui/StatusBadge'
import { useAuthStore } from '@stores/authStore'
import { masterService } from '@/services/api/masterService'
import { salesService } from '@/services/api/salesService'
import { usersService } from '@/services/api/usersService'

const pageSize = 8

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

function statusLabel(status) {
  return String(status || 'Draft')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[\s-]+/g, ' ')
}

function getOrderStatusTone(status) {
  const value = statusLabel(status).toLowerCase()
  if (value.includes('cancel') || value.includes('reject')) {
    return {
      border: 'rgba(244, 63, 94, 0.28)',
      bg: 'rgba(244, 63, 94, 0.08)',
      text: 'var(--color-danger)',
    }
  }
  if (value.includes('draft')) {
    return {
      border: 'rgba(148, 163, 184, 0.26)',
      bg: 'rgba(148, 163, 184, 0.08)',
      text: 'var(--color-text-muted)',
    }
  }
  if (value.includes('confirm') || value.includes('approved') || value.includes('active')) {
    return {
      border: 'rgba(32, 212, 191, 0.28)',
      bg: 'rgba(32, 212, 191, 0.10)',
      text: 'var(--color-teal)',
    }
  }
  return {
    border: 'rgba(102, 181, 250, 0.26)',
    bg: 'rgba(102, 181, 250, 0.10)',
    text: 'var(--color-blue)',
  }
}

function getOrderLines(order) {
  return Array.isArray(order?.lines) ? order.lines : []
}

function getOrderDate(order) {
  return order?.orderDate || order?.createdAt || order?.date || order?.submittedAt || ''
}

function getOrderCustomer(order) {
  return order?.customerName || order?.customerCode || order?.customerId || '-'
}

function normalizeText(value) {
  return String(value ?? '').trim()
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
  if (
    !order ||
    String(order.status || '')
      .trim()
      .toLowerCase() !== 'draft'
  )
    return false
  if (isAdminUser(user)) return true

  const currentUserId = getCurrentUserId(user)
  const orderOwnerId = normalizeText(order.salesPersonId || order.salesPerson?.id || order.ownerId)
  return Boolean(currentUserId && orderOwnerId && currentUserId === orderOwnerId)
}

function DetailField({ label, value }) {
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

function SummaryPill({ icon: Icon, label, value, tone = 'default' }) {
  const toneClasses =
    tone === 'accent'
      ? 'border-[#8ee8f0]/20 bg-[#8ee8f0]/10 text-[#8ee8f0]'
      : tone === 'warning'
        ? 'border-[#f59e0b]/20 bg-[#f59e0b]/10 text-[#f59e0b]'
        : 'border-border bg-bg-base text-text-muted'

  return (
    <div
      className={`flex min-w-0 items-center gap-3 rounded-[10px] border px-3 py-2 ${toneClasses}`}
    >
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-bg-elevated text-text-primary">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">
          {label}
        </div>
        <div className="truncate text-[13px] font-bold text-text-primary">{value}</div>
      </div>
    </div>
  )
}

function OrderCard({ order, isSelected, onSelect }) {
  const date = formatDate(getOrderDate(order))
  const statusTone = getOrderStatusTone(order.status)

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative w-full overflow-hidden rounded-[14px] border text-left"
      style={{
        margin: '0 1px',
        padding: '6px 9px 7px',
        minHeight: 80,
        borderColor: isSelected ? 'rgba(142, 232, 240, 0.55)' : 'rgba(164, 190, 255, 0.55)',
        background: isSelected
          ? 'linear-gradient(180deg, rgba(142, 232, 240, 0.15) 0%, rgba(142, 232, 240, 0.08) 100%)'
          : 'linear-gradient(180deg, rgba(235, 243, 255, 0.96) 0%, rgba(226, 236, 255, 0.74) 100%)',
        boxShadow: isSelected
          ? '0 0 0 1px rgba(142, 232, 240, 0.18) inset, 0 10px 20px rgba(142, 232, 240, 0.07)'
          : '0 1px 0 rgba(255,255,255,0.72) inset',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mono truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-[#72e6f3]">
            {order.orderNumber || 'Order'}
          </div>
          <div className="mt-0.5 truncate text-[14px] font-bold leading-tight text-text-primary">
            {getOrderCustomer(order)}
          </div>
        </div>
        <ChevronRight
          size={16}
          className="shrink-0 self-start"
          style={{
            marginTop: 1,
            color: isSelected ? 'var(--color-teal)' : 'rgba(95, 116, 160, 0.9)',
          }}
        />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center rounded-[999px] border px-2 py-[2px] text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{
            borderColor: statusTone.border,
            background: statusTone.bg,
            color: statusTone.text,
          }}
        >
          {statusLabel(order.status)}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-dim">
          <CalendarDays size={11} />
          {date}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 border-t border-[rgba(164,190,255,0.38)] pt-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f7098]">
          Net Amount
        </span>
        <span className="mono text-[13px] font-bold text-text-primary">
          {formatMoney(order.netAmount)}
        </span>
      </div>
    </button>
  )
}

export default function MyOrdersPage() {
  const navigate = useNavigate()
  const sessionUser = useAuthStore((state) => state.user)
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [error, setError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [products, setProducts] = useState([])
  const [salesRouteName, setSalesRouteName] = useState('')
  const [salesPersonName, setSalesPersonName] = useState('')

  const productById = useMemo(() => {
    return products.reduce((map, product) => {
      map[product.id] = product
      return map
    }, {})
  }, [products])

  const scopedOrders = useMemo(() => {
    const currentUserId = getCurrentUserId(sessionUser)
    if (!currentUserId) return orders

    return orders.filter((order) => {
      const orderOwnerId = normalizeText(
        order.salesPersonId || order.salesPerson?.id || order.ownerId
      )
      return orderOwnerId ? orderOwnerId === currentUserId : true
    })
  }, [orders, sessionUser])

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()

    return scopedOrders
      .filter((order) => {
        if (!query) return true
        const haystack = [
          order?.orderNumber,
          getOrderCustomer(order),
          statusLabel(order?.status),
          getOrderDate(order),
          order?.id,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return haystack.includes(query)
      })
      .sort((a, b) => new Date(getOrderDate(b)) - new Date(getOrderDate(a)))
  }, [scopedOrders, search])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize))
  const pagedOrders = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredOrders.slice(start, start + pageSize)
  }, [filteredOrders, page])

  useEffect(() => {
    let isCurrent = true

    async function loadOrders() {
      setIsLoading(true)
      setError('')

      try {
        const result = await salesService.listMySalesOrders()
        if (!isCurrent) return

        const list = Array.isArray(result) ? result : result?.items || result?.data || []
        setOrders([...list].sort((a, b) => new Date(getOrderDate(b)) - new Date(getOrderDate(a))))
      } catch (requestError) {
        if (!isCurrent) return
        setOrders([])
        setError(requestError.message || 'Unable to load your orders.')
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
    setPage(1)
  }, [search])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedId('')
      setSelectedOrder(null)
      setSalesRouteName('')
      setSalesPersonName('')
      setDetailError('')
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
      setSalesRouteName('')
      setSalesPersonName('')
      setProducts([])
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

        if (detail?.salesRouteId) {
          masterService
            .getSalesRoute(detail.salesRouteId)
            .then((route) => {
              if (isCurrent) setSalesRouteName(route?.name || route?.code || route?.id || '')
            })
            .catch(() => {
              if (isCurrent) setSalesRouteName('')
            })
        } else {
          setSalesRouteName('')
        }

        if (detail?.salesPersonId) {
          usersService
            .getUser(detail.salesPersonId)
            .then((user) => {
              if (isCurrent) {
                setSalesPersonName(user?.username || user?.email || user?.employeeCode || '')
              }
            })
            .catch(() => {
              if (isCurrent) setSalesPersonName('')
            })
        } else {
          setSalesPersonName('')
        }

        const productIds = Array.from(
          new Set(
            getOrderLines(detail)
              .map((line) => line.productId)
              .filter(Boolean)
          )
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

  function refreshOrders() {
    setPage(1)
    setSearch('')
    setIsLoading(true)
    setError('')

    salesService
      .listMySalesOrders()
      .then((result) => {
        const list = Array.isArray(result) ? result : result?.items || result?.data || []
        setOrders([...list].sort((a, b) => new Date(getOrderDate(b)) - new Date(getOrderDate(a))))
      })
      .catch((requestError) => {
        setOrders([])
        setError(requestError.message || 'Unable to load your orders.')
      })
      .finally(() => setIsLoading(false))
  }

  const selectedFallback = filteredOrders.find((order) => order.id === selectedId) || null
  const activeOrder = selectedOrder || selectedFallback
  const lineItems = getOrderLines(activeOrder)
  const canEditActiveDraft = canEditDraftOrder(activeOrder, sessionUser)
  const currentUserLabel =
    sessionUser?.username || sessionUser?.email || sessionUser?.employeeCode || 'your account'

  return (
    <div
      className="responsive-page my-orders-page"
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
          My Orders
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Review orders returned for {currentUserLabel} and inspect the full order details below.
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

        <button
          type="button"
          className="button-secondary"
          onClick={refreshOrders}
          style={{ height: 40, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7 }}
        >
          <RefreshCw style={{ width: 15, height: 15 }} />
          Refresh
        </button>
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
              padding: '4px 4px 12px',
              borderBottom: '1px solid rgba(164, 190, 255, 0.32)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
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
                <ShoppingBag style={{ width: 17, height: 17 }} />
              </div>
              <div className="min-w-0">
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  My Orders
                </h2>
                <p style={{ marginTop: 2, fontSize: 11, color: 'var(--color-text-dim)' }}>
                  Select an order to inspect the full summary
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
                flexShrink: 0,
              }}
            >
              {filteredOrders.length}
            </span>
          </div>

          <div style={{ minHeight: 0, overflowY: 'auto', padding: '10px 3px 0' }}>
            {isLoading ? (
              <div
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: 13,
                  padding: 24,
                }}
              >
                Loading your orders...
              </div>
            ) : filteredOrders.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {pagedOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isSelected={order.id === selectedId}
                    onSelect={() => setSelectedId(order.id)}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  minHeight: '100%',
                  display: 'grid',
                  placeItems: 'center',
                  padding: 24,
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                }}
              >
                <div className="flex max-w-[280px] flex-col items-center gap-3">
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 14,
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--color-text-dim)',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {error ? (
                      <FileText style={{ width: 24, height: 24 }} />
                    ) : (
                      <ClipboardList style={{ width: 24, height: 24 }} />
                    )}
                  </div>
                  <div
                    style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}
                  >
                    {error
                      ? error
                      : orders.length
                        ? 'No orders match the current search.'
                        : 'No orders found for your account.'}
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                    {error
                      ? 'Try refreshing the page or sign in again if the session has expired.'
                      : 'Use the search box above to narrow down the order list.'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <SimplePagination
            page={page}
            pageSize={pageSize}
            totalItems={filteredOrders.length}
            onPageChange={setPage}
            itemLabel="orders"
          />
        </section>

        <section
          className="panel responsive-detail-panel"
          style={{
            padding: 0,
            minWidth: 0,
            minHeight: 0,
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {isLoadingDetail ? (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'grid',
                placeItems: 'center',
                color: 'var(--color-text-muted)',
                fontSize: 13,
              }}
            >
              Loading order details...
            </div>
          ) : activeOrder ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: 16,
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="mono text-[12px] font-extrabold text-[#8ee8f0]">
                      {activeOrder.orderNumber || 'Order'}
                    </div>
                    <h2 className="mt-1 text-[20px] font-bold text-text-primary">
                      {getOrderCustomer(activeOrder)}
                    </h2>
                    <p className="mt-1 text-[12px] text-text-muted">
                      Placed on {formatDateTime(activeOrder.orderDate || activeOrder.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={statusLabel(activeOrder.status)} />
                    <span className="rounded-[999px] border border-border bg-bg-base px-3 py-1 text-[12px] font-bold text-text-primary">
                      {formatMoney(activeOrder.netAmount)}
                    </span>
                    {canEditActiveDraft ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/sales/orders/new?orderId=${activeOrder.id}`)}
                        className="inline-flex items-center gap-2 rounded-[999px] border border-border bg-bg-base px-3 py-1 text-[12px] font-bold text-text-primary transition hover:bg-bg-elevated"
                      >
                        <Pencil size={14} />
                        Edit Draft
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <SummaryPill
                    icon={CalendarDays}
                    label="Order Date"
                    value={formatDateTime(activeOrder.orderDate)}
                    tone="accent"
                  />
                  <SummaryPill
                    icon={UserCircle2}
                    label="Sales Person"
                    value={salesPersonName || activeOrder.salesPersonId || '-'}
                  />
                  <SummaryPill
                    icon={ShoppingBag}
                    label="Route"
                    value={salesRouteName || activeOrder.salesRouteId || '-'}
                  />
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  minHeight: 0,
                }}
              >
                {detailError ? (
                  <div className="rounded-[10px] border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                    {detailError}
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailField
                    label="Customer"
                    value={activeOrder.customerName || activeOrder.customerId}
                  />
                  <DetailField label="Status" value={statusLabel(activeOrder.status)} />
                  <DetailField label="Delivery Date" value={formatDate(activeOrder.deliveryDate)} />
                  <DetailField
                    label="VAT"
                    value={activeOrder.isVatApplicable ? 'Applicable' : 'Not Applicable'}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailField label="Gross Amount" value={formatMoney(activeOrder.grossAmount)} />
                  <DetailField
                    label="Discount"
                    value={formatMoney(activeOrder.totalDiscountAmount)}
                  />
                  <DetailField label="VAT Amount" value={formatMoney(activeOrder.vatAmount)} />
                  <DetailField label="Net Amount" value={formatMoney(activeOrder.netAmount)} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailField
                    label="Cancelled Reason"
                    value={activeOrder.cancelledReason || activeOrder.cancelReason || '-'}
                  />
                  <DetailField label="Notes" value={activeOrder.notes || '-'} />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[15px] font-bold text-text-primary">Order Lines</h3>
                      <p className="mt-1 text-[12px] text-text-muted">
                        {lineItems.length} line{lineItems.length === 1 ? '' : 's'} in this order
                      </p>
                    </div>
                    <div className="rounded-[999px] border border-border bg-bg-base px-3 py-1 text-[12px] font-bold text-text-primary">
                      {formatMoney(activeOrder.netAmount)}
                    </div>
                  </div>

                  <div>
                    {lineItems.length ? (
                      <div
                        style={{
                          minHeight: 150,
                          overflow: 'hidden',
                          border: '1px solid var(--color-border)',
                          borderRadius: 8,
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div
                          style={{
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            borderBottom: '1px solid var(--color-border)',
                            background: 'var(--color-bg-surface)',
                          }}
                        >
                          <ShoppingBag
                            style={{ width: 14, height: 14, color: 'var(--color-teal)' }}
                          />
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            Items List
                          </span>
                        </div>
                        <div
                          className="responsive-table-shell"
                          style={{ overflowX: 'auto', maxHeight: 350 }}
                        >
                          <table className="data-table product-table-compact">
                            <thead>
                              <tr>
                                <th>Item</th>
                                <th>Unit</th>
                                <th style={{ textAlign: 'right' }}>Price</th>
                                <th style={{ textAlign: 'right' }}>Qty</th>
                                <th style={{ textAlign: 'right' }}>Disc %</th>
                                <th style={{ textAlign: 'right' }}>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lineItems.map((line) => {
                                const product = productById[line.productId]
                                const code =
                                  product?.sku || line?.productCode || line?.productId || '-'
                                const name =
                                  product?.name ||
                                  line?.productName ||
                                  line?.productCode ||
                                  line?.productId ||
                                  'Order line'
                                const unitCode =
                                  line?.smallestUnitCode ||
                                  line?.unitCode ||
                                  product?.smallestUnitName ||
                                  product?.uomBase ||
                                  '-'

                                return (
                                  <tr key={line.id}>
                                    <td>
                                      <div
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'flex-start',
                                          gap: 2,
                                        }}
                                      >
                                        <span className="product-sku-badge mono">{code}</span>
                                        <span
                                          className="product-info-sub"
                                          style={{
                                            fontSize: 12,
                                            color: 'var(--color-text-muted)',
                                            fontWeight: 500,
                                          }}
                                        >
                                          {name}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="mono">{unitCode}</td>
                                    <td className="mono text-right">
                                      {formatMoney(line?.unitPrice)}
                                    </td>
                                    <td className="mono text-right">
                                      {Number(line?.quantity ?? 0).toLocaleString('en-LK')}
                                    </td>
                                    <td className="mono text-right">
                                      {Number(line?.discountPercent ?? 0).toLocaleString('en-LK')}%
                                    </td>
                                    <td className="mono text-right font-semibold">
                                      {formatMoney(line?.lineTotal)}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="grid min-h-[180px] place-items-center rounded-[12px] border border-border bg-bg-base p-6 text-center text-[13px] text-text-muted">
                        This order does not include line items yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'grid',
                placeItems: 'center',
                textAlign: 'center',
                padding: 24,
                color: 'var(--color-text-muted)',
              }}
            >
              <div className="flex max-w-[320px] flex-col items-center gap-3">
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--color-teal)',
                    background: 'rgba(142, 232, 240, 0.08)',
                    border: '1px solid rgba(142, 232, 240, 0.2)',
                  }}
                >
                  <ClipboardList style={{ width: 26, height: 26 }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Select an order to see the full details
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  The detail pane shows the customer, status, totals, notes, and every order line.
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
