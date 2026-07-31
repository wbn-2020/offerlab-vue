import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const files = [
  'src/api/collaborationAnalytics.ts',
  'src/components/collaboration/CollaborationAnalyticsPanel.vue',
  'src/views/CollaborationContributionView.vue',
]

for (const path of files) {
  assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), true, `${path} must exist.`)
}

const api = read(files[0])
const panel = read(files[1])
const view = read(files[2])
const router = read('src/router/index.ts')

has(api, /\/api\/v1\/collaboration\/analytics\/need-funnel/, 'Analytics API must target the need funnel endpoint.')
has(api, /days:\s*query\.days[\s\S]*domain:\s*query\.domain/, 'Analytics API must pass days and optional domain filters.')
has(api, /CollaborationNeedFunnel[\s\S]*deduplicationPolicy[\s\S]*emptyDenominatorPolicy[\s\S]*dataFreshness[\s\S]*degraded/, 'Analytics API types must preserve metric definitions and degraded state.')
has(api, /createdNeedCount[\s\S]*acceptedNeedCount[\s\S]*rejectionResubmissionRate[\s\S]*averageSubmitToAcceptSeconds/, 'Analytics API types must cover the fact metrics returned by the target DTO.')
has(api, /adaptCollaborationNeedFunnel[\s\S]*numberOrNull[\s\S]*degradationReasons/, 'Analytics API must normalize nullable and partially available analytics data.')

has(panel, /data-collaboration-analytics-panel/, 'Analytics panel must expose a stable integration marker.')
has(panel, /days[\s\S]*domain[\s\S]*needFunnel/, 'Analytics panel must expose the server-supported days and domain filters.')
has(panel, /useAuthStore[\s\S]*permissionDenied[\s\S]*getErrorMessage/, 'Analytics panel must preserve login, permission, and failure boundaries.')
has(panel, /AbortController[\s\S]*accountGeneration[\s\S]*requestId/, 'Analytics panel must invalidate stale requests on refresh or account switches.')
has(panel, /data-analytics-empty|当前没有可用的运营快照/, 'Analytics panel must expose a real empty state.')
has(panel, /data-analytics-degraded|funnel\.degraded/, 'Analytics panel must expose degraded metadata.')
for (const field of ['timezone', 'deduplicationPolicy', 'emptyDenominatorPolicy', 'dataFreshness']) {
  has(panel, new RegExp(field), `Analytics panel must display ${field}.`)
}
for (const field of ['createdNeedCount', 'claimedNeedCount', 'submittedNeedCount', 'acceptedNeedCount', 'rejectionResubmissionRate', 'averageCreateToClaimSeconds']) {
  has(panel, new RegExp(field), `Analytics panel must display the fact metric ${field}.`)
}
missing(panel, /\.sort\s*\(|leaderboard|ranking|rank\b|score\b|badge\b|level\b|reward\b|排行榜|积分榜|积分|等级|奖励/i, 'Analytics panel must not derive ranking, score, level, or reward semantics.')
has(view, /CollaborationAnalyticsPanel/, 'Contribution view must mount the analytics panel for later route integration.')
has(router, /path:\s*['"]\/admin\/collaboration\/insights['"][\s\S]*AdminCollaborationInsights/, 'Operations insights must be mounted behind an admin route.')

console.log('V7 collaboration insights guard passed')
