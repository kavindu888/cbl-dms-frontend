import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'
import { useAuthStore } from '@stores/authStore'
import { getAccessToken } from '@/utils'
const STOCK_EVENT = 'StockUpdated'
const FLEET_EVENT = 'FleetUpdated'
const baseHubUrl = import.meta.env.VITE_SIGNALR_HUB_URL
class StockHubService {
  constructor() {
    Object.defineProperty(this, 'connection', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: null,
    })
  }
  async ensureConnection() {
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) {
      return null
    }
    if (!this.connection) {
      this.connection = new HubConnectionBuilder()
        .withUrl(`${baseHubUrl}/stock`, {
          accessTokenFactory: () => getAccessToken() ?? '',
        })
        .withAutomaticReconnect([0, 1000, 2500, 5000, 10000])
        .configureLogging(import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning)
        .build()
    }
    if (this.connection.state === HubConnectionState.Disconnected) {
      await this.startWithRetry()
    }
    return this.connection
  }
  async startWithRetry() {
    if (!this.connection) {
      return
    }
    let attempt = 0
    while (this.connection.state === HubConnectionState.Disconnected && attempt < 5) {
      try {
        await this.connection.start()
        return
      } catch {
        attempt += 1
        const delay = Math.min(1000 * 2 ** attempt, 30000)
        await new Promise((resolve) => window.setTimeout(resolve, delay))
      }
    }
  }
  async onStockUpdate(callback) {
    const connection = await this.ensureConnection()
    if (!connection) {
      return () => undefined
    }
    connection.on(STOCK_EVENT, callback)
    return () => {
      connection.off(STOCK_EVENT, callback)
    }
  }
  async onFleetUpdate(callback) {
    const connection = await this.ensureConnection()
    if (!connection) {
      return () => undefined
    }
    connection.on(FLEET_EVENT, callback)
    return () => {
      connection.off(FLEET_EVENT, callback)
    }
  }
  async disconnect() {
    if (!this.connection) {
      return
    }
    await this.connection.stop()
    this.connection = null
  }
}
export const stockHubService = new StockHubService()
