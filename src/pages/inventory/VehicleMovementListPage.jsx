import {
  ArrowRightLeft,
  ChevronRight,
  FileBarChart,
  Plus,
  RefreshCw,
  Search,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { formatDate } from '@/utils/formatDate'
import { formatLKR } from '@/utils/formatCurrency'
import { useVehicles } from '@/hooks/useVehicle'
import { masterService } from '@/services/api/masterService'
import { inventoryService } from '@/services/api/inventoryService'
import { useAuthStore } from '@stores/authStore'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'
import { useEffect } from 'react'
import {
  VEHICLE_MOVEMENT_STATUSES,
  movementStatusLabel,
  vehicleLabel,
} from './vehicleMovementUtils'
import RepairWithAnotherBatchModal from './RepairWithAnotherBatchModal'
import VehicleStockCorrectionModal from './VehicleStockCorrectionModal'

function VehicleStockRepairPanel({ vehicleById }) {
  const [flagged, setFlagged] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRepairing, setIsRepairing] = useState(false)
  const [productById, setProductById] = useState({})
  const [failedByLoading, setFailedByLoading] = useState({})
  const [fixTarget, setFixTarget] = useState(null)

  async function resolveProductNames(productIds) {
    const unknown = [...new Set(productIds)].filter((id) => id && !productById[id])
    if (!unknown.length) return productById

    const products = await masterService.getProductsByIds(unknown)
    const merged = { ...productById }
    products.forEach((product) => {
      merged[product.id] = product
    })
    setProductById(merged)
    return merged
  }

  async function loadFlagged() {
    setIsLoading(true)
    try {
      const rows = await inventoryService.listVehicleLoadingsNeedingRepair()
      setFlagged(rows || [])
    } catch (error) {
      toast.error(error?.message || 'Unable to check vehicle loadings for repair.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFlagged()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function productLabel(namesMap, line) {
    return namesMap[line.productId]?.name || line.productSku
  }

  function reportResult(result, namesMap, mainLocationId) {
    const failed = result.failedLines || []
    if (result.linesRepaired > 0) {
      toast.success(`${result.loadingNo}: ${result.linesRepaired} line(s) repaired.`)
    }
    if (failed.length > 0) {
      failed.forEach((line) => {
        toast.error(`${result.loadingNo} — ${productLabel(namesMap, line)}: ${line.reason}`, {
          duration: 12000,
        })
      })
      setFailedByLoading((current) => ({
        ...current,
        [result.vehicleLoadingId]: {
          loadingId: result.vehicleLoadingId,
          loadingNo: result.loadingNo,
          mainLocationId,
          lines: failed.map((line) => ({ ...line, productName: productLabel(namesMap, line) })),
        },
      }))
    } else {
      setFailedByLoading((current) => {
        if (!(result.vehicleLoadingId in current)) return current
        const next = { ...current }
        delete next[result.vehicleLoadingId]
        return next
      })
    }
    if (result.linesRepaired === 0 && failed.length === 0) {
      toast.success(`${result.loadingNo}: nothing needed repair.`)
    }
  }

  async function repairOne(row) {
    setIsRepairing(true)
    try {
      const result = await inventoryService.repairVehicleLoadingStock(row.id)
      const namesMap = await resolveProductNames((result.failedLines || []).map((l) => l.productId))
      reportResult(result, namesMap, row.mainLocationId)
      await loadFlagged()
    } catch (error) {
      toast.error(error?.message || 'Unable to repair this loading.')
    } finally {
      setIsRepairing(false)
    }
  }

  async function repairAll() {
    setIsRepairing(true)
    try {
      const results = await inventoryService.repairAllVehicleLoadingStock()
      if (!results.length) {
        toast.success('Nothing needed repair.')
      } else {
        const namesMap = await resolveProductNames(
          results.flatMap((r) => (r.failedLines || []).map((l) => l.productId))
        )
        results.forEach((result) => {
          const row = flagged.find((f) => f.id === result.vehicleLoadingId)
          reportResult(result, namesMap, row?.mainLocationId)
        })
        const totalLines = results.reduce((sum, r) => sum + (r.linesRepaired || 0), 0)
        const totalFailed = results.reduce((sum, r) => sum + (r.failedLines?.length || 0), 0)
        toast.message(
          `Repair run: ${results.length} loading(s) processed, ${totalLines} line(s) fixed${totalFailed ? `, ${totalFailed} line(s) need manual attention` : ''}.`
        )
      }
      await loadFlagged()
    } catch (error) {
      toast.error(error?.message || 'Unable to repair vehicle loadings.')
    } finally {
      setIsRepairing(false)
    }
  }

  function handleLineFixed(loadingId, productId) {
    setFailedByLoading((current) => {
      const entry = current[loadingId]
      if (!entry) return current
      const remaining = entry.lines.filter((line) => line.productId !== productId)
      const next = { ...current }
      if (remaining.length) next[loadingId] = { ...entry, lines: remaining }
      else delete next[loadingId]
      return next
    })
    loadFlagged()
  }

  const failedEntries = Object.values(failedByLoading)

  if (!isLoading && flagged.length === 0 && failedEntries.length === 0) return null

  return (
    <>
      <section
        className="panel"
        style={{
          alignItems: 'flex-start',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', width: '100%', gap: 14, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <TriangleAlert size={18} style={{ color: 'var(--color-amber)', marginTop: 2 }} />
            <div>
              <p style={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: 14 }}>
                {isLoading
                  ? 'Checking vehicle loadings for missing stock...'
                  : `${flagged.length} applied loading(s) are missing their vehicle-side stock`}
              </p>
              {!isLoading && flagged.length > 0 ? (
                <ul style={{ color: 'var(--color-text-muted)', fontSize: 12.5, marginTop: 6, paddingLeft: 18 }}>
                  {flagged.map((row) => (
                    <li key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                      <span>
                        {row.loadingNo} —{' '}
                        {vehicleById[row.vehicleLocationId]
                          ? vehicleLabel(vehicleById[row.vehicleLocationId])
                          : row.vehicleLocationId}
                      </span>
                      <button
                        type="button"
                        className="button-secondary"
                        disabled={isRepairing}
                        onClick={() => repairOne(row)}
                        style={{ height: 24, fontSize: 11, padding: '0 8px' }}
                      >
                        Repair
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
          {!isLoading && flagged.length > 0 ? (
            <button
              type="button"
              className="button-primary"
              disabled={isRepairing}
              onClick={repairAll}
              style={{ height: 34, whiteSpace: 'nowrap' }}
            >
              <Wrench size={14} /> {isRepairing ? 'Repairing...' : `Repair All (${flagged.length})`}
            </button>
          ) : null}
        </div>

        {failedEntries.length > 0 ? (
          <div style={{ width: '100%', borderTop: '1px solid rgba(245, 158, 11, 0.3)', paddingTop: 12 }}>
            <p style={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
              Lines that couldn't be auto-repaired — the original batch no longer has enough stock
            </p>
            <ul style={{ display: 'grid', gap: 6, paddingLeft: 18 }}>
              {failedEntries.flatMap((entry) =>
                entry.lines.map((line) => (
                  <li
                    key={`${entry.loadingId}-${line.productId}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      color: 'var(--color-text-muted)',
                      fontSize: 12.5,
                    }}
                  >
                    <span>
                      {entry.loadingNo} — {line.productName || line.productSku}: {line.reason}
                    </span>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() =>
                        setFixTarget({
                          loadingId: entry.loadingId,
                          loadingNo: entry.loadingNo,
                          mainLocationId: entry.mainLocationId,
                          lineId: line.lineId,
                          productId: line.productId,
                          productSku: line.productSku,
                          qtySmallest: line.qtySmallest,
                        })
                      }
                      style={{ height: 24, fontSize: 11, padding: '0 8px', whiteSpace: 'nowrap' }}
                    >
                      Fix with another batch
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </section>

      <RepairWithAnotherBatchModal
        isOpen={Boolean(fixTarget)}
        failedLine={fixTarget}
        onClose={() => setFixTarget(null)}
        onFixed={() => fixTarget && handleLineFixed(fixTarget.loadingId, fixTarget.productId)}
      />
    </>
  )
}

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
  const { user } = useAuthStore()
  const canManageVehicles = userHasPermission(user, PERMISSIONS.inventory.vehicleManage)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [correctionTarget, setCorrectionTarget] = useState(null)
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

      {kind === 'Loading' && canManageVehicles ? (
        <VehicleStockRepairPanel vehicleById={vehicleById} />
      ) : null}

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
          <table
            className="data-table"
            style={{ minWidth: kind === 'Loading' ? 1300 : 1050 }}
          >
            <thead>
              <tr>
                <th>{kind.toUpperCase()} #</th>
                <th>Date</th>
                <th>Vehicle</th>
                {kind === 'Loading' ? <th>Delivery Run</th> : null}
                <th className="text-right">Lines</th>
                <th className="text-right">Total Selling Value</th>
                <th className="text-right">Total Unit Cost Value</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={kind === 'Loading' ? 9 : 8}>Loading {title.toLowerCase()}...</td>
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
                      <td className="mono text-right">{formatLKR(row.totalSellingValue)}</td>
                      <td className="mono text-right">{formatLKR(row.totalValue)}</td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[label] || statusColors.Draft}`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="text-right">
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          {kind === 'Loading' && label === 'Applied' && canManageVehicles ? (
                            <button
                              type="button"
                              className="button-secondary"
                              onClick={(event) => {
                                event.stopPropagation()
                                navigate(`${basePath}/${row.id}/sales-report`)
                              }}
                              style={{ height: 30 }}
                              title="See what was sold from this vehicle, which invoices, and what's left to unload"
                            >
                              <FileBarChart size={15} /> Sales Report
                            </button>
                          ) : null}
                          {kind === 'Loading' && label === 'Applied' && canManageVehicles ? (
                            <button
                              type="button"
                              className="button-secondary"
                              onClick={(event) => {
                                event.stopPropagation()
                                setCorrectionTarget(row)
                              }}
                              style={{ height: 30 }}
                              title="Find and fix invoices wrongly deducted from Main instead of this vehicle"
                            >
                              <ArrowRightLeft size={15} /> Correct Stock
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={(event) => {
                              event.stopPropagation()
                              navigate(
                                label === 'Draft' ? `${basePath}/${row.id}/edit` : `${basePath}/${row.id}`
                              )
                            }}
                            style={{ height: 30 }}
                          >
                            <ChevronRight size={15} /> {label === 'Draft' ? 'Edit' : 'View'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={kind === 'Loading' ? 9 : 8}>No {title.toLowerCase()} found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <VehicleStockCorrectionModal
        isOpen={Boolean(correctionTarget)}
        loading={correctionTarget}
        onClose={() => setCorrectionTarget(null)}
        onApplied={() => refetch()}
      />
    </div>
  )
}
