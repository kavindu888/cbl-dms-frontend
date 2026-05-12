export enum PurchaseOrderStatus {
  Draft = 'Draft',
  Submitted = 'Submitted',
  Received = 'Received',
  Partial = 'Partial',
  Cancelled = 'Cancelled',
}

export interface PurchaseOrderLineDto {
  id: string
  productId: string
  productName: string
  orderedCases: number
  orderedUnits: number
  unitPrice: number
  lineTotal: number
}

export interface PurchaseOrderDto {
  id: string
  poNumber: string
  supplierName: string
  orderDate: string
  expectedDate: string
  status: PurchaseOrderStatus
  totalAmount: number
  notes?: string
  createdBy: string
  lines: PurchaseOrderLineDto[]
}

export interface CreatePurchaseOrderRequest {
  supplierId: string
  expectedDate: string
  notes?: string
  lines: Array<{
    productId: string
    orderedCases: number
    orderedUnits: number
    unitPrice: number
  }>
}

export interface GoodsReceiptDto {
  id: string
  purchaseOrderId: string
  receiptNumber: string
  receivedAt: string
  receivedBy: string
  notes?: string
}

export enum ReturnReason {
  Damaged = 'Damaged',
  Expired = 'Expired',
  IncorrectItem = 'IncorrectItem',
  QuantityMismatch = 'QuantityMismatch',
  Other = 'Other',
}

export interface ReturnNoteDto {
  id: string
  purchaseOrderId: string
  returnNumber: string
  reason: ReturnReason
  notes?: string
  createdAt: string
  createdBy: string
}
