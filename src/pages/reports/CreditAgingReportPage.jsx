import { keepPreviousData, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { FileSpreadsheet, FileText, Search, TrendingUp, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import SimplePagination from '@components/ui/SimplePagination'
import { getOnce } from '@/lib/api'
import { masterService } from '@/services/api/masterService'
import { formatDate } from '@/utils'
import { downloadExcel, openPdfInNewTab } from '@/utils/fileDownload'
import { displayDate, money, parseDate } from './creditAgingReportUtils'

const PAGE_SIZE = 50
const API = '/api/reports/all-customer-credit-aging'
const SUMMARY_SORTS = new Set(['OldestDays', 'Customer', 'Route', 'Total',
  'Bucket0To30', 'Bucket31To60', 'Bucket61To90', 'BucketOver90', 'LastReceipt'])

function DateFilter({ value, onChange }) {
  const inputRef = useRef(null)
  const [display, setDisplay] = useState(() => displayDate(value))
  useEffect(() => {
    setDisplay(displayDate(value))
    inputRef.current?.setCustomValidity('')
  }, [value])
  return <input ref={inputRef} id="all-aging-as-of" className="form-input" type="text"
    placeholder="dd/MM/yyyy" inputMode="numeric" title="Enter a date as dd/MM/yyyy"
    pattern="(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/[0-9]{4}" value={display}
    onChange={(event) => {
      const next = event.target.value
      setDisplay(next)
      const iso = parseDate(next)
      event.target.setCustomValidity(next && /^\d{2}\/\d{2}\/\d{4}$/.test(next) && !iso
        ? 'Enter a valid calendar date' : '')
      if (!next) onChange('')
      else if (iso) onChange(iso)
    }} style={{ width: 175 }} />
}

function amount(value) {
  return money(value)
}

function SortHeader({ label, sort, current, descending, onSort, numeric = false, width }) {
  return <th style={{ width, padding: '8px 5px', textAlign: numeric ? 'right' : 'left',
    whiteSpace: 'nowrap', background: 'var(--color-bg-elevated)' }}>
    {sort ? <button type="button" onClick={() => onSort(sort)}
      style={{ border: 0, padding: 0, background: 'none', cursor: 'pointer',
        color: 'inherit', font: 'inherit', whiteSpace: 'nowrap' }}>
      {label} {current === sort ? (descending ? '↓' : '↑') : '↕'}
    </button> : label}
  </th>
}

export default function CreditAgingReportPage() {
  const [params, setParams] = useSearchParams()
  const [today] = useState(() => dayjs().tz('Asia/Colombo').format('YYYY-MM-DD'))
  const view = params.get('view') === 'detail' ? 'detail' : 'summary'
  const routeId = params.get('salesRouteId') || ''
  const asOfDate = params.get('asOfDate') || today
  const search = params.get('search') || ''
  const bucket = params.get('bucket') || 'None'
  const drillCustomer = view === 'detail' ? params.get('customerId') : null
  const summarySort = SUMMARY_SORTS.has(params.get('summarySort')) ? params.get('summarySort') : 'OldestDays'
  const summaryDescending = params.get('summaryDescending') !== 'false'
  const detailDescending = params.get('detailDescending') !== 'false'
  const sortBy = view === 'summary' ? summarySort : 'Days'
  const descending = view === 'summary' ? summaryDescending : detailDescending
  const [routeDraft, setRouteDraft] = useState(routeId)
  const [dateDraft, setDateDraft] = useState(asOfDate)
  const [searchDraft, setSearchDraft] = useState(search)
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState('')

  useEffect(() => { setRouteDraft(routeId); setDateDraft(asOfDate) }, [routeId, asOfDate])
  useEffect(() => { setSearchDraft(search) }, [search])
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchDraft.trim()
      if (trimmed === search) return
      setParams((previous) => {
        const next = new URLSearchParams(previous)
        if (trimmed) next.set('search', trimmed)
        else next.delete('search')
        return next
      })
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchDraft, search, setParams])

  function update(values) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      Object.entries(values).forEach(([key, value]) => {
        if (value == null || value === '') next.delete(key)
        else next.set(key, String(value))
      })
      return next
    })
    setPage(1)
  }

  const routesQuery = useQuery({
    queryKey: ['all-customer-aging', 'routes'],
    queryFn: () => masterService.listAllSalesRoutes({ pageSize: 100 }),
    staleTime: 5 * 60_000,
  })
  const routes = routesQuery.data || []
  const routeName = routes.find((route) => route.id === routeId)?.name || ''
  const queryParams = useMemo(() => ({ page, pageSize: PAGE_SIZE,
    salesRouteId: routeId || undefined, asOfDate, search: search || undefined,
    customerId: drillCustomer || undefined, bucket, sortBy, descending }),
  [page, routeId, asOfDate, search, drillCustomer, bucket, sortBy, descending])
  const reportQuery = useQuery({
    queryKey: ['all-customer-aging', view, queryParams],
    queryFn: async () => (await getOnce(`${API}/${view}`, { params: queryParams })).data,
    placeholderData: keepPreviousData,
  })
  const report = reportQuery.data
  const rows = report?.items || []
  const totals = report?.totals || {}
  const buckets = report?.bucketDefinitions || []
  const totalItems = Number(report?.totalItems || 0)
  const busy = reportQuery.isLoading || reportQuery.isFetching

  function apply(event) {
    event.preventDefault()
    update({ salesRouteId: routeDraft, asOfDate: dateDraft || today,
      search: searchDraft.trim(), customerId: null })
  }
  function clear() {
    setRouteDraft(''); setDateDraft(today); setSearchDraft('')
    update({ salesRouteId: null, asOfDate: today, search: null, customerId: null,
      bucket: null, summarySort: null, summaryDescending: null, detailDescending: null })
  }
  function switchView(next) { update({ view: next, customerId: null }) }
  function sortSummary(next) {
    const firstDescending = !['Customer', 'Route'].includes(next)
    update({ summarySort: next, summaryDescending:
      summarySort === next ? !summaryDescending : firstDescending })
  }
  async function exportReport(format) {
    setExporting(format)
    try {
      const exportParams = { ...queryParams, routeName: routeName || undefined, view, format }
      if (format === 'pdf') await openPdfInNewTab(`${API}/export`, exportParams)
      else await downloadExcel(`${API}/export`, exportParams,
        `all-customers-credit-aging-${view}-${dayjs().format('YYYYMMDD')}.xlsx`)
    } catch (error) { toast.error(error.message || `Unable to export ${format.toUpperCase()}.`) }
    finally { setExporting('') }
  }

  const summaryColumns = [
    ['code', 'Code', null, 70], ['customer', 'Customer', 'Customer', 135],
    ['route', 'Route', 'Route', 120], ['totalOutstanding', 'Total (Rs.)', 'Total', 100],
    ...buckets.map((item) => [item.key, item.label, item.key[0].toUpperCase() + item.key.slice(1), 76]),
    ['oldestDays', 'Oldest Days', 'OldestDays', 78], ['pdcInHand', 'PDC (Rs.)', null, 95],
    ['lastReceipt', 'Last Receipt', 'LastReceipt', 105],
  ]
  const detailColumns = [
    ['code', 'Code', 75], ['customer', 'Customer', 145], ['route', 'Route', 135],
    ['invoiceNumber', 'Invoice No', 120], ['invoiceDate', 'Invoice Date', 110],
    ['days', 'Days', 65], ['outstanding', 'Outstanding (Rs.)', 130],
    ['deliveryRun', 'Delivery Run', 140],
  ]
  const numberKeys = new Set(['totalOutstanding', 'bucket0To30', 'bucket31To60',
    'bucket61To90', 'bucketOver90', 'pdcInHand', 'outstanding'])

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <header>
      <h1 style={{ fontSize: 25, fontWeight: 800 }}>All Customers Credit Aging Report</h1>
      <p style={{ marginTop: 3, fontSize: 13, color: 'var(--color-text-muted)' }}>
        Outstanding customer invoices grouped by aging bucket.
      </p>
    </header>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {['summary', 'detail'].map((option) => <button key={option} type="button"
        className={view === option ? 'button-primary' : 'button-secondary'}
        onClick={() => switchView(option)}>
        {option === 'summary' ? 'Customer Summary' : 'Invoice Detail'}
      </button>)}
      {drillCustomer && <button type="button" className="button-secondary"
        onClick={() => update({ view: 'summary', customerId: null })}>Back to summary</button>}
    </div>
    <form className="panel" onSubmit={apply} style={{ padding: 16, display: 'flex',
      alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
      <label style={{ display: 'grid', gap: 6, minWidth: 210 }}>
        <span className="eyebrow">Sales Route</span>
        <select className="form-input" value={routeDraft} onChange={(event) => setRouteDraft(event.target.value)}>
          <option value="">All sales routes</option>
          {routes.map((route) => <option key={route.id} value={route.id}>
            {[route.code, route.name].filter(Boolean).join(' - ')}
          </option>)}
        </select>
      </label>
      <label htmlFor="all-aging-as-of" style={{ display: 'grid', gap: 6 }}>
        <span className="eyebrow">As Of Date</span>
        <DateFilter value={dateDraft} onChange={setDateDraft} />
      </label>
      <label style={{ display: 'grid', gap: 6, minWidth: 230, flex: 1, maxWidth: 340 }}>
        <span className="eyebrow">Customer search</span>
        <input className="form-input" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search code or name" aria-label="Search customer code or name" />
      </label>
      <button type="submit" className="button-primary"><Search size={15} /> Apply</button>
      <button type="button" className="button-secondary" onClick={clear}><X size={15} /> Clear</button>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <button type="button" className="button-secondary" disabled={!!exporting}
          onClick={() => exportReport('pdf')}><FileText size={15} /> Export PDF</button>
        <button type="button" className="button-secondary" disabled={!!exporting}
          onClick={() => exportReport('excel')}><FileSpreadsheet size={15} /> Export Excel</button>
      </div>
    </form>
    <div className="panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8,
      padding: 10 }}>
      {[
        ['totalOutstanding', 'Total Outstanding', null],
        ...buckets.map((item) => [item.key, item.label, item.key]),
        ['pdcInHand', 'PDC In Hand', null],
      ].map(([key, label, filter]) => <button key={key} type="button" disabled={!filter}
        onClick={() => update({ bucket: bucket === filter ? null : filter })}
        aria-pressed={filter ? bucket === filter : undefined}
        style={{ padding: 10, textAlign: 'left', minWidth: 0, borderRadius: 6,
          border: filter && bucket === filter ? '2px solid var(--color-amber)' : '1px solid var(--color-border)',
          background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)',
          cursor: filter ? 'pointer' : 'default' }}>
        <div style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{label} (Rs.)</div>
        <strong style={{ display: 'block', marginTop: 5, fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap', fontSize: 15 }}>{amount(totals[key])}</strong>
        {key === 'totalOutstanding' && <small style={{ display: 'block', marginTop: 4 }}>
          Net of PDC: Rs. {amount(totals.netOfPdc)}</small>}
      </button>)}
    </div>
    <section className="panel" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between',
        background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>
        <strong style={{ fontSize: 13 }}><TrendingUp size={15} /> Credit aging report</strong>
        <span style={{ fontSize: 12 }}>{view === 'summary'
          ? `${totals.customerCount || 0} customers`
          : `${totalItems} invoices · ${totals.customerCount || 0} customers`}</span>
      </div>
      {busy ? <p style={{ padding: 30, textAlign: 'center' }}>Loading credit aging report...</p>
        : reportQuery.isError ? <p style={{ padding: 30, textAlign: 'center', color: 'var(--color-danger)' }}>
          {reportQuery.error?.message || 'Unable to load credit aging report.'}</p>
          : rows.length ? <div>
            <table className="data-table" style={{ width: '100%', tableLayout: 'fixed',
              borderCollapse: 'collapse', fontSize: 11 }}>
              <colgroup>{(view === 'summary' ? summaryColumns : detailColumns).map((column) =>
                <col key={column[0]} style={{ width: column[view === 'summary' ? 3 : 2] }} />)}</colgroup>
              <thead><tr>{view === 'summary'
                ? summaryColumns.map(([key, label, sort, width]) => <SortHeader key={key} label={label}
                  sort={sort} current={summarySort} descending={summaryDescending}
                  onSort={sortSummary} numeric={numberKeys.has(key)} width={width} />)
                : detailColumns.map(([key, label, width]) => <SortHeader key={key}
                  label={label}
                  sort={key === 'days' ? 'Days' : null} current={key === 'days' ? 'Days' : null}
                  descending={detailDescending} width={width}
                  onSort={() => update({ detailDescending: !detailDescending })}
                  numeric={numberKeys.has(key)} />)}
              </tr></thead>
              <tbody>{rows.map((row) => <tr key={view === 'summary' ? row.customerId : row.invoiceId}>
                {(view === 'summary' ? summaryColumns : detailColumns).map(([key]) => <td key={key}
                  title={typeof row[key] === 'string' ? row[key] : undefined}
                  style={{ padding: '8px 5px', overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                    textAlign: numberKeys.has(key) || key === 'days' || key === 'oldestDays' ? 'right' : 'left',
                    color: key === 'bucketOver90' && Number(row[key]) > 0 ||
                      key === 'days' && Number(row[key]) > 90 ? 'var(--color-danger)' : undefined }}>
                  {key === 'customer' && view === 'summary' ? <a href="#invoice-detail"
                    style={{ textDecoration: 'underline', color: 'var(--color-amber)' }}
                    onClick={(event) => { event.preventDefault(); update({ view: 'detail', customerId: row.customerId }) }}>
                    {row.customer}</a>
                    : numberKeys.has(key) ? amount(row[key])
                      : key === 'invoiceDate' || key === 'lastReceipt' ? row[key] ? formatDate(row[key]) : '–'
                        : row[key] ?? '–'}
                </td>)}</tr>)}</tbody>
            </table>
            <div style={{ padding: '0 12px 10px' }}><SimplePagination page={page} pageSize={PAGE_SIZE}
              totalItems={totalItems} onPageChange={setPage} itemLabel="rows" /></div>
          </div> : <p style={{ padding: 30, textAlign: 'center' }}>
            No credit aging rows match the current filters.</p>}
    </section>
  </div>
}
