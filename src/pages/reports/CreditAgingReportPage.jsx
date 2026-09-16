import { keepPreviousData, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { FileSpreadsheet, FileText, Search, TrendingUp, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import SimplePagination from '@components/ui/SimplePagination'
import { masterService } from '@/services/api/masterService'
import { reportsService } from '@/services/api/reportsService'
import { salesService } from '@/services/api/salesService'
import { formatDate } from '@/utils'
import { downloadExcel, openPdfInNewTab } from '@/utils/fileDownload'
import { formatLKR } from '@/utils/formatCurrency'

const pageSize = 20

const BUCKETS = [
  ['bucket0To7', '0-7'],
  ['bucket8To14', '8-14'],
  ['bucket15To21', '15-21'],
  ['bucket22To31', '22-31'],
  ['bucketOver31', '32+'],
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
  const outstandingAmount = Number(read(row, 'outstandingAmount') ?? 0)
  const daysOutstanding = Number(read(row, 'daysOutstanding') ?? 0)

  return {
    invoiceId: read(row, 'invoiceId') ?? '',
    invoiceNumber: read(row, 'invoiceNumber') ?? 'Unknown invoice',
    invoiceDate: read(row, 'invoiceDate') ?? null,
    customerId: read(row, 'customerId') ?? '',
    customerName: read(row, 'customerName') ?? 'Unknown customer',
    salesRouteId: read(row, 'salesRouteId') ?? '',
    routeName: read(row, 'routeName') ?? '',
    deliveryRunId: read(row, 'deliveryRunId') ?? '',
    deliveryRunName: read(row, 'deliveryRunName') ?? '',
    outstandingAmount,
    daysOutstanding,
    bucket0To7: Number(read(row, 'bucket0To7', 'Bucket0To7') ?? 0),
    bucket8To14: Number(read(row, 'bucket8To14', 'Bucket8To14') ?? 0),
    bucket15To21: Number(read(row, 'bucket15To21', 'Bucket15To21') ?? 0),
    bucket22To31: Number(read(row, 'bucket22To31', 'Bucket22To31') ?? 0),
    bucketOver31: Number(read(row, 'bucketOver31', 'BucketOver31') ?? 0),
  }
}

function buildOptions(items, label) {
  return (items || []).map((item) => ({
    value: item.id,
    label: label(item),
  }))
}

export default function CreditAgingReportPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    customerId: '',
    salesRouteId: '',
    deliveryRunId: '',
    dateFrom: '',
    dateTo: '',
    asOfDate: '',
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)

  const customersQuery = useQuery({
    queryKey: ['sales', 'customers', 'credit-aging-filter'],
    queryFn: () => salesService.listAllCustomers({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  })

  const routesQuery = useQuery({
    queryKey: ['master', 'sales-routes', 'credit-aging-filter'],
    queryFn: () => masterService.listAllSalesRoutes({ pageSize: 100 }),
    staleTime: 5 * 60_000,
  })

  const deliveryRunsQuery = useQuery({
    queryKey: ['master', 'delivery-runs', 'credit-aging-filter'],
    queryFn: () => masterService.listAllDeliveryRuns({ activeOnly: true, pageSize: 100 }),
    staleTime: 5 * 60_000,
  })

  const queryParams = useMemo(() => {
    const params = { page, pageSize }
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value) params[key] = value
    })
    return params
  }, [page, appliedFilters])

  const reportQuery = useQuery({
    queryKey: ['reports', 'credit-aging', queryParams],
    queryFn: () => reportsService.getCreditAgingReport(queryParams),
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    setPage(1)
  }, [appliedFilters])

  const rows = useMemo(() => (reportQuery.data?.items || []).map(normalizeRow), [reportQuery.data])
  const totalItems = Number(reportQuery.data?.totalItems ?? rows.length)
  const isBusy = reportQuery.isLoading || reportQuery.isFetching

  const customerOptions = useMemo(
    () =>
      buildOptions(customersQuery.data, (customer) =>
        [customer.code, customer.name].filter(Boolean).join(' - ')
      ),
    [customersQuery.data]
  )

  const routeOptions = useMemo(
    () =>
      buildOptions(routesQuery.data, (route) =>
        [route.code, route.name].filter(Boolean).join(' - ')
      ),
    [routesQuery.data]
  )

  const deliveryRunOptions = useMemo(
    () =>
      buildOptions(deliveryRunsQuery.data, (run) =>
        [run.code, run.name].filter(Boolean).join(' - ')
      ),
    [deliveryRunsQuery.data]
  )

  const pageTotals = useMemo(
    () =>
      BUCKETS.reduce(
        (totals, [key]) => {
          totals[key] = rows.reduce((sum, row) => sum + Number(row[key] || 0), 0)
          return totals
        },
        {
          outstandingAmount: rows.reduce((sum, row) => sum + Number(row.outstandingAmount || 0), 0),
        }
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
      customerId: '',
      salesRouteId: '',
      deliveryRunId: '',
      dateFrom: '',
      dateTo: '',
      asOfDate: '',
    }
    setFilters(next)
    setAppliedFilters(next)
  }

  function buildExportParams() {
    const params = {}
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value) params[key] = value
    })
    return params
  }

  async function handleExportPdf() {
    setIsExportingPdf(true)
    try {
      await openPdfInNewTab('/api/reports/credit-aging/export', {
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
        '/api/reports/credit-aging/export',
        { ...buildExportParams(), format: 'excel' },
        `credit-aging-report-${dayjs().format('YYYYMMDD')}.xlsx`
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
        <h1 style={{ fontSize: 25, fontWeight: 800 }}>Credit Aging Report</h1>
        <p style={{ marginTop: 3, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Outstanding customer invoices grouped by aging bucket.
        </p>
      </header>

      <form
        onSubmit={handleApply}
        className="panel responsive-filter-bar"
        style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
      >
        <FilterSelect
          value={filters.customerId}
          onChange={(value) => updateFilter('customerId', value)}
          placeholder={customersQuery.isLoading ? 'Loading customers...' : 'All customers'}
          options={customerOptions}
          disabled={customersQuery.isLoading}
          width={240}
        />

        <FilterSelect
          value={filters.salesRouteId}
          onChange={(value) => updateFilter('salesRouteId', value)}
          placeholder={routesQuery.isLoading ? 'Loading routes...' : 'All sales routes'}
          options={routeOptions}
          disabled={routesQuery.isLoading}
          width={220}
        />

        <FilterSelect
          value={filters.deliveryRunId}
          onChange={(value) => updateFilter('deliveryRunId', value)}
          placeholder={deliveryRunsQuery.isLoading ? 'Loading runs...' : 'All delivery runs'}
          options={deliveryRunOptions}
          disabled={deliveryRunsQuery.isLoading}
          width={220}
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

        <DateFilter
          value={filters.asOfDate}
          onChange={(value) => updateFilter('asOfDate', value)}
          placeholder="As Of Date"
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
            gridTemplateColumns: 'repeat(6, minmax(120px, 1fr))',
            gap: 10,
          }}
        >
          {[['outstandingAmount', 'Visible Total'], ...BUCKETS].map(([key, label]) => (
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
            <TrendingUp size={15} color="var(--color-amber)" />
            <strong style={{ fontSize: 13 }}>Credit aging report</strong>
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
            {totalItems} row{totalItems === 1 ? '' : 's'}
          </span>
        </div>

        {isBusy ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading credit aging report...
          </div>
        ) : reportQuery.isError ? (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--color-danger)' }}>
            {reportQuery.error?.message || 'Unable to load credit aging report.'}
          </div>
        ) : rows.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table product-table-compact">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Customer Name</th>
                  <th>Route Name</th>
                  <th>Delivery Run</th>
                  <th>Invoice Date</th>
                  <th style={{ textAlign: 'right' }}>Days Outstanding</th>
                  <th style={{ textAlign: 'right' }}>Outstanding Amount</th>
                  {BUCKETS.map(([, label]) => (
                    <th key={label} style={{ textAlign: 'right' }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.invoiceId || row.invoiceNumber}>
                    <td>
                      <span className="mono">{row.invoiceNumber}</span>
                    </td>
                    <td>{row.customerName}</td>
                    <td>{row.routeName || row.salesRouteId || 'No route'}</td>
                    <td>{row.deliveryRunName || 'Unassigned'}</td>
                    <td className="mono">{formatDate(row.invoiceDate)}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {row.daysOutstanding}
                    </td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                      {formatLKR(row.outstandingAmount)}
                    </td>
                    {BUCKETS.map(([key]) => (
                      <td key={key} className="mono" style={{ textAlign: 'right' }}>
                        {Number(row[key] || 0).toLocaleString('en-LK', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <TrendingUp
              size={27}
              style={{ margin: '0 auto 8px', color: 'var(--color-text-dim)' }}
            />
            No credit aging rows match the current filters.
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
