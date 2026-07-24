import api from '@/lib/api'

const collectionsAxios = {
  get: (url, config) => api.get(`/api/collections${url}`, config),
  post: (url, data, config) => api.post(`/api/collections${url}`, data, config),
  put: (url, data, config) => api.put(`/api/collections${url}`, data, config),
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

export const createCollectionSession = (data) =>
  value(collectionsAxios.post('/sessions', data), 'Failed to create session')
export const getCollectionSession = (id) =>
  value(collectionsAxios.get(`/sessions/${id}`), 'Failed to load session')
export const listCollectionSessions = (params) =>
  value(collectionsAxios.get('/sessions', { params }), 'Failed to load sessions')
export const closeCollectionSession = ({ id, notes }) =>
  value(
    collectionsAxios.post(`/sessions/${id}/close`, { notes: notes || null }),
    'Failed to close session'
  )
export const verifyCollectionSession = (id) =>
  value(collectionsAxios.post(`/sessions/${id}/verify`), 'Failed to verify session')
export const recordCashCollection = (sessionId, data) =>
  value(collectionsAxios.post(`/sessions/${sessionId}/cash`, data), 'Failed to record cash')
export const recordCheque = (sessionId, data) =>
  value(collectionsAxios.post(`/sessions/${sessionId}/cheque`, data), 'Failed to record cheque')

export const listCheques = (params) =>
  value(collectionsAxios.get('/cheques', { params }), 'Failed to load cheques')
export const depositCheque = (id, data) =>
  value(collectionsAxios.post(`/cheques/${id}/deposit-batch`, data), 'Failed to assign cheque')
export const clearCheque = (id) =>
  value(collectionsAxios.post(`/cheques/${id}/clear`), 'Failed to clear cheque')
export const bounceCheque = (id, data) =>
  value(collectionsAxios.post(`/cheques/${id}/bounce`, data), 'Failed to record bounce')
export const cancelCheque = (id, data) =>
  value(collectionsAxios.post(`/cheques/${id}/cancel`, data), 'Failed to cancel cheque')

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

export const createCustomerAccount = (data) =>
  value(collectionsAxios.post('/customer-accounts', data), 'Failed to create account')
export const listCustomerAccounts = (params) =>
  value(collectionsAxios.get('/customer-accounts', { params }), 'Failed to load accounts')
export const getCustomerAccount = (customerId) =>
  value(collectionsAxios.get(`/customer-accounts/${customerId}`), 'Failed to load account')
export const getOutstandingInvoices = (customerId) =>
  value(
    collectionsAxios.get(`/customer-accounts/${customerId}/outstanding-invoices`),
    'Failed to load outstanding invoices'
  )
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

export const getReconciliation = (sessionId) => getCollectionSession(sessionId)
