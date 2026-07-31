import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const auth = read('src/stores/auth.ts')
const guards = read('src/router/guards.ts')
const login = read('src/views/LoginView.vue')
const forbidden = read('src/views/ForbiddenView.vue')
const header = read('src/components/layout/AppHeader.vue')
const home = read('src/views/HomeView.vue')

for (const state of ['authenticated', 'expired', 'failed']) {
  has(auth, new RegExp(`'${state}'`), `auth store must model ${state}`)
}
has(auth, /sessionExpired[\s\S]*hydrateFailed/, 'auth store must expose expired and hydrate-failed states')
has(auth, /SESSION_EXPIRED_KEY[\s\S]*writeSessionExpiredMarker/, 'expired sessions must survive the login redirect once')
has(auth, /isAuthExpiredError[\s\S]*10401/, '401 business errors must expire the session')
missing(auth, /return status === 401 \|\| status === 403/, '403 must not be collapsed into session expiry')

for (const reason of ['session_expired', 'hydrate_failed', 'permission_denied', 'permission_unavailable']) {
  has(guards, new RegExp(`['"]${reason}['"]`), `router guard must route ${reason} distinctly`)
}
has(guards, /isPermissionDeniedError\(error\)\s*\?\s*'permission_denied'\s*:\s*'permission_unavailable'/, 'permission errors must distinguish denial from service failure')

has(login, /data-auth-recovery="recoveryState"/, 'login must expose a recovery state contract')
has(login, /retrySession[\s\S]*authStore\.hydrate\(\)/, 'hydrate failures must be retryable')
has(login, /safeRedirect\(route\.query\.redirect\)/, 'login recovery must preserve the original deep link')
has(forbidden, /permissionUnavailable/, 'forbidden view must model permission service unavailability')
has(forbidden, /这不代表当前账号没有权限/, 'permission service failure must not be presented as a denial')
has(forbidden, /switchAccount:\s*'1'/, 'permission recovery must keep explicit account switching')

has(header, /permissionStatus[\s\S]*'unavailable'/, 'header permissions must model service unavailability separately')
has(header, /permissionViewState[\s\S]*'empty'/, 'header permissions must distinguish a successful empty permission set')
has(header, /这不代表当前账号没有权限/, 'header permission failure must not be presented as an empty permission set')
has(header, /permissionStatus === 'unavailable'[\s\S]*@click="loadPermissions"/, 'header permission failure must be visible and retryable')
has(header, /permissionRequestGeneration/, 'header permission retries must ignore stale account responses')

const feedSelection = home.slice(home.indexOf('const setHomeFeed'), home.indexOf('let feedPreferenceRequestGeneration'))
has(feedSelection, /router\.push\(/, 'active feed changes must create browser history entries')
missing(feedSelection, /router\.replace\(/, 'active feed changes must not replace browser history')
has(home, /homeDomainLocation\(\)"[\s\S]*:replace="false"/, 'active domain links must keep push-based browser history')
has(home, /route\.query\.domain[\s\S]*router\.replace\(/, 'invalid domain URL normalization must still replace in place')

console.log('V9 session and route-state guard passed.')
