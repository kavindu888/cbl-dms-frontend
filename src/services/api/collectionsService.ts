import type {
  AgingAnalysisDto,
  DailyCollectionDto,
  PaginatedResponse,
  PaginationParams,
  ReconciliationSummaryDto,
} from '@/types'

import axiosInstance from './axiosInstance'

export const collectionsService = {
  async listDailyCollections(params: Partial<PaginationParams> = {}) {
    const response = await axiosInstance.get<PaginatedResponse<DailyCollectionDto>>(
      '/collections/daily',
      {
        params,
      }
    )
    return response.data
  },

  async getAgingAnalysis() {
    const response = await axiosInstance.get<AgingAnalysisDto[]>('/collections/aging')
    return response.data
  },

  async getReconciliationSummary() {
    const response = await axiosInstance.get<ReconciliationSummaryDto>(
      '/collections/reconciliation'
    )
    return response.data
  },
}
