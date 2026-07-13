import { ArrowLeft, Save } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useCreateInStoreReturn } from '@/hooks/useInStoreReturn'
import { IN_STORE_RETURN_REASONS } from './inStoreReturnUtils'

export default function InStoreReturnCreatePage() {
  const navigate = useNavigate()
  const createMutation = useCreateInStoreReturn()
  const [reason, setReason] = useState(1)
  const [notes, setNotes] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      const created = await createMutation.mutateAsync({
        reason: Number(reason),
        notes: notes.trim() || null,
      })
      const id = typeof created === 'string' ? created : created?.id || created?.value
      if (!id) {
        toast.error('Draft saved, but the new return id was not returned.')
        return
      }
      navigate(`/inventory/in-store-returns/${id}`)
    } catch {
      // Toast is handled by the hook.
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">New In-Store Return</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Save a draft first, then add product batches from the detail workflow.
          </p>
        </div>
        <button
          type="button"
          className="button-secondary"
          onClick={() => navigate('/inventory/in-store-returns')}
        >
          <ArrowLeft size={16} />
          Back to List
        </button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form className="panel space-y-5 p-5" onSubmit={handleSubmit}>
          <div>
            <label className="form-label" htmlFor="isr-reason">
              Reason
            </label>
            <select
              id="isr-reason"
              className="form-input mt-2"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
            >
              {IN_STORE_RETURN_REASONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="isr-notes">
              Notes
            </label>
            <textarea
              id="isr-notes"
              className="form-input mt-2 min-h-32"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional context for the return"
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="button-primary" disabled={createMutation.isPending}>
              <Save size={16} />
              {createMutation.isPending ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </form>

        <aside className="panel h-fit p-5">
          <p className="eyebrow">Summary</p>
          <div className="mt-4 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-text-muted">Status</span>
              <span className="mono font-semibold text-text-primary">DRAFT</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-text-muted">Lines</span>
              <span className="mono font-semibold text-text-primary">0</span>
            </div>
            <p className="rounded-lg border border-border bg-bg-base/60 p-3 text-text-muted">
              Product lines are added after the draft number is created.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
