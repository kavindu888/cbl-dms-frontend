import { useQuery } from '@tanstack/react-query'
import { inventoryService } from '@/services/api/inventoryService'

// Query keys:
// ['inventory', 'stock', 'levels', params]
// ['inventory', 'stock', 'availability', productId]
// ['inventory', 'stock', 'batches', productId]
// ['inventory', 'stock', 'batches', 'active', params]
// ['inventory', 'stock', 'batches', 'expiring', withinDays]
// ['inventory', 'stock', 'movements', params]

export function useStockLevels(params = {}) {
  return useQuery({
    queryKey: ['inventory', 'stock', 'levels', params],
    queryFn: async () => {
      return inventoryService.listStockLevels(params)
    },
    refetchOnMount: 'always',
  })
}

export function useStockAvailability(productId) {
  return useQuery({
    queryKey: ['inventory', 'stock', 'availability', productId],
    queryFn: async () => {
      return inventoryService.getStockAvailability(productId)
    },
    enabled: Boolean(productId),
    staleTime: 30_000,
  })
}

export function useStockBatches(productId, params = {}) {
  return useQuery({
    queryKey: ['inventory', 'stock', 'batches', productId, params],
    queryFn: async () => {
      return inventoryService.listStockBatches(productId, params)
    },
    enabled: Boolean(productId),
  })
}

export function useActiveStockBatches(params = {}) {
  return useQuery({
    queryKey: ['inventory', 'stock', 'batches', 'active', params],
    queryFn: async () => {
      return inventoryService.listActiveStockBatches(params)
    },
  })
}

export function useExpiringBatches(withinDays = 30) {
  return useQuery({
    queryKey: ['inventory', 'stock', 'batches', 'expiring', withinDays],
    queryFn: async () => {
      return inventoryService.listExpiringBatches({ withinDays })
    },
  })
}

export function useStockMovements(params = {}) {
  return useQuery({
    queryKey: ['inventory', 'stock', 'movements', params],
    queryFn: async () => {
      return inventoryService.listStockMovements(params)
    },
  })
}
