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
const batchApi = read('src/api/channelHealthReviewBatches.ts')
const batchPanel = read('src/components/health/ChannelHealthReviewBatchPanel.vue')
const workspace = read('src/components/health/ChannelHealthReviewBatchCoordinationWorkspace.vue')
const timeline = read('src/components/health/ChannelHealthReviewBatchEventTimeline.vue')
const channelHealthView = read('src/views/AdminChannelHealthView.vue')

const guardName = 'test:v39-channel-quality-review-batch-coordination'
expect(
  packageJson.scripts[guardName] === 'node scripts/test-v39-channel-quality-review-batch-coordination.mjs',
  'V39 guard must have a package script.',
)
expect(
  packageJson.scripts['pretest:guards'].includes(guardName),
  'V39 guard must run before the full guard suite.',
)

for (const token of [
  'withRemoteResultProvenance',
  'ChannelHealthReviewBatchCoordinationContractError',
  'ChannelHealthReviewBatchCoordination',
  'ChannelHealthReviewBatchEventPage',
  'effectiveDueAt',
  'coordinationVersion',
  'canExtendDueAt',
  'canBulkReassign',
  'canAddRiskNote',
  'canWithdrawOpenTasks',
  'DEADLINE_EXTENDED',
  'ACTIVE_TASKS_REASSIGNED',
  'RISK_NOTE_ADDED',
  'OPEN_TASKS_WITHDRAWN',
  'BLOCKER',
  'CAPACITY_RISK',
  'REVIEW_DELAY',
  'OVERDUE_ESCALATION',
  'SCOPE_INVALID',
  'DUPLICATE_SCOPE',
  'PRIORITY_REPLACED',
  '/coordination',
  '/extend-deadline',
  '/reassign-active-tasks',
  '/risk-notes',
  '/withdraw-open-tasks',
  '/events',
]) {
  expect(batchApi.includes(token), `V39 batch coordination API is missing ${token}.`)
}
for (const token of [
  'const dueAt = safeOptionalTimestamp(value?.dueAt)',
  'const effectiveDueAt = safeOptionalTimestamp(value?.effectiveDueAt)',
  '(dueAt == null) !== (effectiveDueAt == null)',
  'canExtendDueAt !== (hasConfiguredDeadline && expectedActiveTaskCount > 0)',
]) {
  expect(batchApi.includes(token), `V39 coordination deadline adapter is missing ${token}.`)
}
const batchSummaryAdapter = section(batchApi, 'const adaptBatchSummary = (', 'const adaptBatchItem = (')
for (const token of [
  'dueAt: string | null',
  'const dueAt = safeOptionalTimestamp(value?.dueAt)',
  'dueAt === undefined',
  "dueAt != null\n      && dueState === 'NOT_APPLICABLE'",
]) {
  expect(batchSummaryAdapter.includes(token) || batchApi.includes(token), `V39 legacy deadline adapter is missing ${token}.`)
}

const strictResultAdapter = section(
  batchApi,
  'const adaptStrictCoordinationResult = (',
  'const adaptStrictEventPageResult = (',
)
expect(
  strictResultAdapter.includes("result.code !== 0 || result.source !== 'remote' || result.degraded || result.data == null"),
  'V39 writes must reject non-remote, degraded, non-success, or empty responses.',
)

for (const [methodName, normalizer] of [
  ['extendDeadline', 'normalizedExtendDeadlineRequest'],
  ['reassignActiveTasks', 'normalizedReassignActiveTasksRequest'],
  ['addRiskNote', 'normalizedRiskNoteRequest'],
  ['withdrawOpenTasks', 'normalizedWithdrawOpenTasksRequest'],
]) {
  const method = section(batchApi, `  ${methodName}: async (`, methodName === 'withdrawOpenTasks'
    ? '  events: async ('
    : `  ${methodName === 'extendDeadline' ? 'reassignActiveTasks' : methodName === 'reassignActiveTasks' ? 'addRiskNote' : 'withdrawOpenTasks'}: async (`)
  expect(
    method.includes(`const payload = ${normalizer}(request)`)
      && method.includes('adaptStrictCoordinationResult(raw)'),
    `V39 ${methodName} must normalize the concurrency version and use the strict remote adapter.`,
  )
}
expect(
  batchApi.includes('normalizedCoordinationVersion(request?.expectedCoordinationVersion)'),
  'V39 command normalizers must validate the expected coordination version.',
)

expect(
  batchApi.includes('previousAssigneeUid == null || previousAssigneeUid !== replacementAssigneeUid'),
  'V39 event adapter must accept a null previous assignee for mixed-origin batch reassignment.',
)

for (const token of [
  'ChannelHealthReviewBatchEventTimeline',
  'channelHealthReviewBatchesApi.coordination',
  'channelHealthReviewBatchesApi.extendDeadline',
  'channelHealthReviewBatchesApi.reassignActiveTasks',
  'channelHealthReviewBatchesApi.addRiskNote',
  'channelHealthReviewBatchesApi.withdrawOpenTasks',
  'expectedOpenTaskCount: current.openTaskCount',
  'expectedActiveTaskCount: current.activeTaskCount',
  "if (value == null) return '未设置'",
  'await reloadRemoteState()',
  "emit('coordinated', props.batchId)",
]) {
  expect(workspace.includes(token), `V39 coordination workspace is missing ${token}.`)
}
expect(
  !workspace.includes('contentMaintenanceApi.reassign'),
  'V39 coordination workspace must not call the single-task reassignment API.',
)
const writeAction = section(workspace, 'const executeWrite = async (', 'const extendDeadline = async () => {')
expect(
  !writeAction.includes('coordination.value ='),
  'V39 write completion must not optimistically replace the coordination snapshot.',
)

for (const token of [
  '多个原负责人已统一改派',
  'event.previousAssigneeUid == null',
  'ACTIVE_TASKS_REASSIGNED',
  'channelHealthReviewBatchesApi.events',
  'redactSensitiveIdentifiers',
]) {
  expect(timeline.includes(token), `V39 event timeline is missing ${token}.`)
}
expect(
  !timeline.includes('{{ event.previousAssigneeUid }}')
    && !timeline.includes('{{ event.replacementAssigneeUid }}')
    && !timeline.includes('{{ event.note }}')
    && timeline.includes('{{ redactSensitiveIdentifiers(event.note) }}'),
  'V39 event timeline must redact event notes and must not render internal assignee UIDs.',
)

for (const token of [
  'ChannelHealthReviewBatchCoordinationWorkspace',
  '@coordinated="handleCoordinationChanged"',
  'Promise.all([loadDetail(batchId), load()])',
  "emit('batch-coordinated', batchId)",
  '派发负责人 UID',
  'const formatDueAt = (value: string | null)',
  "if (value == null) return '未设置'",
]) {
  expect(batchPanel.includes(token), `V39 batch panel integration is missing ${token}.`)
}

for (const token of [
  '@batch-coordinated="handleBatchCoordinated"',
  'const handleBatchCoordinated',
  'batchRefreshKey.value += 1',
]) {
  expect(channelHealthView.includes(token), `V39 channel-health refresh integration is missing ${token}.`)
}

console.log('V39 channel quality review batch coordination guard passed.')
