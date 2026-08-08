import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const vueRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(vueRoot, relative), 'utf8')
const expect = (value, message) => assert.ok(value, message)

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  expect(startIndex >= 0 && endIndex > startIndex, `Unable to locate guarded section: ${start}`)
  return source.slice(startIndex, endIndex)
}

const packageJson = JSON.parse(read('package.json'))
const riskCasesApi = read('src/api/channelHealthRiskCases.ts')
const workspace = read('src/components/health/ChannelHealthRiskCaseWorkspace.vue')
const batchPanel = read('src/components/health/ChannelHealthReviewBatchPanel.vue')
const channelHealthView = read('src/views/AdminChannelHealthView.vue')

const guardName = 'test:v40-channel-quality-risk-case-workbench'
expect(
  packageJson.scripts[guardName] === 'node scripts/test-v40-channel-quality-risk-case-workbench.mjs',
  'V40 guard must have a package script.',
)
expect(
  packageJson.scripts['pretest:guards'].includes(guardName),
  'V40 guard must run before the full guard suite.',
)

for (const token of [
  'withRemoteResultProvenance',
  'ChannelHealthRiskCaseContractError',
  'ChannelHealthRiskCaseQueuePage',
  'ChannelHealthRiskCaseDetail',
  'ChannelHealthRiskCaseEventPage',
  'safeOpaqueCursor',
  'onlyKeys',
  'UNHANDLED_RISK_EVENT',
  'DUE_SOON',
  'OVERDUE',
  'ACTIVE_CASE',
  'RISK_EVENT',
  'DUE_STATE',
  'OPEN',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'CASE_OPENED',
  'OWNER_ASSIGNED',
  'OWNER_ACKNOWLEDGED',
  'PLAN_RECORDED',
  'PROGRESS_RECORDED',
  'RESOLUTION_SUBMITTED',
  'CASE_CLOSED',
  'canAssignOwner',
  'canAcknowledge',
  'canRecordPlan',
  'canRecordProgress',
  'canSubmitResolution',
  'canClose',
  'expectedCaseVersion',
  'expectedCoordinationVersion',
  'riskEventId',
  'coordinationVersion',
  '/quality-review-risk-cases',
  '/risk-cases',
  '/assign-owner',
  '/acknowledge',
  '/plan',
  '/progress',
  '/submit-resolution',
  '/close',
  '/events',
]) {
  expect(riskCasesApi.includes(token), `V40 risk case API is missing ${token}.`)
}

const strictRemoteResult = section(
  riskCasesApi,
  'const requireStrictRemoteResult = <T>(',
  'const encodeId =',
)
expect(
  strictRemoteResult.includes("result.code !== 0 || result.source !== 'remote' || result.degraded || result.data == null"),
  'V40 responses must reject non-remote, degraded, non-success, or empty data.',
)

const queueAdapter = section(
  riskCasesApi,
  'export const adaptChannelHealthRiskCaseQueuePage = (',
  'export const adaptChannelHealthRiskCaseEventPage = (',
)
for (const token of [
  "onlyKeys(value, ['nextCursor', 'items'])",
  'safeOpaqueCursor(value.nextCursor)',
  'items.some((item) => item == null)',
]) {
  expect(queueAdapter.includes(token), `V40 queue adapter must strictly validate ${token}.`)
}
expect(
  !queueAdapter.includes('BigInt(String(nextCursor))'),
  'V40 queue cursor must remain opaque and must not be deconstructed as an identifier.',
)

for (const [methodName, pathToken] of [
  ['queue', 'RISK_CASES_PATH'],
  ['create', 'REVIEW_BATCHES_PATH'],
  ['detail', 'RISK_CASES_PATH'],
  ['events', '/events'],
  ['assignOwner', '/assign-owner'],
  ['acknowledge', '/acknowledge'],
  ['plan', '/plan'],
  ['progress', '/progress'],
  ['submitResolution', '/submit-resolution'],
  ['close', '/close'],
]) {
  expect(
    riskCasesApi.includes(`  ${methodName}: async (`) && riskCasesApi.includes(pathToken),
    `V40 API must expose ${methodName}.`,
  )
}

for (const token of [
  'channelHealthRiskCasesApi.queue',
  'channelHealthRiskCasesApi.create',
  'channelHealthRiskCasesApi.detail',
  'channelHealthRiskCasesApi.events',
  'channelHealthRiskCasesApi.assignOwner',
  'channelHealthRiskCasesApi.acknowledge',
  'channelHealthRiskCasesApi.plan',
  'channelHealthRiskCasesApi.progress',
  'channelHealthRiskCasesApi.submitResolution',
  'channelHealthRiskCasesApi.close',
  'detail.canAssignOwner',
  'detail.canAcknowledge',
  'detail.canRecordPlan',
  'detail.canRecordProgress',
  'detail.canSubmitResolution',
  'detail.canClose',
  'expectedCaseVersion: current.caseVersion',
  'expectedCoordinationVersion: current.coordinationVersion',
  'expectedCoordinationVersion: target.coordinationVersion',
  'await refreshAfterWrite(current.id)',
  'await Promise.all([loadDetail(response.data.id), loadEventsForCase(response.data.id)])',
  "emit('open-batch-coordination', detail.batch.batchId)",
  'createDrafts',
  'assignOwnerNoteDraft',
  'acknowledgeNoteDraft',
  'planNoteDraft',
  'progressNoteDraft',
  'resolutionNoteDraft',
  'closeNoteDraft',
  'redactSensitiveText',
]) {
  expect(workspace.includes(token), `V40 workspace is missing ${token}.`)
}
for (const forbiddenToken of [
  'contentMaintenanceApi.',
  'AdminMaintenanceTasksView',
  'MaintenanceTasksView',
  'operatorUid',
  'taskId',
]) {
  expect(
    !workspace.includes(forbiddenToken),
    `V40 workspace must not expose or call ${forbiddenToken}.`,
  )
}
const writeAction = section(workspace, 'const executeWrite = async (', 'const createCase = async () => {')
expect(
  !writeAction.includes('detail.value = response.data'),
  'V40 write completion must not optimistically replace the detail snapshot.',
)

for (const token of [
  'const openBatch = async (batchId: ApiId)',
  'await loadDetail(batchId)',
  'defineExpose({',
  'openBatch,',
]) {
  expect(batchPanel.includes(token), `V40 batch-panel bridge is missing ${token}.`)
}

for (const token of [
  'ChannelHealthRiskCaseWorkspace',
  '@open-batch-coordination="handleOpenBatchCoordination"',
  'ref="reviewBatchPanel"',
  'ChannelHealthReviewBatchPanelExposed',
  'const handleOpenBatchCoordination = async (batchId: ApiId)',
  'await reviewBatchPanel.value?.openBatch(batchId)',
  'riskCaseRefreshKey.value += 1',
]) {
  expect(channelHealthView.includes(token), `V40 channel-health integration is missing ${token}.`)
}

console.log('V40 channel quality risk case workbench guard passed.')
