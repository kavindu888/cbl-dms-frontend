import { Building2, Landmark, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import Modal from '@components/ui/Modal'
import { useAddBankBranch, useBankBranches, useBanks, useCreateBank } from '@/hooks/useCollections'
import { Blank, Busy, PageTitle, Problem, inputStyle } from './collectionsUi'

const emptyBank = { name: '', swiftCode: '' }
const emptyBranch = { branchName: '', branchCode: '' }

export default function BankManagementPage() {
  const [selectedId, setSelectedId] = useState('')
  const [modal, setModal] = useState(null)
  const [bankForm, setBankForm] = useState(emptyBank)
  const [branchForm, setBranchForm] = useState(emptyBranch)
  const banks = useBanks()
  const selected = (banks.data || []).find((bank) => bank.id === selectedId) || banks.data?.[0]
  const branches = useBankBranches(selected?.id)
  const create = useCreateBank()
  const addBranch = useAddBankBranch()
  useEffect(() => {
    if (!selectedId && banks.data?.[0]?.id) setSelectedId(banks.data[0].id)
  }, [banks.data, selectedId])

  async function submitBank(event) {
    event.preventDefault()
    const id = await create.mutateAsync({
      name: bankForm.name.trim(),
      swiftCode: bankForm.swiftCode.trim() || null,
    })
    if (id) setSelectedId(id)
    setBankForm(emptyBank)
    setModal(null)
  }
  async function submitBranch(event) {
    event.preventDefault()
    await addBranch.mutateAsync({
      bankId: selected.id,
      data: {
        branchName: branchForm.branchName.trim(),
        branchCode: branchForm.branchCode.trim() || null,
      },
    })
    setBranchForm(emptyBranch)
    setModal(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageTitle
        title="Banks & Branches"
        subtitle="Register the banks and branches used for cheques and transfers."
        actions={
          <button className="button-primary" onClick={() => setModal('bank')}>
            <Plus size={14} /> Add bank
          </button>
        }
      />
      {banks.isLoading ? (
        <Busy label="Loading banks..." />
      ) : banks.isError ? (
        <Problem error={banks.error} />
      ) : (
        <div
          className="responsive-master-detail"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(300px, .8fr) minmax(0, 1.2fr)',
            gap: 14,
          }}
        >
          <section className="panel" style={{ overflow: 'hidden' }}>
            <div
              style={{
                padding: 14,
                borderBottom: '1px solid var(--color-border)',
                fontWeight: 800,
              }}
            >
              Banks
            </div>
            {(banks.data || []).length ? (
              (banks.data || []).map((bank) => (
                <button
                  type="button"
                  key={bank.id}
                  onClick={() => setSelectedId(bank.id)}
                  style={{
                    width: '100%',
                    padding: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'left',
                    borderBottom: '1px solid var(--color-border)',
                    borderLeft:
                      bank.id === selected?.id
                        ? '2px solid var(--color-amber)'
                        : '2px solid transparent',
                    background:
                      bank.id === selected?.id
                        ? 'color-mix(in srgb, var(--color-amber) 7%, transparent)'
                        : 'transparent',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <Landmark
                    size={17}
                    color={
                      bank.id === selected?.id ? 'var(--color-amber)' : 'var(--color-text-muted)'
                    }
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 750 }}>{bank.name}</div>
                    <div
                      className="mono"
                      style={{ marginTop: 2, fontSize: 10, color: 'var(--color-text-dim)' }}
                    >
                      {bank.swiftCode ? `SWIFT ${bank.swiftCode}` : 'No SWIFT code'}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <Blank>No banks registered.</Blank>
            )}
          </section>
          <section className="panel" style={{ overflow: 'hidden' }}>
            <div
              style={{
                padding: 14,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div>
                <div style={{ fontWeight: 800 }}>
                  {selected ? `${selected.name} branches` : 'Select a bank'}
                </div>
                {selected?.swiftCode ? (
                  <div
                    className="mono"
                    style={{ marginTop: 3, fontSize: 10, color: 'var(--color-text-dim)' }}
                  >
                    {selected.swiftCode}
                  </div>
                ) : null}
              </div>
              {selected ? (
                <button className="button-secondary" onClick={() => setModal('branch')}>
                  <Plus size={13} /> Add branch
                </button>
              ) : null}
            </div>
            {branches.isLoading ? (
              <Busy label="Loading branches..." />
            ) : (branches.data || []).length ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 10,
                  padding: 14,
                }}
              >
                {branches.data.map((branch) => (
                  <article
                    key={branch.id}
                    style={{
                      padding: 12,
                      display: 'flex',
                      gap: 9,
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                    }}
                  >
                    <Building2 size={16} color="var(--color-text-muted)" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{branch.name}</div>
                      <div
                        className="mono"
                        style={{ marginTop: 3, fontSize: 10, color: 'var(--color-text-dim)' }}
                      >
                        {branch.branchCode || 'No branch code'}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Blank>
                {selected ? 'No branches added yet.' : 'Select a bank to see branches.'}
              </Blank>
            )}
          </section>
        </div>
      )}
      <Modal
        open={Boolean(modal)}
        onOpenChange={(open) => !open && setModal(null)}
        title={modal === 'bank' ? 'Add bank' : `Add ${selected?.name || ''} branch`}
        footer={
          <>
            <button className="button-secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button
              form="bank-management-form"
              className="button-primary"
              disabled={create.isPending || addBranch.isPending}
            >
              {create.isPending || addBranch.isPending ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <form
          id="bank-management-form"
          onSubmit={modal === 'bank' ? submitBank : submitBranch}
          style={{ display: 'grid', gap: 12 }}
        >
          {modal === 'bank' ? (
            <>
              <label>
                <span className="form-label">Bank name *</span>
                <input
                  required
                  className="form-input"
                  style={inputStyle}
                  value={bankForm.name}
                  onChange={(event) => setBankForm({ ...bankForm, name: event.target.value })}
                />
              </label>
              <label>
                <span className="form-label">SWIFT code</span>
                <input
                  className="form-input mono"
                  style={inputStyle}
                  value={bankForm.swiftCode}
                  onChange={(event) =>
                    setBankForm({ ...bankForm, swiftCode: event.target.value.toUpperCase() })
                  }
                />
              </label>
            </>
          ) : (
            <>
              <label>
                <span className="form-label">Branch name *</span>
                <input
                  required
                  className="form-input"
                  style={inputStyle}
                  value={branchForm.branchName}
                  onChange={(event) =>
                    setBranchForm({ ...branchForm, branchName: event.target.value })
                  }
                />
              </label>
              <label>
                <span className="form-label">Branch code</span>
                <input
                  className="form-input mono"
                  style={inputStyle}
                  value={branchForm.branchCode}
                  onChange={(event) =>
                    setBranchForm({ ...branchForm, branchCode: event.target.value })
                  }
                />
              </label>
            </>
          )}
        </form>
      </Modal>
    </div>
  )
}
