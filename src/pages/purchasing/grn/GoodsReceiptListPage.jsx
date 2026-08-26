import dayjs from 'dayjs'
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Pencil,
  Search,
  X,
  Building2,
  Package,
  FileText,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import SimplePagination from '@components/ui/SimplePagination'
import { purchasingService } from '@services/api/purchasingService'
import { useAuthStore } from '@stores/authStore'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'
import { GrnStatus } from '@/types/purchasing.types'
import { formatDate } from '@/utils'

const receiptPageSize = 3
const itemPageSize = 5

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: String(GrnStatus.Draft), label: 'Draft' },
  { value: String(GrnStatus.Received), label: 'Received' },
  { value: String(GrnStatus.Verified), label: 'Verified' },
  { value: String(GrnStatus.Rejected), label: 'Rejected' },
]

const rangeOptions = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
]

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

export default function GoodsReceiptListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const canAdjust = userHasPermission(user, PERMISSIONS.purchasing.grnAdjust)
  const [receipts, setReceipts] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dateRange, setDateRange] = useState('month')
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [toDate, setToDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'))
  const [selectedId, setSelectedId] = useState(null)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [error, setError] = useState('')
  const [receiptPage, setReceiptPage] = useState(1)
  const [itemPage, setItemPage] = useState(1)
  const [isEditingAdjustment, setIsEditingAdjustment] = useState(false)
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false)

  const loadReceipts = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await purchasingService.listGoodsReceipts({
        page: 1,
        pageSize: 100,
      })
      setReceipts(result?.items || [])
    } catch (requestError) {
      setError(requestError.message)
      setReceipts([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReceipts()
  }, [loadReceipts])

  const loadReceiptDetail = useCallback(async (id) => {
    setIsLoadingDetail(true)
    try {
      const detail = await purchasingService.getGoodsReceipt(id)
      setSelectedReceipt(detail)
    } catch (requestError) {
      toast.error(`Unable to load goods receipt details: ${requestError.message}`)
      setSelectedReceipt(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setSelectedReceipt(null)
      return
    }
    loadReceiptDetail(selectedId)
  }, [loadReceiptDetail, selectedId])

  useEffect(() => {
    setIsEditingAdjustment(false)
  }, [selectedId])

  function startEditingAdjustment() {
    setAdjustmentAmount(String(selectedReceipt?.adjustmentAmount || 0))
    setAdjustmentReason(selectedReceipt?.adjustmentReason || '')
    setIsEditingAdjustment(true)
  }

  async function saveAdjustment() {
    const amount = Number(adjustmentAmount)
    if (!Number.isFinite(amount)) {
      toast.error('Enter a valid adjustment amount.')
      return
    }
    setIsSavingAdjustment(true)
    try {
      await purchasingService.adminAdjustGoodsReceipt(selectedId, amount, adjustmentReason.trim() || null)
      toast.success('Points adjustment saved.')
      setIsEditingAdjustment(false)
      await loadReceiptDetail(selectedId)
      await loadReceipts()
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to save the adjustment.')
    } finally {
      setIsSavingAdjustment(false)
    }
  }

  const filteredReceipts = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = receipts.filter((receipt) => {
      const receiptDate = dayjs(receipt.receiptDate).format('YYYY-MM-DD')
      const matchesSearch =
        !query ||
        receipt.grNumber?.toLowerCase().includes(query) ||
        receipt.poNumber?.toLowerCase().includes(query) ||
        receipt.supplierName?.toLowerCase().includes(query)
      const matchesStatus = !status || Number(receipt.status) === Number(status)
      const matchesFrom = !fromDate || receiptDate >= fromDate
      const matchesTo = !toDate || receiptDate <= toDate

      return matchesSearch && matchesStatus && matchesFrom && matchesTo
    })

    return [...filtered].sort((a, b) => {
      const dateA = getLifoDate(a)
      const dateB = getLifoDate(b)
      if (!dateA.isSame(dateB)) {
        return dateB.isAfter(dateA) ? 1 : -1
      }
      return b.grNumber.localeCompare(a.grNumber, undefined, { numeric: true, sensitivity: 'base' })
    })
  }, [fromDate, receipts, search, status, toDate])

  const pagedReceipts = useMemo(() => {
    const start = (receiptPage - 1) * receiptPageSize
    return filteredReceipts.slice(start, start + receiptPageSize)
  }, [filteredReceipts, receiptPage])

  const pagedItems = useMemo(() => {
    const lines = selectedReceipt?.lines || []
    const start = (itemPage - 1) * itemPageSize
    return lines.slice(start, start + itemPageSize)
  }, [itemPage, selectedReceipt])

  useEffect(() => {
    setReceiptPage(1)
  }, [dateRange, fromDate, search, status, toDate])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / receiptPageSize))
    if (receiptPage > totalPages) setReceiptPage(totalPages)
  }, [filteredReceipts.length, receiptPage])

  useEffect(() => {
    if (filteredReceipts.length > 0) {
      const exists = filteredReceipts.some((r) => r.id === selectedId)
      if (!exists) {
        setSelectedId(filteredReceipts[0].id)
      }
    } else {
      setSelectedId(null)
    }
  }, [filteredReceipts, selectedId])

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
      <div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            lineHeight: 1.2,
          }}
        >
          Goods Receipts List
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Track and review goods receipts across every status and receipt date.
        </p>
      </div>

      <div
        className="panel grn-filter-bar grn-filter-bar--list"
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
          <div className="grn-filter-search">
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
              placeholder="GRN, PO, or supplier"
              style={{ width: '100%', height: 40, paddingLeft: 36 }}
            />
          </div>
        </FilterField>

        <FilterField label="Status">
          <div style={{ position: 'relative' }}>
            <select
              className="form-input"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              style={{ width: '100%', height: 40, appearance: 'none', paddingRight: 36 }}
            >
              {statusOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </FilterField>

        <FilterField label="Date Range">
          <div style={{ position: 'relative' }}>
            <select
              className="form-input"
              value={dateRange}
              onChange={changeDateRange}
              style={{ width: '100%', height: 40, appearance: 'none', paddingRight: 36 }}
            >
              {rangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {dateRange === 'custom' && (
                <option value="custom" hidden>
                  Custom range
                </option>
              )}
            </select>
            <SelectChevron />
          </div>
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
            style={{ width: '100%', height: 40 }}
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
            style={{ width: '100%', height: 40 }}
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
                <ClipboardCheck style={{ width: 17, height: 17 }} />
              </div>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Goods receipt register
                </h2>
                <p style={{ marginTop: 2, fontSize: 11, color: 'var(--color-text-dim)' }}>
                  Select a receipt to view details
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
              {filteredReceipts.length}
            </span>
          </div>

          <div style={{ minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
            {error && !selectedId ? (
              <div className="p-6 text-sm text-danger">{error}</div>
            ) : isLoading ? (
              <QueueMessage>Loading goods receipts...</QueueMessage>
            ) : filteredReceipts.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pagedReceipts.map((receipt) => {
                  const isSelected = receipt.id === selectedId
                  return (
                    <button
                      type="button"
                      key={receipt.id}
                      onClick={() => {
                        setError('')
                        setSelectedId(receipt.id)
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
                          {receipt.grNumber}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <StatusBadge status={receipt.statusLabel || 'Draft'} />
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
                          style={{ marginTop: 3, fontSize: 10, color: 'var(--color-text-dim)' }}
                        >
                          PO: {receipt.poNumber || 'N/A'}
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
                          {formatDate(receipt.receiptDate)}
                        </span>
                        <span
                          className="mono"
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {formatMoney(receipt.netAmount)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <QueueMessage>No goods receipts match the selected filters.</QueueMessage>
            )}
          </div>

          <SimplePagination
            page={receiptPage}
            pageSize={receiptPageSize}
            totalItems={filteredReceipts.length}
            onPageChange={setReceiptPage}
            itemLabel="receipts"
          />
        </section>

        <section
          className="panel responsive-detail-panel"
          style={{ padding: 16, minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden' }}
        >
          {isLoadingDetail ? (
            <DetailMessage>Loading goods receipt details...</DetailMessage>
          ) : selectedReceipt ? (
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
                      {selectedReceipt.grNumber}
                    </span>
                    <StatusBadge status={selectedReceipt.statusLabel || 'Draft'} />
                    {Number(selectedReceipt.status) === Number(GrnStatus.Draft) && (
                      <button
                        type="button"
                        className="button-primary"
                        onClick={() =>
                          navigate('/purchasing/goods-receipt-entry', {
                            state: {
                              preselectedPoId: selectedReceipt.purchaseOrderId,
                              preselectedGrnId: selectedReceipt.id,
                            },
                          })
                        }
                        style={{ height: 28, padding: '0 12px', fontSize: 11, fontWeight: 700 }}
                      >
                        Continue
                      </button>
                    )}
                  </div>
                  <div
                    style={{
                      width: 1,
                      height: 16,
                      background: 'var(--color-border)',
                    }}
                  />
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                    Purchase Order:{' '}
                    <span className="mono" style={{ color: 'var(--color-amber)', fontWeight: 600 }}>
                      {selectedReceipt.poNumber || 'N/A'}
                    </span>
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <HeaderDetail
                    icon={Building2}
                    label="Supplier"
                    value={selectedReceipt.supplierName || 'Not specified'}
                  />
                  <HeaderDetail
                    icon={CalendarDays}
                    label="Received"
                    value={
                      selectedReceipt.receiptDate
                        ? formatDate(selectedReceipt.receiptDate)
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
                    Received items
                  </h3>
                  <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                    {selectedReceipt.lines?.length || 0} item
                    {selectedReceipt.lines?.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div
                  className="responsive-table-shell"
                  style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
                >
                  <table className="data-table product-table-compact" style={{ minWidth: 1040 }}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th style={{ textAlign: 'right' }}>Received Qty</th>
                        <th style={{ textAlign: 'right' }}>Unit Cost</th>
                        <th style={{ textAlign: 'right' }}>MRP</th>
                        <th style={{ textAlign: 'right' }}>Rejected Qty</th>
                        <th>Reject Reason</th>
                        <th>Expiry</th>
                        <th style={{ textAlign: 'right' }}>Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedItems.map((line) => (
                        <tr key={line.id || line.purchaseOrderLineId}>
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
                          <td className="mono text-right font-semibold text-sm">
                            {formatMoney(line.mrp)}
                          </td>
                          <td className="text-right">
                            <span className="mono text-sm">
                              {Number(line.rejectedQtyBase || 0).toLocaleString(undefined, {
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
                              {formatDate(line.expiryDate)}
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
                    totalItems={selectedReceipt.lines?.length || 0}
                    onPageChange={setItemPage}
                    itemLabel="items"
                  />
                </div>
              </div>

              <div
                className="responsive-summary-grid"
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
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText style={{ width: 15, height: 15, color: 'var(--color-text-dim)' }} />
                    <span className="form-label">Receipt notes</span>
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      lineHeight: 1.6,
                      color: selectedReceipt.notes
                        ? 'var(--color-text-muted)'
                        : 'var(--color-text-dim)',
                      margin: 0,
                    }}
                  >
                    {selectedReceipt.notes || 'No notes were added to this goods receipt.'}
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
                  <SummaryRow label="Sub total" value={formatMoney(selectedReceipt.billTotal)} />
                  <SummaryRow label="Discount" value={formatMoney(selectedReceipt.discount)} />
                  <SummaryRow label="VAT" value={formatMoney(selectedReceipt.vatAmount)} />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span className="text-xs text-text-muted">Points adjustment</span>
                    {!isEditingAdjustment ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          className="mono text-xs"
                          style={{
                            color:
                              Number(selectedReceipt.adjustmentAmount) !== 0
                                ? 'var(--color-teal)'
                                : undefined,
                          }}
                        >
                          {formatMoney(selectedReceipt.adjustmentAmount)}
                        </span>
                        {canAdjust && Number(selectedReceipt.status) !== Number(GrnStatus.Rejected) ? (
                          <button
                            type="button"
                            aria-label="Edit points adjustment"
                            onClick={startEditingAdjustment}
                            style={{
                              alignItems: 'center',
                              background: 'transparent',
                              border: 0,
                              color: 'var(--color-text-dim)',
                              cursor: 'pointer',
                              display: 'flex',
                              padding: 2,
                            }}
                          >
                            <Pencil size={12} />
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {isEditingAdjustment ? (
                    <div
                      style={{
                        background: 'var(--color-bg-base)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 6,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        padding: 8,
                      }}
                    >
                      <input
                        className="form-input mono"
                        type="number"
                        step="0.01"
                        value={adjustmentAmount}
                        onChange={(event) => setAdjustmentAmount(event.target.value)}
                        placeholder="Amount"
                        style={{ height: 30, fontSize: 12 }}
                      />
                      <input
                        className="form-input"
                        type="text"
                        value={adjustmentReason}
                        onChange={(event) => setAdjustmentReason(event.target.value)}
                        placeholder="Reason (optional)"
                        style={{ height: 30, fontSize: 12 }}
                      />
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="button-secondary"
                          disabled={isSavingAdjustment}
                          onClick={() => setIsEditingAdjustment(false)}
                          style={{ height: 26, fontSize: 11, padding: '0 8px' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="button-primary"
                          disabled={isSavingAdjustment}
                          onClick={saveAdjustment}
                          style={{ height: 26, fontSize: 11, padding: '0 8px' }}
                        >
                          {isSavingAdjustment ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : null}

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
                      {formatMoney(selectedReceipt.netAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : error ? (
            <DetailMessage>{error}</DetailMessage>
          ) : (
            <DetailMessage icon>
              Select a goods receipt to review its supplier, products, status, dates, and totals.
            </DetailMessage>
          )}
        </section>
      </div>
    </div>
  )
}

function FilterField({ label, children }) {
  return (
    <label
      className="grn-filter-field"
      style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}
    >
      <span className="form-label">{label}</span>
      {children}
    </label>
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
          <ClipboardCheck style={{ width: 25, height: 25 }} />
        </div>
      ) : null}
      {children}
    </div>
  )
}

function HeaderDetail({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon style={{ width: 14, height: 14, color: 'var(--color-text-dim)' }} />
      <div>
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: 'var(--color-text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
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
