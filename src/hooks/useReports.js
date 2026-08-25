import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { inventoryService } from '@/services/api/inventoryService'
import { masterService } from '@/services/api/masterService'
import { reportsService } from '@/services/api/reportsService'

// Query keys:
// ['reports', 'stock', params]
// ['master', 'categories']
// ['inventory', 'stock-locations', params]

export function useStockReport(params = {}) {
  return useQuery({
    queryKey: ['reports', 'stock', params],
    queryFn: () => reportsService.getStockReport(params),
    placeholderData: keepPreviousData,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['master', 'categories'],
    queryFn: () => masterService.listCategories(),
    staleTime: 5 * 60_000,
  })
}

export function useReportStockLocations() {
  return useQuery({
    queryKey: ['inventory', 'stock-locations', { page: 1, pageSize: 100 }],
    queryFn: () => inventoryService.listStockLocations({ page: 1, pageSize: 100 }),
    staleTime: 5 * 60_000,
  })
}
