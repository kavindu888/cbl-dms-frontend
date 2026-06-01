import api, { getOnce } from '@/lib/api'
export const reportsService = {
  async getReports(type) {
    const response = await getOnce('/api/v1/reports', {
      params: { type },
    })
    return response.data
  },
  async generateReport(type, filters) {
    const response = await api.post(`/api/v1/reports/${type}`, filters)
    return response.data
  },
}
