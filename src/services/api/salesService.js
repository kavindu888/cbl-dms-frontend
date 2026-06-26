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
    customer.images || (customer.profileImageUrl ? [{ imageUrl: customer.profileImageUrl }] : [])

  // Build contacts array from whatever shape the DTO provides
  let contacts = customer.contacts || []
  if (!contacts.length && (customer.primaryContactName || customer.primaryContactPhone)) {
    contacts = [
      {
        id: null,
        fullName: customer.primaryContactName || '',
        phone: customer.primaryContactPhone || '',
        email: customer.primaryContactEmail || '',
        isPrimary: true,
        isActive: true,
        contactType: 0,
      },
    ]
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
    creditPeriodDays: customer.creditPeriodDays ?? 0,
    location: customer.location ?? null,
    isActive: Boolean(customer.isActive),
    status: customer.isActive ? 'Active' : 'Inactive',
    contacts,
    images,
  }
}

function formatInvoice(invoice) {
  if (!invoice) return null

  return {
    id: invoice.id,
    salesOrderId: invoice.salesOrderId ?? '',
    customerId: invoice.customerId ?? '',
    salesRouteId: invoice.salesRouteId ?? '',
    vehicleId: invoice.vehicleId ?? '',
    salesPersonId: invoice.salesPersonId ?? '',
    invoiceNumber: invoice.invoiceNumber ?? invoice.id,
    taxInvoiceNumber: invoice.taxInvoiceNumber ?? '',
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    status: invoice.status ?? 'Unpaid',
    isTaxInvoice: Boolean(invoice.isTaxInvoice),
    customerVatTin: invoice.customerVatTin ?? '',
    notes: invoice.notes ?? '',
    cancelledReason: invoice.cancelledReason ?? '',
    grossAmount: Number(invoice.grossAmount ?? 0),
    totalDiscountAmount: Number(invoice.totalDiscountAmount ?? 0),
    totalSupplierDiscountAmount: Number(invoice.totalSupplierDiscountAmount ?? 0),
    totalDistributorDiscountAmount: Number(invoice.totalDistributorDiscountAmount ?? 0),
    totalReturnAmount: Number(invoice.totalReturnAmount ?? 0),
    vatAmount: Number(invoice.vatAmount ?? 0),
    netAmount: Number(invoice.netAmount ?? 0),
    paidAmount: Number(invoice.paidAmount ?? 0),
    outstandingAmount: Number(invoice.outstandingAmount ?? 0),
    lines: (invoice.lines || []).map((line) => ({
      id: line.id,
      productId: line.productId ?? '',
      categoryId: line.categoryId ?? '',
      unitId: line.unitId ?? '',
      quantity: Number(line.quantity ?? 0),
      unitPrice: Number(line.unitPrice ?? 0),
      mrp: Number(line.mrp ?? 0),
      discountPercent: Number(line.discountPercent ?? 0),
      supplierDiscountPercent: Number(line.supplierDiscountPercent ?? 0),
      distributorDiscountPercent: Number(line.distributorDiscountPercent ?? 0),
      grossAmount: Number(line.grossAmount ?? 0),
      supplierDiscountAmount: Number(line.supplierDiscountAmount ?? 0),
      distributorDiscountAmount: Number(line.distributorDiscountAmount ?? 0),
      discountAmount: Number(line.discountAmount ?? 0),
      vatAmount: Number(line.vatAmount ?? 0),
      lineTotal: Number(line.lineTotal ?? 0),
    })),
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

  // Sales invoice related APIs
  // Create a new invoice
  async createInvoice(payload) {
    const response = await api.post('/api/v1/sales/invoices', payload)
    return response.data?.id ?? response.data?.data?.value ?? response.data?.data ?? response.data
  },

  // Get a single invoice by ID
  async getInvoice(id) {
    const response = await getOnce(`/api/v1/sales/invoices/${id}`)
    return formatInvoice(response.data)
  },

  // List invoices with optional filters
  async listInvoicesByRouteAndDate({ salesRouteId, date }) {
    const response = await getOnce('/api/v1/sales/invoices/by-route', {
      params: { salesRouteId, date },
    })
    return (response.data || []).map(formatInvoice)
  },

  // List outstanding (unpaid) invoices for a specific customer
  async listOutstandingInvoicesByCustomer(customerId) {
    const response = await getOnce('/api/v1/sales/invoices/outstanding', {
      params: { customerId },
    })
    return (response.data || []).map(formatInvoice)
  },

  // Add a payment to an invoice
  async addInvoicePayment(id, payload) {
    await api.post(`/api/v1/sales/invoices/${id}/payments`, payload)
  },

  // Cancel an invoice with a reason
  async cancelInvoice(id, reason) {
    await api.put(`/api/v1/sales/invoices/${id}/cancel`, { reason })
  },

  // Assign or update the tax invoice number for an invoice
  async assignTaxInvoiceNumber(id, taxInvoiceNumber) {
    await api.put(`/api/v1/sales/invoices/${id}/tax-invoice-number`, { taxInvoiceNumber })
  },
}
