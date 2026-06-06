import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const apiTarget = env.VITE_API_BASE_URL || 'https://staging.ceyservice.store'
  const proxyToApi = {
    target: apiTarget,
    changeOrigin: true,
    secure: false,
  }
  const proxyPostToApi = {
    ...proxyToApi,
    bypass: (req) => (req.method === 'POST' ? undefined : req.url),
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@stores': path.resolve(__dirname, './src/stores'),
        '@services': path.resolve(__dirname, './src/services'),
        '@types': path.resolve(__dirname, './src/types'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@assets': path.resolve(__dirname, './src/assets'),
        '@data': path.resolve(__dirname, './src/data'),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': proxyToApi,
        '/change-password': proxyPostToApi,
        '/login': proxyPostToApi,
        '/logout': proxyPostToApi,
        '/refresh': proxyPostToApi,
        '/identity-proxy': {
          ...proxyToApi,
          rewrite: (proxyPath) => proxyPath.replace(/^\/identity-proxy/, ''),
        },
        '/hubs': {
          ...proxyToApi,
          ws: true,
        },
      },
    },
  }
})
