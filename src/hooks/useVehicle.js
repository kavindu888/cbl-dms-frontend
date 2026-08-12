import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { inventoryService } from '@/services/api/inventoryService'

const vehiclesKey = ['inventory', 'vehicles']
const loadingListKey = ['inventory', 'vehicle-loadings']
const unloadingListKey = ['inventory', 'vehicle-unloadings']
const loadingDetailKey = (id) => ['inventory', 'vehicle-loadings', id]
const unloadingDetailKey = (id) => ['inventory', 'vehicle-unloadings', id]

function errorMessage(error, fallback) {
  return error?.response?.data?.message ?? error?.message ?? fallback
}

function invalidateMovement(queryClient, listKey, detailKey, id) {
  queryClient.invalidateQueries({ queryKey: listKey })
  if (id) queryClient.invalidateQueries({ queryKey: detailKey(id) })
  queryClient.invalidateQueries({ queryKey: ['inventory', 'stock'] })
}

export function useVehicles(params = {}) {
  return useQuery({
    queryKey: [...vehiclesKey, params],
    queryFn: () => inventoryService.listVehicles(params),
  })
}

export function useVehicleLoadings(params = {}) {
  return useQuery({
    queryKey: [...loadingListKey, params],
    queryFn: () => inventoryService.listVehicleLoadings(params),
  })
}

export function useVehicleLoading(id) {
  return useQuery({
    queryKey: loadingDetailKey(id),
    queryFn: () => inventoryService.getVehicleLoading(id),
    enabled: Boolean(id),
  })
}

export function useCreateVehicleLoading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inventoryService.createVehicleLoading,
    onSuccess: () => {
      toast.success('Vehicle loading draft saved.')
      queryClient.invalidateQueries({ queryKey: loadingListKey })
    },
    onError: (error) => toast.error(errorMessage(error, 'Unable to create vehicle loading.')),
  })
}

export function useAddVehicleLoadingLine(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => inventoryService.addVehicleLoadingLine(id, payload),
    onSuccess: () => {
      toast.success('Stock line added.')
      invalidateMovement(queryClient, loadingListKey, loadingDetailKey, id)
    },
    onError: (error) => toast.error(errorMessage(error, 'Unable to add stock line.')),
  })
}

export function useRemoveVehicleLoadingLine(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (lineId) => inventoryService.removeVehicleLoadingLine(id, lineId),
    onSuccess: () => {
      toast.success('Stock line removed.')
      invalidateMovement(queryClient, loadingListKey, loadingDetailKey, id)
    },
    onError: (error) => toast.error(errorMessage(error, 'Unable to remove stock line.')),
  })
}

export function useApplyVehicleLoading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inventoryService.applyVehicleLoading,
    onSuccess: (_, id) => {
      toast.success('Stock loaded to vehicle.')
      invalidateMovement(queryClient, loadingListKey, loadingDetailKey, id)
    },
    onError: (error) => toast.error(errorMessage(error, 'Unable to apply vehicle loading.')),
  })
}

export function useCancelVehicleLoading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) => inventoryService.cancelVehicleLoading(id, { reason }),
    onSuccess: (_, variables) => {
      toast.success('Vehicle loading cancelled.')
      invalidateMovement(queryClient, loadingListKey, loadingDetailKey, variables?.id)
    },
    onError: (error) => toast.error(errorMessage(error, 'Unable to cancel vehicle loading.')),
  })
}

export function useVehicleUnloadings(params = {}) {
  return useQuery({
    queryKey: [...unloadingListKey, params],
    queryFn: () => inventoryService.listVehicleUnloadings(params),
  })
}

export function useVehicleUnloading(id) {
  return useQuery({
    queryKey: unloadingDetailKey(id),
    queryFn: () => inventoryService.getVehicleUnloading(id),
    enabled: Boolean(id),
  })
}

export function useCreateVehicleUnloading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inventoryService.createVehicleUnloading,
    onSuccess: () => {
      toast.success('Vehicle unloading draft saved.')
      queryClient.invalidateQueries({ queryKey: unloadingListKey })
    },
    onError: (error) => toast.error(errorMessage(error, 'Unable to create vehicle unloading.')),
  })
}

export function useAddVehicleUnloadingLine(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => inventoryService.addVehicleUnloadingLine(id, payload),
    onSuccess: () => {
      toast.success('Unloading line added.')
      invalidateMovement(queryClient, unloadingListKey, unloadingDetailKey, id)
    },
    onError: (error) => toast.error(errorMessage(error, 'Unable to add unloading line.')),
  })
}

export function useRemoveVehicleUnloadingLine(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (lineId) => inventoryService.removeVehicleUnloadingLine(id, lineId),
    onSuccess: () => {
      toast.success('Unloading line removed.')
      invalidateMovement(queryClient, unloadingListKey, unloadingDetailKey, id)
    },
    onError: (error) => toast.error(errorMessage(error, 'Unable to remove unloading line.')),
  })
}

export function useApplyVehicleUnloading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inventoryService.applyVehicleUnloading,
    onSuccess: (_, id) => {
      toast.success('Stock unloaded to main inventory.')
      invalidateMovement(queryClient, unloadingListKey, unloadingDetailKey, id)
    },
    onError: (error) => toast.error(errorMessage(error, 'Unable to apply vehicle unloading.')),
  })
}

export function useCancelVehicleUnloading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) => inventoryService.cancelVehicleUnloading(id, { reason }),
    onSuccess: (_, variables) => {
      toast.success('Vehicle unloading cancelled.')
      invalidateMovement(queryClient, unloadingListKey, unloadingDetailKey, variables?.id)
    },
    onError: (error) => toast.error(errorMessage(error, 'Unable to cancel vehicle unloading.')),
  })
}
