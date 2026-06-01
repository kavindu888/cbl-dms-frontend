import { Pencil, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { masterService } from '@services/api/masterService'

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
  return error?.message || fallback
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
    vatRegNo: values.vatRegNo.trim() || null,
  }
}

export default function OrganisationsTab() {
  const [organisations, setOrganisations] = useState([])
  const [search, setSearch] = useState('')
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

  const filteredOrganisations = useMemo(() => {
    const query = search.trim().toLowerCase()

    return organisations.filter((organisation) => {
      if (!query) return true

      return [
        organisation.code,
        organisation.name,
        organisation.legalName,
        organisation.email,
        organisation.telephone,
        organisation.city,
        organisation.country,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [organisations, search])

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

  async function handleSave(event) {
    event.preventDefault()

    if (
      !form.code ||
      !form.name ||
      !form.telephone ||
      !form.email ||
      !form.addressLine1 ||
      !form.city ||
      !form.country
    ) {
      toast.error('Code, Name, Telephone, Email, Address, City, and Country are required.')
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

      setOrganisations((currentItems) => {
        const exists = currentItems.some((item) => item.id === finalOrganisation.id)
        if (exists) {
          return currentItems.map((item) =>
            item.id === finalOrganisation.id ? finalOrganisation : item
          )
        }
        return [finalOrganisation, ...currentItems]
      })

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
      setOrganisations((currentItems) =>
        currentItems.map((item) =>
          item.id === updatedOrganisation.id ? updatedOrganisation : item
        )
      )
      setEditingOrganisation(updatedOrganisation)
      toast.success('Organisation status updated.')
    } catch (statusError) {
      updateField('isActive', !nextIsActive)
      toast.error(getErrorMessage(statusError, 'Unable to update organisation status.'))
    }
  }

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'stretch' }}
    >
      <div
        className="panel"
        style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Organisations
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <Search
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 14,
              height: 14,
              color: 'var(--color-text-dim)',
            }}
          />
          <input
            className="form-input"
            placeholder="Search organisations..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{
              width: '100%',
              height: 36,
              paddingLeft: 36,
              background: 'rgba(0,0,0,0.15)',
              fontSize: 13,
            }}
          />
        </div>

        <div className="overflow-x-auto" style={{ marginTop: 4 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Telephone</th>
                <th>Email</th>
                <th>City</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-sm text-[var(--color-text-muted)]"
                  >
                    Loading organisations...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-[var(--color-danger)]">
                    {error}
                  </td>
                </tr>
              ) : filteredOrganisations.length ? (
                filteredOrganisations.map((organisation) => (
                  <tr key={organisation.id}>
                    <td>
                      <span
                        className="mono text-xs font-semibold"
                        style={{ color: 'var(--color-amber)' }}
                      >
                        {organisation.code}
                      </span>
                    </td>
                    <td
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {organisation.name}
                    </td>
                    <td className="mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {organisation.telephone}
                    </td>
                    <td className="text-sm" style={{ color: 'var(--color-blue)' }}>
                      {organisation.email}
                    </td>
                    <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {organisation.city}
                    </td>
                    <td>
                      <StatusBadge status={organisation.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="icon-button"
                        style={{ width: 26, height: 26 }}
                        onClick={() => openEdit(organisation)}
                      >
                        <Pencil style={{ width: 12, height: 12 }} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-sm text-[var(--color-text-muted)]"
                  >
                    No organisations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="panel"
        style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {editingOrganisation ? 'Edit Organisation' : 'Add New Organisation'}
          </p>
          {editingOrganisation ? (
            <button
              type="button"
              className="button-ghost"
              onClick={resetForm}
              style={{ padding: '4px 8px', height: 'auto', fontSize: 12 }}
            >
              Clear
            </button>
          ) : null}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12 }}>
          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              CODE
            </label>
            <input
              className="form-input"
              placeholder="CBL"
              value={form.code}
              onChange={(event) => updateField('code', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              NAME
            </label>
            <input
              className="form-input"
              placeholder="CBL Foods International"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              style={{ height: 38 }}
            />
          </div>
        </div>

        <div>
          <label className="form-label" style={{ fontSize: 10 }}>
            LEGAL NAME
          </label>
          <input
            className="form-input"
            placeholder="CBL Foods International (Pvt) Ltd"
            value={form.legalName}
            onChange={(event) => updateField('legalName', event.target.value)}
            style={{ height: 38 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              TELEPHONE
            </label>
            <input
              className="form-input"
              placeholder="+94 11 234 5678"
              value={form.telephone}
              onChange={(event) => updateField('telephone', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              EMAIL
            </label>
            <input
              className="form-input"
              type="email"
              placeholder="info@company.lk"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              style={{ height: 38 }}
            />
          </div>
        </div>

        <div>
          <label className="form-label" style={{ fontSize: 10 }}>
            ADDRESS LINE 1
          </label>
          <input
            className="form-input"
            placeholder="Street address"
            value={form.addressLine1}
            onChange={(event) => updateField('addressLine1', event.target.value)}
            style={{ height: 38 }}
          />
        </div>

        <div>
          <label className="form-label" style={{ fontSize: 10 }}>
            ADDRESS LINE 2
          </label>
          <input
            className="form-input"
            placeholder="Optional address line"
            value={form.addressLine2}
            onChange={(event) => updateField('addressLine2', event.target.value)}
            style={{ height: 38 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              CITY
            </label>
            <input
              className="form-input"
              placeholder="Colombo"
              value={form.city}
              onChange={(event) => updateField('city', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              COUNTRY
            </label>
            <input
              className="form-input"
              placeholder="Sri Lanka"
              value={form.country}
              onChange={(event) => updateField('country', event.target.value)}
              style={{ height: 38 }}
            />
          </div>
        </div>

        <div>
          <label className="form-label" style={{ fontSize: 10 }}>
            VAT REG NO
          </label>
          <input
            className="form-input"
            placeholder="VAT987654321"
            value={form.vatRegNo}
            onChange={(event) => updateField('vatRegNo', event.target.value)}
            style={{ height: 38 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <input
            type="checkbox"
            id="organisationIsActive"
            checked={form.isActive}
            onChange={handleStatusChange}
            style={{ width: 16, height: 16, accentColor: 'var(--color-amber)' }}
          />
          <label
            htmlFor="organisationIsActive"
            style={{ fontSize: 13, color: 'var(--color-text-primary)', cursor: 'pointer' }}
          >
            Active Organisation
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 16 }}>
          <button
            type="button"
            className="button-ghost"
            onClick={resetForm}
            style={{ flex: 1, height: 36, fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button-primary"
            disabled={isSaving}
            style={{ flex: 1, height: 36, fontSize: 13 }}
          >
            {isSaving ? 'Saving...' : editingOrganisation ? 'Save Changes' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
