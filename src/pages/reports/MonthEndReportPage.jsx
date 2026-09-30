import { CalendarDays, FileSpreadsheet, FileText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useMonthEndReport } from '@/hooks/useReports'
import { downloadExcel, openPdfInNewTab } from '@/utils/fileDownload'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const amountFormatter = new Intl.NumberFormat('en-LK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatAmount(value) {
  return amountFormatter.format(Number(value || 0))
}

// The report month defaults to the current month in Sri Lanka, not the browser's own timezone.
function currentColomboYearMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date())
  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
  }
}

function formatColomboDateTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
  }).format(new Date(value))
}

function read(row, camelKey) {
  return row?.[camelKey] ?? row?.[camelKey.charAt(0).toUpperCase() + camelKey.slice(1)]
}

function selectStyle() {
  return {
    height: 40,
    background: 'rgba(0,0,0,0.15)',
    border: '1px solid var(--color-border)',
    borderRadius: 6,
    color: 'var(--color-text-primary)',
    fontSize: 14,
    padding: '0 12px',
  }
}

function FilterField({ id, label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      {children}
    </div>
  )
}

function SectionHeader({ title, note }) {
  return (
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
      <strong style={{ fontSize: 13 }}>{title}</strong>
      {note ? <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{note}</span> : null}
    </div>
  )
}

function SummaryLine({ label, value, indent = false, strong = false }) {
  return (
    <tr>
      <td style={{ paddingLeft: indent ? 28 : undefined, fontWeight: strong ? 700 : undefined }}>
        {label}
      </td>
      <td className="mono" style={{ textAlign: 'right', fontWeight: strong ? 800 : undefined }}>
        {formatAmount(value)}
      </td>
    </tr>
  )
}

export default function MonthEndReportPage() {
  const [initial] = useState(currentColomboYearMonth)
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)

  const params = useMemo(() => ({ year, month }), [year, month])
  const reportQuery = useMonthEndReport(params)
  const report = reportQuery.data
  const summary = report ? read(report, 'summary') : null
  const matrix = report ? read(report, 'matrix') : null
  const columns = matrix ? read(matrix, 'columns') || [] : []
  const matrixRows = matrix ? read(matrix, 'rows') || [] : []
  const collectors = summary ? read(summary, 'cashCollectors') || [] : []
  const failedChecks = report ? (read(report, 'checks') || []).filter((check) => !check.passed) : []
  const stockAsOf = report ? formatColomboDateTime(read(report, 'stockAsOf')) : ''
  const isBusy = reportQuery.isLoading || reportQuery.isFetching

  const yearOptions = useMemo(() => {
    const options = []
    for (let value = initial.year; value >= initial.year - 5; value -= 1) options.push(value)
    if (!options.includes(year)) options.push(year)
    return options.sort((a, b) => b - a)
  }, [initial.year, year])

  async function handleExportPdf() {
    setIsExportingPdf(true)
    try {
      await openPdfInNewTab('/api/reports/month-end/export', { ...params, format: 'pdf' })
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
        '/api/reports/month-end/export',
        { ...params, format: 'excel' },
        `month-end-report-${year}-${String(month).padStart(2, '0')}.xlsx`
      )
    } catch (error) {
      toast.error(error.message || 'Unable to export Excel.')
    } finally {
      setIsExportingExcel(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Month End Report{report ? ` - ${read(report, 'monthLabel')}` : ''}
        </h1>
        <p style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-dim)' }}>
          Invoices dated in the selected month (Asia/Colombo). Draft and cancelled invoices are
          excluded.
        </p>
      </div>

      <div
        className="panel"
        style={{ padding: 12, display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}
      >
        <FilterField id="month-end-month" label="Month">
          <select
            id="month-end-month"
            className="form-input"
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            style={{ ...selectStyle(), width: 160 }}
          >
            {MONTHS.map((name, index) => (
              <option
                key={name}
                value={index + 1}
                style={{ background: 'var(--color-bg-elevated)' }}
              >
                {name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField id="month-end-year" label="Year">
          <select
            id="month-end-year"
            className="form-input"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            style={{ ...selectStyle(), width: 110 }}
          >
            {yearOptions.map((value) => (
              <option key={value} value={value} style={{ background: 'var(--color-bg-elevated)' }}>
                {value}
              </option>
            ))}
          </select>
        </FilterField>

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
      </div>

      {reportQuery.isError ? (
        <div
          className="panel"
          style={{ padding: 42, textAlign: 'center', color: 'var(--color-danger)' }}
        >
          {reportQuery.error?.message || 'Unable to load month end report.'}
        </div>
      ) : !report ? (
        <div
          className="panel"
          style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}
        >
          Loading month end report...
        </div>
      ) : (
        <>
          {failedChecks.length ? (
            <div
              className="panel"
              style={{
                padding: 12,
                border: '1px solid var(--color-danger)',
                color: 'var(--color-danger)',
                fontSize: 12,
              }}
            >
              <strong>This report does not reconcile:</strong>
              <ul style={{ margin: '6px 0 0 18px' }}>
                {failedChecks.map((check) => (
                  <li key={check.name}>
                    {check.name} (expected {formatAmount(check.expected)}, got{' '}
                    {formatAmount(check.actual)})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 14,
              opacity: isBusy ? 0.6 : 1,
            }}
          >
            <section className="panel" style={{ overflow: 'hidden' }}>
              <SectionHeader title="Summary" note={`Stock as of ${stockAsOf}`} />
              <table className="data-table product-table-compact">
                <tbody>
                  <SummaryLine label="Total Sale" value={read(summary, 'totalSale')} strong />
                  <SummaryLine label="Vehicle Sale" value={read(summary, 'vehicleSale')} indent />
                  <SummaryLine label="Credit" value={read(summary, 'credit')} strong />
                  <SummaryLine
                    label="Cash Short Total"
                    value={read(summary, 'cashShortTotal')}
                    strong
                  />
                  <SummaryLine
                    label="Total Discount"
                    value={read(summary, 'totalDiscount')}
                    strong
                  />
                  <SummaryLine
                    label="Vehicle Discount"
                    value={read(summary, 'vehicleDiscount')}
                    indent
                  />
                  <SummaryLine
                    label="Special - Supplier"
                    value={read(summary, 'specialDiscountSupplier')}
                    indent
                  />
                  <SummaryLine
                    label="Special - Distributor"
                    value={read(summary, 'specialDiscountDistributor')}
                    indent
                  />
                  <SummaryLine
                    label="Total Stock Value at Unit Cost"
                    value={read(summary, 'stockValueAtCost')}
                    strong
                  />
                  <SummaryLine
                    label="Total Stock Value at Selling Value"
                    value={read(summary, 'stockValueAtSellingPrice')}
                    strong
                  />
                </tbody>
              </table>
              <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--color-text-dim)' }}>
                Stock is the current stock at {stockAsOf}, not a month-end snapshot.
              </div>
            </section>

            <section className="panel" style={{ overflow: 'hidden' }}>
              <SectionHeader title="Cash Short by Collector" />
              {collectors.length ? (
                <table className="data-table product-table-compact">
                  <thead>
                    <tr>
                      <th>Collector</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collectors.map((collector) => (
                      <tr key={read(collector, 'collectorId')}>
                        <td>{read(collector, 'collectorName')}</td>
                        <td className="mono" style={{ textAlign: 'right' }}>
                          {formatAmount(read(collector, 'amount'))}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ fontWeight: 700 }}>Total</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                        {formatAmount(read(summary, 'cashShortTotal'))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No collection sessions in this month.
                </div>
              )}
            </section>
          </div>

          <section className="panel" style={{ overflow: 'hidden', opacity: isBusy ? 0.6 : 1 }}>
            <SectionHeader title="Delivery Run Matrix" note="Amounts in LKR" />
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table product-table-compact">
                <thead>
                  <tr>
                    <th />
                    {columns.map((column) => (
                      <th
                        key={read(column, 'key')}
                        style={{ textAlign: 'right' }}
                        title={read(column, 'name')}
                      >
                        {read(column, 'code')}
                      </th>
                    ))}
                    <th style={{ textAlign: 'right' }}>Special</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((row) => {
                    const special = read(row, 'special')
                    return (
                      <tr key={read(row, 'key')}>
                        <td style={{ fontWeight: 700 }}>{read(row, 'label')}</td>
                        {(read(row, 'values') || []).map((value, index) => (
                          <td
                            key={read(columns[index], 'key')}
                            className="mono"
                            style={{ textAlign: 'right' }}
                          >
                            {formatAmount(value)}
                          </td>
                        ))}
                        <td className="mono" style={{ textAlign: 'right' }}>
                          {special === null || special === undefined ? '-' : formatAmount(special)}
                        </td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                          {formatAmount(read(row, 'total'))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {!columns.length ? (
            <div style={{ padding: 12, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <CalendarDays
                size={20}
                style={{ margin: '0 auto 6px', color: 'var(--color-text-dim)' }}
              />
              No delivery runs are configured.
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
