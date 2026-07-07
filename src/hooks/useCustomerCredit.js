import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as salesApi from '@/api/salesApi'

// Query keys:
// ['sales', 'customer-credit', customerId, 'balance']
// ['sales', 'customer-credit', customerId, 'transactions']

export function useCustomerCreditBalance(customerId) {
  return useQuery({
    queryKey: ['sales', 'customer-credit', customerId, 'balance'],
    queryFn: async () => {
      const res = await salesApi.getCustomerCreditBalance(customerId)
      return res
    },
    enabled: Boolean(customerId),
  })
}

export function useCustomerCreditTransactions(customerId) {
  return useQuery({
    queryKey: ['sales', 'customer-credit', customerId, 'transactions'],
    queryFn: async () => {
      const res = await salesApi.getCustomerCreditTransactions(customerId)
      return res || []
    },
    enabled: Boolean(customerId),
  })
}

export function useApplyCredit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: salesApi.applyCredit,
    onSuccess: (data, variables) => {
      toast.success('Customer credit applied successfully.')
      queryClient.invalidateQueries({
        queryKey: ['sales', 'customer-credit', variables.customerId],
      })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to apply credit.')
    },
  })
}
