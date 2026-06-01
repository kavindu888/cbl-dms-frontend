import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { Pencil, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
const initialBrands = [
  { id: 'brd-001', code: 'BRD-001', name: 'Munchee', productCount: 45, isActive: true },
  { id: 'brd-002', code: 'BRD-002', name: 'Ritzbury', productCount: 28, isActive: true },
  { id: 'brd-003', code: 'BRD-003', name: 'Tiara', productCount: 12, isActive: true },
  { id: 'brd-004', code: 'BRD-004', name: 'Samaposha', productCount: 5, isActive: true },
  { id: 'brd-005', code: 'BRD-005', name: 'Lanka Soy', productCount: 15, isActive: false },
]
// ── Schema ───────────────────────────────────────────────────────────────
const brandSchema = z.object({
  code: z.string().min(1, 'Brand code is required'),
  name: z.string().min(1, 'Brand name is required'),
  isActive: z.boolean().default(true),
})
// ── Form Modal Component ──────────────────────────────────────────────────
function BrandFormModal({ open, brand, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      code: '',
      name: '',
      isActive: true,
    },
  })
  useEffect(() => {
    if (open) {
      if (brand) {
        reset({
          code: brand.code,
          name: brand.name,
          isActive: brand.isActive,
        })
      } else {
        reset({
          code: '',
          name: '',
          isActive: true,
        })
      }
    }
  }, [open, brand, reset])
  async function onSubmit(values) {
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 600))
    if (brand) {
      onSaved({
        ...brand,
        ...values,
      })
      toast.success(`Brand ${values.name} updated successfully.`)
      onClose()
    } else {
      onSaved({
        id: `brd-${Date.now()}`,
        ...values,
        productCount: 0,
      })
      toast.success(`Brand ${values.name} created successfully.`)
      reset({
        code: '',
        name: '',
        isActive: true,
      })
      setTimeout(() => {
        const codeInput = document.querySelector('input[name="code"]')
        if (codeInput) {
          codeInput.focus()
        }
      }, 10)
    }
  }
  const handleFormKeyDown = (e) => {
    if (e.key === 'Enter') {
      const target = e.target
      if (target.tagName === 'BUTTON') {
        return
      }
      e.preventDefault()
      const form = e.currentTarget
      const focusable = Array.from(
        form.querySelectorAll(
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), button:not([disabled]):not([data-skip-focus="true"])'
        )
      )
      const index = focusable.indexOf(target)
      if (index > -1 && index < focusable.length - 1) {
        focusable[index + 1].focus()
      }
    }
  }
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,4,12,0.75)', backdropFilter: 'blur(2px)' }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 shadow-2xl"
          style={{
            maxWidth: 500,
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            maxHeight: '92vh',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '32px 32px 24px 32px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <Dialog.Title
                style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)' }}
              >
                {brand ? 'Edit Brand' : 'Create New Brand'}
              </Dialog.Title>
              <Dialog.Description
                style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}
              >
                {brand ? 'Update brand details.' : 'Register a new product brand into the system.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-muted)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '50%',
                }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            onKeyDown={handleFormKeyDown}
            style={{
              padding: '0 32px 32px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            {/* Code Row */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.8px',
                  color: 'var(--color-text-muted)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                BRAND CODE
              </label>
              <input
                {...register('code')}
                autoFocus
                className="form-input w-full"
                placeholder="e.g. BRD-001"
                style={{ background: 'rgba(0,0,0,0.15)', height: 44 }}
              />
              {errors.code && (
                <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>
                  {errors.code.message}
                </p>
              )}
            </div>

            {/* Name Row */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.8px',
                  color: 'var(--color-text-muted)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                BRAND NAME
              </label>
              <input
                {...register('name')}
                className="form-input w-full"
                placeholder="e.g. Munchee"
                style={{ background: 'rgba(0,0,0,0.15)', height: 44 }}
              />
              {errors.name && (
                <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  {...register('isActive')}
                  style={{ width: 18, height: 18, accentColor: 'var(--color-amber)' }}
                />
                <span style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>
                  Active Brand
                </span>
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <Dialog.Close asChild>
                <button
                  type="button"
                  data-skip-focus="true"
                  className="button-ghost"
                  style={{ flex: 1, padding: '10px 0', height: 44 }}
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="button-primary"
                style={{ flex: 1, padding: '10px 0', height: 44 }}
              >
                {brand ? 'Update Brand' : 'Create Brand'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
import StatusBadge from '@components/ui/StatusBadge'
// ── Main Page Component ──────────────────────────────────────────────────
export default function BrandListPage() {
  const [brands, setBrands] = useState(initialBrands)
  const [search, setSearch] = useState('')
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState(undefined)
  const filtered = useMemo(
    () =>
      brands.filter((b) => {
        if (!search) return true
        const s = search.toLowerCase()
        return b.name.toLowerCase().includes(s) || b.code.toLowerCase().includes(s)
      }),
    [brands, search]
  )
  function handleAdd() {
    setEditingBrand(undefined)
    setIsModalOpen(true)
  }
  function handleEdit(b) {
    setEditingBrand(b)
    setIsModalOpen(true)
  }
  function handleSave(b) {
    if (editingBrand) {
      setBrands(brands.map((item) => (item.id === b.id ? b : item)))
    } else {
      setBrands([b, ...brands])
    }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
            }}
          >
            Brands
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Manage product brands and portfolios.
          </p>
        </div>
        <button
          className="button-primary"
          onClick={handleAdd}
          style={{
            height: 40,
            padding: '0 24px',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Plus style={{ width: 16, height: 16 }} />
          New Brand
        </button>
      </div>

      <BrandFormModal
        open={isModalOpen}
        brand={editingBrand}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSave}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Filter Bar ── */}
        <div
          className="panel"
          style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 16 }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 16,
                color: 'var(--color-text-dim)',
              }}
            />
            <input
              className="form-input"
              placeholder="Search brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: 40,
                paddingLeft: 36,
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                color: 'var(--color-text-primary)',
                fontSize: 14,
              }}
            />
          </div>
        </div>

        {/* ── Table ── */}
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Brand Name</th>
                  <th>Products</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span
                        className="mono text-xs font-medium"
                        style={{ color: 'var(--color-amber)' }}
                      >
                        {b.code}
                      </span>
                    </td>
                    <td
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {b.name}
                    </td>
                    <td className="mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {b.productCount}
                    </td>
                    <td>
                      <StatusBadge status={b.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <button
                        className="icon-button"
                        title="Edit brand"
                        style={{ width: 28, height: 28 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(b)
                        }}
                      >
                        <Pencil style={{ width: 13, height: 13 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
