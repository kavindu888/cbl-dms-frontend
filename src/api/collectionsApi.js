import api from '@/lib/api'

// The Collections backend currently exposes both the original and v1 route groups.
export const collectionsAxios = {
  get: (url, config) => api.get(`/api/collections${url}`, config),
  post: (url, data, config) => api.post(`/api/collections${url}`, data, config),
  put: (url, data, config) => api.put(`/api/collections${url}`, data, config),
  delete: (url, config) => api.delete(`/api/collections${url}`, config),
}

const collectionsV1Axios = {
  get: (url, config) => api.get(`/api/v1/collections${url}`, config),
  post: (url, data, config) => api.post(`/api/v1/collections${url}`, data, config),
  delete: (url, config) => api.delete(`/api/v1/collections${url}`, config),
}

export function unwrapCollectionsResponse(
  response,
  fallbackMessage = 'Collections request failed'
) {
  const envelope = response?.data
  const result = envelope?.data
  if (envelope?.success === false || result?.isFailure || result?.isSuccess === false) {
    throw new Error(
      result?.validationErrors?.[0]?.message ||
        result?.errorMessage ||
        envelope?.errorMessage ||
        envelope?.message ||
        fallbackMessage
    )
  }
  return result?.value ?? result ?? envelope
}

const value = (promise, message) =>
  promise.then((response) => unwrapCollectionsResponse(response, message))

// Banks
export const listBanks = (params) =>
  value(collectionsV1Axios.get('/banks', { params }), 'Failed to load banks')
export const createBank = (data) =>
  value(collectionsV1Axios.post('/banks', data), 'Failed to add bank')
export const listBankBranches = (bankId) =>
  value(collectionsV1Axios.get(`/banks/${bankId}/branches`), 'Failed to load branches')
export const addBankBranch = (bankId, data) =>
  value(collectionsV1Axios.post(`/banks/${bankId}/branches`, data), 'Failed to add branch')
export const deactivateBank = (bankId) =>
  value(collectionsV1Axios.delete(`/banks/${bankId}`), 'Failed to deactivate bank')

// Collection sessions
export const createCollectionSession = (data) =>
  value(collectionsAxios.post('/sessions', data), 'Failed to create session')
export const getCollectionSession = (id) =>
  value(collectionsAxios.get(`/sessions/${id}`), 'Failed to load session')
export const listCollectionSessions = (params) =>
  value(collectionsAxios.get('/sessions', { params }), 'Failed to load sessions')
export const closeCollectionSession = ({ id, notes } = {}) =>
  value(
    collectionsAxios.post(`/sessions/${id}/close`, { notes: notes || null }),
    'Failed to close session'
  )
export const verifyCollectionSession = (id) =>
  value(collectionsAxios.post(`/sessions/${id}/verify`), 'Failed to verify session')

// Outstanding invoices and allocated payments
export const getOutstandingInvoices = (customerId, params) =>
  value(
    collectionsV1Axios.get('/outstanding-invoices', { params: { customerId, ...params } }),
    'Failed to load outstanding invoices'
  )
export const recordCashPayment = (data) =>
  value(collectionsV1Axios.post('/payments/cash', data), 'Failed to record cash payment')
export const recordChequePayment = (data) =>
  value(collectionsV1Axios.post('/payments/cheque', data), 'Failed to record cheque payment')
export const recordBankTransferPayment = (data) =>
  value(collectionsV1Axios.post('/payments/bank-transfer', data), 'Failed to record transfer')

// Legacy single-invoice session entry remains available to older collection screens.
export const recordCashCollection = (sessionId, data) =>
  value(collectionsAxios.post(`/sessions/${sessionId}/cash`, data), 'Failed to record cash')
export const recordCheque = (sessionId, data) =>
  value(collectionsAxios.post(`/sessions/${sessionId}/cheque`, data), 'Failed to record cheque')

// Cheques
export const listCheques = (params) =>
  value(collectionsV1Axios.get('/cheques', { params }), 'Failed to load cheques')
export const depositCheque = (id) =>
  value(collectionsV1Axios.post(`/cheques/${id}/deposit`), 'Failed to deposit cheque')
export const assignChequeToDepositBatch = (id, depositBatchId) =>
  value(
    collectionsV1Axios.post(`/cheques/${id}/deposit-batch`, { depositBatchId }),
    'Failed to assign cheque'
  )
export const clearCheque = (id) =>
  value(collectionsV1Axios.post(`/cheques/${id}/clear`), 'Failed to clear cheque')
export const bounceCheque = (id, data) =>
  value(collectionsV1Axios.post(`/cheques/${id}/bounce`, data), 'Failed to record bounce')
export const writeOffCheque = (id, data) =>
  value(collectionsV1Axios.post(`/cheques/${id}/write-off`, data), 'Failed to write off cheque')
export const cancelCheque = (id, data) =>
  value(collectionsV1Axios.post(`/cheques/${id}/cancel`, data), 'Failed to cancel cheque')

// Deposit batches
export const createDepositBatch = (data) =>
  value(collectionsAxios.post('/deposit-batches', data), 'Failed to create batch')
export const listDepositBatches = (params) =>
  value(collectionsAxios.get('/deposit-batches', { params }), 'Failed to load batches')
export const getDepositBatch = (id) =>
  value(collectionsAxios.get(`/deposit-batches/${id}`), 'Failed to load batch')
export const submitDepositBatch = (id) =>
  value(collectionsAxios.post(`/deposit-batches/${id}/submit`), 'Failed to submit batch')
export const confirmDepositBatch = (id) =>
  value(collectionsAxios.post(`/deposit-batches/${id}/confirm`), 'Failed to confirm batch')

// Customer accounts. Account detail contains both aging and recentLedger.
export const createCustomerAccount = (data) =>
  value(collectionsAxios.post('/customer-accounts', data), 'Failed to create account')
export const listCustomerAccounts = (params) =>
  value(collectionsAxios.get('/customer-accounts', { params }), 'Failed to load accounts')
export const getCustomerAccount = (customerId) =>
  value(collectionsAxios.get(`/customer-accounts/${customerId}`), 'Failed to load account')
export const getCustomerLedger = (customerId) =>
  getCustomerAccount(customerId).then((account) => account?.recentLedger || [])
export const getAgingReport = (customerId) =>
  getCustomerAccount(customerId).then((account) => account?.aging || null)
export const updateCustomerCreditLimit = (customerId, newCreditLimit) =>
  value(
    collectionsAxios.put(`/customer-accounts/${customerId}/credit-limit`, { newCreditLimit }),
    'Failed to update credit limit'
  )
export const holdCustomerAccount = (customerId) =>
  value(
    collectionsAxios.post(`/customer-accounts/${customerId}/hold`),
    'Failed to place account on hold'
  )
export const reinstateCustomerAccount = (customerId) =>
  value(
    collectionsAxios.post(`/customer-accounts/${customerId}/reinstate`),
    'Failed to reinstate account'
  )

export const getReconciliation = (sessionId) =>
  value(
    collectionsV1Axios.get(`/reconciliation/${sessionId}`),
    'Failed to load reconciliation'
  )
