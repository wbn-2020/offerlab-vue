import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

const [
  authApi,
  useAuth,
  login,
  register,
  about,
  ops,
  postDetail,
  router,
  home,
] = await Promise.all([
  read('src/api/auth.ts'),
  read('src/composables/useAuth.ts'),
  read('src/views/LoginView.vue'),
  read('src/views/RegisterView.vue'),
  read('src/views/AboutView.vue'),
  read('src/views/OpsView.vue'),
  read('src/views/PostDetailView.vue'),
  read('src/router/index.ts'),
  read('src/views/HomeView.vue'),
])

assert.match(authApi, /termsAccepted:\s*boolean/)
assert.match(authApi, /privacyAccepted:\s*boolean/)
assert.match(authApi, /CURRENT_TERMS_VERSION\s*=\s*'2026-09-01'/)
assert.match(authApi, /CURRENT_PRIVACY_VERSION\s*=\s*'2026-09-01'/)

assert.match(useAuth, /const activateRegisteredSession = async/)
assert.match(useAuth, /if \(isTransientProfileFailure\(error\)\)/)
assert.match(useAuth, /if \(status > 0\)\s*\{\s*return status >= 500\s*\}/s)
assert.match(useAuth, /\['ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK'\]/)
assert.doesNotMatch(
  useAuth,
  /return !candidate\?\.response\s*\|\|/,
  'business 4xx errors must not be treated as transient network failures',
)

assert.match(login, /password:\s*z\.string\(\)\.min\(1,\s*'请输入密码'\)/)
assert.doesNotMatch(login, /password:\s*z\.string\(\)\.min\((?:6|8)/)
assert.match(login, /getRateLimitRetryAfterSeconds\(error\)/)
assert.match(login, /操作过于频繁，请 \$\{retryAfterSeconds\} 秒后重试/)

assert.match(register, /v-model="form\.agreements"/)
assert.match(register, /to="\/about#terms"/)
assert.match(register, /to="\/about#privacy"/)
assert.match(register, /fieldErrors/)
assert.match(register, /getRateLimitRetryAfterSeconds\(error\)/)
assert.match(about, /id="terms"/)
assert.match(about, /id="privacy"/)

assert.match(ops, /const localizeOpsText =/)
assert.match(ops, /系统返回了未本地化的诊断信息，请查看审计日志/)
assert.doesNotMatch(ops, /\{\{\s*(?:item|record)\.errorMessage\s*\|\|/)
assert.doesNotMatch(ops, /\{\{\s*selectedAiTaskDetail\.task\.errorMessage\s*\|\|/)

assert.match(postDetail, /'前往评论区'/)
assert.doesNotMatch(postDetail, /成为第一个参与讨论的人/)
assert.equal((postDetail.match(/还没有评论，来分享你的看法吧/g) || []).length, 1)

assert.match(router, /path:\s*'\/admin'/)
assert.match(router, /redirect:\s*'\/admin\/operations'/)
assert.doesNotMatch(
  home,
  /watch\(\s*\(\)\s*=>\s*authStore\.isLoggedIn[\s\S]{0,300}loadFeed/,
  'authentication changes must not trigger a duplicate initial feed request',
)

console.log('prelaunch review fixes guard passed')
