import type { CustomerDto, InvoiceDto, PaginatedResponse, PaginationParams } from '@/types'

import axiosInstance from './axiosInstance'

export const salesService = {
  async listCustomers(params: Partial<PaginationParams> = {}) {
    const response = await axiosInstance.get<PaginatedResponse<CustomerDto>>('/sales/customers', {
      params,
    })
    return response.data
  },

  async listInvoices(params: Partial<PaginationParams> = {}) {
    const response = await axiosInstance.get<PaginatedResponse<InvoiceDto>>('/sales/invoices', {
      params,
    })
    return response.data
  },
}
