import dayjs from 'dayjs'
import { RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { purchasingService } from '@services/api/purchasingService'
import { useAuthStore } from '@stores/authStore'
import { PurchaseOrderStatus } from '@/types/purchasing.types'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'

const pageSize = 10

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function PurchaseOrderApprovalPage() {
  const user = useAuthStore((state) => state.user)
  const canApprove = userHasPermission(user, PERMISSIONS.purchasing.poApprove)

  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [actionId, setActionId] = useState('')
  const [error, setError] = useState('')

  const loadPurchaseOrders = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await purchasingService.listPurchaseOrders({
        page,
        pageSize,
        search: search.trim() || undefined,
        status: PurchaseOrderStatus.Submitted,
      })
      setPurchaseOrders(result?.items || [])
      setTotalItems(result?.totalItems || 0)
      setTotalPages(Math.max(1, result?.totalPages || 1))
    } catch (requestError) {
      setError(requestError.message)
      setPurchaseOrders([])
    } finally {
      setIsLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    const timer = window.setTimeout(loadPurchaseOrders, 300)
    return () => window.clearTimeout(timer)
  }, [loadPurchaseOrders])

  useEffect(() => {
    setPage(1)
  }, [search])

  async function approveOrder(purchaseOrder) {
    setActionId(purchaseOrder.id)
    try {
      await purchasingService.approvePurchaseOrder(purchaseOrder.id)
      toast.success(`${purchaseOrder.poNumber} approved.`)
      await loadPurchaseOrders()
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setActionId('')
    }
  }

  async function rejectOrder(purchaseOrder) {
    const reason = window.prompt(`Reason for rejecting ${purchaseOrder.poNumber}:`)
    if (reason === null) return

    setActionId(purchaseOrder.id)
    try {
      await purchasingService.rejectPurchaseOrder(purchaseOrder.id, reason.trim() || null)
      toast.success(`${purchaseOrder.poNumber} rejected.`)
      await loadPurchaseOrders()
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setActionId('')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">PO Approve & Reject</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Review purchase orders that have been submitted for approval.
        </p>
      </div>

      <div className="panel flex items-center gap-3 p-4">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-dim)]" />
          <input
            className="form-input w-full"
            style={{ paddingLeft: 36 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search submitted PO or supplier"
          />
        </div>
        <button type="button" className="icon-button" onClick={loadPurchaseOrders} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="panel overflow-hidden">
        {error ? (
          <div className="p-8 text-sm text-[var(--color-danger)]">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Order Date</th>
                  <th>Expected Delivery</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Approval</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-[var(--color-text-muted)]">
                      Loading submitted purchase orders...
                    </td>
                  </tr>
                ) : purchaseOrders.length ? (
                  purchaseOrders.map((purchaseOrder) => (
                    <tr key={purchaseOrder.id}>
                      <td className="mono font-semibold text-[var(--color-amber)]">
                        {purchaseOrder.poNumber}
                      </td>
                      <td>
                        <div className="font-medium text-[var(--color-text-primary)]">
                          {purchaseOrder.supplierName}
                        </div>
                        <div className="text-xs text-[var(--color-text-dim)]">
                          {purchaseOrder.supplierCode}
                        </div>
                      </td>
                      <td>{dayjs(purchaseOrder.orderDate).format('DD MMM YYYY')}</td>
                      <td>
                        {purchaseOrder.expectedDeliveryDate
                          ? dayjs(purchaseOrder.expectedDeliveryDate).format('DD MMM YYYY')
                          : '-'}
                      </td>
                      <td>
                        <StatusBadge status={purchaseOrder.statusLabel || 'Submitted'} />
                      </td>
                      <td>{purchaseOrder.lineCount}</td>
                      <td className="mono text-right font-medium">
                        {formatMoney(purchaseOrder.totalAmount)}
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          {canApprove ? (
                            <>
                              <button
                                type="button"
                                className="button-primary"
                                disabled={actionId === purchaseOrder.id}
                                onClick={() => approveOrder(purchaseOrder)}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="button-secondary"
                                disabled={actionId === purchaseOrder.id}
                                onClick={() => rejectOrder(purchaseOrder)}
                              >
                                Reject
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-[var(--color-text-muted)]">
                      No purchase orders are waiting for approval.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setPage}
      />
    </div>
  )
}

function Pagination({ page, totalPages, totalItems, onPageChange }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm text-[var(--color-text-muted)]">
      <span>{totalItems} submitted purchase orders</span>
      <div className="flex items-center gap-3">
        <button
          className="button-secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          className="button-secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
