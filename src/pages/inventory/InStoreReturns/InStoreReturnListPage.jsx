import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  Package,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SimplePagination from '@components/ui/SimplePagination'
import { useInStoreReturn, useInStoreReturns } from '@/hooks/useInStoreReturn'
import {
  IN_STORE_RETURN_STATUSES,
  formatNumber,
  reasonLabel,
  statusLabel,
} from './inStoreReturnUtils'

dayjs.extend(utc)
dayjs.extend(timezone)

const returnPageSize = 3
const linePageSize = 6

const STATUS_COLORS = {
  Draft: 'bg-amber-500/10 text-amber-400 border border-amber-700/50',
  Submitted: 'bg-blue-500/10 text-blue-400 border border-blue-700/50',
  Approved: 'bg-purple-500/10 text-purple-400 border border-purple-700/50',
  Applied: 'bg-green-500/10 text-green-400 border border-green-700/50',
  Cancelled: 'bg-gray-700/30 text-gray-500 border border-gray-700/30',
}

function formatColomboDate(value, format = 'DD MMM YYYY') {
  return value ? dayjs.utc(value).tz('Asia/Colombo').format(format) : '-'
}

function formatUserId(value) {
  if (!value) return '-'
  return value.length > 8 ? `...${value.slice(-8)}` : value
}

function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        STATUS_COLORS[status] || STATUS_COLORS.Draft
      }`}
    >
      {status}
    </span>
  )
}

function QueueMessage({ children }) {
  return (
    <div
      style={{
        color: 'var(--color-text-muted)',
        display: 'grid',
        fontSize: 13,
        height: '100%',
        minHeight: 0,
        placeItems: 'center',
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  )
}

function DetailMessage({ children }) {
  return (
    <div
      style={{
        alignItems: 'center',
        color: 'var(--color-text-muted)',
        display: 'flex',
        flexDirection: 'column',
        fontSize: 12,
        gap: 12,
        height: '100%',
        justifyContent: 'center',
        minHeight: 0,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          color: 'var(--color-text-dim)',
          display: 'grid',
          height: 52,
          placeItems: 'center',
          width: 52,
        }}
      >
        <ClipboardList size={25} />
      </div>
      {children}
    </div>
  )
}

function DetailMetric({ label, value, mono = false }) {
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '10px 12px',
      }}
    >
      <div className="form-label" style={{ fontSize: 10 }}>
        {label}
      </div>
      <div
        className={mono ? 'mono' : ''}
        style={{
          color: 'var(--color-text-primary)',
          fontSize: 12,
          fontWeight: 700,
          marginTop: 5,
        }}
      >
        {value || '-'}
      </div>
    </div>
  )
}

export default function InStoreReturnListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [returnPage, setReturnPage] = useState(1)
  const [linePage, setLinePage] = useState(1)
  const [selectedId, setSelectedId] = useState('')

  const params = useMemo(() => (status ? { status } : {}), [status])
  const { data: returns = [], isLoading, refetch, isFetching } = useInStoreReturns(params)
  const { data: selectedReturn, isLoading: isLoadingDetail } = useInStoreReturn(selectedId)

  const filteredReturns = useMemo(() => {
    const query = search.trim().toLowerCase()
    return returns
      .filter((item) => {
        const returnNo = item.inStoreReturnNo || item.id || ''
        const displayStatus = statusLabel(item.status)
        const displayReason = reasonLabel(item.reason)
        const createdDate = item.createdAt
          ? dayjs.utc(item.createdAt).tz('Asia/Colombo').format('YYYY-MM-DD')
          : ''

        return (
          (!query ||
            returnNo.toLowerCase().includes(query) ||
            displayReason.toLowerCase().includes(query) ||
            displayStatus.toLowerCase().includes(query)) &&
          (!dateFilter || createdDate === dateFilter)
        )
      })
      .sort((a, b) => {
        const dateA = dayjs(a.createdAt || 0)
        const dateB = dayjs(b.createdAt || 0)
        if (!dateA.isSame(dateB)) return dateB.isAfter(dateA) ? 1 : -1
        return String(b.inStoreReturnNo || '').localeCompare(String(a.inStoreReturnNo || ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      })
  }, [dateFilter, returns, search])

  const pagedReturns = useMemo(() => {
    const start = (returnPage - 1) * returnPageSize
    return filteredReturns.slice(start, start + returnPageSize)
  }, [filteredReturns, returnPage])

  const pagedLines = useMemo(() => {
    const lines = selectedReturn?.lines || []
    const start = (linePage - 1) * linePageSize
    return lines.slice(start, start + linePageSize)
  }, [linePage, selectedReturn])

  useEffect(() => {
    setReturnPage(1)
  }, [dateFilter, search, status])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredReturns.length / returnPageSize))
    if (returnPage > totalPages) setReturnPage(totalPages)
  }, [filteredReturns.length, returnPage])

  useEffect(() => {
    if (!filteredReturns.length) {
      setSelectedId('')
      return
    }
    const exists = filteredReturns.some((item) => item.id === selectedId)
    if (!exists) setSelectedId(filteredReturns[0].id)
  }, [filteredReturns, selectedId])

  useEffect(() => {
    setLinePage(1)
  }, [selectedId])

  function clearFilters() {
    setStatus('')
    setSearch('')
    setDateFilter('')
    setSelectedId('')
  }

  return (
    <div
      className="responsive-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div style={{ alignItems: 'flex-start', display: 'flex', gap: 16, justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: 'var(--color-text-primary)', fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>
            In-Store Returns
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>
            Review store return movements and the exact batch lines moved to return stock.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="button-secondary"
            onClick={() => refetch()}
            style={{ alignItems: 'center', display: 'flex', gap: 8, height: 38 }}
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            className="button-primary"
            onClick={() => navigate('/inventory/in-store-returns/new')}
            style={{ alignItems: 'center', display: 'flex', gap: 8, height: 38 }}
          >
            <Plus size={15} />
            New In-Store Return
          </button>
        </div>
      </div>

      <div
        className="panel responsive-filter-bar"
        style={{
          alignItems: 'center',
          display: 'flex',
          flexShrink: 0,
          gap: 16,
          padding: 16,
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            style={{
              color: 'var(--color-text-dim)',
              height: 16,
              left: 12,
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
            }}
          />
          <input
            className="form-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by ISR number, reason, or status..."
            style={{ background: 'rgba(0,0,0,0.15)', height: 40, paddingLeft: 36, width: '100%' }}
          />
        </div>

        <select
          className="form-input"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          style={{ background: 'rgba(0,0,0,0.15)', height: 40, width: 190 }}
        >
          {IN_STORE_RETURN_STATUSES.map((tab) => (
            <option key={tab.label} value={tab.value}>
              {tab.label === 'All' ? 'All statuses' : tab.label}
            </option>
          ))}
        </select>

        <input
          className="form-input mono"
          type="date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          style={{ background: 'rgba(0,0,0,0.15)', height: 40, width: 160 }}
        />

        <button
          type="button"
          className="button-secondary"
          onClick={clearFilters}
          style={{ alignItems: 'center', display: 'flex', gap: 7, height: 40 }}
        >
          <X size={15} />
          Clear
        </button>
      </div>

      <div
        className="responsive-master-detail"
        style={{
          alignItems: 'stretch',
          display: 'grid',
          flex: 1,
          gap: 16,
          gridTemplateColumns: 'minmax(320px, 380px) minmax(0, 1fr)',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <section
          className="panel responsive-queue-panel"
          style={{
            display: 'grid',
            gridTemplateRows: 'auto minmax(0, 1fr) auto',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            padding: 12,
          }}
        >
          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              gap: 12,
              justifyContent: 'space-between',
              padding: '4px 4px 14px',
            }}
          >
            <div style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
              <div
                style={{
                  background: 'rgba(142, 232, 240, 0.1)',
                  border: '1px solid rgba(142, 232, 240, 0.2)',
                  borderRadius: 8,
                  color: 'var(--color-teal)',
                  display: 'grid',
                  height: 34,
                  placeItems: 'center',
                  width: 34,
                }}
              >
                <ClipboardList size={17} />
              </div>
              <div>
                <h2 style={{ color: 'var(--color-text-primary)', fontSize: 14, fontWeight: 700 }}>
                  In-store return register
                </h2>
                <p style={{ color: 'var(--color-text-dim)', fontSize: 11, marginTop: 2 }}>
                  Select a return to view lines
                </p>
              </div>
            </div>
            <span
              style={{
                background: 'rgba(142, 232, 240, 0.1)',
                borderRadius: 999,
                color: 'var(--color-teal)',
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 9px',
              }}
            >
              {filteredReturns.length}
            </span>
          </div>

          <div style={{ minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
            {isLoading ? (
              <QueueMessage>Loading in-store returns...</QueueMessage>
            ) : filteredReturns.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pagedReturns.map((item) => {
                  const isSelected = item.id === selectedId
                  const displayStatus = statusLabel(item.status)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      style={{
                        background: isSelected
                          ? 'color-mix(in srgb, var(--color-teal) 10%, transparent)'
                          : 'var(--color-bg-elevated)',
                        border: isSelected
                          ? '1px solid color-mix(in srgb, var(--color-teal) 45%, transparent)'
                          : '1px solid var(--color-border)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 11,
                        padding: 13,
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <div style={{ alignItems: 'center', display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                        <span className="mono" style={{ color: 'var(--color-amber)', fontSize: 12, fontWeight: 800 }}>
                          {item.inStoreReturnNo || item.id}
                        </span>
                        <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                          <StatusPill status={displayStatus} />
                          <ChevronRight
                            size={15}
                            style={{ color: isSelected ? 'var(--color-teal)' : 'var(--color-text-dim)' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 700 }}>
                          {reasonLabel(item.reason)}
                        </span>
                        <span className="mono" style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                          {item.lineCount ?? item.lines?.length ?? 0} line
                          {(item.lineCount ?? item.lines?.length ?? 0) === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div
                        style={{
                          alignItems: 'center',
                          borderTop: '1px solid var(--color-border)',
                          display: 'flex',
                          gap: 12,
                          justifyContent: 'space-between',
                          paddingTop: 10,
                        }}
                      >
                        <span style={{ alignItems: 'center', color: 'var(--color-text-muted)', display: 'flex', fontSize: 11, gap: 6 }}>
                          <CalendarDays size={13} />
                          {formatColomboDate(item.createdAt)}
                        </span>
                        <span className="mono" style={{ color: 'var(--color-text-dim)', fontSize: 11 }}>
                          {formatUserId(item.createdByUserId)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <QueueMessage>No in-store returns match the selected filters.</QueueMessage>
            )}
          </div>

          <SimplePagination
            page={returnPage}
            pageSize={returnPageSize}
            totalItems={filteredReturns.length}
            onPageChange={setReturnPage}
            itemLabel="returns"
          />
        </section>

        <section
          className="panel responsive-detail-panel"
          style={{ height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden', padding: 16 }}
        >
          {isLoadingDetail ? (
            <DetailMessage>Loading in-store return details...</DetailMessage>
          ) : selectedReturn ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', minHeight: 0 }}>
              <div
                style={{
                  alignItems: 'center',
                  background:
                    'linear-gradient(135deg, var(--color-bg-surface), var(--color-bg-elevated))',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  boxShadow: 'var(--shadow-card)',
                  display: 'flex',
                  gap: 16,
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                }}
              >
                <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <span className="mono" style={{ color: 'var(--color-amber)', fontSize: 15, fontWeight: 800 }}>
                    {selectedReturn.inStoreReturnNo || selectedReturn.id}
                  </span>
                  <StatusPill status={statusLabel(selectedReturn.status)} />
                  <StatusPill status={reasonLabel(selectedReturn.reason)} />
                  <div style={{ background: 'var(--color-border)', height: 16, width: 1 }} />
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 12, margin: 0 }}>
                    Return header and batch movement details.
                  </p>
                </div>
                <div style={{ alignItems: 'center', display: 'flex', gap: 20 }}>
                  <HeaderDetail label="Applied" value={formatColomboDate(selectedReturn.appliedOn, 'DD MMM YYYY HH:mm')} />
                  <HeaderDetail label="Lines" value={selectedReturn.lines?.length ?? 0} />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 10,
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                }}
              >
                <DetailMetric
                  label="Created By"
                  value={selectedReturn.createdByName || formatUserId(selectedReturn.createdByUserId)}
                  mono
                />
                <DetailMetric label="Reason" value={reasonLabel(selectedReturn.reason)} />
                <DetailMetric
                  label="Applied On"
                  value={formatColomboDate(selectedReturn.appliedOn, 'DD MMM YYYY HH:mm')}
                  mono
                />
                <DetailMetric
                  label="Cancelled On"
                  value={formatColomboDate(selectedReturn.cancelledOn, 'DD MMM YYYY HH:mm')}
                  mono
                />
              </div>

              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  display: 'flex',
                  flex: 1,
                  flexDirection: 'column',
                  minHeight: 180,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    alignItems: 'center',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    gap: 8,
                    padding: '12px 14px',
                  }}
                >
                  <Package size={15} color="var(--color-teal)" />
                  <h3 style={{ color: 'var(--color-text-primary)', fontSize: 12, fontWeight: 700 }}>
                    Return lines
                  </h3>
                  <span style={{ color: 'var(--color-text-dim)', fontSize: 11 }}>
                    {selectedReturn.lines?.length || 0} item
                    {selectedReturn.lines?.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  {selectedReturn.lines?.length ? (
                    <table className="data-table product-table-compact">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Batch</th>
                          <th style={{ textAlign: 'right' }}>Qty</th>
                          <th style={{ textAlign: 'right' }}>Unit Cost</th>
                          <th style={{ textAlign: 'right' }}>MRP</th>
                          <th>Line Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedLines.map((line) => (
                          <tr key={line.id}>
                            <td>
                              <div style={{ alignItems: 'flex-start', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <span className="product-sku-badge mono">{line.productSku}</span>
                                <span className="product-info-sub">{line.productName || 'Product'}</span>
                              </div>
                            </td>
                            <td className="mono">{line.batchNo || '-'}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>
                              {formatNumber(line.qtySmallest)}
                            </td>
                            <td className="mono" style={{ textAlign: 'right' }}>
                              Rs. {formatNumber(line.unitCostSmallest)}
                            </td>
                            <td className="mono" style={{ textAlign: 'right' }}>
                              Rs. {formatNumber(line.mrp)}
                            </td>
                            <td>
                              {line.lineReason
                                ? reasonLabel(line.lineReason)
                                : `${reasonLabel(selectedReturn.reason)} (header)`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <QueueMessage>No return lines were recorded for this return.</QueueMessage>
                  )}
                </div>

                <div style={{ padding: '0 12px 8px' }}>
                  <SimplePagination
                    page={linePage}
                    pageSize={linePageSize}
                    totalItems={selectedReturn.lines?.length || 0}
                    onPageChange={setLinePage}
                    itemLabel="items"
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 14,
                  gridTemplateColumns: 'minmax(0, 1fr) 280px',
                }}
              >
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 14 }}>
                  <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                    <FileText size={15} color="var(--color-text-dim)" />
                    <span className="form-label">Notes</span>
                  </div>
                  <p
                    style={{
                      color: selectedReturn.notes ? 'var(--color-text-muted)' : 'var(--color-text-dim)',
                      fontSize: 12,
                      lineHeight: 1.6,
                      marginTop: 10,
                    }}
                  >
                    {selectedReturn.notes || 'No notes recorded for this in-store return.'}
                  </p>
                  {selectedReturn.cancelReason ? (
                    <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 10 }}>
                      Cancel reason: {selectedReturn.cancelReason}
                    </p>
                  ) : null}
                </div>

                <div
                  style={{
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    padding: 14,
                  }}
                >
                  <SummaryRow label="Lines" value={selectedReturn.lines?.length ?? 0} />
                  <SummaryRow
                    label="Total Qty"
                    value={formatNumber(
                      (selectedReturn.lines || []).reduce(
                        (sum, line) => sum + Number(line.qtySmallest || 0),
                        0
                      )
                    )}
                  />
                  <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
                  <SummaryRow label="Status" value={statusLabel(selectedReturn.status)} strong />
                </div>
              </div>
            </div>
          ) : (
            <DetailMessage>Select an in-store return to view its header, notes, and batch lines.</DetailMessage>
          )}
        </section>
      </div>
    </div>
  )
}

function HeaderDetail({ label, value }) {
  return (
    <div>
      <div
        style={{
          color: 'var(--color-text-dim)',
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div style={{ color: 'var(--color-text-primary)', fontSize: 12, fontWeight: 600 }}>
        {value}
      </div>
    </div>
  )
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div style={{ display: 'flex', fontSize: 12, justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span
        className="mono"
        style={{
          color: strong ? 'var(--color-amber)' : 'var(--color-text-primary)',
          fontWeight: strong ? 800 : 600,
        }}
      >
        {value}
      </span>
    </div>
  )
}
