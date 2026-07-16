import { ArrowLeft, CheckCircle2, PackageX } from 'lucide-react'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { useNavigate, useParams } from 'react-router-dom'
import EmptyState from '@components/ui/EmptyState'
import StatusBadge from '@components/ui/StatusBadge'
import { useInStoreReturn } from '@/hooks/useInStoreReturn'
import { formatNumber, reasonLabel, statusLabel } from './inStoreReturnUtils'

dayjs.extend(utc)
dayjs.extend(timezone)

function formatColomboDateTime(value) {
  return value ? dayjs.utc(value).tz('Asia/Colombo').format('DD MMM YYYY HH:mm') : '-'
}

function formatUserId(value) {
  if (!value) return '-'
  return value.length > 8 ? `...${value.slice(-8)}` : value
}

function InfoTile({ label, value, mono = false }) {
  return (
    <div className="rounded-lg border border-border bg-bg-base/50 p-3">
      <div className="form-label">{label}</div>
      <div className={`mt-1 text-sm font-semibold text-text-primary ${mono ? 'mono' : ''}`}>
        {value || '-'}
      </div>
    </div>
  )
}

function LinesTable({ lines = [], headerReason }) {
  if (!lines.length) {
    return (
      <EmptyState
        icon={<PackageX className="size-8" />}
        title="No return lines"
        description="No batch movement lines were recorded for this in-store return."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Batch</th>
            <th>Qty</th>
            <th>Unit Cost</th>
            <th>Line Reason</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id}>
              <td className="mono font-semibold">{line.productSku}</td>
              <td className="mono">{line.batchNo || '-'}</td>
              <td className="mono">{formatNumber(line.qtySmallest)}</td>
              <td className="mono">LKR {formatNumber(line.unitCostSmallest)}</td>
              <td>{line.lineReason ? reasonLabel(line.lineReason) : `${reasonLabel(headerReason)} (header)`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function InStoreReturnDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: inStoreReturn, isLoading } = useInStoreReturn(id)

  const status = statusLabel(inStoreReturn?.status)
  const isApplied = status === 'Applied'
  const isCancelled = status === 'Cancelled'

  if (isLoading) {
    return <div className="panel p-8 text-sm text-text-muted">Loading in-store return...</div>
  }

  if (!inStoreReturn) {
    return (
      <EmptyState
        icon={<PackageX className="size-8" />}
        title="In-store return not found"
        description="The selected in-store return could not be loaded."
      />
    )
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <button
            type="button"
            className="button-secondary mb-4"
            onClick={() => navigate('/inventory/in-store-returns')}
          >
            <ArrowLeft size={16} />
            Back to List
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="mono text-3xl font-bold text-text-primary">
              {inStoreReturn.inStoreReturnNo || inStoreReturn.id}
            </h1>
            <StatusBadge status={status} />
            <StatusBadge status={reasonLabel(inStoreReturn.reason)} />
          </div>
        </div>
      </header>

      {isApplied ? (
        <section className="rounded-lg border border-green-700/50 bg-green-500/10 p-4 text-sm text-green-300">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={17} />
            Applied
          </div>
          <p className="mt-1 text-green-300/80">Stock has been moved to the return location.</p>
        </section>
      ) : null}

      <section className="panel space-y-4 p-5">
        <div>
          <p className="eyebrow">Notes</p>
          <p className="mt-2 text-sm text-text-muted">
            {inStoreReturn.notes || 'No notes recorded for this in-store return.'}
          </p>
        </div>
        {isCancelled && inStoreReturn.cancelReason ? (
          <div className="rounded-lg border border-border bg-bg-base/50 p-3">
            <p className="form-label">Cancel Reason</p>
            <p className="mt-2 text-sm text-text-muted">{inStoreReturn.cancelReason}</p>
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <InfoTile label="Created By" value={inStoreReturn.createdByName || formatUserId(inStoreReturn.createdByUserId)} mono />
        <InfoTile label="Reason" value={reasonLabel(inStoreReturn.reason)} />
        <InfoTile label="Applied On" value={formatColomboDateTime(inStoreReturn.appliedOn)} mono />
        <InfoTile label="Cancelled On" value={formatColomboDateTime(inStoreReturn.cancelledOn)} mono />
        <InfoTile label="Lines" value={inStoreReturn.lines?.length ?? 0} mono />
      </section>

      <section className="panel space-y-4 p-5">
        <div>
          <p className="eyebrow">Return Lines</p>
          <h2 className="mt-2 text-xl font-semibold text-text-primary">Batch Movement Lines</h2>
        </div>
        <LinesTable lines={inStoreReturn.lines} headerReason={inStoreReturn.reason} />
      </section>
    </div>
  )
}
