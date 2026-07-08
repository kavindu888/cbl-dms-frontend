import dayjs from 'dayjs'
import { Banknote, CreditCard, History } from 'lucide-react'
import { useEffect, useState } from 'react'
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
  const [outstandingInvoices, setOutstandingInvoices] = useState([])
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false)

  const { data: balanceData, refetch: refetchBalance } = useCustomerCreditBalance(customerId)
  const { data: transactions, refetch: refetchTransactions } = useCustomerCreditTransactions(customerId)
  const applyCreditMutation = useApplyCredit()

  // Load Customers list
  useEffect(() => {
    async function loadCustomers() {
      try {
        const result = await salesService.listCustomers({ page: 1, pageSize: 50, isActive: true })
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
    
    applyCreditMutation.mutate({
      customerId,
      invoiceId: selectedInvoiceId,
    }, {
      onSuccess: () => {
        setIsApplyModalOpen(false)
        setSelectedInvoiceId('')
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
                LKR {money(balanceData?.currentBalance ?? 0)}
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
                <span>{dayjs(balanceData?.lastUpdated || new Date()).format('DD MMM YYYY')}</span>
              </div>
            </div>

            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="button-primary"
              disabled={!balanceData?.currentBalance}
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
                      const badgeType = getTransactionTypeBadge(tx.creditType)
                      const isMinus = badgeType === 'consumed'
                      return (
                        <tr key={tx.id}>
                          <td>{dayjs(tx.transactionDate).format('DD MMM YYYY HH:mm')}</td>
                          <td>
                            <StatusBadge status={badgeType} />
                          </td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: isMinus ? 'var(--color-warning)' : 'var(--color-teal)' }}>
                            {isMinus ? '-' : '+'}{money(tx.amount)}
                          </td>
                          <td className="mono" style={{ textAlign: 'right' }}>{money(tx.balanceAfter)}</td>
                          <td className="mono" style={{ color: 'var(--color-amber)' }}>{tx.referenceId || tx.referenceNumber || '-'}</td>
                          <td>{tx.description || '-'}</td>
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
          open={isApplyModalOpen}
          onOpenChange={setIsApplyModalOpen}
          title="Apply Customer Credit to Invoice"
        >
          <form onSubmit={handleApplyCredit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '6px 2px' }}>
            <div style={{ backgroundColor: 'rgba(32,212,191,0.06)', padding: 12, borderRadius: 6 }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>Credit Balance Available</p>
              <p className="mono" style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-teal)', marginTop: 2 }}>
                LKR {money(balanceData?.currentBalance ?? 0)}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Invoice <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <select
                className="form-input"
                required
                value={selectedInvoiceId}
                disabled={isLoadingInvoices}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                style={{ width: '100%', height: 40, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', borderRadius: 6 }}
              >
                <option value="">
                  {isLoadingInvoices ? 'Loading invoices...' : 'Select invoice...'}
                </option>
                {outstandingInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} (Outstanding: Rs. {money(inv.outstandingAmount)})
                  </option>
                ))}
              </select>
            </div>

            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              The backend will apply the smaller of the available credit balance and the invoice outstanding amount.
            </p>

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
