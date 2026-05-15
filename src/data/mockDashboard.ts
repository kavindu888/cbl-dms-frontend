export const mockDashboardKpis = {
  todaySales: {
    value: 2847500,
    trendPct: 12,
    trendDir: 'up' as const,
    trendLabel: 'vs yesterday',
    sub: '47 invoices issued today',
  },
  outstandingCredit: {
    value: 8230000,
    alert: '6 overdue accounts',
    sub: 'Across 34 customers',
  },
  totalStockValue: {
    value: 41650000,
    trendPct: 3,
    trendDir: 'down' as const,
    trendLabel: 'vs last week',
    sub: '284 active SKUs in warehouse',
  },
  fleetOnRoad: {
    active: 3,
    total: 4,
    alert: '1 vehicle in maintenance',
    sub: 'Routes active since 06:00',
  },
}

export const mockWeeklySales = [
  { day: 'Mon', sales: 1800000 },
  { day: 'Tue', sales: 2200000 },
  { day: 'Wed', sales: 1500000 },
  { day: 'Thu', sales: 2600000 },
  { day: 'Fri', sales: 2000000 },
  { day: 'Sat', sales: 2800000 },
  { day: 'Sun', sales: 1200000 },
]

export const mockCollectionsVsInvoiced = [
  { date: 'Apr 1',  invoiced: 2100000, collected: 1800000 },
  { date: 'Apr 5',  invoiced: 2400000, collected: 2000000 },
  { date: 'Apr 10', invoiced: 2800000, collected: 2200000 },
  { date: 'Apr 15', invoiced: 2600000, collected: 2100000 },
  { date: 'Apr 20', invoiced: 3100000, collected: 2400000 },
  { date: 'Apr 25', invoiced: 3400000, collected: 2700000 },
  { date: 'Apr 28', invoiced: 2900000, collected: 2500000 },
]

export const mockRecentInvoices = [
  { id: 'INV-2026-0148', customer: 'Perera Stores',    amount: 43380,  type: 'Credit', status: 'PENDING'  },
  { id: 'INV-2026-0147', customer: 'Silva Mart',       amount: 28900,  type: 'Cash',   status: 'PAID'     },
  { id: 'INV-2026-0146', customer: 'Dissanayake SM',   amount: 61200,  type: 'Credit', status: 'OVERDUE'  },
  { id: 'INV-2026-0145', customer: 'Fernando Grocery', amount: 12750,  type: 'Cash',   status: 'PAID'     },
  { id: 'INV-2026-0144', customer: 'Jayawardena Pvt',  amount: 94500,  type: 'Credit', status: 'PENDING'  },
]

export const mockLowStock = [
  { sku: 'CBL-TBC-001', name: 'CBL Tiara Butter Cake',  cases: 3,  status: 'CRITICAL' },
  { sku: 'CBL-MCC-200', name: 'CBL Munchee Choc …',      cases: 5,  status: 'CRITICAL' },
  { sku: 'CBL-CHW-050', name: 'CBL Champion Wafer',      cases: 11, status: 'LOW' },
  { sku: 'CBL-RZB-100', name: 'CBL Ritzbury Dark',       cases: 7,  status: 'LOW' },
  { sku: 'CBL-MCN-150', name: 'CBL Munchee Coconut',     cases: 14, status: 'LOW' },
]

export const mockFleetStatus = [
  { reg: 'WP-KH-3421', type: 'Lorry 3T',   status: 'ON ROUTE',    driver: 'K.Bandara',  route: 'Colombo North' },
  { reg: 'WP-GA-7823', type: 'Lorry 1.5T', status: 'ON ROUTE',    driver: 'R.Fernando', route: 'Gampaha'       },
  { reg: 'WP-MB-4521', type: 'Van',         status: 'IN WAREHOUSE',driver: '—',          route: '—'             },
]
