import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const api = read('src/api/communitySpaces.ts')
const panel = read('src/components/community/CommunitySpacePanel.vue')
const topicView = read('src/views/TopicDetailView.vue')
const collectionView = read('src/views/CollectionDetailView.vue')
const seriesView = read('src/views/CollaborationSeriesDetailView.vue')
const packageJson = read('package.json')

for (const endpoint of [
  '/api/v1/community-spaces/topics/',
  '/api/v1/community-spaces/collections/',
  '/api/v1/community-spaces/series/',
]) {
  assert.match(api, new RegExp(endpoint.replaceAll('/', '\\/')), `community space API must expose ${endpoint}`)
}
assert.match(api, /CommunitySpaceVisibility/, 'community space API must model public visibility explicitly')
assert.match(api, /visibility.*=== 'PUBLIC'/s, 'community space adapter must default to a non-public state')
assert.match(api, /safePath/, 'community space paths must be restricted to safe same-site paths')
assert.match(api, /degradedSources/, 'community space API must preserve degraded auxiliary sources')
assert.match(api, /Math\.min\(size,\s*MAX_PAGE_SIZE\)/, 'community space API must cap page size')
assert.doesNotMatch(api, /safeStorage|localStorage|sessionStorage/, 'public community spaces must not invent local fallback data')

assert.match(panel, /data-v8-community-space/, 'community space panel must expose its V8 surface')
for (const state of ['loading', 'error', 'empty']) {
  assert.match(panel, new RegExp(`data-community-space-state="${state}"`), `community space panel must expose ${state} state`)
}
assert.match(panel, /degradedSources/, 'community space panel must disclose partial source failures')
assert.match(panel, /space\.visibility === 'PUBLIC'/, 'community space panel must stop rendering non-public projections')
assert.match(panel, /私密、草稿及治理隐藏项不会出现在此处/, 'community space panel must explain public visibility')
assert.match(panel, /identityKey/, 'community space requests must be isolated by account identity')
assert.match(panel, /requestGeneration/, 'community space panel must ignore stale requests')
assert.match(panel, /nextCursor/, 'community space panel must use server keyset cursors')
assert.match(panel, /loadMoreError/, 'community space panel must preserve current data on partial pagination failure')

assert.match(topicView, /CommunitySpacePanel/, 'topic detail must mount the community space panel')
assert.match(topicView, /space-type="topic"/, 'topic detail must use the topic community space endpoint')
assert.match(collectionView, /CommunitySpacePanel/, 'collection detail must mount the community space panel')
assert.match(collectionView, /space-type="collection"/, 'collection detail must use the collection community space endpoint')
assert.match(seriesView, /CommunitySpacePanel/, 'collaboration series detail must mount the community space panel')
assert.match(seriesView, /space-type="series"/, 'collaboration series detail must use the series community space endpoint')

assert.match(packageJson, /"test:v8-community-space":\s*"node scripts\/test-v8-community-space\.mjs"/, 'package scripts must expose the V8 community space guard')
assert.match(packageJson, /npm run test:v8-community-space/, 'the V8 guard chain must include the community space guard')

console.log('V8 community space guard passed')
