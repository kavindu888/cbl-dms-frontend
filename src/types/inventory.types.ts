export interface StockItemDto {
  id: string
  sku: string
  name: string
  category: string
  cases: number
  packets: number
  units: number
  stockValue: number
  expiryDate?: string | null
  lastMovement: string
}

export enum MovementType {
  Load = 'Load',
  Unload = 'Unload',
}

export interface StockMovementDto {
  id: string
  stockItemId: string
  referenceNo: string
  movementType: MovementType
  quantityCases: number
  quantityUnits: number
  performedAt: string
  performedBy: string
}

export enum AdjustmentClassification {
  Expired = 'Expired',
  Other = 'Other',
}

export interface StockAdjustmentDto {
  id: string
  stockItemId: string
  classification: AdjustmentClassification
  quantityCases: number
  quantityUnits: number
  reason: string
  adjustedAt: string
  adjustedBy: string
}
