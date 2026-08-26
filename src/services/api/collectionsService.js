import { getOnce } from '@/lib/api'

function getValue(response, fallbackMessage) {
  const apiResponse = response.data
  const result = apiResponse?.data

  if (!apiResponse?.success || result?.isFailure) {
    const validationMessage = result?.validationErrors?.[0]?.message
    throw new Error(
      validationMessage || result?.errorMessage || apiResponse?.errorMessage || fallbackMessage
    )
  }

  return result?.value ?? result
}

export const collectionsService = {
  async getReconciliationSummary() {
    const response = await getOnce('/api/v1/collections/reconciliation')
    return response.data
  },

  async listCollectionSessions(params = {}) {
    const response = await getOnce('/api/collections/sessions', { params })
    return getValue(response, 'Unable to load collection sessions.') || []
  },

  async listCustomerAccounts(params = {}) {
    const response = await getOnce('/api/collections/customer-accounts', { params })
    return getValue(response, 'Unable to load customer accounts.') || []
  },
}
