import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const api = read('src/api/updateDigest.ts')
const panel = read('src/components/retention/UpdateDigestPanel.vue')
const topicView = read('src/views/TopicDetailView.vue')
const collectionView = read('src/views/CollectionDetailView.vue')
const seriesView = read('src/views/CollaborationSeriesDetailView.vue')
const packageJson = read('package.json')

assert.match(api, /\/api\/v1\/users\/me\/updates/, 'update digest API must use the current-user endpoint')
assert.match(api, /adaptPage/, 'update digest API must preserve keyset page metadata and diagnostics')
assert.match(api, /safeSameSitePath/, 'update digest targets must be restricted to safe same-site paths')
assert.match(api, /UpdateDigestSourceType/, 'update digest API must model supported source types')
assert.match(api, /sourceId\?: string \| number/, 'update digest API must support source-scoped summaries')
assert.match(api, /'SERIES'/, 'update digest API must preserve collaboration series sources')
assert.match(api, /supportedSources[\s\S]*'SERIES'/, 'collaboration series must be accepted by digest response adaptation')
assert.match(api, /notificationUnread/, 'update digest API must preserve notification read facts without mutating them')
assert.match(api, /revisit/, 'update digest API must preserve read-only revisit state')
assert.doesNotMatch(api, /client\.(post|put|patch|delete)\(/, 'update digest API must remain read-only')

assert.match(panel, /data-v8-update-digest/, 'update digest panel must expose its V8 surface')
for (const state of ['loading', 'error', 'empty']) {
  assert.match(panel, new RegExp(`data-update-digest-state="${state}"`), `update digest panel must expose ${state} state`)
}
assert.match(panel, /notificationSourceUnavailable/, 'update digest panel must disclose unavailable notification projection')
assert.match(panel, /preferenceCheckDegraded/, 'update digest panel must disclose degraded preference filtering')
assert.match(panel, /不会标记通知已读，也不会完成或刷新回访项/, 'update digest panel must explain its read-only behavior')
assert.match(panel, /accountKey/, 'update digest state must be scoped to the current account')
assert.match(panel, /requestGeneration/, 'update digest panel must ignore stale requests after account changes')
assert.match(panel, /items\.value = \[\]/, 'update digest panel must clear items when account identity changes')
assert.match(panel, /nextCursor\.value = undefined/, 'update digest panel must clear cursor state when account identity changes')
assert.match(panel, /loadMoreError/, 'update digest panel must preserve current items on partial pagination failure')
assert.match(panel, /sourceType === 'SERIES'/, 'update digest panel must label collaboration series entries')
assert.doesNotMatch(panel, /mark(All)?AsRead|completeRevisit|snoozeRevisit|ignoreRevisit/, 'update digest panel must not mutate notifications or revisits')

assert.match(topicView, /UpdateDigestPanel/, 'topic detail must mount the update digest panel')
assert.match(topicView, /source-type="TOPIC"/, 'topic detail must request topic update summaries')
assert.match(topicView, /:source-id="topicSlug"/, 'topic detail must scope summaries to the current topic')
assert.match(collectionView, /UpdateDigestPanel/, 'collection detail must mount the update digest panel')
assert.match(collectionView, /source-type="COLLECTION"/, 'collection detail must request collection update summaries')
assert.match(collectionView, /:source-id="collectionId"/, 'collection detail must scope summaries to the current collection')
assert.match(seriesView, /UpdateDigestPanel/, 'collaboration series detail must mount the update digest panel')
assert.match(seriesView, /source-type="SERIES"/, 'collaboration series detail must request series update summaries')
assert.match(seriesView, /:source-id="series\.id"/, 'collaboration series detail must scope summaries to the current series')

assert.match(packageJson, /"test:v8-update-digest":\s*"node scripts\/test-v8-update-digest\.mjs"/, 'package scripts must expose the V8 update digest guard')
assert.match(packageJson, /npm run test:v8-update-digest/, 'the V8 guard chain must include the update digest guard')

console.log('V8 update digest guard passed')
