import { MapPin, Truck, Wrench } from 'lucide-react'
import { useState } from 'react'
import StatusBadge from '@components/ui/StatusBadge'
const mockVehicles = [
  {
    reg: 'WP-KH-3421',
    type: 'Lorry 3T',
    driver: 'K.Bandara',
    status: 'ON ROUTE',
    route: 'Colombo North',
    lastUpdate: '14:21',
    odometer: 128450,
    fuel: 68,
  },
  {
    reg: 'WP-GA-7823',
    type: 'Lorry 1.5T',
    driver: 'R.Fernando',
    status: 'ON ROUTE',
    route: 'Gampaha',
    lastUpdate: '14:15',
    odometer: 94200,
    fuel: 45,
  },
  {
    reg: 'WP-MB-4521',
    type: 'Van',
    driver: '—',
    status: 'IN WAREHOUSE',
    route: '—',
    lastUpdate: '08:00',
    odometer: 62100,
    fuel: 90,
  },
  {
    reg: 'WP-AB-1234',
    type: 'Lorry 5T',
    driver: '—',
    status: 'MAINTENANCE',
    route: '—',
    lastUpdate: '06:30',
    odometer: 210800,
    fuel: 20,
  },
]
export default function FleetOverviewPage() {
  const [selected, setSelected] = useState(null)
  const onRoute = mockVehicles.filter((v) => v.status === 'ON ROUTE').length
  const inWarehouse = mockVehicles.filter((v) => v.status === 'IN WAREHOUSE').length
  const maintenance = mockVehicles.filter((v) => v.status === 'MAINTENANCE').length
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Fleet
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {mockVehicles.length} vehicles registered · Routes active since 06:00
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'On Route',
            value: onRoute,
            icon: <Truck className="h-5 w-5" />,
            color: 'var(--color-teal)',
          },
          {
            label: 'In Warehouse',
            value: inWarehouse,
            icon: <MapPin className="h-5 w-5" />,
            color: 'var(--color-blue)',
          },
          {
            label: 'Maintenance',
            value: maintenance,
            icon: <Wrench className="h-5 w-5" />,
            color: 'var(--color-danger)',
          },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="panel p-4 flex items-center gap-4">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: `${color}18`, color }}
            >
              {icon}
            </div>
            <div>
              <p className="eyebrow">{label}</p>
              <p className="mt-1 text-2xl font-bold mono" style={{ color }}>
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Vehicle cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {mockVehicles.map((v) => (
          <button
            key={v.reg}
            type="button"
            className="panel p-5 text-left transition-all hover:border-amber"
            style={{ borderColor: selected === v.reg ? 'var(--color-amber)' : undefined }}
            onClick={() => setSelected(selected === v.reg ? null : v.reg)}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: 'var(--color-bg-elevated)' }}
              >
                <Truck className="h-4 w-4" style={{ color: 'var(--color-amber)' }} />
              </div>
              <StatusBadge status={v.status} />
            </div>
            <p className="mono font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
              {v.reg}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {v.type}
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-dim)' }}>Driver</span>
                <span style={{ color: 'var(--color-text-muted)' }}>{v.driver}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-dim)' }}>Route</span>
                <span style={{ color: 'var(--color-text-muted)' }}>{v.route}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-dim)' }}>Odometer</span>
                <span className="mono" style={{ color: 'var(--color-text-muted)' }}>
                  {v.odometer.toLocaleString()} km
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-dim)' }}>Fuel</span>
                <span
                  className="mono"
                  style={{ color: v.fuel < 30 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}
                >
                  {v.fuel}%
                </span>
              </div>
            </div>

            {/* Fuel bar */}
            <div
              className="mt-3 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--color-border)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${v.fuel}%`,
                  background: v.fuel < 30 ? 'var(--color-danger)' : 'var(--color-teal)',
                }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
