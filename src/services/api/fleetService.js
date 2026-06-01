import { getOnce } from '@/lib/api'
export const fleetService = {
  async listVehicles(params = {}) {
    const response = await getOnce('/api/v1/fleet/vehicles', {
      params,
    })
    return response.data
  },
  async listRouteLogs(params = {}) {
    const response = await getOnce('/api/v1/fleet/routes', {
      params,
    })
    return response.data
  },
}
