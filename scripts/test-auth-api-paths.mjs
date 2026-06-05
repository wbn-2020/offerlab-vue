import { readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = resolve(root, 'src')
const authApi = readFileSync(resolve(sourceRoot, 'api/auth.ts'), 'utf8')
const clientApi = readFileSync(resolve(sourceRoot, 'api/client.ts'), 'utf8')
const opsApi = readFileSync(resolve(sourceRoot, 'api/ops.ts'), 'utf8')

function collectSourceFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = resolve(dir, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(fullPath)
    if (!entry.isFile()) return []
    return /\.(vue|ts)$/.test(entry.name) ? [fullPath] : []
  })
}

assert.match(authApi, /client\.post\('\/api\/v1\/auth\/login',\s*req\)/, 'login must call backend /api/v1/auth/login')
assert.match(authApi, /client\.post\('\/api\/v1\/auth\/register',\s*req\)/, 'register must call backend /api/v1/auth/register')
assert.match(authApi, /client\.post\('\/api\/v1\/auth\/logout'\)/, 'logout must call backend /api/v1/auth/logout')
assert.match(clientApi, /const isDevLocalBackend = \(value: string\) =>/, 'API client must normalize local dev backend URLs')
assert.match(clientApi, /import\.meta\.env\.DEV/, 'API client must only normalize local backend URLs in dev mode')
assert.match(clientApi, /export const apiBaseURL = isDevLocalBackend\(rawApiBaseURL\) \? '' : rawApiBaseURL/, 'API client must route local dev backend URLs through the Vite proxy')
assert.match(clientApi, /baseURL:\s*apiBaseURL/, 'main API client must use the normalized base URL')
assert.match(opsApi, /import client, \{ apiBaseURL, BizException, Result \} from '\.\/client'/, 'ops raw client must share the normalized base URL')
assert.match(opsApi, /baseURL:\s*apiBaseURL/, 'ops raw client must use the normalized base URL')

const violations = []
for (const file of collectSourceFiles(sourceRoot)) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(/['"`]\/api\/auth\//g)) {
    const line = text.slice(0, match.index).split(/\r?\n/).length
    violations.push(`${relative(root, file).replace(/\\/g, '/')}:${line} uses legacy /api/auth path`)
  }
}

if (violations.length > 0) {
  console.error('auth API path guard failed:')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exit(1)
}

console.log('auth API path guard passed')
