import dayjs from 'dayjs'
import { Banknote, CreditCard, History, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { salesService } from '@/services/api/salesService'
import {
  useCustomerCreditBalance,
  useCustomerCreditTransactions,
  useApplyCredit,
} from '@/hooks/useCustomerCredit'
import Modal from '@components/ui/Modal'

function money(value) {
  return Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function CustomerCreditPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const customerId = searchParams.get('customerId') || ''

  const [customers, setCustomers] = useState([])
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [applyAmount, setApplyAmount] = useState('')
  const [outstandingInvoices, setOutstandingInvoices] = useState([])
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false)

  const { data: balanceData, refetch: refetchBalance } = useCustomerCreditBalance(customerId)
  const { data: transactions, refetch: refetchTransactions } = useCustomerCreditTransactions(customerId)
  const applyCreditMutation = useApplyCredit()

  // Load Customers list
  useEffect(() => {
    async function loadCustomers() {
      try {
        const result = await salesService.listCustomers({ page: 1, pageSize: 150, isActive: true })
        setCustomers(result.items || [])
      } catch (err) {
        console.error('Failed to load customers:', err)
      }
    }
    loadCustomers()
  }, [])

  // Load Outstanding Invoices for Selected Customer
  useEffect(() => {
    if (!customerId || !isApplyModalOpen) {
      setOutstandingInvoices([])
      setSelectedInvoiceId('')
      setApplyAmount('')
      return
    }

    async function loadInvoices() {
      setIsLoadingInvoices(true)
      try {
        const list = await salesService.listOutstandingInvoicesByCustomer(customerId)
        setOutstandingInvoices(list || [])
      } catch (err) {
        toast.error('Failed to load customer outstanding invoices.')
      } finally {
        setIsLoadingInvoices(false)
      }
    }
    loadInvoices()
  }, [customerId, isApplyModalOpen])

  // Pre-fill amount to apply based on selected invoice
  useEffect(() => {
    if (!selectedInvoiceId) {
      setApplyAmount('')
      return
    }
    const inv = outstandingInvoices.find(i => i.id === selectedInvoiceId)
    if (inv) {
      const maxAvailable = balanceData?.creditBalance || balanceData?.balance || 0
      const amountToApply = Math.min(inv.outstandingAmount, maxAvailable)
      setApplyAmount(String(amountToApply))
    }
  }, [selectedInvoiceId, outstandingInvoices, balanceData])

  function handleCustomerChange(e) {
    const nextId = e.target.value
    if (nextId) {
      setSearchParams({ customerId: nextId })
    } else {
      setSearchParams({})
    }
  }

  function handleApplyCredit(e) {
    e.preventDefault()
    if (!customerId) return toast.error('No customer selected.')
    if (!selectedInvoiceId) return toast.error('Invoice selection is required.')
    
    const amountVal = Number(applyAmount)
    if (amountVal <= 0) return toast.error('Apply amount must be greater than zero.')

    const maxAvailable = balanceData?.creditBalance || balanceData?.balance || 0
    if (amountVal > maxAvailable) {
      return toast.error(`Insufficient credit balance. Maximum available is LKR ${money(maxAvailable)}`)
    }

    applyCreditMutation.mutate({
      customerId,
      invoiceId: selectedInvoiceId,
      amount: amountVal,
    }, {
      onSuccess: () => {
        setIsApplyModalOpen(false)
        setSelectedInvoiceId('')
        setApplyAmount('')
        refetchBalance()
        refetchTransactions()
      }
    })
  }

  // Get current active customer name
  const currentCustomer = customers.find(c => c.id === customerId)

  // Map transaction type integers to name labels
  // Earned = 1 (AdjustmentIn / Earned) -> Green
  // Consumed = 2 (AdjustmentOut / Consumed) -> Amber
  // Adjusted = 3 -> Blue
  function getTransactionTypeBadge(typeValue) {
    const typeLabel = String(typeValue)
    if (typeLabel === '1' || typeLabel.toLowerCase() === 'earned') return 'earned'
    if (typeLabel === '2' || typeLabel.toLowerCase() === 'consumed') return 'consumed'
    return 'adjusted'
  }

  function formatTypeLabel(typeValue) {
    const typeLabel = String(typeValue)
    if (typeLabel === '1' || typeLabel.toLowerCase() === 'earned') return 'Earned'
    if (typeLabel === '2' || typeLabel.toLowerCase() === 'consumed') return 'Consumed'
    return 'Adjusted'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Customer Credit Ledger
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Monitor customer credit limits, transaction histories, and apply credits manually to invoices.
        </p>
      </div>

      {/* Customer Selector panel */}
      <div className="panel" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, maxWidth: 360 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Selected Customer</label>
          <select
            className="form-input"
            value={customerId}
            onChange={handleCustomerChange}
            style={{ width: '100%', height: 40, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', borderRadius: 6 }}
          >
            <option value="">Select customer to view ledger...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {customerId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Credit Balance Card */}
          <div className="panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={16} color="var(--color-teal)" />
              <h2 style={{ fontSize: 14, fontWeight: 700 }}>Current Credit Balance</h2>
            </div>
            
            <hr style={{ border: 'none', borderBottom: '1px solid var(--color-border)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '10px 0' }}>
              <p style={{ fontSize: 10, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Available Credit</p>
              <p className="mono" style={{ fontSize: 32, fontWeight: 900, color: 'var(--color-teal)' }}>
                LKR {money(balanceData?.creditBalance ?? balanceData?.balance ?? 0)}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Customer Code:</span>
                <span className="mono">{currentCustomer?.code || customerId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Credit Limit:</span>
                <span className="mono">LKR {money(currentCustomer?.creditLimit || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Last Updated:</span>
                <span>{dayjs(balanceData?.updatedAt || new Date()).format('DD MMM YYYY')}</span>
              </div>
            </div>

            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="button-primary"
              disabled={!(balanceData?.creditBalance || balanceData?.balance)}
              style={{ width: '100%', height: 38, marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Banknote size={15} /> Apply to Invoice
            </button>
          </div>

          {/* Right Column: Ledger Log */}
          <div className="lg:col-span-2 panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: 14, borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={16} color="var(--color-amber)" />
              <h2 style={{ fontSize: 14, fontWeight: 700 }}>Transaction History</h2>
            </div>

            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table className="data-table master-table-compact">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'right' }}>Balance After</th>
                    <th>Reference</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {!transactions || transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-dim)' }}>
                        No transactions recorded for this customer ledger.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => {
                      const badgeType = getTransactionTypeBadge(tx.type || tx.movementType)
                      const isMinus = badgeType === 'consumed'
                      return (
                        <tr key={tx.id}>
                          <td>{dayjs(tx.occurredOn || tx.createdAt).format('DD MMM YYYY HH:mm')}</td>
                          <td>
                            <StatusBadge status={badgeType} />
                          </td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: isMinus ? 'var(--color-warning)' : 'var(--color-teal)' }}>
                            {isMinus ? '-' : '+'}{money(tx.amount)}
                          </td>
                          <td className="mono" style={{ textAlign: 'right' }}>{money(tx.balanceAfter)}</td>
                          <td className="mono" style={{ color: 'var(--color-amber)' }}>{tx.referenceId || tx.referenceNumber || '-'}</td>
                          <td>{tx.notes || tx.description || '-'}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel" style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Banknote size={40} style={{ color: 'var(--color-text-dim)' }} />
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 650, color: '#fff' }}>No customer selected</h2>
            <p style={{ fontSize: 13, marginTop: 4 }}>Select a customer from the dropdown menu to inspect their available credit balance and transaction history logs.</p>
          </div>
        </div>
      )}

      {/* Apply Credit Modal */}
      {isApplyModalOpen && (
        <Modal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          title="Apply Customer Credit to Invoice"
        >
          <form onSubmit={handleApplyCredit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '6px 2px' }}>
            <div style={{ backgroundColor: 'rgba(32,212,191,0.06)', padding: 12, borderRadius: 6 }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>Credit Balance Available</p>
              <p className="mono" style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-teal)', marginTop: 2 }}>
                LKR {money(balanceData?.creditBalance ?? balanceData?.balance ?? 0)}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Invoice <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <select
                className="form-input"
                required
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                style={{ width: '100%', height: 40, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', borderRadius: 6 }}
              >
                <option value="">Select invoice...</option>
                {outstandingInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} (Outstanding: Rs. {money(inv.outstandingAmount)})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Amount to Apply (Rs.) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                required
                value={applyAmount}
                onChange={(e) => setApplyAmount(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setIsApplyModalOpen(false)}
                style={{ height: 40 }}
              >
                Close
              </button>
              <button
                type="submit"
                className="button-primary"
                disabled={applyCreditMutation.isPending}
                style={{ height: 40 }}
              >
                {applyCreditMutation.isPending ? 'Applying...' : 'Apply Credit'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
