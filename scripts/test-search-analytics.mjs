import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const searchApi = readFileSync(new URL('../src/api/search.ts', import.meta.url), 'utf8')
const opsApi = readFileSync(new URL('../src/api/ops.ts', import.meta.url), 'utf8')
const searchView = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')
const opsView = readFileSync(new URL('../src/views/OpsView.vue', import.meta.url), 'utf8')

assert.match(searchApi, /interface SearchAnalyticsTrackReq/, 'search API must type analytics tracking payloads')
assert.match(searchApi, /COMMUNITY_RECOMMEND_CLICK/, 'search tracking payload must include community recommendation click event type')
assert.match(searchApi, /target\?:\s*string/, 'search tracking payload must include a recommendation target')
assert.match(searchApi, /trackAnalytics:\s*\(data: SearchAnalyticsTrackReq\)/, 'search API must expose trackAnalytics')
assert.match(searchApi, /\/api\/v1\/search\/analytics\/track/, 'search API must post analytics tracking events')

assert.match(opsApi, /interface SearchAnalyticsItem/, 'ops API must type search analytics items')
assert.match(opsApi, /interface SearchAnalytics/, 'ops API must type search analytics summary')
assert.match(opsApi, /hotKeywords:\s*SearchAnalyticsItem\[\]/, 'ops analytics must include hot keywords')
assert.match(opsApi, /noResultKeywords:\s*SearchAnalyticsItem\[\]/, 'ops analytics must include no-result keywords')
assert.match(opsApi, /prepClicks:\s*SearchAnalyticsItem\[\]/, 'ops analytics must include prep clicks')
assert.match(opsApi, /recommendClicks:\s*SearchAnalyticsItem\[\]/, 'ops analytics must include community recommendation clicks')
assert.match(opsApi, /searchAnalytics:\s*(?:async\s*)?\(params\?: \{ days\?: number; limit\?: number; includeTestData\?: boolean \}\)/, 'ops API must expose searchAnalytics with an explicit test-data switch')
assert.match(opsApi, /\/api\/v1\/ops\/search\/analytics/, 'ops API must call search analytics endpoint')

assert.match(searchView, /trackCommunityRecommendationClick/, 'SearchView must define community recommendation tracking')
assert.match(searchView, /eventType:\s*'COMMUNITY_RECOMMEND_CLICK'/, 'SearchView must send community recommendation click analytics')
assert.match(searchView, /target,/, 'SearchView must send recommendation target analytics')
assert.match(searchView, /runRecommendationAction/, 'search no-result relax actions must track community recommendation clicks')
assert.match(searchView, /useRecommendedWord/, 'search no-result keyword recommendations must track community recommendation clicks')
assert.match(searchView, /\.catch\(\(\) => \{\}\)/, 'SearchView analytics tracking must not block navigation')

assert.match(opsView, /搜索运营统计/, 'OpsView must render search analytics panel')
assert.match(opsView, /热门搜索词/, 'OpsView must show hot keyword list')
assert.match(opsView, /无结果词/, 'OpsView must show no-result keyword list')
assert.match(opsView, /社区推荐点击/, 'OpsView must show community recommendation click list')
assert.match(opsView, /communityRecommendClicks/, 'OpsView must render normalized recommendation click data')
assert.match(opsView, /const includeTestData = ref\(false\)/, 'OpsView must hide test data by default')
assert.match(opsView, /测试数据/, 'OpsView must expose a compact test-data toggle')
assert.match(opsView, /const loadSearchAnalytics\s*=\s*async \(\) =>/, 'OpsView must load analytics data')
assert.match(opsView, /opsApi\.searchAnalytics\(\{ days: 30, limit: 8, includeTestData: includeTestData\.value \}\)/, 'OpsView must request bounded analytics summary with the test-data switch')
assert.match(opsView, /loaders\.push\([\s\S]*loadStatus\(\)[\s\S]*loadOutbox\(\)[\s\S]*loadSearchAnalytics\(\)/, 'Ops refresh must include search analytics')
assert.match(opsView, /reloadGovernanceData/, 'OpsView must reload analytics and reports when toggling test data')

console.log('search analytics guard passed')
