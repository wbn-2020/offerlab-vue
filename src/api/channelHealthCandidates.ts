import client, { type Result } from './client'
import type { ApiId } from './types'
import type { MaintenanceSourceType } from './contentMaintenance'

const BASE_PATH = '/api/v1/community-health/quality-review-candidates'
const MAX_SIGNED_LONG = 9_223_372_036_854_775_807n
const MAX_PAGE_SIZE = 20

const CANDIDATE_SOURCE_TYPE = 'CHANNEL_HEALTH' as const
const CANDIDATE_REASON_CODE = 'REVISION_QUALITY_SIGNAL_READY' as const
const CANDIDATE_PRIORITY = 'MEDIUM' as const
const CANDIDATE_LIFECYCLE_STATES = [
  'READY',
  'TASK_EXISTS',
  'REVISION_STALE',
  'DISMISSED',
  'SNOOZED',
] as const
const MAINTENANCE_STATUSES = ['OPEN', 'CLAIMED', 'SUBMITTED', 'COMPLETED', 'CLOSED'] as const
const MAINTENANCE_PHASES = [
  'OPEN',
  'IN_PROGRESS',
  'REWORK',
  'REVIEW_PENDING',
  'VERIFIED_DELIVERY',
  'CLOSED',
] as const
const TERMINAL_OUTCOME_CODES = ['VERIFIED_DELIVERY'] as const
const DISPOSITION_REASON_CODES = [
  'NOT_ACTIONABLE',
  'OUT_OF_SCOPE',
  'DUPLICATE',
  'WAIT_FOR_AUTHOR',
] as const
const DISPOSITION_ACTIONS = ['DISMISS', 'SNOOZE', 'RESTORE'] as const
const DISPOSITION_STATES = ['DISMISSED', 'SNOOZED', 'CLEARED'] as const
const MAX_SNOOZE_DAYS = 30

export type ChannelHealthCandidateLifecycleState = (typeof CANDIDATE_LIFECYCLE_STATES)[number]
export type ChannelHealthCandidateMaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number]
export type ChannelHealthCandidateMaintenancePhase = (typeof MAINTENANCE_PHASES)[number]
export type ChannelHealthCandidateTerminalOutcomeCode = (typeof TERMINAL_OUTCOME_CODES)[number]
export type ChannelHealthCandidateDispositionReasonCode = (typeof DISPOSITION_REASON_CODES)[number]
export type ChannelHealthCandidateDispositionAction = (typeof DISPOSITION_ACTIONS)[number]
export type ChannelHealthCandidateDispositionState = (typeof DISPOSITION_STATES)[number]

export interface ChannelHealthReviewCandidate {
  domain: number
  sourceType: Extract<MaintenanceSourceType, typeof CANDIDATE_SOURCE_TYPE>
  sourcePostId: ApiId
  sourceRefId: ApiId | null
  sourcePostType: number
  title: string
  detail: string
  postHref: string
  reasonCode: typeof CANDIDATE_REASON_CODE
  priority: typeof CANDIDATE_PRIORITY
  lifecycleState: ChannelHealthCandidateLifecycleState
  maintenanceStatus: ChannelHealthCandidateMaintenanceStatus | null
  maintenancePhase: ChannelHealthCandidateMaintenancePhase | null
  terminalOutcome: ChannelHealthCandidateTerminalOutcomeCode | null
  dispositionReasonCode: ChannelHealthCandidateDispositionReasonCode | null
  snoozedUntil: string | null
  actionable: boolean
}

export interface ChannelHealthReviewCandidatePage {
  available: boolean
  nextCursor: string | null
  suppressedCount: number
  items: ChannelHealthReviewCandidate[]
}

export interface ChannelHealthReviewCandidateQuery {
  domain: number
  cursor?: string
  size?: number
}

export interface ChannelHealthCandidateRequestOptions {
  signal?: AbortSignal
  skipAuthRedirect?: boolean
}

export interface ChannelHealthCandidateDisposition {
  sourcePostId: ApiId
  sourceRefId: ApiId
  state: ChannelHealthCandidateDispositionState
  reasonCode: ChannelHealthCandidateDispositionReasonCode | null
  snoozedUntil: string | null
}

export interface ChannelHealthCandidateDispositionTarget {
  domain: number
  sourcePostId: ApiId
  sourceRefId: ApiId
}

export interface ChannelHealthCandidateDismissRequest extends ChannelHealthCandidateDispositionTarget {
  reasonCode: ChannelHealthCandidateDispositionReasonCode
}

export interface ChannelHealthCandidateSnoozeRequest extends ChannelHealthCandidateDispositionTarget {
  reasonCode: ChannelHealthCandidateDispositionReasonCode
  snoozeDays: number
}

export type ChannelHealthCandidateRestoreRequest = ChannelHealthCandidateDispositionTarget

export type ChannelHealthCandidateDispositionRequest =
  | (ChannelHealthCandidateDismissRequest & { action: 'DISMISS'; snoozeDays?: null })
  | (ChannelHealthCandidateSnoozeRequest & { action: 'SNOOZE' })
  | (ChannelHealthCandidateRestoreRequest & { action: 'RESTORE' })

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

type SafeCandidateCursor = {
  value: string
  afterPostId: bigint
  snapshotUpperBoundPostId: bigint
}

const safeCandidateCursor = (value: unknown): SafeCandidateCursor | null => {
  if (typeof value !== 'string') return null
  const cursor = value.trim()
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(cursor)) return null
  try {
    const base64 = cursor.replace(/-/g, '+').replace(/_/g, '/')
    const padding = '='.repeat((4 - (base64.length % 4)) % 4)
    const decoded = atob(`${base64}${padding}`)
    const match = /^chqc1\|([1-9]\d*)\|([1-9]\d*)$/.exec(decoded)
    if (!match) return null
    const afterPostId = BigInt(match[1])
    const snapshotUpperBoundPostId = BigInt(match[2])
    if (
      afterPostId > MAX_SIGNED_LONG
      || snapshotUpperBoundPostId > MAX_SIGNED_LONG
      || snapshotUpperBoundPostId <= afterPostId
    ) return null
    return {
      value: cursor,
      afterPostId,
      snapshotUpperBoundPostId,
    }
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

const safePositiveInteger = (value: unknown): number | null => {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

const safeNonNegativeInteger = (value: unknown): number | null => {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

const isLifecycleState = (value: unknown): value is ChannelHealthCandidateLifecycleState => (
  typeof value === 'string'
  && (CANDIDATE_LIFECYCLE_STATES as readonly string[]).includes(value)
)

const isMaintenanceStatus = (value: unknown): value is ChannelHealthCandidateMaintenanceStatus => (
  typeof value === 'string'
  && (MAINTENANCE_STATUSES as readonly string[]).includes(value)
)

const isMaintenancePhase = (value: unknown): value is ChannelHealthCandidateMaintenancePhase => (
  typeof value === 'string'
  && (MAINTENANCE_PHASES as readonly string[]).includes(value)
)

const isTerminalOutcomeCode = (
  value: unknown,
): value is ChannelHealthCandidateTerminalOutcomeCode => (
  typeof value === 'string'
  && (TERMINAL_OUTCOME_CODES as readonly string[]).includes(value)
)

export const isChannelHealthCandidateDispositionReasonCode = (
  value: unknown,
): value is ChannelHealthCandidateDispositionReasonCode => (
  typeof value === 'string'
  && (DISPOSITION_REASON_CODES as readonly string[]).includes(value)
)

const isDispositionAction = (value: unknown): value is ChannelHealthCandidateDispositionAction => (
  typeof value === 'string'
  && (DISPOSITION_ACTIONS as readonly string[]).includes(value)
)

const isDispositionState = (value: unknown): value is ChannelHealthCandidateDispositionState => (
  typeof value === 'string'
  && (DISPOSITION_STATES as readonly string[]).includes(value)
)

const safeFutureUtcTimestamp = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const timestamp = value.trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?Z$/.exec(timestamp)
  if (!match) return null
  const parseableFraction = (match[7] || '').slice(0, 3).padEnd(3, '0')
  const parseableTimestamp = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.${parseableFraction}Z`
  const parsed = Date.parse(parseableTimestamp)
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 19) !== timestamp.slice(0, 19)) {
    return null
  }
  return parsed > Date.now() ? timestamp : null
}

export const isSafeChannelHealthCandidateSnoozedUntil = (
  value: unknown,
): value is string => safeFutureUtcTimestamp(value) != null

export const isSafeChannelHealthCandidatePostHref = (value: unknown): value is string => (
  typeof value === 'string' && /^\/post\/[1-9]\d*$/.test(value.trim())
)

export const unavailableChannelHealthReviewCandidatePage = (): ChannelHealthReviewCandidatePage => ({
  available: false,
  nextCursor: null,
  suppressedCount: 0,
  items: [],
})

const adaptCandidate = (raw: unknown): ChannelHealthReviewCandidate | null => {
  const value = asRecord(raw)
  const domain = safeDomain(value?.domain)
  const sourcePostId = safePositiveLongId(value?.sourcePostId)
  const sourceRefId = value?.sourceRefId == null ? null : safePositiveLongId(value.sourceRefId)
  const sourcePostType = safePositiveInteger(value?.sourcePostType)
  const title = safeText(value?.title, 2, 160)
  const detail = safeText(value?.detail, 5, 2000)
  const postHref = value?.postHref
  const lifecycleState = value?.lifecycleState
  const rawMaintenanceStatus = value?.maintenanceStatus
  const maintenanceStatus = rawMaintenanceStatus == null ? null : (
    isMaintenanceStatus(rawMaintenanceStatus) ? rawMaintenanceStatus : null
  )
  const hasMaintenanceProjection = Boolean(
    value
    && (
      Object.prototype.hasOwnProperty.call(value, 'maintenancePhase')
      || Object.prototype.hasOwnProperty.call(value, 'terminalOutcome')
    )
  )
  const rawMaintenancePhase = value?.maintenancePhase
  const maintenancePhase = rawMaintenancePhase == null ? null : (
    isMaintenancePhase(rawMaintenancePhase) ? rawMaintenancePhase : null
  )
  const rawTerminalOutcome = value?.terminalOutcome
  const terminalOutcome = rawTerminalOutcome == null ? null : (
    isTerminalOutcomeCode(rawTerminalOutcome) ? rawTerminalOutcome : null
  )
  const rawDispositionReasonCode = value?.dispositionReasonCode
  const dispositionReasonCode = rawDispositionReasonCode == null ? null : (
    isChannelHealthCandidateDispositionReasonCode(rawDispositionReasonCode)
      ? rawDispositionReasonCode
      : null
  )
  const rawSnoozedUntil = value?.snoozedUntil
  const snoozedUntil = rawSnoozedUntil == null ? null : safeFutureUtcTimestamp(rawSnoozedUntil)
  const hasSourceRefId = value?.sourceRefId != null
  if (
    !value
    || domain == null
    || value.sourceType !== CANDIDATE_SOURCE_TYPE
    || !sourcePostId
    || (hasSourceRefId && !sourceRefId)
    || !sourcePostType
    || !title
    || !detail
    || !isSafeChannelHealthCandidatePostHref(postHref)
    || postHref.trim() !== `/post/${sourcePostId}`
    || value.reasonCode !== CANDIDATE_REASON_CODE
    || value.priority !== CANDIDATE_PRIORITY
    || !isLifecycleState(lifecycleState)
    || (rawMaintenanceStatus != null && maintenanceStatus == null)
    || (
      hasMaintenanceProjection
      && (
        !Object.prototype.hasOwnProperty.call(value, 'maintenancePhase')
        || !Object.prototype.hasOwnProperty.call(value, 'terminalOutcome')
        || (rawMaintenancePhase != null && maintenancePhase == null)
        || (rawTerminalOutcome != null && terminalOutcome == null)
      )
    )
    || (rawDispositionReasonCode != null && dispositionReasonCode == null)
    || (rawSnoozedUntil != null && snoozedUntil == null)
    || typeof value.actionable !== 'boolean'
    || (
      lifecycleState === 'READY'
      && (
        !sourceRefId
        || maintenanceStatus != null
        || maintenancePhase != null
        || terminalOutcome != null
        || dispositionReasonCode != null
        || snoozedUntil != null
        || value.actionable !== true
      )
    )
    || (
      lifecycleState === 'TASK_EXISTS'
      && (
        !sourceRefId
        || !maintenanceStatus
        || (
          hasMaintenanceProjection
          && (
            maintenancePhase == null
            || (
              maintenanceStatus === 'OPEN'
              && maintenancePhase !== 'OPEN'
            )
            || (
              maintenanceStatus === 'CLAIMED'
              && maintenancePhase !== 'IN_PROGRESS'
              && maintenancePhase !== 'REWORK'
            )
            || (
              maintenanceStatus === 'SUBMITTED'
              && maintenancePhase !== 'REVIEW_PENDING'
            )
            || (
              maintenanceStatus === 'COMPLETED'
              && (
                maintenancePhase !== 'VERIFIED_DELIVERY'
                || terminalOutcome !== 'VERIFIED_DELIVERY'
              )
            )
            || (
              maintenanceStatus === 'CLOSED'
              && (
                maintenancePhase !== 'CLOSED'
                || terminalOutcome != null
              )
            )
            || (
              maintenanceStatus !== 'COMPLETED'
              && maintenanceStatus !== 'CLOSED'
              && terminalOutcome != null
            )
          )
        )
        || dispositionReasonCode != null
        || snoozedUntil != null
        || value.actionable !== false
      )
    )
    || (
      lifecycleState === 'REVISION_STALE'
      && (
        sourceRefId != null
        || maintenanceStatus != null
        || maintenancePhase != null
        || terminalOutcome != null
        || dispositionReasonCode != null
        || snoozedUntil != null
        || value.actionable !== false
      )
    )
    || (
      lifecycleState === 'DISMISSED'
      && (
        !sourceRefId
        || maintenanceStatus != null
        || maintenancePhase != null
        || terminalOutcome != null
        || !dispositionReasonCode
        || snoozedUntil != null
        || value.actionable !== false
      )
    )
    || (
      lifecycleState === 'SNOOZED'
      && (
        !sourceRefId
        || maintenanceStatus != null
        || maintenancePhase != null
        || terminalOutcome != null
        || !dispositionReasonCode
        || snoozedUntil == null
        || value.actionable !== false
      )
    )
  ) return null
  return {
    domain,
    sourceType: CANDIDATE_SOURCE_TYPE,
    sourcePostId,
    sourceRefId,
    sourcePostType,
    title,
    detail,
    postHref: postHref.trim(),
    reasonCode: CANDIDATE_REASON_CODE,
    priority: CANDIDATE_PRIORITY,
    lifecycleState,
    maintenanceStatus,
    maintenancePhase,
    terminalOutcome,
    dispositionReasonCode,
    snoozedUntil,
    actionable: value.actionable,
  }
}

export const adaptChannelHealthReviewCandidatePage = (
  raw: unknown,
): ChannelHealthReviewCandidatePage => {
  try {
    const value = asRecord(raw)
    if (!value || typeof value.available !== 'boolean') {
      return unavailableChannelHealthReviewCandidatePage()
    }
    if (value.available !== true) {
      if ((Array.isArray(value.items) && value.items.length > 0) || value.nextCursor != null) {
        return unavailableChannelHealthReviewCandidatePage()
      }
      return unavailableChannelHealthReviewCandidatePage()
    }
    if (!Array.isArray(value.items) || value.items.length > MAX_PAGE_SIZE) {
      return unavailableChannelHealthReviewCandidatePage()
    }
    const suppressedCount = safeNonNegativeInteger(value.suppressedCount)
    if (suppressedCount == null || suppressedCount > 100) {
      return unavailableChannelHealthReviewCandidatePage()
    }
    const items = value.items.map(adaptCandidate)
    const parsedNextCursor = value.nextCursor == null ? null : safeCandidateCursor(value.nextCursor)
    const nextCursor = parsedNextCursor?.value ?? null
    if (items.some((item) => item == null) || (value.nextCursor != null && !parsedNextCursor)) {
      return unavailableChannelHealthReviewCandidatePage()
    }
    const seenPostIds = new Set<string>()
    let previousId = 0n
    for (const item of items) {
      const postId = item!.sourcePostId
      const numericPostId = BigInt(String(postId))
      if (numericPostId <= previousId || seenPostIds.has(String(postId))) {
        return unavailableChannelHealthReviewCandidatePage()
      }
      seenPostIds.add(String(postId))
      previousId = numericPostId
    }
    if (parsedNextCursor != null && items.length > 0 && parsedNextCursor.afterPostId < previousId) {
      return unavailableChannelHealthReviewCandidatePage()
    }
    return {
      available: true,
      nextCursor,
      suppressedCount,
      items: items as ChannelHealthReviewCandidate[],
    }
  } catch {
    return unavailableChannelHealthReviewCandidatePage()
  }
}

const adaptChannelHealthCandidateDisposition = (
  raw: unknown,
): ChannelHealthCandidateDisposition | null => {
  const value = asRecord(raw)
  const sourcePostId = safePositiveLongId(value?.sourcePostId)
  const sourceRefId = safePositiveLongId(value?.sourceRefId)
  const state = value?.state
  const rawReasonCode = value?.reasonCode
  const reasonCode = rawReasonCode == null ? null : (
    isChannelHealthCandidateDispositionReasonCode(rawReasonCode) ? rawReasonCode : null
  )
  const rawSnoozedUntil = value?.snoozedUntil
  const snoozedUntil = rawSnoozedUntil == null ? null : safeFutureUtcTimestamp(rawSnoozedUntil)
  if (
    !value
    || !sourcePostId
    || !sourceRefId
    || !isDispositionState(state)
    || (rawReasonCode != null && reasonCode == null)
    || (rawSnoozedUntil != null && snoozedUntil == null)
    || (
      state === 'DISMISSED'
      && (!reasonCode || snoozedUntil != null)
    )
    || (
      state === 'SNOOZED'
      && (!reasonCode || snoozedUntil == null)
    )
    || (
      state === 'CLEARED'
      && (reasonCode != null || snoozedUntil != null)
    )
  ) return null
  return {
    sourcePostId,
    sourceRefId,
    state,
    reasonCode,
    snoozedUntil,
  }
}

const normalizedQuery = (
  query: ChannelHealthReviewCandidateQuery,
): Record<string, string | number> | null => {
  const domain = safeDomain(query?.domain)
  const cursor = query?.cursor == null ? null : safeCandidateCursor(query.cursor)
  const requestedSize = query?.size == null ? 10 : query.size
  const size = Number.isInteger(requestedSize) && requestedSize >= 1 && requestedSize <= MAX_PAGE_SIZE
    ? requestedSize
    : null
  if (domain == null || (query?.cursor != null && !cursor) || size == null) return null
  return {
    domain,
    size,
    ...(cursor ? { cursor: cursor.value } : {}),
  }
}

type ChannelHealthCandidateDispositionPayload = {
  domain: number
  sourcePostId: string
  sourceRefId: string
  action: ChannelHealthCandidateDispositionAction
  reasonCode?: ChannelHealthCandidateDispositionReasonCode
  snoozeDays?: number | null
}

const normalizedDispositionRequest = (
  request: ChannelHealthCandidateDispositionRequest,
): ChannelHealthCandidateDispositionPayload | null => {
  const domain = safeDomain(request?.domain)
  const sourcePostId = safePositiveLongId(request?.sourcePostId)
  const sourceRefId = safePositiveLongId(request?.sourceRefId)
  if (domain == null || !sourcePostId || !sourceRefId || !isDispositionAction(request?.action)) {
    return null
  }
  if (request.action === 'RESTORE') {
    return {
      domain,
      sourcePostId: String(sourcePostId),
      sourceRefId: String(sourceRefId),
      action: 'RESTORE',
    }
  }
  if (!isChannelHealthCandidateDispositionReasonCode(request.reasonCode)) return null
  if (request.action === 'DISMISS') {
    if (request.snoozeDays != null) return null
    return {
      domain,
      sourcePostId: String(sourcePostId),
      sourceRefId: String(sourceRefId),
      action: 'DISMISS',
      reasonCode: request.reasonCode,
      snoozeDays: null,
    }
  }
  if (!Number.isSafeInteger(request.snoozeDays)
    || request.snoozeDays < 1
    || request.snoozeDays > MAX_SNOOZE_DAYS) {
    return null
  }
  return {
    domain,
    sourcePostId: String(sourcePostId),
    sourceRefId: String(sourceRefId),
    action: 'SNOOZE',
    reasonCode: request.reasonCode,
    snoozeDays: request.snoozeDays,
  }
}

const invalidDispositionResult = (): Result<ChannelHealthCandidateDisposition | null> => ({
  code: 200,
  message: 'candidate_disposition_invalid',
  data: null,
})

const postDisposition = async (
  request: ChannelHealthCandidateDispositionRequest,
  options: ChannelHealthCandidateRequestOptions = {},
): Promise<Result<ChannelHealthCandidateDisposition | null>> => {
  const payload = normalizedDispositionRequest(request)
  if (!payload) return invalidDispositionResult()
  const response = await client.post(`${BASE_PATH}/disposition`, payload, {
    signal: options.signal,
    skipAuthRedirect: options.skipAuthRedirect,
  }) as Result<unknown>
  return {
    ...response,
    data: adaptChannelHealthCandidateDisposition(response.data),
  }
}

export const channelHealthCandidatesApi = {
  list: async (
    query: ChannelHealthReviewCandidateQuery,
    options: ChannelHealthCandidateRequestOptions = {},
  ): Promise<Result<ChannelHealthReviewCandidatePage>> => {
    const params = normalizedQuery(query)
    if (!params) {
      return {
        code: 200,
        message: 'candidate_query_invalid',
        data: unavailableChannelHealthReviewCandidatePage(),
      } as Result<ChannelHealthReviewCandidatePage>
    }
    const response = await client.get(BASE_PATH, {
      params,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return {
      ...response,
      data: adaptChannelHealthReviewCandidatePage(response.data),
    }
  },
  dispose: postDisposition,
  dismiss: (
    request: ChannelHealthCandidateDismissRequest,
    options: ChannelHealthCandidateRequestOptions = {},
  ) => postDisposition({ ...request, action: 'DISMISS' }, options),
  snooze: (
    request: ChannelHealthCandidateSnoozeRequest,
    options: ChannelHealthCandidateRequestOptions = {},
  ) => postDisposition({ ...request, action: 'SNOOZE' }, options),
  restore: (
    request: ChannelHealthCandidateRestoreRequest,
    options: ChannelHealthCandidateRequestOptions = {},
  ) => postDisposition({ ...request, action: 'RESTORE' }, options),
}
