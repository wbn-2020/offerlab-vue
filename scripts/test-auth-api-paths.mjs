import { readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = resolve(root, 'src')
const authApi = readFileSync(resolve(sourceRoot, 'api/auth.ts'), 'utf8')
const clientApi = readFileSync(resolve(sourceRoot, 'api/client.ts'), 'utf8')
const opsApi = readFileSync(resolve(sourceRoot, 'api/ops.ts'), 'utf8')
const loginView = readFileSync(resolve(sourceRoot, 'views/LoginView.vue'), 'utf8')
const registerView = readFileSync(resolve(sourceRoot, 'views/RegisterView.vue'), 'utf8')
const welcomeView = readFileSync(resolve(sourceRoot, 'views/WelcomeView.vue'), 'utf8')
const navigation = readFileSync(resolve(sourceRoot, 'utils/navigation.ts'), 'utf8')
const compiledNavigation = ts.transpileModule(navigation, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
})
const navigationSandbox = { exports: {}, URL }
vm.runInNewContext(compiledNavigation.outputText, navigationSandbox)
const { safeRedirect } = navigationSandbox.exports

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
assert.match(authApi, /client\.post\('\/api\/v1\/auth\/login',\s*\{ \.\.\.req, email: req\.email \|\| req\.account \},\s*\{[\s\S]*skipAuthRedirect: true,[\s\S]*\}\)/, 'login must call backend /api/v1/auth/login without treating invalid credentials as an expired session')
assert.doesNotMatch(authApi, /client\.post\('\/api\/v1\/auth\/login',\s*req\)/, 'login must not keep the old email-only request contract')
assert.match(authApi, /client\.post\('\/api\/v1\/auth\/register',\s*req,\s*\{[\s\S]*skipAuthRedirect: true,[\s\S]*\}\)/, 'register must call backend /api/v1/auth/register without entering session-expiry handling')
assert.match(authApi, /client\.post\('\/api\/v1\/auth\/logout'\)/, 'logout must call backend /api/v1/auth/logout')
assert.match(clientApi, /const isDevLocalBackend = \(value: string\) =>/, 'API client must normalize local dev backend URLs')
assert.match(clientApi, /import\.meta\.env\.DEV/, 'API client must only normalize local backend URLs in dev mode')
assert.match(clientApi, /export const apiBaseURL = isDevLocalBackend\(rawApiBaseURL\) \? '' : rawApiBaseURL/, 'API client must route local dev backend URLs through the Vite proxy')
assert.match(clientApi, /baseURL:\s*apiBaseURL/, 'main API client must use the normalized base URL')
assert.match(opsApi, /import client, \{ apiBaseURL, BizException, Result \} from '\.\/client'/, 'ops raw client must share the normalized base URL')
assert.match(opsApi, /baseURL:\s*apiBaseURL/, 'ops raw client must use the normalized base URL')
assert.match(navigation, /export const safeRedirect/, 'auth recovery must share safe same-site redirect logic')
assert.match(navigation, /\/\(\?:login\|register\|welcome\)/, 'safe redirect must reject auth and onboarding loop targets')
assert.equal(
  safeRedirect('/notifications?tab=unread#notification-42'),
  '/notifications?tab=unread#notification-42',
  'safe redirect must preserve notification pathname, search, and hash',
)
assert.equal(safeRedirect('//evil.example/steal#notification-42', '/fallback'), '/fallback', 'safe redirect must reject protocol-relative targets')
assert.equal(safeRedirect('/\\evil.example/steal#notification-42', '/fallback'), '/fallback', 'safe redirect must reject slash-backslash targets')
assert.equal(safeRedirect('/login?redirect=%2Fnotifications#notification-42', '/fallback'), '/fallback', 'safe redirect must reject login loops')
assert.equal(safeRedirect('/register#notification-42', '/fallback'), '/fallback', 'safe redirect must reject register loops')
assert.equal(safeRedirect('/welcome?redirect=%2Fwelcome', '/fallback'), '/fallback', 'safe redirect must reject onboarding loops')
assert.equal(
  safeRedirect('/notifications?tab=unread&access_token=secret&sessionId=abc&debug=1#notification-42'),
  '/notifications?tab=unread#notification-42',
  'safe redirect must remove sensitive query parameters without dropping the notification hash',
)
assert.match(loginView, /redirectQuery\(route\.query\.redirect\)/, 'login register link must preserve safe redirect query')
assert.match(loginView, /route\.query\.switchAccount === '1'[\s\S]*authStore\.logout\(\)/, 'login must support explicit switch-account recovery')
assert.match(registerView, /useRoute/, 'register must read redirect query')
assert.match(registerView, /redirectQuery\(route\.query\.redirect\)/, 'register login link must preserve safe redirect query')
// 注册成功后先进轻量兴趣引导(/welcome)，并透传经 safeRedirect 清洗的目标；引导完成或跳过后由 WelcomeView 返回受保护任务。
assert.match(registerView, /safeRedirect\(route\.query\.redirect\)/, 'register success must sanitize the redirect target before handing off to onboarding')
assert.match(registerView, /router\.replace\(\{ path: '\/welcome'/, 'register success must route through the lightweight onboarding step')
assert.match(welcomeView, /router\.replace\(safeRedirect\(route\.query\.redirect\)\)/, 'welcome onboarding must return to the protected task after finishing or skipping')
assert.match(registerView, /beginWelcomeOnboarding\(authStore\.user\.uid\)/, 'registration must bind welcome access to the newly created account')
assert.match(welcomeView, /userApi\.getIntent\(owner\.uid\)/, 'welcome onboarding must load existing intent for the captured account before updating it')
assert.match(welcomeView, /interface WelcomeOperationOwner \{[\s\S]*uid: string[\s\S]*sessionGeneration: number/, 'welcome onboarding writes must capture the authenticated account and session generation')
assert.match(welcomeView, /const existing = \(await userApi\.getIntent\(owner\.uid\)\)\.data[\s\S]*requireCurrentWelcomeOperation\(owner\)/, 'welcome onboarding must reject a stale account after loading existing intent')
assert.match(welcomeView, /const intent = await mergeIntent\(owner\)[\s\S]*requireCurrentWelcomeOperation\(owner\)[\s\S]*await userApi\.updateIntent\(intent\)[\s\S]*requireCurrentWelcomeOperation\(owner\)/, 'welcome onboarding must not write or navigate after the login session changes')
assert.match(welcomeView, /error instanceof WelcomeOperationSupersededError[\s\S]*return/, 'superseded welcome requests must exit without stale-session error feedback')
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
