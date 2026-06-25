import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const has = (source, needle, message) => assert.ok(source.includes(needle), message)

const governanceView = read('../src/views/AdminGovernanceView.vue')
const opsApi = read('../src/api/ops.ts')
const packageJson = read('../package.json')

has(governanceView, "label: '审核队列', value: 'queue'", 'governance center must expose the unified review queue tab')
has(governanceView, "activeTab === 'queue'", 'governance center must render a review queue panel')
has(governanceView, 'ReviewQueueItem', 'review queue must use a typed item contract')
has(governanceView, 'backendReviewQueueItems', 'review queue must store backend queue items')
has(governanceView, 'frontendReviewQueueItems', 'review queue must retain frontend fallback aggregation')
has(governanceView, 'reviewQueueSource', 'review queue must expose whether backend or fallback data is active')
has(governanceView, 'reviewQueueSourceText', 'review queue must render the active queue source')
has(governanceView, 'loadBackendReviewQueue', 'review queue must load the backend queue first')
has(governanceView, 'reviewQueueItems', 'review queue must merge backend queue and fallback view items')
has(governanceView, 'filteredReviewQueueItems', 'review queue must support source/risk filters')
has(governanceView, 'queueFilters.sourceType', 'review queue must filter by source type')
has(governanceView, 'queueFilters.riskLevel', 'review queue must filter by risk level')

for (const sourceType of ['POST_REPORT', 'COMMENT_REPORT', 'MODERATION_HIT', 'QUESTION_PENDING', 'AI_TASK_FAILED']) {
  has(governanceView, sourceType, `review queue must include ${sourceType}`)
}

has(governanceView, 'opsApi.listReviewQueue', 'review queue must call the backend unified queue API')
has(governanceView, 'postApi.listAdminReports({ status: 0, limit: 50', 'fallback queue must load pending post reports')
has(governanceView, 'interactionApi.listAdminCommentReports({ status: 0, limit: 50', 'fallback queue must load pending comment reports')
has(governanceView, "opsApi.listModerationHits({ limit: 80 })", 'fallback queue must reuse moderation hit data')
has(governanceView, 'opsApi.listQuestions({ status: 0, limit: 20 })', 'fallback queue must load pending questions when permitted')
has(governanceView, 'opsApi.listAiTasks({ status: 3, limit: 20 })', 'fallback queue must load failed AI tasks when permitted')
has(governanceView, 'reviewQueueLoadWarnings', 'review queue must degrade gracefully when optional sources are unavailable')
has(governanceView, 'actionPath', 'review queue items must expose jump targets')
has(governanceView, 'goToQueueItem', 'review queue must support in-governance positioning for native sources')
has(governanceView, 'canQueueAction', 'backend queue items must expose guarded action buttons')
has(governanceView, 'handleReviewQueueAction', 'backend queue actions must be handled from the governance page')
has(governanceView, "action === 'reject' || action === 'close'", 'reject and close actions must require notes')

has(opsApi, 'ReviewQueueItem', 'ops API must type backend review queue items')
has(opsApi, 'ReviewQueueCreateReq', 'ops API must type backend review queue creation')
has(opsApi, 'ReviewQueueActionReq', 'ops API must type backend review queue actions')
has(opsApi, 'confirmationPhrase?: string', 'review queue action request must allow critical confirmation phrase')
has(opsApi, "client.get('/api/v1/admin/review-queue'", 'ops API must list backend review queue items')
has(opsApi, "client.get('/api/v1/admin/review-queue/status')", 'ops API must expose backend review queue status')
has(opsApi, "client.post('/api/v1/admin/review-queue', data)", 'ops API must create backend queue items')
has(opsApi, "client.post(`/api/v1/admin/review-queue/${id}/claim`)", 'ops API must claim queue items')
has(opsApi, "client.post(`/api/v1/admin/review-queue/${id}/release`, { note })", 'ops API must release queue items with note payload')
has(opsApi, "client.post(`/api/v1/admin/review-queue/${id}/approve`, { note, confirmationPhrase: 'CONFIRM' })", 'ops API must approve queue items with critical confirmation payload')
has(opsApi, "client.post(`/api/v1/admin/review-queue/${id}/reject`, { note, confirmationPhrase: 'CONFIRM' })", 'ops API must reject queue items with critical confirmation payload')
has(opsApi, "client.post(`/api/v1/admin/review-queue/${id}/close`, { note, confirmationPhrase: 'CONFIRM' })", 'ops API must close queue items with critical confirmation payload')

has(packageJson, '"test:governance-review-queue"', 'package scripts must expose the governance review queue guard')
has(packageJson, 'npm run test:governance-review-queue', 'test:guards must include the governance review queue guard')

console.log('governance review queue frontend guards passed')
