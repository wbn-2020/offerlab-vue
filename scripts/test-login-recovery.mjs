import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const read = relativePath => readFileSync(resolve(root, relativePath), 'utf8')
const authApi = read('src/api/auth.ts')
const useAuth = read('src/composables/useAuth.ts')
const loginView = read('src/views/LoginView.vue')

assert.match(authApi, /AUTH_LOGIN_TIMEOUT_MS\s*=\s*12_000/, 'login must have a bounded request timeout')
assert.match(authApi, /login:\s*\(req: LoginReq, timeoutMs = AUTH_LOGIN_TIMEOUT_MS\)/, 'login timeout must be explicit and overrideable for tests')
assert.match(authApi, /skipAuthRedirect: true,[\s\S]*timeout: timeoutMs/, 'login timeout must be applied to the axios request')
assert.match(authApi, /AUTH_PROFILE_TIMEOUT_MS\s*=\s*8_000/, 'profile hydration after login must have a shorter bounded timeout')
assert.match(useAuth, /authApi\.fetchMe\(AUTH_PROFILE_TIMEOUT_MS\)/, 'login must not hydrate the user with the shared long timeout')
assert.match(loginView, /const navigateAfterLogin = \(\) =>/, 'successful login must have one navigation completion path')
assert.match(loginView, /window\.location\.replace\(safeRedirect\(route\.query\.redirect\)\)/, 'successful login must leave the login route without waiting for an async router transition')
assert.match(loginView, /finally\s*\{[\s\S]*clearLoginFeedbackTimer\(\)[\s\S]*isLoading\.value = false/, 'all login outcomes must release the form')
assert.match(loginView, /loginFeedbackState\.value = 'timeout'/, 'login timeout state must be represented')
assert.match(loginView, /loginFeedbackState === 'timeout'[\s\S]*重试登录/, 'login timeout must expose a retry path')

console.log('login recovery guard passed')
