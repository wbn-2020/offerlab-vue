import client, { type Result, withRemoteResultProvenance } from './client'
import type { ApiId } from './types'
import type { PageResult } from './collaboration'

const BASE_PATH = '/api/v1/content-maintenance/tasks'

export type MaintenanceSourceType =
  | 'CHANNEL_HEALTH'
  | 'SEARCH_GAP'
  | 'SUGGESTION'
  | 'FRESHNESS'
  | 'PROFILE_CONFIRMATION'
  | 'QUESTION'
  | 'MANUAL'

export type MaintenanceStatus = 'OPEN' | 'CLAIMED' | 'SUBMITTED' | 'COMPLETED' | 'CLOSED'
export type MaintenanceDeliveryType = 'POST' | 'QUESTION' | 'SERIES'
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type MaintenancePhase =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'REWORK'
  | 'REVIEW_PENDING'
  | 'VERIFIED_DELIVERY'
  | 'CLOSED'
export type ContentMaintenanceApprovalReasonCode = 'QUALITY_VERIFIED' | 'EVIDENCE_SUFFICIENT'
export type ContentMaintenanceRejectionReasonCode =
  | 'CONTENT_INCOMPLETE'
  | 'PUBLIC_EVIDENCE_MISSING'
  | 'SCOPE_MISMATCH'
  | 'OTHER'
export type ContentMaintenanceCloseReasonCode =
  | 'OUT_OF_SCOPE'
  | 'DUPLICATE'
  | 'NO_LONGER_RELEVANT'
  | 'AUTHOR_UNRESPONSIVE'
  | 'OTHER'
export type ContentMaintenanceTerminalOutcomeCode = 'VERIFIED_DELIVERY'
export type ContentMaintenanceAttemptDecision = 'APPROVED' | 'REJECTED' | 'CLOSED'

export interface ContentMaintenanceTask {
  id: ApiId
  domain: number
  sourceType: MaintenanceSourceType
  sourceRefId: ApiId | null
  sourcePostId: ApiId | null
  createdByUid: ApiId
  assigneeUid: ApiId | null
  title: string
  detail: string
  status: MaintenanceStatus
  dispatchBatchId: ApiId | null
  priority: MaintenancePriority
  dueAt: string | null
  currentAttemptNo: number
  maintenancePhase: MaintenancePhase
  terminalOutcomeCode: ContentMaintenanceTerminalOutcomeCode | null
  closeReasonCode: ContentMaintenanceCloseReasonCode | null
  deliveryType: MaintenanceDeliveryType | null
  deliveryRefId: ApiId | null
  deliveryPostId: ApiId | null
  deliveryNote: string | null
  reviewNote: string | null
  canClaim: boolean
  canSubmit: boolean
  canReview: boolean
  canClose: boolean
  canReassign: boolean
  claimedAt: string | null
  submittedAt: string | null
  reviewedByUid: ApiId | null
  reviewedAt: string | null
  closedByUid: ApiId | null
  closedAt: string | null
  createTime: string
  updateTime: string
}

export interface MaintenanceListQuery {
  domain?: number
  status?: MaintenanceStatus
  cursor?: string | number
  size?: number
}

export interface ContentMaintenanceRequestOptions {
  signal?: AbortSignal
  skipAuthRedirect?: boolean
}

export interface ContentMaintenanceTaskCreateCmd {
  domain: number
  sourceType: MaintenanceSourceType
  sourceRefId?: ApiId
  sourcePostId?: ApiId
  assigneeUid: ApiId
  title: string
  detail: string
}

export interface ContentMaintenanceTaskSubmitCmd {
  deliveryType: MaintenanceDeliveryType
  deliveryRefId: ApiId
  deliveryPostId?: ApiId
  note: string
}

export type ContentMaintenanceTaskReviewCmd =
  | {
    decision: 'APPROVED'
    reasonCode: ContentMaintenanceApprovalReasonCode
    note: string
  }
  | {
    decision: 'REJECTED'
    reasonCode: ContentMaintenanceRejectionReasonCode
    note: string
  }

export interface ContentMaintenanceTaskReassignCmd {
  replacementUid: ApiId
  reason: string
}

export interface ContentMaintenanceTaskCloseCmd {
  reasonCode: ContentMaintenanceCloseReasonCode
  note: string
}

export interface ContentMaintenanceTaskAttempt {
  attemptNo: number
  deliveryType: MaintenanceDeliveryType
  deliveryRefId: ApiId
  deliveryPostId: ApiId | null
  note: string
  submittedByUid: ApiId
  submittedAt: string
  decision: ContentMaintenanceAttemptDecision | null
  reasonCode:
    | ContentMaintenanceApprovalReasonCode
    | ContentMaintenanceRejectionReasonCode
    | ContentMaintenanceCloseReasonCode
    | null
  reviewNote: string | null
  reviewedByUid: ApiId | null
  reviewedAt: string | null
}

const REVIEW_EVIDENCE_STATES = [
  'NOT_SUBMITTED',
  'NON_POST_DELIVERY',
  'SAME_POST_UPDATED',
  'SAME_POST_NO_PUBLIC_UPDATE',
  'SEPARATE_PUBLIC_DELIVERY',
  'SOURCE_UNAVAILABLE',
  'DELIVERY_UNAVAILABLE',
  'EVIDENCE_UNAVAILABLE',
] as const

const LINKED_PUBLIC_POST_AVAILABILITIES = ['AVAILABLE', 'NOT_LINKED', 'UNAVAILABLE'] as const
const MAINTENANCE_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const
const MAINTENANCE_PHASES = [
  'OPEN',
  'IN_PROGRESS',
  'REWORK',
  'REVIEW_PENDING',
  'VERIFIED_DELIVERY',
  'CLOSED',
] as const
const APPROVAL_REASON_CODES = ['QUALITY_VERIFIED', 'EVIDENCE_SUFFICIENT'] as const
const REJECTION_REASON_CODES = [
  'CONTENT_INCOMPLETE',
  'PUBLIC_EVIDENCE_MISSING',
  'SCOPE_MISMATCH',
  'OTHER',
] as const
const CLOSE_REASON_CODES = [
  'OUT_OF_SCOPE',
  'DUPLICATE',
  'NO_LONGER_RELEVANT',
  'AUTHOR_UNRESPONSIVE',
  'OTHER',
] as const
const ATTEMPT_DECISIONS = ['APPROVED', 'REJECTED', 'CLOSED'] as const
const ISO_LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})?$/

export type ContentMaintenanceRevisionEvidenceState = (typeof REVIEW_EVIDENCE_STATES)[number]
export type ContentMaintenanceLinkedPublicPostAvailability = (typeof LINKED_PUBLIC_POST_AVAILABILITIES)[number]

export interface ContentMaintenanceReviewContextTask {
  id: ApiId
  status: MaintenanceStatus
  deliveryType: MaintenanceDeliveryType | null
  deliveryPostId: ApiId | null
  createTime: string
}

export interface ContentMaintenanceLinkedPublicPost {
  postId: ApiId | null
  domain: number | null
  postType: number | null
  title: string | null
  postHref: string | null
  availability: ContentMaintenanceLinkedPublicPostAvailability
}

export interface ContentMaintenancePublicRevisionUpdate {
  resultVersion: number
  publicUpdateSummary: string
  impactScope?: string
  createTime: string
}

export interface ContentMaintenanceRevisionEvidence {
  state: ContentMaintenanceRevisionEvidenceState
  summary: string
  updates: ContentMaintenancePublicRevisionUpdate[]
}

export interface ContentMaintenanceTaskReviewContext {
  task: ContentMaintenanceReviewContextTask | null
  source: ContentMaintenanceLinkedPublicPost | null
  delivery: ContentMaintenanceLinkedPublicPost | null
  evidence: ContentMaintenanceRevisionEvidence
  degraded: boolean
  fallbackReason: string | null
}

type ReviewContextAdapterResult<T> = {
  value: T
  invalid: boolean
}

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
)

const hasField = (value: Record<string, unknown>, key: string) => (
  Object.prototype.hasOwnProperty.call(value, key)
)

const safeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text || null
}

const safeApiId = (value: unknown): ApiId | null => {
  if (typeof value === 'string') {
    const idValue = value.trim()
    return /^[1-9]\d*$/.test(idValue) ? idValue : null
  }
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
}

const safeInteger = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null
  }
  if (typeof value !== 'string' || !value.trim()) return null
  const numberValue = Number(value)
  return Number.isSafeInteger(numberValue) && numberValue >= 0 ? numberValue : null
}

const safePositiveInteger = (value: unknown): number | null => {
  const numberValue = safeInteger(value)
  return numberValue != null && numberValue > 0 ? numberValue : null
}

const safeDomain = (value: unknown): number | null => {
  const domain = safePositiveInteger(value)
  return domain != null && domain <= 5 ? domain : null
}

const safeDateTime = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const time = value.trim()
  return ISO_LOCAL_DATE_TIME.test(time) && Number.isFinite(Date.parse(time)) ? time : null
}

const safeNullableId = (value: unknown): ApiId | null => (
  value == null ? null : safeApiId(value)
)

const safeNullableText = (value: unknown): string | null => (
  value == null ? null : safeText(value)
)

const safeNullableDateTime = (value: unknown): string | null => (
  value == null ? null : safeDateTime(value)
)

const safeCursor = (value: unknown): string | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? String(value) : null
  }
  if (typeof value !== 'string') return null
  const cursor = value.trim()
  return /^[1-9]\d*$/.test(cursor) ? cursor : null
}

const isMaintenanceStatus = (value: unknown): value is MaintenanceStatus => (
  value === 'OPEN'
  || value === 'CLAIMED'
  || value === 'SUBMITTED'
  || value === 'COMPLETED'
  || value === 'CLOSED'
)

const isMaintenanceDeliveryType = (value: unknown): value is MaintenanceDeliveryType => (
  value === 'POST' || value === 'QUESTION' || value === 'SERIES'
)

const isMaintenancePriority = (value: unknown): value is MaintenancePriority => (
  typeof value === 'string' && (MAINTENANCE_PRIORITIES as readonly string[]).includes(value)
)

const isMaintenancePhase = (value: unknown): value is MaintenancePhase => (
  typeof value === 'string' && (MAINTENANCE_PHASES as readonly string[]).includes(value)
)

const isApprovalReasonCode = (value: unknown): value is ContentMaintenanceApprovalReasonCode => (
  typeof value === 'string' && (APPROVAL_REASON_CODES as readonly string[]).includes(value)
)

const isRejectionReasonCode = (value: unknown): value is ContentMaintenanceRejectionReasonCode => (
  typeof value === 'string' && (REJECTION_REASON_CODES as readonly string[]).includes(value)
)

const isCloseReasonCode = (value: unknown): value is ContentMaintenanceCloseReasonCode => (
  typeof value === 'string' && (CLOSE_REASON_CODES as readonly string[]).includes(value)
)

const isAttemptDecision = (value: unknown): value is ContentMaintenanceAttemptDecision => (
  typeof value === 'string' && (ATTEMPT_DECISIONS as readonly string[]).includes(value)
)

const isReviewEvidenceState = (value: unknown): value is ContentMaintenanceRevisionEvidenceState => (
  typeof value === 'string'
  && (REVIEW_EVIDENCE_STATES as readonly string[]).includes(value)
)

const isLinkedPublicPostAvailability = (
  value: unknown,
): value is ContentMaintenanceLinkedPublicPostAvailability => (
  typeof value === 'string'
  && (LINKED_PUBLIC_POST_AVAILABILITIES as readonly string[]).includes(value)
)

const phaseMatchesStatus = (status: MaintenanceStatus, phase: MaintenancePhase) => {
  if (status === 'OPEN') return phase === 'OPEN'
  if (status === 'CLAIMED') return phase === 'IN_PROGRESS' || phase === 'REWORK'
  if (status === 'SUBMITTED') return phase === 'REVIEW_PENDING'
  if (status === 'COMPLETED') return phase === 'VERIFIED_DELIVERY'
  return phase === 'CLOSED'
}

const terminalOutcomeMatchesStatus = (
  status: MaintenanceStatus,
  terminalOutcomeCode: ContentMaintenanceTerminalOutcomeCode | null,
  closeReasonCode: ContentMaintenanceCloseReasonCode | null,
  isLegacyTerminalSnapshot: boolean,
) => {
  if (status === 'COMPLETED') {
    return (
      (terminalOutcomeCode === 'VERIFIED_DELIVERY' && closeReasonCode == null)
      || isLegacyTerminalSnapshot
    )
  }
  if (status === 'CLOSED') {
    return (closeReasonCode != null && terminalOutcomeCode == null) || isLegacyTerminalSnapshot
  }
  return terminalOutcomeCode == null && closeReasonCode == null
}

const V38_TASK_METADATA_FIELDS = [
  'dispatchBatchId',
  'priority',
  'dueAt',
  'currentAttemptNo',
  'maintenancePhase',
  'terminalOutcomeCode',
  'closeReasonCode',
] as const

const legacyMaintenancePhase = (status: MaintenanceStatus): MaintenancePhase => {
  if (status === 'OPEN') return 'OPEN'
  if (status === 'CLAIMED') return 'IN_PROGRESS'
  if (status === 'SUBMITTED') return 'REVIEW_PENDING'
  if (status === 'COMPLETED') return 'VERIFIED_DELIVERY'
  return 'CLOSED'
}

export class ContentMaintenanceContractError extends Error {
  constructor(message = '维护任务服务响应不完整，已停止显示和操作。') {
    super(message)
    this.name = 'ContentMaintenanceContractError'
  }
}

const invalidTask = (): never => {
  throw new ContentMaintenanceContractError()
}

export const adaptContentMaintenanceTask = (raw: unknown): ContentMaintenanceTask => {
  const value = asRecord(raw)
  if (!value) return invalidTask()
  const isLegacyV38Payload = V38_TASK_METADATA_FIELDS.every((key) => !hasField(value, key))
  if (
    !isLegacyV38Payload
    && !V38_TASK_METADATA_FIELDS.every((key) => hasField(value, key))
  ) return invalidTask()
  const nullableFields = [
    'sourceRefId',
    'sourcePostId',
    'assigneeUid',
    'deliveryType',
    'deliveryRefId',
    'deliveryPostId',
    'deliveryNote',
    'reviewNote',
    'claimedAt',
    'submittedAt',
    'reviewedByUid',
    'reviewedAt',
    'closedByUid',
    'closedAt',
    ...(
      isLegacyV38Payload
        ? []
        : ['dispatchBatchId', 'dueAt', 'terminalOutcomeCode', 'closeReasonCode']
    ),
  ]
  if (!nullableFields.every((key) => hasField(value, key))) return invalidTask()

  const idValue = safeApiId(value.id)
  const domain = safeDomain(value.domain)
  const sourceType = value.sourceType
  const createdByUid = safeApiId(value.createdByUid)
  const title = safeText(value.title)
  const detail = safeText(value.detail)
  const status = value.status
  const priority = isLegacyV38Payload ? 'MEDIUM' : value.priority
  const currentAttemptNo = isLegacyV38Payload ? 0 : safeInteger(value.currentAttemptNo)
  const maintenancePhase = isLegacyV38Payload && isMaintenanceStatus(status)
    ? legacyMaintenancePhase(status)
    : value.maintenancePhase
  const createTime = safeDateTime(value.createTime)
  const updateTime = safeDateTime(value.updateTime)
  if (
    !idValue
    || domain == null
    || !isMaintenanceSourceType(sourceType)
    || !createdByUid
    || !title
    || !detail
    || !isMaintenanceStatus(status)
    || !isMaintenancePriority(priority)
    || currentAttemptNo == null
    || !isMaintenancePhase(maintenancePhase)
    || !createTime
    || !updateTime
    || typeof value.canClaim !== 'boolean'
    || typeof value.canSubmit !== 'boolean'
    || typeof value.canReview !== 'boolean'
    || typeof value.canClose !== 'boolean'
    || typeof value.canReassign !== 'boolean'
  ) return invalidTask()

  const sourceRefId = safeNullableId(value.sourceRefId)
  const sourcePostId = safeNullableId(value.sourcePostId)
  const assigneeUid = safeNullableId(value.assigneeUid)
  const dispatchBatchId = safeNullableId(value.dispatchBatchId)
  const dueAt = safeNullableDateTime(value.dueAt)
  const deliveryRefId = safeNullableId(value.deliveryRefId)
  const deliveryPostId = safeNullableId(value.deliveryPostId)
  const deliveryNote = safeNullableText(value.deliveryNote)
  const reviewNote = safeNullableText(value.reviewNote)
  const claimedAt = safeNullableDateTime(value.claimedAt)
  const submittedAt = safeNullableDateTime(value.submittedAt)
  const reviewedByUid = safeNullableId(value.reviewedByUid)
  const reviewedAt = safeNullableDateTime(value.reviewedAt)
  const closedByUid = safeNullableId(value.closedByUid)
  const closedAt = safeNullableDateTime(value.closedAt)
  const rawDeliveryType = value.deliveryType
  const deliveryType = rawDeliveryType == null ? null : (
    isMaintenanceDeliveryType(rawDeliveryType) ? rawDeliveryType : null
  )
  const rawTerminalOutcomeCode = isLegacyV38Payload ? null : value.terminalOutcomeCode
  const terminalOutcomeCode: ContentMaintenanceTerminalOutcomeCode | null = rawTerminalOutcomeCode == null ? null : (
    rawTerminalOutcomeCode === 'VERIFIED_DELIVERY'
      ? rawTerminalOutcomeCode
      : null
  )
  const rawCloseReasonCode = isLegacyV38Payload ? null : value.closeReasonCode
  const closeReasonCode: ContentMaintenanceCloseReasonCode | null = rawCloseReasonCode == null ? null : (
    isCloseReasonCode(rawCloseReasonCode) ? rawCloseReasonCode : null
  )
  const isLegacyTerminalSnapshot = currentAttemptNo === 0
    && terminalOutcomeCode == null
    && closeReasonCode == null
    && (status === 'COMPLETED' || status === 'CLOSED')

  if (
    (value.sourceRefId != null && !sourceRefId)
    || (value.sourcePostId != null && !sourcePostId)
    || (value.assigneeUid != null && !assigneeUid)
    || (value.dispatchBatchId != null && !dispatchBatchId)
    || (value.dueAt != null && !dueAt)
    || (value.deliveryRefId != null && !deliveryRefId)
    || (value.deliveryPostId != null && !deliveryPostId)
    || (value.deliveryNote != null && !deliveryNote)
    || (value.reviewNote != null && !reviewNote)
    || (value.claimedAt != null && !claimedAt)
    || (value.submittedAt != null && !submittedAt)
    || (value.reviewedByUid != null && !reviewedByUid)
    || (value.reviewedAt != null && !reviewedAt)
    || (value.closedByUid != null && !closedByUid)
    || (value.closedAt != null && !closedAt)
    || (rawDeliveryType != null && !deliveryType)
    || (rawTerminalOutcomeCode != null && !terminalOutcomeCode)
    || (rawCloseReasonCode != null && !closeReasonCode)
    || !phaseMatchesStatus(status, maintenancePhase)
    || !terminalOutcomeMatchesStatus(
      status,
      terminalOutcomeCode,
      closeReasonCode,
      isLegacyTerminalSnapshot,
    )
  ) return invalidTask()

  const hasDelivery = deliveryType != null
  const isLegacyDeliverySnapshot = currentAttemptNo === 0
    && hasDelivery
    && status !== 'OPEN'
  if (
    (hasDelivery && (
      !deliveryRefId
      || !deliveryNote
      || !submittedAt
      || (currentAttemptNo < 1 && !isLegacyDeliverySnapshot)
    ))
    || (!hasDelivery && (
      deliveryRefId != null
      || deliveryPostId != null
      || deliveryNote != null
      || submittedAt != null
      || currentAttemptNo !== 0
    ))
    || (deliveryType === 'SERIES' && deliveryPostId != null)
    || ((deliveryType === 'POST' || deliveryType === 'QUESTION') && !deliveryPostId)
    || ((reviewedByUid == null) !== (reviewedAt == null))
    || ((reviewedByUid == null) !== (reviewNote == null))
    || (reviewedByUid != null && currentAttemptNo === 0 && !isLegacyDeliverySnapshot)
    || ((closedByUid == null) !== (closedAt == null))
    || (status === 'CLOSED' && (closedByUid == null || closedAt == null))
    || (status !== 'CLOSED' && (closedByUid != null || closedAt != null))
  ) return invalidTask()

  return {
    id: idValue,
    domain,
    sourceType,
    sourceRefId,
    sourcePostId,
    createdByUid,
    assigneeUid,
    title,
    detail,
    status,
    dispatchBatchId,
    priority,
    dueAt,
    currentAttemptNo,
    maintenancePhase,
    terminalOutcomeCode,
    closeReasonCode,
    deliveryType,
    deliveryRefId,
    deliveryPostId,
    deliveryNote,
    reviewNote,
    canClaim: value.canClaim,
    canSubmit: value.canSubmit,
    canReview: value.canReview,
    canClose: value.canClose,
    canReassign: value.canReassign,
    claimedAt,
    submittedAt,
    reviewedByUid,
    reviewedAt,
    closedByUid,
    closedAt,
    createTime,
    updateTime,
  }
}

const isMaintenanceSourceType = (value: unknown): value is MaintenanceSourceType => (
  value === 'CHANNEL_HEALTH'
  || value === 'SEARCH_GAP'
  || value === 'SUGGESTION'
  || value === 'FRESHNESS'
  || value === 'PROFILE_CONFIRMATION'
  || value === 'QUESTION'
  || value === 'MANUAL'
)

const safeNonNegativeLong = (value: unknown): number | string | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null
  }
  if (typeof value !== 'string') return null
  const longValue = value.trim()
  return /^\d+$/.test(longValue) ? longValue : null
}

const toBigInt = (value: ApiId | number | string): bigint => BigInt(String(value))

export const adaptContentMaintenanceTaskPage = (
  raw: unknown,
  requestedSize: number,
): PageResult<ContentMaintenanceTask> => {
  const value = asRecord(raw)
  if (
    !value
    || !hasField(value, 'items')
    || !hasField(value, 'nextCursor')
    || !hasField(value, 'hasMore')
    || !hasField(value, 'total')
    || !Array.isArray(value.items)
    || value.items.length > requestedSize
  ) {
    throw new ContentMaintenanceContractError()
  }
  const total = safeNonNegativeLong(value.total)
  const nextCursor = value.nextCursor == null ? null : safeCursor(value.nextCursor)
  if (
    total == null
    || typeof value.hasMore !== 'boolean'
    || (value.nextCursor != null && !nextCursor)
    || (value.hasMore !== (nextCursor != null))
    || (value.hasMore && value.items.length === 0)
  ) throw new ContentMaintenanceContractError()

  const items = value.items.map(adaptContentMaintenanceTask)
  const ids = new Set<string>()
  for (let index = 0; index < items.length; index += 1) {
    const task = items[index]
    const taskId = String(task.id)
    if (ids.has(taskId)) throw new ContentMaintenanceContractError()
    ids.add(taskId)
    if (index > 0 && toBigInt(items[index - 1].id) <= toBigInt(task.id)) {
      throw new ContentMaintenanceContractError()
    }
  }
  if (
    toBigInt(total) < BigInt(items.length)
    || (nextCursor != null && items.length > 0 && nextCursor !== String(items[items.length - 1].id))
  ) throw new ContentMaintenanceContractError()

  return {
    items,
    nextCursor,
    hasMore: value.hasMore,
    total,
  }
}

export const adaptContentMaintenanceTaskAttempt = (
  raw: unknown,
): ContentMaintenanceTaskAttempt => {
  const value = asRecord(raw)
  if (!value) throw new ContentMaintenanceContractError('维护交付回合响应不完整，已停止显示。')
  const nullableFields = [
    'deliveryPostId',
    'decision',
    'reasonCode',
    'reviewNote',
    'reviewedByUid',
    'reviewedAt',
  ]
  if (!nullableFields.every((key) => hasField(value, key))) {
    throw new ContentMaintenanceContractError('维护交付回合响应不完整，已停止显示。')
  }
  const attemptNo = safePositiveInteger(value.attemptNo)
  const rawDeliveryType = value.deliveryType
  const deliveryType = isMaintenanceDeliveryType(rawDeliveryType) ? rawDeliveryType : null
  const deliveryRefId = safeApiId(value.deliveryRefId)
  const submittedByUid = safeApiId(value.submittedByUid)
  const submittedAt = safeDateTime(value.submittedAt)
  const note = safeText(value.note)
  const deliveryPostId = safeNullableId(value.deliveryPostId)
  const rawDecision = value.decision
  const decision = rawDecision == null ? null : (
    isAttemptDecision(rawDecision) ? rawDecision : null
  )
  const rawReasonCode = value.reasonCode
  const reasonCode: ContentMaintenanceTaskAttempt['reasonCode'] = rawReasonCode == null ? null : (
    isApprovalReasonCode(rawReasonCode) || isRejectionReasonCode(rawReasonCode) || isCloseReasonCode(rawReasonCode)
      ? rawReasonCode
      : null
  )
  const reviewNote = safeNullableText(value.reviewNote)
  const reviewedByUid = safeNullableId(value.reviewedByUid)
  const reviewedAt = safeNullableDateTime(value.reviewedAt)
  if (
    !attemptNo
    || !deliveryType
    || !deliveryRefId
    || !submittedByUid
    || !submittedAt
    || !note
    || (value.deliveryPostId != null && !deliveryPostId)
    || (rawDecision != null && !decision)
    || (rawReasonCode != null && !reasonCode)
    || (value.reviewNote != null && !reviewNote)
    || (value.reviewedByUid != null && !reviewedByUid)
    || (value.reviewedAt != null && !reviewedAt)
    || (deliveryType === 'SERIES' && deliveryPostId != null)
    || ((deliveryType === 'POST' || deliveryType === 'QUESTION') && !deliveryPostId)
    || ((reviewedByUid == null) !== (reviewedAt == null))
    || ((reviewedByUid == null) !== (reviewNote == null))
    || ((decision == null) !== (reasonCode == null))
    || ((decision == null) !== (reviewedByUid == null))
  ) throw new ContentMaintenanceContractError('维护交付回合响应不完整，已停止显示。')

  const reasonMatchesDecision = (
    (decision === 'APPROVED' && isApprovalReasonCode(reasonCode))
    || (decision === 'REJECTED' && isRejectionReasonCode(reasonCode))
    || (decision === 'CLOSED' && isCloseReasonCode(reasonCode))
    || decision == null
  )
  if (!reasonMatchesDecision) {
    throw new ContentMaintenanceContractError('维护交付回合响应不完整，已停止显示。')
  }
  return {
    attemptNo,
    deliveryType,
    deliveryRefId,
    deliveryPostId,
    note,
    submittedByUid,
    submittedAt,
    decision,
    reasonCode,
    reviewNote,
    reviewedByUid,
    reviewedAt,
  }
}

export const adaptContentMaintenanceTaskAttempts = (
  raw: unknown,
): ContentMaintenanceTaskAttempt[] => {
  if (!Array.isArray(raw) || raw.length > 100) {
    throw new ContentMaintenanceContractError('维护交付回合响应不完整，已停止显示。')
  }
  const attempts = raw.map(adaptContentMaintenanceTaskAttempt)
  for (let index = 1; index < attempts.length; index += 1) {
    if (attempts[index - 1].attemptNo <= attempts[index].attemptNo) {
      throw new ContentMaintenanceContractError('维护交付回合响应不完整，已停止显示。')
    }
  }
  return attempts
}

export const isSafeContentMaintenancePostHref = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  const href = value.trim()
  return /^\/post\/[1-9]\d*$/.test(href)
}

const unavailableReviewEvidence = (): ContentMaintenanceRevisionEvidence => ({
  state: 'EVIDENCE_UNAVAILABLE',
  summary: '复核依据暂不可读取',
  updates: [],
})

export const unavailableContentMaintenanceTaskReviewContext = (
  fallbackReason = 'review_context_contract_invalid',
): ContentMaintenanceTaskReviewContext => ({
  task: null,
  source: null,
  delivery: null,
  evidence: unavailableReviewEvidence(),
  degraded: true,
  fallbackReason,
})

const adaptReviewContextTask = (
  raw: unknown,
): ContentMaintenanceReviewContextTask | null => {
  const value = asRecord(raw)
  const idValue = safeApiId(value?.id)
  const status = value?.status
  const createTime = safeText(value?.createTime)
  const rawDeliveryType = value?.deliveryType
  const deliveryPostId = value?.deliveryPostId == null ? null : safeApiId(value.deliveryPostId)
  if (
    !idValue
    || !isMaintenanceStatus(status)
    || !createTime
    || (value?.deliveryPostId != null && !deliveryPostId)
  ) return null
  let deliveryType: MaintenanceDeliveryType | null = null
  if (rawDeliveryType != null) {
    if (!isMaintenanceDeliveryType(rawDeliveryType)) return null
    deliveryType = rawDeliveryType
  }
  return {
    id: idValue,
    status,
    deliveryType,
    deliveryPostId,
    createTime,
  }
}

const adaptLinkedPublicPost = (
  raw: unknown,
): ReviewContextAdapterResult<ContentMaintenanceLinkedPublicPost | null> => {
  if (raw == null) return { value: null, invalid: false }
  const value = asRecord(raw)
  const availability = value?.availability
  if (!value || !isLinkedPublicPostAvailability(availability)) {
    return { value: null, invalid: true }
  }
  const rawHref = value.postHref
  const postHref = rawHref == null ? null : (
    isSafeContentMaintenancePostHref(rawHref) ? rawHref.trim() : null
  )
  if (rawHref != null && !postHref) return { value: null, invalid: true }
  if (availability !== 'AVAILABLE') {
    return {
      value: {
        postId: null,
        domain: null,
        postType: null,
        title: null,
        postHref: null,
        availability,
      },
      invalid: false,
    }
  }
  const postId = safeApiId(value.postId)
  const domain = safeDomain(value.domain)
  const postType = safePositiveInteger(value.postType)
  const title = safeText(value.title)
  if (!postId || domain == null || !postType || !title || !postHref) {
    return { value: null, invalid: true }
  }
  return {
    value: {
      postId,
      domain,
      postType,
      title,
      postHref,
      availability,
    },
    invalid: false,
  }
}

const adaptPublicRevisionUpdates = (
  raw: unknown,
): ReviewContextAdapterResult<ContentMaintenancePublicRevisionUpdate[]> => {
  if (!Array.isArray(raw) || raw.length > 3) return { value: [], invalid: true }
  const updates: ContentMaintenancePublicRevisionUpdate[] = []
  for (const item of raw) {
    const value = asRecord(item)
    const resultVersion = safePositiveInteger(value?.resultVersion)
    const publicUpdateSummary = safeText(value?.publicUpdateSummary)
    const createTime = safeText(value?.createTime)
    const rawImpactScope = value?.impactScope
    const impactScope = rawImpactScope == null ? undefined : safeText(rawImpactScope)
    if (
      !value
      || !resultVersion
      || !publicUpdateSummary
      || !createTime
      || (rawImpactScope != null && !impactScope)
    ) {
      return { value: [], invalid: true }
    }
    updates.push({
      resultVersion,
      publicUpdateSummary,
      ...(impactScope ? { impactScope } : {}),
      createTime,
    })
  }
  return { value: updates, invalid: false }
}

const adaptRevisionEvidence = (
  raw: unknown,
): ReviewContextAdapterResult<ContentMaintenanceRevisionEvidence> => {
  const value = asRecord(raw)
  const state = value?.state
  const summary = safeText(value?.summary)
  const updates = adaptPublicRevisionUpdates(value?.updates)
  if (!value || !isReviewEvidenceState(state) || !summary || updates.invalid) {
    return { value: unavailableReviewEvidence(), invalid: true }
  }
  if (
    (state === 'SAME_POST_UPDATED' && updates.value.length === 0)
    || (state !== 'SAME_POST_UPDATED' && updates.value.length > 0)
  ) {
    return { value: unavailableReviewEvidence(), invalid: true }
  }
  return {
    value: {
      state,
      summary,
      updates: updates.value,
    },
    invalid: false,
  }
}

export const adaptContentMaintenanceTaskReviewContext = (
  raw: unknown,
): ContentMaintenanceTaskReviewContext => {
  try {
    const value = asRecord(raw)
    if (!value) return unavailableContentMaintenanceTaskReviewContext()
    const task = adaptReviewContextTask(value.task)
    const source = adaptLinkedPublicPost(value.source)
    const delivery = adaptLinkedPublicPost(value.delivery)
    const evidence = adaptRevisionEvidence(value.evidence)
    const fallbackReason = value.fallbackReason == null ? null : safeText(value.fallbackReason)
    if (
      !task
      || source.invalid
      || delivery.invalid
      || evidence.invalid
      || typeof value.degraded !== 'boolean'
      || (value.fallbackReason != null && !fallbackReason)
    ) {
      return unavailableContentMaintenanceTaskReviewContext()
    }
    return {
      task,
      source: source.value,
      delivery: delivery.value,
      evidence: evidence.value,
      degraded: value.degraded,
      fallbackReason,
    }
  } catch {
    return unavailableContentMaintenanceTaskReviewContext()
  }
}

const adaptStrictMaintenanceResult = <T>(
  raw: Result<unknown>,
  adapter: (value: unknown) => T,
): Result<T> => {
  const result = withRemoteResultProvenance(raw)
  if (result.source !== 'remote' || result.degraded || result.data == null) {
    throw new ContentMaintenanceContractError()
  }
  return {
    ...result,
    data: adapter(result.data),
  }
}

const requestTaskResult = async (request: Promise<unknown>): Promise<Result<ContentMaintenanceTask>> => {
  const raw = await request as Result<unknown>
  return adaptStrictMaintenanceResult(raw, adaptContentMaintenanceTask)
}

const requestTaskPageResult = async (
  request: Promise<unknown>,
  requestedSize: number,
): Promise<Result<PageResult<ContentMaintenanceTask>>> => {
  const raw = await request as Result<unknown>
  return adaptStrictMaintenanceResult(raw, (value) => (
    adaptContentMaintenanceTaskPage(value, requestedSize)
  ))
}

const requestAttemptsResult = async (
  request: Promise<unknown>,
): Promise<Result<ContentMaintenanceTaskAttempt[]>> => {
  const raw = await request as Result<unknown>
  return adaptStrictMaintenanceResult(raw, adaptContentMaintenanceTaskAttempts)
}

const id = (value: ApiId) => encodeURIComponent(String(value))

export const contentMaintenanceApi = {
  create: (cmd: ContentMaintenanceTaskCreateCmd) =>
    requestTaskResult(client.post(BASE_PATH, cmd)),
  mine: (
    query: Omit<MaintenanceListQuery, 'domain'> = {},
    options: ContentMaintenanceRequestOptions = {},
  ) =>
    requestTaskPageResult(client.get(`${BASE_PATH}/mine`, {
      params: query,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }), query.size || 20),
  queue: (
    query: MaintenanceListQuery = {},
    options: ContentMaintenanceRequestOptions = {},
  ) =>
    requestTaskPageResult(client.get(`${BASE_PATH}/queue`, {
      params: query,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }), query.size || 20),
  attempts: async (
    taskId: ApiId,
    options: ContentMaintenanceRequestOptions = {},
  ): Promise<Result<ContentMaintenanceTaskAttempt[]>> => (
    requestAttemptsResult(client.get(`${BASE_PATH}/${id(taskId)}/attempts`, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }))
  ),
  reviewContext: async (
    taskId: ApiId,
    options: ContentMaintenanceRequestOptions = {},
  ): Promise<Result<ContentMaintenanceTaskReviewContext>> => {
    const raw = await client.get(`${BASE_PATH}/${id(taskId)}/review-context`, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    const res = withRemoteResultProvenance(raw)
    return {
      ...res,
      data: res.source === 'remote' && !res.degraded
        ? adaptContentMaintenanceTaskReviewContext(res.data)
        : unavailableContentMaintenanceTaskReviewContext('review_context_remote_source_required'),
    }
  },
  claim: (taskId: ApiId) =>
    requestTaskResult(client.post(`${BASE_PATH}/${id(taskId)}/claim`)),
  submit: (taskId: ApiId, cmd: ContentMaintenanceTaskSubmitCmd) =>
    requestTaskResult(client.post(`${BASE_PATH}/${id(taskId)}/submit`, cmd)),
  review: (taskId: ApiId, cmd: ContentMaintenanceTaskReviewCmd) =>
    requestTaskResult(client.post(`${BASE_PATH}/${id(taskId)}/review`, cmd)),
  reassign: (taskId: ApiId, cmd: ContentMaintenanceTaskReassignCmd) =>
    requestTaskResult(client.post(`${BASE_PATH}/${id(taskId)}/reassign`, cmd)),
  close: (taskId: ApiId, cmd: ContentMaintenanceTaskCloseCmd) =>
    requestTaskResult(client.post(`${BASE_PATH}/${id(taskId)}/close`, cmd)),
}
