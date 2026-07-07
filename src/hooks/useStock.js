import { useQuery } from '@tanstack/react-query'
import * as inventoryApi from '@/api/inventoryApi'

// Query keys:
// ['inventory', 'stock', 'levels', params]
// ['inventory', 'stock', 'availability', productId]
// ['inventory', 'stock', 'batches', productId]
// ['inventory', 'stock', 'batches', 'expiring', withinDays]
// ['inventory', 'stock', 'movements', params]

export function useStockLevels(params = {}) {
  return useQuery({
    queryKey: ['inventory', 'stock', 'levels', params],
    queryFn: async () => {
      const res = await inventoryApi.getStockLevels(params)
      return res?.data?.data?.items || res?.data?.data || res?.data?.items || res?.items || res || []
    },
  })
}

export function useStockAvailability(productId) {
  return useQuery({
    queryKey: ['inventory', 'stock', 'availability', productId],
    queryFn: async () => {
      const res = await inventoryApi.getStockAvailability(productId)
      return res?.data?.data || res?.data || res
    },
    enabled: Boolean(productId),
  })
}

export function useStockBatches(productId) {
  return useQuery({
    queryKey: ['inventory', 'stock', 'batches', productId],
    queryFn: async () => {
      const res = await inventoryApi.getStockBatches(productId)
      return res?.data?.data || res?.data || res || []
    },
    enabled: Boolean(productId),
  })
}

export function useExpiringBatches(withinDays = 30) {
  return useQuery({
    queryKey: ['inventory', 'stock', 'batches', 'expiring', withinDays],
    queryFn: async () => {
      const res = await inventoryApi.getExpiringBatches(withinDays)
      return res?.data?.data || res?.data || res || []
    },
  })
}

export function useStockMovements(params = {}) {
  return useQuery({
    queryKey: ['inventory', 'stock', 'movements', params],
    queryFn: async () => {
      const res = await inventoryApi.getStockMovements(params)
      return res?.data?.data || res?.data || res || []
    },
  })
}
