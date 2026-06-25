import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const backendProxyTarget = process.env.VITE_API_BASE_URL || 'http://localhost:8080'
const BACKEND_PROXY_WARNING_INTERVAL_MS = 10_000
const backendUnavailableCodes = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'])
let lastBackendProxyWarningAt = 0

const warnBackendProxyError = (error: NodeJS.ErrnoException) => {
  const now = Date.now()
  if (now - lastBackendProxyWarningAt < BACKEND_PROXY_WARNING_INTERVAL_MS) return
  lastBackendProxyWarningAt = now
  const code = error.code || 'UNKNOWN'
  const hint = backendUnavailableCodes.has(code)
    ? 'OfferLab backend is not ready; start or wait for backend readiness before using API pages'
    : 'OfferLab backend proxy failed'
  console.warn(`[offerlab proxy] ${hint}: ${backendProxyTarget} (${code})`)
}

const writeBackendUnavailable = (res: unknown) => {
  const response = res as {
    headersSent?: boolean
    writableEnded?: boolean
    writeHead?: (statusCode: number, headers?: Record<string, string>) => unknown
    end?: (chunk?: string) => unknown
  } | undefined
  if (!response || response.headersSent || response.writableEnded || !response.writeHead || !response.end) return
  response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify({
    code: 'BACKEND_UNAVAILABLE',
    message: '后端服务暂时不可用，请确认 8080 readiness 后刷新页面。',
  }))
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path,
        configure: (proxy) => {
          proxy.on('error', (error, _req, res) => {
            warnBackendProxyError(error as NodeJS.ErrnoException)
            writeBackendUnavailable(res)
          })
        },
      },
    },
  },
  build: {
    target: 'ES2020',
    outDir: 'dist',
    sourcemap: false,
  },
})
