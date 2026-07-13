import api from '@/lib/api'

const salesAxios = {
  get: (url, config) => api.get(`/api/sales${url}`, config),
  post: (url, data, config) => api.post(`/api/sales${url}`, data, config),
  put: (url, data, config) => api.put(`/api/sales${url}`, data, config),
  delete: (url, config) => api.delete(`/api/sales${url}`, config),
}

// Customer Return Notes
export const createCrn = (data) => salesAxios.post('/return-notes', data)
export const getCrn = (id) => salesAxios.get(`/return-notes/${id}`)
export const getCrnsByCustomer = (customerId) => salesAxios.get('/return-notes/by-customer', { params: { customerId } })
export const getMyReturnNotes = () => salesAxios.get('/return-notes/my-returns')
export const getProductsSoldToCustomer = (customerId) => salesAxios.get(`/customers/${customerId}/products-sold`)
export const addCrnLine = (id, data) => salesAxios.post(`/return-notes/${id}/lines`, data)
export const removeCrnLine = (id, lineId) => salesAxios.delete(`/return-notes/${id}/lines/${lineId}`)
export const submitCrn = (id) => salesAxios.put(`/return-notes/${id}/submit`)
export const verifyCrn = (id) => salesAxios.put(`/return-notes/${id}/verify`)
export const rejectCrn = (id, data) => salesAxios.put(`/return-notes/${id}/reject`, data)
export const cancelCrn = (id, data) => salesAxios.put(`/return-notes/${id}/cancel`, data)

// Customer Credit
export const getCustomerCreditBalance = (customerId) => salesAxios.get(`/customer-credit/${customerId}/balance`)
export const getCustomerCreditTransactions = (customerId) => salesAxios.get(`/customer-credit/${customerId}/transactions`)
export const applyCredit = (data) => salesAxios.post('/customer-credit/apply', data)
