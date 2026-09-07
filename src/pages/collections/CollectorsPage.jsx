import { Trash2, User, UserCheck } from 'lucide-react'
import { useState } from 'react'
import StatusBadge from '@components/ui/StatusBadge'
import { useCollectors, useCreateCollector, useSetCollectorActive } from '@/hooks/useCollections'

const emptyForm = { name: '', phone: '' }

export default function CollectorsPage() {
  const [form, setForm] = useState(emptyForm)
  const collectors = useCollectors()
  const create = useCreateCollector()
  const setActive = useSetCollectorActive()

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
          Collectors
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Register the collectors who open and run collection sessions.
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
                {collectors.isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm text-text-muted">
                      Loading collectors...
                    </td>
                  </tr>
                ) : collectors.isError ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm text-danger">
                      {collectors.error?.message || 'Unable to load collectors.'}
                    </td>
                  </tr>
                ) : (collectors.data || []).length ? (
                  collectors.data.map((collector) => (
                    <tr key={collector.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <User size={14} color="var(--color-text-muted)" />
                          <span
                            className="text-sm font-medium"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {collector.name}
                          </span>
                        </div>
                      </td>
                      <td className="mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {collector.phone || '—'}
                      </td>
                      <td>
                        <StatusBadge status={collector.isActive ? 'Active' : 'Inactive'} />
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="icon-button"
                          title={collector.isActive ? 'Deactivate collector' : 'Activate collector'}
                          disabled={setActive.isPending}
                          style={{ width: 28, height: 28 }}
                          onClick={() =>
                            setActive.mutateAsync({
                              id: collector.id,
                              isActive: !collector.isActive,
                            })
                          }
                        >
                          {collector.isActive ? (
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
                      No collectors registered yet.
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
              {(collectors.data || []).length} collector
              {(collectors.data || []).length === 1 ? '' : 's'}
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
              Add New Collector
            </p>
            <p style={{ marginTop: 5, fontSize: 12, color: 'var(--color-text-muted)' }}>
              Collectors can be selected when opening a collection session.
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
              placeholder="e.g. R. Fernando"
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
