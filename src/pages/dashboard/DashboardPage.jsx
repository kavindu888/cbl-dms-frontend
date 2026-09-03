import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import minMax from 'dayjs/plugin/minMax'
import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { salesService } from '@/services/api/salesService'
import { collectionsService } from '@/services/api/collectionsService'
import { inventoryService } from '@/services/api/inventoryService'
import { useVehicles } from '@/hooks/useVehicle'
import { useCustomerById } from '@/hooks/useCustomers'
import { formatLKR, formatLKRShort } from '@/utils/formatCurrency'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.extend(minMax)

const ROUTE_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#64748B']
const INVOICE_ACTIVE_STATUSES = new Set(['Unpaid', 'PartiallyPaid', 'Paid'])
const STOCK_SELLING_MARKUP_RATE = 0.067

const panelStyle = {
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  boxShadow: 'none',
}

const chartTooltipStyle = {
  backgroundColor: 'var(--color-bg-surface)',
  borderColor: 'var(--color-border)',
  borderRadius: 8,
  color: 'var(--color-text-primary)',
  fontSize: 12,
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`
}

function formatAxisMoney(value) {
  if (!value) return 'Rs. 0'
  if (Math.abs(value) >= 1000000) return `Rs. ${(value / 1000000).toFixed(1)}M`
  return `Rs. ${Math.round(value / 1000)}K`
}

function getTodayLabel() {
  return new Intl.DateTimeFormat('en-LK', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())
}

function StatusPill({ status }) {
  const normalized = String(status || '').toLowerCase()
  const isGood = ['paid', 'applied', 'on route'].includes(normalized)
  const isBad = ['overdue', 'critical', 'cancelled'].includes(normalized)

  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 20,
        padding: '1px 7px',
        borderRadius: 6,
        border: `1px solid ${
          isGood
            ? 'color-mix(in srgb, var(--color-teal) 45%, transparent)'
            : isBad
              ? 'color-mix(in srgb, var(--color-danger) 45%, transparent)'
              : 'var(--color-border)'
        }`,
        background: isGood
          ? 'color-mix(in srgb, var(--color-teal) 12%, transparent)'
          : isBad
            ? 'color-mix(in srgb, var(--color-danger) 12%, transparent)'
            : 'var(--color-bg-elevated)',
        color: isGood
          ? 'var(--color-teal)'
          : isBad
            ? 'var(--color-danger)'
            : 'var(--color-text-muted)',
        fontSize: 10,
        fontWeight: 700,
      }}
    >
      {status}
    </span>
  )
}

function TrendChip({ trend }) {
  if (!trend) return null
  const isUp = trend.direction === 'up'
  const sign = isUp ? '+' : ''
  const cleanLabel =
    trend.label.startsWith('+') || trend.label.startsWith('-')
      ? trend.label
      : `${sign}${trend.label}`

  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: '2px 6px',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        backgroundColor: isUp
          ? 'color-mix(in srgb, var(--color-teal) 12%, transparent)'
          : 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
        color: isUp ? 'var(--color-teal)' : 'var(--color-danger)',
      }}
    >
      {cleanLabel} {isUp ? '↗' : '↘'}
    </span>
  )
}

function MetricCard({ title, value, detail, tone = 'neutral', trend, isLoading }) {
  const toneColor =
    tone === 'accent'
      ? 'var(--color-amber)'
      : tone === 'success'
        ? 'var(--color-teal)'
        : tone === 'danger'
          ? 'var(--color-danger)'
          : 'var(--color-text-primary)'

  return (
    <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-dim)', margin: 0 }}>
        {title}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <p
          style={{
            color: isLoading ? 'var(--color-text-dim)' : toneColor,
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: '-0.5px',
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {isLoading ? '—' : value}
        </p>
        {isLoading ? null : <TrendChip trend={trend} />}
      </div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 12, margin: 0 }}>{detail}</p>
    </div>
  )
}

function SectionPanel({ title, subtitle, action, children, style }) {
  return (
    <section style={{ ...panelStyle, padding: '16px 0', ...style }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 14,
        }}
      >
        <div>
          <h2 style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 750 }}>
            {title}
          </h2>
          {subtitle ? (
            <p style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 13 }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function DividerRight({ className = 'hidden md:block' }) {
  return (
    <div
      className={`${className} absolute right-0 top-3 bottom-3 w-px`}
      style={{ backgroundColor: 'var(--color-border)' }}
    />
  )
}

function DividerBottom({ className = 'block md:hidden' }) {
  return (
    <div
      className={`${className} absolute bottom-0 left-6 right-6 h-px`}
      style={{ backgroundColor: 'var(--color-border)' }}
    />
  )
}

function EmptyRow({ children }) {
  return (
    <div style={{ color: 'var(--color-text-dim)', fontSize: 12, padding: '10px 0' }}>
      {children}
    </div>
  )
}

// ---- data loading -----------------------------------------------------

function isoRange(from, to) {
  return {
    from: dayjs(from).startOf('day').toISOString(),
    to: dayjs(to).endOf('day').toISOString(),
  }
}

async function safe(promise, fallback) {
  try {
    return await promise
  } catch {
    return fallback
  }
}

async function loadAllStockLocations() {
  const firstPage = await inventoryService.listStockLocations({ page: 1, pageSize: 100 })
  const locations = [...(firstPage.items || [])]
  const totalPages = Number(firstPage.totalPages || 1)

  if (totalPages > 1) {
    const remainingPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        inventoryService.listStockLocations({ page: index + 2, pageSize: 100 })
      )
    )
    remainingPages.forEach((page) => locations.push(...(page.items || [])))
  }

  return locations
}

function useDashboardData() {
  const [state, setState] = useState({
    isLoading: true,
    invoices: [],
    sessions: [],
    customerAccounts: [],
    activeBatches: [],
    stockLocations: [],
    appliedLoadings: [],
  })

  useEffect(() => {
    let active = true
    const today = dayjs()
    const windowStart = dayjs.min(today.startOf('month'), today.subtract(6, 'day'))
    const { from, to } = isoRange(windowStart, today)

    async function load() {
      const [invoices, sessions, customerAccounts, activeBatches, stockLocations, appliedLoadings] =
        await Promise.all([
          safe(salesService.listInvoices({ from, to, pageSize: 1000 }), []),
          safe(
            collectionsService.listCollectionSessions({
              from: windowStart.format('YYYY-MM-DD'),
              to: today.format('YYYY-MM-DD'),
              pageSize: 500,
            }),
            []
          ),
          safe(collectionsService.listCustomerAccounts({ pageSize: 200 }), []),
          safe(inventoryService.listActiveStockBatches(), []),
          safe(loadAllStockLocations(), []),
          safe(inventoryService.listVehicleLoadings({ status: 2 }), []),
        ])

      if (!active) return
      setState({
        isLoading: false,
        invoices,
        sessions,
        customerAccounts,
        activeBatches,
        stockLocations,
        appliedLoadings,
      })
    }

    load()
    return () => {
      active = false
    }
  }, [])

  return state
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const data = useDashboardData()
  const { data: vehicles = [] } = useVehicles()
  const { customerById } = useCustomerById()

  const today = dayjs()
  const todayStr = today.format('YYYY-MM-DD')
  const yesterdayStr = today.subtract(1, 'day').format('YYYY-MM-DD')

  const activeInvoices = useMemo(
    () => data.invoices.filter((inv) => INVOICE_ACTIVE_STATUSES.has(inv.status)),
    [data.invoices]
  )

  const todaySales = useMemo(
    () =>
      activeInvoices
        .filter((inv) => dayjs(inv.invoiceDate).format('YYYY-MM-DD') === todayStr)
        .reduce((sum, inv) => sum + inv.netAmount, 0),
    [activeInvoices, todayStr]
  )

  const yesterdaySales = useMemo(
    () =>
      activeInvoices
        .filter((inv) => dayjs(inv.invoiceDate).format('YYYY-MM-DD') === yesterdayStr)
        .reduce((sum, inv) => sum + inv.netAmount, 0),
    [activeInvoices, yesterdayStr]
  )

  const salesTrend = useMemo(() => {
    if (!yesterdaySales) return null
    const change = ((todaySales - yesterdaySales) / yesterdaySales) * 100
    return { direction: change >= 0 ? 'up' : 'down', label: `${Math.abs(change).toFixed(0)}%` }
  }, [todaySales, yesterdaySales])

  const weeklySalesData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => today.subtract(6 - i, 'day'))
    return days.map((day) => {
      const dayStr = day.format('YYYY-MM-DD')
      const sales = activeInvoices
        .filter((inv) => dayjs(inv.invoiceDate).format('YYYY-MM-DD') === dayStr)
        .reduce((sum, inv) => sum + inv.netAmount, 0)
      return { day: day.format('ddd'), sales }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInvoices])

  const salesByRouteData = useMemo(() => {
    const totals = new Map()
    for (const inv of activeInvoices) {
      const name = inv.salesRouteName || 'Unassigned'
      totals.set(name, (totals.get(name) || 0) + inv.netAmount)
    }
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, 4)
    const otherTotal = sorted.slice(4).reduce((sum, [, value]) => sum + value, 0)
    const rows = top.map(([name, value], index) => ({
      name,
      value: Math.round(value),
      color: ROUTE_COLORS[index % ROUTE_COLORS.length],
    }))
    if (otherTotal > 0) rows.push({ name: 'Other routes', value: Math.round(otherTotal), color: ROUTE_COLORS[4] })
    return rows
  }, [activeInvoices])

  const totalRouteValue = salesByRouteData.reduce((sum, r) => sum + r.value, 0)

  const collectionsVsInvoicedData = useMemo(() => {
    const monthStart = today.startOf('month')
    const sampleDays = []
    for (let d = monthStart; d.isBefore(today) || d.isSame(today, 'day'); d = d.add(3, 'day')) {
      sampleDays.push(d)
    }
    if (sampleDays[sampleDays.length - 1]?.format('YYYY-MM-DD') !== todayStr) sampleDays.push(today)

    return sampleDays.map((point) => {
      const upTo = point.format('YYYY-MM-DD')
      const invoiced = activeInvoices
        .filter((inv) => dayjs(inv.invoiceDate).isSameOrBefore(upTo, 'day') && dayjs(inv.invoiceDate).isSameOrAfter(monthStart, 'day'))
        .reduce((sum, inv) => sum + inv.netAmount, 0)
      const collected = data.sessions
        .filter((s) => dayjs(s.sessionDate).isSameOrBefore(upTo, 'day') && dayjs(s.sessionDate).isSameOrAfter(monthStart, 'day'))
        .reduce((sum, s) => sum + (s.totalAmount || 0), 0)
      return { date: point.format('MMM D'), collected: Math.round(collected), invoiced: Math.round(invoiced) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInvoices, data.sessions, todayStr])

  const recentInvoices = useMemo(
    () =>
      [...data.invoices]
        .filter((inv) => inv.status !== 'Draft')
        .sort((a, b) => dayjs(b.updatedAt || b.invoiceDate).valueOf() - dayjs(a.updatedAt || a.invoiceDate).valueOf())
        .slice(0, 5),
    [data.invoices]
  )

  const outstandingCredit = useMemo(() => {
    const positive = data.customerAccounts.filter((acc) => acc.currentBalance > 0)
    return {
      total: positive.reduce((sum, acc) => sum + acc.currentBalance, 0),
      accountCount: positive.length,
    }
  }, [data.customerAccounts])

  const stockStats = useMemo(() => {
    const byProduct = new Map()
    const locationById = new Map(
      data.stockLocations.map((location) => [location.id, location])
    )
    let value = 0
    let sellingValue = 0

    for (const batch of data.activeBatches) {
      const qty = Number(batch.qtyAvailable || 0)
      if (qty <= 0) continue

      const unitCost = Number(batch.unitCostSmallest || 0)
      const location = locationById.get(batch.stockLocationId)
      const isMainStock = !location?.isVehicle && !location?.isReturnLocation

      value += qty * unitCost
      if (isMainStock) {
        sellingValue += qty * (unitCost + unitCost * STOCK_SELLING_MARKUP_RATE)
      }
      byProduct.set(batch.productId, (byProduct.get(batch.productId) || 0) + qty)
    }
    return { value, sellingValue, skuCount: byProduct.size }
  }, [data.activeBatches, data.stockLocations])

  const todaysAppliedLoadings = useMemo(
    () => data.appliedLoadings.filter((l) => dayjs(l.loadingDate).format('YYYY-MM-DD') === todayStr),
    [data.appliedLoadings, todayStr]
  )

  const vehiclesOnRoad = useMemo(
    () => new Set(todaysAppliedLoadings.map((l) => l.vehicleLocationId)).size,
    [todaysAppliedLoadings]
  )

  const todaySessions = useMemo(
    () => data.sessions.filter((s) => dayjs(s.sessionDate).format('YYYY-MM-DD') === todayStr),
    [data.sessions, todayStr]
  )

  const cashToday = todaySessions.reduce((sum, s) => sum + (s.totalCash || 0), 0)
  const chequeToday = todaySessions.reduce((sum, s) => sum + (s.totalCheques || 0), 0)
  const cashChequeTotal = cashToday + chequeToday || 1

  const isLoading = data.isLoading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 18 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ color: 'var(--color-text-primary)', fontSize: 24, fontWeight: 800 }}>
            Dashboard
          </h1>
          <p style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 13 }}>
            {getTodayLabel()} - Operational view for sales, collections, stock, and fleet.
          </p>
        </div>
      </header>

      {/* Metric Cards Row */}
      <section
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-y-4 xl:gap-y-0"
        style={{ background: 'transparent', padding: '8px 0' }}
      >
        <div className="relative">
          <MetricCard
            title="Today's Sales"
            value={formatCurrency(todaySales)}
            detail="Compared to yesterday"
            tone="accent"
            trend={salesTrend}
            isLoading={isLoading}
          />
          <DividerRight className="hidden xl:block" />
          <DividerBottom className="block xl:hidden" />
        </div>

        <div className="relative">
          <MetricCard
            title="Outstanding Credit"
            value={formatCurrency(outstandingCredit.total)}
            detail={`${outstandingCredit.accountCount} customer account${outstandingCredit.accountCount === 1 ? '' : 's'} with a balance`}
            tone="neutral"
            isLoading={isLoading}
          />
          <DividerRight className="hidden xl:block" />
          <DividerBottom className="block xl:hidden" />
        </div>

        <div className="relative">
          <MetricCard
            title="Total Stock Value"
            value={formatCurrency(stockStats.value)}
            detail={`${stockStats.skuCount} active SKUs with stock on hand`}
            tone="neutral"
            isLoading={isLoading}
          />
          <DividerRight className="hidden xl:block" />
          <DividerBottom className="block xl:hidden" />
        </div>

        <div className="relative">
          <MetricCard
            title="Stock Selling Value"
            value={formatLKRShort(stockStats.sellingValue)}
            detail={`Main stock at batch cost + 6.7% | Full value ${formatLKR(stockStats.sellingValue)}`}
            tone="neutral"
            isLoading={isLoading}
          />
          <DividerRight className="hidden xl:block" />
          <DividerBottom className="block xl:hidden" />
        </div>

        <div className="relative">
          <MetricCard
            title="Fleet On Road"
            value={`${vehiclesOnRoad} / ${vehicles.length}`}
            detail="Vehicles with an applied load today"
            tone="success"
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* First Row of Charts (Sales & Collections) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ padding: '8px 0' }}>
        <div className="relative">
          <SectionPanel
            title="Sales This Week"
            subtitle={`${today.subtract(6, 'day').format('D MMM')} - ${today.format('D MMM')}, LKR`}
          >
            <div style={{ width: '100%', minWidth: 0, height: 220 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 220 }}>
                <BarChart data={weeklySalesData} margin={{ top: 10, right: 14, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--color-text-dim)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="var(--color-text-dim)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatAxisMoney}
                    width={64}
                  />
                  <ChartTooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value) => [formatCurrency(value), 'Sales']}
                    labelStyle={{ color: 'var(--color-text-muted)', fontWeight: 700 }}
                  />
                  <Bar dataKey="sales" fill="url(#salesBarGrad)" radius={[6, 6, 0, 0]} barSize={34} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionPanel>
          <DividerRight className="hidden md:block -right-4" />
          <DividerBottom />
        </div>

        <div className="relative">
          <SectionPanel title="Collections vs Invoiced" subtitle={`${today.format('MMMM YYYY')} cumulative, LKR`}>
            <div style={{ width: '100%', minWidth: 0, height: 220 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 220 }}>
                <AreaChart data={collectionsVsInvoicedData} margin={{ top: 10, right: 14, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="collectedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="invoicedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--color-text-dim)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="var(--color-text-dim)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatAxisMoney}
                    width={64}
                  />
                  <ChartTooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value, name) => [formatCurrency(value), name]}
                    labelStyle={{ color: 'var(--color-text-muted)', fontWeight: 700 }}
                  />
                  <Area type="monotone" dataKey="collected" stroke="#10B981" strokeWidth={2.5} fill="url(#collectedAreaGrad)" activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="invoiced" stroke="#3B82F6" strokeWidth={2.5} fill="url(#invoicedAreaGrad)" activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionPanel>
        </div>
      </section>

      {/* Second Row (Invoices Table, Route mix, Cash/Cheque) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8" style={{ alignItems: 'start', padding: '8px 0' }}>
        <div className="relative">
          <SectionPanel title="Recent Invoices" subtitle="Latest posted sales activity">
            {recentInvoices.length ? (
              <div className="overflow-x-auto">
                <table className="data-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ background: 'transparent', paddingLeft: 0 }}>Invoice</th>
                      <th style={{ background: 'transparent' }}>Customer</th>
                      <th style={{ background: 'transparent' }}>Amount</th>
                      <th style={{ background: 'transparent', paddingRight: 0 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/sales/invoices/${invoice.id}`)}
                      >
                        <td className="mono" style={{ color: 'var(--color-amber)', fontWeight: 700, paddingLeft: 0 }}>
                          {invoice.invoiceNumber}
                        </td>
                        <td>{customerById[invoice.customerId]?.name || invoice.customerId}</td>
                        <td className="mono" style={{ fontWeight: 650 }}>
                          {formatCurrency(invoice.netAmount)}
                        </td>
                        <td style={{ paddingRight: 0 }}>
                          <StatusPill status={invoice.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyRow>{isLoading ? 'Loading...' : 'No recent invoices in this window.'}</EmptyRow>
            )}
          </SectionPanel>
          <DividerRight className="hidden lg:block -right-4" />
          <DividerBottom />
        </div>

        {/* Sales by Route */}
        <div className="relative">
          <SectionPanel title="Sales by Route" subtitle="Top routes this week, by invoiced value">
            {totalRouteValue > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    minWidth: 0,
                    height: 124,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 124 }}>
                    <PieChart>
                      <Pie
                        data={salesByRouteData}
                        cx="50%"
                        cy="100%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={48}
                        outerRadius={68}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {salesByRouteData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', bottom: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>
                      {formatAxisMoney(totalRouteValue)}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-dim)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      This Week
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {salesByRouteData.map((segment) => (
                    <div key={segment.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: segment.color }} />
                        {segment.name}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {Math.round((segment.value / totalRouteValue) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyRow>{isLoading ? 'Loading...' : 'No route sales in this window.'}</EmptyRow>
            )}
          </SectionPanel>
          <DividerRight className="hidden lg:block -right-4" />
          <DividerBottom />
        </div>

        {/* Cash & Cheque Collections Summary */}
        <div className="relative">
          <SectionPanel title="Cash & Cheque Summary" subtitle="Breakdown of today's collections by payment instrument">
            {cashToday + chequeToday > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 6 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-teal)' }} />
                      Cash Collections
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 850, color: 'var(--color-text-primary)' }}>
                      {formatCurrency(cashToday)} ({Math.round((cashToday / cashChequeTotal) * 100)}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(cashToday / cashChequeTotal) * 100}%`, height: '100%', background: 'var(--color-teal)', borderRadius: 3 }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-blue)' }} />
                      Cheque Collections
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 850, color: 'var(--color-text-primary)' }}>
                      {formatCurrency(chequeToday)} ({Math.round((chequeToday / cashChequeTotal) * 100)}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(chequeToday / cashChequeTotal) * 100}%`, height: '100%', background: 'var(--color-blue)', borderRadius: 3 }} />
                  </div>
                </div>
              </div>
            ) : (
              <EmptyRow>{isLoading ? 'Loading...' : 'No collections recorded today yet.'}</EmptyRow>
            )}
          </SectionPanel>
        </div>
      </section>

    </div>
  )
}
