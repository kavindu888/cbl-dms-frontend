import type { StockItemDto } from '@/types/inventory.types'

export const mockProducts: StockItemDto[] = [
  {
    id: 'prd-001',
    sku: 'CBL-BIS-001',
    name: 'CBL Chocolate Biscuit 100g',
    category: 'Biscuits',
    cases: 120,
    packets: 18,
    units: 4320,
    stockValue: 586000,
    expiryDate: '2026-10-14T00:00:00Z',
    lastMovement: '2026-05-12T07:30:00Z',
  },
]
