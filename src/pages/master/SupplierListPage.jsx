import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import StatusBadge from '@components/ui/StatusBadge'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Mail, Phone, UserRound, UsersRound } from 'lucide-react'
const initialSuppliers = [
  {
    id: 'sup-001',
    code: 'SUP-001',
    name: 'CBL Foods International (Pvt) Ltd',
    phone: '+94117878600',
    email: 'helpdesk.cbl@muncheelk.com',
    address: 'Habarakada Road, Ranala, Sri Lanka',
    vatRegNo: 'VAT-1122334455',
    fax: '+94 11 787 8601',
    businessRegNo: 'BRN-2233445566',
    isActive: true,
    contacts: [
      {
        name: 'D. Wickramasinghe',
        designation: 'Procurement Manager',
        mobileNo: '+94 77 123 4567',
        email: 'd.wickramasinghe@cblfoods.lk',
        isActive: true,
      },
      {
        name: 'A. Perera',
        designation: 'Finance Executive',
        mobileNo: '+94 71 765 4321',
        email: 'a.perera@cblfoods.lk',
        isActive: false,
      },
    ],
  },
  {
    id: 'sup-002',
    code: 'SUP-002',
    name: 'Hemas Consumer Brands',
    phone: '+94 11 345 6789',
    email: 'supply@hemas.com',
    address: 'Colombo 02, Sri Lanka',
    vatRegNo: 'VAT-6677889900',
    fax: '+94 11 345 6790',
    businessRegNo: 'BRN-7788990011',
    isActive: true,
    contacts: [
      {
        name: 'A. Jayawardena',
        designation: 'Supply Chain Lead',
        mobileNo: '+94 77 222 3344',
        email: 'a.jayawardena@hemas.com',
        isActive: true,
      },
    ],
  },
  {
    id: 'sup-003',
    code: 'SUP-003',
    name: 'Maliban Biscuit Mfg',
    phone: '+94 11 456 7890',
    email: 'orders@maliban.lk',
    address: 'Ratmalana, Sri Lanka',
    vatRegNo: 'VAT-8899001122',
    fax: '+94 11 456 7891',
    businessRegNo: 'BRN-9900112233',
    isActive: true,
    contacts: [
      {
        name: 'P. Gunaratne',
        designation: 'Sales Coordinator',
        mobileNo: '+94 77 444 5566',
        email: 'p.gunaratne@maliban.lk',
        isActive: true,
      },
    ],
  },
]
const contactSchema = z.object({
  name: z.string().min(1, 'Contact name is required'),
  designation: z.string().min(1, 'Designation is required'),
  mobileNo: z.string().min(1, 'Mobile number is required'),
  email: z.string().email('Invalid contact email'),
  isActive: z.boolean().default(false),
})
const supplierSchema = z.object({
  code: z.string().min(1, 'Supplier code is required'),
  name: z.string().min(1, 'Supplier name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address'),
  address: z.string().min(1, 'Address is required'),
  vatRegNo: z.string().optional(),
  fax: z.string().optional(),
  businessRegNo: z.string().optional(),
  isActive: z.boolean().default(true),
  contacts: z.array(contactSchema).default([]),
})
function emptyContact() {
  return {
    name: '',
    designation: '',
    mobileNo: '',
    email: '',
    isActive: false,
  }
}
const contactFieldOrder = ['name', 'designation', 'mobileNo', 'email', 'isActive']
function getSupplierPrimaryContact(contacts) {
  return contacts.find((contact) => contact.isActive) ?? contacts[0]
}
function SupplierContactsCell({ contacts }) {
  const primaryContact = getSupplierPrimaryContact(contacts)
  if (!primaryContact) {
    return <span style={{ color: 'var(--color-text-dim)' }}>No contacts</span>
  }
  const contactCount = contacts.length
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 2, paddingBottom: 2 }}
    >
      <span style={{ color: 'var(--color-text-primary)' }}>{primaryContact.name}</span>
      <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
        {primaryContact.designation}
      </span>

      <div style={{ marginTop: 2 }}>
        <Tooltip.Root delayDuration={120}>
          <Tooltip.Trigger asChild>
            <button
              type="button"
              aria-label={`View ${contactCount} supplier contact${contactCount > 1 ? 's' : ''}`}
              className="button-secondary"
              style={{
                height: 24,
                padding: '0 10px',
                fontSize: 11,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                width: 'fit-content',
              }}
            >
              <UsersRound style={{ width: 12, height: 12 }} />
              {contactCount} contact{contactCount > 1 ? 's' : ''}
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="bottom"
              sideOffset={10}
              align="start"
              collisionPadding={12}
              className="shadow-2xl"
              style={{
                width: 320,
                maxWidth: 'calc(100vw - 24px)',
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                padding: 14,
                color: 'var(--color-text-primary)',
                boxShadow: '0 18px 40px rgba(0, 0, 0, 0.45)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Contact List
                  </p>
                  <p style={{ marginTop: 2, fontSize: 12, color: 'var(--color-text-dim)' }}>
                    {contactCount} contact{contactCount > 1 ? 's' : ''} available
                  </p>
                </div>
                <span
                  style={{
                    height: 24,
                    padding: '0 8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    borderRadius: 999,
                    background: 'rgba(244, 166, 35, 0.12)',
                    color: 'var(--color-amber)',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {primaryContact.isActive ? 'Active contact' : 'Preview'}
                </span>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  maxHeight: 260,
                  overflowY: 'auto',
                }}
              >
                {contacts.map((contact, index) => (
                  <div
                    key={`${contact.name}-${contact.email}-${index}`}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                      padding: 12,
                      background: 'rgba(255, 255, 255, 0.02)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <UserRound
                            style={{
                              width: 14,
                              height: 14,
                              color: 'var(--color-amber)',
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            {contact.name}
                          </span>
                          {contact.isActive ? (
                            <span
                              style={{
                                height: 20,
                                padding: '0 8px',
                                borderRadius: 999,
                                background: 'rgba(68, 198, 112, 0.12)',
                                color: '#5DD08C',
                                fontSize: 11,
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              Active
                            </span>
                          ) : null}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
                          {contact.designation}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 12,
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <Phone
                          style={{
                            width: 13,
                            height: 13,
                            color: 'var(--color-text-dim)',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {contact.mobileNo}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 12,
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <Mail
                          style={{
                            width: 13,
                            height: 13,
                            color: 'var(--color-text-dim)',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {contact.email}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Tooltip.Arrow
                width={14}
                height={8}
                style={{
                  fill: 'var(--color-bg-surface)',
                  stroke: 'var(--color-border)',
                  strokeWidth: 1,
                }}
              />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
    </div>
  )
}
function SupplierFormModal({ open, supplier, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      code: '',
      name: '',
      phone: '',
      email: '',
      address: '',
      vatRegNo: '',
      fax: '',
      businessRegNo: '',
      isActive: true,
      contacts: [],
    },
  })
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'contacts',
  })
  function handlePrimaryFieldKeyDown(event) {
    const currentId = event.currentTarget.id
    const isFinalPrimaryField = currentId === 'supplier-business-reg-no'
    if (event.key === 'Tab' && isFinalPrimaryField && !event.shiftKey) {
      event.preventDefault()
      document.getElementById('save-supplier-button')?.focus()
      return
    }
    if (event.key !== 'Enter' || event.shiftKey) {
      return
    }
    const fieldOrder = [
      'supplier-code',
      'supplier-name',
      'supplier-phone',
      'supplier-email',
      'supplier-address',
      'supplier-vat-reg-no',
      'supplier-fax',
      'supplier-business-reg-no',
    ]
    const currentIndex = fieldOrder.indexOf(currentId)
    if (currentIndex === -1) {
      return
    }
    event.preventDefault()
    const nextId = fieldOrder[currentIndex + 1]
    if (nextId) {
      document.getElementById(nextId)?.focus()
      return
    }
    document.getElementById('save-supplier-button')?.focus()
  }
  function focusContactField(index, field) {
    document.getElementById(`contact-${index}-${field}`)?.focus()
  }
  function handleContactFieldKeyDown(index, field, event) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return
    }
    event.preventDefault()
    const currentIndex = contactFieldOrder.indexOf(field)
    const nextField = contactFieldOrder[currentIndex + 1]
    if (nextField) {
      focusContactField(index, nextField)
      return
    }
    const nextContactName = document.getElementById(`contact-${index + 1}-name`)
    if (nextContactName) {
      nextContactName.focus()
      return
    }
    document.getElementById('save-supplier-button')?.focus()
  }
  useEffect(() => {
    if (!open) return
    if (supplier) {
      reset({
        code: supplier.code,
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        vatRegNo: supplier.vatRegNo,
        fax: supplier.fax,
        businessRegNo: supplier.businessRegNo,
        isActive: supplier.isActive,
        contacts: supplier.contacts.length ? supplier.contacts : [],
      })
    } else {
      reset({
        code: '',
        name: '',
        phone: '',
        email: '',
        address: '',
        vatRegNo: '',
        fax: '',
        businessRegNo: '',
        isActive: true,
        contacts: [],
      })
    }
    setTimeout(() => {
      const firstInput = document.querySelector('input[name="code"]')
      firstInput?.focus()
    }, 50)
  }, [open, supplier, reset])
  async function onSubmit(values) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    const formatted = {
      id: supplier?.id ?? `sup_${Date.now()}`,
      code: values.code,
      name: values.name,
      phone: values.phone,
      email: values.email,
      address: values.address,
      vatRegNo: values.vatRegNo ?? '',
      fax: values.fax ?? '',
      businessRegNo: values.businessRegNo ?? '',
      isActive: values.isActive,
      contacts: values.contacts,
    }
    onSaved(formatted)
    toast.success(`Supplier ${values.name} saved successfully.`)
    if (supplier) {
      onClose()
      return
    }
    reset({
      code: '',
      name: '',
      phone: '',
      email: '',
      address: '',
      vatRegNo: '',
      fax: '',
      businessRegNo: '',
      isActive: true,
      contacts: [],
    })
    setTimeout(() => {
      const codeInput = document.querySelector('input[name="code"]')
      codeInput?.focus()
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
            maxWidth: 900,
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
                {supplier ? 'Edit Supplier' : 'Create New Supplier'}
              </Dialog.Title>
              <Dialog.Description
                style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}
              >
                {supplier
                  ? 'Update supplier details, tax data, and contact records.'
                  : 'Register a new supplier account into the system.'}
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
                  SUPPLIER CODE
                </label>
                <input
                  id="supplier-code"
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
                  placeholder="SUP-001"
                  autoFocus
                  onKeyDown={handlePrimaryFieldKeyDown}
                  {...register('code')}
                />
                {errors.code && (
                  <p
                    className="form-error mt-1"
                    style={{ fontSize: 12, color: 'var(--color-red)' }}
                  >
                    {errors.code.message}
                  </p>
                )}
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
                  COMPANY NAME
                </label>
                <input
                  id="supplier-name"
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
                  placeholder="CBL Foods International (Pvt) Ltd"
                  onKeyDown={handlePrimaryFieldKeyDown}
                  {...register('name')}
                />
                {errors.name && (
                  <p
                    className="form-error mt-1"
                    style={{ fontSize: 12, color: 'var(--color-red)' }}
                  >
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                  id="supplier-phone"
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
                  placeholder="+94117878600"
                  onKeyDown={handlePrimaryFieldKeyDown}
                  {...register('phone')}
                />
                {errors.phone && (
                  <p
                    className="form-error mt-1"
                    style={{ fontSize: 12, color: 'var(--color-red)' }}
                  >
                    {errors.phone.message}
                  </p>
                )}
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
                  id="supplier-email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  type="email"
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
                  placeholder="helpdesk.cbl@muncheelk.com"
                  onKeyDown={handlePrimaryFieldKeyDown}
                  {...register('email')}
                />
                {errors.email && (
                  <p
                    className="form-error mt-1"
                    style={{ fontSize: 12, color: 'var(--color-red)' }}
                  >
                    {errors.email.message}
                  </p>
                )}
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
                ADDRESS
              </label>
              <textarea
                id="supplier-address"
                className={`form-input ${errors.address ? 'error' : ''}`}
                style={{
                  width: '100%',
                  minHeight: 80,
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  padding: '12px 16px',
                  color: 'var(--color-text-primary)',
                  fontSize: 14,
                  resize: 'vertical',
                }}
                placeholder="Habarakada Road, Ranala, Sri Lanka"
                onKeyDown={handlePrimaryFieldKeyDown}
                {...register('address')}
              />
              {errors.address && (
                <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>
                  {errors.address.message}
                </p>
              )}
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
                  VAT REG NO
                </label>
                <input
                  id="supplier-vat-reg-no"
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
                  placeholder="VAT-1122334455"
                  onKeyDown={handlePrimaryFieldKeyDown}
                  {...register('vatRegNo')}
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
                  FAX
                </label>
                <input
                  id="supplier-fax"
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
                  placeholder="+94 11 787 8601"
                  onKeyDown={handlePrimaryFieldKeyDown}
                  {...register('fax')}
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
                  BUSINESS REG NO
                </label>
                <input
                  id="supplier-business-reg-no"
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
                  placeholder="BRN-2233445566"
                  onKeyDown={handlePrimaryFieldKeyDown}
                  {...register('businessRegNo')}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <input
                type="checkbox"
                id="isActive"
                {...register('isActive')}
                style={{ width: 16, height: 16, accentColor: '#F4A623', cursor: 'pointer' }}
              />
              <label
                htmlFor="isActive"
                style={{ fontSize: 14, color: 'var(--color-text-primary)', cursor: 'pointer' }}
              >
                Supplier is Active
              </label>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Contact
                </p>
                <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-dim)' }}>
                  Add one or more contact records. Tick the active contact for matching.
                </p>
              </div>
              <button
                type="button"
                className="button-secondary"
                onClick={() => append(emptyContact())}
                style={{
                  height: 40,
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Plus style={{ width: 16, height: 16 }} />
                Add Contact
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {fields.length ? (
                fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="panel"
                    style={{
                      padding: 16,
                      display: 'grid',
                      gridTemplateColumns: '1.3fr 1fr 1fr 1.2fr auto',
                      gap: 12,
                      alignItems: 'end',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.12em',
                          color: 'var(--color-text-dim)',
                          marginBottom: 6,
                          textTransform: 'uppercase',
                        }}
                      >
                        Name
                      </label>
                      <input
                        id={`contact-${index}-name`}
                        className={`form-input ${errors.contacts?.[index]?.name ? 'error' : ''}`}
                        placeholder="Contact person"
                        style={{ width: '100%', height: 40, background: 'rgba(0,0,0,0.15)' }}
                        onKeyDown={(event) => handleContactFieldKeyDown(index, 'name', event)}
                        {...register(`contacts.${index}.name`)}
                      />
                      {errors.contacts?.[index]?.name && (
                        <p style={{ fontSize: 12, color: 'var(--color-red)', marginTop: 4 }}>
                          {errors.contacts[index]?.name?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.12em',
                          color: 'var(--color-text-dim)',
                          marginBottom: 6,
                          textTransform: 'uppercase',
                        }}
                      >
                        Designation
                      </label>
                      <input
                        id={`contact-${index}-designation`}
                        className={`form-input ${errors.contacts?.[index]?.designation ? 'error' : ''}`}
                        placeholder="Manager"
                        style={{ width: '100%', height: 40, background: 'rgba(0,0,0,0.15)' }}
                        onKeyDown={(event) =>
                          handleContactFieldKeyDown(index, 'designation', event)
                        }
                        {...register(`contacts.${index}.designation`)}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.12em',
                          color: 'var(--color-text-dim)',
                          marginBottom: 6,
                          textTransform: 'uppercase',
                        }}
                      >
                        MobileNo
                      </label>
                      <input
                        id={`contact-${index}-mobileNo`}
                        className={`form-input ${errors.contacts?.[index]?.mobileNo ? 'error' : ''}`}
                        placeholder="+94 77 000 0000"
                        style={{ width: '100%', height: 40, background: 'rgba(0,0,0,0.15)' }}
                        onKeyDown={(event) => handleContactFieldKeyDown(index, 'mobileNo', event)}
                        {...register(`contacts.${index}.mobileNo`)}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.12em',
                          color: 'var(--color-text-dim)',
                          marginBottom: 6,
                          textTransform: 'uppercase',
                        }}
                      >
                        Email
                      </label>
                      <input
                        id={`contact-${index}-email`}
                        type="email"
                        className={`form-input ${errors.contacts?.[index]?.email ? 'error' : ''}`}
                        placeholder="person@supplier.lk"
                        style={{ width: '100%', height: 40, background: 'rgba(0,0,0,0.15)' }}
                        onKeyDown={(event) => handleContactFieldKeyDown(index, 'email', event)}
                        {...register(`contacts.${index}.email`)}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        justifyContent: 'flex-end',
                      }}
                    >
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <input
                          id={`contact-${index}-isActive`}
                          type="checkbox"
                          onKeyDown={(event) => handleContactFieldKeyDown(index, 'isActive', event)}
                          {...register(`contacts.${index}.isActive`)}
                          style={{
                            width: 16,
                            height: 16,
                            accentColor: '#F4A623',
                            cursor: 'pointer',
                          }}
                        />
                        <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                          Active
                        </span>
                      </label>
                      {fields.length > 1 ? (
                        <button
                          type="button"
                          aria-label={`Remove contact ${index + 1}`}
                          className="icon-button"
                          onClick={() => remove(index)}
                          style={{ width: 32, height: 32 }}
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className="panel"
                  style={{ padding: 16, color: 'var(--color-text-dim)', fontSize: 13 }}
                >
                  No contacts added yet. Use Add Contact if needed.
                </div>
              )}
              {errors.contacts && typeof errors.contacts.message === 'string' ? (
                <p style={{ fontSize: 12, color: 'var(--color-red)' }}>{errors.contacts.message}</p>
              ) : null}
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
                id="save-supplier-button"
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
  const [editingSupplier, setEditingSupplier] = useState(undefined)
  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const filtered = useMemo(
    () =>
      suppliers.filter((supplier) => {
        if (!search) return true
        const haystack = [
          supplier.code,
          supplier.name,
          supplier.phone,
          supplier.email,
          supplier.address,
          supplier.vatRegNo,
          supplier.businessRegNo,
          supplier.contacts
            .map(
              (contact) =>
                `${contact.name} ${contact.designation} ${contact.mobileNo} ${contact.email}`
            )
            .join(' '),
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(search.toLowerCase())
      }),
    [search, suppliers]
  )
  function handleSupplierSaved(savedSupplier) {
    const exists = suppliers.some((supplier) => supplier.id === savedSupplier.id)
    if (exists) {
      setSuppliers(
        suppliers.map((supplier) => (supplier.id === savedSupplier.id ? savedSupplier : supplier))
      )
    } else {
      setSuppliers([savedSupplier, ...suppliers])
    }
  }
  function openNewSupplierModal() {
    setEditingSupplier(undefined)
    setIsModalOpen(true)
  }
  function openEditSupplierModal(supplier) {
    setEditingSupplier(supplier)
    setIsModalOpen(true)
  }
  return (
    <Tooltip.Provider delayDuration={120} skipDelayDuration={0}>
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
              Suppliers
            </h1>
            <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
              Manage supplier profiles, tax details, and multiple contacts.
            </p>
          </div>
          <button
            className="button-primary"
            onClick={openNewSupplierModal}
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
            New Supplier
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
              placeholder="Search suppliers..."
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
                  <th>Supplier Name</th>
                  <th>Main Contact</th>
                  <th>VAT Reg No</th>
                  <th>Business Reg No</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((supplier) => {
                  return (
                    <tr key={supplier.id}>
                      <td>
                        <span
                          className="mono text-xs font-medium"
                          style={{ color: 'var(--color-amber)' }}
                        >
                          {supplier.code}
                        </span>
                      </td>
                      <td
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {supplier.name}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        <SupplierContactsCell contacts={supplier.contacts} />
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {supplier.vatRegNo || '—'}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {supplier.businessRegNo || '—'}
                      </td>
                      <td className="mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {supplier.phone}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-blue)' }}>
                        {supplier.email}
                      </td>
                      <td>
                        <StatusBadge status={supplier.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <button
                          className="icon-button"
                          title="Edit supplier"
                          style={{ width: 28, height: 28 }}
                          onClick={() => openEditSupplierModal(supplier)}
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

        <SupplierFormModal
          open={isModalOpen}
          supplier={editingSupplier}
          onClose={() => setIsModalOpen(false)}
          onSaved={handleSupplierSaved}
        />
      </div>
    </Tooltip.Provider>
  )
}
