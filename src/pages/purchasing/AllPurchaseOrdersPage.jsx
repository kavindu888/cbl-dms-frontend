import dayjs from 'dayjs'
import { CalendarDays, RefreshCw, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import StatusBadge from '@components/ui/StatusBadge'
import { purchasingService } from '@services/api/purchasingService'
import { PurchaseOrderStatus } from '@/types/purchasing.types'

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: PurchaseOrderStatus.Submitted, label: 'Pending Approval' },
  { value: PurchaseOrderStatus.Approved, label: 'Approved' },
  { value: PurchaseOrderStatus.Rejected, label: 'Rejected' },
  { value: PurchaseOrderStatus.Cancelled, label: 'Cancelled' },
  { value: PurchaseOrderStatus.Draft, label: 'Draft' },
  { value: PurchaseOrderStatus.PartiallyReceived, label: 'Partially Received' },
  { value: PurchaseOrderStatus.FullyReceived, label: 'Fully Received' },
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

function getStatusLabel(purchaseOrder) {
  if (
    purchaseOrder.status === PurchaseOrderStatus.Submitted ||
    purchaseOrder.statusLabel?.toLowerCase() === 'submitted'
  ) {
    return 'Pending Approval'
  }

  return purchaseOrder.statusLabel || 'Unknown'
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
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadPurchaseOrders = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setPurchaseOrders(await purchasingService.listAllPurchaseOrders())
    } catch (requestError) {
      setError(requestError.message)
      setPurchaseOrders([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPurchaseOrders()
  }, [loadPurchaseOrders])

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
  }

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()

    return purchaseOrders.filter((purchaseOrder) => {
      const matchesSearch =
        !query ||
        purchaseOrder.poNumber?.toLowerCase().includes(query) ||
        purchaseOrder.supplierName?.toLowerCase().includes(query) ||
        purchaseOrder.supplierCode?.toLowerCase().includes(query)
      const matchesStatus = !status || Number(purchaseOrder.status) === Number(status)
      const orderDate = dayjs(purchaseOrder.orderDate).format('YYYY-MM-DD')
      const matchesFrom = !fromDate || orderDate >= fromDate
      const matchesTo = !toDate || orderDate <= toDate

      return matchesSearch && matchesStatus && matchesFrom && matchesTo
    })
  }, [fromDate, purchaseOrders, search, status, toDate])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            All Purchase Orders
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Track purchase orders across every status and order date.
          </p>
        </div>
        <button
          type="button"
          className="button-secondary flex items-center gap-2"
          onClick={loadPurchaseOrders}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="panel p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_190px_180px_160px_160px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-dim)]" />
            <input
              className="form-input w-full"
              style={{ paddingLeft: 36 }}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search PO, supplier, or code"
            />
          </div>

          <select
            className="form-input w-full"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-dim)]" />
            <select
              className="form-input w-full"
              style={{ paddingLeft: 36 }}
              value={dateRange}
              onChange={changeDateRange}
            >
              {rangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <label>
            <span className="sr-only">From date</span>
            <input
              className="form-input w-full"
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => {
                setDateRange('custom')
                setFromDate(event.target.value)
              }}
              title="From date"
            />
          </label>

          <label>
            <span className="sr-only">To date</span>
            <input
              className="form-input w-full"
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => {
                setDateRange('custom')
                setToDate(event.target.value)
              }}
              title="To date"
            />
          </label>

          <button
            type="button"
            className="button-secondary flex items-center justify-center gap-2"
            onClick={clearFilters}
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        {error ? (
          <div className="p-8 text-sm text-[var(--color-danger)]">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Order Date</th>
                  <th>Expected Delivery</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th className="text-right">Subtotal</th>
                  <th className="text-right">VAT</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-[var(--color-text-muted)]">
                      Loading purchase order register...
                    </td>
                  </tr>
                ) : filteredOrders.length ? (
                  filteredOrders.map((purchaseOrder) => (
                    <tr key={purchaseOrder.id}>
                      <td className="mono font-semibold text-[var(--color-amber)]">
                        {purchaseOrder.poNumber}
                      </td>
                      <td>
                        <div className="font-medium text-[var(--color-text-primary)]">
                          {purchaseOrder.supplierName}
                        </div>
                        <div className="text-xs text-[var(--color-text-dim)]">
                          {purchaseOrder.supplierCode}
                        </div>
                      </td>
                      <td>{dayjs(purchaseOrder.orderDate).format('DD MMM YYYY')}</td>
                      <td>
                        {purchaseOrder.expectedDeliveryDate
                          ? dayjs(purchaseOrder.expectedDeliveryDate).format('DD MMM YYYY')
                          : '-'}
                      </td>
                      <td>
                        <StatusBadge status={getStatusLabel(purchaseOrder)} />
                      </td>
                      <td>{purchaseOrder.lineCount}</td>
                      <td className="mono text-right">{formatMoney(purchaseOrder.subtotal)}</td>
                      <td className="mono text-right">{formatMoney(purchaseOrder.vatAmount)}</td>
                      <td className="mono text-right font-semibold">
                        {formatMoney(purchaseOrder.totalAmount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-[var(--color-text-muted)]">
                      No purchase orders match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--color-text-dim)]">
        Showing {filteredOrders.length} of {purchaseOrders.length} loaded purchase orders.
      </p>
    </div>
  )
}
