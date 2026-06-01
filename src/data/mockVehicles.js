import { VehicleStatus } from '@/types/fleet.types'
export const mockVehicles = [
  {
    id: 'veh-001',
    vehicleNumber: 'NC-1234',
    model: 'Isuzu Elf',
    assignedDriver: 'Nimal Jayasinghe',
    capacityCases: 400,
    status: VehicleStatus.OnRoute,
    lastKnownLocation: 'Maharagama',
  },
]
