import { useVehicleUnloadings } from '@/hooks/useVehicle'
import VehicleMovementListPage from '../VehicleMovementListPage'

export default function VehicleUnloadingListPage() {
  return (
    <VehicleMovementListPage
      kind="Unloading"
      title="Vehicle Unloading"
      description="Move vehicle stock back to main inventory"
      basePath="/inventory/vehicle-unloadings"
      useList={useVehicleUnloadings}
      numberField="unloadingNo"
      dateField="unloadingDate"
    />
  )
}
