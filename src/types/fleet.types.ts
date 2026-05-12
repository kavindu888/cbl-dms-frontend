export enum VehicleStatus {
  OnRoute = 'OnRoute',
  InWarehouse = 'InWarehouse',
  Maintenance = 'Maintenance',
}

export interface VehicleDto {
  id: string
  vehicleNumber: string
  model: string
  assignedDriver: string
  capacityCases: number
  status: VehicleStatus
  lastKnownLocation: string
}

export interface RouteLogDto {
  id: string
  vehicleId: string
  routeName: string
  startedAt: string
  completedAt?: string | null
  status: VehicleStatus
}

export interface FuelEntryDto {
  id: string
  vehicleId: string
  filledAt: string
  liters: number
  cost: number
  odometerReading: number
}

export interface MaintenanceDto {
  id: string
  vehicleId: string
  maintenanceType: string
  scheduledDate: string
  completedDate?: string | null
  cost: number
  notes?: string
}
