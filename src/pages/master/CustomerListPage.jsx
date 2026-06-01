import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { Pencil, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import StatusBadge from '@components/ui/StatusBadge'
const CUSTOMER_GROUPS = [
  { id: 'cg_01HX001', name: 'Retail' },
  { id: 'cg_01HX002', name: 'Wholesale' },
  { id: 'cg_01HX003', name: 'Modern Trade' },
]
const TERRITORIES = [
  { id: 'ter_02HX001', name: 'Kandy' },
  { id: 'ter_02HX002', name: 'Colombo North' },
  { id: 'ter_02HX003', name: 'Matale' },
]
const ROUTES = [
  { id: 'rt_02HX001', name: 'KDY-01' },
  { id: 'rt_02HX002', name: 'KDY-02' },
  { id: 'rt_02HX003', name: 'CMB-01' },
]
const initialCustomers = [
  {
    id: 'cust-001',
    code: 'CUST-0046',
    name: 'Fresh Mart Kandy',
    contactName: 'Mrs. Silva',
    phone: '+94812345678',
    email: 'freshmart@gmail.com',
    addressLine1: 'No. 12, Peradeniya Road',
    addressLine2: '',
    city: 'Kandy',
    taxId: 'VAT987654321',
    customerGroupId: 'cg_01HX001',
    territoryId: 'ter_02HX001',
    routeId: 'rt_02HX001',
    creditDays: 14,
    creditLimit: 200000,
    isActive: true,
  },
  {
    id: 'cust-002',
    code: 'CUST-0047',
    name: 'City Super Colombo',
    contactName: 'Mr. Fernando',
    phone: '+94112345679',
    email: 'citysuper@gmail.com',
    addressLine1: 'No. 20, Galle Road',
    addressLine2: 'Colombo 03',
    city: 'Colombo',
    taxId: 'VAT123450987',
    customerGroupId: 'cg_01HX003',
    territoryId: 'ter_02HX002',
    routeId: 'rt_02HX003',
    creditDays: 21,
    creditLimit: 350000,
    isActive: true,
  },
  {
    id: 'cust-003',
    code: 'CUST-0048',
    name: 'Peradeniya Mini Mart',
    contactName: 'Ms. Nadeesha',
    phone: '+94812345999',
    email: 'peradeniya.minimart@gmail.com',
    addressLine1: 'Peradeniya Town',
    addressLine2: '',
    city: 'Kandy',
    taxId: '',
    customerGroupId: 'cg_01HX002',
    territoryId: 'ter_02HX001',
    routeId: 'rt_02HX002',
    creditDays: 7,
    creditLimit: 120000,
    isActive: false,
  },
]
const customerSchema = z.object({
  code: z.string().min(1, 'Customer code is required'),
  name: z.string().min(1, 'Customer name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address'),
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  taxId: z.string().optional(),
  customerGroupId: z.string().min(1, 'Customer group is required'),
  territoryId: z.string().min(1, 'Territory is required'),
  routeId: z.string().min(1, 'Route is required'),
  creditDays: z.coerce.number().min(0, 'Credit days must be 0 or more'),
  creditLimit: z.coerce.number().min(0, 'Credit limit must be 0 or more'),
  isActive: z.boolean().default(true),
})
function CustomerFormModal({ open, customer, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      code: '',
      name: '',
      contactName: '',
      phone: '',
      email: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      taxId: '',
      customerGroupId: '',
      territoryId: '',
      routeId: '',
      creditDays: 14,
      creditLimit: 0,
      isActive: true,
    },
  })
  function handleEnterToNext(event) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return
    }
    event.preventDefault()
    const form = event.currentTarget.form
    if (!form) return
    const focusable = Array.from(
      form.querySelectorAll(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      )
    ).filter((element) => element.tabIndex !== -1)
    const index = focusable.indexOf(event.currentTarget)
    if (index > -1 && index < focusable.length - 1) {
      focusable[index + 1].focus()
      return
    }
    const submitButton = form.querySelector('#save-customer-button')
    submitButton?.focus()
  }
  useEffect(() => {
    if (!open) return
    if (customer) {
      reset({
        code: customer.code,
        name: customer.name,
        contactName: customer.contactName,
        phone: customer.phone,
        email: customer.email,
        addressLine1: customer.addressLine1,
        addressLine2: customer.addressLine2,
        city: customer.city,
        taxId: customer.taxId,
        customerGroupId: customer.customerGroupId,
        territoryId: customer.territoryId,
        routeId: customer.routeId,
        creditDays: customer.creditDays,
        creditLimit: customer.creditLimit,
        isActive: customer.isActive,
      })
    } else {
      reset({
        code: '',
        name: '',
        contactName: '',
        phone: '',
        email: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        taxId: '',
        customerGroupId: '',
        territoryId: '',
        routeId: '',
        creditDays: 14,
        creditLimit: 0,
        isActive: true,
      })
    }
    setTimeout(() => {
      const codeInput = document.querySelector('input[name="code"]')
      codeInput?.focus()
    }, 50)
  }, [open, customer, reset])
  async function onSubmit(values) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    const formatted = {
      id: customer?.id ?? `cust_${Date.now()}`,
      code: values.code,
      name: values.name,
      contactName: values.contactName,
      phone: values.phone,
      email: values.email,
      addressLine1: values.addressLine1,
      addressLine2: values.addressLine2 ?? '',
      city: values.city,
      taxId: values.taxId ?? '',
      customerGroupId: values.customerGroupId,
      territoryId: values.territoryId,
      routeId: values.routeId,
      creditDays: values.creditDays,
      creditLimit: values.creditLimit,
      isActive: values.isActive,
    }
    onSaved(formatted)
    toast.success(`Customer ${values.name} saved successfully.`)
    if (customer) {
      onClose()
      return
    }
    reset({
      code: '',
      name: '',
      contactName: '',
      phone: '',
      email: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      taxId: '',
      customerGroupId: '',
      territoryId: '',
      routeId: '',
      creditDays: 14,
      creditLimit: 0,
      isActive: true,
    })
    setTimeout(() => {
      document.querySelector('input[name="code"]')?.focus()
    }, 50)
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
            maxWidth: 940,
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            maxHeight: '92vh',
            overflowY: 'auto',
          }}
        >
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
                {customer ? 'Edit Customer' : 'Create New Customer'}
              </Dialog.Title>
              <Dialog.Description
                style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}
              >
                {customer
                  ? 'Update customer master details, routing, and credit terms.'
                  : 'Register a new customer into the master file.'}
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

          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{
              padding: '0 32px 32px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16 }}>
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
                  CUSTOMER CODE
                </label>
                <input
                  className={`form-input ${errors.code ? 'error' : ''}`}
                  style={{
                    width: '100%',
                    height: 44,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '0 16px',
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                    fontFamily: 'var(--font-mono)',
                  }}
                  placeholder="CUST-0046"
                  autoFocus
                  onKeyDown={handleEnterToNext}
                  {...register('code')}
                />
              </div>

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
                  CUSTOMER NAME
                </label>
                <input
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  style={{
                    width: '100%',
                    height: 44,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '0 16px',
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                  }}
                  placeholder="Fresh Mart Kandy"
                  onKeyDown={handleEnterToNext}
                  {...register('name')}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
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
                  CONTACT NAME
                </label>
                <input
                  className={`form-input ${errors.contactName ? 'error' : ''}`}
                  style={{
                    width: '100%',
                    height: 44,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '0 16px',
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                  }}
                  placeholder="Mrs. Silva"
                  onKeyDown={handleEnterToNext}
                  {...register('contactName')}
                />
              </div>

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
                  PHONE
                </label>
                <input
                  className={`form-input ${errors.phone ? 'error' : ''}`}
                  style={{
                    width: '100%',
                    height: 44,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '0 16px',
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                  }}
                  placeholder="+94812345678"
                  onKeyDown={handleEnterToNext}
                  {...register('phone')}
                />
              </div>

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
                  EMAIL
                </label>
                <input
                  type="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  style={{
                    width: '100%',
                    height: 44,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '0 16px',
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                  }}
                  placeholder="freshmart@gmail.com"
                  onKeyDown={handleEnterToNext}
                  {...register('email')}
                />
              </div>
            </div>

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
                ADDRESS LINE 1
              </label>
              <input
                className={`form-input ${errors.addressLine1 ? 'error' : ''}`}
                style={{
                  width: '100%',
                  height: 44,
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  padding: '0 16px',
                  color: 'var(--color-text-primary)',
                  fontSize: 14,
                }}
                placeholder="No. 12, Peradeniya Road"
                onKeyDown={handleEnterToNext}
                {...register('addressLine1')}
              />
            </div>

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
                ADDRESS LINE 2
              </label>
              <input
                className="form-input"
                style={{
                  width: '100%',
                  height: 44,
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  padding: '0 16px',
                  color: 'var(--color-text-primary)',
                  fontSize: 14,
                }}
                placeholder="Optional"
                onKeyDown={handleEnterToNext}
                {...register('addressLine2')}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
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
                  CITY
                </label>
                <input
                  className={`form-input ${errors.city ? 'error' : ''}`}
                  style={{
                    width: '100%',
                    height: 44,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '0 16px',
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                  }}
                  placeholder="Kandy"
                  onKeyDown={handleEnterToNext}
                  {...register('city')}
                />
              </div>

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
                  TAX ID
                </label>
                <input
                  className="form-input"
                  style={{
                    width: '100%',
                    height: 44,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '0 16px',
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                  }}
                  placeholder="VAT987654321"
                  onKeyDown={handleEnterToNext}
                  {...register('taxId')}
                />
              </div>

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
                  CUSTOMER GROUP
                </label>
                <select
                  className={`form-input ${errors.customerGroupId ? 'error' : ''}`}
                  style={{
                    width: '100%',
                    height: 44,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '0 16px',
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                  }}
                  onKeyDown={handleEnterToNext}
                  {...register('customerGroupId')}
                >
                  <option value="">Select group</option>
                  {CUSTOMER_GROUPS.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

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
                  TERRITORY
                </label>
                <select
                  className={`form-input ${errors.territoryId ? 'error' : ''}`}
                  style={{
                    width: '100%',
                    height: 44,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '0 16px',
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                  }}
                  onKeyDown={handleEnterToNext}
                  {...register('territoryId')}
                >
                  <option value="">Select territory</option>
                  {TERRITORIES.map((territory) => (
                    <option key={territory.id} value={territory.id}>
                      {territory.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
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
                  ROUTE
                </label>
                <select
                  className={`form-input ${errors.routeId ? 'error' : ''}`}
                  style={{
                    width: '100%',
                    height: 44,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '0 16px',
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                  }}
                  onKeyDown={handleEnterToNext}
                  {...register('routeId')}
                >
                  <option value="">Select route</option>
                  {ROUTES.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name}
                    </option>
                  ))}
                </select>
              </div>

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
                  CREDIT DAYS
                </label>
                <input
                  type="number"
                  className={`form-input ${errors.creditDays ? 'error' : ''}`}
                  style={{
                    width: '100%',
                    height: 44,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '0 16px',
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                  }}
                  onKeyDown={handleEnterToNext}
                  {...register('creditDays')}
                />
              </div>

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
                  CREDIT LIMIT
                </label>
                <input
                  type="number"
                  step="0.01"
                  className={`form-input ${errors.creditLimit ? 'error' : ''}`}
                  style={{
                    width: '100%',
                    height: 44,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '0 16px',
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                  }}
                  onKeyDown={handleEnterToNext}
                  {...register('creditLimit')}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 26 }}>
                <input
                  type="checkbox"
                  id="customer-is-active"
                  {...register('isActive')}
                  style={{ width: 16, height: 16, accentColor: '#F4A623', cursor: 'pointer' }}
                />
                <label
                  htmlFor="customer-is-active"
                  style={{ fontSize: 14, color: 'var(--color-text-primary)', cursor: 'pointer' }}
                >
                  Customer is Active
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                className="button-secondary"
                onClick={onClose}
                style={{ height: 40, padding: '0 24px', fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button-primary"
                id="save-customer-button"
                style={{ height: 40, padding: '0 24px', fontSize: 14 }}
              >
                Save Customer
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
export default function CustomerListPage() {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(undefined)
  const [customers, setCustomers] = useState(initialCustomers)
  const filtered = useMemo(
    () =>
      customers.filter((customer) => {
        if (!search) return true
        const haystack = [
          customer.code,
          customer.name,
          customer.contactName,
          customer.phone,
          customer.email,
          customer.addressLine1,
          customer.addressLine2,
          customer.city,
          customer.taxId,
          customer.customerGroupId,
          customer.territoryId,
          customer.routeId,
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(search.toLowerCase())
      }),
    [customers, search]
  )
  function handleCustomerSaved(savedCustomer) {
    const exists = customers.some((customer) => customer.id === savedCustomer.id)
    if (exists) {
      setCustomers(
        customers.map((customer) => (customer.id === savedCustomer.id ? savedCustomer : customer))
      )
    } else {
      setCustomers([savedCustomer, ...customers])
    }
  }
  function openNewCustomerModal() {
    setEditingCustomer(undefined)
    setIsModalOpen(true)
  }
  function openEditCustomerModal(customer) {
    setEditingCustomer(customer)
    setIsModalOpen(true)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
            Customers
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Manage customer master records, routes, territories, and credit terms.
          </p>
        </div>
        <button
          className="button-primary"
          onClick={openNewCustomerModal}
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
          New Customer
        </button>
      </div>

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
            placeholder="Search customers..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Customer Name</th>
                <th>Contact</th>
                <th>City</th>
                <th>Group</th>
                <th>Territory</th>
                <th>Route</th>
                <th>Credit Days</th>
                <th>Credit Limit</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <span
                      className="mono text-xs font-medium"
                      style={{ color: 'var(--color-amber)' }}
                    >
                      {customer.code}
                    </span>
                  </td>
                  <td
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {customer.name}
                  </td>
                  <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ color: 'var(--color-text-primary)' }}>
                        {customer.contactName}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                        {customer.phone}
                      </span>
                    </div>
                  </td>
                  <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {customer.city}
                  </td>
                  <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {CUSTOMER_GROUPS.find((group) => group.id === customer.customerGroupId)?.name ??
                      customer.customerGroupId}
                  </td>
                  <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {TERRITORIES.find((territory) => territory.id === customer.territoryId)?.name ??
                      customer.territoryId}
                  </td>
                  <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {ROUTES.find((route) => route.id === customer.routeId)?.name ??
                      customer.routeId}
                  </td>
                  <td className="mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {customer.creditDays}
                  </td>
                  <td className="mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {customer.creditLimit.toLocaleString('en-LK', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td>
                    <StatusBadge status={customer.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                    <button
                      className="icon-button"
                      title="Edit customer"
                      style={{ width: 28, height: 28 }}
                      onClick={() => openEditCustomerModal(customer)}
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

      <CustomerFormModal
        open={isModalOpen}
        customer={editingCustomer}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleCustomerSaved}
      />
    </div>
  )
}
