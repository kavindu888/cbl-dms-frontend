import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { Eye, Pencil, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import StatusBadge from '@components/ui/StatusBadge'
import { mockSuppliers } from '@data/mockPurchaseOrders'

const supplierSchema = z.object({
  code: z.string().min(1, 'Supplier code is required'),
  name: z.string().min(1, 'Supplier name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address'),
  address: z.string().min(1, 'Address is required'),
  isActive: z.boolean().default(true),
})

type SupplierFormValues = z.infer<typeof supplierSchema>

function SupplierFormModal({
  open,
  supplier,
  onClose,
  onSaved,
}: {
  open: boolean
  supplier?: any
  onClose: () => void
  onSaved: (supplier: any) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      code: '',
      name: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      isActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (supplier) {
        reset({
          code: supplier.code,
          name: supplier.name,
          contactName: supplier.contact,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.city, // Mocking address via city
          isActive: supplier.status === 'ACTIVE',
        })
      } else {
        reset({
          code: '',
          name: '',
          contactName: '',
          phone: '',
          email: '',
          address: '',
          isActive: true,
        })
      }
      
      // Auto-focus Supplier Code on open
      setTimeout(() => {
        const firstInput = document.querySelector<HTMLElement>('input[name="code"]')
        if (firstInput) firstInput.focus()
      }, 50)
    }
  }, [open, supplier, reset])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.closest('form')
      if (!form) return
      const elements = Array.from(
        form.querySelectorAll<HTMLElement>(
          'input, select, textarea, button[type="submit"]'
        )
      ).filter(
        (el) =>
          !el.hasAttribute('disabled') &&
          el.tabIndex !== -1 &&
          !el.hasAttribute('data-skip-focus')
      )
      const index = elements.indexOf(e.currentTarget as HTMLElement)
      if (index > -1 && index < elements.length - 1) {
        elements[index + 1].focus()
      } else if (index === elements.length - 1) {
        if (elements[index] instanceof HTMLButtonElement) {
          ;(elements[index] as HTMLButtonElement).click()
        }
      }
    }
  }

  async function onSubmit(values: SupplierFormValues) {
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 600))
    
    if (supplier) {
      const updatedSupplier = {
        ...supplier,
        ...values,
        status: values.isActive ? 'ACTIVE' : 'INACTIVE',
        contact: values.contactName,
        city: values.address.split(',').pop()?.trim() || values.address, // simple mockup
      }
      onSaved(updatedSupplier)
      toast.success(`Supplier ${values.name} updated successfully.`)
      onClose()
    } else {
      const newSupplier = {
        id: `sup_${Date.now()}`,
        ...values,
        status: values.isActive ? 'ACTIVE' : 'INACTIVE',
        contact: values.contactName,
        city: values.address.split(',').pop()?.trim() || values.address, // simple mockup
      }
      onSaved(newSupplier)
      toast.success(`Supplier ${values.name} created successfully.`)
      
      reset({
        code: '',
        name: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        isActive: true,
      })
      
      setTimeout(() => {
        const firstInput = document.querySelector<HTMLElement>('input[name="code"]')
        if (firstInput) firstInput.focus()
      }, 50)
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
            maxWidth: 580,
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
                {supplier ? 'Edit Supplier' : 'Create New Supplier'}
              </Dialog.Title>
              <Dialog.Description style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
                {supplier ? 'Update supplier details.' : 'Register a new vendor account into the system.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button aria-label="Close" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '0 32px 32px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Code & Name Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>SUPPLIER CODE</label>
                <input
                  className={`form-input ${errors.code ? 'error' : ''}`}
                  style={{ width: '100%', height: 44, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0 16px', color: 'var(--color-text-primary)', fontSize: 14, fontFamily: 'var(--font-mono)' }}
                  placeholder="SUP-001"
                  autoFocus
                  onKeyDown={handleKeyDown}
                  {...register('code')}
                />
                {errors.code && <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>{errors.code.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>COMPANY NAME</label>
                <input
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  style={{ width: '100%', height: 44, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0 16px', color: 'var(--color-text-primary)', fontSize: 14 }}
                  placeholder="CBL Foods International (Pvt) Ltd"
                  onKeyDown={handleKeyDown}
                  {...register('name')}
                />
                {errors.name && <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>{errors.name.message}</p>}
              </div>
            </div>

            {/* Contact Person */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>CONTACT PERSON</label>
              <input
                className={`form-input ${errors.contactName ? 'error' : ''}`}
                style={{ width: '100%', height: 44, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0 16px', color: 'var(--color-text-primary)', fontSize: 14 }}
                placeholder="Accounts Manager"
                onKeyDown={handleKeyDown}
                {...register('contactName')}
              />
              {errors.contactName && <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>{errors.contactName.message}</p>}
            </div>

            {/* Email & Phone Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>EMAIL</label>
                <input
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  type="email"
                  style={{ width: '100%', height: 44, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0 16px', color: 'var(--color-text-primary)', fontSize: 14 }}
                  placeholder="helpdesk.cbl@muncheelk.com"
                  onKeyDown={handleKeyDown}
                  {...register('email')}
                />
                {errors.email && <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>{errors.email.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>PHONE</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className={`form-input ${errors.phone ? 'error' : ''}`}
                    style={{ width: '100%', height: 44, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0 16px', color: 'var(--color-text-primary)', fontSize: 14 }}
                    placeholder="+94117878600"
                    onKeyDown={handleKeyDown}
                    {...register('phone')}
                  />
                </div>
                {errors.phone && <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>{errors.phone.message}</p>}
              </div>
            </div>

            {/* Address */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>ADDRESS</label>
              <textarea
                className={`form-input ${errors.address ? 'error' : ''}`}
                style={{ width: '100%', minHeight: 80, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '12px 16px', color: 'var(--color-text-primary)', fontSize: 14, resize: 'vertical' }}
                placeholder="Habarakada Road, Ranala, Sri Lanka"
                onKeyDown={handleKeyDown}
                {...register('address')}
              />
              {errors.address && <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>{errors.address.message}</p>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <input
                type="checkbox"
                id="isActive"
                onKeyDown={handleKeyDown}
                {...register('isActive')}
                style={{ width: 16, height: 16, accentColor: '#F4A623', cursor: 'pointer' }}
              />
              <label htmlFor="isActive" style={{ fontSize: 14, color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                Supplier is Active
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <button
                type="button"
                className="button-secondary"
                onClick={onClose}
                data-skip-focus="true"
                style={{ height: 40, padding: '0 24px', fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button-primary"
                onKeyDown={handleKeyDown}
                style={{ height: 40, padding: '0 24px', fontSize: 14 }}
              >
                Save Supplier
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default function SupplierListPage() {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any>(null)
  const [suppliers, setSuppliers] = useState(mockSuppliers)

  const filtered = useMemo(
    () =>
      suppliers.filter(
        (s) =>
          !search ||
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.code.toLowerCase().includes(search.toLowerCase())
      ),
    [search, suppliers]
  )

  const handleSupplierSaved = (savedSupplier: any) => {
    const isExisting = suppliers.some(s => s.id === savedSupplier.id)
    if (isExisting) {
      setSuppliers(suppliers.map(s => s.id === savedSupplier.id ? savedSupplier : s))
    } else {
      setSuppliers([...suppliers, savedSupplier])
    }
  }

  const openNewSupplierModal = () => {
    setEditingSupplier(null)
    setIsModalOpen(true)
  }

  const openEditSupplierModal = (supplier: any) => {
    setEditingSupplier(supplier)
    setIsModalOpen(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
            Suppliers
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Manage supplier profiles, contact details, and performance.
          </p>
        </div>
        <button
          className="button-primary"
          onClick={openNewSupplierModal}
          style={{ height: 40, padding: '0 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus style={{ width: 16, height: 16 }} />
          New Supplier
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Filter Bar ── */}
        <div className="panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--color-text-dim)' }}
            />
            <input
              className="form-input"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', height: 40, paddingLeft: 36, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-primary)', fontSize: 14 }}
            />
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Supplier Name</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="mono text-xs font-medium" style={{ color: 'var(--color-amber)' }}>
                        {s.code}
                      </span>
                    </td>
                    <td className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {s.name}
                    </td>
                    <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{s.contact}</td>
                    <td className="text-sm" style={{ color: 'var(--color-blue)' }}>{s.email}</td>
                    <td className="mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.phone}</td>
                    <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{s.city}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <button
                        className="icon-button"
                        title="Edit supplier"
                        style={{ width: 28, height: 28 }}
                        onClick={() => openEditSupplierModal(s)}
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

      <SupplierFormModal
        open={isModalOpen}
        supplier={editingSupplier}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSupplierSaved}
      />
    </div>
  )
}
