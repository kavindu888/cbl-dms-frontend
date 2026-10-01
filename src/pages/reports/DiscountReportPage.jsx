import { keepPreviousData, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { FileSpreadsheet, FileText, Percent, Search, X } from 'lucide-react'
import { Fragment } from 'react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import SimplePagination from '@components/ui/SimplePagination'
import { masterService } from '@/services/api/masterService'
import { reportsService } from '@/services/api/reportsService'
import { downloadExcel, openPdfInNewTab } from '@/utils/fileDownload'
import { formatLKR } from '@/utils/formatCurrency'

const pageSize = 20

const tabs = [
  { key: 'detail', label: 'Daily Discount Report' },
  { key: 'summary', label: 'Daily Discount Summary' },
  { key: 'month-end', label: 'Month End Discount Report' },
]

function colomboMonthRange() {
  const now = dayjs()
  return {
    dateFrom: now.startOf('month').format('YYYY-MM-DD'),
    dateTo: now.format('YYYY-MM-DD'),
  }
}

function read(row, key) {
  return row?.[key] ?? row?.[key.charAt(0).toUpperCase() + key.slice(1)]
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
    padding: '0 12px',
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

function SummaryCards({ summary }) {
  const cards = [
    ['Total Discount', read(summary, 'totalDiscount')],
    ['Sku Discount', read(summary, 'skuDiscount')],
    ['Special Discount', read(summary, 'specialDiscount')],
    ['Special - Supplier', read(summary, 'specialSupplier')],
    ['Special - Distributor', read(summary, 'specialDistributor')],
    ['Invoices Count', read(summary, 'invoicesCount'), 'count'],
  ]

  return (
    <div
      className="panel"
      style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(6, minmax(120px, 1fr))', gap: 10 }}
    >
      {cards.map(([label, value, type]) => (
        <div key={label} style={{ padding: 10, border: '1px solid var(--color-border)', borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{label}</div>
          <div className="mono" style={{ marginTop: 4, fontWeight: 800 }}>
            {type === 'count' ? Number(value || 0).toLocaleString('en-LK') : formatLKR(value || 0)}
          </div>
        </div>
      ))}
    </div>
  )
}

function MatrixTable({ report, monthEnd = false }) {
  const columns = read(report, 'columns') || []
  const rows = read(report, 'rows') || []
  return (
    <>
      {monthEnd ? <div style={{ padding: '0 12px 10px', fontSize: 11, color: 'var(--color-text-dim)' }}>Days with no discount are hidden.</div> : null}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table product-table-compact">
          <thead>
            <tr>
              {monthEnd ? <th>Date</th> : null}
              <th>Item</th>
              {columns.map((column) => (
                <th key={read(column, 'key')} style={{ textAlign: 'right' }}>
                  {read(column, 'code')}
                </th>
              ))}
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={read(row, 'key')}>
                {monthEnd ? <td className="mono">{read(row, 'date') || ''}</td> : null}
                <td style={{ fontWeight: read(row, 'key')?.startsWith?.('total') ? 800 : 600 }}>{read(row, 'label')}</td>
                {(read(row, 'values') || []).map((value, index) => (
                  <td key={read(columns[index], 'key')} className="mono" style={{ textAlign: 'right' }}>
                    {Number(value || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                ))}
                <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>{Number(read(row, 'total') || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function DiscountReportPage() {
  const initialRange = useMemo(colomboMonthRange, [])
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState('detail')
  const [filters, setFilters] = useState({ deliveryRunId: '', ...initialRange })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)

  const deliveryRunsQuery = useQuery({
    queryKey: ['master', 'delivery-runs', 'discount-report-filter'],
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

  const detailQuery = useQuery({
    queryKey: ['reports', 'discount', 'detail', queryParams],
    queryFn: () => reportsService.getDiscountDetailReport(queryParams),
    placeholderData: keepPreviousData,
  })
  const summaryQuery = useQuery({
    queryKey: ['reports', 'discount', 'summary', appliedFilters],
    queryFn: () => reportsService.getDiscountSummaryReport(appliedFilters),
    placeholderData: keepPreviousData,
  })
  const monthEndQuery = useQuery({
    queryKey: ['reports', 'discount', 'month-end', appliedFilters],
    queryFn: () => reportsService.getDiscountMonthEndReport(appliedFilters),
    placeholderData: keepPreviousData,
  })

  const activeQuery = activeTab === 'detail' ? detailQuery : activeTab === 'summary' ? summaryQuery : monthEndQuery
  const summary = read(activeQuery.data, 'summary') || read(detailQuery.data, 'summary') || {}
  const detailRows = read(detailQuery.data, 'items') || []
  const totalItems = Number(read(detailQuery.data, 'totalItems') || detailRows.length)
  const groupedDetailRows = useMemo(() => {
    const groups = []
    detailRows.forEach((row) => {
      const key = read(row, 'deliveryRunId') || 'unassigned'
      let group = groups.find((item) => item.key === key)
      if (!group) {
        group = {
          key,
          label: read(row, 'deliveryRunName') || read(row, 'deliveryRunCode') || 'Unassigned',
          rows: [],
        }
        groups.push(group)
      }
      group.rows.push(row)
    })
    return groups
  }, [detailRows])

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function handleApply(event) {
    event?.preventDefault()
    setPage(1)
    setAppliedFilters(filters)
  }

  function handleClear() {
    const next = { deliveryRunId: '', ...initialRange }
    setFilters(next)
    setAppliedFilters(next)
    setPage(1)
  }

  async function handleExport(format) {
    const setBusy = format === 'pdf' ? setIsExportingPdf : setIsExportingExcel
    setBusy(true)
    try {
      const params = { ...appliedFilters, tab: activeTab, format }
      if (format === 'pdf') {
        await openPdfInNewTab('/api/reports/discount/export', params)
      } else {
        await downloadExcel('/api/reports/discount/export', params, `discount-report-${activeTab}-${dayjs().format('YYYYMMDD')}.xlsx`)
      }
    } catch (error) {
      toast.error(error.message || 'Unable to export discount report.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        <h1 style={{ fontSize: 25, fontWeight: 800 }}>Discount Report</h1>
        <p style={{ marginTop: 3, fontSize: 13, color: 'var(--color-text-muted)' }}>Invoice discounts by delivery run.</p>
      </header>

      <form onSubmit={handleApply} className="panel responsive-filter-bar" style={{ padding: 16, display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <FilterField id="filter-delivery-run" label="Delivery Run" width={240}>
          <select id="filter-delivery-run" className="form-input" value={filters.deliveryRunId} disabled={deliveryRunsQuery.isLoading} onChange={(event) => updateFilter('deliveryRunId', event.target.value)} style={selectStyle(deliveryRunsQuery.isLoading)}>
            <option value="" style={{ background: 'var(--color-bg-elevated)' }}>{deliveryRunsQuery.isLoading ? 'Loading runs...' : 'All delivery runs'}</option>
            {(deliveryRunsQuery.data || []).map((run) => (
              <option key={run.id} value={run.id} style={{ background: 'var(--color-bg-elevated)' }}>{[run.code, run.name].filter(Boolean).join(' - ')}</option>
            ))}
          </select>
        </FilterField>
        <FilterField id="filter-date-from" label="Date From" width={170}>
          <input id="filter-date-from" type="date" className="form-input" value={filters.dateFrom} onChange={(event) => updateFilter('dateFrom', event.target.value)} style={inputStyle()} />
        </FilterField>
        <FilterField id="filter-date-to" label="Date To" width={170}>
          <input id="filter-date-to" type="date" className="form-input" value={filters.dateTo} onChange={(event) => updateFilter('dateTo', event.target.value)} style={inputStyle()} />
        </FilterField>
        <button type="submit" className="button-primary" style={{ height: 40, padding: '0 18px', display: 'flex', alignItems: 'center', gap: 8 }}><Search style={{ width: 16, height: 16 }} />Apply</button>
        <button type="button" className="button-secondary" onClick={handleClear} style={{ height: 40, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7 }}><X style={{ width: 15, height: 15 }} />Clear</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" className="button-secondary" onClick={() => handleExport('pdf')} disabled={isExportingPdf} style={{ height: 40, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7 }}><FileText style={{ width: 15, height: 15 }} />{isExportingPdf ? 'Exporting...' : 'Export PDF'}</button>
          <button type="button" className="button-secondary" onClick={() => handleExport('excel')} disabled={isExportingExcel} style={{ height: 40, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7 }}><FileSpreadsheet style={{ width: 15, height: 15 }} />{isExportingExcel ? 'Exporting...' : 'Export Excel'}</button>
        </div>
      </form>

      <SummaryCards summary={summary} />

      <div className="panel" style={{ padding: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tabs.map((tab) => (
          <button key={tab.key} type="button" className={activeTab === tab.key ? 'button-primary' : 'button-secondary'} onClick={() => setActiveTab(tab.key)} style={{ height: 36, padding: '0 12px' }}>{tab.label}</button>
        ))}
      </div>

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'color-mix(in srgb, var(--color-bg-elevated) 45%, transparent)', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Percent size={15} color="var(--color-amber)" /><strong style={{ fontSize: 13 }}>{tabs.find((tab) => tab.key === activeTab)?.label}</strong></div>
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{activeTab === 'detail' ? `${totalItems} row${totalItems === 1 ? '' : 's'}` : 'Filtered totals'}</span>
        </div>

        {activeQuery.isLoading || activeQuery.isFetching ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading discount report...</div>
        ) : activeQuery.isError ? (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--color-danger)' }}>{activeQuery.error?.message || 'Unable to load discount report.'}</div>
        ) : activeTab === 'detail' ? (
          detailRows.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table product-table-compact">
                <thead><tr><th>Date</th><th>Invoice No</th><th>Customer Name</th><th>Sku Discount</th><th>Special Discount</th><th>Total Discount</th></tr></thead>
                <tbody>
                  {groupedDetailRows.map((group) => {
                    const skuSubtotal = group.rows.reduce((sum, row) => sum + Number(read(row, 'skuDiscount') || 0), 0)
                    const specialSubtotal = group.rows.reduce((sum, row) => sum + Number(read(row, 'specialDiscount') || 0), 0)
                    return (
                      <Fragment key={group.key}>
                        <tr key={`${group.key}-heading`}>
                          <td colSpan={6} style={{ fontWeight: 800, background: 'color-mix(in srgb, var(--color-bg-elevated) 45%, transparent)' }}>{group.label}</td>
                        </tr>
                        {group.rows.map((row) => (
                          <tr key={read(row, 'invoiceId')}>
                            <td className="mono">{read(row, 'invoiceDate')}</td>
                            <td className="mono">{read(row, 'serialNumber') || read(row, 'invoiceNumber')}</td>
                            <td>{read(row, 'customerName')}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>{formatLKR(read(row, 'skuDiscount') || 0)}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>{formatLKR(read(row, 'specialDiscount') || 0)}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>{formatLKR(read(row, 'totalDiscount') || 0)}</td>
                          </tr>
                        ))}
                        <tr key={`${group.key}-subtotal`}>
                          <td colSpan={3} style={{ fontWeight: 800 }}>Subtotal</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>{formatLKR(skuSubtotal)}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>{formatLKR(specialSubtotal)}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>{formatLKR(skuSubtotal + specialSubtotal)}</td>
                        </tr>
                      </Fragment>
                    )
                  })}
                  <tr>
                    <td colSpan={3} style={{ fontWeight: 900 }}>Total</td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 900 }}>{formatLKR(read(summary, 'skuDiscount') || 0)}</td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 900 }}>{formatLKR(read(summary, 'specialDiscount') || 0)}</td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 900 }}>{formatLKR(read(summary, 'totalDiscount') || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : <div style={{ padding: 42, textAlign: 'center', color: 'var(--color-text-muted)' }}>No discount rows match the current filters.</div>
        ) : (
          <MatrixTable report={activeQuery.data} monthEnd={activeTab === 'month-end'} />
        )}

        {activeTab === 'detail' && detailRows.length ? (
          <div style={{ padding: '0 12px 10px' }}>
            <SimplePagination page={page} pageSize={pageSize} totalItems={totalItems} onPageChange={setPage} itemLabel="rows" />
          </div>
        ) : null}
      </section>
    </div>
  )
}
