import dayjs from 'dayjs'
import { ArrowLeft, Plus, Trash2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { salesService } from '@/services/api/salesService'
import { masterService } from '@/services/api/masterService'
import { useAuthStore } from '@stores/authStore'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'
import {
  useCrnById,
  useAddCrnLine,
  useRemoveCrnLine,
  useSubmitCrn,
  useVerifyCrn,
  useRejectCrn,
  useCancelCrn,
} from '@/hooks/useCrn'
import Modal from '@components/ui/Modal'

function money(value) {
  return Number(value || 0).toLocaleString('en-LK', {
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

export default function CrnDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: crn, isLoading, error, refetch } = useCrnById(id)

  const [customer, setCustomer] = useState(null)
  const [linkedInvoice, setLinkedInvoice] = useState(null)
  const [products, setProducts] = useState([])
  
  // Modals state
  const [isLineModalOpen, setIsLineModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)

  // Add line form state
  const [selectedProductId, setSelectedProductId] = useState('')
  const [lineQty, setLineQty] = useState(1)
  const [lineMrp, setLineMrp] = useState(0)
  const [lineDiscount, setLineDiscount] = useState(0)

  // Rejection/Cancel reason state
  const [actionReason, setActionReason] = useState('')

  // Hooks mutations
  const addLineMutation = useAddCrnLine(id)
  const removeLineMutation = useRemoveCrnLine(id)
  const submitMutation = useSubmitCrn()
  const verifyMutation = useVerifyCrn()
  const rejectMutation = useRejectCrn()
  const cancelMutation = useCancelCrn()
  const canAddLine = userHasPermission(user, PERMISSIONS.sales.crnAddLine)
  const canRemoveLine = userHasPermission(user, PERMISSIONS.sales.crnRemoveLine)
  const canSubmit = userHasPermission(user, PERMISSIONS.sales.crnSubmit)
  const canVerify = userHasPermission(user, PERMISSIONS.sales.crnVerify)
  const canReject = userHasPermission(user, PERMISSIONS.sales.crnReject)
  const canCancel = userHasPermission(user, PERMISSIONS.sales.crnCancel)

  // Load products list
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await masterService.listProducts({ page: 1, pageSize: 100 })
        setProducts(res.items || [])
      } catch (err) {
        console.error('Failed to load products:', err)
      }
    }
    loadProducts()
  }, [])

  // Load customer details
  useEffect(() => {
    if (crn?.customerId) {
      salesService.getCustomer(crn.customerId)
        .then(setCustomer)
        .catch(console.error)
    }
  }, [crn?.customerId])

  // Load linked invoice details
  useEffect(() => {
    if (crn?.invoiceId) {
      salesService.getInvoice(crn.invoiceId)
        .then(setLinkedInvoice)
        .catch(console.error)
    } else {
      setLinkedInvoice(null)
    }
  }, [crn?.invoiceId])

  // Auto-fill MRP and discount when product is selected in Add Line modal
  useEffect(() => {
    if (!selectedProductId) return

    const product = products.find(p => p.id === selectedProductId)
    if (!product) return

    // Default pre-fill from product catalog
    setLineMrp(product.mrp || 0)
    setLineDiscount(0)

    // Pre-fill from linked invoice if match is found
    if (linkedInvoice) {
      const invoiceLine = linkedInvoice.lines?.find(l => l.productId === selectedProductId)
      if (invoiceLine) {
        setLineMrp(invoiceLine.mrp || 0)
        setLineDiscount(invoiceLine.discountPercent || 0)
      }
    }
  }, [selectedProductId, linkedInvoice, products])

  const filteredProductsList = useMemo(() => {
    if (linkedInvoice && linkedInvoice.lines) {
      const invoiceProductIds = new Set(linkedInvoice.lines.map(l => l.productId))
      return products.filter(p => invoiceProductIds.has(p.id))
    }
    return products
  }, [linkedInvoice, products])

  const calculatedLiveCredit = useMemo(() => {
    const qty = Number(lineQty || 0)
    const mrp = Number(lineMrp || 0)
    const disc = Number(lineDiscount || 0)
    return mrp * qty * (1 - disc / 100)
  }, [lineQty, lineMrp, lineDiscount])

  if (isLoading) return <div style={{ padding: 24, textAlign: 'center' }}>Loading Customer Return Note...</div>
  if (error) return <div style={{ padding: 24, color: 'var(--color-danger)' }}>Error: {error.message}</div>
  if (!crn) return <div style={{ padding: 24 }}>No Return Note found.</div>

  const isDraft = crn.status === 'Draft'
  const isSubmitted = crn.status === 'Submitted'
  const isVerified = crn.status === 'Verified'
  const isRejected = crn.status === 'Rejected'
  const isCancelled = crn.status === 'Cancelled'

  const totalCalculatedCredit = (crn.lines || []).reduce((sum, line) => {
    return sum + (line.mrp * line.quantity * (1 - (line.discountPercent || 0) / 100))
  }, 0)

  async function handleAddLine(e) {
    e.preventDefault()
    if (!selectedProductId) return toast.error('Product selection is required.')
    if (lineQty <= 0) return toast.error('Quantity must be greater than zero.')
    if (lineMrp < 0) return toast.error('MRP cannot be negative.')
    if (lineDiscount < 0 || lineDiscount > 100) return toast.error('Discount must be between 0 and 100%.')

    addLineMutation.mutate({
      productId: selectedProductId,
      quantity: Number(lineQty),
      mrp: Number(lineMrp),
      discountPercent: Number(lineDiscount),
    }, {
      onSuccess: () => {
        setIsLineModalOpen(false)
        setSelectedProductId('')
        setLineQty(1)
        setLineMrp(0)
        setLineDiscount(0)
        refetch()
      }
    })
  }

  function handleRemoveLine(lineId) {
    if (!window.confirm('Are you sure you want to remove this line item?')) return
    removeLineMutation.mutate(lineId, {
      onSuccess: () => refetch()
    })
  }

  function handleSubmit() {
    if ((crn.lines || []).length === 0) {
      toast.error('Cannot submit a Return Note with no items.')
      return
    }
    if (!window.confirm('Submit this Return Note? This will lock line item changes.')) return
    submitMutation.mutate(id, {
      onSuccess: () => refetch()
    })
  }

  function handleVerify() {
    if (!window.confirm('Verify and approve this Return Note? This will issue customer credits.')) return
    verifyMutation.mutate(id, {
      onSuccess: () => refetch()
    })
  }

  function handleReject(e) {
    e.preventDefault()
    if (!actionReason.trim()) return toast.error('Rejection reason is required.')
    rejectMutation.mutate({ id, reason: actionReason }, {
      onSuccess: () => {
        setIsRejectModalOpen(false)
        setActionReason('')
        refetch()
      }
    })
  }

  function handleCancel(e) {
    e.preventDefault()
    if (!actionReason.trim()) return toast.error('Cancellation reason is required.')
    cancelMutation.mutate({ id, reason: actionReason }, {
      onSuccess: () => {
        setIsCancelModalOpen(false)
        setActionReason('')
        refetch()
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/sales/return-notes')}
            className="button-secondary"
            style={{ height: 36, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--color-text-dim)' }}>
                Customer Return Note Detail
              </span>
              <StatusBadge status={crn.status} />
            </div>
            <h1 className="mono" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
              {crn.returnNumber || crn.id.substring(0, 8).toUpperCase()}
            </h1>
          </div>
        </div>

        {/* Right Header Side: Actions and Total Credit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-dim)', letterSpacing: 0.5 }}>
              Total Credit Issued
            </span>
            <span className="mono" style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-teal)', marginTop: 2 }}>
              LKR {money(crn.totalCreditAmount || totalCalculatedCredit)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {isDraft && (
              <>
                {canSubmit && (
                  <button
                    onClick={handleSubmit}
                    className="button-primary"
                    style={{ backgroundColor: 'var(--color-teal)', borderColor: 'var(--color-teal)', color: '#000', fontWeight: 600, height: 38 }}
                  >
                    Submit Return Note
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="button-secondary"
                    style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', height: 38 }}
                  >
                    Cancel Note
                  </button>
                )}
              </>
            )}

            {isSubmitted && (
              <>
                {canVerify && (
                  <button
                    onClick={handleVerify}
                    className="button-primary"
                    style={{ backgroundColor: 'var(--color-teal)', borderColor: 'var(--color-teal)', color: '#000', fontWeight: 600, height: 38 }}
                  >
                    Verify & Issue Credit
                  </button>
                )}
                {canReject && (
                  <button
                    onClick={() => setIsRejectModalOpen(true)}
                    className="button-secondary"
                    style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', height: 38 }}
                  >
                    Reject Note
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Info Card */}
        <div className={isDraft && canAddLine ? "lg:col-span-2 panel" : "lg:col-span-3 panel"} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Summary</h2>
          </div>

          <hr style={{ border: 'none', borderBottom: '1px solid var(--color-border)' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Customer</p>
              <p style={{ fontWeight: 600, marginTop: 4 }}>
                {customer ? (
                  <Link to={`/sales/customers/${customer.id}`} style={{ color: 'var(--color-blue)', textDecoration: 'underline' }}>
                    {customer.name}
                  </Link>
                ) : (
                  crn.customerId
                )}
              </p>
            </div>

            <div>
              <p style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Return Date</p>
              <p style={{ fontWeight: 600, marginTop: 4 }}>
                {dayjs(crn.createdAt || crn.returnDate).format('DD MMMM YYYY (hh:mm A)')}
              </p>
            </div>

            <div>
              <p style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Reason</p>
              <p style={{ marginTop: 4 }}>
                <StatusBadge status={crn.reason} />
              </p>
            </div>

            <div>
              <p style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Linked Invoice</p>
              <p style={{ fontWeight: 600, marginTop: 4 }}>
                {linkedInvoice ? (
                  <Link to={`/sales/invoices/${linkedInvoice.id}`} style={{ color: 'var(--color-blue)', textDecoration: 'underline' }}>
                    {linkedInvoice.invoiceNumber}
                  </Link>
                ) : (
                  'No invoice linked'
                )}
              </p>
            </div>
          </div>

          <div>
            <p style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Notes</p>
            <p style={{ marginTop: 4, color: 'var(--color-text-primary)', fontSize: 13, background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 4, minHeight: 40 }}>
              {crn.notes || 'No description notes provided.'}
            </p>
          </div>

          {/* Prompt status feedback banner */}
          {isVerified && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, backgroundColor: 'rgba(32,212,191,0.08)', border: '1px solid rgba(32,212,191,0.2)', borderRadius: 6, color: 'var(--color-teal)' }}>
              <CheckCircle2 size={18} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Customer Credit Issued for this Return Note.</span>
            </div>
          )}

          {isRejected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12, backgroundColor: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 6, color: 'var(--color-danger)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <XCircle size={18} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>This Return Note was Rejected.</span>
              </div>
              <p style={{ fontSize: 12, marginLeft: 28, color: 'var(--color-text-secondary)' }}>Reason: {crn.rejectedReason || 'No details provided.'}</p>
            </div>
          )}

          {isCancelled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12, backgroundColor: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, color: 'var(--color-text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={18} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>This Return Note was Cancelled.</span>
              </div>
              <p style={{ fontSize: 12, marginLeft: 28, color: 'var(--color-text-secondary)' }}>Reason: {crn.cancelledReason || 'No details provided.'}</p>
            </div>
          )}
        </div>

        {/* Right Column: Inline Add Return Line Item Form */}
        {isDraft && canAddLine && (
          <div className="panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, height: 'fit-content' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Add Return Line Item
            </h3>
            <form onSubmit={handleAddLine} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Product <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <ProductSelect
                  value={selectedProductId}
                  onChange={setSelectedProductId}
                  products={filteredProductsList}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Quantity <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min="1"
                    value={lineQty}
                    onChange={(e) => setLineQty(Number(e.target.value))}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>MRP (Rs.) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    required
                    min="0"
                    value={lineMrp}
                    onChange={(e) => setLineMrp(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Discount %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-input"
                  value={lineDiscount}
                  onChange={(e) => setLineDiscount(Number(e.target.value))}
                />
              </div>

              <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 6 }}>
                <p style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>Estimated Line Credit</p>
                <p className="mono" style={{ fontSize: 18, fontWeight: 750, color: 'var(--color-teal)', marginTop: 2 }}>
                  LKR {money(calculatedLiveCredit)}
                </p>
              </div>

              <button
                type="submit"
                className="button-primary"
                disabled={addLineMutation.isPending}
                style={{ height: 40, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {addLineMutation.isPending ? 'Adding Line...' : <><Plus size={16} /> Add Line Item</>}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Lines Table */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: 14, borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Returned Line Items</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table master-table-compact">
            <thead>
              <tr>
                <th>Product SKU</th>
                <th>Product Name</th>
                <th style={{ textAlign: 'right' }}>Quantity</th>
                <th style={{ textAlign: 'right' }}>MRP</th>
                <th style={{ textAlign: 'right' }}>Discount %</th>
                <th style={{ textAlign: 'right' }}>Credit Amount</th>
                {isDraft && canRemoveLine && <th style={{ width: 80 }}></th>}
              </tr>
            </thead>
            <tbody>
              {(crn.lines || []).length === 0 ? (
                <tr>
                  <td colSpan={isDraft && canRemoveLine ? 7 : 6} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-dim)' }}>
                    No items added to this return note. Add lines to compute credit.
                  </td>
                </tr>
              ) : (
                (crn.lines || []).map((line) => {
                  const lineCredit = line.mrp * line.quantity * (1 - (line.discountPercent || 0) / 100)
                  return (
                    <tr key={line.id}>
                      <td>
                        <span className="mono" style={{ color: 'var(--color-amber)', fontWeight: 600 }}>
                          {line.productSku}
                        </span>
                      </td>
                      <td>{line.productName || line.productId}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{line.quantity}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{money(line.mrp)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{line.discountPercent}%</td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--color-teal)', fontWeight: 700 }}>
                        {money(lineCredit)}
                      </td>
                      {isDraft && canRemoveLine && (
                        <td>
                          <button
                            onClick={() => handleRemoveLine(line.id)}
                            className="text-danger hover:text-red-500"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <Modal
          open={isRejectModalOpen}
          onOpenChange={setIsRejectModalOpen}
          title="Reject Customer Return Note"
        >
          <form onSubmit={handleReject} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Rejection Reason <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <textarea
                className="form-input"
                required
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="State the reason why this note is rejected..."
                rows={3}
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--color-border)', color: '#fff', background: 'rgba(0,0,0,0.1)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setIsRejectModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button-primary"
                style={{ backgroundColor: 'var(--color-danger)', border: 'none', color: '#fff' }}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? 'Processing...' : 'Confirm Reject'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <Modal
          open={isCancelModalOpen}
          onOpenChange={setIsCancelModalOpen}
          title="Cancel Customer Return Note"
        >
          <form onSubmit={handleCancel} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Cancellation Reason <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <textarea
                className="form-input"
                required
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="State the reason why this note is cancelled..."
                rows={3}
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--color-border)', color: '#fff', background: 'rgba(0,0,0,0.1)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setIsCancelModalOpen(false)}
              >
                Close
              </button>
              <button
                type="submit"
                className="button-primary"
                style={{ backgroundColor: 'var(--color-danger)', border: 'none', color: '#fff' }}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? 'Processing...' : 'Confirm Cancel'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
