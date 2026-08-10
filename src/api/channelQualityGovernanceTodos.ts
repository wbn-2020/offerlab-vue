import client, { type Result, withRemoteResultProvenance } from './client'
import type { ApiId } from './types'

const BASE_PATH = '/api/v1/community-health/me/governance-todos'
const MAX_SIGNED_LONG = 9_223_372_036_854_775_807n
const MAX_PAGE_SIZE = 20

const TASK_TYPES = ['ACKNOWLEDGE_CASE', 'RECORD_PLAN', 'COMPLETE_RETROSPECTIVE'] as const
const STATUSES = ['OPEN', 'COMPLETED', 'CLOSED'] as const
const DUE_STATES = ['ON_TRACK', 'DUE_SOON', 'OVERDUE', 'NOT_APPLICABLE'] as const
const QUERY_DUE_STATES = ['ALL', 'ON_TRACK', 'DUE_SOON', 'OVERDUE'] as const
const SLA_OUTCOMES = [
  'ON_TIME',
  'OVERDUE_COMPLETED',
  'EXCLUDED_REASSIGNED',
  'EXCLUDED_SOURCE_TERMINATED',
  'EXCLUDED_RECONCILIATION',
] as const
const COMPLETION_REASONS = ['OWNER_ACKNOWLEDGED', 'PLAN_RECORDED', 'RETROSPECTIVE_COMPLETED'] as const
const CLOSE_REASONS = ['ASSIGNEE_CHANGED', 'SOURCE_TERMINATED', 'RECONCILIATION_OBSOLETE'] as const
const ESCALATION_LEVELS = ['NONE', 'CHANNEL_ATTENTION', 'GOVERNANCE_ATTENTION'] as const
const ACTIONABILITY_STATES = [
  'ACTIONABLE',
  'ASSIGNEE_INELIGIBLE',
  'SOURCE_STALE',
  'SOURCE_TERMINAL',
] as const
const DEPENDENCY_STATUSES = ['READY', 'READ_ONLY_STALE', 'DELIVERY_DEGRADED', 'BLOCKED'] as const

export type ChannelQualityGovernanceTodoTaskType = (typeof TASK_TYPES)[number]
export type ChannelQualityGovernanceTodoStatus = (typeof STATUSES)[number]
export type ChannelQualityGovernanceTodoDueState = (typeof DUE_STATES)[number]
export type ChannelQualityGovernanceTodoQueryDueState = (typeof QUERY_DUE_STATES)[number]
export type ChannelQualityGovernanceTodoSlaOutcome = (typeof SLA_OUTCOMES)[number]
export type ChannelQualityGovernanceTodoCompletionReason = (typeof COMPLETION_REASONS)[number]
export type ChannelQualityGovernanceTodoCloseReason = (typeof CLOSE_REASONS)[number]
export type ChannelQualityGovernanceTodoEscalationLevel = (typeof ESCALATION_LEVELS)[number]
export type ChannelQualityGovernanceTodoActionability = (typeof ACTIONABILITY_STATES)[number]
export type ChannelQualityGovernanceTodoDependencyStatus = (typeof DEPENDENCY_STATUSES)[number]

export interface ChannelQualityGovernanceTodo {
  todoId: ApiId
  caseId: ApiId
  retrospectiveId: ApiId | null
  domain: number
  taskType: ChannelQualityGovernanceTodoTaskType
  status: ChannelQualityGovernanceTodoStatus
  anchorAt: string
  dueAt: string
  dueState: ChannelQualityGovernanceTodoDueState
  isOverdue: boolean
  slaOutcome: ChannelQualityGovernanceTodoSlaOutcome | null
  completionReason: ChannelQualityGovernanceTodoCompletionReason | null
  closeReason: ChannelQualityGovernanceTodoCloseReason | null
  escalationLevel: ChannelQualityGovernanceTodoEscalationLevel
  actionability: ChannelQualityGovernanceTodoActionability
  canOpenSource: boolean
  actionPath: string | null
  todoVersion: number
}

export interface ChannelQualityGovernanceTodoPage {
  dependencyStatus: ChannelQualityGovernanceTodoDependencyStatus
  evaluationTime: string
  freshThrough: string
  nextCursor: string | null
  items: ChannelQualityGovernanceTodo[]
}

export interface ChannelQualityGovernanceTodoListQuery {
  status?: ChannelQualityGovernanceTodoStatus
  taskType?: ChannelQualityGovernanceTodoTaskType
  dueState?: ChannelQualityGovernanceTodoQueryDueState
  cursor?: string
  size?: number
}

export interface ChannelQualityGovernanceTodoRequestOptions {
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

const safeOpaqueCursor = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const cursor = value.trim()
  return cursor.length >= 1 && cursor.length <= 512 && !/[\u0000-\u001f\u007f]/.test(cursor)
    ? cursor
    : null
}

const safeInternalActionPath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const path = value.trim()
  return path.startsWith('/') && !path.startsWith('//') && path.length <= 512 && !/[\u0000-\u001f\u007f]/.test(path)
    ? path
    : null
}

const isTaskType = (value: unknown): value is ChannelQualityGovernanceTodoTaskType => (
  typeof value === 'string' && (TASK_TYPES as readonly string[]).includes(value)
)

const isStatus = (value: unknown): value is ChannelQualityGovernanceTodoStatus => (
  typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
)

const isDueState = (value: unknown): value is ChannelQualityGovernanceTodoDueState => (
  typeof value === 'string' && (DUE_STATES as readonly string[]).includes(value)
)

const isQueryDueState = (value: unknown): value is ChannelQualityGovernanceTodoQueryDueState => (
  typeof value === 'string' && (QUERY_DUE_STATES as readonly string[]).includes(value)
)

const isSlaOutcome = (value: unknown): value is ChannelQualityGovernanceTodoSlaOutcome => (
  typeof value === 'string' && (SLA_OUTCOMES as readonly string[]).includes(value)
)

const isCompletionReason = (value: unknown): value is ChannelQualityGovernanceTodoCompletionReason => (
  typeof value === 'string' && (COMPLETION_REASONS as readonly string[]).includes(value)
)

const isCloseReason = (value: unknown): value is ChannelQualityGovernanceTodoCloseReason => (
  typeof value === 'string' && (CLOSE_REASONS as readonly string[]).includes(value)
)

const isEscalationLevel = (value: unknown): value is ChannelQualityGovernanceTodoEscalationLevel => (
  typeof value === 'string' && (ESCALATION_LEVELS as readonly string[]).includes(value)
)

const isActionability = (value: unknown): value is ChannelQualityGovernanceTodoActionability => (
  typeof value === 'string' && (ACTIONABILITY_STATES as readonly string[]).includes(value)
)

const isDependencyStatus = (value: unknown): value is ChannelQualityGovernanceTodoDependencyStatus => (
  typeof value === 'string' && (DEPENDENCY_STATUSES as readonly string[]).includes(value)
)

const safeBoolean = (value: unknown): boolean | null => (
  typeof value === 'boolean' ? value : null
)

const adaptTodo = (raw: unknown): ChannelQualityGovernanceTodo | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'todoId',
    'caseId',
    'retrospectiveId',
    'domain',
    'taskType',
    'status',
    'anchorAt',
    'dueAt',
    'dueState',
    'isOverdue',
    'slaOutcome',
    'completionReason',
    'closeReason',
    'escalationLevel',
    'actionability',
    'canOpenSource',
    'actionPath',
    'todoVersion',
  ])) return null

  const todoId = safePositiveLongId(value.todoId)
  const caseId = safePositiveLongId(value.caseId)
  const retrospectiveId = safeOptionalPositiveLongId(value.retrospectiveId)
  const domain = safeDomain(value.domain)
  const taskType = value.taskType
  const status = value.status
  const anchorAt = safeTimestamp(value.anchorAt)
  const dueAt = safeTimestamp(value.dueAt)
  const dueState = value.dueState
  const isOverdue = safeBoolean(value.isOverdue)
  const rawSlaOutcome = value.slaOutcome
  const slaOutcome = rawSlaOutcome == null ? null : (
    isSlaOutcome(rawSlaOutcome) ? rawSlaOutcome : undefined
  )
  const rawCompletionReason = value.completionReason
  const completionReason = rawCompletionReason == null ? null : (
    isCompletionReason(rawCompletionReason) ? rawCompletionReason : undefined
  )
  const rawCloseReason = value.closeReason
  const closeReason = rawCloseReason == null ? null : (
    isCloseReason(rawCloseReason) ? rawCloseReason : undefined
  )
  const escalationLevel = value.escalationLevel
  const actionability = value.actionability
  const canOpenSource = safeBoolean(value.canOpenSource)
  const rawActionPath = value.actionPath
  const actionPath = rawActionPath == null ? null : safeInternalActionPath(rawActionPath)
  const todoVersion = safeNonNegativeInteger(value.todoVersion)
  const expectedSlaOutcome = closeReason == null ? null : ({
    ASSIGNEE_CHANGED: 'EXCLUDED_REASSIGNED',
    SOURCE_TERMINATED: 'EXCLUDED_SOURCE_TERMINATED',
    RECONCILIATION_OBSOLETE: 'EXCLUDED_RECONCILIATION',
  } as const)[closeReason]

  if (
    !todoId
    || !caseId
    || retrospectiveId === undefined
    || domain == null
    || !isTaskType(taskType)
    || !isStatus(status)
    || !anchorAt
    || !dueAt
    || !isDueState(dueState)
    || isOverdue == null
    || slaOutcome === undefined
    || completionReason === undefined
    || closeReason === undefined
    || !isEscalationLevel(escalationLevel)
    || !isActionability(actionability)
    || canOpenSource == null
    || actionPath === undefined
    || todoVersion == null
    || Date.parse(dueAt) <= Date.parse(anchorAt)
    || (taskType === 'COMPLETE_RETROSPECTIVE' && retrospectiveId == null)
    || (taskType !== 'COMPLETE_RETROSPECTIVE' && retrospectiveId != null)
    || (canOpenSource && actionPath == null)
    || (!canOpenSource && actionPath != null)
    || (status === 'OPEN' && (
      dueState === 'NOT_APPLICABLE'
      || slaOutcome != null
      || completionReason != null
      || closeReason != null
      || isOverdue !== (dueState === 'OVERDUE')
    ))
    || (status === 'COMPLETED' && (
      !completionReason
      || closeReason != null
      || (slaOutcome !== 'ON_TIME' && slaOutcome !== 'OVERDUE_COMPLETED')
      || isOverdue
    ))
    || (status === 'CLOSED' && (
      completionReason != null
      || !closeReason
      || slaOutcome !== expectedSlaOutcome
      || isOverdue
    ))
  ) return null

  return {
    todoId,
    caseId,
    retrospectiveId,
    domain,
    taskType,
    status,
    anchorAt,
    dueAt,
    dueState,
    isOverdue,
    slaOutcome,
    completionReason,
    closeReason,
    escalationLevel,
    actionability,
    canOpenSource,
    actionPath,
    todoVersion,
  }
}

export const adaptChannelQualityGovernanceTodoPage = (
  raw: unknown,
  requestedSize = MAX_PAGE_SIZE,
): ChannelQualityGovernanceTodoPage | null => {
  const value = asRecord(raw)
  if (
    !value
    || !onlyKeys(value, ['dependencyStatus', 'evaluationTime', 'freshThrough', 'nextCursor', 'items'])
    || !Number.isInteger(requestedSize)
    || requestedSize < 1
    || requestedSize > MAX_PAGE_SIZE
    || !Array.isArray(value.items)
    || value.items.length > requestedSize
  ) return null

  const dependencyStatus = value.dependencyStatus
  const evaluationTime = safeTimestamp(value.evaluationTime)
  const freshThrough = safeTimestamp(value.freshThrough)
  const nextCursor = value.nextCursor == null ? null : safeOpaqueCursor(value.nextCursor)
  const items = value.items.map(adaptTodo)
  if (
    !isDependencyStatus(dependencyStatus)
    || !evaluationTime
    || !freshThrough
    || Date.parse(freshThrough) > Date.parse(evaluationTime)
    || (value.nextCursor != null && !nextCursor)
    || items.some((item) => item == null)
  ) return null

  const seenTodoIds = new Set<string>()
  for (const item of items as ChannelQualityGovernanceTodo[]) {
    const todoId = String(item.todoId)
    if (seenTodoIds.has(todoId)) return null
    seenTodoIds.add(todoId)
  }
  return {
    dependencyStatus,
    evaluationTime,
    freshThrough,
    nextCursor,
    items: items as ChannelQualityGovernanceTodo[],
  }
}

const normalizeQuery = (
  query: ChannelQualityGovernanceTodoListQuery,
): Required<Pick<ChannelQualityGovernanceTodoListQuery, 'size'>> & Omit<ChannelQualityGovernanceTodoListQuery, 'size'> | null => {
  const status = query.status == null ? undefined : (isStatus(query.status) ? query.status : null)
  const taskType = query.taskType == null ? undefined : (isTaskType(query.taskType) ? query.taskType : null)
  const dueState = query.dueState == null ? undefined : (isQueryDueState(query.dueState) ? query.dueState : null)
  const cursor = query.cursor == null ? undefined : safeOpaqueCursor(query.cursor)
  const size = query.size == null ? MAX_PAGE_SIZE : safeNonNegativeInteger(query.size)
  if (
    status === null
    || taskType === null
    || dueState === null
    || cursor === null
    || size == null
    || size < 1
    || size > MAX_PAGE_SIZE
  ) return null
  return { status, taskType, dueState, cursor, size }
}

export class ChannelQualityGovernanceTodoContractError extends Error {
  constructor() {
    super('频道治理待办数据不符合远端契约')
    this.name = 'ChannelQualityGovernanceTodoContractError'
  }
}

const requireStrictRemoteResult = <T>(
  raw: Result<unknown>,
  adapt: (data: unknown) => T | null,
): Result<T> => {
  const result = withRemoteResultProvenance(raw)
  if (result.code !== 0 || result.source !== 'remote' || result.degraded || result.data == null) {
    throw new ChannelQualityGovernanceTodoContractError()
  }
  const data = adapt(result.data)
  if (!data) throw new ChannelQualityGovernanceTodoContractError()
  return { ...result, data }
}

const requireReadableRemoteResult = (
  raw: Result<unknown>,
): Result<unknown> => {
  const result = withRemoteResultProvenance(raw)
  if (result.code !== 0 || result.source !== 'remote' || result.data == null) {
    throw new ChannelQualityGovernanceTodoContractError()
  }
  return result
}

export const channelQualityGovernanceTodosApi = {
  mine: async (
    query: ChannelQualityGovernanceTodoListQuery = {},
    options: ChannelQualityGovernanceTodoRequestOptions = {},
  ): Promise<Result<ChannelQualityGovernanceTodoPage>> => {
    const params = normalizeQuery(query)
    if (!params) throw new ChannelQualityGovernanceTodoContractError()
    const raw = await client.get(BASE_PATH, {
      params,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, (data) => (
      adaptChannelQualityGovernanceTodoPage(data, params.size)
    ))
  },
  mineForDisplay: async (
    query: ChannelQualityGovernanceTodoListQuery = {},
    options: ChannelQualityGovernanceTodoRequestOptions = {},
  ): Promise<Result<unknown>> => {
    const params = normalizeQuery(query)
    if (!params) throw new ChannelQualityGovernanceTodoContractError()
    const raw = await client.get(BASE_PATH, {
      params,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireReadableRemoteResult(raw)
  },
}
