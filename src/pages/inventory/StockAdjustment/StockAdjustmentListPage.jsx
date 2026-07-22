import { ChevronDown, ChevronRight, Plus, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStockAdjustment, useStockAdjustments } from '@/hooks/useStockAdjustment'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import {
  STATUS_COLORS,
  STOCK_ADJUSTMENT_STATUSES,
  formatNumber,
  statusLabel,
} from './stockAdjustmentUtils'

function StatusPill({ status }) {
  const label = statusLabel(status)
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        STATUS_COLORS[label] || STATUS_COLORS.Draft
      }`}
    >
      {label}
    </span>
  )
}

function AdjustmentDetails({ adjustment, isLoading }) {
  if (isLoading) {
    return <div style={{ color: 'var(--color-text-muted)', padding: 18 }}>Loading details...</div>
  }
  if (!adjustment) return null

  return (
    <div
      style={{
        background: 'color-mix(in srgb, var(--color-teal) 4%, var(--color-bg-elevated))',
        borderTop: '1px solid var(--color-border)',
        padding: 16,
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: 10,
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          marginBottom: 14,
        }}
      >
        <DetailItem label="Stock Location" value={adjustment.stockLocationId} mono />
        <DetailItem label="Created By" value={adjustment.createdByUserId} mono />
        <DetailItem label="Applied On" value={formatDateTime(adjustment.appliedOn)} mono />
        <DetailItem label="Notes" value={adjustment.notes || 'No notes'} />
      </div>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
        <table className="data-table product-table-compact">
          <thead>
            <tr>
              <th>Type</th>
              <th>Product</th>
              <th>Batch</th>
              <th className="text-right">Quantity</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {adjustment.lines?.length ? (
              adjustment.lines.map((line) => {
                const isIn = line.adjustmentType === 'AdjustmentIn' || line.adjustmentType === 1
                return (
                  <tr key={line.id}>
                    <td>
                      <span
                        className={`rounded border px-2 py-0.5 text-xs font-semibold ${
                          isIn
                            ? 'border-green-800/50 bg-green-900/20 text-green-400'
                            : 'border-red-800/50 bg-red-900/20 text-red-400'
                        }`}
                      >
                        {isIn ? '↑ IN' : '↓ OUT'}
                      </span>
                    </td>
                    <td className="mono" style={{ color: 'var(--color-teal)' }}>
                      {line.productSku}
                    </td>
                    <td className="mono">{line.batchNo || '-'}</td>
                    <td
                      className="mono text-right"
                      style={{ color: isIn ? '#4ade80' : 'var(--color-danger)' }}
                    >
                      {isIn ? '+' : '−'}
                      {formatNumber(line.qtySmallest)}
                    </td>
                    <td>{line.lineNotes || '—'}</td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={5}>No adjustment lines were recorded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DetailItem({ label, value, mono = false }) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px' }}>
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
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={String(value || '')}
      >
        {value || '—'}
      </div>
    </div>
  )
}

export default function StockAdjustmentListPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState('')
  const {
    data: adjustments = [],
    isLoading,
    isFetching,
    refetch,
  } = useStockAdjustments(statusFilter ? { status: statusFilter } : {})
  const { data: selectedAdjustment, isLoading: isLoadingDetail } = useStockAdjustment(expandedId)

  return (
    <div className="responsive-page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          alignItems: 'flex-start',
          display: 'flex',
          gap: 16,
          justifyContent: 'space-between',
        }}
      >
        <div>
          <p className="eyebrow">Inventory</p>
          <h1 style={{ color: 'var(--color-text-primary)', fontSize: 26, fontWeight: 700 }}>
            Stock Adjustments
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>
            Correct inventory discrepancies found during physical counts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="button-secondary"
            onClick={() => refetch()}
            style={{ height: 38 }}
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            className="button-primary"
            onClick={() => navigate('/inventory/stock-adjustments/new')}
            style={{ height: 38 }}
          >
            <Plus size={15} />
            New Adjustment
          </button>
        </div>
      </div>

      <div className="panel" style={{ display: 'flex', gap: 6, padding: '10px 12px' }}>
        <SlidersHorizontal
          size={15}
          style={{ color: 'var(--color-text-dim)', margin: '8px 6px 0 2px' }}
        />
        {STOCK_ADJUSTMENT_STATUSES.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => {
              setStatusFilter(tab.value)
              setExpandedId('')
            }}
            style={{
              background:
                statusFilter === tab.value
                  ? 'color-mix(in srgb, var(--color-teal) 14%, transparent)'
                  : 'transparent',
              border:
                statusFilter === tab.value
                  ? '1px solid color-mix(in srgb, var(--color-teal) 35%, transparent)'
                  : '1px solid transparent',
              borderRadius: 7,
              color: statusFilter === tab.value ? 'var(--color-teal)' : 'var(--color-text-muted)',
              fontSize: 12,
              fontWeight: 700,
              padding: '7px 12px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="panel" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Adjustment No</th>
                <th>Date</th>
                <th>Reason</th>
                <th className="text-right">Lines</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center' }}>
                    Loading adjustments...
                  </td>
                </tr>
              ) : adjustments.length ? (
                adjustments.map((adjustment) => {
                  const expanded = expandedId === adjustment.id
                  return (
                    <Fragment key={adjustment.id}>
                      <tr>
                        <td
                          className="mono"
                          style={{ color: 'var(--color-teal)', fontWeight: 800 }}
                        >
                          {adjustment.adjustmentNo}
                        </td>
                        <td className="mono">{formatDate(adjustment.createdAt)}</td>
                        <td style={{ color: 'var(--color-text-primary)', fontWeight: 650 }}>
                          {adjustment.reason}
                        </td>
                        <td className="mono text-right">{adjustment.lineCount}</td>
                        <td>
                          <StatusPill status={adjustment.status} />
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => setExpandedId(expanded ? '' : adjustment.id)}
                            style={{ height: 30 }}
                          >
                            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {expanded ? 'Close' : 'View'}
                          </button>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr>
                          <td colSpan={6} style={{ padding: 0 }}>
                            <AdjustmentDetails
                              adjustment={selectedAdjustment}
                              isLoading={isLoadingDetail}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: 'center' }}>
                    No adjustments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
