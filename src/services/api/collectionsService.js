import api, { getOnce } from '@/lib/api'

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

  // Admin: preview/apply recalculating a session's TotalCash/TotalCheques/CollectionCount from
  // its own Collection rows, for sessions left inflated by the now-fixed cash draft submit/discard
  // defect (see CollectionSession.RemoveDraftCollection on the backend). Safe to re-run — sessions
  // whose totals already match their rows just don't appear in the result.
  async previewSessionCashTotalsFix() {
    const response = await getOnce('/api/collections/sessions/admin/cash-totals-fix/preview')
    return getValue(response, 'Unable to preview the cash totals fix.')
  },
  async applySessionCashTotalsFix() {
    const response = await api.post('/api/collections/sessions/admin/cash-totals-fix/apply')
    return getValue(response, 'Unable to apply the cash totals fix.')
  },
}
