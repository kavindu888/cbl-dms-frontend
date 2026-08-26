import { useQuery } from '@tanstack/react-query'
import { masterService } from '@/services/api/masterService'

const staleTime = 5 * 60 * 1000

/**
 * Cached full product catalog. Prefer this over calling masterService.listAllProducts
 * directly in a useEffect — every page consuming this hook shares the same fetch/cache
 * instead of refetching the whole catalog on every mount.
 */
export function useProducts(params = {}) {
  return useQuery({
    queryKey: ['master', 'products', 'all', params],
    queryFn: () => masterService.listAllProducts(params),
    staleTime,
  })
}

/**
 * Cached lookup map of productId -> product, built from useProducts(). Use this in
 * place of Promise.allSettled(ids.map(id => masterService.getProduct(id))).
 */
export function useProductById(params = {}) {
  const query = useProducts(params)
  const productById = Object.fromEntries((query.data || []).map((product) => [product.id, product]))
  return { ...query, productById }
}

/**
 * Fetches a specific set of product ids in one batched request. Use when the full
 * catalog isn't already cached (e.g. a small, known list of ids) instead of one
 * masterService.getProduct call per id.
 */
export function useProductsByIds(ids = []) {
  const distinctIds = [...new Set((ids || []).filter(Boolean))].sort()
  return useQuery({
    queryKey: ['master', 'products', 'by-ids', distinctIds],
    queryFn: () => masterService.getProductsByIds(distinctIds),
    enabled: distinctIds.length > 0,
    staleTime,
  })
}
