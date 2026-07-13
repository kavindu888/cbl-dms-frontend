import { Eye, PackageX, Plus, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '@components/ui/EmptyState'
import StatusBadge from '@components/ui/StatusBadge'
import { useInStoreReturns } from '@/hooks/useInStoreReturn'
import {
  IN_STORE_RETURN_STATUSES,
  formatDate,
  reasonLabel,
  statusLabel,
} from './inStoreReturnUtils'

export default function InStoreReturnListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const params = useMemo(() => (status ? { status } : {}), [status])
  const { data: returns = [], isLoading, refetch, isFetching } = useInStoreReturns(params)

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">In-Store Returns</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Move damaged, expired, or quality-held stock from main inventory to return stock.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="button-secondary" onClick={() => refetch()}>
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            className="button-primary"
            onClick={() => navigate('/inventory/in-store-returns/new')}
          >
            <Plus size={16} />
            New In-Store Return
          </button>
        </div>
      </header>

      <section className="panel p-3">
        <div className="flex flex-wrap gap-2">
          {IN_STORE_RETURN_STATUSES.map((tab) => (
            <button
              key={tab.label}
              type="button"
              className={status === tab.value ? 'button-primary' : 'button-secondary'}
              onClick={() => setStatus(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-sm text-text-muted">Loading in-store returns...</div>
        ) : returns.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ISR #</th>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Lines</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((item) => (
                  <tr key={item.id}>
                    <td className="mono font-semibold">{item.inStoreReturnNo || item.id}</td>
                    <td className="mono">{formatDate(item.createdAt)}</td>
                    <td>{reasonLabel(item.reason)}</td>
                    <td className="mono">{item.lineCount ?? item.lines?.length ?? 0}</td>
                    <td>
                      <StatusBadge status={statusLabel(item.status)} />
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => navigate(`/inventory/in-store-returns/${item.id}`)}
                      >
                        <Eye size={15} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<PackageX className="size-8" />}
            title="No in-store returns found"
            description="Create a draft return when store stock needs to be moved into return stock."
            action={
              <button
                type="button"
                className="button-primary"
                onClick={() => navigate('/inventory/in-store-returns/new')}
              >
                <Plus size={16} />
                New In-Store Return
              </button>
            }
          />
        )}
      </section>
    </div>
  )
}
