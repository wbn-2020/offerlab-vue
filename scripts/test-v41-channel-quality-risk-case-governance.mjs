import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const vueRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(vueRoot, relative), 'utf8')
const expect = (value, message) => assert.ok(value, message)
const javaRoot = path.resolve(vueRoot, '..', 'offerlab-java')
const readJava = (relative) => fs.readFileSync(path.join(javaRoot, relative), 'utf8')

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  expect(startIndex >= 0 && endIndex > startIndex, `Unable to locate guarded section: ${start}`)
  return source.slice(startIndex, endIndex)
}

const packageJson = JSON.parse(read('package.json'))
const riskCasesApi = read('src/api/channelHealthRiskCases.ts')
const workspace = read('src/components/health/ChannelHealthRiskCaseWorkspace.vue')
const governanceService = readJava(
  'community-domain-analytics/src/main/java/com/offerlab/community/analytics/application/ChannelQualityReviewRiskCaseGovernanceService.java',
)
const governanceCommands = readJava(
  'community-domain-analytics/src/main/java/com/offerlab/community/analytics/api/dto/ChannelQualityReviewRiskCaseGovernanceCommands.java',
)
const controller = readJava(
  'community-domain-analytics/src/main/java/com/offerlab/community/analytics/controller/ChannelHealthController.java',
)

const guardName = 'test:v41-channel-quality-risk-case-governance'
expect(
  packageJson.scripts[guardName] === 'node scripts/test-v41-channel-quality-risk-case-governance.mjs',
  'V41 governance guard must have a package script.',
)
expect(
  packageJson.scripts['pretest:guards'].includes(guardName),
  'V41 governance guard must run before the full guard suite.',
)

for (const token of [
  'ChannelHealthRiskCaseContractError',
  'requireStrictRemoteResult',
  'onlyKeys',
  'governanceFactVersion',
  'governanceSnapshotEtag',
  'legacyClosedWithoutSnapshot',
  'canAddResolutionRevision',
  'canAddActionReference',
  'canAddEvidence',
  'canPreviewClose',
  'canClose',
  'canInitializeRetrospective',
  'canManageRetrospective',
  'canLinkRecurrence',
  'RECOVERY_CONFIRMED',
  'PARTIAL_RECOVERY',
  'RISK_ACCEPTED',
  'TASK_DELIVERY_RECEIPT',
  'REFUTES_RECOVERY',
  'CLOSE_SNAPSHOT_GENERATED',
  'RETROSPECTIVE_COMPLETED',
  '/governance',
  '/governance-milestones',
  '/resolution-revisions',
  '/action-references',
  '/evidence',
  '/close-preview',
  '/close-snapshot',
  '/retrospective',
  '/recurrence-links',
  'adaptChannelHealthRiskCaseGovernance',
  'adaptChannelHealthRiskCaseCloseSnapshotResponse',
  'adaptChannelHealthRiskCaseRetrospectiveResponse',
  'adaptChannelHealthRiskCaseRecurrenceLinkPage',
  'normalizeCloseRequest',
  'expectedGovernanceVersion',
  'resolutionRevisionId',
  'actionReferenceIds',
  'evidenceEntryIds',
  'retrospectiveOwnerUid',
  'commandId',
]) {
  expect(riskCasesApi.includes(token), `V41 risk case API is missing ${token}.`)
}

for (const [methodName, pathToken] of [
  ['governance', '/governance'],
  ['governanceMilestones', '/governance-milestones'],
  ['resolutionRevisions', '/resolution-revisions'],
  ['addResolutionRevision', '/resolution-revisions'],
  ['actionReferences', '/action-references'],
  ['addActionReference', '/action-references'],
  ['evidence', '/evidence'],
  ['addEvidence', '/evidence'],
  ['closePreview', '/close-preview'],
  ['close', '/close'],
  ['closeSnapshot', '/close-snapshot'],
  ['retrospective', '/retrospective'],
  ['initializeRetrospective', '/retrospective/initialize'],
  ['assignRetrospectiveOwner', '/retrospective/assign-owner'],
  ['startRetrospective', '/retrospective/start'],
  ['recordRetrospectiveFinding', '/retrospective/findings'],
  ['completeRetrospective', '/retrospective/complete'],
  ['retrospectiveEvents', '/retrospective/events'],
  ['recurrenceLinks', '/recurrence-links'],
  ['addRecurrenceLink', '/recurrence-links'],
]) {
  expect(
    riskCasesApi.includes(`  ${methodName}: async (`) && riskCasesApi.includes(pathToken),
    `V41 API must expose ${methodName}.`,
  )
}

const closeMethod = section(
  riskCasesApi,
  '  close: async (',
  '  closeSnapshot: async (',
)
for (const token of [
  'ChannelHealthRiskCaseCloseCmd',
  'normalizeCloseRequest(request)',
  'adaptCloseResult',
]) {
  expect(closeMethod.includes(token), `V41 close must require ${token}.`)
}
expect(
  !closeMethod.includes('normalizeResolutionRequest(request)'),
  'V41 close must not accept the legacy V40 close request.',
)

const closeResultAdapter = section(
  riskCasesApi,
  'const adaptCloseResult = (',
  'export const adaptChannelHealthRiskCaseQueuePage =',
)
for (const token of [
  'onlyKeys(value, [',
  "'case'",
  "'snapshot'",
  "'retrospective'",
  "'milestoneFactVersion'",
]) {
  expect(closeResultAdapter.includes(token), `V41 close result adapter must require ${token}.`)
}

const closeRequestNormalizer = section(
  riskCasesApi,
  'const normalizeCloseRequest = (',
  'const normalizeRetrospectiveVersion =',
)
for (const token of [
  'normalizeClosePreviewRequest(request)',
  'safeCommandId(request?.commandId)',
  'safeRemoteNote(request?.note)',
  'commandId',
]) {
  expect(closeRequestNormalizer.includes(token), `V41 close normalizer must require ${token}.`)
}

const closePreviewRequestNormalizer = section(
  riskCasesApi,
  'const normalizeClosePreviewRequest = (',
  'const normalizeCloseRequest =',
)
for (const token of [
  'expectedGovernanceVersion',
  'resolutionRevisionId',
  'actionReferenceIds',
  'evidenceEntryIds',
  'retrospectiveOwnerUid',
]) {
  expect(closePreviewRequestNormalizer.includes(token), `V41 close selection must require ${token}.`)
}

const governanceAdapter = section(
  riskCasesApi,
  'export const adaptChannelHealthRiskCaseGovernance = (',
  'const adaptGovernanceMilestone =',
)
for (const token of [
  'onlyKeys(value, [',
  'governanceFactVersion',
  'governanceSnapshotEtag',
  'legacyClosedWithoutSnapshot',
  'canAddResolutionRevision',
  'canInitializeRetrospective',
  'canManageRetrospective',
  'governanceVersion !== governanceFactVersion',
  'safeGovernanceSnapshotEtag(value.governanceSnapshotEtag)',
  'caseStatus === \'CLOSED\'',
]) {
  expect(governanceAdapter.includes(token), `Governance adapter must fail closed for ${token}.`)
}
expect(
  riskCasesApi.includes('/^sha256:[a-f0-9]{64}$/'),
  'V41 governance ETag adapter must require the documented sha256 prefix.',
)

const snapshotAdapter = section(
  riskCasesApi,
  'export const adaptChannelHealthRiskCaseCloseSnapshotResponse = (',
  'export const adaptChannelHealthRiskCaseRetrospectiveResponse =',
)
for (const token of [
  'onlyKeys(value, [\'caseId\', \'legacyClosedWithoutSnapshot\', \'snapshot\'])',
  'legacyClosedWithoutSnapshot && snapshot != null',
  'String(snapshot.caseId) !== String(caseId)',
]) {
  expect(snapshotAdapter.includes(token), `Close snapshot adapter must enforce ${token}.`)
}

for (const token of [
  'loadGovernanceData',
  'governance.canAddResolutionRevision',
  'governance.canAddActionReference',
  'governance.canAddEvidence',
  'governance.canPreviewClose',
  'governance.canClose',
  'governance.canInitializeRetrospective',
  'governance.canManageRetrospective',
  'governance.canLinkRecurrence',
  'closePreviewIsCurrent',
  'channelHealthRiskCasesApi.closePreview',
  'channelHealthRiskCasesApi.close',
  'channelHealthRiskCasesApi.initializeRetrospective',
  'channelHealthRiskCasesApi.recordRetrospectiveFinding',
  'channelHealthRiskCasesApi.addRecurrenceLink',
  'await Promise.all([loadDetail(caseId), loadEventsForCase(caseId), loadGovernanceData(caseId)])',
  '过程事实，不单独证明内容恢复。',
  '历史关闭，未生成 V41 证据快照',
]) {
  expect(workspace.includes(token), `V41 workspace is missing ${token}.`)
}

const closeHandler = section(workspace, 'const closeRiskCase = async () => {', 'const addResolutionRevision = async () => {')
for (const token of [
  'currentGovernance.canClose',
  'closePreviewIsCurrent.value',
  'expectedGovernanceVersion: currentGovernance.governanceVersion',
  'resolutionRevisionId: closeResolutionRevisionIdDraft.value',
  'actionReferenceIds: closeActionReferenceIdsDraft.value',
  'evidenceEntryIds: closeEvidenceEntryIdsDraft.value',
  'retrospectiveOwnerUid: closeRetrospectiveOwnerUidDraft.value',
  'commandId: commandIdFor(\'close\', \'close\')',
]) {
  expect(closeHandler.includes(token), `V41 close handler must use ${token}.`)
}
expect(
  !closeHandler.includes('current.canClose'),
  'V41 close handler must not use the legacy V40 capability as its authorization gate.',
)

const initializeRetrospectiveHandler = section(
  workspace,
  'const initializeRetrospective = async () => {',
  'const assignRetrospectiveOwner = async () => {',
)
expect(
  initializeRetrospectiveHandler.includes('expectedRetrospectiveVersion: 0'),
  'V41 retrospective initialization must begin from version zero.',
)
for (const token of [
  '@NotNull @Min(0) private Integer expectedRetrospectiveVersion;',
  'if (requireVersion(cmd.getExpectedRetrospectiveVersion()) != 0)',
  'return "sha256:" + sha256(canonicalJson(payload));',
  'ChannelQualityReviewRiskCaseCloseSnapshotDTO snapshot =',
  'riskCaseGovernanceService.closeWithSnapshot(caseId, cmd, operatorUid);',
  'ChannelQualityReviewRiskCaseDTO caseDetail = riskCaseService.detail(caseId, operatorUid);',
]) {
  expect(
    governanceCommands.includes(token)
      || governanceService.includes(token)
      || controller.includes(token),
    `V41 backend contract is missing ${token}.`,
  )
}

for (const forbiddenToken of [
  'contentMaintenanceApi.',
  'AdminMaintenanceTasksView',
  'MaintenanceTasksView',
  'operatorUid',
  'taskId',
  '/maintenance-tasks',
]) {
  expect(
    !workspace.includes(forbiddenToken),
    `V41 workspace must not expose or call ${forbiddenToken}.`,
  )
}

console.log('V41 channel quality risk case governance guard passed.')
