import api from '@/lib/api'

export async function openPdfInNewTab(url, params = {}) {
  const response = await api.get(url, { params, responseType: 'blob' })
  const blob = new Blob([response.data], { type: 'application/pdf' })
  const blobUrl = URL.createObjectURL(blob)
  window.open(blobUrl, '_blank')
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
}

export async function downloadExcel(url, params = {}, filename = 'export.xlsx') {
  const response = await api.get(url, { params, responseType: 'blob' })
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
}
