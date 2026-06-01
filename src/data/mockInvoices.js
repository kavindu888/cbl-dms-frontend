import { InvoiceStatus, PaymentType } from '@/types/sales.types'
export const mockInvoices = [
  {
    id: 'inv-001',
    invoiceNumber: 'INV-2026-0001',
    customerId: 'cus-001',
    customerName: 'Lanka Stores - Colombo',
    invoiceDate: '2026-05-11T08:30:00Z',
    dueDate: '2026-05-25T08:30:00Z',
    status: InvoiceStatus.Posted,
    paymentType: PaymentType.Credit,
    totalAmount: 245000,
    paidAmount: 0,
    balanceAmount: 245000,
    lines: [
      {
        id: 'invl-001',
        productId: 'prd-001',
        description: 'CBL Chocolate Biscuit 100g',
        cases: 12,
        units: 432,
        unitPrice: 560,
        discount: {
          totalDiscount: 12000,
          cblDiscount: 8000,
          distributorDiscount: 4000,
        },
        lineTotal: 245000,
      },
    ],
  },
]
