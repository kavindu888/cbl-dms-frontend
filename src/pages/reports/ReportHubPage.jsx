import { BarChart2, Download, FileText, TrendingUp, Truck, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
const REPORT_CARDS = [
  {
    type: 'sales-summary',
    icon: <TrendingUp className="h-6 w-6" />,
    title: 'Sales Summary',
    description: 'Daily, weekly, and monthly sales totals by route and product category.',
    color: 'var(--color-amber)',
    tag: 'OPERATIONS',
  },
  {
    type: 'stock-valuation',
    icon: <BarChart2 className="h-6 w-6" />,
    title: 'Stock Valuation',
    description: 'Current stock levels and total warehouse value by SKU and category.',
    color: 'var(--color-teal)',
    tag: 'INVENTORY',
  },
  {
    type: 'collections-aging',
    icon: <FileText className="h-6 w-6" />,
    title: 'Collections Aging',
    description: 'Overdue account analysis segmented at 30, 60, and 90+ day buckets.',
    color: 'var(--color-danger)',
    tag: 'FINANCE',
  },
  {
    type: 'fleet-utilization',
    icon: <Truck className="h-6 w-6" />,
    title: 'Fleet Utilization',
    description: 'Vehicle trip counts, distance covered, and fuel consumption trends.',
    color: 'var(--color-blue)',
    tag: 'LOGISTICS',
  },
  {
    type: 'customer-performance',
    icon: <Users className="h-6 w-6" />,
    title: 'Customer Performance',
    description: 'Top customers by revenue, credit utilization, and payment reliability.',
    color: 'var(--color-purple)',
    tag: 'SALES',
  },
  {
    type: 'purchase-analysis',
    icon: <Download className="h-6 w-6" />,
    title: 'Purchase Analysis',
    description: 'Supplier-wise purchase totals, lead times, and return rates.',
    color: 'var(--color-warning)',
    tag: 'PURCHASING',
  },
]
export default function ReportHubPage() {
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Reports
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Analytical reports across the distribution estate
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORT_CARDS.map((r) => (
          <button
            key={r.type}
            type="button"
            className="panel p-5 text-left transition-all hover:border-amber group"
            onClick={() => navigate(`/reports/${r.type}`)}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: `${r.color}18`, color: r.color }}
              >
                {r.icon}
              </div>
              <span
                className="mono text-[10px] font-semibold px-2 py-0.5 rounded"
                style={{
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-dim)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {r.tag}
              </span>
            </div>
            <p className="font-semibold text-base" style={{ color: 'var(--color-text-primary)' }}>
              {r.title}
            </p>
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {r.description}
            </p>
            <p className="mt-4 text-xs font-medium" style={{ color: r.color }}>
              Generate report →
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
