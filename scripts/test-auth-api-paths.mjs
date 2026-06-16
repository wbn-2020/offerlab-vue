import { readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = resolve(root, 'src')
const authApi = readFileSync(resolve(sourceRoot, 'api/auth.ts'), 'utf8')
const clientApi = readFileSync(resolve(sourceRoot, 'api/client.ts'), 'utf8')
const opsApi = readFileSync(resolve(sourceRoot, 'api/ops.ts'), 'utf8')
const loginView = readFileSync(resolve(sourceRoot, 'views/LoginView.vue'), 'utf8')
const registerView = readFileSync(resolve(sourceRoot, 'views/RegisterView.vue'), 'utf8')
const navigation = readFileSync(resolve(sourceRoot, 'utils/navigation.ts'), 'utf8')

function collectSourceFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = resolve(dir, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(fullPath)
    if (!entry.isFile()) return []
    return /\.(vue|ts)$/.test(entry.name) ? [fullPath] : []
  })
}

assert.match(authApi, /export interface LoginReq \{[\s\S]*account: string[\s\S]*email\?: string[\s\S]*password: string[\s\S]*\}/, 'login request must use account while keeping email compatibility')
assert.match(authApi, /client\.post\('\/api\/v1\/auth\/login',\s*\{ \.\.\.req, email: req\.email \|\| req\.account \}\)/, 'login must call backend /api/v1/auth/login with account plus email compatibility payload')
assert.doesNotMatch(authApi, /client\.post\('\/api\/v1\/auth\/login',\s*req\)/, 'login must not keep the old email-only request contract')
assert.match(authApi, /client\.post\('\/api\/v1\/auth\/register',\s*req\)/, 'register must call backend /api/v1/auth/register')
assert.match(authApi, /client\.post\('\/api\/v1\/auth\/logout'\)/, 'logout must call backend /api/v1/auth/logout')
assert.match(clientApi, /const isDevLocalBackend = \(value: string\) =>/, 'API client must normalize local dev backend URLs')
assert.match(clientApi, /import\.meta\.env\.DEV/, 'API client must only normalize local backend URLs in dev mode')
assert.match(clientApi, /export const apiBaseURL = isDevLocalBackend\(rawApiBaseURL\) \? '' : rawApiBaseURL/, 'API client must route local dev backend URLs through the Vite proxy')
assert.match(clientApi, /baseURL:\s*apiBaseURL/, 'main API client must use the normalized base URL')
assert.match(opsApi, /import client, \{ apiBaseURL, BizException, Result \} from '\.\/client'/, 'ops raw client must share the normalized base URL')
assert.match(opsApi, /baseURL:\s*apiBaseURL/, 'ops raw client must use the normalized base URL')
assert.match(navigation, /export const safeRedirect/, 'auth recovery must share safe same-site redirect logic')
assert.match(navigation, /\/\(\?:login\|register\)/, 'safe redirect must reject auth-loop targets')
assert.match(loginView, /redirectQuery\(route\.query\.redirect\)/, 'login register link must preserve safe redirect query')
assert.match(loginView, /route\.query\.switchAccount === '1'[\s\S]*authStore\.logout\(\)/, 'login must support explicit switch-account recovery')
assert.match(registerView, /useRoute/, 'register must read redirect query')
assert.match(registerView, /redirectQuery\(route\.query\.redirect\)/, 'register login link must preserve safe redirect query')
assert.match(registerView, /router\.replace\(safeRedirect\(route\.query\.redirect\)\)/, 'register success must return to the protected task')
assert.match(registerView, /to="\/"[\s\S]*返回首页/, 'register must expose the same lightweight home navigation as login')

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
