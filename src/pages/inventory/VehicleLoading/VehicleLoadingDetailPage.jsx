import {
  useApplyVehicleLoading,
  useCancelVehicleLoading,
  useVehicleLoading,
} from '@/hooks/useVehicle'
import VehicleMovementDetailPage from '../VehicleMovementDetailPage'

export default function VehicleLoadingDetailPage() {
  return (
    <VehicleMovementDetailPage
      kind="Loading"
      basePath="/inventory/vehicle-loadings"
      useDetail={useVehicleLoading}
      useApply={useApplyVehicleLoading}
      useCancel={useCancelVehicleLoading}
    />
  )
}
