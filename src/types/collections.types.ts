export type CashDenominations = 5000 | 2000 | 1000 | 500 | 100 | 50 | 20 | 10 | 'Coins'

export interface DenominationEntry {
  denomination: CashDenominations
  count: number
  subtotal: number
}

export enum ChequeStatus {
  Collected = 'Collected',
  Cleared = 'Cleared',
  Pending = 'Pending',
  Returned = 'Returned',
}

export interface ChequeDto {
  id: string
  chequeNumber: string
  bankName: string
  amount: number
  status: ChequeStatus
  collectedAt: string
  clearedAt?: string | null
}

export interface DailyCollectionDto {
  id: string
  collectionDate: string
  route: string
  collectedBy: string
  cashTotal: number
  chequeTotal: number
  totalAmount: number
  denominations: DenominationEntry[]
  cheques: ChequeDto[]
}

export interface ReconciliationSummaryDto {
  date: string
  expectedAmount: number
  actualAmount: number
  varianceAmount: number
  notes?: string
}

export interface AgingAnalysisDto {
  customerId: string
  customerName: string
  bucket: {
    current: number
    days30: number
    days60: number
    days90plus: number
  }
  totalOutstanding: number
}
