import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { salesService } from '@/services/api/salesService'

// Query keys:
// ['sales', 'crns']
// ['sales', 'crns', customerId]
// ['sales', 'crn', id]

export function useCrnById(id) {
  return useQuery({
    queryKey: ['sales', 'crn', id],
    queryFn: async () => {
      const res = await salesService.getCrn(id)
      return res
    },
    enabled: Boolean(id),
  })
}

export function useCrnsByCustomer(customerId) {
  return useQuery({
    queryKey: ['sales', 'crns', customerId],
    queryFn: async () => {
      const res = await salesService.listCrnsByCustomer(customerId)
      return res || []
    },
    enabled: Boolean(customerId),
  })
}

export function useMyReturnNotes() {
  return useQuery({
    queryKey: ['sales', 'crns', 'my-returns'],
    queryFn: async () => {
      const res = await salesService.listMyReturnNotes()
      return res || []
    },
  })
}

export function useCreateCrn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: salesService.createCrn,
    onSuccess: () => {
      toast.success('Customer Return Note created.')
      queryClient.invalidateQueries({ queryKey: ['sales', 'crns'] })
    },
    onError: (err) => {
      toast.error(err.message || 'Something went wrong while creating CRN.')
    },
  })
}

export function useAddCrnLine(crnId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => salesService.addCrnLine(crnId, data),
    onSuccess: () => {
      toast.success('Line item added to CRN.')
      queryClient.invalidateQueries({ queryKey: ['sales', 'crn', crnId] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to add line item.')
    },
  })
}

export function useRemoveCrnLine(crnId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (lineId) => salesService.removeCrnLine(crnId, lineId),
    onSuccess: () => {
      toast.success('Line item removed from CRN.')
      queryClient.invalidateQueries({ queryKey: ['sales', 'crn', crnId] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to remove line item.')
    },
  })
}

export function useSubmitCrn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: salesService.submitCrn,
    onSuccess: (data, id) => {
      toast.success('CRN submitted successfully.')
      queryClient.invalidateQueries({ queryKey: ['sales', 'crns'] })
      queryClient.invalidateQueries({ queryKey: ['sales', 'crn', id] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to submit CRN.')
    },
  })
}

export function useVerifyCrn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: salesService.verifyCrn,
    onSuccess: (data, id) => {
      toast.success('CRN verified and completed.')
      queryClient.invalidateQueries({ queryKey: ['sales', 'crns'] })
      queryClient.invalidateQueries({ queryKey: ['sales', 'crn', id] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to verify CRN.')
    },
  })
}

export function useRejectCrn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) => salesService.rejectCrn(id, { reason }),
    onSuccess: (data, { id }) => {
      toast.success('CRN rejected.')
      queryClient.invalidateQueries({ queryKey: ['sales', 'crns'] })
      queryClient.invalidateQueries({ queryKey: ['sales', 'crn', id] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to reject CRN.')
    },
  })
}

export function useCancelCrn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) => salesService.cancelCrn(id, { reason }),
    onSuccess: (data, { id }) => {
      toast.success('CRN cancelled.')
      queryClient.invalidateQueries({ queryKey: ['sales', 'crns'] })
      queryClient.invalidateQueries({ queryKey: ['sales', 'crn', id] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to cancel CRN.')
    },
  })
}
