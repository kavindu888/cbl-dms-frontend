import { Trash2, User, UserCheck } from 'lucide-react'
import { useState } from 'react'
import StatusBadge from '@components/ui/StatusBadge'
import { useCreateSalesman, useSalesmen, useSetSalesmanActive } from '@/hooks/useCollections'

const emptyForm = { name: '', phone: '' }

export default function SalesmenPage() {
  const [form, setForm] = useState(emptyForm)
  const salesmen = useSalesmen()
  const create = useCreateSalesman()
  const setActive = useSetSalesmanActive()

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSave(event) {
    event.preventDefault()
    if (!form.name.trim()) return
    await create.mutateAsync({ name: form.name.trim(), phone: form.phone.trim() || null })
    setForm(emptyForm)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
      }}
    >
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Salesmen
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Register the salesmen who accompany collection sessions.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
          gap: 16,
          alignItems: 'stretch',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          className="panel"
          style={{
            padding: '14px 16px',
            display: 'grid',
            gridTemplateRows: 'minmax(0, 1fr) auto',
            minHeight: 0,
          }}
        >
          <div className="overflow-x-auto" style={{ minHeight: 0, overflowY: 'hidden' }}>
            <table className="data-table master-table-compact">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {salesmen.isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm text-text-muted">
                      Loading salesmen...
                    </td>
                  </tr>
                ) : salesmen.isError ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm text-danger">
                      {salesmen.error?.message || 'Unable to load salesmen.'}
                    </td>
                  </tr>
                ) : (salesmen.data || []).length ? (
                  salesmen.data.map((salesman) => (
                    <tr key={salesman.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <User size={14} color="var(--color-text-muted)" />
                          <span
                            className="text-sm font-medium"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {salesman.name}
                          </span>
                        </div>
                      </td>
                      <td className="mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {salesman.phone || '—'}
                      </td>
                      <td>
                        <StatusBadge status={salesman.isActive ? 'Active' : 'Inactive'} />
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="icon-button"
                          title={salesman.isActive ? 'Deactivate salesman' : 'Activate salesman'}
                          disabled={setActive.isPending}
                          style={{ width: 28, height: 28 }}
                          onClick={() =>
                            setActive.mutateAsync({
                              id: salesman.id,
                              isActive: !salesman.isActive,
                            })
                          }
                        >
                          {salesman.isActive ? (
                            <Trash2 style={{ width: 13, height: 13 }} />
                          ) : (
                            <UserCheck style={{ width: 13, height: 13 }} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm text-text-muted">
                      No salesmen registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              paddingTop: 10,
              borderTop: '1px solid var(--color-border)',
              marginTop: 10,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
              {(salesmen.data || []).length} salesman
              {(salesmen.data || []).length === 1 ? '' : 'men'}
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="panel"
          style={{
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minHeight: 0,
          }}
        >
          <div>
            <p style={{ fontSize: 16, fontWeight: 650, color: 'var(--color-text-primary)' }}>
              Add New Salesman
            </p>
            <p style={{ marginTop: 5, fontSize: 12, color: 'var(--color-text-muted)' }}>
              Salesmen can be selected when opening a collection session.
            </p>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              NAME *
            </label>
            <input
              autoFocus
              required
              className="form-input"
              placeholder="e.g. K. Bandara"
              value={form.name}
              maxLength={150}
              onChange={(event) => updateField('name', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              PHONE
            </label>
            <input
              className="form-input mono"
              placeholder="Optional"
              value={form.phone}
              maxLength={30}
              onChange={(event) => updateField('phone', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
            <button
              type="button"
              className="button-ghost"
              onClick={() => setForm(emptyForm)}
              style={{ flex: 1, height: 38, fontSize: 13 }}
            >
              Clear
            </button>
            <button
              type="submit"
              className="button-primary"
              disabled={create.isPending || !form.name.trim()}
              style={{ flex: 1, height: 38, fontSize: 13 }}
            >
              {create.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
