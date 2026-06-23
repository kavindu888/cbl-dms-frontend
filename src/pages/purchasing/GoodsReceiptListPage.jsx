import dayjs from 'dayjs'
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FilePlus2,
  PackageCheck,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '@components/ui/StatusBadge'
import SimplePagination from '@components/ui/SimplePagination'
import { purchasingService } from '@services/api/purchasingService'
import { GrnStatus } from '@/types/purchasing.types'

const pageSize = 12

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: GrnStatus.Draft, label: 'Draft' },
  { value: GrnStatus.Received, label: 'Received' },
  { value: GrnStatus.Verified, label: 'Verified' },
  { value: GrnStatus.Rejected, label: 'Rejected' },
]

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getActionLabel(receipt) {
  const status = Number(receipt.status)
  if (status === GrnStatus.Draft) return 'Continue'
  if (status === GrnStatus.Received) return 'Review'
  return 'View'
}

function getLifoDate(receipt) {
  return dayjs(receipt.createdAt || receipt.receiptDate)
}

export default function GoodsReceiptListPage() {
  const navigate = useNavigate()
  const [receipts, setReceipts] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [toDate, setToDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'))
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadReceipts = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await purchasingService.listGoodsReceipts({
        page: 1,
        pageSize: 100,
        status: status || undefined,
      })
      setReceipts(result?.items || [])
    } catch (requestError) {
      setError(requestError.message)
      setReceipts([])
    } finally {
      setIsLoading(false)
    }
  }, [status])

  useEffect(() => {
    loadReceipts()
  }, [loadReceipts])

  const filteredReceipts = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = receipts.filter((receipt) => {
      const receiptDate = dayjs(receipt.receiptDate).format('YYYY-MM-DD')
      const matchesSearch =
        !query ||
        receipt.grNumber?.toLowerCase().includes(query) ||
        receipt.poNumber?.toLowerCase().includes(query) ||
        receipt.supplierName?.toLowerCase().includes(query)
      const matchesFrom = !fromDate || receiptDate >= fromDate
      const matchesTo = !toDate || receiptDate <= toDate

      return matchesSearch && matchesFrom && matchesTo
    })

    return [...filtered].sort((a, b) => {
      const dateA = getLifoDate(a)
      const dateB = getLifoDate(b)
      if (!dateA.isSame(dateB)) {
        return dateB.isAfter(dateA) ? 1 : -1
      }
      return b.grNumber.localeCompare(a.grNumber, undefined, { numeric: true, sensitivity: 'base' })
    })
  }, [fromDate, receipts, search, toDate])

  const pagedReceipts = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredReceipts.slice(start, start + pageSize)
  }, [filteredReceipts, page])

  useEffect(() => {
    setPage(1)
  }, [fromDate, search, status, toDate])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / pageSize))
    if (page > totalPages) setPage(totalPages)
  }, [filteredReceipts.length, page])

  function clearFilters() {
    setSearch('')
    setStatus('')
    setFromDate('')
    setToDate('')
  }

  return (
    <div
      style={{
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Goods Receipts
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Track GRNs from draft receiving through verification.
          </p>
        </div>
        <button
          type="button"
          className="button-primary"
          onClick={() => navigate('/purchasing/approved')}
          style={{ height: 40, padding: '0 16px' }}
        >
          <FilePlus2 size={16} /> New GRN
        </button>
      </div>

      <section
        className="panel"
        style={{
          padding: 16,
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 1fr) 180px repeat(2, minmax(145px, 170px)) auto auto',
          alignItems: 'end',
          gap: 12,
        }}
      >
        <Field label="Search">
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                color: 'var(--color-text-dim)',
                transform: 'translateY(-50%)',
              }}
            />
            <input
              className="form-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="GRN, PO, or supplier"
              style={{ paddingLeft: 36 }}
            />
          </div>
        </Field>
        <Field label="Status">
          <select
            className="form-input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="From Date">
          <input
            type="date"
            className="form-input"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) => setFromDate(event.target.value)}
            style={{ colorScheme: 'dark' }}
          />
        </Field>
        <Field label="To Date">
          <input
            type="date"
            className="form-input"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => setToDate(event.target.value)}
            style={{ colorScheme: 'dark' }}
          />
        </Field>
        <button
          type="button"
          className="button-secondary"
          onClick={clearFilters}
          style={{ height: 40 }}
        >
          <X size={15} /> Clear
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={loadReceipts}
          disabled={isLoading}
          title="Refresh goods receipts"
          style={{ width: 40, height: 40 }}
        >
          <RefreshCw size={16} />
        </button>
      </section>

      <section
        className="panel"
        style={{
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        <div
          style={{
            padding: '13px 16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PackageCheck size={16} color="var(--color-teal)" />
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>GRN Register</h2>
          </div>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {filteredReceipts.length} receipts
          </span>
        </div>

        {error ? (
          <EmptyMessage>{error}</EmptyMessage>
        ) : isLoading ? (
          <EmptyMessage>Loading goods receipts...</EmptyMessage>
        ) : filteredReceipts.length ? (
          <div style={{ overflowX: 'auto', flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <table className="data-table product-table-compact" style={{ minWidth: 920 }}>
              <thead>
                <tr>
                  <th>GRN</th>
                  <th>Purchase Order</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Lines</th>
                  <th style={{ textAlign: 'right' }}>Net Amount (Rs.)</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {pagedReceipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--color-amber)' }}>
                      {receipt.grNumber}
                    </td>
                    <td className="mono">{receipt.poNumber}</td>
                    <td>{receipt.supplierName}</td>
                    <td>
                      <StatusBadge status={receipt.statusLabel || 'Draft'} />
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <CalendarDays size={13} color="var(--color-text-dim)" />
                        {dayjs(receipt.receiptDate).format('DD MMM YYYY')}
                      </span>
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {receipt.lineCount}
                    </td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                      {formatMoney(receipt.netAmount)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`btn-table-action ${
                          getActionLabel(receipt) === 'View'
                            ? 'btn-table-action-view'
                            : 'btn-table-action-continue'
                        }`}
                        onClick={() => navigate(`/purchasing/goods-receipts/${receipt.id}`)}
                      >
                        <span>{getActionLabel(receipt)}</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyMessage>No goods receipts match the selected filters.</EmptyMessage>
        )}

        <div style={{ padding: '0 16px 12px' }}>
          <SimplePagination
            page={page}
            pageSize={pageSize}
            totalItems={filteredReceipts.length}
            onPageChange={setPage}
            itemLabel="receipts"
          />
        </div>
      </section>
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

function EmptyMessage({ children }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        color: 'var(--color-text-muted)',
        textAlign: 'center',
        fontSize: 13,
      }}
    >
      <div>
        <ClipboardCheck
          size={34}
          style={{ margin: '0 auto 10px', color: 'var(--color-text-dim)' }}
        />
        {children}
      </div>
    </div>
  )
}
