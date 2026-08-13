import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const api = read('src/api/collaboration.ts')
const composable = read('src/composables/useCollaborationDiscoveryQuery.ts')
const hubQuery = read('src/composables/useCollaborationHubQuery.ts')
const hub = read('src/views/CollaborationHubView.vue')
const filters = read('src/components/collaboration/NeedDiscoveryFilters.vue')

assert.equal(
  existsSync(new URL('../src/composables/useCollaborationDiscoveryQuery.ts', import.meta.url)),
  true,
  'Discovery query composable must exist.',
)

for (const field of ['keyword', 'contentFormat', 'sourceType', 'sort', 'cursor', 'size']) {
  has(api, new RegExp(`\\b${field}\\b`), `Discovery API must expose ${field}.`)
}
has(api, /CollaborationNeedDiscoverySort[\s\S]*LATEST[\s\S]*UPDATED[\s\S]*STALLED_FIRST/, 'Discovery API must constrain supported sorts.')
has(composable, /router\.replace\(\{ query \}/, 'Discovery filters and sort must be written into the URL query.')
has(composable, /clearResults\(\)[\s\S]*writeRouteFilters[\s\S]*setTimeout/, 'Filter changes must clear items/cursor before the next request.')
has(composable, /requestId[\s\S]*isCurrent[\s\S]*queryKey === filterKey\(\)/, 'Discovery must discard stale responses by request id and query key.')
has(composable, /AbortController[\s\S]*controller\.signal/, 'Discovery requests must support cancellation.')
has(composable, /if \(append\) loadMoreError\.value = message[\s\S]*initialError\.value = message/, 'Discovery must retain loaded pages on append failure while clearing failed first pages.')
has(composable, /watch\([\s\S]*authStore\.isLoggedIn[\s\S]*authStore\.user\?\.uid/, 'Discovery results must reset on account changes.')
has(composable, /routeSyncing \|\| !enabled\.value/, 'Inactive Hub tabs must not overwrite the retained need discovery filters.')
for (const field of ['keyword', 'contentFormat', 'sourceType']) {
  has(hubQuery, new RegExp(`${field}:\\s*route\\.query\\.${field}`), `Hub tab changes must preserve the ${field} discovery query.`)
}
has(api, /discovery:[\s\S]*needs\/discovery/, 'Discovery must use the dedicated server-side discovery endpoint.')
has(composable, /collaborationApi\.needs\.discovery\(\{[\s\S]*\.\.\.queryFromFilters\(\)[\s\S]*cursor:[\s\S]*size:/, 'Discovery must pass filters and pagination to the server discovery endpoint.')
missing(composable, /\.sort\(|\.sort\s*\(/, 'Discovery must not re-sort the complete public list in the browser.')
has(filters, /data-need-discovery-filters/, 'Discovery filter surface must expose a stable integration marker.')
for (const field of ['keyword', 'contentFormat', 'sourceType', 'status', 'sort']) {
  has(filters, new RegExp(field), `Discovery filter UI must expose ${field}.`)
}
has(filters, /清空|reset/, 'Discovery filters must provide a reset action.')
has(hub, /need\.matchReasons\.map\(labelNeedMatchReason\)\.join\(['"] · ['"]\)/, 'Discovery cards must translate and explain the server-provided match reasons.')
has(
  hub,
  /onMounted\(\(\)\s*=>\s*\{[\s\S]*activeTab\.value === 'needs'[\s\S]*!discoveryQuery\.loading\.value[\s\S]*!discoveryQuery\.initialized\.value[\s\S]*void loadNeeds\(\)/,
  'the default needs tab must explicitly load when the discovery composable has not initialized.',
)
has(
  read('src/utils/collaborationNeedPresentation.ts'),
  /FILTER_DOMAIN_MATCH[\s\S]*PUBLIC_CONTENT_FORMAT_CONTRIBUTION_MATCH[\s\S]*labelNeedMatchReason/,
  'Discovery match reason codes must have human-readable projections.',
)
missing(filters, /recommend|score|rank|个性化|机器学习/, 'Discovery filters must not expose recommendation scores or model explanations.')

console.log('V7 need discovery guard passed')
