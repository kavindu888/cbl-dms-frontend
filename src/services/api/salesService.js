import api, { getOnce } from '@/lib/api'

function getValue(response, fallbackMessage = 'Request failed') {
  const result = response.data?.data

  if (!response.data?.success || result?.isFailure) {
    throw new Error(result?.errorMessage || response.data?.errorMessage || fallbackMessage)
  }

  return result?.value ?? result
}

function formatCustomerGroup(group) {
  if (!group) return null
  return {
    id: group.id,
    organizationId: group.organizationId ?? '',
    code: group.code ?? '',
    name: group.name ?? '',
    defaultCreditDays: group.defaultCreditDays ?? 0,
    defaultCreditLimit: group.defaultCreditLimit ?? 0,
    isActive: Boolean(group.isActive),
    status: group.isActive ? 'Active' : 'Inactive',
  }
}

function formatCustomer(customer) {
  if (!customer) return null
  // List endpoint returns CustomerSummaryDto with profileImageUrl (flat string) and flat primary contact fields.
  // Detail endpoint returns CustomerDetailsDto with images array and full contacts array. Handle both.
  const images =
    customer.images ||
    (customer.profileImageUrl ? [{ imageUrl: customer.profileImageUrl }] : [])

  // Build contacts array from whatever shape the DTO provides
  let contacts = customer.contacts || []
  if (!contacts.length && (customer.primaryContactName || customer.primaryContactPhone)) {
    contacts = [{
      id: null,
      fullName: customer.primaryContactName || '',
      phone: customer.primaryContactPhone || '',
      email: customer.primaryContactEmail || '',
      isPrimary: true,
      isActive: true,
      contactType: 0,
    }]
  }

  return {
    id: customer.id,
    organizationId: customer.organizationId ?? '',
    customerGroupId: customer.customerGroupId ?? '',
    salesRouteId: customer.salesRouteId ?? '',
    code: customer.code ?? '',
    name: customer.name ?? '',
    registrationNumber: customer.registrationNumber ?? '',
    isVatRegistered: Boolean(customer.isVatRegistered),
    taxNumber: customer.taxNumber ?? '',
    preferredPaymentMethod: customer.preferredPaymentMethod ?? 0,
    creditLimit: customer.creditLimit ?? 0,
    location: customer.location ?? null,
    isActive: Boolean(customer.isActive),
    status: customer.isActive ? 'Active' : 'Inactive',
    contacts,
    images,
  }
}

export const salesService = {
  //Customer group related APIs
  // List customer groups with optional filters and pagination
  async listCustomerGroups(params = {}) {
    const response = await getOnce('/api/v1/sales/customer-groups', { params })
    const page = getValue(response, 'Unable to load customer groups.')

    return {
      ...page,
      items: (page?.items || []).map(formatCustomerGroup),
    }
  },

  // Get single customer group by ID
  async getCustomerGroup(id) {
    const response = await getOnce(`/api/v1/sales/customer-groups/${id}`)
    return formatCustomerGroup(getValue(response, 'Unable to load customer group.'))
  },

  // Create new customer group
  // Backend returns 201 with the new ID as a plain string (not wrapped in ApiResponse)
  async createCustomerGroup(payload) {
    const response = await api.post('/api/v1/sales/customer-groups', payload)
    return { id: response.data }
  },

  // Update existing customer group
  async updateCustomerGroup(id, payload) {
    const response = await api.put(`/api/v1/sales/customer-groups/${id}`, payload)
    return response.data
  },

  // Deactivate (soft delete) customer group
  async deactivateCustomerGroup(id) {
    const response = await api.delete(`/api/v1/sales/customer-groups/${id}`)
    return response.data
  },

  // List customers with optional filters
  async listCustomers(params = {}) {
    const response = await getOnce('/api/v1/sales/customers', { params })
    const page = getValue(response, 'Unable to load customers.')

    return {
      ...page,
      items: (page?.items || []).map(formatCustomer),
    }
  },

  //
  // Get single customer by ID
  async getCustomer(id) {
    const response = await getOnce(`/api/v1/sales/customers/${id}`)
    return formatCustomer(getValue(response, 'Unable to load customer.'))
  },

  // Create new customer
  // Backend returns 201 with the new customer ID as a plain string
  async createCustomer(payload) {
    const response = await api.post('/api/v1/sales/customers', payload)
    return response.data
  },

  // Update existing customer
  async updateCustomer(id, payload) {
    const response = await api.put(`/api/v1/sales/customers/${id}`, payload)
    return response.data
  },

  // Deactivate (soft delete) customer
  async deactivateCustomer(id) {
    const response = await api.delete(`/api/v1/sales/customers/${id}`)
    return response.data
  },

  // Delete a specific image from a customer (removes from DB and R2 storage).
  async deleteCustomerImage(customerId, imageId) {
    await api.delete(`/api/v1/sales/customers/${customerId}/images/${imageId}`)
  },

  // Add a contact to an existing customer. Backend returns 201 with the new contact ID (plain string).
  async addCustomerContact(customerId, payload) {
    const response = await api.post(`/api/v1/sales/customers/${customerId}/contacts`, payload)
    return response.data
  },

  // Update an existing contact on a customer.
  async updateCustomerContact(customerId, contactId, payload) {
    await api.put(`/api/v1/sales/customers/${customerId}/contacts/${contactId}`, payload)
  },

  // Remove (soft-delete) a contact from a customer.
  async removeCustomerContact(customerId, contactId) {
    await api.delete(`/api/v1/sales/customers/${customerId}/contacts/${contactId}`)
  },

  // Upload one or more customer images. imageTypes and files are paired by index.
  async uploadCustomerImages(id, images) {
    const formData = new FormData()

    images.forEach(({ imageType, file }) => {
      formData.append('imageTypes', String(imageType))
      formData.append('files', file)
    })

    const response = await api.post(`/api/v1/sales/customers/${id}/images`, formData)

    return getValue(response, 'Unable to upload customer images.')
  },

  async listInvoices(params = {}) {
    const response = await getOnce('/api/v1/sales/invoices', {
      params,
    })
    return response.data
  },
}
