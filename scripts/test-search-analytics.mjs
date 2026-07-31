import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const searchApi = readFileSync(new URL('../src/api/search.ts', import.meta.url), 'utf8')
const opsApi = readFileSync(new URL('../src/api/ops.ts', import.meta.url), 'utf8')
const searchView = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')
const opsView = readFileSync(new URL('../src/views/OpsView.vue', import.meta.url), 'utf8')
const trendView = readFileSync(new URL('../src/views/TrendDashboardView.vue', import.meta.url), 'utf8')

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
assert.match(opsApi, /compatibilityEndpointUnavailable/, 'ops analytics must isolate compatibility fallback detection')
assert.match(opsApi, /status === 404 \|\| status === 405/, 'ops analytics may only degrade for missing or unsupported compatibility endpoints')
assert.doesNotMatch(
  opsApi.match(/searchAnalytics:[\s\S]*?\n {2}},\n\n {2}getPostSearchDiagnostics/)?.[0] || '',
  /optionalPanelUnavailable/,
  'ops analytics must not swallow authorization failures as an optional empty panel',
)
assert.match(opsApi, /availability:\s*'degraded'/, 'ops analytics compatibility fallback must be marked degraded')
assert.match(opsApi, /不代表真实的零数据/, 'ops analytics degraded result must explain that empty data is not a real zero')

assert.match(searchView, /trackCommunityRecommendationClick/, 'SearchView must define community recommendation tracking')
assert.match(searchView, /eventType:\s*'COMMUNITY_RECOMMEND_CLICK'/, 'SearchView must send community recommendation click analytics')
assert.match(searchView, /target,/, 'SearchView must send recommendation target analytics')
assert.match(searchView, /runRecommendationAction/, 'search no-result relax actions must track community recommendation clicks')
assert.match(searchView, /useRecommendedWord/, 'search no-result keyword recommendations must track community recommendation clicks')
assert.match(searchView, /\.catch\(\(\) => \{\}\)/, 'SearchView analytics tracking must not block navigation')

assert.match(opsView, /搜索运营统计/, 'OpsView must render search analytics panel')
assert.match(opsView, /热门搜索词/, 'OpsView must show hot keyword list')
assert.match(opsView, /无结果词/, 'OpsView must show no-result keyword list')
assert.match(opsView, /搜索页推荐动作点击/, 'OpsView must accurately label search-page recommendation action clicks')
assert.match(opsView, /searchRecommendationActionClicks/, 'OpsView must render search-page recommendation action click data')
assert.doesNotMatch(
  opsView,
  /recommendClicks\.length\s*\?\s*recommendClicks\s*:\s*\(searchAnalytics\.value\?\.prepClicks/,
  'OpsView must not substitute prep clicks when recommendation action clicks are empty',
)
assert.match(opsView, /const includeTestData = ref\(false\)/, 'OpsView must hide test data by default')
assert.match(opsView, /测试数据/, 'OpsView must expose a compact test-data toggle')
assert.match(opsView, /const loadSearchAnalytics\s*=\s*async \(\) =>/, 'OpsView must load analytics data')
assert.match(opsView, /opsApi\.searchAnalytics\(\{ days: 30, limit: 8, includeTestData: includeTestData\.value \}\)/, 'OpsView must request bounded analytics summary with the test-data switch')
assert.match(opsView, /loaders\.push\([\s\S]*loadStatus\(\)[\s\S]*loadOutbox\(\)[\s\S]*loadSearchAnalytics\(\)/, 'Ops refresh must include search analytics')
assert.match(opsView, /reloadGovernanceData/, 'OpsView must reload analytics and reports when toggling test data')

assert.match(trendView, /搜索页推荐动作点击/, 'TrendDashboardView must accurately label search-page recommendation action clicks')
assert.match(trendView, /opsSummaryState\s*=\s*ref<[^>]*'restricted'/, 'TrendDashboardView must model a restricted analytics state')
assert.match(trendView, /isOpsAnalyticsRestricted/, 'TrendDashboardView must identify 401/403 analytics failures')
assert.match(trendView, /当前账号无法查看；此状态不代表没有运营数据/, 'TrendDashboardView must explain restricted analytics honestly')
assert.match(trendView, /analyticsRes\.data\?\.availability === 'degraded'/, 'TrendDashboardView must surface compatibility degradation')
assert.match(trendView, /opsSummaryState === 'available' \|\| opsSummaryState === 'degraded'/, 'TrendDashboardView must not render empty analytics columns while restricted or unavailable')

console.log('search analytics guard passed')
