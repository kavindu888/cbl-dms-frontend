import { ChevronLeft, ChevronRight, Pencil, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { masterService } from '@services/api/masterService'

const pageSize = 4

const emptyForm = {
  code: '',
  name: '',
  legalName: '',
  telephone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  country: 'Sri Lanka',
  vatRegNo: '',
  isActive: true,
}

function getErrorMessage(error, fallback = 'Something went wrong') {
  return (
    error?.response?.data?.data?.errorMessage ||
    error?.response?.data?.errorMessage ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  )
}

function toApiPayload(values) {
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    legalName: values.legalName.trim() || null,
    telephone: values.telephone.trim(),
    email: values.email.trim(),
    addressLine1: values.addressLine1.trim(),
    addressLine2: values.addressLine2.trim() || null,
    city: values.city.trim(),
    country: values.country.trim(),
    vatRegNo: values.vatRegNo.trim(),
  }
}

function matchesSearch(organisation, query) {
  if (!query) return true

  return [
    organisation.code,
    organisation.name,
    organisation.legalName,
    organisation.email,
    organisation.telephone,
    organisation.addressLine1,
    organisation.addressLine2,
    organisation.city,
    organisation.country,
    organisation.vatRegNo,
  ]
    .join(' ')
    .toLowerCase()
    .includes(query)
}

export default function OrganisationsTab() {
  const [organisations, setOrganisations] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingOrganisation, setEditingOrganisation] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOrganisations() {
      setIsLoading(true)
      setError('')

      try {
        const items = await masterService.listOrganisations()
        setOrganisations(items)
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Unable to load organisations.'))
      } finally {
        setIsLoading(false)
      }
    }

    loadOrganisations()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search])

  const filteredOrganisations = useMemo(() => {
    const query = search.trim().toLowerCase()
    return organisations.filter((organisation) => matchesSearch(organisation, query))
  }, [organisations, search])

  const totalPages = Math.max(1, Math.ceil(filteredOrganisations.length / pageSize))
  const pagedOrganisations = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredOrganisations.slice(start, start + pageSize)
  }, [filteredOrganisations, page])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  function resetForm() {
    setEditingOrganisation(null)
    setForm(emptyForm)
  }

  function openEdit(organisation) {
    setEditingOrganisation(organisation)
    setForm({
      code: organisation.code,
      name: organisation.name,
      legalName: organisation.legalName,
      telephone: organisation.telephone,
      email: organisation.email,
      addressLine1: organisation.addressLine1,
      addressLine2: organisation.addressLine2,
      city: organisation.city,
      country: organisation.country,
      vatRegNo: organisation.vatRegNo,
      isActive: organisation.isActive,
    })
  }

  function validateForm() {
    return (
      form.code.trim() &&
      form.name.trim() &&
      form.telephone.trim() &&
      form.email.trim() &&
      form.addressLine1.trim() &&
      form.city.trim() &&
      form.country.trim() &&
      form.vatRegNo.trim()
    )
  }

  function saveOrganisationInList(savedOrganisation) {
    setOrganisations((currentItems) => {
      const exists = currentItems.some((item) => item.id === savedOrganisation.id)

      if (exists) {
        return currentItems.map((item) =>
          item.id === savedOrganisation.id ? savedOrganisation : item
        )
      }

      return [savedOrganisation, ...currentItems]
    })
  }

  async function handleSave(event) {
    event.preventDefault()

    if (!validateForm()) {
      toast.error(
        'Code, Name, Telephone, Email, Address, City, Country, and VAT Reg No are required.'
      )
      return
    }

    setIsSaving(true)

    try {
      const payload = toApiPayload(form)
      const savedOrganisation = editingOrganisation
        ? await masterService.updateOrganisation(editingOrganisation.id, payload)
        : await masterService.createOrganisation(payload)

      const finalOrganisation =
        savedOrganisation.isActive === form.isActive
          ? savedOrganisation
          : await masterService.updateOrganisationStatus(savedOrganisation.id, form.isActive)

      saveOrganisationInList(finalOrganisation)
      toast.success(editingOrganisation ? 'Organisation updated.' : 'Organisation created.')
      resetForm()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to save organisation.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusChange(event) {
    const nextIsActive = event.target.checked
    updateField('isActive', nextIsActive)

    if (!editingOrganisation) return

    try {
      const updatedOrganisation = await masterService.updateOrganisationStatus(
        editingOrganisation.id,
        nextIsActive
      )
      saveOrganisationInList(updatedOrganisation)
      setEditingOrganisation(updatedOrganisation)
      toast.success('Organisation status updated.')
    } catch (statusError) {
      updateField('isActive', !nextIsActive)
      toast.error(getErrorMessage(statusError, 'Unable to update organisation status.'))
    }
  }

  function handleEnterToNext(event) {
    if (event.key !== 'Enter' || event.shiftKey) return

    event.preventDefault()

    const currentInput = event.currentTarget
    const formElement = currentInput.form
    if (!formElement) return

    const orderedInputs = Array.from(formElement.querySelectorAll('[data-enter-field]'))
    const currentIndex = orderedInputs.indexOf(currentInput)
    const nextInput = orderedInputs[currentIndex + 1]

    if (nextInput) {
      nextInput.focus()
      return
    }

    formElement.querySelector('#save-organisation-button')?.focus()
  }

  const enterKeyProps = {
    'data-enter-field': true,
    onKeyDown: handleEnterToNext,
  }

  return (
    <div
      style={{
        height: 'calc(100vh - 300px)',
        minHeight: 440,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 360px',
        gap: 16,
        overflow: 'hidden',
      }}
    >
      <section
        className="panel"
        style={{
          minWidth: 0,
          padding: 16,
          display: 'grid',
          gridTemplateRows: 'auto auto minmax(0, 1fr) auto',
          gap: 12,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 650, color: 'var(--color-text-primary)' }}>
              Organisations
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Showing backend organisation master records.
            </p>
          </div>
          <span className="mono" style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
            {filteredOrganisations.length} total
          </span>
        </div>

        <div style={{ position: 'relative' }}>
          <Search
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 14,
              height: 14,
              color: 'var(--color-text-dim)',
            }}
          />
          <input
            className="form-input"
            aria-label="Search organisations"
            placeholder="Search organisations"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ height: 34, paddingLeft: 32, fontSize: 13 }}
          />
        </div>

        <div style={{ minHeight: 0, overflow: 'hidden' }}>
          <table className="data-table" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: 76 }}>Code</th>
                <th>Organisation</th>
                <th>Contact</th>
                <th>Address</th>
                <th style={{ width: 118 }}>VAT</th>
                <th style={{ width: 96 }}>Status</th>
                <th style={{ width: 54, textAlign: 'right' }}>Edit</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-text-muted">
                    Loading organisations
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-danger">
                    {error}
                  </td>
                </tr>
              ) : pagedOrganisations.length ? (
                pagedOrganisations.map((organisation) => (
                  <tr key={organisation.id}>
                    <td>
                      <span
                        className="mono text-xs font-semibold"
                        style={{ color: 'var(--color-amber)' }}
                      >
                        {organisation.code}
                      </span>
                    </td>
                    <td>
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                          }}
                          title={organisation.name}
                        >
                          {organisation.name}
                        </p>
                        <p
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 12,
                            color: 'var(--color-text-muted)',
                          }}
                          title={organisation.legalName || 'No legal name'}
                        >
                          {organisation.legalName || 'No legal name'}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div style={{ minWidth: 0 }}>
                        <p
                          className="mono"
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 12,
                            color: 'var(--color-text-primary)',
                          }}
                          title={organisation.telephone}
                        >
                          {organisation.telephone}
                        </p>
                        <p
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 12,
                            color: 'var(--color-blue)',
                          }}
                          title={organisation.email}
                        >
                          {organisation.email}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 12,
                            color: 'var(--color-text-primary)',
                          }}
                          title={[
                            organisation.addressLine1,
                            organisation.addressLine2,
                            organisation.city,
                            organisation.country,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        >
                          {[organisation.addressLine1, organisation.addressLine2]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                        <p
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 12,
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {[organisation.city, organisation.country].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div style={{ minWidth: 0 }}>
                        <p
                          className="mono"
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 12,
                            color: 'var(--color-text-primary)',
                          }}
                          title={organisation.vatRegNo || 'No VAT number'}
                        >
                          {organisation.vatRegNo || '-'}
                        </p>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={organisation.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Edit ${organisation.name}`}
                        title="Edit organisation"
                        style={{ width: 28, height: 28 }}
                        onClick={() => openEdit(organisation)}
                      >
                        <Pencil style={{ width: 13, height: 13 }} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-text-muted">
                    No organisations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingTop: 10,
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
            Page {page} of {totalPages}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="icon-button"
              aria-label="Previous page"
              disabled={page <= 1}
              style={{ width: 30, height: 30, opacity: page <= 1 ? 0.45 : 1 }}
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            >
              <ChevronLeft style={{ width: 15, height: 15 }} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Next page"
              disabled={page >= totalPages}
              style={{ width: 30, height: 30, opacity: page >= totalPages ? 0.45 : 1 }}
              onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
            >
              <ChevronRight style={{ width: 15, height: 15 }} />
            </button>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSave}
        className="panel"
        style={{
          minWidth: 0,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 650, color: 'var(--color-text-primary)' }}>
            {editingOrganisation ? 'Edit Organisation' : 'Add Organisation'}
          </h2>
          {editingOrganisation ? (
            <button
              type="button"
              className="button-ghost"
              onClick={resetForm}
              style={{ height: 28, padding: '0 8px', fontSize: 12 }}
            >
              Clear
            </button>
          ) : null}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 8 }}>
          <FormField label="Code" required>
            <input
              {...enterKeyProps}
              className="form-input"
              placeholder="FlowLink"
              value={form.code}
              onChange={(event) => updateField('code', event.target.value)}
              style={{ height: 30, fontSize: 13 }}
            />
          </FormField>
          <FormField label="Name" required>
            <input
              {...enterKeyProps}
              className="form-input"
              placeholder="FlowLink Hub"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              style={{ height: 30, fontSize: 13 }}
            />
          </FormField>
        </div>

        <FormField label="Legal name">
          <input
            {...enterKeyProps}
            className="form-input"
            placeholder="FlowLink Distribution (Pvt) Ltd"
            value={form.legalName}
            onChange={(event) => updateField('legalName', event.target.value)}
            style={{ height: 30, fontSize: 13 }}
          />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <FormField label="Telephone" required>
            <input
              {...enterKeyProps}
              className="form-input"
              placeholder="+94 11 234 5678"
              value={form.telephone}
              onChange={(event) => updateField('telephone', event.target.value)}
              style={{ height: 30, fontSize: 13 }}
            />
          </FormField>
          <FormField label="Email" required>
            <input
              {...enterKeyProps}
              className="form-input"
              type="email"
              placeholder="info@company.lk"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              style={{ height: 30, fontSize: 13 }}
            />
          </FormField>
        </div>

        <FormField label="Address" required>
          <input
            {...enterKeyProps}
            className="form-input"
            placeholder="Street address"
            value={form.addressLine1}
            onChange={(event) => updateField('addressLine1', event.target.value)}
            style={{ height: 30, fontSize: 13 }}
          />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <FormField label="City" required>
            <input
              {...enterKeyProps}
              className="form-input"
              placeholder="Colombo"
              value={form.city}
              onChange={(event) => updateField('city', event.target.value)}
              style={{ height: 30, fontSize: 13 }}
            />
          </FormField>
          <FormField label="Country" required>
            <input
              {...enterKeyProps}
              className="form-input"
              placeholder="Sri Lanka"
              value={form.country}
              onChange={(event) => updateField('country', event.target.value)}
              style={{ height: 30, fontSize: 13 }}
            />
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
          <FormField label="VAT reg no" required>
            <input
              {...enterKeyProps}
              className="form-input"
              placeholder="VAT987654321"
              value={form.vatRegNo}
              onChange={(event) => updateField('vatRegNo', event.target.value)}
              style={{ height: 30, fontSize: 13 }}
            />
          </FormField>
          <div style={{ paddingTop: 18 }}>
            <label
              htmlFor="organisationIsActive"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                id="organisationIsActive"
                checked={form.isActive}
                onChange={handleStatusChange}
                style={{ width: 15, height: 15, accentColor: 'var(--color-amber)' }}
              />
              Active
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <button
            type="button"
            className="button-ghost"
            onClick={resetForm}
            style={{ flex: 1, height: 34, fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            id="save-organisation-button"
            type="submit"
            className="button-primary"
            disabled={isSaving}
            style={{ flex: 1, height: 34, fontSize: 13 }}
          >
            {isSaving ? 'Saving' : editingOrganisation ? 'Save Changes' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

function FormField({ label, children, required = false }) {
  return (
    <label style={{ display: 'block', minWidth: 0 }}>
      <span className="form-label" style={{ marginBottom: 4, fontSize: 10 }}>
        {label}
        {required ? <span style={{ color: 'var(--color-danger)' }}> *</span> : null}
      </span>
      {children}
    </label>
  )
}
