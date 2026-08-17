import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const detailUrl = new URL('../src/views/CollaborationNeedDetailView.vue', import.meta.url)

assert.ok(existsSync(detailUrl), 'the collaboration need detail view must exist.')

const api = read('../src/api/collaboration.ts')
const router = read('../src/router/index.ts')
const detail = read('../src/views/CollaborationNeedDetailView.vue')
const hub = read('../src/views/CollaborationHubView.vue')
const hubQuery = read('../src/composables/useCollaborationHubQuery.ts')
const mine = read('../src/components/collaboration/MyCollaborationsWorkspace.vue')
const management = read('../src/components/collaboration/CollaborationManagementWorkspace.vue')
const admin = read('../src/views/AdminCollaborationView.vue')
const packageJson = read('../package.json')

assert.match(api, /export interface CollaborationNeedEvent/, 'need event DTO must be typed.')
assert.match(api, /events:\s*\([\s\S]*\/needs\/\$\{resourceId\(needId\)\}\/events/, 'need events API must use the detail timeline endpoint.')
assert.match(router, /path:\s*'\/collaboration\/needs\/:needId'/, 'router must expose the need detail route.')
assert.match(router, /CollaborationNeedDetailView\.vue/, 'the need detail route must load the detail view.')
assert.match(detail, /collaborationApi\.needs\.detail/, 'detail view must load the need record.')
assert.match(detail, /collaborationApi\.needs\.events/, 'detail view must load the need timeline.')
assert.match(detail, /type NeedActionContext = \{[\s\S]*generation: number[\s\S]*needId: string[\s\S]*uid: string[\s\S]*isLoggedIn: boolean/, 'detail actions must carry route, account, login, and generation context.')
assert.match(detail, /const isNeedActionContextCurrent[\s\S]*context\.generation === actionGeneration[\s\S]*context\.needId === needId\.value[\s\S]*context\.uid === currentUid\.value[\s\S]*context\.isLoggedIn === authStore\.isLoggedIn/, 'detail callbacks must reject stale route or account contexts.')
for (const action of ['follow', 'claim', 'submit', 'withdraw', 'release', 'accept', 'reject']) {
  assert.match(detail, new RegExp(`beginNeedActionContext\\('${action}'`), `${action} must capture a detail action context.`)
}
assert.match(detail, /const finishNeedActionContext[\s\S]*isNeedActionContextCurrent\(context\)/, 'stale detail callbacks must not clear a newer action busy state.')
assert.match(detail, /watch\(\[needId,[\s\S]*invalidateNeedActionContext\(\)[\s\S]*resetActionForms\(\)[\s\S]*flush:\s*'sync'/, 'route and account changes must synchronously invalidate detail actions and forms.')
assert.match(detail, /deliveryPath as buildCollaborationDeliveryPath[\s\S]*const submissionPath = computed<RouteLocationRaw \| null>[\s\S]*buildCollaborationDeliveryPath\(need\.value\?\.submissionResolutionType, resolutionId\)/, 'pending submissions must use the shared canonical delivery route builder.')
assert.doesNotMatch(detail, /series\/workbench/, 'collaboration series deliveries must not route to the personal content-series workbench.')
assert.doesNotMatch(mine, /series\/workbench/, 'my collaborations must keep collaboration-series links in the collaboration domain.')
assert.doesNotMatch(management, /series\/workbench/, 'management review links must keep collaboration-series links in the collaboration domain.')
assert.match(hub, /useCollaborationHubQuery[\s\S]*activeTab\.value = contributionTab\.value \|\| hubQueryState\.tab/, 'the collaboration hub must honor stable tab deep links while prioritizing protected contribution routes.')
assert.match(hubQuery, /parseCollaborationHubQuery\(route\.query\)[\s\S]*watch\(\(\) => route\.query/, 'the collaboration hub must restore deep-link state on refresh and browser navigation.')
assert.match(hub, /collaborationApi\.series\.detail\(linkedId\)[\s\S]*collaboration-series-\$\{linkedId\}/, 'a linked collaboration series must be fetched directly and scrolled into view.')
assert.match(detail, /<form v-if="canSubmit"[\s\S]*<\/form>[\s\S]*<div v-if="canRelease \|\| canWithdraw \|\| canReviewSubmission"/, 'claimants must be able to submit or release from the same claimed-state action panel.')
assert.match(detail, /data-pending-submission-link[\s\S]*检查待验收产出/, 'reviewers must have a direct link to inspect the pending output.')
assert.match(detail, /v-model\.trim="acceptNote"[\s\S]*data-need-accept-note[\s\S]*maxlength="500"/, 'detail review must provide an inline acceptance note aligned with the backend limit.')
assert.match(api, /export interface NeedAcceptCmd[\s\S]*note\?: string/, 'accept command must support an optional note.')
assert.match(detail, /collaborationApi\.needs\.accept\(context\.targetNeedId, \{[\s\S]*note: note \|\| undefined/, 'accept must send the optional note to the API.')
assert.match(detail, /event\.note/, 'timeline events must render acceptance notes.')
assert.match(detail, /initialError: ''[\s\S]*loadMoreError: ''/, 'timeline state must separate initial and append errors.')
assert.match(detail, /if \(append\) \{[\s\S]*eventsState\.loadMoreError = message[\s\S]*\} else \{[\s\S]*eventsState\.initialError = message[\s\S]*events\.value = \[\]/, 'append timeline failures must retain loaded events.')
assert.match(detail, /eventsState\.loadMoreError[\s\S]*loadEvents\(true\)/, 'timeline append failures must offer an in-place retry.')
assert.match(detail, /协作时间线暂时不可用，需求说明和认领入口仍可正常使用。/, 'timeline failures must explain that the detail remains usable.')
assert.match(api, /export interface CollaborationNeedEventTimeline[\s\S]*historyIntegrityWarning: boolean/, 'timeline must type its public integrity-warning contract.')
assert.match(detail, /result\.data\?\.historyIntegrityWarning/, 'timeline must consume the user-safe integrity warning.')
assert.doesNotMatch(detail, /diagnostics\?\.skippedEventCount/, 'timeline must not consume internal reconciliation counts.')
assert.match(detail, /部分历史协作记录暂时无法展示。/, 'timeline must not present skipped malformed events as a normal empty state.')
assert.doesNotMatch(detail, /需求 #\{\{ need\.id \}\}/, 'public need detail must not display the long database identifier.')
assert.doesNotMatch(mine, /需求 #\{\{ need\.id \}\}/, 'participant workspace must not display the long database identifier.')
assert.doesNotMatch(mine, /需求 #\$\{need\.mergedIntoNeedId\}/, 'participant workspace must not expose merged internal identifiers in status copy.')
const loadEventsStart = detail.indexOf('const loadEvents = async')
const loadEventsEnd = detail.indexOf('const reloadAll', loadEventsStart)
assert.ok(loadEventsStart >= 0 && loadEventsEnd > loadEventsStart, 'timeline loader boundaries must remain explicit.')
assert.doesNotMatch(
  detail.slice(loadEventsStart, loadEventsEnd),
  /getErrorMessage\(/,
  'timeline failures must not surface a generic global service message.',
)

for (const [name, source] of [
  ['public needs', hub],
  ['my collaborations', mine],
  ['management workspace', management],
  ['admin review queue', admin],
]) {
  assert.match(
    source,
    /collaborationResourcePath\(['"]need['"],\s*(?:need|item)\.id\)|\/collaboration\/needs\/\$\{(?:need|item)\.id\}/,
    `${name} must link to need detail.`,
  )
}

assert.match(admin, /useAuthStore/, 'admin collaboration must read the current auth account.')
assert.match(admin, /const currentUid = computed\(\(\) => String\(authStore\.user\?\.uid \?\? ''\)\)/, 'admin collaboration must derive the current uid.')
assert.match(admin, /const isSelfSubmittedNeed[\s\S]*submittedByUid[\s\S]*claimedByUid/, 'admin need review must check both submitter and claimant ownership.')
assert.match(admin, /v-if="isSelfSubmittedNeed\(item\)"[\s\S]*不能验收自己的提交[\s\S]*<template v-else>/, 'self-submitted need review buttons must be hidden with restrained copy.')
assert.match(admin, /const reviewNeed = async \(item: CollaborationNeed[\s\S]*isSelfSubmittedNeed\(item\)[\s\S]*toast\.info\('不能验收自己的提交'\)/, 'admin review must defend against self-review in the handler too.')

assert.match(packageJson, /"test:need-detail-timeline":\s*"node scripts\/test-need-detail-timeline\.mjs"/, 'package scripts must expose the detail timeline guard.')
assert.match(packageJson, /"test:guards":\s*"[^"]*npm run test:need-detail-timeline/, 'test:guards must include the detail timeline guard.')

console.log('need detail timeline guard passed')
