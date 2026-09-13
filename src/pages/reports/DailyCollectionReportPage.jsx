import { keepPreviousData, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  Banknote,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  ReceiptText,
  Search,
  X,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import SimplePagination from '@components/ui/SimplePagination'
import { inventoryService } from '@/services/api/inventoryService'
import { reportsService } from '@/services/api/reportsService'
import { formatDate } from '@/utils'
import { downloadExcel, openPdfInNewTab } from '@/utils/fileDownload'
import { formatLKR } from '@/utils/formatCurrency'

const pageSize = 20

const METHOD_OPTIONS = [
  { value: '1', label: 'Cash' },
  { value: '2', label: 'Cheque' },
  { value: '3', label: 'Bank Transfer' },
]

function selectStyle(disabled) {
  return {
    width: '100%',
    height: 40,
    background: 'rgba(0,0,0,0.15)',
    border: '1px solid var(--color-border)',
    borderRadius: 6,
    color: 'var(--color-text-primary)',
    fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    appearance: 'none',
    paddingLeft: 12,
    paddingRight: 36,
  }
}

function inputStyle() {
  return {
    width: '100%',
    height: 40,
    background: 'rgba(0,0,0,0.15)',
    border: '1px solid var(--color-border)',
    borderRadius: 6,
    color: 'var(--color-text-primary)',
    fontSize: 14,
  }
}

function FilterSelect({ value, onChange, options, placeholder, width = 220, disabled }) {
  return (
    <div style={{ position: 'relative', width }}>
      <select
        className="form-input"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        style={selectStyle(disabled)}
      >
        <option value="" style={{ background: 'var(--color-bg-elevated)' }}>
          {placeholder}
        </option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            style={{ background: 'var(--color-bg-elevated)' }}
          >
            {option.label}
          </option>
        ))}
      </select>
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
    </div>
  )
}

function DateFilter({ value, onChange, placeholder, width = 170 }) {
  return (
    <div style={{ width }}>
      <input
        type="date"
        className="form-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        title={placeholder}
        style={inputStyle()}
      />
    </div>
  )
}

function read(row, camelKey, pascalKey = camelKey.charAt(0).toUpperCase() + camelKey.slice(1)) {
  return row?.[camelKey] ?? row?.[pascalKey]
}

function normalizeSummaryRow(row) {
  return {
    sessionId: read(row, 'sessionId') ?? '',
    sessionNumber: read(row, 'sessionNumber') ?? 'Unknown session',
    vehicleId: read(row, 'vehicleId') ?? '',
    vehicleName: read(row, 'vehicleName') ?? '',
    collectorId: read(row, 'collectorId') ?? '',
    collectorName: read(row, 'collectorName') ?? '',
    sessionDate: read(row, 'sessionDate') ?? null,
    sessionStatusCode: Number(read(row, 'sessionStatusCode') ?? 0),
    deliveryRunId: read(row, 'deliveryRunId') ?? '',
    deliveryRunName: read(row, 'deliveryRunName') ?? '',
    totalSalesGross: Number(read(row, 'totalSalesGross') ?? 0),
    cashToday: Number(read(row, 'cashToday') ?? 0),
    cashOldInvoice: Number(read(row, 'cashOldInvoice') ?? 0),
    cashUnclassified: Number(read(row, 'cashUnclassified') ?? 0),
    chequeToday: Number(read(row, 'chequeToday') ?? 0),
    chequeOldInvoice: Number(read(row, 'chequeOldInvoice') ?? 0),
    chequeUnclassified: Number(read(row, 'chequeUnclassified') ?? 0),
    creditGivenToday: Number(read(row, 'creditGivenToday') ?? 0),
    chequesProcessedCount: Number(read(row, 'chequesProcessedCount') ?? 0),
    goodsReturnsTotal: Number(read(row, 'goodsReturnsTotal') ?? 0),
    physicalCashAmount: read(row, 'physicalCashAmount') ?? null,
    projectedCashSimplified: Number(read(row, 'projectedCashSimplified') ?? 0),
    cashDifference: read(row, 'cashDifference') ?? null,
    cashStatus: read(row, 'cashStatus') ?? 'Not Recorded',
  }
}

function vehicleLabel(vehicle) {
  return [vehicle.vehicleCode || vehicle.code, vehicle.name].filter(Boolean).join(' - ')
}

function statusStyles(status) {
  if (status === 'Balanced') {
    return { color: '#166534', background: '#dcfce7', border: '#86efac' }
  }
  if (status === 'Short') {
    return { color: '#991b1b', background: '#fee2e2', border: '#fca5a5' }
  }
  if (status === 'Excess') {
    return { color: '#1d4ed8', background: '#dbeafe', border: '#93c5fd' }
  }
  return { color: '#4b5563', background: '#f3f4f6', border: '#d1d5db' }
}

function StatusBadge({ status }) {
  const styles = statusStyles(status)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 96,
        padding: '4px 9px',
        border: `1px solid ${styles.border}`,
        borderRadius: 999,
        background: styles.background,
        color: styles.color,
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {status}
    </span>
  )
}

function SectionPanel({ title, children, tone }) {
  return (
    <div
      style={{
        padding: 12,
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        background: tone || 'color-mix(in srgb, var(--color-bg-elevated) 55%, transparent)',
      }}
    >
      <div
        style={{
          paddingBottom: 8,
          marginBottom: 8,
          borderBottom: '1px solid var(--color-border)',
          color: 'var(--color-blue, #2563eb)',
          fontSize: 13,
          fontWeight: 850,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'grid', gap: 7 }}>{children}</div>
    </div>
  )
}

function AmountLine({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <strong className="mono" style={{ textAlign: 'right' }}>
        {formatLKR(value)}
      </strong>
    </div>
  )
}

function ValueLine({ label, value, valueNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      {valueNode || (
        <strong className="mono" style={{ textAlign: 'right' }}>
          {value}
        </strong>
      )}
    </div>
  )
}

function ExpandedSummary({ row }) {
  const cashTone = statusStyles(row.cashStatus)
  const cashDifference = row.cashDifference == null ? null : Number(row.cashDifference)
  const collector = row.collectorName || row.collectorId || 'Unassigned'
  return (
    <div style={{ padding: 14, display: 'grid', gap: 12 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 8,
          padding: '10px 12px',
          border: '1px solid var(--color-border)',
          borderRadius: 6,
          background: 'color-mix(in srgb, var(--color-bg-elevated) 55%, transparent)',
          fontSize: 13,
        }}
      >
        <ValueLine label="Collected By" value={collector} />
        <ValueLine
          label="Delivery Run"
          value={row.deliveryRunName || row.deliveryRunId || 'Unassigned'}
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        <SectionPanel title="Sales & Collection Summary">
          <AmountLine label="Total Sales (Actual Bill)" value={row.totalSalesGross} />
          <AmountLine label="Sale Cash Balance" value={row.cashToday} />
          <AmountLine label="Sale Cheque Collection" value={row.chequeToday} />
          <AmountLine label="Sale Credits (To-Pays)" value={row.creditGivenToday} />
          {row.cashUnclassified !== 0 ? (
            <AmountLine label="Unallocated Cash" value={row.cashUnclassified} />
          ) : null}
        </SectionPanel>

        <SectionPanel title="Old Invoice Collections">
          <AmountLine label="To-Pay Cash Collection" value={row.cashOldInvoice} />
          <AmountLine label="To-Pay Cheque Collection" value={row.chequeOldInvoice} />
          {row.chequeUnclassified !== 0 ? (
            <AmountLine label="Unallocated Cheque" value={row.chequeUnclassified} />
          ) : null}
        </SectionPanel>

        <SectionPanel title="Cheque Reconciliation">
          <ValueLine label="Cheques Recorded" value={row.chequesProcessedCount.toLocaleString()} />
        </SectionPanel>

        <SectionPanel
          title="Cash Reconciliation"
          tone={`color-mix(in srgb, ${cashTone.background} 68%, var(--color-bg-elevated))`}
        >
          <AmountLine label="Projected Cash (simplified)" value={row.projectedCashSimplified} />
          <ValueLine
            label="Physical Cash"
            valueNode={
              row.physicalCashAmount == null ? (
                <em style={{ color: 'var(--color-text-dim)' }}>Not Recorded</em>
              ) : (
                <strong className="mono">{formatLKR(Number(row.physicalCashAmount))}</strong>
              )
            }
          />
          <ValueLine
            label="Difference"
            valueNode={
              cashDifference == null ? (
                <strong className="mono">—</strong>
              ) : (
                <strong className="mono">{formatLKR(cashDifference)}</strong>
              )
            }
          />
          <ValueLine label="Status" valueNode={<StatusBadge status={row.cashStatus} />} />
        </SectionPanel>

        <SectionPanel title="Goods Returns">
          <AmountLine label="Goods Returns Total" value={row.goodsReturnsTotal} />
        </SectionPanel>
      </div>
    </div>
  )
}

export default function DailyCollectionReportPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    vehicleId: '',
    methodCode: '',
    dateFrom: '',
    dateTo: '',
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [expandedSessions, setExpandedSessions] = useState({})

  const vehiclesQuery = useQuery({
    queryKey: ['reports', 'daily-collection', 'vehicles'],
    queryFn: async () => {
      const page = await inventoryService.listStockLocations({ pageSize: 200, isActive: true })
      return (page.items || []).filter((location) => location.isVehicle)
    },
    staleTime: 5 * 60_000,
  })

  const queryParams = useMemo(() => {
    const params = { page, pageSize }
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value) params[key] = key === 'methodCode' ? Number(value) : value
    })
    return params
  }, [page, appliedFilters])

  const reportQuery = useQuery({
    queryKey: ['reports', 'daily-collection-summary', queryParams],
    queryFn: () => reportsService.getDailyCollectionSummaryReport(queryParams),
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    setPage(1)
  }, [appliedFilters])

  const rows = useMemo(
    () => (reportQuery.data?.items || []).map(normalizeSummaryRow),
    [reportQuery.data]
  )
  const totalItems = Number(reportQuery.data?.totalItems ?? rows.length)
  const isBusy = reportQuery.isLoading || reportQuery.isFetching

  const vehicleOptions = useMemo(
    () =>
      (vehiclesQuery.data || []).map((vehicle) => ({
        value: vehicle.id,
        label: vehicleLabel(vehicle) || vehicle.id,
      })),
    [vehiclesQuery.data]
  )

  const pageTotals = useMemo(
    () =>
      rows.reduce(
        (totals, row) => {
          const cash =
            row.cashToday + row.cashOldInvoice + row.cashUnclassified
          const cheque =
            row.chequeToday + row.chequeOldInvoice + row.chequeUnclassified
          totals.total += cash + cheque
          totals.cash += cash
          totals.cheque += cheque
          return totals
        },
        { total: 0, cash: 0, cheque: 0, bankTransfer: 0 }
      ),
    [rows]
  )

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function handleApply(event) {
    event?.preventDefault()
    setAppliedFilters(filters)
  }

  function handleClear() {
    const next = {
      vehicleId: '',
      methodCode: '',
      dateFrom: '',
      dateTo: '',
    }
    setFilters(next)
    setAppliedFilters(next)
  }

  function buildExportParams() {
    const params = {}
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value) params[key] = key === 'methodCode' ? Number(value) : value
    })
    return params
  }

  async function handleExportPdf() {
    setIsExportingPdf(true)
    try {
      await openPdfInNewTab('/api/reports/daily-collection-summary/export', {
        ...buildExportParams(),
        format: 'pdf',
      })
    } catch (error) {
      toast.error(error.message || 'Unable to export PDF.')
    } finally {
      setIsExportingPdf(false)
    }
  }

  async function handleExportExcel() {
    setIsExportingExcel(true)
    try {
      await downloadExcel(
        '/api/reports/daily-collection/export',
        { ...buildExportParams(), format: 'excel' },
        `daily-collection-report-${dayjs().format('YYYYMMDD')}.xlsx`
      )
    } catch (error) {
      toast.error(error.message || 'Unable to export Excel.')
    } finally {
      setIsExportingExcel(false)
    }
  }

  function toggleSession(sessionId) {
    setExpandedSessions((current) => ({ ...current, [sessionId]: !current[sessionId] }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        <h1 style={{ fontSize: 25, fontWeight: 800 }}>Daily Collection Report</h1>
        <p style={{ marginTop: 3, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Cash, cheque, and bank transfer collections by vehicle and session.
        </p>
      </header>

      <form
        onSubmit={handleApply}
        className="panel responsive-filter-bar"
        style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
      >
        <FilterSelect
          value={filters.vehicleId}
          onChange={(value) => updateFilter('vehicleId', value)}
          placeholder={vehiclesQuery.isLoading ? 'Loading vehicles...' : 'All vehicles'}
          options={vehicleOptions}
          disabled={vehiclesQuery.isLoading}
          width={240}
        />

        <FilterSelect
          value={filters.methodCode}
          onChange={(value) => updateFilter('methodCode', value)}
          placeholder="All methods"
          options={METHOD_OPTIONS}
          width={190}
        />

        <DateFilter
          value={filters.dateFrom}
          onChange={(value) => updateFilter('dateFrom', value)}
          placeholder="Date From"
        />

        <DateFilter
          value={filters.dateTo}
          onChange={(value) => updateFilter('dateTo', value)}
          placeholder="Date To"
        />

        <button
          type="submit"
          className="button-primary"
          style={{ height: 40, padding: '0 18px', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Search style={{ width: 16, height: 16 }} />
          Apply
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={handleClear}
          style={{ height: 40, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7 }}
        >
          <X style={{ width: 15, height: 15 }} />
          Clear
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="button-secondary"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            style={{ height: 40, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <FileText style={{ width: 15, height: 15 }} />
            {isExportingPdf ? 'Exporting...' : 'Export PDF'}
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            style={{ height: 40, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <FileSpreadsheet style={{ width: 15, height: 15 }} />
            {isExportingExcel ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </form>

      {rows.length ? (
        <div
          className="panel"
          style={{
            padding: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))',
            gap: 10,
          }}
        >
          {[
            ['total', 'Total Collected'],
            ['cash', 'Cash Total'],
            ['cheque', 'Cheque Total'],
            ['bankTransfer', 'Bank Transfer Total'],
          ].map(([key, label]) => (
            <div
              key={key}
              style={{
                padding: 10,
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                background: 'color-mix(in srgb, var(--color-bg-elevated) 45%, transparent)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{label}</div>
              <div className="mono" style={{ marginTop: 4, fontWeight: 800 }}>
                {formatLKR(pageTotals[key])}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: 'color-mix(in srgb, var(--color-bg-elevated) 45%, transparent)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Banknote size={15} color="var(--color-amber)" />
            <strong style={{ fontSize: 13 }}>Daily collection report</strong>
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
            {totalItems} session{totalItems === 1 ? '' : 's'}
          </span>
        </div>

        {isBusy ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading daily collection summary...
          </div>
        ) : reportQuery.isError ? (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--color-danger)' }}>
            {reportQuery.error?.message || 'Unable to load daily collection summary.'}
          </div>
        ) : rows.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table product-table-compact">
              <thead>
                <tr>
                  <th style={{ width: 42 }} />
                  <th>Session</th>
                  <th>Vehicle</th>
                  <th>Delivery Run</th>
                  <th>Session Date</th>
                  <th style={{ textAlign: 'right' }}>Total Sales</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const expanded = Boolean(expandedSessions[row.sessionId])
                  return (
                    <Fragment key={row.sessionId}>
                      <tr onClick={() => toggleSession(row.sessionId)} style={{ cursor: 'pointer' }}>
                        <td>
                          <button
                            type="button"
                            aria-label={expanded ? 'Collapse session' : 'Expand session'}
                            aria-expanded={expanded}
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleSession(row.sessionId)
                            }}
                            style={{
                              width: 26,
                              height: 26,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid var(--color-border)',
                              borderRadius: 6,
                              background: 'transparent',
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td>
                          <span className="mono">{row.sessionNumber}</span>
                        </td>
                        <td>{row.vehicleName || row.vehicleId || 'No vehicle'}</td>
                        <td>{row.deliveryRunName || row.deliveryRunId || 'Unassigned'}</td>
                        <td className="mono">{formatDate(row.sessionDate)}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                          {formatLKR(row.totalSalesGross)}
                        </td>
                        <td>
                          <StatusBadge status={row.cashStatus} />
                        </td>
                      </tr>
                      {expanded ? (
                        <tr>
                          <td colSpan={7} style={{ padding: 0, background: 'var(--color-bg-base)' }}>
                            <ExpandedSummary row={row} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <ReceiptText
              size={27}
              style={{ margin: '0 auto 8px', color: 'var(--color-text-dim)' }}
            />
            No daily collection rows match the current filters.
          </div>
        )}

        {rows.length ? (
          <div style={{ padding: '0 12px 10px' }}>
            <SimplePagination
              page={page}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setPage}
              itemLabel="rows"
            />
          </div>
        ) : null}
      </section>
    </div>
  )
}
