import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { inventoryService } from '@/services/api/inventoryService'

const listKey = ['inventory', 'in-store-returns']
const detailKey = (id) => ['inventory', 'in-store-returns', id]

function invalidateInStoreReturns(queryClient, id) {
  queryClient.invalidateQueries({ queryKey: listKey })
  if (id) queryClient.invalidateQueries({ queryKey: detailKey(id) })
  queryClient.invalidateQueries({ queryKey: ['inventory', 'stock'] })
}

export function useInStoreReturns(params = {}) {
  return useQuery({
    queryKey: [...listKey, params],
    queryFn: () => inventoryService.listInStoreReturns(params),
  })
}

export function useInStoreReturn(id) {
  return useQuery({
    queryKey: detailKey(id),
    queryFn: () => inventoryService.getInStoreReturn(id),
    enabled: Boolean(id),
  })
}

export function useCreateInStoreReturn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inventoryService.createInStoreReturn,
    onSuccess: () => {
      toast.success('In-store return draft saved.')
      queryClient.invalidateQueries({ queryKey: listKey })
    },
    onError: (error) => toast.error(error.message || 'Unable to create in-store return.'),
  })
}

export function useAddInStoreReturnLine(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => inventoryService.addInStoreReturnLine(id, payload),
    onSuccess: () => {
      toast.success('Return line added.')
      invalidateInStoreReturns(queryClient, id)
    },
    onError: (error) => toast.error(error.message || 'Unable to add return line.'),
  })
}

export function useRemoveInStoreReturnLine(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (lineId) => inventoryService.removeInStoreReturnLine(id, lineId),
    onSuccess: () => {
      toast.success('Return line removed.')
      invalidateInStoreReturns(queryClient, id)
    },
    onError: (error) => toast.error(error.message || 'Unable to remove return line.'),
  })
}

export function useSubmitInStoreReturn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inventoryService.submitInStoreReturn,
    onSuccess: (_, id) => {
      toast.success('In-store return submitted for approval.')
      invalidateInStoreReturns(queryClient, id)
    },
    onError: (error) => toast.error(error.message || 'Unable to submit in-store return.'),
  })
}

export function useApproveInStoreReturn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inventoryService.approveInStoreReturn,
    onSuccess: (_, id) => {
      toast.success('In-store return approved.')
      invalidateInStoreReturns(queryClient, id)
    },
    onError: (error) => toast.error(error.message || 'Unable to approve in-store return.'),
  })
}

export function useApplyInStoreReturn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inventoryService.applyInStoreReturn,
    onSuccess: (_, id) => {
      toast.success('In-store return applied to inventory.')
      invalidateInStoreReturns(queryClient, id)
    },
    onError: (error) => toast.error(error.message || 'Unable to apply in-store return.'),
  })
}

export function useCancelInStoreReturn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) => inventoryService.cancelInStoreReturn(id, { reason }),
    onSuccess: (_, variables) => {
      toast.success('In-store return cancelled.')
      invalidateInStoreReturns(queryClient, variables?.id)
    },
    onError: (error) => toast.error(error.message || 'Unable to cancel in-store return.'),
  })
}
