import client, { type Result, withRemoteResultProvenance } from './client'
import type { ApiId } from './types'

const BASE_PATH = '/api/v1/community-health'
const RISK_CASES_PATH = `${BASE_PATH}/quality-review-risk-cases`
const REVIEW_BATCHES_PATH = `${BASE_PATH}/quality-review-batches`
const MAX_SIGNED_LONG = 9_223_372_036_854_775_807n
const MAX_PAGE_SIZE = 20
const MAX_ACTIVE_TASK_COUNT = 20
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const
const DUE_STATES = ['NOT_APPLICABLE', 'ON_TRACK', 'DUE_SOON', 'OVERDUE'] as const
const QUEUE_MODES = ['ALL', 'UNHANDLED', 'ACTIVE', 'RESOLVED'] as const
const QUEUE_TRIGGER_TYPES = ['UNHANDLED_RISK_EVENT', 'DUE_SOON', 'OVERDUE', 'ACTIVE_CASE'] as const
const CASE_TRIGGER_TYPES = ['RISK_EVENT', 'DUE_STATE'] as const
const CASE_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const
const RISK_CODES = [
  'BLOCKER',
  'CAPACITY_RISK',
  'REVIEW_DELAY',
  'OVERDUE_ESCALATION',
] as const
const EVENT_TYPES = [
  'CASE_OPENED',
  'OWNER_ASSIGNED',
  'OWNER_ACKNOWLEDGED',
  'PLAN_RECORDED',
  'PROGRESS_RECORDED',
  'RESOLUTION_SUBMITTED',
  'CASE_CLOSED',
] as const
const OUTCOME_TYPES = [
  'RECOVERY_CONFIRMED',
  'PARTIAL_RECOVERY',
  'RISK_CONTAINED',
  'FALSE_POSITIVE_CONFIRMED',
  'RISK_ACCEPTED',
] as const
const CONTENT_RECOVERY_STATES = ['VERIFIED', 'PARTIAL', 'NOT_VERIFIED', 'NOT_APPLICABLE'] as const
const RESIDUAL_RISK_LEVELS = ['NONE', 'LOW', 'MEDIUM', 'HIGH'] as const
const ROOT_CAUSE_ROLES = ['PRIMARY', 'CONTRIBUTING'] as const
const ROOT_CAUSE_CATEGORIES = [
  'CONTENT_QUALITY',
  'OWNER_CAPACITY',
  'PROCESS_GAP',
  'DEPENDENCY_BLOCKED',
  'DATA_SIGNAL_ERROR',
  'POLICY_AMBIGUITY',
  'SYSTEM_DEFECT',
  'EXTERNAL_CONSTRAINT',
  'UNKNOWN',
] as const
const ACTION_REFERENCE_TYPES = [
  'V39_COORDINATION_EVENT',
  'V40_CASE_EVENT',
  'MAINTENANCE_TASK',
  'CONTENT_REVISION',
  'GOVERNANCE_DECISION',
  'EXTERNAL_TICKET',
] as const
const EVIDENCE_TYPES = [
  'CONTENT_STATE_OBSERVATION',
  'QUALITY_RECHECK',
  'TASK_DELIVERY_RECEIPT',
  'COORDINATION_CONFIRMATION',
  'POLICY_DECISION',
  'EXTERNAL_CONFIRMATION',
] as const
const ASSERTION_TYPES = [
  'SUPPORTS_RECOVERY',
  'SUPPORTS_PARTIAL_RECOVERY',
  'SUPPORTS_CONTAINMENT',
  'SUPPORTS_FALSE_POSITIVE',
  'SUPPORTS_RISK_ACCEPTANCE',
  'REFUTES_RECOVERY',
  'INCONCLUSIVE',
] as const
const CLOSE_CHECK_LEVELS = ['BLOCKING', 'ADVISORY'] as const
const CLOSE_CHECK_RESULTS = ['PASS', 'FAIL', 'NOT_APPLICABLE'] as const
const RETROSPECTIVE_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const
const RETROSPECTIVE_EVENT_TYPES = [
  'RETROSPECTIVE_CREATED',
  'RETROSPECTIVE_OWNER_ASSIGNED',
  'RETROSPECTIVE_STARTED',
  'RETROSPECTIVE_FINDING_RECORDED',
  'RETROSPECTIVE_COMPLETED',
] as const
const LEARNING_CATEGORIES = [
  'CONTENT_AND_REVIEW',
  'PROCESS_AND_HANDOFF',
  'CAPACITY_AND_SLA',
  'SIGNAL_AND_DATA',
  'POLICY_AND_GOVERNANCE',
  'SYSTEM_AND_TOOLING',
  'EXTERNAL_DEPENDENCY',
  'OTHER',
] as const
const RECURRENCE_RELATION_TYPES = [
  'SAME_ROOT_CAUSE',
  'SAME_CHANNEL_PATTERN',
  'SAME_BATCH_PATTERN',
  'MANUAL_RELATED',
] as const
const GOVERNANCE_MILESTONE_CODES = [
  'OWNER_ASSIGNED',
  'OWNER_ACKNOWLEDGED',
  'PLAN_RECORDED',
  'CLOSE_SNAPSHOT_GENERATED',
  'RETROSPECTIVE_PENDING',
  'RETROSPECTIVE_OWNER_ASSIGNED',
  'RETROSPECTIVE_COMPLETED',
] as const
const GOVERNANCE_MILESTONE_SOURCE_TYPES = [
  'V40_CASE_EVENT',
  'V41_CLOSE_SNAPSHOT',
  'V41_RETROSPECTIVE',
] as const
const RESPONSIBILITY_SCOPES = ['CASE_OWNER', 'RETROSPECTIVE', 'CASE'] as const
const REQUIRED_ACTIONS = ['ACKNOWLEDGE_CASE', 'RECORD_PLAN', 'NONE'] as const

export type ChannelHealthRiskCasePriority = (typeof PRIORITIES)[number]
export type ChannelHealthRiskCaseDueState = (typeof DUE_STATES)[number]
export type ChannelHealthRiskCaseQueueMode = (typeof QUEUE_MODES)[number]
export type ChannelHealthRiskCaseQueueTriggerType = (typeof QUEUE_TRIGGER_TYPES)[number]
export type ChannelHealthRiskCaseTriggerType = (typeof CASE_TRIGGER_TYPES)[number]
export type ChannelHealthRiskCaseStatus = (typeof CASE_STATUSES)[number]
export type ChannelHealthRiskCaseRiskCode = (typeof RISK_CODES)[number]
export type ChannelHealthRiskCaseEventType = (typeof EVENT_TYPES)[number]
export type ChannelHealthRiskCaseOutcomeType = (typeof OUTCOME_TYPES)[number]
export type ChannelHealthRiskCaseContentRecoveryState = (typeof CONTENT_RECOVERY_STATES)[number]
export type ChannelHealthRiskCaseResidualRiskLevel = (typeof RESIDUAL_RISK_LEVELS)[number]
export type ChannelHealthRiskCaseRootCauseRole = (typeof ROOT_CAUSE_ROLES)[number]
export type ChannelHealthRiskCaseRootCauseCategory = (typeof ROOT_CAUSE_CATEGORIES)[number]
export type ChannelHealthRiskCaseActionReferenceType = (typeof ACTION_REFERENCE_TYPES)[number]
export type ChannelHealthRiskCaseEvidenceType = (typeof EVIDENCE_TYPES)[number]
export type ChannelHealthRiskCaseEvidenceAssertionType = (typeof ASSERTION_TYPES)[number]
export type ChannelHealthRiskCaseCloseCheckLevel = (typeof CLOSE_CHECK_LEVELS)[number]
export type ChannelHealthRiskCaseCloseCheckResult = (typeof CLOSE_CHECK_RESULTS)[number]
export type ChannelHealthRiskCaseRetrospectiveStatus = (typeof RETROSPECTIVE_STATUSES)[number]
export type ChannelHealthRiskCaseRetrospectiveEventType = (typeof RETROSPECTIVE_EVENT_TYPES)[number]
export type ChannelHealthRiskCaseLearningCategory = (typeof LEARNING_CATEGORIES)[number]
export type ChannelHealthRiskCaseRecurrenceRelationType = (typeof RECURRENCE_RELATION_TYPES)[number]
export type ChannelHealthRiskCaseGovernanceMilestoneCode = (typeof GOVERNANCE_MILESTONE_CODES)[number]
export type ChannelHealthRiskCaseGovernanceMilestoneSourceType = (typeof GOVERNANCE_MILESTONE_SOURCE_TYPES)[number]
export type ChannelHealthRiskCaseResponsibilityScope = (typeof RESPONSIBILITY_SCOPES)[number]
export type ChannelHealthRiskCaseRequiredAction = (typeof REQUIRED_ACTIONS)[number]

export interface ChannelHealthRiskCaseQueueItem {
  batchId: ApiId
  domain: number
  batchName: string
  priority: ChannelHealthRiskCasePriority
  dueAt: string | null
  effectiveDueAt: string | null
  activeTaskCount: number
  dueState: ChannelHealthRiskCaseDueState
  triggerType: ChannelHealthRiskCaseQueueTriggerType
  triggerSummary: string
  riskEventId: ApiId | null
  riskCode: ChannelHealthRiskCaseRiskCode | null
  caseId: ApiId | null
  caseStatus: ChannelHealthRiskCaseStatus | null
  coordinationOwnerUid: ApiId | null
  coordinationVersion: number
  updateTime: string
}

export interface ChannelHealthRiskCaseQueuePage {
  nextCursor: string | null
  items: ChannelHealthRiskCaseQueueItem[]
}

export interface ChannelHealthRiskCaseBatchSummary {
  batchId: ApiId
  domain: number
  name: string
  priority: ChannelHealthRiskCasePriority
  dueAt: string | null
  effectiveDueAt: string | null
  activeTaskCount: number
  dueState: ChannelHealthRiskCaseDueState
}

export interface ChannelHealthRiskCaseDetail {
  id: ApiId
  batch: ChannelHealthRiskCaseBatchSummary
  triggerType: ChannelHealthRiskCaseTriggerType
  riskEventId: ApiId | null
  riskCode: ChannelHealthRiskCaseRiskCode | null
  dueState: Extract<ChannelHealthRiskCaseDueState, 'DUE_SOON' | 'OVERDUE'> | null
  status: ChannelHealthRiskCaseStatus
  ownerUid: ApiId | null
  caseVersion: number
  openedCoordinationVersion: number
  coordinationVersion: number
  createTime: string
  updateTime: string
  canAssignOwner: boolean
  canAcknowledge: boolean
  canRecordPlan: boolean
  canRecordProgress: boolean
  canSubmitResolution: boolean
  canClose: boolean
}

export interface ChannelHealthRiskCaseEvent {
  id: ApiId
  eventType: ChannelHealthRiskCaseEventType
  previousStatus: ChannelHealthRiskCaseStatus | null
  status: ChannelHealthRiskCaseStatus
  note: string
  caseVersion: number
  createTime: string
}

export interface ChannelHealthRiskCaseEventPage {
  nextCursor: string | null
  items: ChannelHealthRiskCaseEvent[]
}

export interface ChannelHealthRiskCaseQueueQuery {
  domain: number
  mode?: ChannelHealthRiskCaseQueueMode
  cursor?: string
  size?: number
}

export interface ChannelHealthRiskCaseEventQuery {
  cursor?: string
  size?: number
}

export interface ChannelHealthRiskCaseCreateCmd {
  expectedCoordinationVersion: number
  riskEventId?: ApiId | null
  note: string
}

export interface ChannelHealthRiskCaseAssignOwnerCmd {
  expectedCaseVersion: number
  ownerUid: ApiId
  note: string
}

export interface ChannelHealthRiskCaseNoteCmd {
  expectedCaseVersion: number
  note: string
}

export interface ChannelHealthRiskCaseResolutionCmd extends ChannelHealthRiskCaseNoteCmd {
  expectedCoordinationVersion: number
}

export interface ChannelHealthRiskCaseRootCause {
  role: ChannelHealthRiskCaseRootCauseRole
  category: ChannelHealthRiskCaseRootCauseCategory
  sequenceNo: number
  note: string
}

export interface ChannelHealthRiskCaseResolutionRevision {
  id: ApiId
  caseId: ApiId
  revisionNo: number
  outcomeType: ChannelHealthRiskCaseOutcomeType
  contentRecoveryState: ChannelHealthRiskCaseContentRecoveryState
  recoveryScope: string
  residualRiskLevel: ChannelHealthRiskCaseResidualRiskLevel
  summary: string
  rootCauses: ChannelHealthRiskCaseRootCause[]
  createTime: string
}

export interface ChannelHealthRiskCaseResolutionRevisionSummary {
  id: ApiId
  revisionNo: number
  outcomeType: ChannelHealthRiskCaseOutcomeType
  contentRecoveryState: ChannelHealthRiskCaseContentRecoveryState
  residualRiskLevel: ChannelHealthRiskCaseResidualRiskLevel
  summary: string
  createTime: string
}

export interface ChannelHealthRiskCaseActionReference {
  id: ApiId
  caseId: ApiId
  referenceType: ChannelHealthRiskCaseActionReferenceType
  observedVersion: number | null
  occurredAt: string
  summary: string
  correctionOfReferenceId: ApiId | null
  createTime: string
}

export interface ChannelHealthRiskCaseEvidenceEntry {
  id: ApiId
  caseId: ApiId
  evidenceType: ChannelHealthRiskCaseEvidenceType
  assertionType: ChannelHealthRiskCaseEvidenceAssertionType
  subjectType: string
  sourceType: string
  sourceVersion: number | null
  observedAt: string
  summary: string
  correctionOfEntryId: ApiId | null
  createTime: string
}

export interface ChannelHealthRiskCaseCloseCheck {
  providerCode: string
  providerVersion: number
  requirementLevel: ChannelHealthRiskCaseCloseCheckLevel
  result: ChannelHealthRiskCaseCloseCheckResult
  reasonCode: string
  summary: string
}

export interface ChannelHealthRiskCaseRetrospective {
  id: ApiId
  caseId: ApiId
  closeSnapshotId: ApiId | null
  domain: number
  status: ChannelHealthRiskCaseRetrospectiveStatus
  ownerUid: ApiId | null
  retrospectiveVersion: number
  legacyBaseline: boolean
  startedAt: string | null
  completedAt: string | null
  createTime: string
  updateTime: string
  canAssignOwner: boolean
  canStart: boolean
  canRecordFinding: boolean
  canComplete: boolean
}

export interface ChannelHealthRiskCaseRetrospectiveSummary {
  id: ApiId
  status: ChannelHealthRiskCaseRetrospectiveStatus
  ownerUid: ApiId | null
  retrospectiveVersion: number
  legacyBaseline: boolean
  updateTime: string
}

export interface ChannelHealthRiskCaseGovernance {
  caseId: ApiId
  batchId: ApiId
  domain: number
  caseStatus: ChannelHealthRiskCaseStatus
  caseVersion: number
  coordinationVersion: number
  governanceVersion: number
  governanceFactVersion: number
  governanceSnapshotEtag: string
  currentResolutionRevision: ChannelHealthRiskCaseResolutionRevisionSummary | null
  actionReferenceCount: number
  evidenceCount: number
  closeSnapshotId: ApiId | null
  legacyClosedWithoutSnapshot: boolean
  retrospective: ChannelHealthRiskCaseRetrospectiveSummary | null
  milestoneFactVersion: string
  canAddResolutionRevision: boolean
  canAddActionReference: boolean
  canAddEvidence: boolean
  canPreviewClose: boolean
  canClose: boolean
  canInitializeRetrospective: boolean
  canManageRetrospective: boolean
  canLinkRecurrence: boolean
}

export interface ChannelHealthRiskCaseGovernanceMilestone {
  sourceFactId: ApiId
  milestoneCode: ChannelHealthRiskCaseGovernanceMilestoneCode
  occurredAt: string
  sourceType: ChannelHealthRiskCaseGovernanceMilestoneSourceType
  responsibilityScope: ChannelHealthRiskCaseResponsibilityScope
  responsibilityEpoch: number | null
  ownerUid: ApiId | null
  caseStatusAfter: ChannelHealthRiskCaseStatus | null
  requiredAction: ChannelHealthRiskCaseRequiredAction
  contractVersion: string
  factVersion: number
}

export interface ChannelHealthRiskCaseGovernanceMilestonePage {
  nextCursor: string | null
  items: ChannelHealthRiskCaseGovernanceMilestone[]
}

export interface ChannelHealthRiskCaseResolutionRevisionPage {
  nextCursor: string | null
  items: ChannelHealthRiskCaseResolutionRevision[]
}

export interface ChannelHealthRiskCaseActionReferencePage {
  nextCursor: string | null
  items: ChannelHealthRiskCaseActionReference[]
}

export interface ChannelHealthRiskCaseEvidenceEntryPage {
  nextCursor: string | null
  items: ChannelHealthRiskCaseEvidenceEntry[]
}

export interface ChannelHealthRiskCaseClosePreview {
  caseId: ApiId
  readyToClose: boolean
  caseVersion: number
  coordinationVersion: number
  governanceVersion: number
  governanceFactVersion: number
  checks: ChannelHealthRiskCaseCloseCheck[]
}

export interface ChannelHealthRiskCaseCloseSnapshot {
  id: ApiId
  caseId: ApiId
  batchId: ApiId
  domain: number
  resolutionRevisionId: ApiId
  closedCaseVersion: number
  closedCoordinationVersion: number
  closedGovernanceVersion: number
  outcomeType: ChannelHealthRiskCaseOutcomeType
  contentRecoveryState: ChannelHealthRiskCaseContentRecoveryState
  primaryRootCause: ChannelHealthRiskCaseRootCauseCategory
  rootCauses: ChannelHealthRiskCaseRootCause[]
  residualRiskLevel: ChannelHealthRiskCaseResidualRiskLevel
  actionReferenceCount: number
  evidenceCount: number
  actionReferences: ChannelHealthRiskCaseActionReference[]
  evidenceEntries: ChannelHealthRiskCaseEvidenceEntry[]
  checks: ChannelHealthRiskCaseCloseCheck[]
  payloadSchemaVersion: number
  snapshotDigest: string
  createTime: string
}

export interface ChannelHealthRiskCaseCloseSnapshotResponse {
  caseId: ApiId
  legacyClosedWithoutSnapshot: boolean
  snapshot: ChannelHealthRiskCaseCloseSnapshot | null
}

export interface ChannelHealthRiskCaseRetrospectiveEvent {
  id: ApiId
  eventType: ChannelHealthRiskCaseRetrospectiveEventType
  previousStatus: ChannelHealthRiskCaseRetrospectiveStatus | null
  status: ChannelHealthRiskCaseRetrospectiveStatus
  ownerUid: ApiId | null
  learningCategory: ChannelHealthRiskCaseLearningCategory | null
  findingSummary: string | null
  preventionActionSummary: string | null
  note: string
  retrospectiveVersion: number
  createTime: string
}

export interface ChannelHealthRiskCaseRetrospectiveEventPage {
  nextCursor: string | null
  items: ChannelHealthRiskCaseRetrospectiveEvent[]
}

export interface ChannelHealthRiskCaseRetrospectiveResponse {
  caseId: ApiId
  legacyClosedWithoutSnapshot: boolean
  retrospective: ChannelHealthRiskCaseRetrospective | null
}

export interface ChannelHealthRiskCaseRecurrenceLink {
  id: ApiId
  currentCaseId: ApiId
  previousCaseId: ApiId
  domain: number
  relationType: ChannelHealthRiskCaseRecurrenceRelationType
  rootCauseCategory: ChannelHealthRiskCaseRootCauseCategory
  note: string
  createTime: string
}

export interface ChannelHealthRiskCaseRecurrenceLinkPage {
  nextCursor: string | null
  items: ChannelHealthRiskCaseRecurrenceLink[]
}

export interface ChannelHealthRiskCaseResolutionRevisionCmd {
  expectedCaseVersion: number
  expectedGovernanceVersion: number
  commandId: string
  outcomeType: ChannelHealthRiskCaseOutcomeType
  contentRecoveryState: ChannelHealthRiskCaseContentRecoveryState
  recoveryScope: string
  residualRiskLevel: ChannelHealthRiskCaseResidualRiskLevel
  summary: string
  rootCauses: Array<{
    role: ChannelHealthRiskCaseRootCauseRole
    category: ChannelHealthRiskCaseRootCauseCategory
    note: string
  }>
}

export interface ChannelHealthRiskCaseActionReferenceCmd {
  expectedCaseVersion: number
  expectedGovernanceVersion: number
  commandId: string
  referenceType: ChannelHealthRiskCaseActionReferenceType
  referenceKey: string
  observedVersion?: number | null
  occurredAt: string
  summary: string
  correctionOfReferenceId?: ApiId | null
}

export interface ChannelHealthRiskCaseEvidenceEntryCmd {
  expectedCaseVersion: number
  expectedGovernanceVersion: number
  commandId: string
  evidenceType: ChannelHealthRiskCaseEvidenceType
  assertionType: ChannelHealthRiskCaseEvidenceAssertionType
  subjectType: string
  subjectRef: string
  sourceType: string
  sourceRef: string
  sourceVersion?: number | null
  observedAt: string
  summary: string
  correctionOfEntryId?: ApiId | null
}

export interface ChannelHealthRiskCaseClosePreviewCmd {
  expectedCaseVersion: number
  expectedCoordinationVersion: number
  expectedGovernanceVersion: number
  resolutionRevisionId: ApiId
  actionReferenceIds: ApiId[]
  evidenceEntryIds: ApiId[]
  retrospectiveOwnerUid: ApiId
}

export interface ChannelHealthRiskCaseCloseCmd extends ChannelHealthRiskCaseClosePreviewCmd {
  commandId: string
  note: string
}

export interface ChannelHealthRiskCaseCloseResult {
  case: ChannelHealthRiskCaseDetail
  snapshot: ChannelHealthRiskCaseCloseSnapshot
  retrospective: ChannelHealthRiskCaseRetrospective
  milestoneFactVersion: string
}

export interface ChannelHealthRiskCaseResolutionRevisionWriteResult {
  governance: ChannelHealthRiskCaseGovernance
  resolutionRevision: ChannelHealthRiskCaseResolutionRevision
}

export interface ChannelHealthRiskCaseActionReferenceWriteResult {
  governance: ChannelHealthRiskCaseGovernance
  actionReference: ChannelHealthRiskCaseActionReference
}

export interface ChannelHealthRiskCaseEvidenceEntryWriteResult {
  governance: ChannelHealthRiskCaseGovernance
  evidenceEntry: ChannelHealthRiskCaseEvidenceEntry
}

export interface ChannelHealthRiskCaseRetrospectiveInitializeCmd {
  expectedRetrospectiveVersion: number
  ownerUid: ApiId
  commandId: string
  note: string
}

export interface ChannelHealthRiskCaseRetrospectiveAssignOwnerCmd {
  expectedRetrospectiveVersion: number
  ownerUid: ApiId
  commandId: string
  note: string
}

export interface ChannelHealthRiskCaseRetrospectiveNoteCmd {
  expectedRetrospectiveVersion: number
  commandId: string
  note: string
}

export interface ChannelHealthRiskCaseRetrospectiveFindingCmd extends ChannelHealthRiskCaseRetrospectiveNoteCmd {
  learningCategory: ChannelHealthRiskCaseLearningCategory
  findingSummary: string
  preventionActionSummary: string
}

export interface ChannelHealthRiskCaseRecurrenceLinkCmd {
  expectedCurrentCaseVersion: number
  previousCaseId: ApiId
  relationType: ChannelHealthRiskCaseRecurrenceRelationType
  rootCauseCategory: ChannelHealthRiskCaseRootCauseCategory
  commandId: string
  note: string
}

export interface ChannelHealthRiskCaseRequestOptions {
  signal?: AbortSignal
  skipAuthRedirect?: boolean
}

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
)

const onlyKeys = (value: Record<string, unknown>, keys: readonly string[]) => (
  Object.keys(value).every((key) => keys.includes(key))
)

const safeText = (value: unknown, minLength: number, maxLength: number): string | null => {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text.length >= minLength && text.length <= maxLength ? text : null
}

const safePositiveLongId = (value: unknown): ApiId | null => {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return null
  if (typeof value !== 'number' && typeof value !== 'string') return null
  const text = String(value).trim()
  if (!/^[1-9]\d*$/.test(text)) return null
  try {
    return BigInt(text) <= MAX_SIGNED_LONG ? text : null
  } catch {
    return null
  }
}

const safeOptionalPositiveLongId = (value: unknown): ApiId | null | undefined => {
  if (value == null) return null
  return safePositiveLongId(value) ?? undefined
}

const safeOpaqueCursor = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const cursor = value.trim()
  return cursor.length >= 1 && cursor.length <= 512 && !/[\u0000-\u001f\u007f]/.test(cursor)
    ? cursor
    : null
}

const safeDomain = (value: unknown): number | null => {
  const domain = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN
  return Number.isInteger(domain) && domain >= 1 && domain <= 5 ? domain : null
}

const safeNonNegativeInteger = (value: unknown): number | null => {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

const safeBoolean = (value: unknown): boolean | null => (
  typeof value === 'boolean' ? value : null
)

const safeTimestamp = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const timestamp = value.trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z)?$/.exec(timestamp)
  if (!match) return null
  const fraction = (match[7] || '').slice(0, 3).padEnd(3, '0')
  const parseable = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.${fraction}Z`
  const parsed = Date.parse(parseable)
  if (!Number.isFinite(parsed)) return null
  const normalized = new Date(parsed).toISOString().slice(0, 19)
  const source = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`
  return normalized === source ? timestamp : null
}

const safeOptionalTimestamp = (value: unknown): string | null | undefined => {
  if (value == null) return null
  return safeTimestamp(value) ?? undefined
}

const isPriority = (value: unknown): value is ChannelHealthRiskCasePriority => (
  typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value)
)

const isDueState = (value: unknown): value is ChannelHealthRiskCaseDueState => (
  typeof value === 'string' && (DUE_STATES as readonly string[]).includes(value)
)

const isQueueMode = (value: unknown): value is ChannelHealthRiskCaseQueueMode => (
  typeof value === 'string' && (QUEUE_MODES as readonly string[]).includes(value)
)

const isQueueTriggerType = (value: unknown): value is ChannelHealthRiskCaseQueueTriggerType => (
  typeof value === 'string' && (QUEUE_TRIGGER_TYPES as readonly string[]).includes(value)
)

const isCaseTriggerType = (value: unknown): value is ChannelHealthRiskCaseTriggerType => (
  typeof value === 'string' && (CASE_TRIGGER_TYPES as readonly string[]).includes(value)
)

const isCaseStatus = (value: unknown): value is ChannelHealthRiskCaseStatus => (
  typeof value === 'string' && (CASE_STATUSES as readonly string[]).includes(value)
)

const isRiskCode = (value: unknown): value is ChannelHealthRiskCaseRiskCode => (
  typeof value === 'string' && (RISK_CODES as readonly string[]).includes(value)
)

const isEventType = (value: unknown): value is ChannelHealthRiskCaseEventType => (
  typeof value === 'string' && (EVENT_TYPES as readonly string[]).includes(value)
)

const isOutcomeType = (value: unknown): value is ChannelHealthRiskCaseOutcomeType => (
  typeof value === 'string' && (OUTCOME_TYPES as readonly string[]).includes(value)
)

const isContentRecoveryState = (value: unknown): value is ChannelHealthRiskCaseContentRecoveryState => (
  typeof value === 'string' && (CONTENT_RECOVERY_STATES as readonly string[]).includes(value)
)

const isResidualRiskLevel = (value: unknown): value is ChannelHealthRiskCaseResidualRiskLevel => (
  typeof value === 'string' && (RESIDUAL_RISK_LEVELS as readonly string[]).includes(value)
)

const isRootCauseRole = (value: unknown): value is ChannelHealthRiskCaseRootCauseRole => (
  typeof value === 'string' && (ROOT_CAUSE_ROLES as readonly string[]).includes(value)
)

const isRootCauseCategory = (value: unknown): value is ChannelHealthRiskCaseRootCauseCategory => (
  typeof value === 'string' && (ROOT_CAUSE_CATEGORIES as readonly string[]).includes(value)
)

const isActionReferenceType = (value: unknown): value is ChannelHealthRiskCaseActionReferenceType => (
  typeof value === 'string' && (ACTION_REFERENCE_TYPES as readonly string[]).includes(value)
)

const isEvidenceType = (value: unknown): value is ChannelHealthRiskCaseEvidenceType => (
  typeof value === 'string' && (EVIDENCE_TYPES as readonly string[]).includes(value)
)

const isEvidenceAssertionType = (value: unknown): value is ChannelHealthRiskCaseEvidenceAssertionType => (
  typeof value === 'string' && (ASSERTION_TYPES as readonly string[]).includes(value)
)

const isCloseCheckLevel = (value: unknown): value is ChannelHealthRiskCaseCloseCheckLevel => (
  typeof value === 'string' && (CLOSE_CHECK_LEVELS as readonly string[]).includes(value)
)

const isCloseCheckResult = (value: unknown): value is ChannelHealthRiskCaseCloseCheckResult => (
  typeof value === 'string' && (CLOSE_CHECK_RESULTS as readonly string[]).includes(value)
)

const isRetrospectiveStatus = (value: unknown): value is ChannelHealthRiskCaseRetrospectiveStatus => (
  typeof value === 'string' && (RETROSPECTIVE_STATUSES as readonly string[]).includes(value)
)

const isRetrospectiveEventType = (value: unknown): value is ChannelHealthRiskCaseRetrospectiveEventType => (
  typeof value === 'string' && (RETROSPECTIVE_EVENT_TYPES as readonly string[]).includes(value)
)

const isLearningCategory = (value: unknown): value is ChannelHealthRiskCaseLearningCategory => (
  typeof value === 'string' && (LEARNING_CATEGORIES as readonly string[]).includes(value)
)

const isRecurrenceRelationType = (value: unknown): value is ChannelHealthRiskCaseRecurrenceRelationType => (
  typeof value === 'string' && (RECURRENCE_RELATION_TYPES as readonly string[]).includes(value)
)

const isGovernanceMilestoneCode = (value: unknown): value is ChannelHealthRiskCaseGovernanceMilestoneCode => (
  typeof value === 'string' && (GOVERNANCE_MILESTONE_CODES as readonly string[]).includes(value)
)

const isGovernanceMilestoneSourceType = (
  value: unknown,
): value is ChannelHealthRiskCaseGovernanceMilestoneSourceType => (
  typeof value === 'string' && (GOVERNANCE_MILESTONE_SOURCE_TYPES as readonly string[]).includes(value)
)

const isResponsibilityScope = (value: unknown): value is ChannelHealthRiskCaseResponsibilityScope => (
  typeof value === 'string' && (RESPONSIBILITY_SCOPES as readonly string[]).includes(value)
)

const isRequiredAction = (value: unknown): value is ChannelHealthRiskCaseRequiredAction => (
  typeof value === 'string' && (REQUIRED_ACTIONS as readonly string[]).includes(value)
)

const dueStateIsActionable = (
  value: ChannelHealthRiskCaseDueState,
): value is Extract<ChannelHealthRiskCaseDueState, 'DUE_SOON' | 'OVERDUE'> => (
  value === 'DUE_SOON' || value === 'OVERDUE'
)

const safeRemoteNote = (value: unknown): string | null => safeText(value, 2, 500)
const safeRemoteSummary = (value: unknown): string | null => safeText(value, 2, 1000)
const safeCommandId = (value: unknown): string | null => (
  typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(value.trim())
    ? value.trim()
    : null
)
const safeStableCode = (value: unknown): string | null => (
  typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(value.trim())
    ? value.trim()
    : null
)
const safeDigest = (value: unknown): string | null => (
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value.trim())
    ? value.trim()
    : null
)
const safeGovernanceSnapshotEtag = (value: unknown): string | null => (
  typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value.trim())
    ? value.trim()
    : null
)
const safeOptionalNonNegativeInteger = (value: unknown): number | null | undefined => {
  if (value == null) return null
  return safeNonNegativeInteger(value) ?? undefined
}

const outcomeMatchesRecoveryState = (
  outcomeType: ChannelHealthRiskCaseOutcomeType,
  contentRecoveryState: ChannelHealthRiskCaseContentRecoveryState,
  residualRiskLevel: ChannelHealthRiskCaseResidualRiskLevel,
) => (
  (outcomeType === 'RECOVERY_CONFIRMED' && contentRecoveryState === 'VERIFIED')
  || (outcomeType === 'PARTIAL_RECOVERY' && contentRecoveryState === 'PARTIAL')
  || (outcomeType === 'RISK_CONTAINED' && (
    contentRecoveryState === 'NOT_VERIFIED' || contentRecoveryState === 'PARTIAL'
  ))
  || (outcomeType === 'FALSE_POSITIVE_CONFIRMED' && contentRecoveryState === 'NOT_APPLICABLE')
  || (outcomeType === 'RISK_ACCEPTED' && (
    contentRecoveryState === 'NOT_VERIFIED' || contentRecoveryState === 'PARTIAL'
  ))
) && !(outcomeType === 'RISK_ACCEPTED' && residualRiskLevel === 'NONE')

const adaptQueueItem = (raw: unknown): ChannelHealthRiskCaseQueueItem | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'batchId',
    'domain',
    'batchName',
    'priority',
    'dueAt',
    'effectiveDueAt',
    'activeTaskCount',
    'dueState',
    'triggerType',
    'triggerSummary',
    'riskEventId',
    'riskCode',
    'caseId',
    'caseStatus',
    'coordinationOwnerUid',
    'coordinationVersion',
    'updateTime',
  ])) return null
  const batchId = safePositiveLongId(value.batchId)
  const domain = safeDomain(value.domain)
  const batchName = safeText(value.batchName, 2, 120)
  const dueAt = safeOptionalTimestamp(value.dueAt)
  const effectiveDueAt = safeOptionalTimestamp(value.effectiveDueAt)
  const activeTaskCount = safeNonNegativeInteger(value.activeTaskCount)
  const dueState = value.dueState
  const triggerType = value.triggerType
  const triggerSummary = safeText(value.triggerSummary, 2, 500)
  const riskEventId = safeOptionalPositiveLongId(value.riskEventId)
  const rawRiskCode = value.riskCode
  const riskCode = rawRiskCode == null ? null : (
    isRiskCode(rawRiskCode) ? rawRiskCode : undefined
  )
  const caseId = safeOptionalPositiveLongId(value.caseId)
  const rawCaseStatus = value.caseStatus
  const caseStatus = rawCaseStatus == null ? null : (
    isCaseStatus(rawCaseStatus) ? rawCaseStatus : undefined
  )
  const coordinationOwnerUid = safeOptionalPositiveLongId(value.coordinationOwnerUid)
  const coordinationVersion = safeNonNegativeInteger(value.coordinationVersion)
  const updateTime = safeTimestamp(value.updateTime)
  const hasRiskAnchor = riskEventId != null || riskCode != null
  const hasCase = caseId != null || caseStatus != null
  if (
    !batchId
    || domain == null
    || !batchName
    || !isPriority(value.priority)
    || dueAt === undefined
    || effectiveDueAt === undefined
    || activeTaskCount == null
    || activeTaskCount > MAX_ACTIVE_TASK_COUNT
    || !isDueState(dueState)
    || !isQueueTriggerType(triggerType)
    || !triggerSummary
    || riskEventId === undefined
    || riskCode === undefined
    || caseId === undefined
    || caseStatus === undefined
    || coordinationOwnerUid === undefined
    || coordinationVersion == null
    || !updateTime
    || (dueAt == null) !== (effectiveDueAt == null)
    || (dueAt == null && dueState !== 'NOT_APPLICABLE')
    || (dueAt != null && dueState === 'NOT_APPLICABLE' && activeTaskCount > 0)
    || (hasRiskAnchor && (riskEventId == null || riskCode == null))
    || (hasCase && (caseId == null || caseStatus == null))
    || (triggerType === 'UNHANDLED_RISK_EVENT' && (riskEventId == null || caseId != null))
    || (triggerType === 'DUE_SOON' && (dueState !== 'DUE_SOON' || caseId != null))
    || (triggerType === 'OVERDUE' && (dueState !== 'OVERDUE' || caseId != null))
    || (triggerType === 'ACTIVE_CASE' && caseId == null)
  ) return null
  return {
    batchId,
    domain,
    batchName,
    priority: value.priority,
    dueAt,
    effectiveDueAt,
    activeTaskCount,
    dueState,
    triggerType,
    triggerSummary,
    riskEventId,
    riskCode,
    caseId,
    caseStatus,
    coordinationOwnerUid,
    coordinationVersion,
    updateTime,
  }
}

const adaptBatchSummary = (raw: unknown): ChannelHealthRiskCaseBatchSummary | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'batchId',
    'domain',
    'name',
    'priority',
    'dueAt',
    'effectiveDueAt',
    'activeTaskCount',
    'dueState',
  ])) return null
  const batchId = safePositiveLongId(value.batchId)
  const domain = safeDomain(value.domain)
  const name = safeText(value.name, 2, 120)
  const dueAt = safeOptionalTimestamp(value.dueAt)
  const effectiveDueAt = safeOptionalTimestamp(value.effectiveDueAt)
  const activeTaskCount = safeNonNegativeInteger(value.activeTaskCount)
  const dueState = value.dueState
  if (
    !batchId
    || domain == null
    || !name
    || !isPriority(value.priority)
    || dueAt === undefined
    || effectiveDueAt === undefined
    || activeTaskCount == null
    || activeTaskCount > MAX_ACTIVE_TASK_COUNT
    || !isDueState(dueState)
    || (dueAt == null) !== (effectiveDueAt == null)
    || (dueAt == null && dueState !== 'NOT_APPLICABLE')
    || (dueAt != null && dueState === 'NOT_APPLICABLE' && activeTaskCount > 0)
  ) return null
  return {
    batchId,
    domain,
    name,
    priority: value.priority,
    dueAt,
    effectiveDueAt,
    activeTaskCount,
    dueState,
  }
}

export const adaptChannelHealthRiskCaseDetail = (
  raw: unknown,
): ChannelHealthRiskCaseDetail | null => {
  try {
    const value = asRecord(raw)
    if (!value || !onlyKeys(value, [
      'id',
      'batch',
      'triggerType',
      'riskEventId',
      'riskCode',
      'dueState',
      'status',
      'ownerUid',
      'caseVersion',
      'openedCoordinationVersion',
      'coordinationVersion',
      'createTime',
      'updateTime',
      'canAssignOwner',
      'canAcknowledge',
      'canRecordPlan',
      'canRecordProgress',
      'canSubmitResolution',
      'canClose',
    ])) return null
    const id = safePositiveLongId(value.id)
    const batch = adaptBatchSummary(value.batch)
    const triggerType = value.triggerType
    const riskEventId = safeOptionalPositiveLongId(value.riskEventId)
    const rawRiskCode = value.riskCode
    const riskCode = rawRiskCode == null ? null : (
      isRiskCode(rawRiskCode) ? rawRiskCode : undefined
    )
    const rawDueState = value.dueState
    const dueState = rawDueState == null ? null : (
      isDueState(rawDueState) && dueStateIsActionable(rawDueState) ? rawDueState : undefined
    )
    const status = value.status
    const ownerUid = safeOptionalPositiveLongId(value.ownerUid)
    const caseVersion = safeNonNegativeInteger(value.caseVersion)
    const openedCoordinationVersion = safeNonNegativeInteger(value.openedCoordinationVersion)
    const coordinationVersion = safeNonNegativeInteger(value.coordinationVersion)
    const createTime = safeTimestamp(value.createTime)
    const updateTime = safeTimestamp(value.updateTime)
    const canAssignOwner = safeBoolean(value.canAssignOwner)
    const canAcknowledge = safeBoolean(value.canAcknowledge)
    const canRecordPlan = safeBoolean(value.canRecordPlan)
    const canRecordProgress = safeBoolean(value.canRecordProgress)
    const canSubmitResolution = safeBoolean(value.canSubmitResolution)
    const canClose = safeBoolean(value.canClose)
    const hasRiskTrigger = riskEventId != null || riskCode != null
    const hasDueTrigger = dueState != null
    if (
      !id
      || !batch
      || !isCaseTriggerType(triggerType)
      || riskEventId === undefined
      || riskCode === undefined
      || dueState === undefined
      || !isCaseStatus(status)
      || ownerUid === undefined
      || caseVersion == null
      || openedCoordinationVersion == null
      || coordinationVersion == null
      || !createTime
      || !updateTime
      || canAssignOwner == null
      || canAcknowledge == null
      || canRecordPlan == null
      || canRecordProgress == null
      || canSubmitResolution == null
      || canClose == null
      || Date.parse(updateTime) < Date.parse(createTime)
      || (hasRiskTrigger && (riskEventId == null || riskCode == null))
      || (triggerType === 'RISK_EVENT' && (!riskEventId || !riskCode || dueState != null))
      || (triggerType === 'DUE_STATE' && (riskEventId != null || riskCode != null || dueState == null))
      || (status === 'CLOSED' && (
        canAssignOwner || canAcknowledge || canRecordPlan || canRecordProgress || canSubmitResolution || canClose
      ))
      || (status === 'RESOLVED' && (
        canAssignOwner || canAcknowledge || canRecordPlan || canRecordProgress || canSubmitResolution
      ))
      || ((status === 'OPEN' || status === 'ACKNOWLEDGED' || status === 'IN_PROGRESS') && canClose)
      || (status === 'OPEN' && (canRecordPlan || canRecordProgress || canSubmitResolution))
      || (status === 'ACKNOWLEDGED' && (canAcknowledge || canRecordProgress || canSubmitResolution))
      || (status === 'IN_PROGRESS' && (canAcknowledge || canRecordPlan))
    ) return null
    return {
      id,
      batch,
      triggerType,
      riskEventId,
      riskCode,
      dueState,
      status,
      ownerUid,
      caseVersion,
      openedCoordinationVersion,
      coordinationVersion,
      createTime,
      updateTime,
      canAssignOwner,
      canAcknowledge,
      canRecordPlan,
      canRecordProgress,
      canSubmitResolution,
      canClose,
    }
  } catch {
    return null
  }
}

const eventTransitionMatches = (
  eventType: ChannelHealthRiskCaseEventType,
  previousStatus: ChannelHealthRiskCaseStatus | null,
  status: ChannelHealthRiskCaseStatus,
): boolean => (
  (eventType === 'CASE_OPENED' && previousStatus == null && status === 'OPEN')
  || (eventType === 'OWNER_ASSIGNED' && previousStatus != null && previousStatus === status)
  || (eventType === 'OWNER_ACKNOWLEDGED' && previousStatus === 'OPEN' && status === 'ACKNOWLEDGED')
  || (eventType === 'PLAN_RECORDED' && previousStatus === 'ACKNOWLEDGED' && status === 'IN_PROGRESS')
  || (eventType === 'PROGRESS_RECORDED' && previousStatus === 'IN_PROGRESS' && status === 'IN_PROGRESS')
  || (eventType === 'RESOLUTION_SUBMITTED' && previousStatus === 'IN_PROGRESS' && status === 'RESOLVED')
  || (eventType === 'CASE_CLOSED' && previousStatus === 'RESOLVED' && status === 'CLOSED')
)

const adaptEvent = (raw: unknown): ChannelHealthRiskCaseEvent | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'id',
    'eventType',
    'previousStatus',
    'status',
    'note',
    'caseVersion',
    'createTime',
  ])) return null
  const id = safePositiveLongId(value.id)
  const eventType = value.eventType
  const rawPreviousStatus = value.previousStatus
  const previousStatus = rawPreviousStatus == null ? null : (
    isCaseStatus(rawPreviousStatus) ? rawPreviousStatus : undefined
  )
  const status = value.status
  const note = safeRemoteNote(value.note)
  const caseVersion = safeNonNegativeInteger(value.caseVersion)
  const createTime = safeTimestamp(value.createTime)
  if (
    !id
    || !isEventType(eventType)
    || previousStatus === undefined
    || !isCaseStatus(status)
    || !note
    || caseVersion == null
    || !createTime
    || !eventTransitionMatches(eventType, previousStatus, status)
  ) return null
  return {
    id,
    eventType,
    previousStatus,
    status,
    note,
    caseVersion,
    createTime,
  }
}

const adaptRootCause = (raw: unknown): ChannelHealthRiskCaseRootCause | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, ['role', 'category', 'sequenceNo', 'note'])) return null
  const role = value.role
  const category = value.category
  const sequenceNo = safeNonNegativeInteger(value.sequenceNo)
  const note = safeRemoteNote(value.note)
  if (
    !isRootCauseRole(role)
    || !isRootCauseCategory(category)
    || sequenceNo == null
    || !note
    || (role === 'PRIMARY' && sequenceNo !== 0)
    || (role === 'CONTRIBUTING' && (sequenceNo < 1 || sequenceNo > 5))
  ) return null
  return { role, category, sequenceNo, note }
}

const adaptResolutionRevision = (raw: unknown): ChannelHealthRiskCaseResolutionRevision | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'id',
    'caseId',
    'revisionNo',
    'outcomeType',
    'contentRecoveryState',
    'recoveryScope',
    'residualRiskLevel',
    'summary',
    'rootCauses',
    'createTime',
  ])) return null
  const id = safePositiveLongId(value.id)
  const caseId = safePositiveLongId(value.caseId)
  const revisionNo = safeNonNegativeInteger(value.revisionNo)
  const outcomeType = value.outcomeType
  const contentRecoveryState = value.contentRecoveryState
  const recoveryScope = safeText(value.recoveryScope, 2, 500)
  const residualRiskLevel = value.residualRiskLevel
  const summary = safeRemoteSummary(value.summary)
  const rootCauses = Array.isArray(value.rootCauses) ? value.rootCauses.map(adaptRootCause) : null
  const createTime = safeTimestamp(value.createTime)
  if (
    !id
    || !caseId
    || revisionNo == null
    || revisionNo < 1
    || !isOutcomeType(outcomeType)
    || !isContentRecoveryState(contentRecoveryState)
    || !recoveryScope
    || !isResidualRiskLevel(residualRiskLevel)
    || !summary
    || !rootCauses
    || rootCauses.length < 1
    || rootCauses.length > 6
    || !createTime
    || !outcomeMatchesRecoveryState(outcomeType, contentRecoveryState, residualRiskLevel)
  ) return null
  const completeRootCauses = rootCauses.filter(
    (item): item is ChannelHealthRiskCaseRootCause => item != null,
  )
  const primary = completeRootCauses.filter((item) => item.role === 'PRIMARY')
  const contributing = completeRootCauses.filter((item) => item.role === 'CONTRIBUTING')
  if (
    completeRootCauses.length !== rootCauses.length
    || primary.length !== 1
    || contributing.length !== rootCauses.length - 1
    || new Set(completeRootCauses.map((item) => `${item.role}:${item.sequenceNo}`)).size !== rootCauses.length
  ) return null
  return {
    id,
    caseId,
    revisionNo,
    outcomeType,
    contentRecoveryState,
    recoveryScope,
    residualRiskLevel,
    summary,
    rootCauses: completeRootCauses,
    createTime,
  }
}

const adaptResolutionRevisionSummary = (
  raw: unknown,
): ChannelHealthRiskCaseResolutionRevisionSummary | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'id',
    'revisionNo',
    'outcomeType',
    'contentRecoveryState',
    'residualRiskLevel',
    'summary',
    'createTime',
  ])) return null
  const id = safePositiveLongId(value.id)
  const revisionNo = safeNonNegativeInteger(value.revisionNo)
  const outcomeType = value.outcomeType
  const contentRecoveryState = value.contentRecoveryState
  const residualRiskLevel = value.residualRiskLevel
  const summary = safeRemoteSummary(value.summary)
  const createTime = safeTimestamp(value.createTime)
  if (
    !id
    || revisionNo == null
    || revisionNo < 1
    || !isOutcomeType(outcomeType)
    || !isContentRecoveryState(contentRecoveryState)
    || !isResidualRiskLevel(residualRiskLevel)
    || !summary
    || !createTime
    || !outcomeMatchesRecoveryState(outcomeType, contentRecoveryState, residualRiskLevel)
  ) return null
  return {
    id,
    revisionNo,
    outcomeType,
    contentRecoveryState,
    residualRiskLevel,
    summary,
    createTime,
  }
}

const adaptActionReference = (raw: unknown): ChannelHealthRiskCaseActionReference | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'id',
    'caseId',
    'referenceType',
    'observedVersion',
    'occurredAt',
    'summary',
    'correctionOfReferenceId',
    'createTime',
  ])) return null
  const id = safePositiveLongId(value.id)
  const caseId = safePositiveLongId(value.caseId)
  const referenceType = value.referenceType
  const observedVersion = safeOptionalNonNegativeInteger(value.observedVersion)
  const occurredAt = safeTimestamp(value.occurredAt)
  const summary = safeText(value.summary, 2, 500)
  const correctionOfReferenceId = safeOptionalPositiveLongId(value.correctionOfReferenceId)
  const createTime = safeTimestamp(value.createTime)
  if (
    !id
    || !caseId
    || !isActionReferenceType(referenceType)
    || observedVersion === undefined
    || !occurredAt
    || !summary
    || correctionOfReferenceId === undefined
    || !createTime
    || Date.parse(createTime) < Date.parse(occurredAt)
    || (correctionOfReferenceId != null && correctionOfReferenceId === id)
  ) return null
  return {
    id,
    caseId,
    referenceType,
    observedVersion,
    occurredAt,
    summary,
    correctionOfReferenceId,
    createTime,
  }
}

const adaptEvidenceEntry = (raw: unknown): ChannelHealthRiskCaseEvidenceEntry | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'id',
    'caseId',
    'evidenceType',
    'assertionType',
    'subjectType',
    'sourceType',
    'sourceVersion',
    'observedAt',
    'summary',
    'correctionOfEntryId',
    'createTime',
  ])) return null
  const id = safePositiveLongId(value.id)
  const caseId = safePositiveLongId(value.caseId)
  const evidenceType = value.evidenceType
  const assertionType = value.assertionType
  const subjectType = safeStableCode(value.subjectType)
  const sourceType = safeStableCode(value.sourceType)
  const sourceVersion = safeOptionalNonNegativeInteger(value.sourceVersion)
  const observedAt = safeTimestamp(value.observedAt)
  const summary = safeRemoteSummary(value.summary)
  const correctionOfEntryId = safeOptionalPositiveLongId(value.correctionOfEntryId)
  const createTime = safeTimestamp(value.createTime)
  if (
    !id
    || !caseId
    || !isEvidenceType(evidenceType)
    || !isEvidenceAssertionType(assertionType)
    || !subjectType
    || !sourceType
    || sourceVersion === undefined
    || !observedAt
    || !summary
    || correctionOfEntryId === undefined
    || !createTime
    || Date.parse(createTime) < Date.parse(observedAt)
    || (correctionOfEntryId != null && correctionOfEntryId === id)
  ) return null
  return {
    id,
    caseId,
    evidenceType,
    assertionType,
    subjectType,
    sourceType,
    sourceVersion,
    observedAt,
    summary,
    correctionOfEntryId,
    createTime,
  }
}

const adaptCloseCheck = (raw: unknown): ChannelHealthRiskCaseCloseCheck | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'providerCode',
    'providerVersion',
    'requirementLevel',
    'result',
    'reasonCode',
    'summary',
  ])) return null
  const providerCode = safeStableCode(value.providerCode)
  const providerVersion = safeNonNegativeInteger(value.providerVersion)
  const requirementLevel = value.requirementLevel
  const result = value.result
  const reasonCode = safeStableCode(value.reasonCode)
  const summary = safeText(value.summary, 2, 500)
  if (
    !providerCode
    || providerVersion == null
    || providerVersion < 1
    || !isCloseCheckLevel(requirementLevel)
    || !isCloseCheckResult(result)
    || !reasonCode
    || !summary
  ) return null
  return { providerCode, providerVersion, requirementLevel, result, reasonCode, summary }
}

const adaptRetrospective = (raw: unknown): ChannelHealthRiskCaseRetrospective | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'id',
    'caseId',
    'closeSnapshotId',
    'domain',
    'status',
    'ownerUid',
    'retrospectiveVersion',
    'legacyBaseline',
    'startedAt',
    'completedAt',
    'createTime',
    'updateTime',
    'canAssignOwner',
    'canStart',
    'canRecordFinding',
    'canComplete',
  ])) return null
  const id = safePositiveLongId(value.id)
  const caseId = safePositiveLongId(value.caseId)
  const closeSnapshotId = safeOptionalPositiveLongId(value.closeSnapshotId)
  const domain = safeDomain(value.domain)
  const status = value.status
  const ownerUid = safeOptionalPositiveLongId(value.ownerUid)
  const retrospectiveVersion = safeNonNegativeInteger(value.retrospectiveVersion)
  const legacyBaseline = safeBoolean(value.legacyBaseline)
  const startedAt = safeOptionalTimestamp(value.startedAt)
  const completedAt = safeOptionalTimestamp(value.completedAt)
  const createTime = safeTimestamp(value.createTime)
  const updateTime = safeTimestamp(value.updateTime)
  const canAssignOwner = safeBoolean(value.canAssignOwner)
  const canStart = safeBoolean(value.canStart)
  const canRecordFinding = safeBoolean(value.canRecordFinding)
  const canComplete = safeBoolean(value.canComplete)
  if (
    !id
    || !caseId
    || closeSnapshotId === undefined
    || domain == null
    || !isRetrospectiveStatus(status)
    || ownerUid === undefined
    || retrospectiveVersion == null
    || legacyBaseline == null
    || startedAt === undefined
    || completedAt === undefined
    || !createTime
    || !updateTime
    || canAssignOwner == null
    || canStart == null
    || canRecordFinding == null
    || canComplete == null
    || Date.parse(updateTime) < Date.parse(createTime)
    || (status === 'PENDING' && (startedAt != null || completedAt != null))
    || (status === 'IN_PROGRESS' && (startedAt == null || completedAt != null))
    || (status === 'COMPLETED' && (startedAt == null || completedAt == null))
  ) return null
  return {
    id,
    caseId,
    closeSnapshotId,
    domain,
    status,
    ownerUid,
    retrospectiveVersion,
    legacyBaseline,
    startedAt,
    completedAt,
    createTime,
    updateTime,
    canAssignOwner,
    canStart,
    canRecordFinding,
    canComplete,
  }
}

const adaptRetrospectiveSummary = (
  raw: unknown,
): ChannelHealthRiskCaseRetrospectiveSummary | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'id',
    'status',
    'ownerUid',
    'retrospectiveVersion',
    'legacyBaseline',
    'updateTime',
  ])) return null
  const id = safePositiveLongId(value.id)
  const status = value.status
  const ownerUid = safeOptionalPositiveLongId(value.ownerUid)
  const retrospectiveVersion = safeNonNegativeInteger(value.retrospectiveVersion)
  const legacyBaseline = safeBoolean(value.legacyBaseline)
  const updateTime = safeTimestamp(value.updateTime)
  if (
    !id
    || !isRetrospectiveStatus(status)
    || ownerUid === undefined
    || retrospectiveVersion == null
    || legacyBaseline == null
    || !updateTime
  ) return null
  return { id, status, ownerUid, retrospectiveVersion, legacyBaseline, updateTime }
}

export const adaptChannelHealthRiskCaseGovernance = (
  raw: unknown,
): ChannelHealthRiskCaseGovernance | null => {
  try {
    const value = asRecord(raw)
    if (!value || !onlyKeys(value, [
      'caseId',
      'batchId',
      'domain',
      'caseStatus',
      'caseVersion',
      'coordinationVersion',
      'governanceVersion',
      'governanceFactVersion',
      'governanceSnapshotEtag',
      'currentResolutionRevision',
      'actionReferenceCount',
      'evidenceCount',
      'closeSnapshotId',
      'legacyClosedWithoutSnapshot',
      'retrospective',
      'milestoneFactVersion',
      'canAddResolutionRevision',
      'canAddActionReference',
      'canAddEvidence',
      'canPreviewClose',
      'canClose',
      'canInitializeRetrospective',
      'canManageRetrospective',
      'canLinkRecurrence',
    ])) return null
    const caseId = safePositiveLongId(value.caseId)
    const batchId = safePositiveLongId(value.batchId)
    const domain = safeDomain(value.domain)
    const caseStatus = value.caseStatus
    const caseVersion = safeNonNegativeInteger(value.caseVersion)
    const coordinationVersion = safeNonNegativeInteger(value.coordinationVersion)
    const governanceVersion = safeNonNegativeInteger(value.governanceVersion)
    const governanceFactVersion = safeNonNegativeInteger(value.governanceFactVersion)
    const governanceSnapshotEtag = safeGovernanceSnapshotEtag(value.governanceSnapshotEtag)
    const currentResolutionRevision = value.currentResolutionRevision == null
      ? null
      : adaptResolutionRevisionSummary(value.currentResolutionRevision)
    const actionReferenceCount = safeNonNegativeInteger(value.actionReferenceCount)
    const evidenceCount = safeNonNegativeInteger(value.evidenceCount)
    const closeSnapshotId = safeOptionalPositiveLongId(value.closeSnapshotId)
    const legacyClosedWithoutSnapshot = safeBoolean(value.legacyClosedWithoutSnapshot)
    const retrospective = value.retrospective == null ? null : adaptRetrospectiveSummary(value.retrospective)
    const milestoneFactVersion = safeStableCode(value.milestoneFactVersion)
    const canAddResolutionRevision = safeBoolean(value.canAddResolutionRevision)
    const canAddActionReference = safeBoolean(value.canAddActionReference)
    const canAddEvidence = safeBoolean(value.canAddEvidence)
    const canPreviewClose = safeBoolean(value.canPreviewClose)
    const canClose = safeBoolean(value.canClose)
    const canInitializeRetrospective = safeBoolean(value.canInitializeRetrospective)
    const canManageRetrospective = safeBoolean(value.canManageRetrospective)
    const canLinkRecurrence = safeBoolean(value.canLinkRecurrence)
    if (
      !caseId
      || !batchId
      || domain == null
      || !isCaseStatus(caseStatus)
      || caseVersion == null
      || coordinationVersion == null
      || governanceVersion == null
      || governanceFactVersion == null
      || !governanceSnapshotEtag
      || currentResolutionRevision === undefined
      || actionReferenceCount == null
      || evidenceCount == null
      || closeSnapshotId === undefined
      || legacyClosedWithoutSnapshot == null
      || retrospective === undefined
      || !milestoneFactVersion
      || canAddResolutionRevision == null
      || canAddActionReference == null
      || canAddEvidence == null
      || canPreviewClose == null
      || canClose == null
      || canInitializeRetrospective == null
      || canManageRetrospective == null
      || canLinkRecurrence == null
      || governanceVersion !== governanceFactVersion
      || (caseStatus === 'CLOSED' && closeSnapshotId == null && !legacyClosedWithoutSnapshot)
      || (caseStatus !== 'CLOSED' && (closeSnapshotId != null || legacyClosedWithoutSnapshot))
      || (closeSnapshotId != null && retrospective == null)
      || ((caseStatus === 'CLOSED' || closeSnapshotId != null) && (
        canAddResolutionRevision || canAddActionReference || canAddEvidence || canPreviewClose || canClose
      ))
    ) return null
    return {
      caseId,
      batchId,
      domain,
      caseStatus,
      caseVersion,
      coordinationVersion,
      governanceVersion,
      governanceFactVersion,
      governanceSnapshotEtag,
      currentResolutionRevision,
      actionReferenceCount,
      evidenceCount,
      closeSnapshotId,
      legacyClosedWithoutSnapshot,
      retrospective,
      milestoneFactVersion,
      canAddResolutionRevision,
      canAddActionReference,
      canAddEvidence,
      canPreviewClose,
      canClose,
      canInitializeRetrospective,
      canManageRetrospective,
      canLinkRecurrence,
    }
  } catch {
    return null
  }
}

const adaptGovernanceMilestone = (raw: unknown): ChannelHealthRiskCaseGovernanceMilestone | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'sourceFactId',
    'milestoneCode',
    'occurredAt',
    'sourceType',
    'responsibilityScope',
    'responsibilityEpoch',
    'ownerUid',
    'caseStatusAfter',
    'requiredAction',
    'contractVersion',
    'factVersion',
  ])) return null
  const sourceFactId = safePositiveLongId(value.sourceFactId)
  const milestoneCode = value.milestoneCode
  const occurredAt = safeTimestamp(value.occurredAt)
  const sourceType = value.sourceType
  const responsibilityScope = value.responsibilityScope
  const responsibilityEpoch = safeOptionalNonNegativeInteger(value.responsibilityEpoch)
  const ownerUid = safeOptionalPositiveLongId(value.ownerUid)
  const rawCaseStatusAfter = value.caseStatusAfter
  const caseStatusAfter = rawCaseStatusAfter == null ? null : (
    isCaseStatus(rawCaseStatusAfter) ? rawCaseStatusAfter : undefined
  )
  const requiredAction = value.requiredAction
  const contractVersion = safeStableCode(value.contractVersion)
  const factVersion = safeNonNegativeInteger(value.factVersion)
  if (
    !sourceFactId
    || !isGovernanceMilestoneCode(milestoneCode)
    || !occurredAt
    || !isGovernanceMilestoneSourceType(sourceType)
    || !isResponsibilityScope(responsibilityScope)
    || responsibilityEpoch === undefined
    || ownerUid === undefined
    || caseStatusAfter === undefined
    || !isRequiredAction(requiredAction)
    || !contractVersion
    || factVersion == null
    || factVersion < 1
    || ((milestoneCode === 'OWNER_ASSIGNED' || milestoneCode === 'OWNER_ACKNOWLEDGED' || milestoneCode === 'PLAN_RECORDED') && (
      sourceType !== 'V40_CASE_EVENT'
      || responsibilityScope !== 'CASE_OWNER'
      || responsibilityEpoch == null
      || responsibilityEpoch < 1
      || ownerUid == null
      || caseStatusAfter == null
    ))
    || (milestoneCode === 'RETROSPECTIVE_OWNER_ASSIGNED' && (
      sourceType !== 'V41_RETROSPECTIVE'
      || responsibilityScope !== 'RETROSPECTIVE'
      || responsibilityEpoch == null
      || responsibilityEpoch < 1
      || ownerUid == null
    ))
    || ((milestoneCode === 'CLOSE_SNAPSHOT_GENERATED' || milestoneCode === 'RETROSPECTIVE_PENDING' || milestoneCode === 'RETROSPECTIVE_COMPLETED') && (
      responsibilityScope !== 'CASE'
      || responsibilityEpoch != null
      || ownerUid != null
      || requiredAction !== 'NONE'
    ))
  ) return null
  return {
    sourceFactId,
    milestoneCode,
    occurredAt,
    sourceType,
    responsibilityScope,
    responsibilityEpoch,
    ownerUid,
    caseStatusAfter,
    requiredAction,
    contractVersion,
    factVersion,
  }
}

const adaptClosePreview = (raw: unknown): ChannelHealthRiskCaseClosePreview | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'caseId',
    'readyToClose',
    'caseVersion',
    'coordinationVersion',
    'governanceVersion',
    'governanceFactVersion',
    'checks',
  ])) return null
  const caseId = safePositiveLongId(value.caseId)
  const readyToClose = safeBoolean(value.readyToClose)
  const caseVersion = safeNonNegativeInteger(value.caseVersion)
  const coordinationVersion = safeNonNegativeInteger(value.coordinationVersion)
  const governanceVersion = safeNonNegativeInteger(value.governanceVersion)
  const governanceFactVersion = safeNonNegativeInteger(value.governanceFactVersion)
  const checks = Array.isArray(value.checks) ? value.checks.map(adaptCloseCheck) : null
  if (
    !caseId
    || readyToClose == null
    || caseVersion == null
    || coordinationVersion == null
    || governanceVersion == null
    || governanceFactVersion == null
    || !checks
    || checks.length < 1
    || checks.length > 32
    || checks.some((item) => item == null)
    || new Set(checks.map((item) => item?.providerCode)).size !== checks.length
    || governanceVersion !== governanceFactVersion
    || (readyToClose && checks.some((item) => item?.requirementLevel === 'BLOCKING' && item.result === 'FAIL'))
  ) return null
  return {
    caseId,
    readyToClose,
    caseVersion,
    coordinationVersion,
    governanceVersion,
    governanceFactVersion,
    checks: checks as ChannelHealthRiskCaseCloseCheck[],
  }
}

const adaptCloseSnapshot = (raw: unknown): ChannelHealthRiskCaseCloseSnapshot | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'id',
    'caseId',
    'batchId',
    'domain',
    'resolutionRevisionId',
    'closedCaseVersion',
    'closedCoordinationVersion',
    'closedGovernanceVersion',
    'outcomeType',
    'contentRecoveryState',
    'primaryRootCause',
    'rootCauses',
    'residualRiskLevel',
    'actionReferenceCount',
    'evidenceCount',
    'actionReferences',
    'evidenceEntries',
    'checks',
    'payloadSchemaVersion',
    'snapshotDigest',
    'createTime',
  ])) return null
  const id = safePositiveLongId(value.id)
  const caseId = safePositiveLongId(value.caseId)
  const batchId = safePositiveLongId(value.batchId)
  const domain = safeDomain(value.domain)
  const resolutionRevisionId = safePositiveLongId(value.resolutionRevisionId)
  const closedCaseVersion = safeNonNegativeInteger(value.closedCaseVersion)
  const closedCoordinationVersion = safeNonNegativeInteger(value.closedCoordinationVersion)
  const closedGovernanceVersion = safeNonNegativeInteger(value.closedGovernanceVersion)
  const outcomeType = value.outcomeType
  const contentRecoveryState = value.contentRecoveryState
  const primaryRootCause = value.primaryRootCause
  const rootCauses = Array.isArray(value.rootCauses) ? value.rootCauses.map(adaptRootCause) : null
  const residualRiskLevel = value.residualRiskLevel
  const actionReferenceCount = safeNonNegativeInteger(value.actionReferenceCount)
  const evidenceCount = safeNonNegativeInteger(value.evidenceCount)
  const actionReferences = Array.isArray(value.actionReferences) ? value.actionReferences.map(adaptActionReference) : null
  const evidenceEntries = Array.isArray(value.evidenceEntries) ? value.evidenceEntries.map(adaptEvidenceEntry) : null
  const checks = Array.isArray(value.checks) ? value.checks.map(adaptCloseCheck) : null
  const payloadSchemaVersion = safeNonNegativeInteger(value.payloadSchemaVersion)
  const snapshotDigest = safeDigest(value.snapshotDigest)
  const createTime = safeTimestamp(value.createTime)
  if (
    !id
    || !caseId
    || !batchId
    || domain == null
    || !resolutionRevisionId
    || closedCaseVersion == null
    || closedCoordinationVersion == null
    || closedGovernanceVersion == null
    || !isOutcomeType(outcomeType)
    || !isContentRecoveryState(contentRecoveryState)
    || !isRootCauseCategory(primaryRootCause)
    || !rootCauses
    || rootCauses.length < 1
    || rootCauses.some((item) => item == null)
    || !isResidualRiskLevel(residualRiskLevel)
    || !outcomeMatchesRecoveryState(outcomeType, contentRecoveryState, residualRiskLevel)
    || actionReferenceCount == null
    || evidenceCount == null
    || !actionReferences
    || actionReferences.some((item) => item == null)
    || !evidenceEntries
    || evidenceEntries.some((item) => item == null)
    || !checks
    || checks.length < 1
    || checks.some((item) => item == null)
    || payloadSchemaVersion == null
    || payloadSchemaVersion < 1
    || !snapshotDigest
    || !createTime
    || actionReferenceCount !== actionReferences.length
    || evidenceCount !== evidenceEntries.length
    || new Set(actionReferences.map((item) => String(item?.id))).size !== actionReferences.length
    || new Set(evidenceEntries.map((item) => String(item?.id))).size !== evidenceEntries.length
    || new Set(checks.map((item) => item?.providerCode)).size !== checks.length
    || checks.some((item) => item?.requirementLevel === 'BLOCKING' && item.result === 'FAIL')
    || rootCauses[0]?.category !== primaryRootCause
  ) return null
  return {
    id,
    caseId,
    batchId,
    domain,
    resolutionRevisionId,
    closedCaseVersion,
    closedCoordinationVersion,
    closedGovernanceVersion,
    outcomeType,
    contentRecoveryState,
    primaryRootCause,
    rootCauses: rootCauses as ChannelHealthRiskCaseRootCause[],
    residualRiskLevel,
    actionReferenceCount,
    evidenceCount,
    actionReferences: actionReferences as ChannelHealthRiskCaseActionReference[],
    evidenceEntries: evidenceEntries as ChannelHealthRiskCaseEvidenceEntry[],
    checks: checks as ChannelHealthRiskCaseCloseCheck[],
    payloadSchemaVersion,
    snapshotDigest,
    createTime,
  }
}

const adaptRetrospectiveEvent = (raw: unknown): ChannelHealthRiskCaseRetrospectiveEvent | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'id',
    'eventType',
    'previousStatus',
    'status',
    'ownerUid',
    'learningCategory',
    'findingSummary',
    'preventionActionSummary',
    'note',
    'retrospectiveVersion',
    'createTime',
  ])) return null
  const id = safePositiveLongId(value.id)
  const eventType = value.eventType
  const rawPreviousStatus = value.previousStatus
  const previousStatus = rawPreviousStatus == null ? null : (
    isRetrospectiveStatus(rawPreviousStatus) ? rawPreviousStatus : undefined
  )
  const status = value.status
  const ownerUid = safeOptionalPositiveLongId(value.ownerUid)
  const rawLearningCategory = value.learningCategory
  const learningCategory = rawLearningCategory == null ? null : (
    isLearningCategory(rawLearningCategory) ? rawLearningCategory : undefined
  )
  const findingSummary = value.findingSummary == null ? null : safeRemoteSummary(value.findingSummary)
  const preventionActionSummary = value.preventionActionSummary == null ? null : safeRemoteSummary(value.preventionActionSummary)
  const note = safeRemoteSummary(value.note)
  const retrospectiveVersion = safeNonNegativeInteger(value.retrospectiveVersion)
  const createTime = safeTimestamp(value.createTime)
  if (
    !id
    || !isRetrospectiveEventType(eventType)
    || previousStatus === undefined
    || !isRetrospectiveStatus(status)
    || ownerUid === undefined
    || learningCategory === undefined
    || findingSummary === undefined
    || preventionActionSummary === undefined
    || !note
    || retrospectiveVersion == null
    || !createTime
    || (eventType === 'RETROSPECTIVE_CREATED' && (previousStatus != null || status !== 'PENDING'))
    || (eventType === 'RETROSPECTIVE_OWNER_ASSIGNED' && ownerUid == null)
    || (eventType === 'RETROSPECTIVE_STARTED' && (
      previousStatus !== 'PENDING' || status !== 'IN_PROGRESS'
    ))
    || (eventType === 'RETROSPECTIVE_FINDING_RECORDED' && (
      status !== 'IN_PROGRESS' || learningCategory == null || findingSummary == null || preventionActionSummary == null
    ))
    || (eventType === 'RETROSPECTIVE_COMPLETED' && (
      previousStatus !== 'IN_PROGRESS' || status !== 'COMPLETED'
    ))
  ) return null
  return {
    id,
    eventType,
    previousStatus,
    status,
    ownerUid,
    learningCategory,
    findingSummary,
    preventionActionSummary,
    note,
    retrospectiveVersion,
    createTime,
  }
}

const adaptRecurrenceLink = (raw: unknown): ChannelHealthRiskCaseRecurrenceLink | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'id',
    'currentCaseId',
    'previousCaseId',
    'domain',
    'relationType',
    'rootCauseCategory',
    'note',
    'createTime',
  ])) return null
  const id = safePositiveLongId(value.id)
  const currentCaseId = safePositiveLongId(value.currentCaseId)
  const previousCaseId = safePositiveLongId(value.previousCaseId)
  const domain = safeDomain(value.domain)
  const relationType = value.relationType
  const rootCauseCategory = value.rootCauseCategory
  const note = safeText(value.note, 2, 500)
  const createTime = safeTimestamp(value.createTime)
  if (
    !id
    || !currentCaseId
    || !previousCaseId
    || domain == null
    || !isRecurrenceRelationType(relationType)
    || !isRootCauseCategory(rootCauseCategory)
    || !note
    || !createTime
  ) return null
  return { id, currentCaseId, previousCaseId, domain, relationType, rootCauseCategory, note, createTime }
}

const adaptCursorPage = <T>(
  raw: unknown,
  requestedSize: number,
  adaptItem: (item: unknown) => T | null,
  getId: (item: T) => ApiId,
): { nextCursor: string | null; items: T[] } | null => {
  const value = asRecord(raw)
  if (
    !value
    || !onlyKeys(value, ['nextCursor', 'items'])
    || !Number.isInteger(requestedSize)
    || requestedSize < 1
    || requestedSize > MAX_PAGE_SIZE
    || !Array.isArray(value.items)
    || value.items.length > requestedSize
  ) return null
  const nextCursor = value.nextCursor == null ? null : safeOpaqueCursor(value.nextCursor)
  const items = value.items.map(adaptItem)
  if (items.some((item) => item == null) || (value.nextCursor != null && !nextCursor)) return null
  const seenIds = new Set<string>()
  for (const item of items as T[]) {
    const id = String(getId(item))
    if (seenIds.has(id)) return null
    seenIds.add(id)
  }
  return { nextCursor, items: items as T[] }
}

export const adaptChannelHealthRiskCaseGovernanceMilestonePage = (
  raw: unknown,
  requestedSize = 10,
): ChannelHealthRiskCaseGovernanceMilestonePage | null => (
  adaptCursorPage(raw, requestedSize, adaptGovernanceMilestone, (item) => item.sourceFactId)
)

export const adaptChannelHealthRiskCaseResolutionRevisionPage = (
  raw: unknown,
  requestedSize = 10,
): ChannelHealthRiskCaseResolutionRevisionPage | null => (
  adaptCursorPage(raw, requestedSize, adaptResolutionRevision, (item) => item.id)
)

export const adaptChannelHealthRiskCaseActionReferencePage = (
  raw: unknown,
  requestedSize = 10,
): ChannelHealthRiskCaseActionReferencePage | null => (
  adaptCursorPage(raw, requestedSize, adaptActionReference, (item) => item.id)
)

export const adaptChannelHealthRiskCaseEvidenceEntryPage = (
  raw: unknown,
  requestedSize = 10,
): ChannelHealthRiskCaseEvidenceEntryPage | null => (
  adaptCursorPage(raw, requestedSize, adaptEvidenceEntry, (item) => item.id)
)

export const adaptChannelHealthRiskCaseCloseSnapshotResponse = (
  raw: unknown,
): ChannelHealthRiskCaseCloseSnapshotResponse | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, ['caseId', 'legacyClosedWithoutSnapshot', 'snapshot'])) return null
  const caseId = safePositiveLongId(value.caseId)
  const legacyClosedWithoutSnapshot = safeBoolean(value.legacyClosedWithoutSnapshot)
  const snapshot = value.snapshot == null ? null : adaptCloseSnapshot(value.snapshot)
  if (
    !caseId
    || legacyClosedWithoutSnapshot == null
    || snapshot === undefined
    || (legacyClosedWithoutSnapshot && snapshot != null)
    || (snapshot != null && String(snapshot.caseId) !== String(caseId))
  ) return null
  return { caseId, legacyClosedWithoutSnapshot, snapshot }
}

export const adaptChannelHealthRiskCaseRetrospectiveResponse = (
  raw: unknown,
): ChannelHealthRiskCaseRetrospectiveResponse | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, ['caseId', 'legacyClosedWithoutSnapshot', 'retrospective'])) return null
  const caseId = safePositiveLongId(value.caseId)
  const legacyClosedWithoutSnapshot = safeBoolean(value.legacyClosedWithoutSnapshot)
  const retrospective = value.retrospective == null ? null : adaptRetrospective(value.retrospective)
  if (
    !caseId
    || legacyClosedWithoutSnapshot == null
    || retrospective === undefined
    || (retrospective != null && String(retrospective.caseId) !== String(caseId))
  ) return null
  return { caseId, legacyClosedWithoutSnapshot, retrospective }
}

export const adaptChannelHealthRiskCaseRetrospectiveEventPage = (
  raw: unknown,
  requestedSize = 10,
): ChannelHealthRiskCaseRetrospectiveEventPage | null => (
  adaptCursorPage(raw, requestedSize, adaptRetrospectiveEvent, (item) => item.id)
)

export const adaptChannelHealthRiskCaseRecurrenceLinkPage = (
  raw: unknown,
  requestedSize = 10,
): ChannelHealthRiskCaseRecurrenceLinkPage | null => (
  adaptCursorPage(raw, requestedSize, adaptRecurrenceLink, (item) => item.id)
)

const adaptCloseResult = (raw: unknown): ChannelHealthRiskCaseCloseResult | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, ['case', 'snapshot', 'retrospective', 'milestoneFactVersion'])) return null
  const caseDetail = adaptChannelHealthRiskCaseDetail(value.case)
  const snapshot = adaptCloseSnapshot(value.snapshot)
  const retrospective = adaptRetrospective(value.retrospective)
  const milestoneFactVersion = safeStableCode(value.milestoneFactVersion)
  if (
    !caseDetail
    || !snapshot
    || !retrospective
    || !milestoneFactVersion
    || caseDetail.status !== 'CLOSED'
    || String(snapshot.caseId) !== String(caseDetail.id)
    || String(retrospective.caseId) !== String(caseDetail.id)
  ) return null
  return { case: caseDetail, snapshot, retrospective, milestoneFactVersion }
}

export const adaptChannelHealthRiskCaseQueuePage = (
  raw: unknown,
  requestedSize = 10,
): ChannelHealthRiskCaseQueuePage | null => {
  try {
    const value = asRecord(raw)
    if (
      !value
      || !onlyKeys(value, ['nextCursor', 'items'])
      || !Number.isInteger(requestedSize)
      || requestedSize < 1
      || requestedSize > MAX_PAGE_SIZE
      || !Array.isArray(value.items)
      || value.items.length > requestedSize
    ) return null
    const items = value.items.map(adaptQueueItem)
    const nextCursor = value.nextCursor == null ? null : safeOpaqueCursor(value.nextCursor)
    if (items.some((item) => item == null) || (value.nextCursor != null && !nextCursor)) return null
    const seenBatchIds = new Set<string>()
    for (const item of items as ChannelHealthRiskCaseQueueItem[]) {
      if (seenBatchIds.has(String(item.batchId))) return null
      seenBatchIds.add(String(item.batchId))
    }
    return {
      nextCursor,
      items: items as ChannelHealthRiskCaseQueueItem[],
    }
  } catch {
    return null
  }
}

export const adaptChannelHealthRiskCaseEventPage = (
  raw: unknown,
  requestedSize = 10,
): ChannelHealthRiskCaseEventPage | null => {
  try {
    const value = asRecord(raw)
    if (
      !value
      || !onlyKeys(value, ['nextCursor', 'items'])
      || !Number.isInteger(requestedSize)
      || requestedSize < 1
      || requestedSize > MAX_PAGE_SIZE
      || !Array.isArray(value.items)
      || value.items.length > requestedSize
    ) return null
    const items = value.items.map(adaptEvent)
    const nextCursor = value.nextCursor == null ? null : safeOpaqueCursor(value.nextCursor)
    if (items.some((item) => item == null) || (value.nextCursor != null && !nextCursor)) return null
    const seenIds = new Set<string>()
    let previousId: bigint | null = null
    for (const item of items as ChannelHealthRiskCaseEvent[]) {
      const currentId = BigInt(String(item.id))
      if (seenIds.has(String(item.id)) || (previousId != null && currentId >= previousId)) return null
      seenIds.add(String(item.id))
      previousId = currentId
    }
    return {
      nextCursor,
      items: items as ChannelHealthRiskCaseEvent[],
    }
  } catch {
    return null
  }
}

const normalizeQueueQuery = (
  query: ChannelHealthRiskCaseQueueQuery,
): Record<string, string | number> | null => {
  const domain = safeDomain(query?.domain)
  const cursor = query?.cursor == null ? null : safeOpaqueCursor(query.cursor)
  const requestedSize = query?.size == null ? 10 : query.size
  const size = Number.isInteger(requestedSize) && requestedSize >= 1 && requestedSize <= MAX_PAGE_SIZE
    ? requestedSize
    : null
  if (
    domain == null
    || (query?.mode != null && !isQueueMode(query.mode))
    || (query?.cursor != null && !cursor)
    || size == null
  ) return null
  return {
    domain,
    size,
    ...(query.mode ? { mode: query.mode } : {}),
    ...(cursor ? { cursor } : {}),
  }
}

const normalizeEventQuery = (
  query: ChannelHealthRiskCaseEventQuery,
): Record<string, string | number> | null => {
  const cursor = query?.cursor == null ? null : safeOpaqueCursor(query.cursor)
  const requestedSize = query?.size == null ? 10 : query.size
  const size = Number.isInteger(requestedSize) && requestedSize >= 1 && requestedSize <= MAX_PAGE_SIZE
    ? requestedSize
    : null
  if ((query?.cursor != null && !cursor) || size == null) return null
  return {
    size,
    ...(cursor ? { cursor } : {}),
  }
}

const normalizeCreateRequest = (
  request: ChannelHealthRiskCaseCreateCmd,
): {
  expectedCoordinationVersion: number
  riskEventId?: string
  note: string
} | null => {
  const expectedCoordinationVersion = safeNonNegativeInteger(request?.expectedCoordinationVersion)
  const riskEventId = request?.riskEventId == null ? null : safePositiveLongId(request.riskEventId)
  const note = safeRemoteNote(request?.note)
  if (
    expectedCoordinationVersion == null
    || (request?.riskEventId != null && !riskEventId)
    || !note
  ) return null
  return {
    expectedCoordinationVersion,
    ...(riskEventId ? { riskEventId: String(riskEventId) } : {}),
    note,
  }
}

const normalizeAssignOwnerRequest = (
  request: ChannelHealthRiskCaseAssignOwnerCmd,
): {
  expectedCaseVersion: number
  ownerUid: string
  note: string
} | null => {
  const expectedCaseVersion = safeNonNegativeInteger(request?.expectedCaseVersion)
  const ownerUid = safePositiveLongId(request?.ownerUid)
  const note = safeRemoteNote(request?.note)
  if (expectedCaseVersion == null || !ownerUid || !note) return null
  return {
    expectedCaseVersion,
    ownerUid: String(ownerUid),
    note,
  }
}

const normalizeNoteRequest = (
  request: ChannelHealthRiskCaseNoteCmd,
): {
  expectedCaseVersion: number
  note: string
} | null => {
  const expectedCaseVersion = safeNonNegativeInteger(request?.expectedCaseVersion)
  const note = safeRemoteNote(request?.note)
  if (expectedCaseVersion == null || !note) return null
  return {
    expectedCaseVersion,
    note,
  }
}

const normalizeResolutionRequest = (
  request: ChannelHealthRiskCaseResolutionCmd,
): {
  expectedCaseVersion: number
  expectedCoordinationVersion: number
  note: string
} | null => {
  const expectedCaseVersion = safeNonNegativeInteger(request?.expectedCaseVersion)
  const expectedCoordinationVersion = safeNonNegativeInteger(request?.expectedCoordinationVersion)
  const note = safeRemoteNote(request?.note)
  if (expectedCaseVersion == null || expectedCoordinationVersion == null || !note) return null
  return {
    expectedCaseVersion,
    expectedCoordinationVersion,
    note,
  }
}

const normalizeIdList = (value: unknown, minSize: number, maxSize: number): string[] | null => {
  if (!Array.isArray(value) || value.length < minSize || value.length > maxSize) return null
  const ids = value.map(safePositiveLongId)
  if (ids.some((id) => !id) || new Set(ids.map(String)).size !== ids.length) return null
  return ids.map(String)
}

const normalizeV41Versions = (
  request: { expectedCaseVersion: number; expectedGovernanceVersion: number },
): { expectedCaseVersion: number; expectedGovernanceVersion: number } | null => {
  const expectedCaseVersion = safeNonNegativeInteger(request?.expectedCaseVersion)
  const expectedGovernanceVersion = safeNonNegativeInteger(request?.expectedGovernanceVersion)
  if (expectedCaseVersion == null || expectedGovernanceVersion == null) return null
  return { expectedCaseVersion, expectedGovernanceVersion }
}

const normalizeResolutionRevisionRequest = (
  request: ChannelHealthRiskCaseResolutionRevisionCmd,
): Omit<ChannelHealthRiskCaseResolutionRevisionCmd, 'rootCauses'> & {
  rootCauses: Array<{ role: ChannelHealthRiskCaseRootCauseRole; category: ChannelHealthRiskCaseRootCauseCategory; note: string }>
} | null => {
  const versions = normalizeV41Versions(request)
  const commandId = safeCommandId(request?.commandId)
  const outcomeType = request?.outcomeType
  const contentRecoveryState = request?.contentRecoveryState
  const recoveryScope = safeText(request?.recoveryScope, 2, 500)
  const residualRiskLevel = request?.residualRiskLevel
  const summary = safeRemoteSummary(request?.summary)
  const rootCauses = Array.isArray(request?.rootCauses) ? request.rootCauses.map((raw, index) => {
    const role = raw?.role
    const category = raw?.category
    const note = safeText(raw?.note, 2, 500)
    if (
      !isRootCauseRole(role)
      || !isRootCauseCategory(category)
      || !note
      || (role === 'PRIMARY' && index !== 0)
      || (role === 'CONTRIBUTING' && (index < 1 || index > 5))
    ) return null
    return { role, category, note }
  }) : null
  if (
    !versions
    || !commandId
    || !isOutcomeType(outcomeType)
    || !isContentRecoveryState(contentRecoveryState)
    || !recoveryScope
    || !isResidualRiskLevel(residualRiskLevel)
    || !summary
    || !rootCauses
    || rootCauses.length < 1
    || rootCauses.length > 6
    || rootCauses.some((item) => item == null)
    || rootCauses.filter((item) => item?.role === 'PRIMARY').length !== 1
    || !outcomeMatchesRecoveryState(outcomeType, contentRecoveryState, residualRiskLevel)
  ) return null
  return {
    ...versions,
    commandId,
    outcomeType,
    contentRecoveryState,
    recoveryScope,
    residualRiskLevel,
    summary,
    rootCauses: rootCauses as Array<{
      role: ChannelHealthRiskCaseRootCauseRole
      category: ChannelHealthRiskCaseRootCauseCategory
      note: string
    }>,
  }
}

const normalizeActionReferenceRequest = (
  request: ChannelHealthRiskCaseActionReferenceCmd,
): {
  expectedCaseVersion: number
  expectedGovernanceVersion: number
  commandId: string
  referenceType: ChannelHealthRiskCaseActionReferenceType
  referenceKey: string
  observedVersion?: number
  occurredAt: string
  summary: string
  correctionOfReferenceId?: string
} | null => {
  const versions = normalizeV41Versions(request)
  const commandId = safeCommandId(request?.commandId)
  const referenceType = request?.referenceType
  const referenceKey = safeText(request?.referenceKey, 1, 256)
  const observedVersion = request?.observedVersion == null ? null : safeNonNegativeInteger(request.observedVersion)
  const occurredAt = safeTimestamp(request?.occurredAt)
  const summary = safeText(request?.summary, 2, 500)
  const correctionOfReferenceId = request?.correctionOfReferenceId == null
    ? null
    : safePositiveLongId(request.correctionOfReferenceId)
  if (
    !versions
    || !commandId
    || !isActionReferenceType(referenceType)
    || !referenceKey
    || (request?.observedVersion != null && observedVersion == null)
    || !occurredAt
    || !summary
    || (request?.correctionOfReferenceId != null && !correctionOfReferenceId)
  ) return null
  return {
    ...versions,
    commandId,
    referenceType,
    referenceKey,
    ...(observedVersion != null ? { observedVersion } : {}),
    occurredAt,
    summary,
    ...(correctionOfReferenceId ? { correctionOfReferenceId: String(correctionOfReferenceId) } : {}),
  }
}

const normalizeEvidenceEntryRequest = (
  request: ChannelHealthRiskCaseEvidenceEntryCmd,
): {
  expectedCaseVersion: number
  expectedGovernanceVersion: number
  commandId: string
  evidenceType: ChannelHealthRiskCaseEvidenceType
  assertionType: ChannelHealthRiskCaseEvidenceAssertionType
  subjectType: string
  subjectRef: string
  sourceType: string
  sourceRef: string
  sourceVersion?: number
  observedAt: string
  summary: string
  correctionOfEntryId?: string
} | null => {
  const versions = normalizeV41Versions(request)
  const commandId = safeCommandId(request?.commandId)
  const evidenceType = request?.evidenceType
  const assertionType = request?.assertionType
  const subjectType = safeStableCode(request?.subjectType)
  const subjectRef = safeText(request?.subjectRef, 1, 256)
  const sourceType = safeStableCode(request?.sourceType)
  const sourceRef = safeText(request?.sourceRef, 1, 256)
  const sourceVersion = request?.sourceVersion == null ? null : safeNonNegativeInteger(request.sourceVersion)
  const observedAt = safeTimestamp(request?.observedAt)
  const summary = safeRemoteSummary(request?.summary)
  const correctionOfEntryId = request?.correctionOfEntryId == null
    ? null
    : safePositiveLongId(request.correctionOfEntryId)
  if (
    !versions
    || !commandId
    || !isEvidenceType(evidenceType)
    || !isEvidenceAssertionType(assertionType)
    || !subjectType
    || !subjectRef
    || !sourceType
    || !sourceRef
    || (request?.sourceVersion != null && sourceVersion == null)
    || !observedAt
    || !summary
    || (request?.correctionOfEntryId != null && !correctionOfEntryId)
  ) return null
  return {
    ...versions,
    commandId,
    evidenceType,
    assertionType,
    subjectType,
    subjectRef,
    sourceType,
    sourceRef,
    ...(sourceVersion != null ? { sourceVersion } : {}),
    observedAt,
    summary,
    ...(correctionOfEntryId ? { correctionOfEntryId: String(correctionOfEntryId) } : {}),
  }
}

const normalizeClosePreviewRequest = (
  request: ChannelHealthRiskCaseClosePreviewCmd,
): {
  expectedCaseVersion: number
  expectedCoordinationVersion: number
  expectedGovernanceVersion: number
  resolutionRevisionId: string
  actionReferenceIds: string[]
  evidenceEntryIds: string[]
  retrospectiveOwnerUid: string
} | null => {
  const expectedCaseVersion = safeNonNegativeInteger(request?.expectedCaseVersion)
  const expectedCoordinationVersion = safeNonNegativeInteger(request?.expectedCoordinationVersion)
  const expectedGovernanceVersion = safeNonNegativeInteger(request?.expectedGovernanceVersion)
  const resolutionRevisionId = safePositiveLongId(request?.resolutionRevisionId)
  const actionReferenceIds = normalizeIdList(request?.actionReferenceIds, 1, MAX_PAGE_SIZE)
  const evidenceEntryIds = normalizeIdList(request?.evidenceEntryIds, 1, MAX_PAGE_SIZE)
  const retrospectiveOwnerUid = safePositiveLongId(request?.retrospectiveOwnerUid)
  if (
    expectedCaseVersion == null
    || expectedCoordinationVersion == null
    || expectedGovernanceVersion == null
    || !resolutionRevisionId
    || !actionReferenceIds
    || !evidenceEntryIds
    || !retrospectiveOwnerUid
  ) return null
  return {
    expectedCaseVersion,
    expectedCoordinationVersion,
    expectedGovernanceVersion,
    resolutionRevisionId: String(resolutionRevisionId),
    actionReferenceIds,
    evidenceEntryIds,
    retrospectiveOwnerUid: String(retrospectiveOwnerUid),
  }
}

const normalizeCloseRequest = (
  request: ChannelHealthRiskCaseCloseCmd,
): ({
  commandId: string
  note: string
} & NonNullable<ReturnType<typeof normalizeClosePreviewRequest>>) | null => {
  const preview = normalizeClosePreviewRequest(request)
  const commandId = safeCommandId(request?.commandId)
  const note = safeRemoteNote(request?.note)
  if (!preview || !commandId || !note) return null
  return { ...preview, commandId, note }
}

const normalizeRetrospectiveVersion = (
  request: { expectedRetrospectiveVersion: number; commandId: string; note: string },
): { expectedRetrospectiveVersion: number; commandId: string; note: string } | null => {
  const expectedRetrospectiveVersion = safeNonNegativeInteger(request?.expectedRetrospectiveVersion)
  const commandId = safeCommandId(request?.commandId)
  const note = safeRemoteSummary(request?.note)
  if (expectedRetrospectiveVersion == null || !commandId || !note) return null
  return { expectedRetrospectiveVersion, commandId, note }
}

const normalizeRetrospectiveOwnerRequest = (
  request: ChannelHealthRiskCaseRetrospectiveInitializeCmd | ChannelHealthRiskCaseRetrospectiveAssignOwnerCmd,
): { expectedRetrospectiveVersion: number; ownerUid: string; commandId: string; note: string } | null => {
  const base = normalizeRetrospectiveVersion(request)
  const ownerUid = safePositiveLongId(request?.ownerUid)
  if (!base || !ownerUid) return null
  return { ...base, ownerUid: String(ownerUid) }
}

const normalizeRetrospectiveFindingRequest = (
  request: ChannelHealthRiskCaseRetrospectiveFindingCmd,
): {
  expectedRetrospectiveVersion: number
  commandId: string
  note: string
  learningCategory: ChannelHealthRiskCaseLearningCategory
  findingSummary: string
  preventionActionSummary: string
} | null => {
  const base = normalizeRetrospectiveVersion(request)
  const learningCategory = request?.learningCategory
  const findingSummary = safeRemoteSummary(request?.findingSummary)
  const preventionActionSummary = safeRemoteSummary(request?.preventionActionSummary)
  if (!base || !isLearningCategory(learningCategory) || !findingSummary || !preventionActionSummary) return null
  return { ...base, learningCategory, findingSummary, preventionActionSummary }
}

const normalizeRecurrenceLinkRequest = (
  request: ChannelHealthRiskCaseRecurrenceLinkCmd,
): {
  expectedCurrentCaseVersion: number
  previousCaseId: string
  relationType: ChannelHealthRiskCaseRecurrenceRelationType
  rootCauseCategory: ChannelHealthRiskCaseRootCauseCategory
  commandId: string
  note: string
} | null => {
  const expectedCurrentCaseVersion = safeNonNegativeInteger(request?.expectedCurrentCaseVersion)
  const previousCaseId = safePositiveLongId(request?.previousCaseId)
  const relationType = request?.relationType
  const rootCauseCategory = request?.rootCauseCategory
  const commandId = safeCommandId(request?.commandId)
  const note = safeText(request?.note, 2, 500)
  if (
    expectedCurrentCaseVersion == null
    || !previousCaseId
    || !isRecurrenceRelationType(relationType)
    || !isRootCauseCategory(rootCauseCategory)
    || !commandId
    || !note
  ) return null
  return {
    expectedCurrentCaseVersion,
    previousCaseId: String(previousCaseId),
    relationType,
    rootCauseCategory,
    commandId,
    note,
  }
}

export class ChannelHealthRiskCaseContractError extends Error {
  constructor() {
    super('频道质量风险处置数据不符合远端契约')
    this.name = 'ChannelHealthRiskCaseContractError'
  }
}

const requireStrictRemoteResult = <T>(
  raw: Result<unknown>,
  adapt: (data: unknown) => T | null,
): Result<T> => {
  const result = withRemoteResultProvenance(raw)
  if (result.code !== 0 || result.source !== 'remote' || result.degraded || result.data == null) {
    throw new ChannelHealthRiskCaseContractError()
  }
  const data = adapt(result.data)
  if (!data) throw new ChannelHealthRiskCaseContractError()
  return {
    ...result,
    data,
  }
}

const encodeId = (value: ApiId) => encodeURIComponent(String(value))

const adaptResolutionRevisionWriteResult = (
  raw: unknown,
): ChannelHealthRiskCaseResolutionRevisionWriteResult | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, ['governance', 'resolutionRevision'])) return null
  const governance = adaptChannelHealthRiskCaseGovernance(value.governance)
  const resolutionRevision = adaptResolutionRevision(value.resolutionRevision)
  if (
    !governance
    || !resolutionRevision
    || String(governance.currentResolutionRevision?.id) !== String(resolutionRevision.id)
  ) return null
  return { governance, resolutionRevision }
}

const adaptActionReferenceWriteResult = (
  raw: unknown,
): ChannelHealthRiskCaseActionReferenceWriteResult | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, ['governance', 'actionReference'])) return null
  const governance = adaptChannelHealthRiskCaseGovernance(value.governance)
  const actionReference = adaptActionReference(value.actionReference)
  if (
    !governance
    || !actionReference
    || governance.actionReferenceCount < 1
    || String(governance.caseId) !== String(actionReference.caseId)
  ) return null
  return { governance, actionReference }
}

const adaptEvidenceEntryWriteResult = (
  raw: unknown,
): ChannelHealthRiskCaseEvidenceEntryWriteResult | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, ['governance', 'evidenceEntry'])) return null
  const governance = adaptChannelHealthRiskCaseGovernance(value.governance)
  const evidenceEntry = adaptEvidenceEntry(value.evidenceEntry)
  if (
    !governance
    || !evidenceEntry
    || governance.evidenceCount < 1
    || String(governance.caseId) !== String(evidenceEntry.caseId)
  ) return null
  return { governance, evidenceEntry }
}

export const channelHealthRiskCasesApi = {
  queue: async (
    query: ChannelHealthRiskCaseQueueQuery,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseQueuePage>> => {
    const params = normalizeQueueQuery(query)
    if (!params) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.get(RISK_CASES_PATH, {
      params,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, (data) => adaptChannelHealthRiskCaseQueuePage(data, Number(params.size)))
  },
  create: async (
    batchId: ApiId,
    request: ChannelHealthRiskCaseCreateCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseDetail>> => {
    const id = safePositiveLongId(batchId)
    const payload = normalizeCreateRequest(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${REVIEW_BATCHES_PATH}/${encodeId(id)}/risk-cases`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptChannelHealthRiskCaseDetail)
  },
  detail: async (
    caseId: ApiId,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseDetail>> => {
    const id = safePositiveLongId(caseId)
    if (!id) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.get(`${RISK_CASES_PATH}/${encodeId(id)}`, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptChannelHealthRiskCaseDetail)
  },
  events: async (
    caseId: ApiId,
    query: ChannelHealthRiskCaseEventQuery = {},
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseEventPage>> => {
    const id = safePositiveLongId(caseId)
    const params = normalizeEventQuery(query)
    if (!id || !params) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.get(`${RISK_CASES_PATH}/${encodeId(id)}/events`, {
      params,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, (data) => adaptChannelHealthRiskCaseEventPage(data, Number(params.size)))
  },
  assignOwner: async (
    caseId: ApiId,
    request: ChannelHealthRiskCaseAssignOwnerCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseDetail>> => {
    const id = safePositiveLongId(caseId)
    const payload = normalizeAssignOwnerRequest(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${RISK_CASES_PATH}/${encodeId(id)}/assign-owner`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptChannelHealthRiskCaseDetail)
  },
  acknowledge: async (
    caseId: ApiId,
    request: ChannelHealthRiskCaseNoteCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseDetail>> => {
    const id = safePositiveLongId(caseId)
    const payload = normalizeNoteRequest(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${RISK_CASES_PATH}/${encodeId(id)}/acknowledge`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptChannelHealthRiskCaseDetail)
  },
  plan: async (
    caseId: ApiId,
    request: ChannelHealthRiskCaseNoteCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseDetail>> => {
    const id = safePositiveLongId(caseId)
    const payload = normalizeNoteRequest(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${RISK_CASES_PATH}/${encodeId(id)}/plan`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptChannelHealthRiskCaseDetail)
  },
  progress: async (
    caseId: ApiId,
    request: ChannelHealthRiskCaseNoteCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseDetail>> => {
    const id = safePositiveLongId(caseId)
    const payload = normalizeNoteRequest(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${RISK_CASES_PATH}/${encodeId(id)}/progress`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptChannelHealthRiskCaseDetail)
  },
  submitResolution: async (
    caseId: ApiId,
    request: ChannelHealthRiskCaseResolutionCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseDetail>> => {
    const id = safePositiveLongId(caseId)
    const payload = normalizeResolutionRequest(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${RISK_CASES_PATH}/${encodeId(id)}/submit-resolution`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptChannelHealthRiskCaseDetail)
  },
  governance: async (
    caseId: ApiId,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseGovernance>> => {
    const id = safePositiveLongId(caseId)
    if (!id) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.get(`${RISK_CASES_PATH}/${encodeId(id)}/governance`, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptChannelHealthRiskCaseGovernance)
  },
  governanceMilestones: async (
    caseId: ApiId,
    query: ChannelHealthRiskCaseEventQuery = {},
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseGovernanceMilestonePage>> => {
    const id = safePositiveLongId(caseId)
    const params = normalizeEventQuery(query)
    if (!id || !params) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.get(`${RISK_CASES_PATH}/${encodeId(id)}/governance-milestones`, {
      params,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, (data) => (
      adaptChannelHealthRiskCaseGovernanceMilestonePage(data, Number(params.size))
    ))
  },
  resolutionRevisions: async (
    caseId: ApiId,
    query: ChannelHealthRiskCaseEventQuery = {},
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseResolutionRevisionPage>> => {
    const id = safePositiveLongId(caseId)
    const params = normalizeEventQuery(query)
    if (!id || !params) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.get(`${RISK_CASES_PATH}/${encodeId(id)}/resolution-revisions`, {
      params,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, (data) => (
      adaptChannelHealthRiskCaseResolutionRevisionPage(data, Number(params.size))
    ))
  },
  addResolutionRevision: async (
    caseId: ApiId,
    request: ChannelHealthRiskCaseResolutionRevisionCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseResolutionRevisionWriteResult>> => {
    const id = safePositiveLongId(caseId)
    const payload = normalizeResolutionRevisionRequest(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${RISK_CASES_PATH}/${encodeId(id)}/resolution-revisions`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptResolutionRevisionWriteResult)
  },
  actionReferences: async (
    caseId: ApiId,
    query: ChannelHealthRiskCaseEventQuery = {},
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseActionReferencePage>> => {
    const id = safePositiveLongId(caseId)
    const params = normalizeEventQuery(query)
    if (!id || !params) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.get(`${RISK_CASES_PATH}/${encodeId(id)}/action-references`, {
      params,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, (data) => (
      adaptChannelHealthRiskCaseActionReferencePage(data, Number(params.size))
    ))
  },
  addActionReference: async (
    caseId: ApiId,
    request: ChannelHealthRiskCaseActionReferenceCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseActionReferenceWriteResult>> => {
    const id = safePositiveLongId(caseId)
    const payload = normalizeActionReferenceRequest(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${RISK_CASES_PATH}/${encodeId(id)}/action-references`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptActionReferenceWriteResult)
  },
  evidence: async (
    caseId: ApiId,
    query: ChannelHealthRiskCaseEventQuery = {},
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseEvidenceEntryPage>> => {
    const id = safePositiveLongId(caseId)
    const params = normalizeEventQuery(query)
    if (!id || !params) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.get(`${RISK_CASES_PATH}/${encodeId(id)}/evidence`, {
      params,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, (data) => (
      adaptChannelHealthRiskCaseEvidenceEntryPage(data, Number(params.size))
    ))
  },
  addEvidence: async (
    caseId: ApiId,
    request: ChannelHealthRiskCaseEvidenceEntryCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseEvidenceEntryWriteResult>> => {
    const id = safePositiveLongId(caseId)
    const payload = normalizeEvidenceEntryRequest(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${RISK_CASES_PATH}/${encodeId(id)}/evidence`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptEvidenceEntryWriteResult)
  },
  closePreview: async (
    caseId: ApiId,
    request: ChannelHealthRiskCaseClosePreviewCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseClosePreview>> => {
    const id = safePositiveLongId(caseId)
    const payload = normalizeClosePreviewRequest(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${RISK_CASES_PATH}/${encodeId(id)}/close-preview`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptClosePreview)
  },
  close: async (
    caseId: ApiId,
    request: ChannelHealthRiskCaseCloseCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseCloseResult>> => {
    const id = safePositiveLongId(caseId)
    const payload = normalizeCloseRequest(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${RISK_CASES_PATH}/${encodeId(id)}/close`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptCloseResult)
  },
  closeSnapshot: async (
    caseId: ApiId,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseCloseSnapshotResponse>> => {
    const id = safePositiveLongId(caseId)
    if (!id) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.get(`${RISK_CASES_PATH}/${encodeId(id)}/close-snapshot`, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptChannelHealthRiskCaseCloseSnapshotResponse)
  },
  retrospective: async (
    caseId: ApiId,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseRetrospectiveResponse>> => {
    const id = safePositiveLongId(caseId)
    if (!id) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.get(`${RISK_CASES_PATH}/${encodeId(id)}/retrospective`, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptChannelHealthRiskCaseRetrospectiveResponse)
  },
  initializeRetrospective: async (
    caseId: ApiId,
    request: ChannelHealthRiskCaseRetrospectiveInitializeCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseRetrospective>> => {
    const id = safePositiveLongId(caseId)
    const payload = normalizeRetrospectiveOwnerRequest(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${RISK_CASES_PATH}/${encodeId(id)}/retrospective/initialize`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptRetrospective)
  },
  assignRetrospectiveOwner: async (
    caseId: ApiId,
    request: ChannelHealthRiskCaseRetrospectiveAssignOwnerCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseRetrospective>> => {
    const id = safePositiveLongId(caseId)
    const payload = normalizeRetrospectiveOwnerRequest(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${RISK_CASES_PATH}/${encodeId(id)}/retrospective/assign-owner`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptRetrospective)
  },
  startRetrospective: async (
    caseId: ApiId,
    request: ChannelHealthRiskCaseRetrospectiveNoteCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseRetrospective>> => {
    const id = safePositiveLongId(caseId)
    const payload = normalizeRetrospectiveVersion(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${RISK_CASES_PATH}/${encodeId(id)}/retrospective/start`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptRetrospective)
  },
  recordRetrospectiveFinding: async (
    caseId: ApiId,
    request: ChannelHealthRiskCaseRetrospectiveFindingCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseRetrospective>> => {
    const id = safePositiveLongId(caseId)
    const payload = normalizeRetrospectiveFindingRequest(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${RISK_CASES_PATH}/${encodeId(id)}/retrospective/findings`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptRetrospective)
  },
  completeRetrospective: async (
    caseId: ApiId,
    request: ChannelHealthRiskCaseRetrospectiveNoteCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseRetrospective>> => {
    const id = safePositiveLongId(caseId)
    const payload = normalizeRetrospectiveVersion(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${RISK_CASES_PATH}/${encodeId(id)}/retrospective/complete`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptRetrospective)
  },
  retrospectiveEvents: async (
    caseId: ApiId,
    query: ChannelHealthRiskCaseEventQuery = {},
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseRetrospectiveEventPage>> => {
    const id = safePositiveLongId(caseId)
    const params = normalizeEventQuery(query)
    if (!id || !params) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.get(`${RISK_CASES_PATH}/${encodeId(id)}/retrospective/events`, {
      params,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, (data) => (
      adaptChannelHealthRiskCaseRetrospectiveEventPage(data, Number(params.size))
    ))
  },
  recurrenceLinks: async (
    caseId: ApiId,
    query: ChannelHealthRiskCaseEventQuery = {},
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseRecurrenceLinkPage>> => {
    const id = safePositiveLongId(caseId)
    const params = normalizeEventQuery(query)
    if (!id || !params) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.get(`${RISK_CASES_PATH}/${encodeId(id)}/recurrence-links`, {
      params,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, (data) => (
      adaptChannelHealthRiskCaseRecurrenceLinkPage(data, Number(params.size))
    ))
  },
  addRecurrenceLink: async (
    caseId: ApiId,
    request: ChannelHealthRiskCaseRecurrenceLinkCmd,
    options: ChannelHealthRiskCaseRequestOptions = {},
  ): Promise<Result<ChannelHealthRiskCaseRecurrenceLink>> => {
    const id = safePositiveLongId(caseId)
    const payload = normalizeRecurrenceLinkRequest(request)
    if (!id || !payload) throw new ChannelHealthRiskCaseContractError()
    const raw = await client.post(`${RISK_CASES_PATH}/${encodeId(id)}/recurrence-links`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptRecurrenceLink)
  },
}
