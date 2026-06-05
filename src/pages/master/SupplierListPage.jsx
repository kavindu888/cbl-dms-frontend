import { Pencil, Plus, RefreshCw, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { purchasingService } from '@services/api/purchasingService'

const pageSize = 10

const statusOptions = [
  { label: 'All Statuses', value: '' },
  { label: 'Active', value: '1' },
  { label: 'Inactive', value: '2' },
  { label: 'On Hold', value: '3' },
  { label: 'Blacklisted', value: '4' },
]

const emptyForm = {
  id: '',
  code: '',
  name: '',
  legalName: '',
  telephone: '',
  mobile: '',
  email: '',
  fax: '',
  vatRegNo: '',
  businessRegNo: '',
  paymentTermId: '',
  creditLimit: '0',
  website: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  province: '',
  postalCode: '',
  country: 'Sri Lanka',
  primaryContactName: '',
  primaryContactDesignation: '',
  primaryContactTelephone: '',
  primaryContactMobile: '',
  primaryContactEmail: '',
  primaryContactFax: '',
  notes: '',
}

function textOrNull(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed || null
}

function getAddress(supplier) {
  return supplier.address || {}
}

function getPrimaryContact(supplier) {
  return supplier.primaryContact || {}
}

function mapSupplierToForm(supplier) {
  const address = getAddress(supplier)
  const primaryContact = getPrimaryContact(supplier)

  return {
    ...emptyForm,
    id: supplier.id || '',
    code: supplier.code || '',
    name: supplier.name || '',
    legalName: supplier.legalName || '',
    telephone: supplier.telephone || '',
    mobile: supplier.mobile || '',
    email: supplier.email || '',
    fax: supplier.fax || '',
    vatRegNo: supplier.vatRegNo || '',
    businessRegNo: supplier.businessRegNo || '',
    paymentTermId: supplier.paymentTermId || '',
    creditLimit: String(supplier.creditLimit ?? 0),
    website: supplier.website || '',
    addressLine1: address.line1 || '',
    addressLine2: address.line2 || '',
    city: address.city || supplier.city || '',
    province: address.province || '',
    postalCode: address.postalCode || '',
    country: address.country || supplier.country || 'Sri Lanka',
    primaryContactName: primaryContact.fullName || supplier.primaryContactName || '',
    primaryContactDesignation: primaryContact.designation || '',
    primaryContactTelephone: primaryContact.telephone || supplier.primaryContactPhone || '',
    primaryContactMobile: primaryContact.mobile || '',
    primaryContactEmail: primaryContact.email || supplier.primaryContactEmail || '',
    primaryContactFax: primaryContact.fax || '',
    notes: supplier.notes || '',
  }
}

function createSupplierPayload(form) {
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    legalName: textOrNull(form.legalName),
    telephone: form.telephone.trim(),
    mobile: textOrNull(form.mobile),
    email: form.email.trim(),
    fax: textOrNull(form.fax),
    vatRegNo: form.vatRegNo.trim(),
    businessRegNo: textOrNull(form.businessRegNo),
    paymentTermId: textOrNull(form.paymentTermId),
    creditLimit: Number(form.creditLimit || 0),
    website: textOrNull(form.website),
    address: {
      line1: form.addressLine1.trim(),
      line2: textOrNull(form.addressLine2),
      city: form.city.trim(),
      province: textOrNull(form.province),
      postalCode: textOrNull(form.postalCode),
      country: form.country.trim(),
    },
    primaryContact: {
      fullName: form.primaryContactName.trim(),
      designation: textOrNull(form.primaryContactDesignation),
      telephone: textOrNull(form.primaryContactTelephone),
      mobile: textOrNull(form.primaryContactMobile),
      email: textOrNull(form.primaryContactEmail),
      fax: textOrNull(form.primaryContactFax),
    },
    notes: textOrNull(form.notes),
  }
}

function updateSupplierPayload(form) {
  return {
    name: form.name.trim(),
    legalName: textOrNull(form.legalName),
    telephone: form.telephone.trim(),
    mobile: textOrNull(form.mobile),
    email: form.email.trim(),
    fax: textOrNull(form.fax),
    vatRegNo: form.vatRegNo.trim(),
    businessRegNo: textOrNull(form.businessRegNo),
    website: textOrNull(form.website),
    address: {
      line1: form.addressLine1.trim(),
      line2: textOrNull(form.addressLine2),
      city: form.city.trim(),
      province: textOrNull(form.province),
      postalCode: textOrNull(form.postalCode),
      country: form.country.trim(),
    },
    notes: textOrNull(form.notes),
  }
}

function validateSupplier(form, mode) {
  const errors = {}

  if (mode === 'create' && !form.code.trim()) errors.code = 'Supplier code is required.'
  if (!form.name.trim()) errors.name = 'Supplier name is required.'
  if (!form.telephone.trim()) errors.telephone = 'Telephone is required.'
  if (!form.email.trim()) errors.email = 'Email is required.'
  if (!form.vatRegNo.trim()) errors.vatRegNo = 'VAT registration number is required.'
  if (!form.addressLine1.trim()) errors.addressLine1 = 'Address line 1 is required.'
  if (!form.city.trim()) errors.city = 'City is required.'
  if (!form.country.trim()) errors.country = 'Country is required.'
  if (mode === 'create' && !form.primaryContactName.trim()) {
    errors.primaryContactName = 'Primary contact name is required.'
  }
  if (
    mode === 'create' &&
    !form.primaryContactTelephone.trim() &&
    !form.primaryContactEmail.trim()
  ) {
    errors.primaryContactTelephone = 'Enter contact telephone or email.'
    errors.primaryContactEmail = 'Enter contact telephone or email.'
  }
  if (Number(form.creditLimit || 0) < 0) errors.creditLimit = 'Credit limit cannot be negative.'

  return errors
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function Field({
  label,
  name,
  value,
  error,
  onChange,
  type = 'text',
  required = false,
  disabled,
  inputRef,
}) {
  return (
    <label>
      <span className="form-label">
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        className={`form-input ${error ? 'error' : ''}`}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        ref={inputRef}
      />
      {error ? <span className="form-error">{error}</span> : null}
    </label>
  )
}

function SupplierTable({ suppliers, isLoading, onEdit }) {
  return (
    <div
      className="overflow-x-auto responsive-table-wrap"
      style={{ minHeight: 0, overflowY: 'auto' }}
    >
      <table className="data-table master-table-compact">
        <thead>
          <tr>
            <th>Code</th>
            <th>Supplier Name</th>
            <th>Contact</th>
            <th>City</th>
            <th>VAT Reg No</th>
            <th>Credit Limit</th>
            <th>Email</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={9} style={{ padding: 28, color: 'var(--color-text-muted)' }}>
                Loading suppliers...
              </td>
            </tr>
          ) : suppliers.length ? (
            suppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td className="mono" style={{ color: 'var(--color-amber)' }}>
                  {supplier.code}
                </td>
                <td style={{ fontWeight: 700 }}>{supplier.name}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span>{supplier.primaryContactName || '-'}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                      {supplier.primaryContactPhone || supplier.primaryContactEmail || '-'}
                    </span>
                  </div>
                </td>
                <td>{supplier.city || '-'}</td>
                <td>{supplier.vatRegNo || '-'}</td>
                <td className="mono">{formatMoney(supplier.creditLimit)}</td>
                <td style={{ color: 'var(--color-text-muted)' }}>{supplier.email}</td>
                <td>
                  <StatusBadge status={supplier.statusLabel || 'Active'} />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="icon-button"
                    type="button"
                    title="Edit supplier"
                    onClick={() => onEdit(supplier)}
                    style={{ width: 32, height: 32, borderRadius: 999 }}
                  >
                    <Pencil style={{ width: 14, height: 14 }} />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9} style={{ padding: 28, color: 'var(--color-text-muted)' }}>
                No suppliers found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function SupplierFormModal({ mode, form, errors, isSaving, open, onChange, onClose, onSubmit }) {
  const codeInputRef = useRef(null)

  useEffect(() => {
    if (!open || mode !== 'create') return

    window.setTimeout(() => {
      codeInputRef.current?.focus()
    }, 0)
  }, [mode, open])

  if (!open) return null

  const isEdit = mode === 'edit'

  function handleNotesKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      document.getElementById('save-supplier-button')?.focus()
    }
  }

  function handleFormKeyDown(e) {
    if (e.key === 'Enter') {
      const target = e.target
      if (target.tagName === 'BUTTON' || target.tagName === 'TEXTAREA') {
        return
      }
      e.preventDefault()
      const formElement = e.currentTarget
      const focusable = Array.from(
        formElement.querySelectorAll(
          'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]):not([data-skip-focus="true"])'
        )
      )
      const index = focusable.indexOf(target)
      if (index > -1 && index < focusable.length - 1) {
        focusable[index + 1].focus()
      }
    }
  }

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(0,4,12,0.75)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <form
        className="panel"
        onSubmit={onSubmit}
        onKeyDown={handleFormKeyDown}
        style={{
          width: 'min(940px, calc(100vw - 48px))',
          height: 'min(720px, calc(100vh - 48px))',
          maxHeight: '88vh',
          overflowY: 'auto',
          padding: 0,
          borderRadius: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            padding: '20px 24px 12px 24px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {isEdit ? 'Edit Supplier' : 'New Supplier'}
            </h2>
            <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
              {isEdit
                ? 'Update supplier details supported by the current backend API.'
                : 'Create a purchasing supplier using the backend supplier contract.'}
            </p>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-skip-focus="true"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            padding: '16px 24px 0 24px',
          }}
        >
          <Field
            label="Code"
            name="code"
            value={form.code}
            error={errors.code}
            onChange={onChange}
            required={!isEdit}
            disabled={isEdit}
            inputRef={codeInputRef}
          />
          <Field
            label="Name"
            name="name"
            value={form.name}
            error={errors.name}
            onChange={onChange}
            required
          />
          <Field label="Legal Name" name="legalName" value={form.legalName} onChange={onChange} />
          <Field
            label="Telephone"
            name="telephone"
            value={form.telephone}
            error={errors.telephone}
            onChange={onChange}
            required
          />
          <Field label="Mobile" name="mobile" value={form.mobile} onChange={onChange} />
          <Field
            label="Email"
            name="email"
            type="email"
            value={form.email}
            error={errors.email}
            onChange={onChange}
            required
          />
          <Field label="Fax" name="fax" value={form.fax} onChange={onChange} />
          <Field
            label="VAT Reg No"
            name="vatRegNo"
            value={form.vatRegNo}
            error={errors.vatRegNo}
            onChange={onChange}
            required
          />
          <Field
            label="Business Reg No"
            name="businessRegNo"
            value={form.businessRegNo}
            onChange={onChange}
          />
          {!isEdit ? (
            <>
              <Field
                label="Payment Term Id"
                name="paymentTermId"
                value={form.paymentTermId}
                onChange={onChange}
              />
              <Field
                label="Credit Limit"
                name="creditLimit"
                type="number"
                value={form.creditLimit}
                error={errors.creditLimit}
                onChange={onChange}
              />
            </>
          ) : null}
          <Field label="Website" name="website" value={form.website} onChange={onChange} />
        </div>

        <h3
          style={{
            margin: '22px 24px 12px 24px',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}
        >
          Address
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            padding: '0 24px',
          }}
        >
          <Field
            label="Line 1"
            name="addressLine1"
            value={form.addressLine1}
            error={errors.addressLine1}
            onChange={onChange}
            required
          />
          <Field label="Line 2" name="addressLine2" value={form.addressLine2} onChange={onChange} />
          <Field
            label="City"
            name="city"
            value={form.city}
            error={errors.city}
            onChange={onChange}
            required
          />
          <Field label="Province" name="province" value={form.province} onChange={onChange} />
          <Field
            label="Postal Code"
            name="postalCode"
            value={form.postalCode}
            onChange={onChange}
          />
          <Field
            label="Country"
            name="country"
            value={form.country}
            error={errors.country}
            onChange={onChange}
            required
          />
        </div>

        {!isEdit ? (
          <>
            <h3
              style={{
                margin: '22px 24px 12px 24px',
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--color-text-primary)',
              }}
            >
              Primary Contact
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
                padding: '0 24px',
              }}
            >
              <Field
                label="Full Name"
                name="primaryContactName"
                value={form.primaryContactName}
                error={errors.primaryContactName}
                onChange={onChange}
                required
              />
              <Field
                label="Designation"
                name="primaryContactDesignation"
                value={form.primaryContactDesignation}
                onChange={onChange}
              />
              <Field
                label="Telephone"
                name="primaryContactTelephone"
                value={form.primaryContactTelephone}
                error={errors.primaryContactTelephone}
                onChange={onChange}
              />
              <Field
                label="Mobile"
                name="primaryContactMobile"
                value={form.primaryContactMobile}
                onChange={onChange}
              />
              <Field
                label="Email"
                name="primaryContactEmail"
                type="email"
                value={form.primaryContactEmail}
                error={errors.primaryContactEmail}
                onChange={onChange}
              />
              <Field
                label="Fax"
                name="primaryContactFax"
                value={form.primaryContactFax}
                onChange={onChange}
              />
            </div>
          </>
        ) : null}

        <label style={{ display: 'block', margin: '16px 24px 0 24px' }}>
          <span className="form-label">Notes</span>
          <textarea
            className="form-input"
            name="notes"
            value={form.notes}
            onChange={onChange}
            onKeyDown={handleNotesKeyDown}
            rows={3}
            style={{ height: 'auto', paddingTop: 10, resize: 'vertical' }}
          />
        </label>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            marginTop: 20,
            padding: '16px 24px 18px 24px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <button
            className="button-secondary"
            type="button"
            onClick={onClose}
            data-skip-focus="true"
          >
            Cancel
          </button>
          <button
            className="button-primary"
            id="save-supplier-button"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : isEdit ? 'Update Supplier' : 'Save Supplier'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function SupplierListPage() {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [mode, setMode] = useState('create')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [suppliersPage, setSuppliersPage] = useState({
    items: [],
    page: 1,
    pageSize,
    totalItems: 0,
    totalPages: 1,
  })

  const suppliers = useMemo(() => suppliersPage.items || [], [suppliersPage.items])

  async function loadSuppliers() {
    try {
      setIsLoading(true)
      const result = await purchasingService.listSuppliers({
        page,
        pageSize,
        search: appliedSearch || undefined,
        status: status || undefined,
      })

      setSuppliersPage({
        items: result.items || [],
        page: result.page || page,
        pageSize: result.pageSize || pageSize,
        totalItems: result.totalItems || 0,
        totalPages: result.totalPages || 1,
      })
    } catch (error) {
      toast.error(error.message || 'Unable to load suppliers.')
      setSuppliersPage((current) => ({ ...current, items: [] }))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, appliedSearch, status])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function openCreateModal() {
    setMode('create')
    setForm(emptyForm)
    setErrors({})
    setIsModalOpen(true)
  }

  function openEditModal(supplier) {
    setMode('edit')
    setForm(mapSupplierToForm(supplier))
    setErrors({})
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setForm(emptyForm)
    setErrors({})
  }

  function applySearch(event) {
    event.preventDefault()
    setPage(1)
    setAppliedSearch(searchText.trim())
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateSupplier(form, mode)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length) return

    try {
      setIsSaving(true)

      if (mode === 'edit') {
        await purchasingService.updateSupplier(form.id, updateSupplierPayload(form))
        toast.success('Supplier updated successfully.')
      } else {
        await purchasingService.createSupplier(createSupplierPayload(form))
        toast.success('Supplier created successfully.')
      }

      closeModal()
      await loadSuppliers()
    } catch (error) {
      toast.error(error.message || 'Unable to save supplier.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="responsive-page"
      style={{
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflow: 'hidden',
      }}
    >
      <div
        className="responsive-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
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
            Manage purchasing supplier records using the backend Suppliers API.
          </p>
        </div>
        <button
          className="button-primary"
          type="button"
          onClick={openCreateModal}
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

      {/* ── Filter Bar ── */}
      <form
        onSubmit={applySearch}
        className="panel responsive-toolbar"
        style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              width: 16,
              height: 16,
              transform: 'translateY(-50%)',
              color: 'var(--color-text-dim)',
            }}
          />
          <input
            className="form-input"
            value={searchText}
            placeholder="Search suppliers..."
            onChange={(event) => setSearchText(event.target.value)}
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

        <div style={{ position: 'relative', width: 180 }}>
          <select
            className="form-input"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            style={{
              width: '100%',
              height: 40,
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              fontSize: 14,
              cursor: 'pointer',
              appearance: 'none',
              paddingLeft: 12,
              paddingRight: 36,
            }}
          >
            {statusOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
                style={{ background: 'var(--color-bg-elevated)' }}
              >
                {option.label}
              </option>
            ))}
          </select>
          <div
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-dim)',
            }}
          >
            <svg style={{ width: 14, height: 14, fill: 'currentColor' }} viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>

        <button
          className="button-secondary"
          type="submit"
          style={{ height: 40, padding: '0 16px' }}
        >
          Search
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label="Refresh suppliers"
          onClick={loadSuppliers}
          style={{ height: 40, width: 40 }}
        >
          <RefreshCw style={{ width: 15, height: 15 }} />
        </button>
      </form>

      <div
        className="panel"
        style={{
          padding: 12,
          display: 'grid',
          gridTemplateRows: 'minmax(0, 1fr) auto',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <SupplierTable suppliers={suppliers} isLoading={isLoading} onEdit={openEditModal} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingTop: 10,
            borderTop: '1px solid var(--color-border)',
            marginTop: 10,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
            Showing {suppliers.length} of {suppliersPage.totalItems} suppliers
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="button-secondary"
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              style={{ height: 32, padding: '0 12px', fontSize: 12 }}
            >
              Previous
            </button>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Page {suppliersPage.page} of {suppliersPage.totalPages}
            </span>
            <button
              className="button-secondary"
              type="button"
              disabled={page >= suppliersPage.totalPages || isLoading}
              onClick={() => setPage((current) => Math.min(suppliersPage.totalPages, current + 1))}
              style={{ height: 32, padding: '0 12px', fontSize: 12 }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <SupplierFormModal
        mode={mode}
        form={form}
        errors={errors}
        isSaving={isSaving}
        open={isModalOpen}
        onChange={handleChange}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
