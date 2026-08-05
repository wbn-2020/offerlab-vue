import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const vueRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(vueRoot, '..')
const read = (relative) => fs.readFileSync(path.join(vueRoot, relative), 'utf8')
const readRepo = (relative) => fs.readFileSync(path.join(repoRoot, relative), 'utf8')
const expect = (value, message) => assert.ok(value, message)
const normalize = (value) => value.replace(/^\uFEFF/, '').replace(/\r\n|\r/g, '\n')

const packageJson = JSON.parse(read('package.json'))
const document = readRepo(
  '文档/V38/OfferLab-V38-频道质量候选批次派发与维护执行治理详细方案-2026-08-05.md',
)
const candidateApi = read('src/api/channelHealthCandidates.ts')
const batchApi = read('src/api/channelHealthReviewBatches.ts')
const candidatePanel = read('src/components/health/ChannelHealthCandidatePanel.vue')
const batchPanel = read('src/components/health/ChannelHealthReviewBatchPanel.vue')
const channelHealthView = read('src/views/AdminChannelHealthView.vue')
const maintenanceApi = read('src/api/contentMaintenance.ts')
const adminMaintenanceView = read('src/views/AdminMaintenanceTasksView.vue')
const maintenanceView = read('src/views/MaintenanceTasksView.vue')
const timeline = read('src/components/maintenance/MaintenanceTaskAttemptTimeline.vue')

const controller = readRepo(
  'offerlab-java/community-domain-analytics/src/main/java/com/offerlab/community/analytics/controller/ChannelHealthController.java',
)
const candidateService = readRepo(
  'offerlab-java/community-domain-analytics/src/main/java/com/offerlab/community/analytics/application/ChannelQualityReviewCandidateService.java',
)
const batchService = readRepo(
  'offerlab-java/community-domain-analytics/src/main/java/com/offerlab/community/analytics/application/ChannelQualityReviewBatchService.java',
)
const batchMapper = readRepo(
  'offerlab-java/community-domain-analytics/src/main/java/com/offerlab/community/analytics/infrastructure/persistence/ChannelQualityReviewBatchMapper.java',
)
const taskService = readRepo(
  'offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/collaboration/application/ContentMaintenanceTaskService.java',
)
const taskMapper = readRepo(
  'offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/collaboration/infrastructure/persistence/ContentMaintenanceTaskMapper.java',
)
const taskCommandFacade = readRepo(
  'offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/api/ContentMaintenanceTaskCommandFacade.java',
)
const taskAttemptMapper = readRepo(
  'offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/collaboration/infrastructure/persistence/ContentMaintenanceTaskAttemptMapper.java',
)
const taskReadFacade = readRepo(
  'offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/api/ContentMaintenanceTaskReadFacade.java',
)
const taskReadService = readRepo(
  'offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/application/PostContentMaintenanceTaskReadService.java',
)
const migration = readRepo(
  'offerlab-java/db/migration/20260805_channel_quality_review_dispatch_batch.sql',
)
const initSchema = readRepo(
  'offerlab-java/db/init/41_channel_quality_review_dispatch_batch.sql',
)
const runtimeMigration = readRepo(
  'offerlab-java/community-bootstrap/src/main/resources/db/flyway/core/V20260805.02__channel_quality_review_dispatch_batch.sql',
)
const manifest = JSON.parse(readRepo('offerlab-java/db/migration/flyway-manifest.json'))

const guardName = 'test:v38-channel-quality-review-dispatch-batches'
expect(
  packageJson.scripts[guardName] === 'node scripts/test-v38-channel-quality-review-dispatch-batches.mjs',
  'V38 guard must have a package script.',
)
expect(
  packageJson.scripts['pretest:guards'].includes(guardName),
  'V38 guard must run before the full guard suite.',
)

for (const token of [
  '批次派发',
  '交付回合',
  '维护执行治理',
  '当前候选重新校验',
  '不新增第二套维护任务主状态',
  '1-20',
  'VERIFIED_DELIVERY',
]) {
  expect(document.includes(token), `V38 design document must preserve ${token}.`)
}

for (const token of [
  '@RequestParam(required = false) String cursor',
  '@PostMapping("/quality-review-batches")',
  '@GetMapping("/quality-review-batches")',
  '@GetMapping("/quality-review-batches/{batchId}")',
  'ChannelQualityReviewBatchService',
]) {
  expect(controller.includes(token), `V38 channel-health controller is missing ${token}.`)
}

for (const token of [
  '@Transactional',
  '@Transactional(readOnly = true)',
  'MAX_CANDIDATES = 20',
  'Set.of(1, 3, 7, 14, 30)',
  'ContentMaintenanceTaskCommandFacade',
  'dispatchChannelHealthTask',
  'adminAuditService.recordRequired',
  'CHANNEL_QUALITY_REVIEW_BATCH_CREATE',
  'ACTION_REQUIRED',
  'IN_PROGRESS',
  'REVIEW_PENDING',
  'PARTIALLY_CLOSED',
  'DUE_SOON',
  'OVERDUE',
]) {
  expect(batchService.includes(token), `V38 batch service is missing ${token}.`)
}

for (const token of [
  'resolveReadyForDispatch',
  'CandidateCursor',
  'encodeCursor',
  'snapshotUpperBoundPostId',
  'RevisionAwareQualitySignalCoordinator',
  'findTaskRevisionSummariesBySourceRevision',
  'candidateDispositionService.findActiveBySourceRevision',
  'PublicContentFilter.isDistributablePost',
]) {
  expect(candidateService.includes(token), `V38 candidate revalidation is missing ${token}.`)
}

for (const token of [
  't_collab_content_maintenance_dispatch_batch',
  'listByDomain',
  'listTasksByBatchId',
  'dispatch_batch_id',
  'priority',
]) {
  expect(batchMapper.includes(token), `V38 batch mapper is missing ${token}.`)
}

for (const token of [
  'dispatchChannelHealthTask',
  'ContentMaintenanceTaskBatchDispatchCmd',
]) {
  expect(taskCommandFacade.includes(token), `V38 Post command facade is missing ${token}.`)
}

for (const token of [
  'dispatchBatchId',
  'taskPriority',
  'dueAt',
  'currentAttemptNo',
  'terminalOutcomeCode',
  'closeReasonCode',
  'dispatchChannelHealthTask',
  'insertAttempt',
  'insertHistoricalAttempt',
  'hasSubmittedDelivery',
  'ContentMaintenanceTaskAttempt',
  'QUALITY_VERIFIED',
  'CONTENT_INCOMPLETE',
  'AUTHOR_UNRESPONSIVE',
  'CONTENT_MAINTENANCE_TASK_CLAIM',
  'CONTENT_MAINTENANCE_TASK_SUBMIT',
]) {
  expect(taskService.includes(token), `V38 task service is missing ${token}.`)
}

for (const token of [
  'dispatch_batch_id AS dispatchBatchId',
  'task_priority AS priority',
  'due_at AS dueAt',
  'current_attempt_no AS currentAttemptNo',
  'terminal_outcome_code AS terminalOutcomeCode',
  'close_reason_code AS closeReasonCode',
  'setCurrentAttemptNo',
  'approve',
  'reject',
  'close',
]) {
  expect(taskMapper.includes(token), `V38 task mapper is missing ${token}.`)
}

for (const token of [
  't_collab_content_maintenance_task_attempt',
  'attempt_no',
  'insertHistoricalAttempt',
  'decision',
  'reason_code',
  'decideAttempt',
]) {
  expect(taskAttemptMapper.includes(token), `V38 attempt mapper is missing ${token}.`)
}

for (const token of [
  'findTaskRevisionSummariesBySourceRevision',
  'ContentMaintenanceTaskRevisionSummary',
  'VERIFIED_DELIVERY',
]) {
  expect(taskReadFacade.includes(token), `V38 safe task revision summary is missing ${token}.`)
}

for (const token of [
  'findTaskRevisionSummariesBySourceRevision',
  '"REJECTED".equals(row.getLatestAttemptDecision())',
  '"REWORK"',
]) {
  expect(taskReadService.includes(token), `V38 task revision summary implementation is missing ${token}.`)
}

for (const token of [
  'maintenancePhase',
  'terminalOutcome',
  "lifecycleState === 'TASK_EXISTS'",
  'safeCandidateCursor',
  'chqc1',
]) {
  expect(candidateApi.includes(token), `V38 candidate API adapter is missing ${token}.`)
}

for (const token of [
  'ChannelHealthReviewBatch',
  'ChannelHealthReviewBatchCreateCmd',
  'safePositiveLongId',
  'safeFutureOrHistoricalTimestamp',
  'progressState',
  'dueState',
  'client.post',
  'client.get',
]) {
  expect(batchApi.includes(token), `V38 batch API adapter is missing ${token}.`)
}
expect(
  batchApi.includes('BigInt(String(nextCursor)) !== previousId'),
  'V38 batch pagination must accept the backend cursor when it equals the final visible batch ID.',
)

for (const token of [
  'selectedCandidateKeys',
  'MAX_SELECTED_CANDIDATES = 20',
  'canSelectCandidate',
  'batchName',
  'batchAssigneeUid',
  'batchPriority',
  'batchDueInDays',
  'pendingDispositionKeys.value[candidateKey(candidate)] !== true',
  'channelHealthReviewBatchesApi.create',
  "emit('batch-created')",
]) {
  expect(candidatePanel.includes(token), `V38 candidate batch dispatch UI is missing ${token}.`)
}

for (const token of [
  'ChannelHealthReviewBatchPanel',
  '@batch-created',
  'batchRefreshKey',
]) {
  expect(channelHealthView.includes(token), `V38 health view integration is missing ${token}.`)
}

for (const token of [
  'progressState',
  'dueState',
  'loadDetail',
  'taskStatusCounts',
  'RouterLink',
]) {
  expect(batchPanel.includes(token), `V38 batch execution UI is missing ${token}.`)
}

for (const token of [
  'ContentMaintenanceTaskAttempt',
  'attempts',
  'reasonCode',
  'ContentMaintenanceTaskCloseCmd',
  'maintenancePhase',
  'terminalOutcomeCode',
  'adaptContentMaintenanceTask',
  'V38_TASK_METADATA_FIELDS',
  'withRemoteResultProvenance',
]) {
  expect(maintenanceApi.includes(token), `V38 maintenance API adapter is missing ${token}.`)
}

for (const token of [
  'MaintenanceTaskAttemptTimeline',
  'rejectionReasonCode',
  'closeReasonCode',
  'pendingActions',
  'isTaskMutationPending',
  'priorityLabel',
  'formatTime',
  'parseUtcDeadline',
]) {
  expect(adminMaintenanceView.includes(token), `V38 administrator task UI is missing ${token}.`)
}

expect(
  maintenanceView.includes('MaintenanceTaskAttemptTimeline')
  && maintenanceView.includes('maintenancePhase')
    && maintenanceView.includes('isTaskMutationPending')
    && maintenanceView.includes('parseUtcDeadline'),
  'V38 maintainer task view must display the attempt timeline and phase.',
)
for (const token of [
  'attemptNo',
  'submittedAt',
  'decision',
  'reasonCode',
  'reviewedAt',
]) {
  expect(timeline.includes(token), `V38 attempt timeline is missing ${token}.`)
}

for (const schema of [migration, initSchema]) {
  for (const token of [
    't_collab_content_maintenance_dispatch_batch',
    'candidate_count BETWEEN 1 AND 20',
    "source_type = 'CHANNEL_HEALTH'",
    "priority IN ('HIGH', 'MEDIUM', 'LOW')",
    'ADD COLUMN dispatch_batch_id',
    'ADD COLUMN task_priority',
    'ADD COLUMN due_at',
    'ADD COLUMN current_attempt_no',
    'ADD COLUMN terminal_outcome_code',
    'ADD COLUMN close_reason_code',
    't_collab_content_maintenance_task_attempt',
    'UNIQUE KEY uk_maintenance_task_attempt',
    "decision IN ('APPROVED', 'REJECTED', 'CLOSED')",
    'Legacy V38 compatibility backfill.',
  ]) {
    expect(schema.includes(token), `V38 schema is missing ${token}.`)
  }
}

expect(
  normalize(migration) === normalize(runtimeMigration),
  'V38 runtime Flyway resource must match the canonical migration source.',
)
const v38Migration = manifest.migrations.find(
  (item) => item.source === 'db/migration/20260805_channel_quality_review_dispatch_batch.sql',
)
expect(v38Migration, 'V38 Flyway manifest must include the dispatch-batch migration.')
expect(
  v38Migration.version === '20260805.02'
    && v38Migration.resource
      === 'community-bootstrap/src/main/resources/db/flyway/core/V20260805.02__channel_quality_review_dispatch_batch.sql'
    && manifest.streams.core.expectedMigrations === 80,
  'V38 Flyway manifest version, runtime resource and core count must be synchronized.',
)
expect(
  v38Migration.sha256
    === crypto.createHash('sha256').update(normalize(migration), 'utf8').digest('hex'),
  'V38 Flyway manifest SHA-256 must match the canonical migration source.',
)

console.log('V38 channel quality review dispatch-batches guard passed.')
