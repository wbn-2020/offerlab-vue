import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const vueRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readVue = (relative) => fs.readFileSync(path.join(vueRoot, relative), 'utf8')
const expect = (value, message) => assert.ok(value, message)

const packageJson = JSON.parse(readVue('package.json'))
const api = readVue('src/api/channelQualityGovernanceAnalytics.ts')
const view = readVue('src/views/admin/ChannelQualityGovernanceAnalyticsView.vue')
const router = readVue('src/router/index.ts')
const header = readVue('src/components/layout/AppHeader.vue')
const guardName = 'test:v43-channel-quality-governance-analytics'

expect(
  packageJson.scripts[guardName] === 'node scripts/test-v43-channel-quality-governance-analytics.mjs',
  'V43 analytics guard must have a package script.',
)
expect(
  packageJson.scripts['pretest:guards'].includes(guardName),
  'V43 analytics guard must run before the complete static guard suite.',
)
expect(
  api.includes("const BASE_PATH = '/api/v1/community-health/quality-governance-analytics'"),
  'V43 analytics API must use the dedicated aggregate boundary.',
)
for (const endpoint of [
  "client.get(`${BASE_PATH}/overview`",
  "client.get(`${BASE_PATH}/trends`",
  "client.get(`${BASE_PATH}/breakdown`",
  "client.get(`${BASE_PATH}/projection-health`",
  "client.post(`${BASE_PATH}/projection/rebuild`",
]) {
  expect(api.includes(endpoint), `V43 analytics API must retain ${endpoint}.`)
}
for (const token of [
  'withRemoteResultProvenance(raw)',
  'requireStrictRemoteResult',
  'adaptOverview',
  'adaptTrends',
  'adaptBreakdown',
  'adaptProjectionHealth',
  'adaptRebuildResult',
  'numerator',
  'denominator',
  'projectionGeneration',
]) {
  expect(api.includes(token), `V43 analytics API must strictly validate ${token}.`)
}
expect(
  !/value\s*\?\?\s*0|Number\s*\(\s*null\s*\)/.test(`${api}\n${view}`),
  'V43 analytics must not replace unavailable or null metrics with zero.',
)
expect(
  !/\b(?:fallback|mock|demo)\b/i.test(api),
  'V43 analytics API must not return fallback, mock, or demo data.',
)
expect(
  !/V44|V45/.test(`${api}\n${view}\n${router}\n${header}`),
  'V43 frontend must not introduce later-version routes or functionality.',
)

expect(
  router.includes("path: '/admin/community-health/quality-governance-analytics'"),
  'V43 analytics route must be registered.',
)
expect(
  router.includes("name: 'ChannelQualityGovernanceAnalytics'"),
  'V43 analytics route must have a stable name.',
)
expect(
  router.includes("component: () => import('@/views/admin/ChannelQualityGovernanceAnalyticsView.vue')"),
  'V43 analytics route must load the V43 workspace.',
)
expect(
  header.includes("to: '/admin/community-health/quality-governance-analytics', label: '频道质量治理分析'"),
  'V43 analytics menu must use the channel-health permission boundary.',
)

for (const token of [
  'channelQualityGovernanceAnalyticsApi.overview(',
  'channelQualityGovernanceAnalyticsApi.trends(',
  'channelQualityGovernanceAnalyticsApi.breakdown(',
  'channelQualityGovernanceAnalyticsApi.projectionHealth(',
  'AbortController',
  'requestIsCurrent',
  'loadController?.abort()',
  'Promise.all([',
  'trendLineSegments',
  "bucket.availability === 'AVAILABLE'",
  '.filter((group) => group.length > 1)',
]) {
  expect(view.includes(token), `V43 analytics workspace must retain ${token}.`)
}
expect(
  !/\b(?:export|download|csv|xlsx|uid|owner|assignee|operator|reviewer|caseId|taskId)\b/i.test(view),
  'V43 analytics workspace must not add export, people, or aggregate-detail features.',
)
expect(
  !/connectNulls\s*:\s*true|spanGaps\s*=\s*["']true["']|interpolate/i.test(view),
  'V43 trends must not bridge unavailable, suppressed, or ineligible buckets.',
)

console.log('V43 channel quality governance analytics guard passed.')
