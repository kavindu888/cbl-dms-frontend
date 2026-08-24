import dayjs from 'dayjs'
import {
  AlertTriangle,
  Banknote,
  FileSpreadsheet,
  FileText,
  Package,
  Search,
  Warehouse,
  X,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import SimplePagination from '@components/ui/SimplePagination'
import StatusBadge from '@components/ui/StatusBadge'
import { useCategories, useReportStockLocations, useStockReport } from '@/hooks/useReports'
import { formatDate } from '@/utils'
import { formatLKR } from '@/utils/formatCurrency'
import { downloadExcel, openPdfInNewTab } from '@/utils/fileDownload'

const pageSize = 20

const REPORT_TABS = [
  ['onhand', 'On Hand', Package],
  ['valuation', 'Valuation', Banknote],
  ['expiry', 'Expiry', AlertTriangle],
]

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 })
}

function normalizeRow(row) {
  return {
    productId: row.productId ?? row.product?.id ?? '',
    productName: row.productName ?? row.product?.name ?? 'Unknown product',
    sku: row.sku ?? row.productSku ?? row.product?.sku ?? '—',
    categoryId: row.categoryId ?? row.category?.id ?? '',
    categoryName: row.categoryName ?? row.category?.name ?? 'Uncategorized',
    locationName: row.locationName ?? row.stockLocationName ?? row.location?.name ?? '—',
    batchNo: row.batchNo ?? row.batchNumber ?? '—',
    expiryDate: row.expiryDate ?? null,
    smallestUnitCode: row.smallestUnitCode ?? row.SmallestUnitCode ?? 'PCS',
    qtyAvailable: Number(row.qtyAvailable ?? 0),
    qtyReserved: Number(row.qtyReserved ?? 0),
    unitCost: Number(row.unitCost ?? 0),
    mrp: Number(row.mrp ?? 0),
    totalValue: Number(row.totalValue ?? Number(row.qtyAvailable ?? 0) * Number(row.unitCost ?? 0)),
    status: row.status ?? '',
  }
}

function expiryTone(expiryDate) {
  if (!expiryDate) return null
  const daysUntil = dayjs(expiryDate).startOf('day').diff(dayjs().startOf('day'), 'day')
  if (daysUntil <= 3) return 'var(--color-danger)'
  if (daysUntil <= 7) return 'var(--color-warning)'
  return null
}

function FilterSelect({ value, onChange, options, placeholder, width = 220, disabled }) {
  return (
    <div style={{ position: 'relative', width }}>
      <select
        className="form-input"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        style={{
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
        }}
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

export default function StockReportPage() {
  const [reportType, setReportType] = useState('onhand')
  const [page, setPage] = useState(1)

  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [filterStockLocationId, setFilterStockLocationId] = useState('')
  const [filterExpiringWithinDays, setFilterExpiringWithinDays] = useState('30')

  const [appliedCategoryId, setAppliedCategoryId] = useState('')
  const [appliedStockLocationId, setAppliedStockLocationId] = useState('')
  const [appliedExpiringWithinDays, setAppliedExpiringWithinDays] = useState('30')

  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)

  const { data: categories = [], isLoading: isLoadingCategories } = useCategories()
  const { data: locationsPage, isLoading: isLoadingLocations } = useReportStockLocations()
  const stockLocations = locationsPage?.items || []

  const queryParams = useMemo(() => {
    const params = { page, pageSize, reportType }
    if (appliedCategoryId) params.categoryId = appliedCategoryId
    if (appliedStockLocationId) params.stockLocationId = appliedStockLocationId
    if (reportType === 'expiry' && appliedExpiringWithinDays) {
      params.expiringWithinDays = Number(appliedExpiringWithinDays)
    }
    return params
  }, [page, reportType, appliedCategoryId, appliedStockLocationId, appliedExpiringWithinDays])

  const { data, isLoading, isFetching } = useStockReport(queryParams)

  useEffect(() => {
    setPage(1)
  }, [reportType, appliedCategoryId, appliedStockLocationId, appliedExpiringWithinDays])

  const rows = useMemo(() => (data?.items || []).map(normalizeRow), [data])
  const totalItems = Number(data?.totalItems ?? rows.length)

  const displayRows = useMemo(() => {
    if (reportType !== 'expiry') return rows
    return [...rows].sort(
      (a, b) => dayjs(a.expiryDate || 0).valueOf() - dayjs(b.expiryDate || 0).valueOf()
    )
  }, [rows, reportType])

  const valuationGroups = useMemo(() => {
    if (reportType !== 'valuation') return null
    const groups = new Map()
    for (const row of rows) {
      const key = row.categoryId || row.categoryName
      const group = groups.get(key) || {
        categoryName: row.categoryName,
        rows: [],
        totalQty: 0,
        totalValue: 0,
      }
      group.rows.push(row)
      group.totalQty += row.qtyAvailable
      group.totalValue += row.totalValue
      groups.set(key, group)
    }
    return [...groups.values()]
  }, [rows, reportType])

  function handleApply(event) {
    event?.preventDefault()
    setAppliedCategoryId(filterCategoryId)
    setAppliedStockLocationId(filterStockLocationId)
    setAppliedExpiringWithinDays(filterExpiringWithinDays)
  }

  function handleClear() {
    setFilterCategoryId('')
    setFilterStockLocationId('')
    setFilterExpiringWithinDays('30')
    setAppliedCategoryId('')
    setAppliedStockLocationId('')
    setAppliedExpiringWithinDays('30')
  }

  function buildExportParams() {
    const params = { reportType }
    if (appliedCategoryId) params.categoryId = appliedCategoryId
    if (appliedStockLocationId) params.stockLocationId = appliedStockLocationId
    if (reportType === 'expiry' && appliedExpiringWithinDays) {
      params.expiringWithinDays = Number(appliedExpiringWithinDays)
    }
    return params
  }

  async function handleExportPdf() {
    setIsExportingPdf(true)
    try {
      await openPdfInNewTab('/api/reports/stock/export', { ...buildExportParams(), format: 'pdf' })
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
        '/api/reports/stock/export',
        { ...buildExportParams(), format: 'excel' },
        `stock-report-${reportType}.xlsx`
      )
    } catch (error) {
      toast.error(error.message || 'Unable to export Excel.')
    } finally {
      setIsExportingExcel(false)
    }
  }

  const columns = useMemo(() => {
    if (reportType === 'onhand') {
      return [
        { key: 'product', label: 'Product' },
        { key: 'category', label: 'Category' },
        { key: 'location', label: 'Location' },
        { key: 'batchNo', label: 'Batch No' },
        { key: 'expiryDate', label: 'Expiry Date' },
        { key: 'qtyAvailable', label: 'Qty Available', align: 'right' },
        { key: 'status', label: 'Status' },
      ]
    }
    if (reportType === 'valuation') {
      return [
        { key: 'product', label: 'Product' },
        { key: 'location', label: 'Location' },
        { key: 'qtyAvailable', label: 'Qty Available', align: 'right' },
        { key: 'unitCost', label: 'Unit Cost', align: 'right' },
        { key: 'mrp', label: 'MRP', align: 'right' },
        { key: 'totalValue', label: 'Total Value', align: 'right' },
        { key: 'status', label: 'Status' },
      ]
    }
    return [
      { key: 'product', label: 'Product' },
      { key: 'category', label: 'Category' },
      { key: 'location', label: 'Location' },
      { key: 'batchNo', label: 'Batch No' },
      { key: 'expiryDate', label: 'Expiry Date' },
      { key: 'qtyAvailable', label: 'Qty Available', align: 'right' },
      { key: 'unitCost', label: 'Unit Cost', align: 'right' },
      { key: 'mrp', label: 'MRP', align: 'right' },
      { key: 'totalValue', label: 'Total Value', align: 'right' },
      { key: 'status', label: 'Status' },
    ]
  }, [reportType])

  function renderCell(row, columnKey) {
    switch (columnKey) {
      case 'product':
        return (
          <div>
            <div style={{ fontWeight: 700 }}>{row.productName}</div>
            <div
              className="mono"
              style={{ marginTop: 2, fontSize: 10, color: 'var(--color-text-dim)' }}
            >
              {row.sku}
            </div>
          </div>
        )
      case 'category':
        return row.categoryName
      case 'location':
        return row.locationName
      case 'batchNo':
        return <span className="mono">{row.batchNo}</span>
      case 'expiryDate': {
        const tone = expiryTone(row.expiryDate)
        return (
          <span className="mono" style={tone ? { color: tone, fontWeight: 700 } : undefined}>
            {formatDate(row.expiryDate)}
          </span>
        )
      }
      case 'qtyAvailable':
        return (
          <>
            {formatNumber(row.qtyAvailable)}{' '}
            <span className="uom-badge">{row.smallestUnitCode}</span>
          </>
        )
      case 'unitCost':
        return formatLKR(row.unitCost)
      case 'mrp':
        return formatLKR(row.mrp)
      case 'totalValue':
        return formatLKR(row.totalValue)
      case 'status':
        return <StatusBadge status={row.status} />
      default:
        return null
    }
  }

  const isBusy = isLoading || isFetching

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        <h1 style={{ fontSize: 25, fontWeight: 800 }}>Stock Report</h1>
        <p style={{ marginTop: 3, fontSize: 13, color: 'var(--color-text-muted)' }}>
          On-hand, valuation, and expiry views of inventory across all stock locations.
        </p>
      </header>

      <div
        className="panel"
        style={{ padding: '0 14px', display: 'flex', gap: 4, overflowX: 'auto' }}
      >
        {REPORT_TABS.map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setReportType(key)}
            style={{
              padding: '12px 13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              borderBottom:
                reportType === key ? '2px solid var(--color-amber)' : '2px solid transparent',
              color: reportType === key ? 'var(--color-amber)' : 'var(--color-text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleApply}
        className="panel responsive-filter-bar"
        style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
      >
        <FilterSelect
          value={filterCategoryId}
          onChange={setFilterCategoryId}
          placeholder={isLoadingCategories ? 'Loading categories...' : 'All categories'}
          options={categories.map((category) => ({ value: category.id, label: category.name }))}
          width={220}
        />

        <FilterSelect
          value={filterStockLocationId}
          onChange={setFilterStockLocationId}
          placeholder={isLoadingLocations ? 'Loading locations...' : 'All stock locations'}
          options={stockLocations.map((location) => ({ value: location.id, label: location.name }))}
          width={220}
        />

        {reportType === 'expiry' ? (
          <div style={{ width: 200 }}>
            <input
              type="number"
              min={1}
              className="form-input"
              placeholder="Expiring within (days)"
              value={filterExpiringWithinDays}
              onChange={(event) => setFilterExpiringWithinDays(event.target.value)}
              style={{
                width: '100%',
                height: 40,
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                color: 'var(--color-text-primary)',
                fontSize: 14,
              }}
            />
          </div>
        ) : null}

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
            <Warehouse size={15} color="var(--color-amber)" />
            <strong style={{ fontSize: 13 }}>
              {REPORT_TABS.find(([key]) => key === reportType)?.[1]} stock report
            </strong>
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
            {totalItems} row{totalItems === 1 ? '' : 's'}
          </span>
        </div>

        {isBusy ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading stock report...
          </div>
        ) : displayRows.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table product-table-compact">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      style={column.align ? { textAlign: column.align } : undefined}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportType === 'valuation'
                  ? valuationGroups.map((group) => (
                      <Fragment key={group.categoryName}>
                        <tr
                          style={{
                            background:
                              'color-mix(in srgb, var(--color-bg-elevated) 65%, transparent)',
                          }}
                        >
                          <td colSpan={columns.length} style={{ fontWeight: 800 }}>
                            {group.categoryName}
                          </td>
                        </tr>
                        {group.rows.map((row) => (
                          <tr key={row.productId + row.locationName}>
                            {columns.map((column) => (
                              <td
                                key={column.key}
                                className={
                                  ['qtyAvailable', 'unitCost', 'mrp', 'totalValue'].includes(
                                    column.key
                                  )
                                    ? 'mono'
                                    : undefined
                                }
                                style={column.align ? { textAlign: column.align } : undefined}
                              >
                                {renderCell(row, column.key)}
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr
                          style={{
                            background:
                              'color-mix(in srgb, var(--color-bg-elevated) 45%, transparent)',
                          }}
                        >
                          <td style={{ fontWeight: 700 }}>Subtotal</td>
                          <td></td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                            {formatNumber(group.totalQty)}
                          </td>
                          <td></td>
                          <td></td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                            {formatLKR(group.totalValue)}
                          </td>
                          <td></td>
                        </tr>
                      </Fragment>
                    ))
                  : displayRows.map((row) => (
                      <tr key={`${row.productId}-${row.locationName}-${row.batchNo}`}>
                        {columns.map((column) => (
                          <td
                            key={column.key}
                            className={
                              ['qtyAvailable', 'unitCost', 'mrp', 'totalValue'].includes(column.key)
                                ? 'mono'
                                : undefined
                            }
                            style={column.align ? { textAlign: column.align } : undefined}
                          >
                            {renderCell(row, column.key)}
                          </td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Package size={27} style={{ margin: '0 auto 8px', color: 'var(--color-text-dim)' }} />
            No stock report rows match the current filters.
          </div>
        )}

        {displayRows.length ? (
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
