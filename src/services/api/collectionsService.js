import { getOnce } from '@/lib/api'
export const collectionsService = {
  async listDailyCollections(params = {}) {
    const response = await getOnce('/api/v1/collections/daily', {
      params,
    })
    return response.data
  },
  async getAgingAnalysis() {
    const response = await getOnce('/api/v1/collections/aging')
    return response.data
  },
  async getReconciliationSummary() {
    const response = await getOnce('/api/v1/collections/reconciliation')
    return response.data
  },
}
