import dayjs from 'dayjs'
import {
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Package,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import SimplePagination from '@components/ui/SimplePagination'
import { purchasingService } from '@services/api/purchasingService'
import { useAuthStore } from '@stores/authStore'
import { PurchaseOrderStatus } from '@/types/purchasing.types'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'

const orderPageSize = 3
const itemPageSize = 5

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function PurchaseOrderApprovalPage() {
  const user = useAuthStore((state) => state.user)
  const canApprove = userHasPermission(user, PERMISSIONS.purchasing.poApprove)

  const [rawOrders, setRawOrders] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters State (default range is last 30 days)
  const [filterFromDate, setFilterFromDate] = useState(
    dayjs().subtract(30, 'day').format('YYYY-MM-DD')
  )
  const [filterToDate, setFilterToDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [filterSupplier, setFilterSupplier] = useState('')

  // Search trigger state (applied filters)
  const [searchFromDate, setSearchFromDate] = useState(
    dayjs().subtract(30, 'day').format('YYYY-MM-DD')
  )
  const [searchToDate, setSearchToDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [searchSupplier, setSearchSupplier] = useState('')

  // Detail & Selection state
  const [selectedPoId, setSelectedPoId] = useState(null)
  const [selectedPoDetail, setSelectedPoDetail] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [isActionProcessing, setIsActionProcessing] = useState(false)
  const [orderPage, setOrderPage] = useState(1)
  const [itemPage, setItemPage] = useState(1)

  // Load suppliers list for the dropdown filter
  useEffect(() => {
    async function loadSuppliers() {
      try {
        const result = await purchasingService.listSuppliers({ page: 1, pageSize: 100, status: 1 })
        setSuppliers(result?.items || [])
      } catch (err) {
        console.error('Failed to load suppliers:', err)
      }
    }
    loadSuppliers()
  }, [])

  // Load pending POs from the backend
  const loadPurchaseOrders = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await purchasingService.listPurchaseOrders({
        page: 1,
        pageSize: 100,
        status: PurchaseOrderStatus.Submitted,
        supplierId: searchSupplier || undefined,
      })
      setRawOrders(result?.items || [])
    } catch (requestError) {
      setError(requestError.message)
      setRawOrders([])
    } finally {
      setIsLoading(false)
    }
  }, [searchSupplier])

  useEffect(() => {
    loadPurchaseOrders()
  }, [loadPurchaseOrders])

  // Filter orders client-side by date range
  const filteredOrders = useMemo(() => {
    const filtered = rawOrders.filter((po) => {
      const poDate = dayjs(po.orderDate).format('YYYY-MM-DD')
      const matchFrom = !searchFromDate || poDate >= searchFromDate
      const matchTo = !searchToDate || poDate <= searchToDate
      return matchFrom && matchTo
    })

    return [...filtered].sort((a, b) => {
      const dateA = dayjs(a.orderDate)
      const dateB = dayjs(b.orderDate)
      if (!dateA.isSame(dateB)) {
        return dateB.isAfter(dateA) ? 1 : -1
      }
      return b.poNumber.localeCompare(a.poNumber, undefined, { numeric: true, sensitivity: 'base' })
    })
  }, [rawOrders, searchFromDate, searchToDate])

  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * orderPageSize
    return filteredOrders.slice(start, start + orderPageSize)
  }, [filteredOrders, orderPage])

  const pagedItems = useMemo(() => {
    const lines = selectedPoDetail?.lines || []
    const start = (itemPage - 1) * itemPageSize
    return lines.slice(start, start + itemPageSize)
  }, [itemPage, selectedPoDetail])

  useEffect(() => {
    setOrderPage(1)
  }, [searchFromDate, searchSupplier, searchToDate])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / orderPageSize))
    if (orderPage > totalPages) setOrderPage(totalPages)
  }, [filteredOrders.length, orderPage])

  useEffect(() => {
    if (filteredOrders.length > 0) {
      const exists = filteredOrders.some((po) => po.id === selectedPoId)
      if (!exists) {
        setSelectedPoId(filteredOrders[0].id)
      }
    } else {
      setSelectedPoId(null)
    }
  }, [filteredOrders, selectedPoId])

  // Load PO details when a PO is selected
  useEffect(() => {
    if (!selectedPoId) {
      setSelectedPoDetail(null)
      return
    }

    async function loadPoDetail() {
      setIsLoadingDetail(true)
      try {
        const detail = await purchasingService.getPurchaseOrder(selectedPoId)
        setSelectedPoDetail(detail)
        setRemarks('') // Reset remarks
      } catch (err) {
        toast.error(`Unable to load purchase order details: ${err.message}`)
        setSelectedPoDetail(null)
      } finally {
        setIsLoadingDetail(false)
      }
    }

    loadPoDetail()
  }, [selectedPoId])

  useEffect(() => {
    setItemPage(1)
  }, [selectedPoId])

  function handleSearch(event) {
    event?.preventDefault()
    setSearchFromDate(filterFromDate)
    setSearchToDate(filterToDate)
    setSearchSupplier(filterSupplier)
    setSelectedPoId(null) // Reset selection when filtering
  }

  async function handleApprove() {
    if (!selectedPoDetail) return
    setIsActionProcessing(true)
    try {
      await purchasingService.approvePurchaseOrder(selectedPoDetail.id)
      toast.success(`Purchase Order ${selectedPoDetail.poNumber} Approved successfully.`)
      setSelectedPoId(null)
      setSelectedPoDetail(null)
      await loadPurchaseOrders()
    } catch (err) {
      toast.error(`Approval failed: ${err.message}`)
    } finally {
      setIsActionProcessing(false)
    }
  }

  async function handleReject() {
    if (!selectedPoDetail) return
    if (!remarks.trim()) {
      toast.error('Please enter a remark for rejection.')
      return
    }
    setIsActionProcessing(true)
    try {
      await purchasingService.rejectPurchaseOrder(selectedPoDetail.id, remarks.trim())
      toast.success(`Purchase Order ${selectedPoDetail.poNumber} Rejected successfully.`)
      setSelectedPoId(null)
      setSelectedPoDetail(null)
      setRemarks('')
      await loadPurchaseOrders()
    } catch (err) {
      toast.error(`Rejection failed: ${err.message}`)
    } finally {
      setIsActionProcessing(false)
    }
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
      {/* Page Header */}
      <div style={{ flexShrink: 0 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            lineHeight: 1.2,
          }}
        >
          PO Approve & Reject
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Review purchase orders and approve or reject them with remarks.
        </p>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={handleSearch}
        className="panel"
        style={{
          padding: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(150px, 190px)) minmax(240px, 1fr) auto',
          alignItems: 'end',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <span className="form-label">From Date</span>
          <input
            type="date"
            className="form-input"
            value={filterFromDate}
            onChange={(e) => setFilterFromDate(e.target.value)}
            style={{ width: '100%', height: 40, colorScheme: 'dark' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <span className="form-label">To Date</span>
          <input
            type="date"
            className="form-input"
            value={filterToDate}
            onChange={(e) => setFilterToDate(e.target.value)}
            style={{ width: '100%', height: 40, colorScheme: 'dark' }}
          />
        </div>
        <div style={{ display: 'flex', minWidth: 0, flexDirection: 'column', gap: 7 }}>
          <span className="form-label">Supplier</span>
          <select
            className="form-input"
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            style={{ width: '100%', height: 40 }}
          >
            <option value="">All suppliers</option>
            {suppliers.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.code} - {sup.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="button-primary"
          style={{ height: 40, padding: '0 18px', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Search style={{ width: 16, height: 16 }} />
          Apply filters
        </button>
      </form>

      {/* Main Grid Content */}
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
        {/* Left Side: Pending PO Queue */}
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
                  color: 'var(--color-amber)',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}
              >
                <ClipboardCheck style={{ width: 17, height: 17 }} />
              </div>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Pending approvals
                </h2>
                <p style={{ marginTop: 2, fontSize: 11, color: 'var(--color-text-dim)' }}>
                  Select an order to review
                </p>
              </div>
            </div>
            <span
              style={{
                padding: '4px 9px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--color-amber)',
                background: 'rgba(245, 158, 11, 0.1)',
              }}
            >
              {filteredOrders.length}
            </span>
          </div>
          <div style={{ minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
            {error ? (
              <div className="p-6 text-sm text-danger">{error}</div>
            ) : isLoading ? (
              <div
                style={{
                  height: '100%',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: 13,
                }}
              >
                Loading queue...
              </div>
            ) : filteredOrders.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pagedOrders.map((po) => {
                  const isSelected = po.id === selectedPoId
                  return (
                    <button
                      type="button"
                      key={po.id}
                      onClick={() => setSelectedPoId(po.id)}
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
                        transition: 'border-color 150ms ease, background 150ms ease',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <span
                          className="mono"
                          style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-amber)' }}
                        >
                          {po.poNumber}
                        </span>
                        <ChevronRight
                          style={{
                            width: 15,
                            height: 15,
                            color: isSelected ? 'var(--color-teal)' : 'var(--color-text-dim)',
                          }}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          title={po.supplierName}
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {po.supplierName}
                        </div>
                        <div
                          className="mono"
                          style={{ marginTop: 3, fontSize: 10, color: 'var(--color-text-dim)' }}
                        >
                          {po.supplierCode}
                        </div>
                      </div>
                      <div
                        style={{
                          width: '100%',
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
                          {dayjs(po.orderDate).format('DD MMM YYYY')}
                        </span>
                        <span
                          className="mono"
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {formatMoney(po.totalAmount)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div
                style={{
                  height: '100%',
                  minHeight: 260,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  color: 'var(--color-text-muted)',
                }}
              >
                <ClipboardCheck style={{ width: 34, height: 34, color: 'var(--color-text-dim)' }} />
                <span style={{ fontSize: 13 }}>No pending POs found.</span>
              </div>
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

        {/* Right Side: Details View */}
        <section
          className="panel"
          style={{
            padding: 16,
            minWidth: 0,
            minHeight: 0,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {isLoadingDetail ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-text-muted">
              <p>Loading purchase order details...</p>
            </div>
          ) : selectedPoDetail ? (
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
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--color-amber)',
                      }}
                    >
                      {selectedPoDetail.poNumber}
                    </span>
                    <span
                      style={{
                        padding: '4px 9px',
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--color-teal)',
                        background: 'rgba(142, 232, 240, 0.1)',
                        border: '1px solid rgba(142, 232, 240, 0.2)',
                      }}
                    >
                      PENDING APPROVAL
                    </span>
                  </div>
                  <p style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Review the supplier, products, and totals before making a decision.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Building2 style={{ width: 16, height: 16, color: 'var(--color-text-dim)' }} />
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>SUPPLIER</div>
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {selectedPoDetail.supplierName || 'Not specified'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CalendarDays
                      style={{ width: 16, height: 16, color: 'var(--color-text-dim)' }}
                    />
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>ORDER DATE</div>
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {dayjs(selectedPoDetail.orderDate).format('DD MMM YYYY')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lines Table */}
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
                    {selectedPoDetail.lines?.length || 0} item
                    {selectedPoDetail.lines?.length === 1 ? '' : 's'}
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
                    totalItems={selectedPoDetail.lines?.length || 0}
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
                  alignItems: 'stretch',
                }}
              >
                {/* Remarks Textbox */}
                <div
                  style={{
                    padding: 14,
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 9,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText style={{ width: 15, height: 15, color: 'var(--color-text-dim)' }} />
                    <span className="form-label">Decision remarks</span>
                  </div>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Add a note for this decision. A remark is required when rejecting."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    style={{ width: '100%', height: 62, resize: 'none' }}
                  />
                </div>
                {/* Summary Box */}
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
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Sub total</span>
                    <span className="mono">{formatMoney(selectedPoDetail.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">
                      VAT ({Number(selectedPoDetail.vatRate || 0)}%)
                    </span>
                    <span className="mono">{formatMoney(selectedPoDetail.vatAmount)}</span>
                  </div>
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
                      {formatMoney(selectedPoDetail.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  paddingTop: 14,
                  borderTop: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                  Confirm that all quantities, costs, and taxes are correct.
                </span>
                {canApprove ? (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      className="button-danger"
                      style={{
                        height: 40,
                        padding: '0 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                      onClick={handleReject}
                      disabled={isActionProcessing}
                    >
                      <X style={{ width: 15, height: 15 }} />
                      {isActionProcessing ? 'Processing...' : 'Reject'}
                    </button>
                    <button
                      type="button"
                      className="button-primary"
                      style={{
                        height: 40,
                        padding: '0 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                      onClick={handleApprove}
                      disabled={isActionProcessing}
                    >
                      <Check style={{ width: 15, height: 15 }} />
                      {isActionProcessing ? 'Processing...' : 'Approve'}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-text-dim">
                    You do not have permission to approve/reject POs.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                height: '100%',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                textAlign: 'center',
              }}
            >
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
                <ClipboardCheck style={{ width: 25, height: 25 }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Select a purchase order
                </p>
                <p style={{ marginTop: 5, fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Choose an order from the approval queue to review its products and totals.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
