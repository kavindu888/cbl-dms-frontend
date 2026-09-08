import { AlertTriangle, Truck, Unlock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { inventoryService } from '@/services/api/inventoryService'
import { salesService } from '@/services/api/salesService'

function getErrorMessage(error, fallback = 'Something went wrong') {
  return error?.message || fallback
}

function money(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 'Rs. 0.00'
  return `Rs. ${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function StuckReservationsPage() {
  const [orders, setOrders] = useState([])
  const [vehiclesById, setVehiclesById] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [releasingId, setReleasingId] = useState(null)
  const [reasonByOrderId, setReasonByOrderId] = useState({})

  async function load() {
    setIsLoading(true)
    setError('')
    try {
      const [stuckOrders, locationPage] = await Promise.all([
        salesService.listStuckReservations(),
        inventoryService.listStockLocations({ pageSize: 200, isActive: true }),
      ])
      setOrders(stuckOrders || [])
      setVehiclesById(
        Object.fromEntries((locationPage.items || []).map((location) => [location.id, location]))
      )
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load stuck reservations.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const totalReservedLines = useMemo(
    () => orders.reduce((sum, order) => sum + (order.lines || []).length, 0),
    [orders]
  )

  async function release(order) {
    const reason = (reasonByOrderId[order.orderId] || '').trim()
    if (!reason) {
      toast.error('Enter a reason before releasing this reservation.')
      return
    }
    if (
      !window.confirm(
        `Cancel order ${order.orderNumber} and release its stock reservation? This cannot be undone.`
      )
    )
      return

    setReleasingId(order.orderId)
    try {
      await salesService.cancelSalesOrder(order.orderId, reason)
      toast.success(`Order ${order.orderNumber} cancelled — reservation released.`)
      setOrders((current) => current.filter((row) => row.orderId !== order.orderId))
    } catch (releaseError) {
      toast.error(getErrorMessage(releaseError, 'Unable to release this reservation.'))
    } finally {
      setReleasingId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Stuck Stock Reservations
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Confirmed orders that were never converted to an invoice or cancelled still hold their
          stock reservation forever — this is what makes a vehicle read "insufficient stock" even
          though it physically has plenty. Release the ones that are no longer going anywhere.
        </p>
      </div>

      <div
        className="panel"
        style={{
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          border: '1px solid color-mix(in srgb, var(--color-amber) 30%, var(--color-border))',
        }}
      >
        <AlertTriangle size={18} color="var(--color-amber)" />
        <span style={{ fontSize: 13 }}>
          {isLoading
            ? 'Checking for stuck reservations...'
            : `${orders.length} confirmed order${orders.length === 1 ? '' : 's'} holding ${totalReservedLines} product reservation${totalReservedLines === 1 ? '' : 's'}.`}
        </span>
      </div>

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 900, width: '100%' }}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Age</th>
                <th>Products reserved</th>
                <th style={{ textAlign: 'right' }}>Net amount</th>
                <th>Reason for release</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--color-danger)' }}>
                    {error}
                  </td>
                </tr>
              ) : orders.length ? (
                orders.map((order) => {
                  const vehicle = order.vehicleLocationId ? vehiclesById[order.vehicleLocationId] : null
                  return (
                    <tr key={order.orderId}>
                      <td className="mono" style={{ color: 'var(--color-amber)', fontWeight: 700 }}>
                        {order.orderNumber}
                      </td>
                      <td>{order.customerName}</td>
                      <td>
                        {order.vehicleLocationId ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <Truck size={13} />
                            {vehicle?.name || order.vehicleLocationId}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-dim)' }}>Main</span>
                        )}
                      </td>
                      <td
                        style={{
                          color: order.ageDays >= 3 ? 'var(--color-danger)' : 'var(--color-text-muted)',
                        }}
                      >
                        {order.ageDays} day{order.ageDays === 1 ? '' : 's'}
                      </td>
                      <td>
                        {(order.lines || []).map((line) => (
                          <div key={line.productId} className="mono" style={{ fontSize: 11 }}>
                            {line.productSku} × {line.quantityReserved}
                          </div>
                        ))}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {money(order.netAmount)}
                      </td>
                      <td>
                        <input
                          className="form-input"
                          placeholder="e.g. customer refused, duplicate order"
                          value={reasonByOrderId[order.orderId] || ''}
                          onChange={(event) =>
                            setReasonByOrderId((current) => ({
                              ...current,
                              [order.orderId]: event.target.value,
                            }))
                          }
                          style={{ height: 32, fontSize: 12, minWidth: 200 }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button-danger"
                          disabled={releasingId === order.orderId}
                          onClick={() => release(order)}
                          style={{ height: 32, fontSize: 12, whiteSpace: 'nowrap' }}
                        >
                          <Unlock size={13} />
                          {releasingId === order.orderId ? 'Releasing...' : 'Release'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No stuck reservations right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
