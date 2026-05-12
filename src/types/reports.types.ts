export type ReportType =
  | 'sales-summary'
  | 'inventory-valuation'
  | 'collections-aging'
  | 'fleet-utilization'
  | 'user-audit'
  | string

export interface ReportMetricDto {
  label: string
  value: string | number
  delta?: number
}

export interface ReportFilterDto {
  dateFrom?: string
  dateTo?: string
  route?: string
  warehouseId?: string
  vehicleId?: string
}

export interface GeneratedReportDto {
  id: string
  type: ReportType
  title: string
  generatedAt: string
  generatedBy: string
  downloadUrl?: string
  metrics: ReportMetricDto[]
}
