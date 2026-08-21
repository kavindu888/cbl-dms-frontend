import api, { getOnce } from '@/lib/api'

function getValue(response, fallbackMessage = 'Request failed') {
  const apiResponse = response.data
  const isApiEnvelope = Object.prototype.hasOwnProperty.call(apiResponse ?? {}, 'success')
  const result = isApiEnvelope ? apiResponse?.data : apiResponse

  if (
    (isApiEnvelope && !apiResponse?.success) ||
    result?.isFailure ||
    result?.isSuccess === false
  ) {
    const validationMessage = result?.validationErrors?.[0]?.message
    throw new Error(
      validationMessage || result?.errorMessage || apiResponse?.errorMessage || fallbackMessage
    )
  }

  return result?.value ?? result ?? apiResponse
}

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

  //Stock Report
  async getStockReport(params = {}) {
    const response = await getOnce('/api/reports/stock', { params })
    const page = getValue(response, 'Unable to load stock report.')
    return {
      ...page,
      items: page?.items || [],
    }
  },
}
