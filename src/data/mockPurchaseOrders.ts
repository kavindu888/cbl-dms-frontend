import { PurchaseOrderStatus } from '@/types/purchasing.types'
import type { PurchaseOrderDto } from '@/types/purchasing.types'

export const mockPurchaseOrders: PurchaseOrderDto[] = [
  {
    id: 'po-001',
    poNumber: 'PO-2026-0001',
    supplierName: 'CBL Central Manufacturing',
    orderDate: '2026-05-10T09:00:00Z',
    expectedDate: '2026-05-14T09:00:00Z',
    status: PurchaseOrderStatus.Submitted,
    totalAmount: 1585000,
    createdBy: 'Asanka Perera',
    notes: 'Initial scaffold sample purchase order.',
    lines: [
      {
        id: 'pol-001',
        productId: 'prd-001',
        productName: 'CBL Chocolate Biscuit 100g',
        orderedCases: 80,
        orderedUnits: 2880,
        unitPrice: 550,
        lineTotal: 1584000,
      },
    ],
  },
]
