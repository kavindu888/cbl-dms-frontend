import dayjs from 'dayjs'
import { CalendarDays, PackageOpen, Plus, RefreshCw, X, AlertTriangle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import SimplePagination from '@components/ui/SimplePagination'
import { useAuthStore } from '@stores/authStore'
import { masterService } from '@/services/api/masterService'
import { inventoryService } from '@/services/api/inventoryService'
import { useReturnStockList, useFlagStockForReturn, useCancelReturnFlag } from '@/hooks/useReturnStock'
import Modal from '@components/ui/Modal'

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function ProductSelect({ value, onChange, products, emptyLabel = 'Select product...' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const selectedProduct = products.find((p) => p.id === value)
  const displayValue = isOpen ? searchQuery : selectedProduct ? `${selectedProduct.sku} - ${selectedProduct.name}` : ''

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return products
    return products.filter((product) => {
      return (
        product.sku?.toLowerCase().includes(q) ||
        product.name?.toLowerCase().includes(q) ||
        product.id?.toLowerCase().includes(q)
      )
    })
  }, [searchQuery, products])

  useEffect(() => {
    if (!isOpen) return
    function handleOutsideClick(event) {
      if (!event.target.closest('.searchable-select-container')) {
        setIsOpen(false)
      }
    }
    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [isOpen])

  return (
    <div className="searchable-select-container" style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="form-input"
          style={{ paddingRight: 36, width: '100%', cursor: 'pointer' }}
          type="text"
          placeholder={emptyLabel}
          value={displayValue}
          onFocus={() => {
            setIsOpen(true)
            setSearchQuery('')
          }}
          onChange={(event) => {
            setSearchQuery(event.target.value)
            setIsOpen(true)
          }}
        />
        <div
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-dim)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg style={{ width: 14, height: 14, fill: 'currentColor' }} viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

      {isOpen ? (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            boxShadow: 'var(--shadow-lg)',
            zIndex: 100,
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>
              No products found
            </div>
          ) : (
            filtered.map((product) => {
              const isSelected = product.id === value
              return (
                <div
                  key={product.id}
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    backgroundColor: isSelected ? 'var(--color-bg-hover)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    textAlign: 'left',
                  }}
                  onClick={() => {
                    onChange(product.id)
                    setIsOpen(false)
                    setSearchQuery('')
                  }}
                >
                  {product.sku} - {product.name}
                </div>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function ReturnStockPage() {
  const [products, setProducts] = useState([])
  const [activeTab, setActiveTab] = useState('All')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Modal flow state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [availableBatches, setAvailableBatches] = useState([])
  const [isLoadingBatches, setIsLoadingBatches] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState(null)
  
  // Details form state
  const [flagQty, setFlagQty] = useState('')
  const [flagReason, setFlagReason] = useState('Expired')
  const [flagNotes, setFlagNotes] = useState('')

  // Hooks
  const { data: listData, isLoading, refetch } = useReturnStockList({ page, pageSize })
  const flagStockMutation = useFlagStockForReturn()
  const cancelFlagMutation = useCancelReturnFlag()

  // Load Products list
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await masterService.listProducts({ page: 1, pageSize: 150 })
        setProducts(res.items || [])
      } catch (err) {
        console.error('Failed to load products:', err)
      }
    }
    loadProducts()
  }, [])

  // Load batches for selected product in Flag Stock modal
  useEffect(() => {
    if (!selectedProductId) {
      setAvailableBatches([])
      setSelectedBatch(null)
      return
    }

    async function loadBatches() {
      setIsLoadingBatches(true)
      try {
        const list = await inventoryService.listStockBatches(selectedProductId)
        // Only show active or quarantined batches that have stock available
        const filtered = (list || []).filter(b => b.qtyAvailable > 0)
        setAvailableBatches(filtered)
      } catch (err) {
        toast.error('Failed to load product stock batches.')
      } finally {
        setIsLoadingBatches(false)
      }
    }
    loadBatches()
  }, [selectedProductId])

  const filteredItems = useMemo(() => {
    const rawItems = listData?.items || []
    if (activeTab === 'All') return rawItems
    return rawItems.filter(item => item.status === activeTab)
  }, [listData, activeTab])

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, page])

  useEffect(() => {
    setPage(1)
  }, [activeTab])

  function handleCancelFlag(id) {
    if (!window.confirm('Cancel this flagged return entry? This will move items back to active stock.')) return
    cancelFlagMutation.mutate(id, {
      onSuccess: () => refetch()
    })
  }

  function handleFlagStock(e) {
    e.preventDefault()
    if (!selectedBatch) return toast.error('No batch selected.')
    
    const qtyVal = Number(flagQty)
    if (qtyVal <= 0) return toast.error('Quantity must be greater than zero.')
    if (qtyVal > selectedBatch.qtyAvailable) {
      return toast.error(`Flagged quantity cannot exceed available batch quantity (${selectedBatch.qtyAvailable}).`)
    }

    // Reason enum mappings:
    // Expired = 1, ShortExpiry = 2, Damaged = 3, Other = 4
    const reasonMap = {
      Expired: 1,
      ShortExpiry: 2,
      Damaged: 3,
      Other: 4
    }

    flagStockMutation.mutate({
      productId: selectedProductId,
      sourceBatchId: selectedBatch.id,
      quantity: qtyVal,
      reason: reasonMap[flagReason],
      notes: flagNotes.trim() || null,
    }, {
      onSuccess: () => {
        setIsModalOpen(false)
        setSelectedProductId('')
        setSelectedBatch(null)
        setFlagQty('')
        setFlagReason('Expired')
        setFlagNotes('')
        refetch()
      }
    })
  }

  function getExpiryStyle(expiryDate) {
    if (!expiryDate) return {}
    const diff = dayjs(expiryDate).diff(dayjs(), 'day')
    if (diff <= 0) return { color: 'var(--color-danger)', fontWeight: 600 }
    if (diff <= 30) return { color: 'var(--color-warning)', fontWeight: 600 }
    return { color: 'var(--color-teal)' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Supplier Return Staging
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Stage damaged, expired, or short-expiry goods for returns to suppliers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="button-secondary"
            onClick={() => refetch()}
            disabled={isLoading}
            style={{ height: 40, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="button-primary"
            style={{ height: 40, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} /> Flag Stock for Return
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: 4 }}>
        {['All', 'Available', 'Claimed', 'Returned', 'Cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: activeTab === tab ? 600 : 500,
              color: activeTab === tab ? 'var(--color-amber)' : 'var(--color-text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--color-amber)' : 'none',
              background: 'none',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table Section */}
      <section className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {isLoading ? (
          <EmptyMessage>Loading staged return items...</EmptyMessage>
        ) : filteredItems.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table master-table-compact">
              <thead>
                <tr>
                  <th>Product SKU</th>
                  <th>Batch No</th>
                  <th>Expiry Date</th>
                  <th style={{ textAlign: 'right' }}>Qty Flagged</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Flagged By</th>
                  <th>Flagged On</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="mono" style={{ color: 'var(--color-amber)', fontWeight: 600 }}>
                        {item.productSku}
                      </span>
                    </td>
                    <td className="mono">{item.batchNo || '-'}</td>
                    <td className="mono" style={getExpiryStyle(item.expiryDate)}>
                      {item.expiryDate ? dayjs(item.expiryDate).format('DD MMM YYYY') : '-'}
                    </td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                      {money(item.quantity)}
                    </td>
                    <td>
                      <StatusBadge status={item.reason} />
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>{item.createdBy || 'System'}</td>
                    <td>{dayjs(item.createdAt).format('DD MMM YYYY HH:mm')}</td>
                    <td>
                      {item.status === 'Available' && (
                        <button
                          onClick={() => handleCancelFlag(item.id)}
                          className="button-secondary"
                          style={{ height: 26, padding: '0 8px', fontSize: 11, color: 'var(--color-danger)' }}
                        >
                          Cancel Staging
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyMessage>No staged return stock items found.</EmptyMessage>
        )}

        <div style={{ padding: '0 16px 12px' }}>
          <SimplePagination
            page={page}
            pageSize={pageSize}
            totalItems={filteredItems.length}
            onPageChange={setPage}
            itemLabel="items"
          />
        </div>
      </section>

      {/* Flag Stock Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Flag Stock for Supplier Return"
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 2px' }}>
            {/* Step 1: Select Product */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Product <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <ProductSelect
                value={selectedProductId}
                onChange={(val) => {
                  setSelectedProductId(val)
                  setSelectedBatch(null)
                }}
                products={products}
              />
            </div>

            {selectedProductId && !selectedBatch && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>Select Stock Batch</label>
                {isLoadingBatches ? (
                  <div style={{ textAlign: 'center', padding: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>Loading batches...</div>
                ) : availableBatches.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 12, fontSize: 12, color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)', borderRadius: 6 }}>
                    No active stock batches found for this product.
                  </div>
                ) : (
                  <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 6 }}>
                    <table className="data-table product-table-compact" style={{ cursor: 'pointer' }}>
                      <thead>
                        <tr>
                          <th>Batch No</th>
                          <th>Expiry Date</th>
                          <th style={{ textAlign: 'right' }}>Available Qty</th>
                          <th style={{ textAlign: 'right' }}>Sellable Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableBatches.map((batch) => (
                          <tr
                            key={batch.id}
                            onClick={() => setSelectedBatch(batch)}
                            style={{ transition: 'background-color 0.15s' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td className="mono" style={{ fontWeight: 600, color: 'var(--color-amber)' }}>{batch.batchNo || '-'}</td>
                            <td className="mono" style={getExpiryStyle(batch.expiryDate)}>
                              {batch.expiryDate ? dayjs(batch.expiryDate).format('DD MMM YYYY') : '-'}
                            </td>
                            <td className="mono" style={{ textAlign: 'right' }}>{batch.qtyAvailable}</td>
                            <td className="mono" style={{ textAlign: 'right', color: 'var(--color-teal)' }}>{batch.sellableQty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Details entry (only if batch is selected) */}
            {selectedBatch && (
              <form onSubmit={handleFlagStock} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>Selected Batch:</span>
                    <button
                      type="button"
                      onClick={() => setSelectedBatch(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
                    >
                      <X size={14} /> Change Batch
                    </button>
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--color-border)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-dim)' }}>Batch Number:</span>
                    <span className="mono" style={{ color: 'var(--color-amber)' }}>{selectedBatch.batchNo || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-dim)' }}>Expiry Date:</span>
                    <span className="mono" style={getExpiryStyle(selectedBatch.expiryDate)}>
                      {selectedBatch.expiryDate ? dayjs(selectedBatch.expiryDate).format('DD MMM YYYY') : '-'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-dim)' }}>Max Available Quantity:</span>
                    <span className="mono" style={{ fontWeight: 600 }}>{selectedBatch.qtyAvailable}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Quantity to Flag <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <input
                      type="number"
                      className="form-input"
                      required
                      min="1"
                      max={selectedBatch.qtyAvailable}
                      value={flagQty}
                      onChange={(e) => setFlagQty(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Return Reason <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <select
                      className="form-input"
                      required
                      value={flagReason}
                      onChange={(e) => setFlagReason(e.target.value)}
                      style={{ width: '100%', height: 40, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', borderRadius: 6 }}
                    >
                      <option value="Expired">Expired</option>
                      <option value="ShortExpiry">ShortExpiry</option>
                      <option value="Damaged">Damaged</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Notes (Optional)</label>
                  <textarea
                    className="form-input"
                    value={flagNotes}
                    onChange={(e) => setFlagNotes(e.target.value)}
                    placeholder="Enter supplier return instructions or quarantine descriptions..."
                    rows={2}
                    style={{ padding: 10, borderRadius: 6, border: '1px solid var(--color-border)', color: '#fff', background: 'rgba(0,0,0,0.1)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setIsModalOpen(false)}
                    style={{ height: 40 }}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="button-primary"
                    disabled={flagStockMutation.isPending}
                    style={{ height: 40 }}
                  >
                    {flagStockMutation.isPending ? 'Processing...' : 'Flag Stock'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function EmptyMessage({ children }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        color: 'var(--color-text-muted)',
        textAlign: 'center',
        fontSize: 13,
      }}
    >
      <div>
        <PackageOpen
          size={34}
          style={{ margin: '0 auto 10px', color: 'var(--color-text-dim)' }}
        />
        {children}
      </div>
    </div>
  )
}
