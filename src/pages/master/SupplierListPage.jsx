import { Pencil, Plus, RefreshCw, Search, X, Copy, Globe } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { masterService } from '@services/api/masterService'
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
    paymentTermId: form.paymentTermId || null,
    creditLimit: Number(form.creditLimit || 0),
    website: textOrNull(form.website),
    address: {
      line1: form.addressLine1.trim(),
      line2: textOrNull(form.addressLine2),
      city: form.city.trim(),
      province: textOrNull(form.province),
      postalCode: textOrNull(form.postalCode),
      country: form.country.trim() || 'Sri Lanka',
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
      country: form.country.trim() || 'Sri Lanka',
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
  if (mode === 'create' && !form.primaryContactName.trim()) {
    errors.primaryContactName = 'Primary contact name is required.'
  }
  if (mode === 'create' && !form.paymentTermId) {
    errors.paymentTermId = 'Payment mode is required.'
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

function getPaymentTermLabel(term) {
  const name = term.name || term.code || 'Payment mode'
  if (Number(term.dueDays) <= 0) return name
  return `${name} - ${term.dueDays} Days`
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
        style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
      />
      {error ? <span className="form-error">{error}</span> : null}
    </label>
  )
}

function SupplierTable({ suppliers, isLoading, paymentTerms, onEdit }) {
  return (
    <div className="overflow-x-auto" style={{ minHeight: 0, overflowY: 'auto' }}>
      <table className="data-table master-table-compact">
        <thead>
          <tr>
            <th>Code</th>
            <th>Supplier & Legal Name</th>
            <th>Company Contact</th>
            <th>Full Address</th>
            <th>Primary Contact</th>
            <th>Tax & Reg Details</th>
            <th>Terms & Credit Limit</th>
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
            suppliers.map((supplier) => {
              const address = supplier.address || {}
              const addressParts = [
                address.line1,
                address.line2,
                [address.city, address.province].filter(Boolean).join(', '),
                [address.country, address.postalCode].filter(Boolean).join(' '),
              ].filter(Boolean)

              const primaryContact = supplier.primaryContact || {}
              const contactName = primaryContact.fullName || supplier.primaryContactName || '—'
              const contactDesignation = primaryContact.designation || ''
              const contactPhone =
                primaryContact.telephone ||
                primaryContact.mobile ||
                supplier.primaryContactPhone ||
                ''
              const contactEmail = primaryContact.email || supplier.primaryContactEmail || ''

              // Look up payment terms
              const term = paymentTerms.find((t) => t.id === supplier.paymentTermId)
              const paymentTermLabel = term ? getPaymentTermLabel(term) : '—'

              return (
                <tr key={supplier.id}>
                  {/* Code */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="product-sku-badge mono">{supplier.code}</span>
                      <button
                        type="button"
                        className="copy-btn"
                        title="Copy Supplier Code"
                        onClick={() => {
                          navigator.clipboard.writeText(supplier.code)
                          toast.success(`Supplier code "${supplier.code}" copied to clipboard`)
                        }}
                      >
                        <Copy style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  </td>

                  {/* Supplier & Legal Name */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span className="product-name-title">{supplier.name}</span>
                      {supplier.legalName && (
                        <span className="product-info-sub" title={supplier.legalName}>
                          Legal: {supplier.legalName}
                        </span>
                      )}
                      {supplier.website && (
                        <a
                          href={
                            supplier.website.startsWith('http')
                              ? supplier.website
                              : `https://${supplier.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="product-info-sub"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: 'var(--color-amber)',
                            width: 'fit-content',
                          }}
                        >
                          <Globe style={{ width: 10, height: 10 }} />
                          {supplier.website}
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Company Contact */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {supplier.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
                            {supplier.email}
                          </span>
                          <button
                            type="button"
                            className="copy-btn"
                            title="Copy Email"
                            onClick={() => {
                              navigator.clipboard.writeText(supplier.email)
                              toast.success(`Supplier email copied`)
                            }}
                          >
                            <Copy style={{ width: 10, height: 10 }} />
                          </button>
                        </div>
                      )}
                      {supplier.telephone && (
                        <span
                          className="mono"
                          style={{ fontSize: 11, color: 'var(--color-text-dim)' }}
                        >
                          Tel: {supplier.telephone}
                        </span>
                      )}
                      {supplier.mobile && (
                        <span
                          className="mono"
                          style={{ fontSize: 11, color: 'var(--color-text-dim)' }}
                        >
                          Mob: {supplier.mobile}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Address */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {addressParts.length > 0 ? (
                        addressParts.map((part, index) => (
                          <span
                            key={index}
                            className="text-xs"
                            style={{ color: 'var(--color-text-muted)', lineHeight: '1.2' }}
                          >
                            {part}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--color-text-dim)' }}>—</span>
                      )}
                    </div>
                  </td>

                  {/* Primary Contact */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {contactName}
                      </span>
                      {contactDesignation && (
                        <span className="product-info-sub" style={{ fontStyle: 'italic' }}>
                          {contactDesignation}
                        </span>
                      )}
                      {contactPhone && (
                        <span
                          className="mono"
                          style={{ fontSize: 11, color: 'var(--color-text-dim)' }}
                        >
                          Phone: {contactPhone}
                        </span>
                      )}
                      {contactEmail && (
                        <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
                          {contactEmail}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Tax & Reg Details */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div className="reorder-badge">
                        <div className="reorder-badge-item">
                          <span className="reorder-badge-label">VAT:</span>
                          <span className="mono">{supplier.vatRegNo || '—'}</span>
                        </div>
                        <div className="reorder-badge-item">
                          <span className="reorder-badge-label">BRN:</span>
                          <span className="mono">{supplier.businessRegNo || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Terms & Credit Limit */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div className="reorder-badge">
                        <div className="reorder-badge-item">
                          <span className="reorder-badge-label">Mode:</span>
                          <span style={{ fontSize: 11, color: 'var(--color-text-primary)' }}>
                            {paymentTermLabel}
                          </span>
                        </div>
                        <div className="reorder-badge-item">
                          <span className="reorder-badge-label">Limit:</span>
                          <span
                            className="mono font-semibold"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            Rs. {formatMoney(supplier.creditLimit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td>
                    <StatusBadge status={supplier.statusLabel || 'Active'} />
                  </td>

                  {/* Actions */}
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
              )
            })
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

function SupplierFormModal({
  mode,
  form,
  errors,
  isSaving,
  open,
  isLoadingPaymentTerms,
  paymentTerms,
  onChange,
  onClose,
  onSubmit,
}) {
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
          width: 'min(1060px, calc(100vw - 48px))',
          height: 'auto',
          maxHeight: 'min(820px, calc(100vh - 48px))',
          borderRadius: 10,
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            padding: '24px 24px 16px 24px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
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
            style={{ width: 32, height: 32 }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* General Information Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 20,
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
              label="Nick Name"
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
                <label>
                  <span className="form-label">Payment Mode *</span>
                  <select
                    className={`form-input ${errors.paymentTermId ? 'error' : ''}`}
                    name="paymentTermId"
                    value={form.paymentTermId}
                    onChange={onChange}
                    disabled={isLoadingPaymentTerms || !paymentTerms.length}
                    style={{ height: 42, background: 'rgba(0,0,0,0.15)', cursor: 'pointer' }}
                  >
                    <option value="">
                      {isLoadingPaymentTerms
                        ? 'Loading payment modes...'
                        : paymentTerms.length
                          ? 'Select payment mode'
                          : 'No payment modes available'}
                    </option>
                    {paymentTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {getPaymentTermLabel(term)}
                        {term.isDefault ? ' (Default)' : ''}
                      </option>
                    ))}
                  </select>
                  {errors.paymentTermId ? (
                    <span className="form-error">{errors.paymentTermId}</span>
                  ) : null}
                  <span
                    style={{
                      display: 'block',
                      marginTop: 5,
                      fontSize: 11,
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Select a mode. The system saves its payment term ID.
                  </span>
                </label>
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
              margin: '12px 0 0 0',
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: 6,
            }}
          >
            Address
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 20,
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
            <Field
              label="Line 2"
              name="addressLine2"
              value={form.addressLine2}
              onChange={onChange}
            />
            <Field
              label="City"
              name="city"
              value={form.city}
              error={errors.city}
              onChange={onChange}
              required
            />
          </div>

          {!isEdit ? (
            <>
              <h3
                style={{
                  margin: '12px 0 0 0',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  borderBottom: '1px solid var(--color-border)',
                  paddingBottom: 6,
                }}
              >
                Primary Contact
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: 20,
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

          <label style={{ display: 'block' }}>
            <span className="form-label">Notes</span>
            <textarea
              className="form-input"
              name="notes"
              value={form.notes}
              onChange={onChange}
              onKeyDown={handleNotesKeyDown}
              rows={3}
              style={{
                height: 'auto',
                minHeight: 60,
                paddingTop: 10,
                resize: 'vertical',
                background: 'rgba(0,0,0,0.15)',
              }}
            />
          </label>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            padding: '16px 24px 18px 24px',
            borderTop: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <button
            className="button-secondary"
            type="button"
            onClick={onClose}
            data-skip-focus="true"
            style={{ minWidth: 110, height: 42 }}
          >
            Cancel
          </button>
          <button
            className="button-primary"
            id="save-supplier-button"
            type="submit"
            disabled={isSaving}
            style={{ minWidth: 150, height: 42 }}
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
  const [isLoadingPaymentTerms, setIsLoadingPaymentTerms] = useState(false)
  const [suppliersPage, setSuppliersPage] = useState({
    items: [],
    page: 1,
    pageSize,
    totalItems: 0,
    totalPages: 1,
  })
  const [paymentTerms, setPaymentTerms] = useState([])

  const suppliers = useMemo(() => suppliersPage.items || [], [suppliersPage.items])
  const defaultPaymentTermId = useMemo(
    () => paymentTerms.find((term) => term.isDefault)?.id || '',
    [paymentTerms]
  )

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

  useEffect(() => {
    async function loadPaymentTerms() {
      try {
        setIsLoadingPaymentTerms(true)
        const terms = await masterService.listPaymentTerms()
        setPaymentTerms(terms.filter((term) => term.isActive))
      } catch {
        setPaymentTerms([])
      } finally {
        setIsLoadingPaymentTerms(false)
      }
    }

    loadPaymentTerms()
  }, [])

  useEffect(() => {
    if (mode !== 'create' || !isModalOpen || form.paymentTermId || !defaultPaymentTermId) return
    setForm((current) => ({ ...current, paymentTermId: defaultPaymentTermId }))
  }, [defaultPaymentTermId, form.paymentTermId, isModalOpen, mode])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function openCreateModal() {
    setMode('create')
    setForm({ ...emptyForm, paymentTermId: defaultPaymentTermId })
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
        const selectedPaymentTerm = await masterService.getPaymentTerm(form.paymentTermId)
        setPaymentTerms((current) =>
          current.some((term) => term.id === selectedPaymentTerm.id)
            ? current.map((term) =>
                term.id === selectedPaymentTerm.id ? selectedPaymentTerm : term
              )
            : [...current, selectedPaymentTerm]
        )
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
        className="panel"
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
        <SupplierTable
          suppliers={suppliers}
          isLoading={isLoading}
          paymentTerms={paymentTerms}
          onEdit={openEditModal}
        />

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
        isLoadingPaymentTerms={isLoadingPaymentTerms}
        paymentTerms={paymentTerms}
        onChange={handleChange}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
