export enum CreditPeriod {
  Days7 = 7,
  Days14 = 14,
  Days21 = 21,
}

export enum InvoiceStatus {
  Draft = 'Draft',
  Posted = 'Posted',
  Paid = 'Paid',
  Overdue = 'Overdue',
  Cancelled = 'Cancelled',
}

export enum PaymentType {
  Cash = 'Cash',
  Credit = 'Credit',
}

export interface DiscountBreakdown {
  totalDiscount: number
  cblDiscount: number
  distributorDiscount: number
}

export interface AgingBucket {
  current: number
  days30: number
  days60: number
  days90plus: number
}

export interface CustomerDto {
  id: string
  customerCode: string
  name: string
  route: string
  area: string
  creditLimit: number
  creditPeriod: CreditPeriod
  currentOutstanding: number
  aging: AgingBucket
  isActive: boolean
}

export interface InvoiceLineDto {
  id: string
  productId: string
  description: string
  cases: number
  units: number
  unitPrice: number
  discount: DiscountBreakdown
  lineTotal: number
}

export interface InvoiceDto {
  id: string
  invoiceNumber: string
  customerId: string
  customerName: string
  invoiceDate: string
  dueDate: string
  status: InvoiceStatus
  paymentType: PaymentType
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  lines: InvoiceLineDto[]
}

export interface OrderDto {
  id: string
  orderNumber: string
  customerId: string
  orderDate: string
  paymentType: PaymentType
  totalAmount: number
  discount: DiscountBreakdown
}
