import client, { type Result, withRemoteResultProvenance } from './client'
import type { ApiId } from './types'

const BASE_PATH = '/api/v1/community-health/quality-review-batches'
const MAX_SIGNED_LONG = 9_223_372_036_854_775_807n
const MAX_PAGE_SIZE = 20
const MAX_BATCH_CANDIDATES = 20
const MAX_EVENT_PAGE_SIZE = 20
const SOURCE_TYPE = 'CHANNEL_HEALTH' as const
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const
const TASK_STATUSES = ['OPEN', 'CLAIMED', 'SUBMITTED', 'COMPLETED', 'CLOSED'] as const
const PROGRESS_STATES = [
  'ACTION_REQUIRED',
  'IN_PROGRESS',
  'REVIEW_PENDING',
  'COMPLETED',
  'CLOSED',
  'PARTIALLY_CLOSED',
] as const
const DUE_STATES = ['NOT_APPLICABLE', 'ON_TRACK', 'DUE_SOON', 'OVERDUE'] as const
const DUE_IN_DAYS_OPTIONS = [1, 3, 7, 14, 30] as const
const MAINTENANCE_PHASES = [
  'OPEN',
  'IN_PROGRESS',
  'REWORK',
  'REVIEW_PENDING',
  'VERIFIED_DELIVERY',
  'CLOSED',
] as const
const TERMINAL_OUTCOME_CODES = ['VERIFIED_DELIVERY'] as const
const EXTEND_BY_DAYS_OPTIONS = [1, 3, 7, 14, 30] as const
const RISK_CODES = [
  'BLOCKER',
  'CAPACITY_RISK',
  'REVIEW_DELAY',
  'OVERDUE_ESCALATION',
] as const
const WITHDRAW_REASON_CODES = [
  'SCOPE_INVALID',
  'DUPLICATE_SCOPE',
  'PRIORITY_REPLACED',
  'OTHER',
] as const
const COORDINATION_EVENT_TYPES = [
  'DEADLINE_EXTENDED',
  'ACTIVE_TASKS_REASSIGNED',
  'RISK_NOTE_ADDED',
  'OPEN_TASKS_WITHDRAWN',
] as const

export type ChannelHealthReviewBatchPriority = (typeof PRIORITIES)[number]
export type ChannelHealthReviewBatchTaskStatus = (typeof TASK_STATUSES)[number]
export type ChannelHealthReviewBatchProgressState = (typeof PROGRESS_STATES)[number]
export type ChannelHealthReviewBatchDueState = (typeof DUE_STATES)[number]
export type ChannelHealthReviewBatchDueInDays = (typeof DUE_IN_DAYS_OPTIONS)[number]
export type ChannelHealthReviewBatchMaintenancePhase = (typeof MAINTENANCE_PHASES)[number]
export type ChannelHealthReviewBatchTerminalOutcomeCode = (typeof TERMINAL_OUTCOME_CODES)[number]
export type ChannelHealthReviewBatchExtendByDays = (typeof EXTEND_BY_DAYS_OPTIONS)[number]
export type ChannelHealthReviewBatchRiskCode = (typeof RISK_CODES)[number]
export type ChannelHealthReviewBatchWithdrawReasonCode = (typeof WITHDRAW_REASON_CODES)[number]
export type ChannelHealthReviewBatchCoordinationEventType = (typeof COORDINATION_EVENT_TYPES)[number]

export type ChannelHealthReviewBatchStatusCounts = Record<ChannelHealthReviewBatchTaskStatus, number>

export interface ChannelHealthReviewBatchSummary {
  id: ApiId
  domain: number
  sourceType: typeof SOURCE_TYPE
  name: string
  priority: ChannelHealthReviewBatchPriority
  dueAt: string | null
  assigneeUid: ApiId
  createdByUid: ApiId
  candidateCount: number
  progressState: ChannelHealthReviewBatchProgressState
  dueState: ChannelHealthReviewBatchDueState
  taskStatusCounts: ChannelHealthReviewBatchStatusCounts
  createTime: string
}

export interface ChannelHealthReviewBatchItem {
  taskId: ApiId
  sourcePostId: ApiId
  sourceRefId: ApiId
  title: string
  postHref: string
  status: ChannelHealthReviewBatchTaskStatus
  maintenancePhase: ChannelHealthReviewBatchMaintenancePhase
  terminalOutcome: ChannelHealthReviewBatchTerminalOutcomeCode | null
}

export interface ChannelHealthReviewBatchDetail extends ChannelHealthReviewBatchSummary {
  tasks: ChannelHealthReviewBatchItem[]
}

export interface ChannelHealthReviewBatchCoordinationTask {
  taskId: ApiId
  title: string
  status: ChannelHealthReviewBatchTaskStatus
  maintenancePhase: ChannelHealthReviewBatchMaintenancePhase
  assigneeUid: ApiId
  dueAt: string | null
  updateTime: string
  canReassign: boolean
  canWithdraw: boolean
}

export interface ChannelHealthReviewBatchCoordination {
  batchId: ApiId
  domain: number
  name: string
  dispatchAssigneeUid: ApiId
  dueAt: string | null
  effectiveDueAt: string | null
  coordinationVersion: number
  progressState: ChannelHealthReviewBatchProgressState
  dueState: ChannelHealthReviewBatchDueState
  openTaskCount: number
  activeTaskCount: number
  reassignableTaskCount: number
  canExtendDueAt: boolean
  canBulkReassign: boolean
  canAddRiskNote: boolean
  canWithdrawOpenTasks: boolean
  taskStatusCounts: ChannelHealthReviewBatchStatusCounts
  tasks: ChannelHealthReviewBatchCoordinationTask[]
}

export interface ChannelHealthReviewBatchEvent {
  id: ApiId
  eventType: ChannelHealthReviewBatchCoordinationEventType
  previousDueAt: string | null
  effectiveDueAt: string | null
  previousAssigneeUid: ApiId | null
  replacementAssigneeUid: ApiId | null
  riskCode: ChannelHealthReviewBatchRiskCode | null
  withdrawReasonCode: ChannelHealthReviewBatchWithdrawReasonCode | null
  affectedTaskCount: number
  note: string
  coordinationVersion: number
  createTime: string
}

export interface ChannelHealthReviewBatchEventPage {
  nextCursor: ApiId | null
  items: ChannelHealthReviewBatchEvent[]
}

export interface ChannelHealthReviewBatchPage {
  available: boolean
  nextCursor: ApiId | null
  items: ChannelHealthReviewBatchSummary[]
}

export interface ChannelHealthReviewBatchCandidateTarget {
  sourcePostId: ApiId
  sourceRefId: ApiId
}

export interface ChannelHealthReviewBatchCreateCmd {
  domain: number
  name: string
  assigneeUid: ApiId
  priority: ChannelHealthReviewBatchPriority
  dueInDays: ChannelHealthReviewBatchDueInDays
  candidates: ChannelHealthReviewBatchCandidateTarget[]
}

export type ChannelHealthReviewBatchCreateRequest = ChannelHealthReviewBatchCreateCmd

export interface ChannelHealthReviewBatchExtendDeadlineCmd {
  expectedCoordinationVersion: number
  extendByDays: ChannelHealthReviewBatchExtendByDays
  note: string
}

export interface ChannelHealthReviewBatchReassignActiveTasksCmd {
  expectedCoordinationVersion: number
  replacementUid: ApiId
  note: string
}

export interface ChannelHealthReviewBatchRiskNoteCmd {
  expectedCoordinationVersion: number
  riskCode: ChannelHealthReviewBatchRiskCode
  note: string
}

export interface ChannelHealthReviewBatchWithdrawOpenTasksCmd {
  expectedCoordinationVersion: number
  expectedOpenTaskCount: number
  expectedActiveTaskCount: number
  reasonCode: ChannelHealthReviewBatchWithdrawReasonCode
  note: string
}

export interface ChannelHealthReviewBatchListQuery {
  domain: number
  cursor?: ApiId
  size?: number
}

export interface ChannelHealthReviewBatchEventListQuery {
  cursor?: ApiId
  size?: number
}

export interface ChannelHealthReviewBatchRequestOptions {
  signal?: AbortSignal
  skipAuthRedirect?: boolean
}

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
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

const isPriority = (value: unknown): value is ChannelHealthReviewBatchPriority => (
  typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value)
)

const isTaskStatus = (value: unknown): value is ChannelHealthReviewBatchTaskStatus => (
  typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value)
)

const isProgressState = (value: unknown): value is ChannelHealthReviewBatchProgressState => (
  typeof value === 'string' && (PROGRESS_STATES as readonly string[]).includes(value)
)

const isDueState = (value: unknown): value is ChannelHealthReviewBatchDueState => (
  typeof value === 'string' && (DUE_STATES as readonly string[]).includes(value)
)

const isMaintenancePhase = (value: unknown): value is ChannelHealthReviewBatchMaintenancePhase => (
  typeof value === 'string' && (MAINTENANCE_PHASES as readonly string[]).includes(value)
)

const isTerminalOutcomeCode = (
  value: unknown,
): value is ChannelHealthReviewBatchTerminalOutcomeCode => (
  typeof value === 'string' && (TERMINAL_OUTCOME_CODES as readonly string[]).includes(value)
)

const isExtendByDays = (value: unknown): value is ChannelHealthReviewBatchExtendByDays => (
  typeof value === 'number'
  && Number.isSafeInteger(value)
  && (EXTEND_BY_DAYS_OPTIONS as readonly number[]).includes(value)
)

const isRiskCode = (value: unknown): value is ChannelHealthReviewBatchRiskCode => (
  typeof value === 'string' && (RISK_CODES as readonly string[]).includes(value)
)

const isWithdrawReasonCode = (value: unknown): value is ChannelHealthReviewBatchWithdrawReasonCode => (
  typeof value === 'string' && (WITHDRAW_REASON_CODES as readonly string[]).includes(value)
)

const isCoordinationEventType = (
  value: unknown,
): value is ChannelHealthReviewBatchCoordinationEventType => (
  typeof value === 'string' && (COORDINATION_EVENT_TYPES as readonly string[]).includes(value)
)

export const isChannelHealthReviewBatchPriority = (
  value: unknown,
): value is ChannelHealthReviewBatchPriority => isPriority(value)

export const isChannelHealthReviewBatchDueInDays = (
  value: unknown,
): value is ChannelHealthReviewBatchDueInDays => (
  typeof value === 'number'
  && Number.isSafeInteger(value)
  && (DUE_IN_DAYS_OPTIONS as readonly number[]).includes(value)
)

export const isChannelHealthReviewBatchExtendByDays = (
  value: unknown,
): value is ChannelHealthReviewBatchExtendByDays => isExtendByDays(value)

const safeFutureOrHistoricalTimestamp = (value: unknown): string | null => {
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

const isSafePostHref = (value: unknown, sourcePostId: ApiId): value is string => (
  typeof value === 'string' && value.trim() === `/post/${String(sourcePostId)}`
)

const expectedProgressState = (
  statusCounts: ChannelHealthReviewBatchStatusCounts,
): ChannelHealthReviewBatchProgressState => {
  if (statusCounts.OPEN > 0) return 'ACTION_REQUIRED'
  if (statusCounts.CLAIMED > 0) return 'IN_PROGRESS'
  if (statusCounts.SUBMITTED > 0) return 'REVIEW_PENDING'
  if (statusCounts.COMPLETED > 0 && statusCounts.CLOSED === 0) return 'COMPLETED'
  if (statusCounts.CLOSED > 0 && statusCounts.COMPLETED === 0) return 'CLOSED'
  return 'PARTIALLY_CLOSED'
}

const adaptStatusCounts = (
  raw: unknown,
  candidateCount: number,
): ChannelHealthReviewBatchStatusCounts | null => {
  const value = asRecord(raw)
  if (!value) return null
  const counts = {} as ChannelHealthReviewBatchStatusCounts
  let total = 0
  for (const status of TASK_STATUSES) {
    const count = safeNonNegativeInteger(value[status])
    if (count == null || count > MAX_BATCH_CANDIDATES) return null
    counts[status] = count
    total += count
  }
  if (total !== candidateCount) return null
  return counts
}

const adaptBatchSummary = (raw: unknown): ChannelHealthReviewBatchSummary | null => {
  const value = asRecord(raw)
  const id = safePositiveLongId(value?.id)
  const domain = safeDomain(value?.domain)
  const name = safeText(value?.name, 2, 120)
  const priority = value?.priority
  const dueAt = safeOptionalTimestamp(value?.dueAt)
  const assigneeUid = safePositiveLongId(value?.assigneeUid)
  const createdByUid = safePositiveLongId(value?.createdByUid)
  const candidateCount = safeNonNegativeInteger(value?.candidateCount)
  const progressState = value?.progressState
  const dueState = value?.dueState
  const createTime = safeFutureOrHistoricalTimestamp(value?.createTime)
  const taskStatusCounts = candidateCount == null
    ? null
    : adaptStatusCounts(value?.taskStatusCounts, candidateCount)
  const hasActiveTasks = taskStatusCounts != null && (
    taskStatusCounts.OPEN > 0 || taskStatusCounts.CLAIMED > 0 || taskStatusCounts.SUBMITTED > 0
  )
  if (
    !value
    || !id
    || domain == null
    || !name
    || !isPriority(priority)
    || dueAt === undefined
    || value.sourceType !== SOURCE_TYPE
    || !assigneeUid
    || !createdByUid
    || !createTime
    || candidateCount == null
    || candidateCount < 1
    || candidateCount > MAX_BATCH_CANDIDATES
    || !isProgressState(progressState)
    || !isDueState(dueState)
    || !taskStatusCounts
    || progressState !== expectedProgressState(taskStatusCounts)
    || (
      !hasActiveTasks
      && dueState !== 'NOT_APPLICABLE'
    )
    || (
      hasActiveTasks
      && dueAt != null
      && dueState === 'NOT_APPLICABLE'
    )
  ) return null
  return {
    id,
    domain,
    sourceType: SOURCE_TYPE,
    name,
    priority,
    dueAt,
    assigneeUid,
    createdByUid,
    candidateCount,
    progressState,
    dueState,
    taskStatusCounts,
    createTime,
  }
}

const adaptBatchItem = (
  raw: unknown,
): ChannelHealthReviewBatchItem | null => {
  const value = asRecord(raw)
  const taskId = safePositiveLongId(value?.taskId)
  const sourcePostId = safePositiveLongId(value?.sourcePostId)
  const sourceRefId = safePositiveLongId(value?.sourceRefId)
  const title = safeText(value?.title, 2, 160)
  const status = value?.status
  const maintenancePhase = value?.maintenancePhase
  const rawTerminalOutcome = value?.terminalOutcome
  const terminalOutcome = rawTerminalOutcome == null ? null : (
    isTerminalOutcomeCode(rawTerminalOutcome) ? rawTerminalOutcome : null
  )
  if (
    !value
    || !taskId
    || !sourcePostId
    || !sourceRefId
    || !title
    || !isSafePostHref(value.postHref, sourcePostId)
    || !isTaskStatus(status)
    || !isMaintenancePhase(maintenancePhase)
    || (rawTerminalOutcome != null && terminalOutcome == null)
    || (
      status === 'OPEN'
      && (maintenancePhase !== 'OPEN' || terminalOutcome != null)
    )
    || (
      status === 'CLAIMED'
      && (
        (maintenancePhase !== 'IN_PROGRESS' && maintenancePhase !== 'REWORK')
        || terminalOutcome != null
      )
    )
    || (
      status === 'SUBMITTED'
      && (maintenancePhase !== 'REVIEW_PENDING' || terminalOutcome != null)
    )
    || (
      status === 'COMPLETED'
      && (
        maintenancePhase !== 'VERIFIED_DELIVERY'
        || terminalOutcome !== 'VERIFIED_DELIVERY'
      )
    )
    || (
      status === 'CLOSED'
      && (maintenancePhase !== 'CLOSED' || terminalOutcome != null)
    )
  ) return null
  return {
    taskId,
    sourcePostId,
    sourceRefId,
    title,
    postHref: value.postHref.trim(),
    status,
    maintenancePhase,
    terminalOutcome,
  }
}

const safeBoolean = (value: unknown): boolean | null => (
  typeof value === 'boolean' ? value : null
)

const safeOptionalTimestamp = (value: unknown): string | null | undefined => {
  if (value == null) return null
  return safeFutureOrHistoricalTimestamp(value) ?? undefined
}

const safeOptionalPositiveLongId = (value: unknown): ApiId | null | undefined => {
  if (value == null) return null
  return safePositiveLongId(value) ?? undefined
}

const taskPhaseMatchesStatus = (
  status: ChannelHealthReviewBatchTaskStatus,
  maintenancePhase: ChannelHealthReviewBatchMaintenancePhase,
): boolean => (
  (status === 'OPEN' && maintenancePhase === 'OPEN')
  || (
    status === 'CLAIMED'
    && (maintenancePhase === 'IN_PROGRESS' || maintenancePhase === 'REWORK')
  )
  || (status === 'SUBMITTED' && maintenancePhase === 'REVIEW_PENDING')
  || (status === 'COMPLETED' && maintenancePhase === 'VERIFIED_DELIVERY')
  || (status === 'CLOSED' && maintenancePhase === 'CLOSED')
)

const adaptCoordinationTask = (
  raw: unknown,
): ChannelHealthReviewBatchCoordinationTask | null => {
  const value = asRecord(raw)
  const taskId = safePositiveLongId(value?.taskId)
  const title = safeText(value?.title, 2, 160)
  const status = value?.status
  const maintenancePhase = value?.maintenancePhase
  const assigneeUid = safePositiveLongId(value?.assigneeUid)
  const dueAt = safeOptionalTimestamp(value?.dueAt)
  const updateTime = safeFutureOrHistoricalTimestamp(value?.updateTime)
  const canReassign = safeBoolean(value?.canReassign)
  const canWithdraw = safeBoolean(value?.canWithdraw)
  if (
    !value
    || !taskId
    || !title
    || !isTaskStatus(status)
    || !isMaintenancePhase(maintenancePhase)
    || !assigneeUid
    || dueAt === undefined
    || !updateTime
    || canReassign == null
    || canWithdraw == null
    || !taskPhaseMatchesStatus(status, maintenancePhase)
    || canReassign !== (status === 'OPEN' || status === 'CLAIMED')
    || canWithdraw !== (status === 'OPEN')
  ) return null
  return {
    taskId,
    title,
    status,
    maintenancePhase,
    assigneeUid,
    dueAt,
    updateTime,
    canReassign,
    canWithdraw,
  }
}

export const unavailableChannelHealthReviewBatchCoordination = (): ChannelHealthReviewBatchCoordination | null => null

export const adaptChannelHealthReviewBatchCoordination = (
  raw: unknown,
): ChannelHealthReviewBatchCoordination | null => {
  try {
    const value = asRecord(raw)
    const batchId = safePositiveLongId(value?.batchId)
    const domain = safeDomain(value?.domain)
    const name = safeText(value?.name, 2, 120)
    const dispatchAssigneeUid = safePositiveLongId(value?.dispatchAssigneeUid)
    const dueAt = safeOptionalTimestamp(value?.dueAt)
    const effectiveDueAt = safeOptionalTimestamp(value?.effectiveDueAt)
    const coordinationVersion = safeNonNegativeInteger(value?.coordinationVersion)
    const progressState = value?.progressState
    const dueState = value?.dueState
    const openTaskCount = safeNonNegativeInteger(value?.openTaskCount)
    const activeTaskCount = safeNonNegativeInteger(value?.activeTaskCount)
    const reassignableTaskCount = safeNonNegativeInteger(value?.reassignableTaskCount)
    const canExtendDueAt = safeBoolean(value?.canExtendDueAt)
    const canBulkReassign = safeBoolean(value?.canBulkReassign)
    const canAddRiskNote = safeBoolean(value?.canAddRiskNote)
    const canWithdrawOpenTasks = safeBoolean(value?.canWithdrawOpenTasks)
    if (
      !value
      || !batchId
      || domain == null
      || !name
      || !dispatchAssigneeUid
      || dueAt === undefined
      || effectiveDueAt === undefined
      || coordinationVersion == null
      || !isProgressState(progressState)
      || !isDueState(dueState)
      || openTaskCount == null
      || activeTaskCount == null
      || reassignableTaskCount == null
      || canExtendDueAt == null
      || canBulkReassign == null
      || canAddRiskNote == null
      || canWithdrawOpenTasks == null
      || !Array.isArray(value.tasks)
      || value.tasks.length < 1
      || value.tasks.length > MAX_BATCH_CANDIDATES
    ) return unavailableChannelHealthReviewBatchCoordination()

    const tasks = value.tasks.map(adaptCoordinationTask)
    if (tasks.some((task) => task == null)) return unavailableChannelHealthReviewBatchCoordination()
    const taskStatusCounts = adaptStatusCounts(value.taskStatusCounts, tasks.length)
    if (!taskStatusCounts) return unavailableChannelHealthReviewBatchCoordination()

    const observedCounts = {} as ChannelHealthReviewBatchStatusCounts
    for (const status of TASK_STATUSES) observedCounts[status] = 0
    const taskIds = new Set<string>()
    for (const task of tasks as ChannelHealthReviewBatchCoordinationTask[]) {
      if (taskIds.has(String(task.taskId))) return unavailableChannelHealthReviewBatchCoordination()
      taskIds.add(String(task.taskId))
      observedCounts[task.status] += 1
    }
    for (const status of TASK_STATUSES) {
      if (observedCounts[status] !== taskStatusCounts[status]) {
        return unavailableChannelHealthReviewBatchCoordination()
      }
    }

    const expectedActiveTaskCount = taskStatusCounts.OPEN
      + taskStatusCounts.CLAIMED
      + taskStatusCounts.SUBMITTED
    const expectedReassignableTaskCount = taskStatusCounts.OPEN + taskStatusCounts.CLAIMED
    const hasConfiguredDeadline = dueAt != null && effectiveDueAt != null
    if (
      progressState !== expectedProgressState(taskStatusCounts)
      || openTaskCount !== taskStatusCounts.OPEN
      || activeTaskCount !== expectedActiveTaskCount
      || reassignableTaskCount !== expectedReassignableTaskCount
      || (dueAt == null) !== (effectiveDueAt == null)
      || canExtendDueAt !== (hasConfiguredDeadline && expectedActiveTaskCount > 0)
      || canBulkReassign !== (expectedReassignableTaskCount > 0)
      || canWithdrawOpenTasks !== (taskStatusCounts.OPEN > 0)
      || (
        (!hasConfiguredDeadline || expectedActiveTaskCount === 0)
        && dueState !== 'NOT_APPLICABLE'
      )
      || (
        hasConfiguredDeadline
        && expectedActiveTaskCount > 0
        && dueState === 'NOT_APPLICABLE'
      )
    ) return unavailableChannelHealthReviewBatchCoordination()

    return {
      batchId,
      domain,
      name,
      dispatchAssigneeUid,
      dueAt,
      effectiveDueAt,
      coordinationVersion,
      progressState,
      dueState,
      openTaskCount,
      activeTaskCount,
      reassignableTaskCount,
      canExtendDueAt,
      canBulkReassign,
      canAddRiskNote,
      canWithdrawOpenTasks,
      taskStatusCounts,
      tasks: tasks as ChannelHealthReviewBatchCoordinationTask[],
    }
  } catch {
    return unavailableChannelHealthReviewBatchCoordination()
  }
}

const timestampEpoch = (value: string): number => Date.parse(value)

const adaptCoordinationEvent = (
  raw: unknown,
): ChannelHealthReviewBatchEvent | null => {
  const value = asRecord(raw)
  const id = safePositiveLongId(value?.id)
  const eventType = value?.eventType
  const previousDueAt = safeOptionalTimestamp(value?.previousDueAt)
  const effectiveDueAt = safeOptionalTimestamp(value?.effectiveDueAt)
  const previousAssigneeUid = safeOptionalPositiveLongId(value?.previousAssigneeUid)
  const replacementAssigneeUid = safeOptionalPositiveLongId(value?.replacementAssigneeUid)
  const riskCode = value?.riskCode == null ? null : (
    isRiskCode(value.riskCode) ? value.riskCode : undefined
  )
  const withdrawReasonCode = value?.withdrawReasonCode == null ? null : (
    isWithdrawReasonCode(value.withdrawReasonCode) ? value.withdrawReasonCode : undefined
  )
  const affectedTaskCount = safeNonNegativeInteger(value?.affectedTaskCount)
  const note = safeText(value?.note, 2, 500)
  const coordinationVersion = safeNonNegativeInteger(value?.coordinationVersion)
  const createTime = safeFutureOrHistoricalTimestamp(value?.createTime)
  if (
    !value
    || !id
    || !isCoordinationEventType(eventType)
    || previousDueAt === undefined
    || effectiveDueAt === undefined
    || previousAssigneeUid === undefined
    || replacementAssigneeUid === undefined
    || riskCode === undefined
    || withdrawReasonCode === undefined
    || affectedTaskCount == null
    || affectedTaskCount > MAX_BATCH_CANDIDATES
    || !note
    || coordinationVersion == null
    || coordinationVersion < 1
    || !createTime
  ) return null

  const deadlineExtended = eventType === 'DEADLINE_EXTENDED'
    && previousDueAt != null
    && effectiveDueAt != null
    && timestampEpoch(effectiveDueAt) > timestampEpoch(previousDueAt)
    && previousAssigneeUid == null
    && replacementAssigneeUid == null
    && riskCode == null
    && withdrawReasonCode == null
    && affectedTaskCount > 0
  const activeTasksReassigned = eventType === 'ACTIVE_TASKS_REASSIGNED'
    && previousDueAt == null
    && effectiveDueAt == null
    && replacementAssigneeUid != null
    && (previousAssigneeUid == null || previousAssigneeUid !== replacementAssigneeUid)
    && riskCode == null
    && withdrawReasonCode == null
    && affectedTaskCount > 0
  const riskNoteAdded = eventType === 'RISK_NOTE_ADDED'
    && previousDueAt == null
    && effectiveDueAt == null
    && previousAssigneeUid == null
    && replacementAssigneeUid == null
    && riskCode != null
    && withdrawReasonCode == null
    && affectedTaskCount === 0
  const openTasksWithdrawn = eventType === 'OPEN_TASKS_WITHDRAWN'
    && previousDueAt == null
    && effectiveDueAt == null
    && previousAssigneeUid == null
    && replacementAssigneeUid == null
    && riskCode == null
    && withdrawReasonCode != null
    && affectedTaskCount > 0
  if (!deadlineExtended && !activeTasksReassigned && !riskNoteAdded && !openTasksWithdrawn) return null

  return {
    id,
    eventType,
    previousDueAt,
    effectiveDueAt,
    previousAssigneeUid,
    replacementAssigneeUid,
    riskCode,
    withdrawReasonCode,
    affectedTaskCount,
    note,
    coordinationVersion,
    createTime,
  }
}

export const unavailableChannelHealthReviewBatchEventPage = (): ChannelHealthReviewBatchEventPage | null => null

export const adaptChannelHealthReviewBatchEventPage = (
  raw: unknown,
  requestedSize = 10,
): ChannelHealthReviewBatchEventPage | null => {
  try {
    const value = asRecord(raw)
    if (
      !value
      || !Number.isInteger(requestedSize)
      || requestedSize < 1
      || requestedSize > MAX_EVENT_PAGE_SIZE
      || !Array.isArray(value.items)
      || value.items.length > requestedSize
    ) return unavailableChannelHealthReviewBatchEventPage()
    const items = value.items.map(adaptCoordinationEvent)
    const nextCursor = value.nextCursor == null ? null : safePositiveLongId(value.nextCursor)
    if (items.some((item) => item == null) || (value.nextCursor != null && !nextCursor)) {
      return unavailableChannelHealthReviewBatchEventPage()
    }
    let previousId: bigint | null = null
    const eventIds = new Set<string>()
    for (const item of items as ChannelHealthReviewBatchEvent[]) {
      const currentId = BigInt(String(item.id))
      if (
        eventIds.has(String(item.id))
        || (previousId != null && currentId >= previousId)
      ) return unavailableChannelHealthReviewBatchEventPage()
      eventIds.add(String(item.id))
      previousId = currentId
    }
    if (
      nextCursor != null
      && (previousId == null || BigInt(String(nextCursor)) !== previousId)
    ) return unavailableChannelHealthReviewBatchEventPage()
    return {
      nextCursor,
      items: items as ChannelHealthReviewBatchEvent[],
    }
  } catch {
    return unavailableChannelHealthReviewBatchEventPage()
  }
}

export const unavailableChannelHealthReviewBatchPage = (): ChannelHealthReviewBatchPage => ({
  available: false,
  nextCursor: null,
  items: [],
})

export const unavailableChannelHealthReviewBatchDetail = (): ChannelHealthReviewBatchDetail | null => null

export const adaptChannelHealthReviewBatchPage = (
  raw: unknown,
): ChannelHealthReviewBatchPage => {
  try {
    const value = asRecord(raw)
    if (!value || value.available !== true || !Array.isArray(value.items) || value.items.length > MAX_PAGE_SIZE) {
      return unavailableChannelHealthReviewBatchPage()
    }
    const items = value.items.map(adaptBatchSummary)
    const nextCursor = value.nextCursor == null ? null : safePositiveLongId(value.nextCursor)
    if (items.some((item) => item == null) || (value.nextCursor != null && !nextCursor)) {
      return unavailableChannelHealthReviewBatchPage()
    }
    const seenIds = new Set<string>()
    let previousId: bigint | null = null
    for (const item of items) {
      const currentId = BigInt(String(item!.id))
      if (
        seenIds.has(String(item!.id))
        || (previousId != null && currentId >= previousId)
      ) return unavailableChannelHealthReviewBatchPage()
      seenIds.add(String(item!.id))
      previousId = currentId
    }
    if (
      nextCursor != null
      && (previousId == null || BigInt(String(nextCursor)) !== previousId)
    ) {
      return unavailableChannelHealthReviewBatchPage()
    }
    return {
      available: true,
      nextCursor,
      items: items as ChannelHealthReviewBatchSummary[],
    }
  } catch {
    return unavailableChannelHealthReviewBatchPage()
  }
}

export const adaptChannelHealthReviewBatchDetail = (
  raw: unknown,
): ChannelHealthReviewBatchDetail | null => {
  try {
    const value = asRecord(raw)
    const batch = adaptBatchSummary(value)
    if (!value || !batch || !Array.isArray(value.tasks) || value.tasks.length !== batch.candidateCount) return null
    const tasks = value.tasks.map(adaptBatchItem)
    if (tasks.some((item) => item == null)) return null
    const taskIds = new Set<string>()
    const candidateKeys = new Set<string>()
    const observedCounts = {} as ChannelHealthReviewBatchStatusCounts
    for (const status of TASK_STATUSES) observedCounts[status] = 0
    for (const item of tasks as ChannelHealthReviewBatchItem[]) {
      const candidateKey = `${String(item.sourcePostId)}:${String(item.sourceRefId)}`
      if (taskIds.has(String(item.taskId)) || candidateKeys.has(candidateKey)) return null
      taskIds.add(String(item.taskId))
      candidateKeys.add(candidateKey)
      observedCounts[item.status] += 1
    }
    for (const status of TASK_STATUSES) {
      if (observedCounts[status] !== batch.taskStatusCounts[status]) return null
    }
    return {
      ...batch,
      tasks: tasks as ChannelHealthReviewBatchItem[],
    }
  } catch {
    return null
  }
}

const normalizedListQuery = (
  query: ChannelHealthReviewBatchListQuery,
): Record<string, string | number> | null => {
  const domain = safeDomain(query?.domain)
  const cursor = query?.cursor == null ? null : safePositiveLongId(query.cursor)
  const requestedSize = query?.size == null ? 10 : query.size
  const size = Number.isInteger(requestedSize) && requestedSize >= 1 && requestedSize <= MAX_PAGE_SIZE
    ? requestedSize
    : null
  if (domain == null || (query?.cursor != null && !cursor) || size == null) return null
  return {
    domain,
    size,
    ...(cursor ? { cursor: String(cursor) } : {}),
  }
}

type ChannelHealthReviewBatchCreatePayload = {
  domain: number
  name: string
  assigneeUid: string
  priority: ChannelHealthReviewBatchPriority
  dueInDays: ChannelHealthReviewBatchDueInDays
  candidates: Array<{
    sourcePostId: string
    sourceRefId: string
  }>
}

const normalizedCreateRequest = (
  request: ChannelHealthReviewBatchCreateRequest,
): ChannelHealthReviewBatchCreatePayload | null => {
  const domain = safeDomain(request?.domain)
  const name = safeText(request?.name, 2, 120)
  const assigneeUid = safePositiveLongId(request?.assigneeUid)
  if (
    domain == null
    || !name
    || !assigneeUid
    || !isPriority(request?.priority)
    || !isChannelHealthReviewBatchDueInDays(request?.dueInDays)
    || !Array.isArray(request?.candidates)
    || request.candidates.length < 1
    || request.candidates.length > MAX_BATCH_CANDIDATES
  ) return null
  const candidates: ChannelHealthReviewBatchCreatePayload['candidates'] = []
  const keys = new Set<string>()
  for (const candidate of request.candidates) {
    const sourcePostId = safePositiveLongId(candidate?.sourcePostId)
    const sourceRefId = safePositiveLongId(candidate?.sourceRefId)
    if (!sourcePostId || !sourceRefId) return null
    const key = `${String(sourcePostId)}:${String(sourceRefId)}`
    if (keys.has(key)) return null
    keys.add(key)
    candidates.push({
      sourcePostId: String(sourcePostId),
      sourceRefId: String(sourceRefId),
    })
  }
  return {
    domain,
    name,
    assigneeUid: String(assigneeUid),
    priority: request.priority,
    dueInDays: request.dueInDays,
    candidates,
  }
}

const normalizedEventListQuery = (
  query: ChannelHealthReviewBatchEventListQuery,
): Record<string, string | number> | null => {
  const cursor = query?.cursor == null ? null : safePositiveLongId(query.cursor)
  const requestedSize = query?.size == null ? 10 : query.size
  const size = Number.isInteger(requestedSize) && requestedSize >= 1 && requestedSize <= MAX_EVENT_PAGE_SIZE
    ? requestedSize
    : null
  if ((query?.cursor != null && !cursor) || size == null) return null
  return {
    size,
    ...(cursor ? { cursor: String(cursor) } : {}),
  }
}

const normalizedCoordinationVersion = (value: unknown): number | null => {
  const coordinationVersion = safeNonNegativeInteger(value)
  return coordinationVersion == null ? null : coordinationVersion
}

const normalizedCoordinationNote = (value: unknown): string | null => safeText(value, 2, 500)

type ChannelHealthReviewBatchExtendDeadlinePayload = {
  expectedCoordinationVersion: number
  extendByDays: ChannelHealthReviewBatchExtendByDays
  note: string
}

const normalizedExtendDeadlineRequest = (
  request: ChannelHealthReviewBatchExtendDeadlineCmd,
): ChannelHealthReviewBatchExtendDeadlinePayload | null => {
  const expectedCoordinationVersion = normalizedCoordinationVersion(request?.expectedCoordinationVersion)
  const note = normalizedCoordinationNote(request?.note)
  if (expectedCoordinationVersion == null || !isExtendByDays(request?.extendByDays) || !note) return null
  return {
    expectedCoordinationVersion,
    extendByDays: request.extendByDays,
    note,
  }
}

type ChannelHealthReviewBatchReassignActiveTasksPayload = {
  expectedCoordinationVersion: number
  replacementUid: string
  note: string
}

const normalizedReassignActiveTasksRequest = (
  request: ChannelHealthReviewBatchReassignActiveTasksCmd,
): ChannelHealthReviewBatchReassignActiveTasksPayload | null => {
  const expectedCoordinationVersion = normalizedCoordinationVersion(request?.expectedCoordinationVersion)
  const replacementUid = safePositiveLongId(request?.replacementUid)
  const note = normalizedCoordinationNote(request?.note)
  if (expectedCoordinationVersion == null || !replacementUid || !note) return null
  return {
    expectedCoordinationVersion,
    replacementUid: String(replacementUid),
    note,
  }
}

type ChannelHealthReviewBatchRiskNotePayload = {
  expectedCoordinationVersion: number
  riskCode: ChannelHealthReviewBatchRiskCode
  note: string
}

const normalizedRiskNoteRequest = (
  request: ChannelHealthReviewBatchRiskNoteCmd,
): ChannelHealthReviewBatchRiskNotePayload | null => {
  const expectedCoordinationVersion = normalizedCoordinationVersion(request?.expectedCoordinationVersion)
  const note = normalizedCoordinationNote(request?.note)
  if (expectedCoordinationVersion == null || !isRiskCode(request?.riskCode) || !note) return null
  return {
    expectedCoordinationVersion,
    riskCode: request.riskCode,
    note,
  }
}

type ChannelHealthReviewBatchWithdrawOpenTasksPayload = {
  expectedCoordinationVersion: number
  expectedOpenTaskCount: number
  expectedActiveTaskCount: number
  reasonCode: ChannelHealthReviewBatchWithdrawReasonCode
  note: string
}

const normalizedWithdrawOpenTasksRequest = (
  request: ChannelHealthReviewBatchWithdrawOpenTasksCmd,
): ChannelHealthReviewBatchWithdrawOpenTasksPayload | null => {
  const expectedCoordinationVersion = normalizedCoordinationVersion(request?.expectedCoordinationVersion)
  const expectedOpenTaskCount = safeNonNegativeInteger(request?.expectedOpenTaskCount)
  const expectedActiveTaskCount = safeNonNegativeInteger(request?.expectedActiveTaskCount)
  const note = normalizedCoordinationNote(request?.note)
  if (
    expectedCoordinationVersion == null
    || expectedOpenTaskCount == null
    || expectedOpenTaskCount < 1
    || expectedOpenTaskCount > MAX_BATCH_CANDIDATES
    || expectedActiveTaskCount == null
    || expectedActiveTaskCount < expectedOpenTaskCount
    || expectedActiveTaskCount > MAX_BATCH_CANDIDATES
    || !isWithdrawReasonCode(request?.reasonCode)
    || !note
  ) return null
  return {
    expectedCoordinationVersion,
    expectedOpenTaskCount,
    expectedActiveTaskCount,
    reasonCode: request.reasonCode,
    note,
  }
}

const invalidBatchResult = (): Result<null> => ({
  code: 200,
  message: 'channel_health_review_batch_request_invalid',
  data: null,
})

const invalidBatchPageResult = (): Result<ChannelHealthReviewBatchPage> => ({
  code: 200,
  message: 'channel_health_review_batch_query_invalid',
  data: unavailableChannelHealthReviewBatchPage(),
})

const invalidCoordinationResult = (): Result<ChannelHealthReviewBatchCoordination | null> => ({
  code: 200,
  message: 'channel_health_review_batch_coordination_request_invalid',
  data: unavailableChannelHealthReviewBatchCoordination(),
})

const invalidEventPageResult = (): Result<ChannelHealthReviewBatchEventPage | null> => ({
  code: 200,
  message: 'channel_health_review_batch_event_query_invalid',
  data: unavailableChannelHealthReviewBatchEventPage(),
})

export class ChannelHealthReviewBatchCoordinationContractError extends Error {
  constructor() {
    super('频道质量批次协调数据不符合远端契约')
    this.name = 'ChannelHealthReviewBatchCoordinationContractError'
  }
}

const adaptStrictCoordinationResult = (
  raw: Result<unknown>,
): Result<ChannelHealthReviewBatchCoordination> => {
  const result = withRemoteResultProvenance(raw)
  if (result.code !== 0 || result.source !== 'remote' || result.degraded || result.data == null) {
    throw new ChannelHealthReviewBatchCoordinationContractError()
  }
  const data = adaptChannelHealthReviewBatchCoordination(result.data)
  if (!data) throw new ChannelHealthReviewBatchCoordinationContractError()
  return {
    ...result,
    data,
  }
}

const adaptStrictEventPageResult = (
  raw: Result<unknown>,
  requestedSize: number,
): Result<ChannelHealthReviewBatchEventPage> => {
  const result = withRemoteResultProvenance(raw)
  if (result.code !== 0 || result.source !== 'remote' || result.degraded || result.data == null) {
    throw new ChannelHealthReviewBatchCoordinationContractError()
  }
  const data = adaptChannelHealthReviewBatchEventPage(result.data, requestedSize)
  if (!data) throw new ChannelHealthReviewBatchCoordinationContractError()
  return {
    ...result,
    data,
  }
}

const encodeId = (value: ApiId) => encodeURIComponent(String(value))

export const channelHealthReviewBatchesApi = {
  create: async (
    request: ChannelHealthReviewBatchCreateRequest,
    options: ChannelHealthReviewBatchRequestOptions = {},
  ): Promise<Result<ChannelHealthReviewBatchDetail | null>> => {
    const payload = normalizedCreateRequest(request)
    if (!payload) return invalidBatchResult()
    const response = await client.post(BASE_PATH, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return {
      ...response,
      data: adaptChannelHealthReviewBatchDetail(response.data),
    }
  },
  list: async (
    query: ChannelHealthReviewBatchListQuery,
    options: ChannelHealthReviewBatchRequestOptions = {},
  ): Promise<Result<ChannelHealthReviewBatchPage>> => {
    const params = normalizedListQuery(query)
    if (!params) return invalidBatchPageResult()
    const response = await client.get(BASE_PATH, {
      params,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return {
      ...response,
      data: adaptChannelHealthReviewBatchPage(response.data),
    }
  },
  detail: async (
    batchId: ApiId,
    options: ChannelHealthReviewBatchRequestOptions = {},
  ): Promise<Result<ChannelHealthReviewBatchDetail | null>> => {
    const id = safePositiveLongId(batchId)
    if (!id) return invalidBatchResult()
    const response = await client.get(`${BASE_PATH}/${encodeId(id)}`, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return {
      ...response,
      data: adaptChannelHealthReviewBatchDetail(response.data),
    }
  },
  coordination: async (
    batchId: ApiId,
    options: ChannelHealthReviewBatchRequestOptions = {},
  ): Promise<Result<ChannelHealthReviewBatchCoordination>> => {
    const id = safePositiveLongId(batchId)
    if (!id) return invalidCoordinationResult() as Result<ChannelHealthReviewBatchCoordination>
    const raw = await client.get(`${BASE_PATH}/${encodeId(id)}/coordination`, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return adaptStrictCoordinationResult(raw)
  },
  extendDeadline: async (
    batchId: ApiId,
    request: ChannelHealthReviewBatchExtendDeadlineCmd,
    options: ChannelHealthReviewBatchRequestOptions = {},
  ): Promise<Result<ChannelHealthReviewBatchCoordination>> => {
    const id = safePositiveLongId(batchId)
    const payload = normalizedExtendDeadlineRequest(request)
    if (!id || !payload) return invalidCoordinationResult() as Result<ChannelHealthReviewBatchCoordination>
    const raw = await client.post(`${BASE_PATH}/${encodeId(id)}/extend-deadline`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return adaptStrictCoordinationResult(raw)
  },
  reassignActiveTasks: async (
    batchId: ApiId,
    request: ChannelHealthReviewBatchReassignActiveTasksCmd,
    options: ChannelHealthReviewBatchRequestOptions = {},
  ): Promise<Result<ChannelHealthReviewBatchCoordination>> => {
    const id = safePositiveLongId(batchId)
    const payload = normalizedReassignActiveTasksRequest(request)
    if (!id || !payload) return invalidCoordinationResult() as Result<ChannelHealthReviewBatchCoordination>
    const raw = await client.post(`${BASE_PATH}/${encodeId(id)}/reassign-active-tasks`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return adaptStrictCoordinationResult(raw)
  },
  addRiskNote: async (
    batchId: ApiId,
    request: ChannelHealthReviewBatchRiskNoteCmd,
    options: ChannelHealthReviewBatchRequestOptions = {},
  ): Promise<Result<ChannelHealthReviewBatchCoordination>> => {
    const id = safePositiveLongId(batchId)
    const payload = normalizedRiskNoteRequest(request)
    if (!id || !payload) return invalidCoordinationResult() as Result<ChannelHealthReviewBatchCoordination>
    const raw = await client.post(`${BASE_PATH}/${encodeId(id)}/risk-notes`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return adaptStrictCoordinationResult(raw)
  },
  withdrawOpenTasks: async (
    batchId: ApiId,
    request: ChannelHealthReviewBatchWithdrawOpenTasksCmd,
    options: ChannelHealthReviewBatchRequestOptions = {},
  ): Promise<Result<ChannelHealthReviewBatchCoordination>> => {
    const id = safePositiveLongId(batchId)
    const payload = normalizedWithdrawOpenTasksRequest(request)
    if (!id || !payload) return invalidCoordinationResult() as Result<ChannelHealthReviewBatchCoordination>
    const raw = await client.post(`${BASE_PATH}/${encodeId(id)}/withdraw-open-tasks`, payload, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return adaptStrictCoordinationResult(raw)
  },
  events: async (
    batchId: ApiId,
    query: ChannelHealthReviewBatchEventListQuery = {},
    options: ChannelHealthReviewBatchRequestOptions = {},
  ): Promise<Result<ChannelHealthReviewBatchEventPage>> => {
    const id = safePositiveLongId(batchId)
    const params = normalizedEventListQuery(query)
    if (!id || !params) return invalidEventPageResult() as Result<ChannelHealthReviewBatchEventPage>
    const raw = await client.get(`${BASE_PATH}/${encodeId(id)}/events`, {
      params,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return adaptStrictEventPageResult(raw, Number(params.size))
  },
}
