import { useVehicleLoadings } from '@/hooks/useVehicle'
import VehicleMovementListPage from '../VehicleMovementListPage'

export default function VehicleLoadingListPage() {
  return (
    <VehicleMovementListPage
      kind="Loading"
      title="Vehicle Loading"
      description="Load stock from main inventory to vehicles"
      basePath="/inventory/vehicle-loadings"
      useList={useVehicleLoadings}
      numberField="loadingNo"
      dateField="loadingDate"
    />
  )
}
