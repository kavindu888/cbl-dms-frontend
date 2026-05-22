import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { Pencil, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import StatusBadge from '@components/ui/StatusBadge'

// ── Types & Mocks ────────────────────────────────────────────────────────

type Category = {
  id: string
  code: string
  name: string
  parentCategoryId: string | null
  itemCount: number
  isActive: boolean
}

const initialCategories: Category[] = [
  { id: 'cat-001', code: 'CAT-CAKES', name: 'Cakes', parentCategoryId: null, itemCount: 12, isActive: true },
  { id: 'cat-002', code: 'CAT-BISC', name: 'Biscuits', parentCategoryId: null, itemCount: 45, isActive: true },
  { id: 'cat-003', code: 'CAT-WAFR', name: 'Wafers', parentCategoryId: null, itemCount: 8, isActive: true },
  { id: 'cat-004', code: 'CAT-CHOC', name: 'Chocolate', parentCategoryId: null, itemCount: 24, isActive: true },
  { id: 'cat-005', code: 'CAT-FLOR', name: 'Flour', parentCategoryId: null, itemCount: 5, isActive: true },
  { id: 'cat-006', code: 'CAT-SNCK', name: 'Snacks', parentCategoryId: null, itemCount: 18, isActive: true },
  { id: 'cat-007', code: 'CAT-CRCK', name: 'Crackers', parentCategoryId: null, itemCount: 15, isActive: true },
]

// ── Schema ───────────────────────────────────────────────────────────────

const categorySchema = z.object({
  code: z.string().min(1, 'Category code is required'),
  name: z.string().min(1, 'Category name is required'),
  parentCategoryId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
})

type CategoryFormValues = z.infer<typeof categorySchema>

// ── Form Modal Component ──────────────────────────────────────────────────

function CategoryFormModal({
  open,
  category,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean
  category?: Category
  categories: Category[]
  onClose: () => void
  onSaved: (cat: Category) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: '',
      name: '',
      parentCategoryId: '',
      isActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (category) {
        reset({
          code: category.code,
          name: category.name,
          parentCategoryId: category.parentCategoryId || '',
          isActive: category.isActive,
        })
      } else {
        reset({
          code: '',
          name: '',
          parentCategoryId: '',
          isActive: true,
        })
      }
    }
  }, [open, category, reset])

  async function onSubmit(values: CategoryFormValues) {
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 600))
    
    if (category) {
      onSaved({
        ...category,
        code: values.code,
        name: values.name,
        parentCategoryId: values.parentCategoryId || null,
        isActive: values.isActive,
      })
      toast.success(`Category ${values.name} updated successfully.`)
      onClose()
    } else {
      onSaved({
        id: `cat-${Date.now()}`,
        code: values.code,
        name: values.name,
        parentCategoryId: values.parentCategoryId || null,
        itemCount: 0,
        isActive: values.isActive,
      })
      toast.success(`Category ${values.name} created successfully.`)
      reset({
        code: '',
        name: '',
        parentCategoryId: '',
        isActive: true,
      })
      setTimeout(() => {
        const codeInput = document.querySelector('input[name="code"]') as HTMLInputElement
        if (codeInput) {
          codeInput.focus()
        }
      }, 10)
    }
  }

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement
      if (target.tagName === 'BUTTON') {
        return
      }
      
      e.preventDefault()
      const form = e.currentTarget
      const focusable = Array.from(
        form.querySelectorAll<HTMLElement>(
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
          <div style={{ padding: '32px 32px 24px 32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <Dialog.Title style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {category ? 'Edit Category' : 'Create New Category'}
              </Dialog.Title>
              <Dialog.Description style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
                {category ? 'Update category details.' : 'Add a new product category to the inventory system.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button aria-label="Close" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleFormKeyDown} style={{ padding: '0 32px 32px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Code Row */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>CATEGORY CODE</label>
              <input
                {...register('code')}
                autoFocus
                className="form-input w-full"
                placeholder="e.g. CAT-001"
                style={{ background: 'rgba(0,0,0,0.15)', height: 44 }}
              />
              {errors.code && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.code.message}</p>}
            </div>

            {/* Name Row */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>CATEGORY NAME</label>
              <input
                {...register('name')}
                className="form-input w-full"
                placeholder="e.g. Biscuits"
                style={{ background: 'rgba(0,0,0,0.15)', height: 44 }}
              />
              {errors.name && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.name.message}</p>}
            </div>

            {/* Parent Category Row */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>PARENT CATEGORY</label>
              <select
                {...register('parentCategoryId')}
                className="form-input w-full"
                style={{ background: 'rgba(0,0,0,0.15)', height: 44, color: 'var(--color-text-primary)' }}
              >
                <option value="" style={{ background: 'var(--color-bg-elevated)' }}>None (Root Category)</option>
                {categories
                  .filter((c) => c.id !== category?.id) // Prevent self-selection
                  .map((c) => (
                    <option key={c.id} value={c.id} style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }}>
                      {c.name} ({c.code})
                    </option>
                  ))}
              </select>
              {errors.parentCategoryId && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.parentCategoryId.message}</p>}
            </div>

            {/* Status */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  {...register('isActive')}
                  style={{ width: 18, height: 18, accentColor: 'var(--color-amber)' }}
                />
                <span style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>Active Category</span>
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <Dialog.Close asChild>
                <button type="button" data-skip-focus="true" className="button-ghost" style={{ flex: 1, padding: '10px 0', height: 44 }}>
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" className="button-primary" style={{ flex: 1, padding: '10px 0', height: 44 }}>
                {category ? 'Update Category' : 'Create Category'}
              </button>
            </div>

          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Main Page Component ──────────────────────────────────────────────────

export default function CategoryListPage() {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [search, setSearch] = useState('')
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined)

  const filtered = useMemo(
    () =>
      categories.filter((c) => {
        if (!search) return true
        const s = search.toLowerCase()
        return c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s)
      }),
    [categories, search]
  )

  function handleAdd() {
    setEditingCategory(undefined)
    setIsModalOpen(true)
  }

  function handleEdit(cat: Category) {
    setEditingCategory(cat)
    setIsModalOpen(true)
  }

  function handleSave(cat: Category) {
    if (editingCategory) {
      setCategories(categories.map((c) => (c.id === cat.id ? cat : c)))
    } else {
      setCategories([cat, ...categories])
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
            Categories
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Manage product categories and classifications.
          </p>
        </div>
        <button
          className="button-primary"
          onClick={handleAdd}
          style={{ height: 40, padding: '0 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus style={{ width: 16, height: 16 }} />
          New Category
        </button>
      </div>

      <CategoryFormModal
        open={isModalOpen}
        category={editingCategory}
        categories={categories}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSave}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Filter Bar ── */}
        <div className="panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--color-text-dim)' }}
            />
            <input
              className="form-input"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', height: 40, paddingLeft: 36, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-primary)', fontSize: 14 }}
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
                  <th>Category Name</th>
                  <th>Parent Category</th>
                  <th>Products</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cat) => {
                  const parentName = categories.find((c) => c.id === cat.parentCategoryId)?.name || '—'
                  return (
                    <tr key={cat.id}>
                      <td>
                        <span className="mono text-xs font-medium" style={{ color: 'var(--color-amber)' }}>
                          {cat.code}
                        </span>
                      </td>
                      <td className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {cat.name}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{parentName}</td>
                      <td className="mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{cat.itemCount}</td>
                      <td>
                        <StatusBadge status={cat.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <button
                          className="icon-button"
                          title="Edit category"
                          style={{ width: 28, height: 28 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(cat)
                          }}
                        >
                          <Pencil style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  )
}
