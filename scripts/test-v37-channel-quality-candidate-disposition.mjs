import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const vueRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(vueRoot, '..')
const read = (relative) => fs.readFileSync(path.join(vueRoot, relative), 'utf8')
const readRepo = (relative) => fs.readFileSync(path.join(repoRoot, relative), 'utf8')
const expect = (value, message) => assert.ok(value, message)

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  expect(startIndex >= 0, `Static guard could not find section start: ${start}`)
  const endIndex = end == null ? source.length : source.indexOf(end, startIndex + start.length)
  expect(endIndex >= 0, `Static guard could not find section end: ${end}`)
  return source.slice(startIndex, endIndex)
}

const packageJson = JSON.parse(read('package.json'))
const api = read('src/api/channelHealthCandidates.ts')
const panel = read('src/components/health/ChannelHealthCandidatePanel.vue')
const maintenanceView = read('src/views/AdminMaintenanceTasksView.vue')
const candidateService = readRepo(
  'offerlab-java/community-domain-analytics/src/main/java/com/offerlab/community/analytics/application/ChannelQualityReviewCandidateService.java',
)
const dispositionService = readRepo(
  'offerlab-java/community-domain-analytics/src/main/java/com/offerlab/community/analytics/application/ChannelQualityReviewCandidateDispositionService.java',
)
const dispositionMapper = readRepo(
  'offerlab-java/community-domain-analytics/src/main/java/com/offerlab/community/analytics/infrastructure/persistence/ChannelQualityReviewCandidateDispositionMapper.java',
)
const dispositionCommand = readRepo(
  'offerlab-java/community-domain-analytics/src/main/java/com/offerlab/community/analytics/api/dto/ChannelQualityReviewCandidateDispositionCmd.java',
)
const controller = readRepo(
  'offerlab-java/community-domain-analytics/src/main/java/com/offerlab/community/analytics/controller/ChannelHealthController.java',
)
const migration = readRepo('offerlab-java/db/migration/20260805_channel_quality_candidate_disposition.sql')
const initSchema = readRepo('offerlab-java/db/init/40_channel_quality_candidate_disposition.sql')
const runtimeMigration = readRepo(
  'offerlab-java/community-bootstrap/src/main/resources/db/flyway/core/V20260805.01__channel_quality_candidate_disposition.sql',
)
const flywayManifest = JSON.parse(readRepo('offerlab-java/db/migration/flyway-manifest.json'))
const maintenanceService = readRepo(
  'offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/collaboration/application/ContentMaintenanceTaskService.java',
)

const guardName = 'test:v37-channel-quality-candidate-disposition'
expect(
  packageJson.scripts[guardName] === 'node scripts/test-v37-channel-quality-candidate-disposition.mjs',
  'V37 candidate disposition guard must have a package script.',
)
expect(
  packageJson.scripts['pretest:guards'].includes(guardName),
  'V37 candidate disposition guard must run before the full guard suite.',
)

const lifecycleStates = ['READY', 'TASK_EXISTS', 'REVISION_STALE', 'DISMISSED', 'SNOOZED']
const backendLifecycleSources = `${candidateService}\n${dispositionService}`
for (const state of lifecycleStates) {
  expect(api.includes(`'${state}'`), `V37 API must declare the ${state} lifecycle state.`)
  expect(backendLifecycleSources.includes(`"${state}"`) || backendLifecycleSources.includes(`'${state}'`),
    `V37 backend candidate service must preserve the ${state} lifecycle state.`)
}
for (const field of [
  'lifecycleState',
  'maintenanceStatus',
  'dispositionReasonCode',
  'snoozedUntil',
  'actionable',
]) {
  expect(api.includes(`${field}:`), `V37 candidate API must expose ${field}.`)
  expect(candidateService.includes(field), `V37 backend candidate service must populate ${field}.`)
}
for (const token of [
  'candidateDispositionService.findActiveBySourceRevision',
  'lifecycleState = disposition.getState()',
  'dispositionReasonCode = disposition.getReasonCode()',
  'snoozedUntil = disposition.getSnoozedUntil()',
  'actionable = false',
]) {
  expect(candidateService.includes(token), `V37 candidate lifecycle integration is missing ${token}.`)
}

const candidateAdapter = section(api, 'const adaptCandidate', 'export const adaptChannelHealthReviewCandidatePage')
const lifecycleBlock = (state, nextState) => section(
  candidateAdapter,
  `lifecycleState === '${state}'`,
  nextState == null ? ') return null' : `lifecycleState === '${nextState}'`,
)
const lifecycleCombinations = [
  ['READY', 'TASK_EXISTS', [
    '!sourceRefId',
    'maintenanceStatus != null',
    'dispositionReasonCode != null',
    'snoozedUntil != null',
    'value.actionable !== true',
  ]],
  ['TASK_EXISTS', 'REVISION_STALE', [
    '!sourceRefId',
    '!maintenanceStatus',
    'dispositionReasonCode != null',
    'snoozedUntil != null',
    'value.actionable !== false',
  ]],
  ['REVISION_STALE', 'DISMISSED', [
    'sourceRefId != null',
    'maintenanceStatus != null',
    'dispositionReasonCode != null',
    'snoozedUntil != null',
    'value.actionable !== false',
  ]],
  ['DISMISSED', 'SNOOZED', [
    '!sourceRefId',
    'maintenanceStatus != null',
    '!dispositionReasonCode',
    'snoozedUntil != null',
    'value.actionable !== false',
  ]],
  ['SNOOZED', null, [
    '!sourceRefId',
    'maintenanceStatus != null',
    '!dispositionReasonCode',
    'snoozedUntil == null',
    'value.actionable !== false',
  ]],
]
for (const [state, nextState, tokens] of lifecycleCombinations) {
  const block = lifecycleBlock(state, nextState)
  for (const token of tokens) {
    expect(block.includes(token), `V37 ${state} lifecycle must enforce ${token}.`)
  }
}

const dispositionAdapter = section(
  api,
  'const adaptChannelHealthCandidateDisposition',
  'const normalizedQuery',
)
for (const state of ['DISMISSED', 'SNOOZED', 'CLEARED']) {
  expect(dispositionAdapter.includes(`state === '${state}'`),
    `V37 disposition response adapter must handle ${state}.`)
}
expect(
  /state === 'DISMISSED'[\s\S]*!reasonCode[\s\S]*snoozedUntil != null/.test(dispositionAdapter),
  'V37 DISMISSED response must require a reason and forbid a snooze timestamp.',
)
expect(
  /state === 'SNOOZED'[\s\S]*!reasonCode[\s\S]*snoozedUntil == null/.test(dispositionAdapter),
  'V37 SNOOZED response must require a reason and a snooze timestamp.',
)
expect(
  /state === 'CLEARED'[\s\S]*reasonCode != null[\s\S]*snoozedUntil != null/.test(dispositionAdapter),
  'V37 CLEARED response must clear reason and snooze fields.',
)

const payloadType = section(
  api,
  'type ChannelHealthCandidateDispositionPayload',
  'const normalizedDispositionRequest',
)
const payloadFields = Array.from(payloadType.matchAll(/^\s*(\w+)\??:/gm), (match) => match[1])
assert.deepEqual(
  payloadFields,
  ['domain', 'sourcePostId', 'sourceRefId', 'action', 'reasonCode', 'snoozeDays'],
  'V37 disposition payload must keep the API whitelist exact.',
)

const normalizedDisposition = section(
  api,
  'const normalizedDispositionRequest',
  'const invalidDispositionResult',
)
for (const token of [
  "if (request.action === 'RESTORE')",
  "action: 'RESTORE'",
  "if (request.action === 'DISMISS')",
  'if (request.snoozeDays != null) return null',
  "action: 'DISMISS'",
  'snoozeDays: null',
  'Number.isSafeInteger(request.snoozeDays)',
  'request.snoozeDays < 1',
  'request.snoozeDays > MAX_SNOOZE_DAYS',
  "action: 'SNOOZE'",
  'reasonCode: request.reasonCode',
]) {
  expect(normalizedDisposition.includes(token), `V37 disposition request normalization is missing ${token}.`)
}
expect(
  (api.match(/client\.post\(/g) || []).length === 1
    && api.includes('client.post(`${BASE_PATH}/disposition`, payload'),
  'V37 API must send only the normalized disposition payload to the disposition endpoint.',
)

const panelDisposition = section(panel, 'const disposeCandidate', 'const load = async')
for (const token of [
  "channelHealthCandidatesApi.dispose({",
  "action: 'DISMISS'",
  "action: 'SNOOZE'",
  "action: 'RESTORE'",
  'domain: candidate.domain',
  'sourcePostId: candidate.sourcePostId',
  'sourceRefId',
  'reasonCode: selectedDispositionReason(candidate)',
  'snoozeDays: null',
  'snoozeDays: selectedSnoozeDays(candidate)',
]) {
  expect(panelDisposition.includes(token), `V37 panel disposition request is missing ${token}.`)
}

const commandFields = Array.from(
  dispositionCommand.matchAll(/^\s*private\s+\w+\s+(\w+);/gm),
  (match) => match[1],
)
assert.deepEqual(
  commandFields,
  ['domain', 'sourcePostId', 'sourceRefId', 'action', 'reasonCode', 'snoozeDays'],
  'V37 backend disposition command must keep the request whitelist exact.',
)

for (const forbidden of [
  'taskId',
  'taskID',
  'assignee',
  'ownerUid',
  'ownerId',
  'authorId',
  'authorUid',
  'createdByUid',
  'revisionToken',
  'revisionNo',
]) {
  expect(!api.includes(forbidden), `V37 candidate API must not expose ${forbidden}.`)
  expect(!panel.includes(forbidden), `V37 candidate panel must not send ${forbidden}.`)
}

for (const token of [
  "type LifecycleFilter = 'ALL' | 'READY' | 'TASK_EXISTS' | 'DISPOSED'",
  "value: 'ALL'",
  "value: 'READY'",
  "value: 'TASK_EXISTS'",
  "value: 'DISPOSED'",
  'filteredItems',
  'refreshKey?: number',
  'pendingDispositionKeys',
  'await load()',
  'watch(() => props.refreshKey',
  'void load()',
  'toast.success(dispositionSuccessMessage(action))',
  'toast.error(getErrorMessage(error, dispositionFailureMessage(action)))',
  'delete nextPendingKeys[key]',
]) {
  expect(panel.includes(token), `V37 panel disposition flow must preserve ${token}.`)
}

for (const token of [
  'BizException',
  'error.code === 30001',
  '该修订已有维护任务，请刷新候选',
  'await load()',
  'shouldReturnToCandidateQueue',
  "router.push('/admin/community-health')",
]) {
  expect(
    maintenanceView.includes(token),
    `V37 duplicate creation recovery must preserve ${token}.`,
  )
}
expect(
  (section(
    maintenanceView,
    'const create = async () =>',
    'const review = async',
  ).match(/contentMaintenanceApi\.create\(command\)/g) || []).length === 1,
  'V37 duplicate creation recovery must not add a blind retry loop.',
)

for (const schema of [migration, initSchema]) {
  expect(
    schema.includes('UNIQUE KEY uk_candidate_disposition_source')
      && schema.includes('(source_type, source_post_id, source_ref_id)'),
    'V37 disposition schema must uniquely key one source revision.',
  )
  expect(
    schema.includes("disposition_state IN ('DISMISSED', 'SNOOZED', 'CLEARED')"),
    'V37 disposition schema must constrain the state enum.',
  )
  expect(
    schema.includes('CONSTRAINT chk_candidate_disposition_ids CHECK')
      && schema.includes('source_post_id > 0')
      && schema.includes('source_ref_id > 0')
      && schema.includes('updated_by_uid > 0'),
    'V37 disposition schema must constrain positive source and operator identifiers.',
  )
  for (const token of [
    'disposition_state = \'SNOOZED\'',
    'disposition_state = \'DISMISSED\'',
    'disposition_state = \'CLEARED\'',
    'reason_code IS NOT NULL',
    'snoozed_until IS NOT NULL',
    'snoozed_until IS NULL',
  ]) {
    expect(schema.includes(token), `V37 disposition schema must encode ${token}.`)
  }
}

const normalizeMigration = (value) => value.replace(/^\uFEFF/, '').replace(/\r\n|\r/g, '\n')
expect(
  normalizeMigration(runtimeMigration) === normalizeMigration(migration),
  'V37 runtime Flyway resource must match the canonical migration source.',
)
const v37ManifestEntry = flywayManifest.migrations.find(
  (item) => item.source === 'db/migration/20260805_channel_quality_candidate_disposition.sql',
)
expect(v37ManifestEntry, 'V37 Flyway manifest must include the candidate disposition migration.')
expect(
  v37ManifestEntry.version === '20260805.01'
    && v37ManifestEntry.resource
      === 'community-bootstrap/src/main/resources/db/flyway/core/V20260805.01__channel_quality_candidate_disposition.sql'
    && flywayManifest.streams.core.expectedMigrations === 79,
  'V37 Flyway manifest must point to the synchronized runtime resource.',
)

for (const token of [
  'ON DUPLICATE KEY UPDATE',
  'source_type = #{sourceType}',
  'source_post_id = #{sourcePostId}',
  'source_ref_id = #{sourceRefId}',
  "disposition_state IN ('DISMISSED', 'SNOOZED')",
  'snoozed_until > CURRENT_TIMESTAMP(3)',
]) {
  expect(dispositionMapper.includes(token), `V37 disposition mapper is missing ${token}.`)
}

for (const token of [
  'STATE_DISMISSED = "DISMISSED"',
  'STATE_SNOOZED = "SNOOZED"',
  'STATE_CLEARED = "CLEARED"',
  'Set.of("DISMISS", "SNOOZE", "RESTORE")',
  '"NOT_ACTIONABLE", "OUT_OF_SCOPE", "DUPLICATE", "WAIT_FOR_AUTHOR"',
  'StringUtils.hasText(rawReasonCode) || snoozeDays != null',
  'snoozeDays < 1 || snoozeDays > 30',
  'new DispositionChange(STATE_CLEARED, null, null)',
  'new DispositionChange(STATE_DISMISSED, reasonCode, null)',
  'new DispositionChange(STATE_SNOOZED, reasonCode, snoozeDays)',
  'requireCurrentPublicRevision(sourcePostId, sourceRefId, domain, operatorUid)',
  'findTaskStatusesBySourceRevision(SOURCE_TYPE, List.of(key))',
  'adminAuditService.recordRequired',
  '"CHANNEL_HEALTH_CANDIDATE_DISPOSITION"',
  '"CHANNEL_HEALTH_CANDIDATE"',
  'auditView(before)',
  'auditView(after)',
]) {
  expect(dispositionService.includes(token), `V37 disposition service is missing ${token}.`)
}

const disposeService = section(
  dispositionService,
  'public ChannelQualityReviewCandidateDispositionDTO dispose',
  'private void requireCurrentPublicRevision',
)
expect(
  /requireCurrentPublicRevision[\s\S]*findTaskStatusesBySourceRevision/.test(disposeService),
  'V37 disposition must verify the current public revision before task lookup.',
)
for (const token of [
  'postFacade.batchGetPosts',
  'PublicContentFilter.isDistributablePost',
  'PostContentRevisionQuery.authorizedChannel',
  'postContentRevisionQuery.query',
  'snapshot.effectivePublishedPostVersion()',
  'sourceRefId != snapshot.effectivePublishedPostVersion().longValue()',
]) {
  expect(
    dispositionService.includes(token),
    `V37 disposition must review current revision with ${token}.`,
  )
}

for (const token of [
  '@PostMapping("/quality-review-candidates/disposition")',
  '@Valid @RequestBody ChannelQualityReviewCandidateDispositionCmd cmd',
  'candidateDispositionService.dispose(cmd, UserContext.require())',
]) {
  expect(controller.includes(token), `V37 disposition controller is missing ${token}.`)
}

const createTask = section(
  maintenanceService,
  'public ContentMaintenanceTaskDTO create',
  'public PageResult<ContentMaintenanceTaskDTO> listMine',
)
for (const token of [
  'requireSourceAssociation(sourceType, sourcePostId, sourceRefId, domain, operatorUid)',
  'mapper.insert',
  'catch (DuplicateKeyException ignored)',
  'throw new BizException(ErrorCode.DUPLICATE_OPERATION)',
  'ContentMaintenanceTaskRow created = requireTask(mapper.lockById(id))',
]) {
  expect(createTask.includes(token), `V37 duplicate task creation recovery is missing ${token}.`)
}

console.log('V37 channel quality candidate disposition guard passed.')
