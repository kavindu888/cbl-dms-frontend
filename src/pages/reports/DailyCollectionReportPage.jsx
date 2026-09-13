import { keepPreviousData, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Banknote, FileSpreadsheet, FileText, ReceiptText, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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

function normalizeRow(row) {
  return {
    collectionId: read(row, 'collectionId') ?? '',
    sessionId: read(row, 'sessionId') ?? '',
    sessionNumber: read(row, 'sessionNumber') ?? 'Unknown session',
    vehicleId: read(row, 'vehicleId') ?? '',
    vehicleName: read(row, 'vehicleName') ?? '',
    collectorId: read(row, 'collectorId') ?? '',
    salesmanId: read(row, 'salesmanId') ?? '',
    sessionDate: read(row, 'sessionDate') ?? null,
    sessionStatusCode: Number(read(row, 'sessionStatusCode') ?? 0),
    customerId: read(row, 'customerId') ?? '',
    customerName: read(row, 'customerName') ?? 'Unknown customer',
    invoiceId: read(row, 'invoiceId') ?? '',
    invoiceNumber: read(row, 'invoiceNumber') ?? '',
    methodCode: Number(read(row, 'methodCode') ?? 0),
    method: read(row, 'method') ?? 'Unknown',
    amount: Number(read(row, 'amount') ?? 0),
    collectedOn: read(row, 'collectedOn') ?? null,
    collectedByUserId: read(row, 'collectedByUserId') ?? '',
    collectedByUsername: read(row, 'collectedByUsername') ?? '',
    chequeNumber: read(row, 'chequeNumber') ?? '',
    chequeStatusCode: read(row, 'chequeStatusCode') ?? null,
    chequeStatus: read(row, 'chequeStatus') ?? '',
  }
}

function vehicleLabel(vehicle) {
  return [vehicle.vehicleCode || vehicle.code, vehicle.name].filter(Boolean).join(' - ')
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
    queryKey: ['reports', 'daily-collection', queryParams],
    queryFn: () => reportsService.getDailyCollectionReport(queryParams),
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    setPage(1)
  }, [appliedFilters])

  const rows = useMemo(() => (reportQuery.data?.items || []).map(normalizeRow), [reportQuery.data])
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
          totals.total += row.amount
          if (row.methodCode === 1 || row.method === 'Cash') totals.cash += row.amount
          if (row.methodCode === 2 || row.method === 'Cheque') totals.cheque += row.amount
          if (row.methodCode === 3 || row.method === 'BankTransfer') totals.bankTransfer += row.amount
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
      await openPdfInNewTab('/api/reports/daily-collection/export', {
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
            {totalItems} row{totalItems === 1 ? '' : 's'}
          </span>
        </div>

        {isBusy ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading daily collection report...
          </div>
        ) : reportQuery.isError ? (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--color-danger)' }}>
            {reportQuery.error?.message || 'Unable to load daily collection report.'}
          </div>
        ) : rows.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table product-table-compact">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Vehicle</th>
                  <th>Collected By</th>
                  <th>Session Date</th>
                  <th>Customer</th>
                  <th>Invoice</th>
                  <th>Method</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Collected On</th>
                  <th>Cheque No</th>
                  <th>Cheque Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.collectionId || `${row.sessionId}-${row.invoiceId}-${row.amount}`}>
                    <td>
                      <span className="mono">{row.sessionNumber}</span>
                    </td>
                    <td>{row.vehicleName || row.vehicleId || 'No vehicle'}</td>
                    <td>{row.collectedByUsername || row.collectedByUserId || 'Unknown'}</td>
                    <td className="mono">{formatDate(row.sessionDate)}</td>
                    <td>{row.customerName || row.customerId}</td>
                    <td>
                      {row.invoiceNumber ? (
                        <span className="mono">{row.invoiceNumber}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-dim)' }}>Unallocated</span>
                      )}
                    </td>
                    <td>{row.method}</td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                      {formatLKR(row.amount)}
                    </td>
                    <td className="mono">{formatDate(row.collectedOn)}</td>
                    <td>
                      {row.chequeNumber ? (
                        <span className="mono">{row.chequeNumber}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-dim)' }}>-</span>
                      )}
                    </td>
                    <td>{row.chequeStatus || '-'}</td>
                  </tr>
                ))}
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
