import { useQuery } from '@tanstack/react-query'
import { salesService } from '@/services/api/salesService'

const staleTime = 5 * 60 * 1000

/** Cached full customer list, shared across pages instead of each one re-fetching it. */
export function useCustomers(params = {}) {
  return useQuery({
    queryKey: ['sales', 'customers', 'all', params],
    queryFn: () => salesService.listAllCustomers(params),
    staleTime,
  })
}

/** Cached lookup map of customerId -> customer, built from useCustomers(). */
export function useCustomerById(params = {}) {
  const query = useCustomers(params)
  const customerById = Object.fromEntries((query.data || []).map((customer) => [customer.id, customer]))
  return { ...query, customerById }
}
