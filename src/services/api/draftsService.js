import api, { getOnce } from '@/lib/api'

function getValue(response, fallbackMessage = 'Request failed') {
  const result = response.data

  if (result?.isSuccess === false) {
    throw new Error(result?.errorMessage || fallbackMessage)
  }

  return result?.value ?? result
}

export const draftsService = {
  async listDrafts(type) {
    const response = await getOnce('/api/v1/drafts', { params: type ? { type } : {} })
    return getValue(response, 'Unable to load drafts.') || []
  },

  async getDraft(id) {
    const response = await getOnce(`/api/v1/drafts/${id}`)
    return getValue(response, 'Unable to load draft.')
  },

  async upsertDraft(payload) {
    const response = await api.put('/api/v1/drafts', payload)
    return getValue(response, 'Unable to save draft.')
  },

  async deleteDraft(id) {
    await api.delete(`/api/v1/drafts/${id}`)
  },
}
