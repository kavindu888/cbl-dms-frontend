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
import ConfirmDialog from '@components/ui/ConfirmDialog'
import SimplePagination from '@components/ui/SimplePagination'
import { purchasingService } from '@services/api/purchasingService'
import { useAuthStore } from '@stores/authStore'
import { GrnStatus } from '@/types/purchasing.types'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'

const queuePageSize = 3
const itemPageSize = 5

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function SelectChevron() {
  return (
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
  )
}

function getLifoDate(receipt) {
  return dayjs(receipt.createdAt || receipt.receiptDate)
}

export default function GrnApproveRejectPage() {
  const user = useAuthStore((state) => state.user)
  const canVerify = userHasPermission(user, PERMISSIONS.purchasing.grnVerify)

  const [rawReceipts, setRawReceipts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters State
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
  const [selectedGrnId, setSelectedGrnId] = useState(null)
  const [selectedGrnDetail, setSelectedGrnDetail] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [isActionProcessing, setIsActionProcessing] = useState(false)
  const [queuePage, setQueuePage] = useState(1)
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

  // Load pending GRNs from backend
  const loadReceipts = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await purchasingService.listGoodsReceipts({
        page: 1,
        pageSize: 100,
        status: GrnStatus.Received,
        supplierId: searchSupplier || undefined,
      })
      setRawReceipts(result?.items || [])
    } catch (requestError) {
      setError(requestError.message)
      setRawReceipts([])
    } finally {
      setIsLoading(false)
    }
  }, [searchSupplier])

  useEffect(() => {
    loadReceipts()
  }, [loadReceipts])

  // Filter receipts client-side by date range
  const filteredReceipts = useMemo(() => {
    const filtered = rawReceipts.filter((receipt) => {
      const receiptDate = dayjs(receipt.receiptDate).format('YYYY-MM-DD')
      const matchFrom = !searchFromDate || receiptDate >= searchFromDate
      const matchTo = !searchToDate || receiptDate <= searchToDate
      return matchFrom && matchTo
    })

    return [...filtered].sort((a, b) => {
      const dateA = getLifoDate(a)
      const dateB = getLifoDate(b)
      if (!dateA.isSame(dateB)) {
        return dateB.isAfter(dateA) ? 1 : -1
      }
      return b.grNumber.localeCompare(a.grNumber, undefined, { numeric: true, sensitivity: 'base' })
    })
  }, [rawReceipts, searchFromDate, searchToDate])

  const pagedReceipts = useMemo(() => {
    const start = (queuePage - 1) * queuePageSize
    return filteredReceipts.slice(start, start + queuePageSize)
  }, [filteredReceipts, queuePage])

  const pagedItems = useMemo(() => {
    const lines = selectedGrnDetail?.lines || []
    const start = (itemPage - 1) * itemPageSize
    return lines.slice(start, start + itemPageSize)
  }, [itemPage, selectedGrnDetail])

  useEffect(() => {
    setQueuePage(1)
  }, [searchFromDate, searchSupplier, searchToDate])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / queuePageSize))
    if (queuePage > totalPages) setQueuePage(totalPages)
  }, [filteredReceipts.length, queuePage])

  useEffect(() => {
    if (filteredReceipts.length > 0) {
      const exists = filteredReceipts.some((receipt) => receipt.id === selectedGrnId)
      if (!exists) {
        setSelectedGrnId(filteredReceipts[0].id)
      }
    } else {
      setSelectedGrnId(null)
    }
  }, [filteredReceipts, selectedGrnId])

  // Load GRN details when selected
  useEffect(() => {
    if (!selectedGrnId) {
      setSelectedGrnDetail(null)
      return
    }

    async function loadGrnDetail() {
      setIsLoadingDetail(true)
      try {
        const detail = await purchasingService.getGoodsReceipt(selectedGrnId)
        setSelectedGrnDetail(detail)
        setRemarks('') // Reset remarks
      } catch (err) {
        toast.error(`Unable to load goods receipt details: ${err.message}`)
        setSelectedGrnDetail(null)
      } finally {
        setIsLoadingDetail(false)
      }
    }

    loadGrnDetail()
  }, [selectedGrnId])

  useEffect(() => {
    setItemPage(1)
  }, [selectedGrnId])

  function handleSearch(event) {
    event?.preventDefault()
    setSearchFromDate(filterFromDate)
    setSearchToDate(filterToDate)
    setSearchSupplier(filterSupplier)
    setSelectedGrnId(null) // Reset selection when filtering
  }

  async function handleVerify() {
    if (!selectedGrnDetail) return
    setIsActionProcessing(true)
    try {
      await purchasingService.verifyGoodsReceipt(selectedGrnDetail.id)
      toast.success(`GRN ${selectedGrnDetail.grNumber} Verified successfully.`)
      setSelectedGrnId(null)
      setSelectedGrnDetail(null)
      await loadReceipts()
    } catch (err) {
      toast.error(`Verification failed: ${err.message}`)
    } finally {
      setIsActionProcessing(false)
    }
  }

  async function handleReject() {
    if (!selectedGrnDetail) return
    if (!remarks.trim()) {
      toast.error('Please enter a remark for rejection.')
      return
    }
    setIsActionProcessing(true)
    try {
      await purchasingService.rejectGoodsReceipt(selectedGrnDetail.id, remarks.trim())
      toast.success(`GRN ${selectedGrnDetail.grNumber} Rejected successfully.`)
      setSelectedGrnId(null)
      setSelectedGrnDetail(null)
      setRemarks('')
      await loadReceipts()
    } catch (err) {
      toast.error(`Rejection failed: ${err.message}`)
    } finally {
      setIsActionProcessing(false)
    }
  }

  return (
    <div
      className="responsive-page grn-page"
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
          GRN Approve & Reject
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Review pending goods receipt notes and approve or reject them with verification logs.
        </p>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={handleSearch}
        className="panel grn-filter-bar grn-filter-bar--review"
        style={{
          padding: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(150px, 190px)) minmax(240px, 1fr) auto',
          alignItems: 'end',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div
          className="grn-filter-field"
          style={{ display: 'flex', flexDirection: 'column', gap: 7 }}
        >
          <span className="form-label">From Date</span>
          <input
            type="date"
            className="form-input"
            value={filterFromDate}
            onChange={(e) => setFilterFromDate(e.target.value)}
            style={{ width: '100%', height: 40 }}
          />
        </div>
        <div
          className="grn-filter-field"
          style={{ display: 'flex', flexDirection: 'column', gap: 7 }}
        >
          <span className="form-label">To Date</span>
          <input
            type="date"
            className="form-input"
            value={filterToDate}
            onChange={(e) => setFilterToDate(e.target.value)}
            style={{ width: '100%', height: 40 }}
          />
        </div>
        <div
          className="grn-filter-field"
          style={{ display: 'flex', minWidth: 0, flexDirection: 'column', gap: 7 }}
        >
          <span className="form-label">Supplier</span>
          <div style={{ position: 'relative' }}>
            <select
              className="form-input"
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              style={{ width: '100%', height: 40, appearance: 'none', paddingRight: 36 }}
            >
              <option value="">All suppliers</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.code} - {sup.name}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
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
        {/* Left Side: Pending GRN Queue */}
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
                  color: 'var(--color-amber)',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}
              >
                <ClipboardCheck style={{ width: 17, height: 17 }} />
              </div>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Pending verification
                </h2>
                <p style={{ marginTop: 2, fontSize: 11, color: 'var(--color-text-dim)' }}>
                  Select a receipt to review
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
              {filteredReceipts.length}
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
            ) : filteredReceipts.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pagedReceipts.map((receipt) => {
                  const isSelected = receipt.id === selectedGrnId
                  return (
                    <button
                      type="button"
                      key={receipt.id}
                      onClick={() => setSelectedGrnId(receipt.id)}
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
                          {receipt.grNumber}
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
                          title={receipt.supplierName}
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {receipt.supplierName}
                        </div>
                        <div
                          className="mono"
                          style={{ marginTop: 2, fontSize: 10, color: 'var(--color-text-dim)' }}
                        >
                          PO: {receipt.poNumber || 'N/A'}
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
                          {dayjs(receipt.receiptDate).format('DD MMM YYYY')}
                        </span>
                        <span
                          className="mono text-xs font-semibold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {formatMoney(receipt.netAmount)}
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
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: 13,
                  padding: 24,
                  textAlign: 'center',
                }}
              >
                No pending receipts match the current filters.
              </div>
            )}
          </div>

          <div style={{ paddingTop: 10 }}>
            <SimplePagination
              page={queuePage}
              pageSize={queuePageSize}
              totalItems={filteredReceipts.length}
              onPageChange={setQueuePage}
              itemLabel="receipts"
            />
          </div>
        </section>

        {/* Right Side: Receipt Detail Workspace */}
        <section
          className="panel responsive-detail-panel"
          style={{ padding: 16, minWidth: 0, minHeight: 0, overflow: 'hidden' }}
        >
          {isLoadingDetail ? (
            <div className="h-full flex items-center justify-center text-text-muted">
              Loading goods receipt details...
            </div>
          ) : selectedGrnDetail ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                minHeight: 0,
              }}
            >
              {/* Selected GRN Header Detail Card */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--color-border)',
                  background:
                    'linear-gradient(135deg, var(--color-bg-surface), var(--color-bg-elevated))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--color-amber)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {selectedGrnDetail.grNumber}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        color: 'var(--color-teal)',
                        background: 'rgba(142, 232, 240, 0.08)',
                        border: '1px solid rgba(142, 232, 240, 0.15)',
                      }}
                    >
                      PENDING VERIFICATION
                    </span>
                  </div>
                  <div
                    style={{
                      width: 1,
                      height: 16,
                      background: 'var(--color-border)',
                    }}
                  />
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                    Verify the received items, costs, and rejection details.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Building2 style={{ width: 14, height: 14, color: 'var(--color-text-dim)' }} />
                    <div>
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: 'var(--color-text-dim)',
                          letterSpacing: '0.05em',
                        }}
                      >
                        SUPPLIER
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {selectedGrnDetail.supplierName || 'Not specified'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CalendarDays
                      style={{ width: 14, height: 14, color: 'var(--color-text-dim)' }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: 'var(--color-text-dim)',
                          letterSpacing: '0.05em',
                        }}
                      >
                        RECEIVED ON
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {dayjs(selectedGrnDetail.receiptDate).format('DD MMM YYYY')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
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
                    Received items
                  </h3>
                  <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                    {selectedGrnDetail.lines?.length || 0} item
                    {selectedGrnDetail.lines?.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div
                  className="responsive-table-shell"
                  style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
                >
                  <table className="data-table product-table-compact" style={{ minWidth: 920 }}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th style={{ textAlign: 'right' }}>Received Qty</th>
                        <th style={{ textAlign: 'right' }}>Unit Cost</th>
                        <th style={{ textAlign: 'right' }}>Rejected Qty</th>
                        <th>Reject Reason</th>
                        <th>Expiry</th>
                        <th style={{ textAlign: 'right' }}>Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedItems.map((line) => (
                        <tr key={line.purchaseOrderLineId || line.id}>
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
                          <td className="text-right">
                            <span className="mono text-sm">
                              {Number(line.qtyBaseUnit).toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 4,
                              })}
                            </span>{' '}
                            <span className="uom-badge">{line.baseUomCode}</span>
                          </td>
                          <td className="mono text-right font-semibold text-sm">
                            {formatMoney(line.unitCostSmallest)}
                          </td>
                          <td className="text-right">
                            <span className="mono text-sm">
                              {Number(line.rejectedQtyBase).toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 4,
                              })}
                            </span>{' '}
                            <span className="uom-badge">{line.baseUomCode}</span>
                          </td>
                          <td>
                            <span className="text-sm text-text-muted">
                              {line.rejectionReason || '-'}
                            </span>
                          </td>
                          <td>
                            <span className="text-sm text-text-muted">
                              {line.expiryDate ? dayjs(line.expiryDate).format('DD MMM YYYY') : '-'}
                            </span>
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
                    totalItems={selectedGrnDetail.lines?.length || 0}
                    onPageChange={setItemPage}
                    itemLabel="items"
                  />
                </div>
              </div>

              {/* Remarks and Totals */}
              <div
                className="responsive-summary-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 330px',
                  gap: 14,
                  alignItems: 'stretch',
                }}
              >
                {/* Decision Remarks */}
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
                    onChange={(e) => setRemarks(e.target.value.replace(/[^a-zA-Z0-9\s-]/g, ''))}
                    style={{ width: '100%', height: 62, resize: 'none' }}
                  />
                </div>

                {/* Summary Totals */}
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
                    <span className="mono">{formatMoney(selectedGrnDetail.billTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Discount</span>
                    <span className="mono">{formatMoney(selectedGrnDetail.discount)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">VAT</span>
                    <span className="mono">{formatMoney(selectedGrnDetail.vatAmount)}</span>
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
                      Net amount
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-amber)' }}
                    >
                      {formatMoney(selectedGrnDetail.netAmount)}
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
                {canVerify ? (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <ConfirmDialog
                      title="Reject GRN?"
                      description="This goods receipt will be rejected and removed from the verification queue. Make sure your remark clearly explains the issue."
                      details={selectedGrnDetail?.grNumber}
                      confirmLabel="Reject GRN"
                      loadingLabel="Rejecting..."
                      icon={X}
                      onConfirm={handleReject}
                      trigger={
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
                          disabled={isActionProcessing}
                        >
                          <X style={{ width: 15, height: 15 }} />
                          {isActionProcessing ? 'Processing...' : 'Reject'}
                        </button>
                      }
                    />
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
                      onClick={handleVerify}
                      disabled={isActionProcessing}
                    >
                      <Check style={{ width: 15, height: 15 }} />
                      {isActionProcessing ? 'Processing...' : 'Verify'}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-text-dim">
                    You do not have permission to verify/reject GRNs.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                height: '100%',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--color-text-muted)',
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              <div>
                <ClipboardCheck
                  size={34}
                  style={{ margin: '0 auto 10px', color: 'var(--color-text-dim)' }}
                />
                Select a receipt from the queue to verify.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
      <span className="form-label" style={{ marginBottom: 0 }}>
        {label}
      </span>
      {children}
    </label>
  )
}
