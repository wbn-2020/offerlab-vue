import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const searchApi = readFileSync(new URL('../src/api/search.ts', import.meta.url), 'utf8')
const opsApi = readFileSync(new URL('../src/api/ops.ts', import.meta.url), 'utf8')
const searchView = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')
const opsView = readFileSync(new URL('../src/views/OpsView.vue', import.meta.url), 'utf8')

assert.match(searchApi, /interface SearchAnalyticsTrackReq/, 'search API must type analytics tracking payloads')
assert.match(searchApi, /eventType:\s*'PREP_CLICK'/, 'search tracking payload must include PREP_CLICK event type')
assert.match(searchApi, /trackAnalytics:\s*\(data: SearchAnalyticsTrackReq\)/, 'search API must expose trackAnalytics')
assert.match(searchApi, /\/api\/v1\/search\/analytics\/track/, 'search API must post analytics tracking events')

assert.match(opsApi, /interface SearchAnalyticsItem/, 'ops API must type search analytics items')
assert.match(opsApi, /interface SearchAnalytics/, 'ops API must type search analytics summary')
assert.match(opsApi, /hotKeywords:\s*SearchAnalyticsItem\[\]/, 'ops analytics must include hot keywords')
assert.match(opsApi, /noResultKeywords:\s*SearchAnalyticsItem\[\]/, 'ops analytics must include no-result keywords')
assert.match(opsApi, /prepClicks:\s*SearchAnalyticsItem\[\]/, 'ops analytics must include prep clicks')
assert.match(opsApi, /searchAnalytics:\s*(?:async\s*)?\(params\?: \{ days\?: number; limit\?: number \}\)/, 'ops API must expose searchAnalytics')
assert.match(opsApi, /\/api\/v1\/ops\/search\/analytics/, 'ops API must call search analytics endpoint')

assert.match(searchView, /@click="trackCompanyPrepClick"/, 'search no-result prep-pack link must track clicks')
assert.match(searchView, /const trackCompanyPrepClick\s*=\s*\(\)\s*=>/, 'SearchView must define trackCompanyPrepClick')
assert.match(searchView, /searchApi\.trackAnalytics\(\{[\s\S]*eventType:\s*'PREP_CLICK'[\s\S]*company:\s*filters\.company/, 'SearchView must send prep click analytics with company')
assert.match(searchView, /\.catch\(\(\) => \{\}\)/, 'SearchView analytics tracking must not block navigation')

assert.match(opsView, /搜索运营统计/, 'OpsView must render search analytics panel')
assert.match(opsView, /热门搜索词/, 'OpsView must show hot keyword list')
assert.match(opsView, /无结果词/, 'OpsView must show no-result keyword list')
assert.match(opsView, /准备包点击/, 'OpsView must show prep click list')
assert.match(opsView, /const loadSearchAnalytics\s*=\s*async \(\) =>/, 'OpsView must load analytics data')
assert.match(opsView, /opsApi\.searchAnalytics\(\{ days: 30, limit: 8 \}\)/, 'OpsView must request bounded analytics summary')
assert.match(opsView, /loadStatus\(\), loadOutbox\(\), loadTasks\(\), loadSearchAnalytics\(\)/, 'Ops refresh must include search analytics')

console.log('search analytics guard passed')
