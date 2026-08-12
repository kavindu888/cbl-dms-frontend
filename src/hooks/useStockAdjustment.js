import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '../api/inventoryApi'

const listKey = ['stock-adjustments']
const detailKey = (id) => ['stock-adjustment', id]

function resultValue(response) {
  const payload = response?.data
  const result = payload?.data ?? payload

  if (payload?.success === false || result?.isFailure) {
    const validationMessage = result?.validationErrors?.[0]?.message
    throw new Error(
      validationMessage ||
        result?.errorMessage ||
        payload?.errorMessage ||
        payload?.message ||
        'Request failed.'
    )
  }

  return result?.value ?? result
}

function errorMessage(error, fallback) {
  const payload = error?.response?.data
  const result = payload?.data
  return (
    result?.validationErrors?.[0]?.message ||
    result?.errorMessage ||
    payload?.errorMessage ||
    payload?.message ||
    error?.message ||
    fallback
  )
}

function invalidateStockAdjustment(queryClient, id) {
  queryClient.invalidateQueries({ queryKey: listKey })
  if (id) queryClient.invalidateQueries({ queryKey: detailKey(id) })
}

export const useStockAdjustments = (params = {}) =>
  useQuery({
    queryKey: [...listKey, params],
    queryFn: () => api.listStockAdjustments(params).then(resultValue),
    staleTime: 30_000,
  })

export const useStockAdjustment = (id) =>
  useQuery({
    queryKey: detailKey(id),
    queryFn: () => api.getStockAdjustment(id).then(resultValue),
    enabled: Boolean(id),
  })

export const useCreateStockAdjustment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.createStockAdjustment(data).then(resultValue),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
    onError: (error) => toast.error(errorMessage(error, 'Failed to create adjustment.')),
  })
}

export const useAddStockAdjustmentLine = (id) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ adjustmentId, ...data }) =>
      api.addStockAdjustmentLine(adjustmentId || id, data).then(resultValue),
    onSuccess: (_, variables) => {
      invalidateStockAdjustment(queryClient, variables?.adjustmentId || id)
      toast.success('Adjustment line added.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to add adjustment line.')),
  })
}

export const useRemoveStockAdjustmentLine = (id) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (lineId) => api.removeStockAdjustmentLine(id, lineId).then(resultValue),
    onSuccess: () => {
      invalidateStockAdjustment(queryClient, id)
      toast.success('Adjustment line removed.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to remove adjustment line.')),
  })
}

export const useSubmitAndApplyStockAdjustment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }) => {
      await api.submitStockAdjustment(id).then(resultValue)
      await api.approveStockAdjustment(id).then(resultValue)
      await api.applyStockAdjustment(id).then(resultValue)
    },
    onSuccess: (_, variables) => {
      invalidateStockAdjustment(queryClient, variables?.id)
      queryClient.invalidateQueries({ queryKey: ['inventory', 'stock'] })
      queryClient.invalidateQueries({ queryKey: ['stock-availability'] })
      toast.success('Stock adjustment applied.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to apply stock adjustment.')),
  })
}

export const useCancelStockAdjustment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) => api.cancelStockAdjustment(id, { reason }).then(resultValue),
    onSuccess: (_, variables) => {
      invalidateStockAdjustment(queryClient, variables?.id)
      toast.success('Adjustment cancelled.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to cancel adjustment.')),
  })
}
