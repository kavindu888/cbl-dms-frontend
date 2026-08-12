import { useVehicleUnloading } from '@/hooks/useVehicle'
import VehicleMovementDetailPage from '../VehicleMovementDetailPage'

export default function VehicleUnloadingDetailPage() {
  return (
    <VehicleMovementDetailPage
      kind="Unloading"
      basePath="/inventory/vehicle-unloadings"
      useDetail={useVehicleUnloading}
    />
  )
}
