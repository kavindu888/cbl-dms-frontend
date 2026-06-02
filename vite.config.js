import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const proxyPostToApi = {
  target: 'http://127.0.0.1:5150',
  changeOrigin: true,
  secure: false,
  bypass: (req) => (req.method === 'POST' ? undefined : req.url),
}

export default defineConfig({
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
      '/api': {
        target: 'http://127.0.0.1:5150',
        changeOrigin: true,
        secure: false,
      },
      '/change-password': proxyPostToApi,
      '/login': proxyPostToApi,
      '/logout': proxyPostToApi,
      '/refresh': proxyPostToApi,
      '/identity-proxy': {
        target: 'http://127.0.0.1:5150',
        changeOrigin: true,
        secure: false,
        rewrite: (proxyPath) => proxyPath.replace(/^\/identity-proxy/, ''),
      },
      '/hubs': {
        target: 'http://127.0.0.1:5150',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
