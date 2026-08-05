import client, { type Result } from './client'
import type { ApiId } from './types'

const BASE_PATH = '/api/v1/community-health/quality-review-batches'
const MAX_SIGNED_LONG = 9_223_372_036_854_775_807n
const MAX_PAGE_SIZE = 20
const MAX_BATCH_CANDIDATES = 20
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

export type ChannelHealthReviewBatchPriority = (typeof PRIORITIES)[number]
export type ChannelHealthReviewBatchTaskStatus = (typeof TASK_STATUSES)[number]
export type ChannelHealthReviewBatchProgressState = (typeof PROGRESS_STATES)[number]
export type ChannelHealthReviewBatchDueState = (typeof DUE_STATES)[number]
export type ChannelHealthReviewBatchDueInDays = (typeof DUE_IN_DAYS_OPTIONS)[number]
export type ChannelHealthReviewBatchMaintenancePhase = (typeof MAINTENANCE_PHASES)[number]
export type ChannelHealthReviewBatchTerminalOutcomeCode = (typeof TERMINAL_OUTCOME_CODES)[number]

export type ChannelHealthReviewBatchStatusCounts = Record<ChannelHealthReviewBatchTaskStatus, number>

export interface ChannelHealthReviewBatchSummary {
  id: ApiId
  domain: number
  sourceType: typeof SOURCE_TYPE
  name: string
  priority: ChannelHealthReviewBatchPriority
  dueAt: string
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

export interface ChannelHealthReviewBatchListQuery {
  domain: number
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
  const dueAt = safeFutureOrHistoricalTimestamp(value?.dueAt)
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
    || !dueAt
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
}
