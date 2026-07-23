import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const composable = read('src/composables/useParticipationHub.ts')
const component = read('src/components/me/ParticipationHub.vue')
const profile = read('src/views/MeProfileView.vue')
const header = read('src/components/layout/AppHeader.vue')
const knowledgeApi = read('src/api/knowledgeMaintenance.ts')
const knowledgeView = read('src/views/KnowledgeMaintenanceView.vue')
const participationNavigation = read('src/utils/participationNavigation.ts')
const packageJson = JSON.parse(read('package.json'))

for (const source of [
  'collaboration',
  'knowledge',
  'maintenance',
  'notifications',
  'updates',
  'revisits',
  'relationships',
  'reports',
]) {
  assert.match(composable, new RegExp(`'${source}'`), `V11 participation hub must register ${source}`)
  assert.match(component, new RegExp(`key: '${source}'`), `V11 participation hub must render ${source}`)
}

for (const apiCall of [
  'collaborationApi.actions.summary',
  'knowledgeMaintenanceApi.summary',
  'contentMaintenanceApi.mine',
  'notificationApi.getUnreadCount',
  'updateDigestApi.list',
  'retentionApi.listRevisits',
  'relationshipsApi.summary',
  'interactionApi.listMyReports',
]) {
  assert.match(composable, new RegExp(apiCall.replaceAll('.', '\\.')), `V11 participation hub must reuse ${apiCall}`)
}

assert.match(composable, /const PREVIEW_PAGE_SIZE = 5/, 'list sources must keep a bounded preview page')
for (const boundedCall of [
  /contentMaintenanceApi\.mine\(\s*\{\s*size:\s*PREVIEW_PAGE_SIZE\s*\},?\s*(?:\{\s*signal\s*\},?\s*)?\)/,
  /updateDigestApi\.list\(\{ size: PREVIEW_PAGE_SIZE \}\)/,
  /retentionApi\.listRevisits\(\{ status: 'OPEN', size: PREVIEW_PAGE_SIZE \}\)/,
  /interactionApi\.listMyReports\(\{ limit: PREVIEW_PAGE_SIZE \}\)/,
]) {
  assert.match(composable, boundedCall, 'V11 overview must not request an unbounded workspace list')
}

assert.match(composable, /Promise\.allSettled\(participationSourceKeys\.map/, 'sources must load independently')
assert.match(composable, /const retrySource = \(source: ParticipationSourceKey\) => loadSource\(source\)/, 'each source must support independent retry')
assert.match(component, /@click="retrySource\(entry\.key\)"/, 'each card must expose a retry action')
assert.match(component, /failedSourceCount[\s\S]*其余入口仍可使用/, 'partial failure must remain visible without hiding other sources')

assert.match(composable, /AbortController/, 'request cancellation must be supported where APIs accept a signal')
assert.match(composable, /\[\(\) => authStore\.user\?\.uid, \(\) => authStore\.token\]/, 'account changes must invalidate participation data')
assert.match(composable, /accountGeneration/, 'account changes must advance a request generation')
assert.match(composable, /const requestIsCurrent[\s\S]*accountKey === currentAccountKey\(\)/, 'stale account responses must be rejected')
assert.match(composable, /const invalidateRequests[\s\S]*abortSource\(source\)[\s\S]*clearSource\(source\)/, 'logout or account changes must clear old source state')

assert.match(profile, /import ParticipationHub from '@\/components\/me\/ParticipationHub\.vue'/)
assert.match(profile, /<ParticipationHub class="mt-6" \/>/, 'profile must mount the V11 participation hub as a separate component')
assert.match(header, /to="\/me\/relationships"[\s\S]*关系与订阅中心/, 'header user menu must include relationship workspace')

assert.match(knowledgeApi, /\| 'MAINTENANCE_TASK'/, 'knowledge action API must retain the maintenance task type')
assert.match(
  knowledgeView,
  /\{ value: 'MAINTENANCE_TASK', label: '维护任务',[\s\S]*?icon: ClipboardCheck \}/,
  'knowledge workspace must expose maintenance tasks as their own action type',
)
for (const [status, label] of [
  ['OPEN', '待处理 / 待回访'],
  ['CLAIMED', '处理中'],
  ['SUBMITTED', '待审核'],
]) {
  assert.match(
    knowledgeView,
    new RegExp(`\\{ value: '${status}', label: '${label}' \\}`),
    `knowledge workspace must preserve the ${status} maintenance status`,
  )
}
assert.match(
  knowledgeView,
  /<span>\{\{ statusLabel\(item\.status\) \}\}<\/span>/,
  'knowledge actions must render each source status instead of merging it into a generic task state',
)
assert.match(
  knowledgeView,
  /v-if="item\.canonicalRoute"[\s\S]*:to="item\.canonicalRoute"[\s\S]*data-canonical-action/,
  'knowledge actions must navigate through the backend canonical route',
)

for (const target of [
  '/me/collaboration',
  '/me/knowledge',
  '/me/maintenance',
  '/me/relationships',
  '/me/reports',
  "view: 'notifications'",
  "view: 'updates'",
  "view: 'revisits'",
]) {
  assert.match(
    `${component}\n${participationNavigation}`,
    new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `V11 overview must link to ${target}`,
  )
}

assert.match(component, /@media \(max-width: 1024px\)[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, 'tablet layout must remain usable')
assert.match(component, /@media \(max-width: 640px\)[\s\S]*grid-template-columns: 1fr/, 'mobile layout must remain usable')
assert.match(component, /\.dark \.participation-hub/, 'dark mode must be styled')
assert.match(component, /<h2 id="participation-hub-title">当前参与概览<\/h2>[\s\S]*当前待处理事项、最近更新与回访提醒。/, 'hub copy must describe the user’s current participation state')
const hubOuterStyle = component.match(/\.participation-hub \{([\s\S]*?)\n\}/)?.[1] || ''
assert.match(hubOuterStyle, /border-top:/, 'hub outer container must use a lightweight section divider')
assert.doesNotMatch(hubOuterStyle, /border-radius:|background:/, 'hub outer container must not become a card around source cards')

for (const source of ['maintenance', 'updates', 'revisits', 'reports']) {
  assert.match(
    component,
    new RegExp(`previewCountText\\(${source}\\.status, ${source}\\.data\\?\\.items \\|\\| \\[\\], ${source}\\.data\\?\\.hasMore\\)`),
    `${source} must display only its bounded page observation`,
  )
  assert.doesNotMatch(
    component,
    new RegExp(`${source}\\.data\\?\\.total`),
    `${source} must not present PageResult.total as a global count`,
  )
}
assert.match(component, /const previewLabel[\s\S]*本页可见[\s\S]*仍有更多/, 'small-page counts must disclose when more items exist')

assert.equal(
  packageJson.scripts['test:v11-participation-hub'],
  'node scripts/test-v11-participation-hub.mjs',
  'V11 participation guard script must be declared',
)
assert.match(
  packageJson.scripts['pretest:guards'],
  /npm run test:v11-participation-hub/,
  'V11 participation guard must run before test:guards',
)

console.log('V11 participation hub guard passed.')
