import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as inventoryApi from '@/api/inventoryApi'

// Query keys:
// ['inventory', 'return-stock']
// ['inventory', 'return-stock', 'by-product', productId]

export function useReturnStockList(params = {}) {
  return useQuery({
    queryKey: ['inventory', 'return-stock', params],
    queryFn: async () => {
      const res = await inventoryApi.listReturnStock(params)
      return res
    },
  })
}

export function useReturnStockByProduct(productId) {
  return useQuery({
    queryKey: ['inventory', 'return-stock', 'by-product', productId],
    queryFn: async () => {
      const res = await inventoryApi.getReturnStockByProduct(productId)
      return res || []
    },
    enabled: Boolean(productId),
  })
}

export function useFlagStockForReturn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inventoryApi.flagStockForReturn,
    onSuccess: () => {
      toast.success('Stock flagged for supplier return.')
      queryClient.invalidateQueries({ queryKey: ['inventory', 'return-stock'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'stock'] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to flag stock for return.')
    },
  })
}

export function useCancelReturnFlag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inventoryApi.cancelReturnFlag,
    onSuccess: () => {
      toast.success('Return stock flag cancelled.')
      queryClient.invalidateQueries({ queryKey: ['inventory', 'return-stock'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'stock'] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to cancel return stock flag.')
    },
  })
}
