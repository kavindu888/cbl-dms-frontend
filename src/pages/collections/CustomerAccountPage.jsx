import { useQuery } from '@tanstack/react-query'
import { CreditCard, PauseCircle, PlayCircle, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '@components/ui/ConfirmDialog'
import Modal from '@components/ui/Modal'
import StatusBadge from '@components/ui/StatusBadge'
import AgingBadge from '@/components/collections/AgingBadge'
import {
  useCreateCustomerAccount,
  useCustomerAccount,
  useCustomerAccounts,
  useHoldCustomerAccount,
  useReinstateCustomerAccount,
  useUpdateCreditLimit,
} from '@/hooks/useCollections'
import { salesService } from '@/services/api/salesService'
import { formatDateTime } from '@/utils'
import { Blank, Busy, Metric, PageTitle, Problem, inputStyle, money } from './collectionsUi'

export default function CustomerAccountPage() {
  const [search, setSearch] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ customerId: '', creditLimit: '', paymentTermsDays: 30 })
  const accounts = useCustomerAccounts({ page: 1, pageSize: 100 })
  const detail = useCustomerAccount(customerId)
  const customers = useQuery({
    queryKey: ['sales', 'customers', 'account-list'],
    queryFn: () => salesService.listAllCustomers({ pageSize: 100 }),
    staleTime: 60_000,
  })
  const names = useMemo(
    () => Object.fromEntries((customers.data || []).map((row) => [row.id, row])),
    [customers.data]
  )
  const filtered = (accounts.data || []).filter((row) => {
    const q = search.trim().toLowerCase()
    const customer = names[row.customerId]
    return (
      !q ||
      customer?.name?.toLowerCase().includes(q) ||
      customer?.code?.toLowerCase().includes(q) ||
      row.customerId.toLowerCase().includes(q)
    )
  })
  const selectedId = customerId || filtered[0]?.customerId || ''
  useEffect(() => {
    if (!customerId && filtered[0]?.customerId) setCustomerId(filtered[0].customerId)
  }, [customerId, filtered])
  const create = useCreateCustomerAccount()
  const update = useUpdateCreditLimit()
  const hold = useHoldCustomerAccount()
  const reinstate = useReinstateCustomerAccount()
  const data = detail.data
  const existingIds = new Set((accounts.data || []).map((row) => row.customerId))

  async function submit(event) {
    event.preventDefault()
    if (modal === 'create')
      await create.mutateAsync({
        customerId: form.customerId,
        creditLimit: Number(form.creditLimit),
        paymentTermsDays: Number(form.paymentTermsDays),
      })
    else
      await update.mutateAsync({ customerId: selectedId, newCreditLimit: Number(form.creditLimit) })
    setModal(null)
    setForm({ customerId: '', creditLimit: '', paymentTermsDays: 30 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageTitle
        title="Customer Accounts"
        subtitle="Review credit exposure, aging, and the recent customer ledger."
        actions={
          <button className="button-primary" onClick={() => setModal('create')}>
            <Plus size={14} /> New account
          </button>
        }
      />
      {accounts.isLoading ? (
        <Busy label="Loading customer accounts..." />
      ) : accounts.isError ? (
        <Problem error={accounts.error} />
      ) : (
        <div
          className="responsive-master-detail"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(300px, 370px) minmax(0, 1fr)',
            gap: 14,
          }}
        >
          <section className="panel" style={{ padding: 12 }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search
                size={15}
                style={{ position: 'absolute', left: 11, top: 11, color: 'var(--color-text-dim)' }}
              />
              <input
                className="form-input"
                style={{ ...inputStyle, paddingLeft: 34 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer"
              />
            </div>
            <div style={{ display: 'grid', gap: 7 }}>
              {filtered.length ? (
                filtered.map((row) => (
                  <button
                    key={row.id}
                    onClick={() => setCustomerId(row.customerId)}
                    style={{
                      padding: 11,
                      textAlign: 'left',
                      borderRadius: 8,
                      background: 'var(--color-bg-elevated)',
                      border:
                        row.customerId === selectedId
                          ? '1px solid var(--color-amber)'
                          : '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{names[row.customerId]?.name || row.customerId}</strong>
                      <StatusBadge status={row.status} />
                    </div>
                    <div
                      style={{
                        marginTop: 7,
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                      }}
                    >
                      <span style={{ color: 'var(--color-text-dim)' }}>Balance</span>
                      <span className="mono">{money(row.currentBalance)}</span>
                    </div>
                  </button>
                ))
              ) : (
                <Blank>No customer accounts match.</Blank>
              )}
            </div>
          </section>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {detail.isLoading ? (
              <Busy />
            ) : data ? (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Metric label="Credit limit" value={money(data.creditLimit)} />
                  <Metric
                    label="Current balance"
                    value={money(data.currentBalance)}
                    tone="var(--color-amber)"
                  />
                  <Metric
                    label="Available credit"
                    value={money(data.availableCredit)}
                    tone={data.availableCredit >= 0 ? 'var(--color-teal)' : 'var(--color-danger)'}
                  />
                </div>
                <section className="panel" style={{ padding: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 800 }}>
                        {names[data.customerId]?.name || data.customerId}
                      </h2>
                      <p style={{ marginTop: 3, fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {data.paymentTermsDays} day payment terms
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button
                        className="button-secondary"
                        onClick={() => {
                          setForm({ ...form, creditLimit: data.creditLimit })
                          setModal('limit')
                        }}
                      >
                        <CreditCard size={14} /> Edit limit
                      </button>
                      {data.status === 'OnHold' ? (
                        <ConfirmDialog
                          title="Reinstate this account?"
                          description="Credit sales will be allowed again, subject to the available limit."
                          confirmLabel="Reinstate"
                          tone="warning"
                          onConfirm={() => reinstate.mutateAsync(data.customerId)}
                          trigger={
                            <button className="button-primary">
                              <PlayCircle size={14} /> Reinstate
                            </button>
                          }
                        />
                      ) : (
                        <ConfirmDialog
                          title="Place account on hold?"
                          description="New credit sales will be blocked until this customer is reinstated."
                          confirmLabel="Place on hold"
                          onConfirm={() => hold.mutateAsync(data.customerId)}
                          trigger={
                            <button className="button-danger">
                              <PauseCircle size={14} /> Hold
                            </button>
                          }
                        />
                      )}
                    </div>
                  </div>
                  <h3 style={{ marginTop: 22, fontSize: 13, fontWeight: 800 }}>Aging analysis</h3>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-5" style={{ marginTop: 10 }}>
                    {[
                      ['Current', data.aging?.current, 0],
                      ['1–7 days', data.aging?.days1To7, 7],
                      ['8–14 days', data.aging?.days8To14, 14],
                      ['15–21 days', data.aging?.days15To21, 21],
                      ['21+ days', data.aging?.days21Plus, 22],
                    ].map(([label, value, days]) => (
                      <div
                        key={label}
                        style={{
                          padding: 10,
                          border: '1px solid var(--color-border)',
                          borderRadius: 7,
                        }}
                      >
                        <div className="form-label">{label}</div>
                        <div className="mono" style={{ marginTop: 5, fontWeight: 800 }}>
                          {money(value)}
                        </div>
                        <div style={{ marginTop: 5 }}>
                          <AgingBadge daysOverdue={Number(value) > 0 ? days : 0} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="panel" style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      padding: 14,
                      borderBottom: '1px solid var(--color-border)',
                      fontWeight: 800,
                    }}
                  >
                    Recent ledger
                  </div>
                  {data.recentLedger?.length ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Reference</th>
                            <th style={{ textAlign: 'right' }}>Debit</th>
                            <th style={{ textAlign: 'right' }}>Credit</th>
                            <th style={{ textAlign: 'right' }}>Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recentLedger.map((row) => (
                            <tr key={row.id}>
                              <td>{formatDateTime(row.transactionDate)}</td>
                              <td>{row.type}</td>
                              <td>{row.referenceText || row.referenceId}</td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                {money(row.debit)}
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                {money(row.credit)}
                              </td>
                              <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                                {money(row.runningBalance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Blank>No ledger entries are available.</Blank>
                  )}
                </section>
              </>
            ) : (
              <Blank>Select a customer account.</Blank>
            )}
          </section>
        </div>
      )}
      <Modal
        open={Boolean(modal)}
        onOpenChange={(next) => !next && setModal(null)}
        title={modal === 'create' ? 'Create customer account' : 'Update credit limit'}
        footer={
          <>
            <button className="button-secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button
              form="account-form"
              className="button-primary"
              disabled={create.isPending || update.isPending}
            >
              Save
            </button>
          </>
        }
      >
        <form id="account-form" onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
          {modal === 'create' ? (
            <>
              <label>
                <span className="form-label">Customer</span>
                <select
                  required
                  className="form-input"
                  style={inputStyle}
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                >
                  <option value="">Select customer</option>
                  {(customers.data || [])
                    .filter((row) => !existingIds.has(row.id))
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.code} — {row.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <span className="form-label">Payment terms (days)</span>
                <input
                  required
                  min="0"
                  type="number"
                  className="form-input mono"
                  style={inputStyle}
                  value={form.paymentTermsDays}
                  onChange={(e) => setForm({ ...form, paymentTermsDays: e.target.value })}
                />
              </label>
            </>
          ) : null}
          <label>
            <span className="form-label">Credit limit</span>
            <input
              required
              min="0"
              step="0.01"
              type="number"
              className="form-input mono"
              style={inputStyle}
              value={form.creditLimit}
              onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
            />
          </label>
        </form>
      </Modal>
    </div>
  )
}
