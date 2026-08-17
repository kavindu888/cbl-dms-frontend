import { ChevronRight, Plus, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '@/utils/formatDate'
import { useVehicles } from '@/hooks/useVehicle'
import { masterService } from '@/services/api/masterService'
import { useEffect } from 'react'
import {
  VEHICLE_MOVEMENT_STATUSES,
  movementStatusLabel,
  vehicleLabel,
} from './vehicleMovementUtils'

const statusColors = {
  Draft: 'bg-amber-500/10 text-amber-400 border border-amber-700/50',
  Applied: 'bg-green-500/10 text-green-400 border border-green-700/50',
  Cancelled: 'bg-gray-700/30 text-gray-500 border border-gray-700/30',
}

export default function VehicleMovementListPage({
  kind,
  title,
  description,
  basePath,
  useList,
  numberField,
  dateField,
}) {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const params = useMemo(() => (status ? { status: Number(status) } : {}), [status])
  const { data: rows = [], isLoading, isFetching, refetch } = useList(params)
  const { data: vehicles = [] } = useVehicles()
  const [deliveryRuns, setDeliveryRuns] = useState([])
  const vehicleById = useMemo(
    () => Object.fromEntries(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles]
  )
  const deliveryRunById = useMemo(
    () => Object.fromEntries(deliveryRuns.map((run) => [run.id, run])),
    [deliveryRuns]
  )

  useEffect(() => {
    if (kind !== 'Loading') return undefined
    let active = true

    masterService
      .listAllDeliveryRuns({ pageSize: 100 })
      .then((items) => {
        if (active) setDeliveryRuns(items || [])
      })
      .catch(() => {
        if (active) setDeliveryRuns([])
      })

    return () => {
      active = false
    }
  }, [kind])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) =>
      `${row[numberField] || row.id} ${row.vehicleName || row.vehicleLocationId} ${
        row.deliveryRunId ? deliveryRunById[row.deliveryRunId]?.name || row.deliveryRunId : ''
      } ${movementStatusLabel(row.status)}`
        .toLowerCase()
        .includes(term)
    )
  }, [deliveryRunById, numberField, rows, search])

  return (
    <div className="responsive-page" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header
        style={{
          alignItems: 'flex-start',
          display: 'flex',
          gap: 16,
          justifyContent: 'space-between',
        }}
      >
        <div>
          <p className="eyebrow">Inventory</p>
          <h1 style={{ color: 'var(--color-text-primary)', fontSize: 26, fontWeight: 700 }}>
            {title}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>
            {description}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="button-secondary"
            onClick={() => refetch()}
            style={{ height: 38 }}
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            className="button-primary"
            onClick={() => navigate(`${basePath}/new`)}
            style={{ height: 38 }}
          >
            <Plus size={15} /> New {kind}
          </button>
        </div>
      </header>

      <section
        className="panel responsive-filter-bar"
        style={{ alignItems: 'center', display: 'flex', gap: 14, padding: 16 }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={16}
            style={{ color: 'var(--color-text-dim)', left: 12, position: 'absolute', top: 12 }}
          />
          <input
            className="form-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${kind.toLowerCase()} number, vehicle, or status...`}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select
          className="form-input"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          style={{ width: 190 }}
        >
          {VEHICLE_MOVEMENT_STATUSES.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </section>

      <section className="panel" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{kind.toUpperCase()} #</th>
                <th>Date</th>
                <th>Vehicle</th>
                {kind === 'Loading' ? <th>Delivery Run</th> : null}
                <th className="text-right">Lines</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={kind === 'Loading' ? 7 : 6}>Loading {title.toLowerCase()}...</td>
                </tr>
              ) : filteredRows.length ? (
                filteredRows.map((row) => {
                  const label = movementStatusLabel(row.status)
                  return (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`${basePath}/${row.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="mono" style={{ color: 'var(--color-amber)', fontWeight: 800 }}>
                        {row[numberField] || row.id}
                      </td>
                      <td className="mono">{formatDate(row[dateField] || row.createdAt)}</td>
                      <td>
                        {row.vehicleName ||
                          (vehicleById[row.vehicleLocationId]
                            ? vehicleLabel(vehicleById[row.vehicleLocationId])
                            : row.vehicleLocationId)}
                      </td>
                      {kind === 'Loading' ? (
                        <td>
                          {row.deliveryRunId
                            ? deliveryRunById[row.deliveryRunId]
                              ? `${deliveryRunById[row.deliveryRunId].code} - ${
                                  deliveryRunById[row.deliveryRunId].name
                                }`
                              : row.deliveryRunId
                            : '-'}
                        </td>
                      ) : null}
                      <td className="mono text-right">{row.lineCount ?? row.lines?.length ?? 0}</td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[label] || statusColors.Draft}`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={(event) => {
                            event.stopPropagation()
                            navigate(`${basePath}/${row.id}`)
                          }}
                          style={{ height: 30 }}
                        >
                          <ChevronRight size={15} /> View
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={kind === 'Loading' ? 7 : 6}>No {title.toLowerCase()} found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
