import { CreditPeriod } from '@/types/sales.types'
import type { CustomerDto } from '@/types/sales.types'

export const mockCustomers: CustomerDto[] = [
  {
    id: 'cus-001',
    customerCode: 'CMB-001',
    name: 'Lanka Stores - Colombo',
    route: 'Colombo Central',
    area: 'Colombo',
    creditLimit: 750000,
    creditPeriod: CreditPeriod.Days14,
    currentOutstanding: 182500,
    aging: {
      current: 120000,
      days30: 45000,
      days60: 17500,
      days90plus: 0,
    },
    isActive: true,
  },
]
