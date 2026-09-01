import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

const [
  client,
  auth,
  knowledge,
  growth,
  certification,
  login,
  pkgSource,
] = await Promise.all([
  read('src/api/client.ts'),
  read('src/stores/auth.ts'),
  read('src/views/KnowledgeExploreView.vue'),
  read('src/views/GrowthReportView.vue'),
  read('src/views/CertificationApplyView.vue'),
  read('src/views/LoginView.vue'),
  read('package.json'),
])

assert.match(client, /internalErrorText/, 'API errors must reject internal implementation terms')
assert.match(client, /网络连接异常，请检查网络后重试/, 'network failures must use closed user-facing copy')
assert.doesNotMatch(client, /return error\.message \|\| fallback/, 'raw runtime errors must not reach users')
assert.doesNotMatch(auth, /candidate\?\.message/, 'session hydration must not expose raw exception messages')

assert.match(knowledge, /let graphRequestId = 0/)
assert.match(knowledge, /requestId !== graphRequestId/)
assert.match(growth, /let reportRequestId = 0/)
assert.match(growth, /watch\(\[period, \(\) => authStore\.isLoggedIn\], loadReport, \{ immediate: true \}\)/)
assert.doesNotMatch(growth, /onMounted\(/, 'growth report must not duplicate its initial request')
assert.match(certification, /let eligibilityRequestId = 0/)
assert.match(certification, /let applicationsRequestId = 0/)
assert.match(certification, /watch\(\[selectedDomain, \(\) => authStore\.isLoggedIn\], refreshStageFourCertification, \{ immediate: true \}\)/)
assert.doesNotMatch(certification, /Evidence links must/, 'certification validation copy must be Chinese')
assert.match(login, /window\.location\.replace\(safeRedirect\(route\.query\.redirect\)\)/)

const pkg = JSON.parse(pkgSource)
assert.equal(pkg.scripts?.['lint:check'], 'node scripts/check-lint-baseline.mjs')
assert.equal(pkg.scripts?.['test:code-review-fixes'], 'node scripts/test-code-review-fixes.mjs')
assert.match(pkg.scripts?.['test:guards'] || '', /npm run test:code-review-fixes/)

console.log('code review fixes guard passed')
