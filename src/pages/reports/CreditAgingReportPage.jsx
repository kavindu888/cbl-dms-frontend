import { keepPreviousData, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { FileSpreadsheet, FileText, Search, TrendingUp, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import SimplePagination from '@components/ui/SimplePagination'
import { masterService } from '@/services/api/masterService'
import { reportsService } from '@/services/api/reportsService'
import { salesService } from '@/services/api/salesService'
import { formatDate } from '@/utils'
import { downloadExcel, openPdfInNewTab } from '@/utils/fileDownload'
import { formatLKR } from '@/utils/formatCurrency'

const pageSize = 20

const SORTS = [
  { value: 'OldestInvoice', label: 'Oldest invoice' },
  { value: 'WeightedAge', label: 'Weighted average age' },
  { value: 'Over90Amount', label: '90+ amount' },
  { value: 'TotalOutstanding', label: 'Total outstanding' },
]

function normalizeObject(value) {
  return Object.fromEntries(
    Object.entries(value || {}).map(([key, item]) => [
      key.charAt(0).toLowerCase() + key.slice(1),
      item,
    ])
  )
}

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

// Every filter renders its own visible, uppercase eyebrow label above the control (not just a
// placeholder/title) — a <select>'s placeholder option disappears from view the moment a real
// option is chosen, and a native date input shows no placeholder text at all (just "mm/dd/yyyy"),
// so without a persistent label there is no way to tell "Date From" apart from "Date To" or "As Of
// Date" once the filter bar is in use. `id`/`htmlFor` pairs the label with its control for a11y
// (screen readers, click-to-focus) on top of the visual cue.
function FilterField({ id, label, width, children }) {
  return (
    <div style={{ width, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      {children}
    </div>
  )
}

function FilterSelect({ id, value, onChange, options, placeholder, disabled }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        id={id}
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

function DateFilter({ id, value, onChange }) {
  return (
    <input
      id={id}
      type="date"
      className="form-input"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={inputStyle()}
    />
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
    customerCode: read(row, 'customerCode') ?? '',
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
    bucket32To60: Number(read(row, 'bucket32To60') ?? 0),
    bucket61To90: Number(read(row, 'bucket61To90') ?? 0),
    bucketOver90: Number(read(row, 'bucketOver90') ?? 0),
  }
}

function buildOptions(items, label) {
  return (items || []).map((item) => ({
    value: item.id,
    label: label(item),
  }))
}

export default function CreditAgingReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'detail' ? 'detail' : 'summary'
  const sort = SORTS.some((option) => option.value === searchParams.get('sort'))
    ? searchParams.get('sort')
    : 'OldestInvoice'
  const groupByRoute = searchParams.get('groupByRoute') === 'true'
  const drillCustomer = view === 'detail' ? searchParams.get('drillCustomer') : null
  const [page, setPage] = useState(1)
  function updateViewSettings(values) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      Object.entries(values).forEach(([key, value]) =>
        value == null ? next.delete(key) : next.set(key, String(value))
      )
      return next
    })
    setPage(1)
  }
  const [defaultAsOf] = useState(() => dayjs().tz('Asia/Colombo').format('YYYY-MM-DD'))
  const appliedFilters = useMemo(
    () => ({
      customerId: searchParams.get('customerId') || '',
      salesRouteId: searchParams.get('salesRouteId') || '',
      deliveryRunId: searchParams.get('deliveryRunId') || '',
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
      asOfDate: searchParams.get('asOfDate') || defaultAsOf,
      agingBasis: searchParams.get('agingBasis') === 'DueDate' ? 'DueDate' : 'InvoiceDate',
    }),
    [searchParams, defaultAsOf]
  )
  const [filters, setFilters] = useState(appliedFilters)
  useEffect(() => {
    setFilters(appliedFilters)
  }, [appliedFilters])
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
    const params = { page, pageSize, sort, groupByRoute }
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value) params[key] = value
    })
    if (drillCustomer) params.customerId = drillCustomer
    return params
  }, [page, appliedFilters, sort, groupByRoute, drillCustomer])

  const reportQuery = useQuery({
    queryKey: ['reports', 'credit-aging', view, queryParams],
    queryFn: () =>
      view === 'summary'
        ? reportsService.getCustomerCreditAgingSummary(queryParams)
        : reportsService.getCreditAgingReport(queryParams),
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    setPage(1)
  }, [appliedFilters])

  const rows = useMemo(
    () => (reportQuery.data?.items || []).map(view === 'summary' ? normalizeObject : normalizeRow),
    [reportQuery.data, view]
  )
  const BUCKETS = (reportQuery.data?.bucketDefinitions || []).map((bucket) => [
    bucket.key,
    bucket.label,
  ])
  const routeTotals = reportQuery.data?.routeTotals || []
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

  const pageTotals = reportQuery.data?.totals || {}

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function handleApply(event) {
    event?.preventDefault()
    updateViewSettings({ ...filters, drillCustomer: null })
  }

  function handleClear() {
    const next = {
      customerId: '',
      salesRouteId: '',
      deliveryRunId: '',
      dateFrom: '',
      dateTo: '',
      asOfDate: dayjs().tz('Asia/Colombo').format('YYYY-MM-DD'),
      agingBasis: 'InvoiceDate',
    }
    setFilters(next)
    updateViewSettings({ ...next, drillCustomer: null })
  }

  function buildExportParams() {
    const params = { view, sort, groupByRoute }
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value) params[key] = value
    })
    if (drillCustomer) params.customerId = drillCustomer
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

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {['summary', 'detail'].map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            className={view === option ? 'button-primary' : 'button-secondary'}
            onClick={() => updateViewSettings({ view: option, drillCustomer: null })}
          >
            {option === 'summary' ? 'Customer Summary' : 'Invoice Detail'}
          </button>
        ))}
        {drillCustomer && (
          <button
            type="button"
            className="button-secondary"
            onClick={() => updateViewSettings({ view: 'summary', drillCustomer: null })}
          >
            Back to summary
          </button>
        )}
      </div>
      <form
        onSubmit={handleApply}
        className="panel responsive-filter-bar"
        style={{ padding: 16, display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}
      >
        <FilterField id="filter-customer" label="Customer" width={240}>
          <FilterSelect
            id="filter-customer"
            value={filters.customerId}
            onChange={(value) => updateFilter('customerId', value)}
            placeholder={customersQuery.isLoading ? 'Loading customers...' : 'All customers'}
            options={customerOptions}
            disabled={customersQuery.isLoading}
          />
        </FilterField>

        <FilterField id="filter-route" label="Sales Route" width={220}>
          <FilterSelect
            id="filter-route"
            value={filters.salesRouteId}
            onChange={(value) => updateFilter('salesRouteId', value)}
            placeholder={routesQuery.isLoading ? 'Loading routes...' : 'All sales routes'}
            options={routeOptions}
            disabled={routesQuery.isLoading}
          />
        </FilterField>

        <FilterField id="filter-delivery-run" label="Delivery Run" width={220}>
          <FilterSelect
            id="filter-delivery-run"
            value={filters.deliveryRunId}
            onChange={(value) => updateFilter('deliveryRunId', value)}
            placeholder={deliveryRunsQuery.isLoading ? 'Loading runs...' : 'All delivery runs'}
            options={deliveryRunOptions}
            disabled={deliveryRunsQuery.isLoading}
          />
        </FilterField>

        <FilterField id="filter-date-from" label="Date From" width={170}>
          <DateFilter
            id="filter-date-from"
            value={filters.dateFrom}
            onChange={(value) => updateFilter('dateFrom', value)}
          />
        </FilterField>

        <FilterField id="filter-date-to" label="Date To" width={170}>
          <DateFilter
            id="filter-date-to"
            value={filters.dateTo}
            onChange={(value) => updateFilter('dateTo', value)}
          />
        </FilterField>

        <FilterField id="filter-as-of-date" label="As Of Date" width={170}>
          <DateFilter
            id="filter-as-of-date"
            value={filters.asOfDate}
            onChange={(value) => updateFilter('asOfDate', value)}
          />
        </FilterField>

        <FilterField id="filter-aging-basis" label="Aging Basis" width={180}>
          <FilterSelect
            id="filter-aging-basis"
            value={filters.agingBasis}
            onChange={(value) => updateFilter('agingBasis', value || 'InvoiceDate')}
            placeholder="Select basis"
            options={[
              { value: 'InvoiceDate', label: 'Invoice date' },
              { value: 'DueDate', label: 'Due date' },
            ]}
          />
        </FilterField>
        {view === 'summary' && (
          <FilterField id="filter-aging-sort" label="Sort" width={210}>
            <FilterSelect
              id="filter-aging-sort"
              value={sort}
              onChange={(value) => updateViewSettings({ sort: value || 'OldestInvoice' })}
              placeholder="Select sort"
              options={SORTS}
            />
          </FilterField>
        )}
        <label style={{ display: 'flex', gap: 8, height: 40, alignItems: 'center' }}>
          <input
            type="checkbox"
            role="switch"
            checked={groupByRoute}
            onChange={(event) => updateViewSettings({ groupByRoute: event.target.checked })}
          />
          Group by route
        </label>
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

      {reportQuery.data ? (
        <div
          className="panel"
          style={{
            padding: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 10,
          }}
        >
          {[
            ['totalOutstanding', 'Total Outstanding'],
            ...BUCKETS,
            ['pdcInHand', 'PDC In Hand'],
            ['netExposure', 'Net Exposure'],
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
                {formatLKR(pageTotals[key] || 0)}
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
            {(() => {
              const columns = [
                ['customerCode', 'Customer Code'],
                ['customerName', 'Customer Name'],
                ['routeName', 'Route'],
                ...(view === 'summary'
                  ? [
                      ['openInvoiceCount', 'Open Invoices', 'number'],
                      ['oldestInvoiceDate', 'Oldest Invoice', 'date'],
                      ['oldestDays', 'Oldest Days', 'number'],
                      ['weightedAvgDays', 'Weighted Avg Days', 'number'],
                    ]
                  : [
                      ['invoiceNumber', 'Invoice'],
                      ['deliveryRunName', 'Delivery Run'],
                      ['invoiceDate', 'Invoice Date', 'date'],
                      ['daysOutstanding', 'Days Outstanding', 'number'],
                    ]),
                ...BUCKETS.map(([key, label]) => [key, label, 'money']),
                [
                  view === 'summary' ? 'totalOutstanding' : 'outstandingAmount',
                  'Total Outstanding',
                  'money',
                ],
                ...(view === 'summary'
                  ? [
                      ['overdueAmount', 'Overdue', 'money'],
                      ['pdcInHand', 'PDC In Hand', 'money'],
                      ['netExposure', 'Net Exposure', 'money'],
                      ['creditLimit', 'Credit Limit', 'money'],
                      ['utilizationPercent', 'Utilization %', 'percent'],
                      ['lastReceiptDate', 'Last Receipt', 'date'],
                    ]
                  : []),
              ]
              return (
                <table className="data-table product-table-compact">
                  <thead>
                    <tr>
                      {columns.map(([key, label, type]) => (
                        <th
                          key={key}
                          style={{ textAlign: type && type !== 'date' ? 'right' : 'left' }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={view === 'summary' ? row.customerId : row.invoiceId}
                        onClick={
                          view === 'summary'
                            ? () =>
                                updateViewSettings({
                                  view: 'detail',
                                  drillCustomer: row.customerId,
                                })
                            : undefined
                        }
                        style={{
                          cursor: view === 'summary' ? 'pointer' : undefined,
                          background:
                            Number(row.utilizationPercent) > 100
                              ? 'color-mix(in srgb, var(--color-danger) 12%, transparent)'
                              : Number(row.oldestDays) > 90
                                ? 'color-mix(in srgb, var(--color-amber) 12%, transparent)'
                                : undefined,
                        }}
                      >
                        {columns.map(([key, , type]) => (
                          <td
                            key={key}
                            className={type ? 'mono' : undefined}
                            style={{ textAlign: type && type !== 'date' ? 'right' : 'left' }}
                          >
                            {view === 'summary' && key === 'customerName' ? (
                              <button
                                type="button"
                                className="button-secondary"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  updateViewSettings({
                                    view: 'detail',
                                    drillCustomer: row.customerId,
                                  })
                                }}
                              >
                                {row[key]}
                              </button>
                            ) : row[key] == null ? (
                              '\u2014'
                            ) : type === 'date' ? (
                              formatDate(row[key])
                            ) : type === 'money' ? (
                              formatLKR(row[key])
                            ) : type === 'percent' ? (
                              `${Number(row[key]).toFixed(2)}%`
                            ) : (
                              row[key]
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            })()}
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

        {groupByRoute && routeTotals.length > 0 && (
          <div style={{ padding: 12, overflowX: 'auto' }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Route subtotals cover all filtered customers. Customers on multiple routes contribute
              to each route; these subtotals are not additive.
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Customers</th>
                  {BUCKETS.map(([key, label]) => (
                    <th key={key}>{label}</th>
                  ))}
                  <th>Total Outstanding</th>
                  <th>PDC In Hand</th>
                  <th>Net Exposure</th>
                </tr>
              </thead>
              <tbody>
                {routeTotals.map((route) => (
                  <tr key={route.salesRouteId || 'none'}>
                    <td>{route.routeName}</td>
                    <td>{route.customerCount}</td>
                    {BUCKETS.map(([key]) => (
                      <td className="mono" key={key}>
                        {formatLKR(route[key])}
                      </td>
                    ))}
                    <td className="mono">{formatLKR(route.totalOutstanding)}</td>
                    <td className="mono">{formatLKR(route.pdcInHand)}</td>
                    <td className="mono">{formatLKR(route.netExposure)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
