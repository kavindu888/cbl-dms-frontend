import { getOnce } from '@/lib/api'
export const salesService = {
  async listCustomers(params = {}) {
    const response = await getOnce('/api/v1/sales/customers', {
      params,
    })
    return response.data
  },
  async listInvoices(params = {}) {
    const response = await getOnce('/api/v1/sales/invoices', {
      params,
    })
    return response.data
  },
}
