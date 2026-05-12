import type { GeneratedReportDto, ReportFilterDto, ReportType } from '@/types'

import axiosInstance from './axiosInstance'

export const reportsService = {
  async getReports(type?: ReportType) {
    const response = await axiosInstance.get<GeneratedReportDto[]>('/reports', {
      params: { type },
    })
    return response.data
  },

  async generateReport(type: ReportType, filters: ReportFilterDto) {
    const response = await axiosInstance.post<GeneratedReportDto>(`/reports/${type}`, filters)
    return response.data
  },
}
