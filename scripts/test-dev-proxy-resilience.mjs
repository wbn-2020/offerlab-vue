import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
const packageJson = readFileSync(new URL('../package.json', import.meta.url), 'utf8')
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')

assert.match(viteConfig, /const backendProxyTarget = process\.env\.VITE_API_BASE_URL \|\| 'http:\/\/localhost:8080'/, 'Vite proxy must honor VITE_API_BASE_URL before falling back to localhost:8080')
assert.match(viteConfig, /BACKEND_PROXY_WARNING_INTERVAL_MS\s*=\s*10_000/, 'Vite proxy warnings must be throttled to avoid terminal spam')
assert.match(viteConfig, /backendUnavailableCodes[\s\S]*ECONNREFUSED[\s\S]*ECONNRESET[\s\S]*ETIMEDOUT/, 'Vite proxy must classify common backend-unavailable errors')
assert.match(viteConfig, /proxy\.on\('error', \(error, _req, res\) => \{[\s\S]*warnBackendProxyError[\s\S]*writeBackendUnavailable\(res\)/, 'Vite proxy must handle backend connection errors explicitly')
assert.match(viteConfig, /writeHead\(503,\s*\{ 'Content-Type': 'application\/json; charset=utf-8' \}\)/, 'Vite proxy fallback must return a UTF-8 JSON 503 response')
assert.match(viteConfig, /BACKEND_UNAVAILABLE/, 'Vite proxy fallback must expose a stable backend-unavailable code')
assert.match(viteConfig, /请确认 8080 readiness 后刷新页面/, 'Vite proxy fallback must give a clear Chinese readiness hint')

assert.match(packageJson, /"test:dev-proxy-resilience"/, 'package scripts must expose the dev proxy resilience guard')
assert.match(packageJson, /npm run test:dev-proxy-resilience/, 'test:guards must include the dev proxy resilience guard')

assert.match(readme, /后端未就绪时，Vite proxy 会返回 503 JSON 并节流终端提示/, 'README must document backend-first startup behavior')

console.log('dev proxy resilience guard passed')
