import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const api = read('src/api/collaboration.ts')
const view = read('src/views/CollaborationActionCenterView.vue')
const center = read('src/components/collaboration/CollaborationActionCenter.vue')
const summary = read('src/components/collaboration/CollaborationActionSummary.vue')
const list = read('src/components/collaboration/CollaborationActionList.vue')
const presentation = read('src/utils/collaborationNeedPresentation.ts')
const header = read('src/components/layout/AppHeader.vue')
const router = read('src/router/index.ts')

for (const path of [
  'src/views/CollaborationActionCenterView.vue',
  'src/components/collaboration/CollaborationActionCenter.vue',
  'src/components/collaboration/CollaborationActionSummary.vue',
  'src/components/collaboration/CollaborationActionList.vue',
]) {
  assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), true, `${path} must exist.`)
}

has(api, /CollaborationActionType[\s\S]*NEED_SUBMIT[\s\S]*NEED_REVISE[\s\S]*NEED_REVIEW[\s\S]*NEED_STALLED/, 'Action API types must cover the fact-based need actions.')
has(api, /actions:\s*\{[\s\S]*actions\/summary[\s\S]*actions`/, 'Collaboration API must expose summary and list action endpoints.')
has(api, /actions:\s*\{[\s\S]*summary:\s*\(options\?: CollaborationRequestOptions\)[\s\S]*signal:\s*options\?\.signal/, 'Action requests must accept abort signals.')
has(center, /accountGeneration|summaryRequestId|listRequestId/, 'Action center must carry request generations for stale-response protection.')
has(center, /currentUid\(\)[\s\S]*authStore\.isLoggedIn/, 'Action center must bind responses to the current authenticated account.')
has(center, /AbortController[\s\S]*abortSummary[\s\S]*abortList/, 'Action center must invalidate in-flight requests on refresh or account changes.')
has(center, /watch\([\s\S]*authStore\.isLoggedIn[\s\S]*authStore\.user\?\.uid[\s\S]*authStore\.token/, 'Account switches and token replacement must restart the action center.')
has(center, /invalidateRequests[\s\S]*clearSummary[\s\S]*clearList/, 'Account changes and first-screen loads must clear old summary and list data.')
has(center, /if \(append\) loadMoreError\.value = message[\s\S]*else \{[\s\S]*listError\.value = message/, 'Initial and append failures must have separate retention semantics.')
has(center, /未读通知不会自动变成待办/, 'Action center must explicitly keep notification unread state out of the todo model.')
missing(center, /unreadCount|realtimeStore|notificationApi|通知未读/, 'Action center must not derive work from notification unread state.')
has(summary, /目前没有待处理协作事项|没有待处理协作事项/, 'Summary must distinguish a no-action empty state.')
has(summary, /行动摘要暂时无法读取|summary-state-error/, 'Summary must expose a service error state.')
has(list, /待办列表暂时无法读取|list-state-error/, 'Action list must expose a service error state.')
has(list, /loadMoreError[\s\S]*retry-more[\s\S]*load-more/, 'Action list must preserve loaded items while offering append retry.')
has(center, /collaborationActionKey\(item\)/, 'Action pagination must keep distinct actions for the same source resource.')
has(list, /:key="collaborationActionKey\(item\)"/, 'Action rows must use the action type and source identity as their Vue key.')
has(list, /collaborationActionReason\(item\)/, 'Action rows must translate backend reason codes before rendering.')
has(list, /labelCollaborationActionSourceStatus\(item\.sourceStatus\)/, 'Action rows must translate backend source statuses before rendering.')
has(presentation, /actionType.*sourceType.*sourceId[\s\S]*`\$\{item\.actionType\}:\$\{item\.sourceType\}:\$\{item\.sourceId\}`/, 'Action identity must include type, source type, and source id.')
has(presentation, /NEED_READY_FOR_SUBMISSION[\s\S]*OFFICE_HOUR_RESERVATION_AWAITS_REVIEW/, 'Known backend action reason codes must have human-readable projections.')
has(presentation, /actionSourceStatusLabels[\s\S]*PENDING:\s*'待处理'[\s\S]*labelCollaborationActionSourceStatus/, 'Known backend source statuses must have human-readable projections.')
has(view, /AppHeader[\s\S]*CollaborationActionCenter/, 'The action-center view must mount the header and action-center component.')
has(view, /<h1>协作行动中心<\/h1>[\s\S]*浏览公共共建/, 'The action center must clearly separate personal work from public browsing.')
has(view, /<h2 id="collaboration-workspace-directory-title">个人工作区<\/h2>/, 'The action center must expose a named personal workspace directory.')
has(view, /参与与跟进[\s\S]*管理与权益/, 'Frequent participation work and lower-frequency management work must be visibly separated.')
for (const path of [
  '/me/collaboration/needs/new',
  '/me/collaboration/series/submit',
  '/me/collaboration/activities/submit',
]) {
  has(view, new RegExp(`to="${path}"`), `The action center must expose protected authoring entry ${path}.`)
}
for (const tab of ['my-collaborations', 'curation', 'office-hours', 'manage', 'cases']) {
  has(view, new RegExp(`to="\\/collaboration\\?tab=${tab}"`), `The action center must retain the ${tab} workspace entry.`)
}
has(view, /to="\/collaboration\?tab=needs"/, 'The action center must provide a clear return to public need browsing.')
has(view, /:deep\(\.action-center-links\) \{[\s\S]*display: none;/, 'The legacy duplicate action-center links must be visually replaced by the grouped directory.')
has(header, /to="\/me\/collaboration"/, 'The header must expose the independent action-center entry.')
has(router, /path:\s*['"]\/me\/collaboration['"][\s\S]*name:\s*['"]CollaborationActionCenter['"]/, 'The action-center route must be mounted behind the auth guard.')
for (const [path, name] of [
  ['/me/collaboration/needs/new', 'CollaborationNeedComposer'],
  ['/me/collaboration/series/submit', 'CollaborationSeriesSubmission'],
  ['/me/collaboration/activities/submit', 'CollaborationActivitySubmission'],
]) {
  has(router, new RegExp(`path:\\s*['"]${path}['"][\\s\\S]*name:\\s*['"]${name}['"][\\s\\S]*requiresAuth:\\s*true`), `${name} must be mounted as an authenticated personal route.`)
}
missing(view, /router\/index|CollaborationHubView|CollaborationNeedDetailView|EditorView/, 'This slice must not wire router or protected neighboring views.')

console.log('V7 collaboration action center guard passed')
