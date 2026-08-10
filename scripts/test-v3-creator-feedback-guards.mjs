import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)
const hasText = (source, text, message) => assert.ok(source.includes(text), message)
const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  assert.notEqual(startIndex, -1, `missing section start: ${start}`)
  assert.notEqual(endIndex, -1, `missing section end: ${end}`)
  return source.slice(startIndex, endIndex)
}

const packageJson = JSON.parse(read('package.json'))
const apiTypes = read('src/api/types.ts')
const creatorFeedbackApi = read('src/api/creatorFeedback.ts')
const notificationAdapters = read('src/api/adapters.ts')
const notificationsView = read('src/views/NotificationsView.vue')
const growthProfileView = read('src/views/GrowthProfileView.vue')
const growthReportView = read('src/views/GrowthReportView.vue')
const creatorCurationApiSurface = section(creatorFeedbackApi, 'const safeSameSitePath', 'const adaptFeedbackWindow')
const notificationCurationSurface = section(notificationAdapters, 'export function adaptNotification', 'function notificationText')
const operationCurationService = read('../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/application/OperationCurationService.java')
const notificationEventListener = read('../offerlab-java/community-domain-notification/src/main/java/com/offerlab/community/notification/application/NotificationEventListener.java')
const creatorCurationFeedbackService = read('../offerlab-java/community-domain-analytics/src/main/java/com/offerlab/community/analytics/application/CreatorCurationFeedbackService.java')

assert.equal(
  existsSync(new URL('test-v3-creator-feedback-guards.mjs', import.meta.url)),
  true,
  'V3 creator feedback guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:v3-creator-feedback-guards'],
  'node scripts/test-v3-creator-feedback-guards.mjs',
  'package.json must expose the V3 creator feedback guard.',
)
hasText(
  packageJson.scripts['test:guards'] || '',
  'npm run test:v3-creator-feedback-guards',
  'package.json test:guards must include the V3 creator feedback guard.',
)

for (const typeName of [
  'CreatorCurationFeedback',
  'CreatorCurationFeedbackSummary',
  'CreatorCurationMetrics',
]) {
  has(apiTypes, new RegExp(`export interface ${typeName}`), `API types must expose ${typeName}.`)
}

for (const typeName of [
  'CurationFeedbackSource',
  'DisplayableCurationFeedbackSource',
]) {
  has(apiTypes, new RegExp(`export type ${typeName}`), `API types must expose ${typeName}.`)
}
const displayableSourceType = section(apiTypes, 'export type DisplayableCurationFeedbackSource', 'export interface CreatorCurationMetrics')
missing(
  displayableSourceType,
  /\|\s*string/,
  'DisplayableCurationFeedbackSource must be a strict whitelist instead of accepting arbitrary strings.',
)

for (const field of [
  'contentTitle',
  'placementLabel',
  'reasonText',
  'href',
  'triggeredAt',
  'source',
  'displayableSource',
  'publicMetrics',
]) {
  has(apiTypes, new RegExp(`${field}\\??:`), `CreatorCurationFeedback must expose ${field}.`)
}
has(apiTypes, /items:\s*CreatorCurationFeedback\[\]/, 'CreatorCurationFeedbackSummary must expose feedback items.')
has(apiTypes, /recentItems:\s*CreatorCurationFeedback\[\]/, 'CreatorCurationFeedbackSummary must expose recent display items.')
has(apiTypes, /degraded:\s*boolean/, 'CreatorCurationFeedbackSummary must expose degraded state.')
has(apiTypes, /fallbackReason\?:\s*string/, 'CreatorCurationFeedbackSummary must expose fallback reason.')

for (const exportName of [
  'emptyCreatorCurationFeedbackSummary',
  'adaptCreatorCurationFeedback',
  'adaptCreatorCurationFeedbackSummary',
  'isDisplayableCurationFeedbackSource',
]) {
  hasText(creatorFeedbackApi, `export const ${exportName}`, `creator feedback API must export ${exportName}.`)
}
hasText(
  creatorFeedbackApi,
  '/api/v1/creator-growth/curation-feedback',
  'creator feedback API must read the backend curation feedback summary.',
)
has(
  creatorFeedbackApi,
  /shouldUseDemoFallback[\s\S]*emptyCreatorCurationFeedbackSummary\('backend_not_connected'\)/,
  'curation feedback fallback must be an empty degraded summary, not fake feedback items.',
)
missing(
  creatorFeedbackApi,
  /curation-feedback[\s\S]*localDemoResult|demoCreator.*Curation|demoCurationFeedback/i,
  'curation feedback API must not return demo curation feedback items.',
)
missing(
  creatorCurationApiSurface,
  /href:\s*safeText\(raw\?\.href\)|href:\s*String\(raw\?\.href\)/,
  'curation feedback href must be normalized to safe same-site paths.',
)
hasText(
  creatorFeedbackApi,
  'isSafeCurationFeedbackHref',
  'curation feedback API must reject API endpoints and unsafe paths before exposing RouterLink hrefs.',
)
hasText(
  creatorFeedbackApi,
  "!path.startsWith('/api/')",
  'curation feedback href guard must reject backend API paths.',
)
hasText(
  creatorFeedbackApi,
  'const toTimestamp',
  'creator feedback API must parse backend ISO/LocalDateTime values instead of treating timestamps as numbers only.',
)
has(
  creatorCurationApiSurface,
  /triggeredAt:\s*toTimestamp\(/,
  'creator curation feedback triggeredAt must parse LocalDateTime/ISO values deterministically.',
)
has(
  creatorCurationApiSurface,
  /const recentItems = toList\(raw\?\.recentItems/,
  'creator curation feedback summary must prefer backend recentItems before deriving a fallback list.',
)
hasText(
  creatorFeedbackApi,
  'isDemoFallbackEnabled',
  'creator feedback demo fallback must require an explicit local/demo switch.',
)
has(
  creatorFeedbackApi,
  /isDemoFallbackEnabled\(\)[\s\S]*status === 404/,
  'creator feedback 404 demo fallback must be gated by the explicit local/demo switch.',
)
missing(
  creatorFeedbackApi,
  /if\s*\(shouldUseDemoFallback\(error\)\)\s*return localDemoResult/,
  'creator feedback endpoints must not return demo data in production just because a 404 occurred.',
)
hasText(
  notificationAdapters,
  'isDisplayableCurationFeedbackSource',
  'notification curation feedback adapter must reuse the displayable source guard.',
)
hasText(
  notificationAdapters,
  'safeCurationFeedbackText',
  'notification curation feedback adapter must reuse the private-training text blocker.',
)
has(
  notificationCurationSurface,
  /contentTitle:\s*safeCurationFeedbackText/,
  'notification curation feedback content title must filter CodeCoachAI/private-training text.',
)
has(
  notificationCurationSurface,
  /placementLabel:\s*safeCurationFeedbackText/,
  'notification curation feedback placement label must filter CodeCoachAI/private-training text.',
)
has(
  notificationCurationSurface,
  /reasonText:\s*safeCurationFeedbackText/,
  'notification curation feedback reason text must filter CodeCoachAI/private-training text.',
)
has(
  notificationCurationSurface,
  /const contentTitle\s*=\s*safeCurationFeedbackText/,
  'notification list summary must filter curation feedback content title before rendering.',
)
has(
  notificationCurationSurface,
  /const placementLabel\s*=\s*safeCurationFeedbackText/,
  'notification list summary must filter curation feedback placement label before rendering.',
)
missing(
  notificationCurationSurface,
  /displayableSource:\s*source/,
  'notification curation feedback payload must not expose unfiltered source values as displayableSource.',
)
missing(
  operationCurationService,
  /entrance\("\/api\/v1\//,
  'creator curation feedback events must use front-end routes, not backend API paths.',
)
missing(
  notificationEventListener,
  /content\.put\("href",\s*event\.getEntrance\(\)\)|String href = event\.getEntrance\(\)/,
  'notification curation feedback href must not blindly expose backend API entrances.',
)
hasText(
  creatorCurationFeedbackService,
  'sanitizeFeedbackHref',
  'creator curation feedback service must sanitize facade entrances before returning href.',
)

for (const snippet of [
  'creator_curation_feedback',
  'contentTitle',
  'placementLabel',
  'reasonText',
  'href',
  'triggeredAt',
]) {
  hasText(notificationAdapters, snippet, `notification adapter must preserve curation feedback payload field ${snippet}.`)
}

for (const snippet of [
  'curationFeedbackPayload',
  '入选反馈',
  '内容标题',
  '收录位置',
  '收录理由',
  '查看入口',
  '触发时间',
]) {
  hasText(notificationsView, snippet, `NotificationsView must render system curation feedback snippet: ${snippet}.`)
}

const creatorDataSurface = `${growthProfileView}\n${growthReportView}`
missing(
  growthProfileView,
  /item\.href\s*\|\|\s*`\/post\/\$\{item\.contentId\}`/,
  'GrowthProfileView must not synthesize unchecked curation feedback links in the template.',
)
for (const snippet of [
  'creatorFeedbackApi.getCurationFeedbackSummary',
  'recentCurationFeedbackItems',
  '最近入选反馈',
  '收录位置',
  '收录理由',
]) {
  hasText(creatorDataSurface, snippet, `Growth creator data surface must include ${snippet}.`)
}
has(
  growthProfileView,
  /<section v-if="recentCurationFeedbackItems\.length"[^>]*id="curation-feedback"/,
  'GrowthProfileView must hide the curation feedback section when no public feedback is available.',
)

const p0Surface = `${creatorCurationApiSurface}\n${notificationCurationSurface}\n${notificationsView}\n${creatorDataSurface}`
for (const forbidden of [
  'CodeCoachAI',
  '私人训练',
  '私教',
  '训练计划',
  '模拟面试',
  '投递任务',
  '投递进度',
  '简历匹配',
  '简历/JD',
  'JD 分析',
  '积分',
  '等级',
  '商业化',
  '付费',
  '会员',
  '订阅',
  '收益',
]) {
  missing(p0Surface, new RegExp(forbidden.replace('/', '\\/'), 'i'), `V3 creator feedback P0 must not introduce forbidden capability/copy: ${forbidden}`)
}

console.log('V3 creator feedback guards passed.')
