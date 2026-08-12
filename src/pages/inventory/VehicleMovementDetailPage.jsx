import { ArrowLeft, CheckCircle2, PackageX } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import EmptyState from '@components/ui/EmptyState'
import StatusBadge from '@components/ui/StatusBadge'
import { useVehicles } from '@/hooks/useVehicle'
import { formatDateTime } from '@/utils/formatDate'
import { formatLKR } from '@/utils/formatCurrency'
import {
  formatNumber,
  movementStatusLabel,
  returnReasonLabel,
  unloadingTypeLabel,
  vehicleLabel,
} from './vehicleMovementUtils'

function InfoTile({ label, value, mono = false }) {
  return (
    <div className="rounded-lg border border-border bg-bg-base/50 p-3">
      <div className="form-label">{label}</div>
      <div className={`mt-1 text-sm font-semibold text-text-primary ${mono ? 'mono' : ''}`}>
        {value || '—'}
      </div>
    </div>
  )
}

export default function VehicleMovementDetailPage({ kind, basePath, useDetail }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: movement, isLoading } = useDetail(id)
  const { data: vehicles = [] } = useVehicles()
  const vehicle = vehicles.find((item) => item.id === movement?.vehicleLocationId)
  const status = movementStatusLabel(movement?.status)
  const isUnloading = kind === 'Unloading'

  if (isLoading)
    return (
      <div className="panel p-8 text-sm text-text-muted">
        Loading vehicle {kind.toLowerCase()}...
      </div>
    )
  if (!movement)
    return (
      <EmptyState
        icon={<PackageX className="size-8" />}
        title={`Vehicle ${kind.toLowerCase()} not found`}
        description="The selected inventory movement could not be loaded."
      />
    )

  const number = movement[isUnloading ? 'unloadingNo' : 'loadingNo'] || movement.id
  const movementDate = movement[isUnloading ? 'unloadingDate' : 'loadingDate']

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <button
            type="button"
            className="button-secondary mb-4"
            onClick={() => navigate(basePath)}
          >
            <ArrowLeft size={16} /> Back to List
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="mono text-3xl font-bold text-text-primary">{number}</h1>
            <StatusBadge status={status} />
          </div>
        </div>
      </header>

      {status === 'Applied' ? (
        <section className="rounded-lg border border-green-700/50 bg-green-500/10 p-4 text-sm text-green-300">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={17} /> Applied
          </div>
          <p className="mt-1 text-green-300/80">
            Stock has been moved{' '}
            {isUnloading
              ? 'from the vehicle to main inventory'
              : 'from main inventory to the vehicle'}
            .
          </p>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <InfoTile
          label="Vehicle"
          value={vehicle ? vehicleLabel(vehicle) : movement.vehicleLocationId}
        />
        <InfoTile label={`${kind} Date`} value={formatDateTime(movementDate)} mono />
        <InfoTile label="Created By" value={movement.createdByUserId} mono />
        <InfoTile label="Applied On" value={formatDateTime(movement.appliedOn)} mono />
        <InfoTile label="Lines" value={movement.lines?.length ?? 0} mono />
      </section>

      <section className="panel space-y-4 p-5">
        <div>
          <p className="eyebrow">Notes</p>
          <p className="mt-2 text-sm text-text-muted">
            {movement.notes || `No notes recorded for this vehicle ${kind.toLowerCase()}.`}
          </p>
        </div>
        {movement.cancelReason ? (
          <div className="rounded-lg border border-border bg-bg-base/50 p-3">
            <p className="form-label">Cancel Reason</p>
            <p className="mt-2 text-sm text-text-muted">{movement.cancelReason}</p>
          </div>
        ) : null}
      </section>

      <section className="panel space-y-4 p-5">
        <div>
          <p className="eyebrow">Stock Lines</p>
          <h2 className="mt-2 text-xl font-semibold text-text-primary">Batch Movement Lines</h2>
        </div>
        {movement.lines?.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Source Batch</th>
                  <th className="text-right">Qty</th>
                  {isUnloading ? (
                    <>
                      <th>Type</th>
                      <th>Reason</th>
                    </>
                  ) : (
                    <>
                      <th className="text-right">Unit Cost</th>
                      <th className="text-right">MRP</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {movement.lines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <span className="product-sku-badge mono">{line.productSku}</span>
                    </td>
                    <td className="mono">{line.sourceBatchNo || '—'}</td>
                    <td className="mono text-right">{formatNumber(line.qtySmallest)}</td>
                    {isUnloading ? (
                      <>
                        <td>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${unloadingTypeLabel(line.unloadingType) === 'Labelled' ? 'border-amber-700/50 bg-amber-500/10 text-amber-400' : 'border-gray-700 bg-gray-800 text-gray-300'}`}
                          >
                            {unloadingTypeLabel(line.unloadingType).toUpperCase()}
                          </span>
                        </td>
                        <td>{returnReasonLabel(line.returnReason)}</td>
                      </>
                    ) : (
                      <>
                        <td className="mono text-right">{formatLKR(line.unitCostSmallest)}</td>
                        <td className="mono text-right">{formatLKR(line.mrp)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<PackageX className="size-8" />}
            title="No stock lines"
            description="No batch movement lines were recorded."
          />
        )}
      </section>
    </div>
  )
}
