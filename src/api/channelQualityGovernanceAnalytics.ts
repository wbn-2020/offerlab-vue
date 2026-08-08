import client, { type Result, withRemoteResultProvenance } from './client'

const BASE_PATH = '/api/v1/community-health/quality-governance-analytics'
const AVAILABILITIES = ['AVAILABLE', 'UNAVAILABLE', 'SUPPRESSED', 'NO_ELIGIBLE_SAMPLE'] as const
const PROJECTION_STATUSES = ['READY', 'DEGRADED', 'STALE', 'REBUILDING', 'FAILED', 'UNAVAILABLE'] as const
const SOURCE_TYPES = [
  'V38_BATCH',
  'V38_ATTEMPT',
  'V39_EVENT',
  'V40_CASE_EVENT',
  'V41_CLOSE_SNAPSHOT',
  'V41_RECURRENCE',
  'V42_TODO',
  'V42_REMINDER',
] as const
const SOURCE_STATUSES = ['READY', 'DEGRADED', 'STALE', 'UNAVAILABLE'] as const
const FUNNEL_STAGES = [
  'OPENED',
  'ACKNOWLEDGED',
  'PLANNED',
  'RESOLUTION_SUBMITTED',
  'GOVERNANCE_CLOSED',
  'RECOVERY_VERIFIED',
] as const
const DURATION_STAGES = [
  'END_TO_END',
  'ACKNOWLEDGEMENT',
  'PLANNING',
  'RESOLUTION_SUBMISSION',
  'GOVERNANCE_REVIEW',
] as const
const RATE_KEYS = [
  'governanceOverdueRate',
  'reminderCoverageRate',
  'postReminderCompletionRate',
  'taskReworkRate',
  'batchWithdrawalRate',
  'riskRecurrenceRate',
] as const
const METRIC_CODES = [
  'CASE_OPENED_COUNT',
  'CASE_CLOSED_COUNT',
  'GOVERNANCE_OVERDUE_RATE',
  'REMINDER_COVERAGE_RATE',
  'POST_REMINDER_COMPLETION_RATE',
  'TASK_REWORK_RATE',
  'BATCH_WITHDRAW_RATE',
  'RISK_RECURRENCE_RATE',
] as const
const GRAINS = ['DAY', 'WEEK'] as const
const DIMENSIONS = [
  'TRIGGER_TYPE',
  'RISK_CATEGORY',
  'ROOT_CAUSE_CATEGORY',
  'RESOLUTION_OUTCOME',
  'RECOVERY_VERIFICATION_STATUS',
  'TODO_TYPE',
] as const
const METRIC_FAMILIES = ['FUNNEL', 'DURATION', 'OVERDUE', 'REMINDER', 'REWORK', 'WITHDRAW', 'RECURRENCE'] as const
const REBUILD_STATUSES = ['REQUESTED', 'DRY_RUN_READY', 'RUNNING', 'VALIDATING', 'COMPLETED', 'FAILED'] as const
const RECURRENCE_WINDOWS = [7, 30, 90] as const

export type ChannelQualityGovernanceAnalyticsAvailability = (typeof AVAILABILITIES)[number]
export type ChannelQualityGovernanceAnalyticsProjectionStatus = (typeof PROJECTION_STATUSES)[number]
export type ChannelQualityGovernanceAnalyticsSourceType = (typeof SOURCE_TYPES)[number]
export type ChannelQualityGovernanceAnalyticsSourceStatus = (typeof SOURCE_STATUSES)[number]
export type ChannelQualityGovernanceAnalyticsFunnelStage = (typeof FUNNEL_STAGES)[number]
export type ChannelQualityGovernanceAnalyticsDurationStage = (typeof DURATION_STAGES)[number]
export type ChannelQualityGovernanceAnalyticsRateKey = (typeof RATE_KEYS)[number]
export type ChannelQualityGovernanceAnalyticsMetricCode = (typeof METRIC_CODES)[number]
export type ChannelQualityGovernanceAnalyticsGrain = (typeof GRAINS)[number]
export type ChannelQualityGovernanceAnalyticsDimension = (typeof DIMENSIONS)[number]
export type ChannelQualityGovernanceAnalyticsMetricFamily = (typeof METRIC_FAMILIES)[number]
export type ChannelQualityGovernanceAnalyticsRebuildStatus = (typeof REBUILD_STATUSES)[number]

export interface ChannelQualityGovernanceAnalyticsRequestOptions {
  signal?: AbortSignal
  skipAuthRedirect?: boolean
}

export interface ChannelQualityGovernanceAnalyticsWindow {
  from: string
  to: string
  asOf: string
  timezone: 'UTC'
}

export interface ChannelQualityGovernanceAnalyticsMeasure {
  availability: ChannelQualityGovernanceAnalyticsAvailability
  value: number | null
  numerator: number | null
  denominator: number | null
  reason: string | null
}

export interface ChannelQualityGovernanceAnalyticsFunnelStep extends ChannelQualityGovernanceAnalyticsMeasure {
  stage: ChannelQualityGovernanceAnalyticsFunnelStage
}

export interface ChannelQualityGovernanceAnalyticsDuration {
  availability: ChannelQualityGovernanceAnalyticsAvailability
  sampleCount: number | null
  averageSeconds: number | null
  p50Seconds: number | null
  p90Seconds: number | null
  maxSeconds: number | null
  reason: string | null
}

export interface ChannelQualityGovernanceAnalyticsSourceWatermark {
  sourceType: ChannelQualityGovernanceAnalyticsSourceType
  available: boolean
  coveredThrough: string | null
  lagSeconds: number | null
  backlogCount: number
  status: ChannelQualityGovernanceAnalyticsSourceStatus
}

export interface ChannelQualityGovernanceAnalyticsOverview {
  window: ChannelQualityGovernanceAnalyticsWindow
  metricDefinitionVersion: string
  projectionGeneration: number
  projectionStatus: ChannelQualityGovernanceAnalyticsProjectionStatus
  sourceWatermarks: ChannelQualityGovernanceAnalyticsSourceWatermark[]
  funnel: ChannelQualityGovernanceAnalyticsFunnelStep[]
  handlingDuration: Record<ChannelQualityGovernanceAnalyticsDurationStage, ChannelQualityGovernanceAnalyticsDuration>
  rates: Record<ChannelQualityGovernanceAnalyticsRateKey, ChannelQualityGovernanceAnalyticsMeasure>
}

export interface ChannelQualityGovernanceAnalyticsTrendBucket extends ChannelQualityGovernanceAnalyticsMeasure {
  bucketStart: string
  bucketEnd: string
  sampleCount: number | null
  projectionGeneration: number
}

export interface ChannelQualityGovernanceAnalyticsTrends {
  metricCode: ChannelQualityGovernanceAnalyticsMetricCode
  grain: ChannelQualityGovernanceAnalyticsGrain
  window: ChannelQualityGovernanceAnalyticsWindow
  metricDefinitionVersion: string
  projectionGeneration: number
  projectionStatus: ChannelQualityGovernanceAnalyticsProjectionStatus
  buckets: ChannelQualityGovernanceAnalyticsTrendBucket[]
}

export interface ChannelQualityGovernanceAnalyticsBreakdownItem extends ChannelQualityGovernanceAnalyticsMeasure {
  dimensionValue: string
  sampleCount: number | null
}

export interface ChannelQualityGovernanceAnalyticsBreakdown {
  metricCode: ChannelQualityGovernanceAnalyticsMetricCode
  dimension: ChannelQualityGovernanceAnalyticsDimension
  window: ChannelQualityGovernanceAnalyticsWindow
  metricDefinitionVersion: string
  projectionGeneration: number
  projectionStatus: ChannelQualityGovernanceAnalyticsProjectionStatus
  items: ChannelQualityGovernanceAnalyticsBreakdownItem[]
}

export interface ChannelQualityGovernanceAnalyticsProjectionHealth {
  asOf: string
  status: ChannelQualityGovernanceAnalyticsProjectionStatus
  activeGeneration: number | null
  latestCompletedGeneration: number | null
  sources: ChannelQualityGovernanceAnalyticsSourceWatermark[]
  dirtyBucketCount: number
  oldestDirtyBucket: string | null
  issueCount: number
  issuesCapped: boolean
  todoCapabilityStatus: ChannelQualityGovernanceAnalyticsAvailability
  canRequestRebuild: boolean
}

export interface ChannelQualityGovernanceAnalyticsOverviewQuery {
  from: string
  to: string
  domain?: number
  triggerType?: 'RISK_EVENT' | 'DUE_STATE'
  riskCategory?: string
  recurrenceWindowDays?: 7 | 30 | 90
}

export interface ChannelQualityGovernanceAnalyticsTrendsQuery extends ChannelQualityGovernanceAnalyticsOverviewQuery {
  metricCode: ChannelQualityGovernanceAnalyticsMetricCode
  grain: ChannelQualityGovernanceAnalyticsGrain
}

export interface ChannelQualityGovernanceAnalyticsBreakdownQuery extends ChannelQualityGovernanceAnalyticsOverviewQuery {
  metricCode: ChannelQualityGovernanceAnalyticsMetricCode
  dimension: ChannelQualityGovernanceAnalyticsDimension
}

export interface ChannelQualityGovernanceAnalyticsRebuildRequest {
  from: string
  to: string
  domains: number[]
  metricFamilies: ChannelQualityGovernanceAnalyticsMetricFamily[]
  dryRun: boolean
  limit: number
  reason: string
  idempotencyKey: string
}

export interface ChannelQualityGovernanceAnalyticsRebuildResult {
  requestId: string
  status: ChannelQualityGovernanceAnalyticsRebuildStatus
  dryRun: boolean
  requestFingerprint: string
}

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
)

const onlyKeys = (value: Record<string, unknown>, keys: readonly string[]) => (
  Object.keys(value).every((key) => keys.includes(key))
)

const isOneOf = <T extends readonly string[]>(value: unknown, values: T): value is T[number] => (
  typeof value === 'string' && (values as readonly string[]).includes(value)
)

const safeTimestamp = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const timestamp = value.trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z)?$/.exec(timestamp)
  if (!match) return null
  const fraction = (match[7] || '').slice(0, 3).padEnd(3, '0')
  const parsed = Date.parse(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.${fraction}Z`)
  if (!Number.isFinite(parsed)) return null
  const expected = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`
  return new Date(parsed).toISOString().slice(0, 19) === expected ? timestamp : null
}

const safeNumber = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
)

const safeInteger = (value: unknown): number | null => (
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
)

const safePositiveInteger = (value: unknown): number | null => {
  const parsed = safeInteger(value)
  return parsed != null && parsed > 0 ? parsed : null
}

const safeOptional = <T>(value: unknown, adapt: (candidate: unknown) => T | null): T | null | undefined => (
  value == null ? null : adapt(value) ?? undefined
)

const safeReason = (value: unknown): string | null | undefined => {
  if (value == null) return null
  if (typeof value !== 'string') return undefined
  const reason = value.trim()
  return /^[A-Z][A-Z0-9_]{1,95}$/.test(reason) ? reason : undefined
}

const safeStructuredCode = (value: unknown): string | null => (
  typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,47}$/.test(value.trim())
    ? value.trim()
    : null
)

const adaptWindow = (raw: unknown): ChannelQualityGovernanceAnalyticsWindow | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, ['from', 'to', 'asOf', 'timezone'])) return null
  const from = safeTimestamp(value.from)
  const to = safeTimestamp(value.to)
  const asOf = safeTimestamp(value.asOf)
  return from && to && asOf && Date.parse(to) > Date.parse(from) && value.timezone === 'UTC'
    ? { from, to, asOf, timezone: 'UTC' }
    : null
}

const adaptMeasure = (raw: unknown): ChannelQualityGovernanceAnalyticsMeasure | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, ['availability', 'value', 'numerator', 'denominator', 'reason'])) return null
  const availability = value.availability
  const metricValue = safeOptional(value.value, safeNumber)
  const numerator = safeOptional(value.numerator, safeInteger)
  const denominator = safeOptional(value.denominator, safeInteger)
  const reason = safeReason(value.reason)
  if (
    !isOneOf(availability, AVAILABILITIES)
    || metricValue === undefined
    || numerator === undefined
    || denominator === undefined
    || reason === undefined
  ) return null
  if (availability === 'AVAILABLE') {
    if (
      metricValue == null
      || reason != null
      || (numerator == null) !== (denominator == null)
      || (numerator != null && denominator != null && numerator > denominator)
    ) return null
  } else if (availability === 'NO_ELIGIBLE_SAMPLE') {
    if (metricValue != null || numerator !== 0 || denominator !== 0 || reason !== 'NO_ELIGIBLE_SAMPLE') return null
  } else if (metricValue != null || numerator != null || denominator != null || reason == null) return null
  return { availability, value: metricValue, numerator, denominator, reason }
}

const adaptDuration = (raw: unknown): ChannelQualityGovernanceAnalyticsDuration | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'availability',
    'sampleCount',
    'averageSeconds',
    'p50Seconds',
    'p90Seconds',
    'maxSeconds',
    'reason',
  ])) return null
  const availability = value.availability
  const sampleCount = safeOptional(value.sampleCount, safeInteger)
  const averageSeconds = safeOptional(value.averageSeconds, safeNumber)
  const p50Seconds = safeOptional(value.p50Seconds, safeNumber)
  const p90Seconds = safeOptional(value.p90Seconds, safeNumber)
  const maxSeconds = safeOptional(value.maxSeconds, safeNumber)
  const reason = safeReason(value.reason)
  if (
    !isOneOf(availability, AVAILABILITIES)
    || sampleCount === undefined
    || averageSeconds === undefined
    || p50Seconds === undefined
    || p90Seconds === undefined
    || maxSeconds === undefined
    || reason === undefined
  ) return null
  if (availability === 'AVAILABLE' && (
    sampleCount == null
    || reason != null
    || (sampleCount === 0 && [averageSeconds, p50Seconds, p90Seconds, maxSeconds].some((item) => item != null))
    || (sampleCount > 0 && (
      averageSeconds == null
      || p50Seconds == null
      || p90Seconds == null
      || maxSeconds == null
      || p50Seconds > p90Seconds
      || p90Seconds > maxSeconds
    ))
  )) return null
  if (availability === 'NO_ELIGIBLE_SAMPLE' && (
    sampleCount !== 0
    || [averageSeconds, p50Seconds, p90Seconds, maxSeconds].some((item) => item != null)
    || reason !== 'NO_ELIGIBLE_SAMPLE'
  )) return null
  if ((availability === 'UNAVAILABLE' || availability === 'SUPPRESSED') && (
    sampleCount != null
    || [averageSeconds, p50Seconds, p90Seconds, maxSeconds].some((item) => item != null)
    || reason == null
  )) return null
  return { availability, sampleCount, averageSeconds, p50Seconds, p90Seconds, maxSeconds, reason }
}

const adaptSourceWatermark = (raw: unknown): ChannelQualityGovernanceAnalyticsSourceWatermark | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'sourceType',
    'available',
    'coveredThrough',
    'lagSeconds',
    'backlogCount',
    'status',
  ])) return null
  const coveredThrough = safeOptional(value.coveredThrough, safeTimestamp)
  const lagSeconds = safeOptional(value.lagSeconds, safeInteger)
  const backlogCount = safeInteger(value.backlogCount)
  if (
    !isOneOf(value.sourceType, SOURCE_TYPES)
    || typeof value.available !== 'boolean'
    || coveredThrough === undefined
    || lagSeconds === undefined
    || backlogCount == null
    || !isOneOf(value.status, SOURCE_STATUSES)
    || (value.available && (coveredThrough == null || lagSeconds == null || value.status === 'UNAVAILABLE'))
    || (!value.available && (coveredThrough != null || lagSeconds != null || value.status !== 'UNAVAILABLE'))
  ) return null
  return {
    sourceType: value.sourceType,
    available: value.available,
    coveredThrough,
    lagSeconds,
    backlogCount,
    status: value.status,
  }
}

const adaptOverview = (raw: unknown): ChannelQualityGovernanceAnalyticsOverview | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'window',
    'metricDefinitionVersion',
    'projectionGeneration',
    'projectionStatus',
    'sourceWatermarks',
    'funnel',
    'handlingDuration',
    'rates',
  ])) return null
  const window = adaptWindow(value.window)
  const projectionGeneration = safePositiveInteger(value.projectionGeneration)
  const sourceWatermarks = Array.isArray(value.sourceWatermarks) ? value.sourceWatermarks.map(adaptSourceWatermark) : null
  const funnel = Array.isArray(value.funnel) ? value.funnel.map((item) => {
    const source = asRecord(item)
    const measure = adaptMeasure(item)
    return source && measure && onlyKeys(source, ['stage', 'availability', 'value', 'numerator', 'denominator', 'reason'])
      && isOneOf(source.stage, FUNNEL_STAGES)
      ? { stage: source.stage, ...measure }
      : null
  }) : null
  const duration = asRecord(value.handlingDuration)
  const rates = asRecord(value.rates)
  if (
    !window
    || typeof value.metricDefinitionVersion !== 'string'
    || !/^V43_\d+$/.test(value.metricDefinitionVersion)
    || projectionGeneration == null
    || !isOneOf(value.projectionStatus, PROJECTION_STATUSES)
    || !sourceWatermarks
    || sourceWatermarks.some((item) => item == null)
    || new Set(sourceWatermarks.map((item) => item?.sourceType)).size !== sourceWatermarks.length
    || !funnel
    || funnel.some((item) => item == null)
    || new Set(funnel.map((item) => item?.stage)).size !== funnel.length
    || !duration
    || !rates
    || !onlyKeys(duration, DURATION_STAGES)
    || !onlyKeys(rates, RATE_KEYS)
  ) return null
  const durations = DURATION_STAGES.map((stage) => [stage, adaptDuration(duration[stage])] as const)
  const rateEntries = RATE_KEYS.map((key) => [key, adaptMeasure(rates[key])] as const)
  if (durations.some(([, item]) => item == null) || rateEntries.some(([, item]) => item == null)) return null
  return {
    window,
    metricDefinitionVersion: value.metricDefinitionVersion,
    projectionGeneration,
    projectionStatus: value.projectionStatus,
    sourceWatermarks: sourceWatermarks as ChannelQualityGovernanceAnalyticsSourceWatermark[],
    funnel: funnel as ChannelQualityGovernanceAnalyticsFunnelStep[],
    handlingDuration: Object.fromEntries(durations) as Record<
      ChannelQualityGovernanceAnalyticsDurationStage,
      ChannelQualityGovernanceAnalyticsDuration
    >,
    rates: Object.fromEntries(rateEntries) as Record<
      ChannelQualityGovernanceAnalyticsRateKey,
      ChannelQualityGovernanceAnalyticsMeasure
    >,
  }
}

const adaptTrendBucket = (raw: unknown): ChannelQualityGovernanceAnalyticsTrendBucket | null => {
  const value = asRecord(raw)
  const measure = adaptMeasure(raw)
  if (!value || !measure || !onlyKeys(value, [
    'bucketStart',
    'bucketEnd',
    'availability',
    'value',
    'numerator',
    'denominator',
    'sampleCount',
    'reason',
    'projectionGeneration',
  ])) return null
  const bucketStart = safeTimestamp(value.bucketStart)
  const bucketEnd = safeTimestamp(value.bucketEnd)
  const sampleCount = safeOptional(value.sampleCount, safeInteger)
  const projectionGeneration = safePositiveInteger(value.projectionGeneration)
  if (
    !bucketStart
    || !bucketEnd
    || Date.parse(bucketEnd) <= Date.parse(bucketStart)
    || sampleCount === undefined
    || projectionGeneration == null
    || (measure.availability === 'AVAILABLE' && sampleCount == null)
    || ((measure.availability === 'UNAVAILABLE' || measure.availability === 'SUPPRESSED') && sampleCount != null)
  ) return null
  return { bucketStart, bucketEnd, sampleCount, projectionGeneration, ...measure }
}

const adaptTrends = (raw: unknown): ChannelQualityGovernanceAnalyticsTrends | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'metricCode',
    'grain',
    'window',
    'metricDefinitionVersion',
    'projectionGeneration',
    'projectionStatus',
    'buckets',
  ])) return null
  const window = adaptWindow(value.window)
  const projectionGeneration = safePositiveInteger(value.projectionGeneration)
  const buckets = Array.isArray(value.buckets) ? value.buckets.map(adaptTrendBucket) : null
  if (
    !isOneOf(value.metricCode, METRIC_CODES)
    || !isOneOf(value.grain, GRAINS)
    || !window
    || typeof value.metricDefinitionVersion !== 'string'
    || !/^V43_\d+$/.test(value.metricDefinitionVersion)
    || projectionGeneration == null
    || !isOneOf(value.projectionStatus, PROJECTION_STATUSES)
    || !buckets
    || buckets.some((item) => item == null)
  ) return null
  const typedBuckets = buckets as ChannelQualityGovernanceAnalyticsTrendBucket[]
  if (typedBuckets.some((bucket, index) => (
    index > 0 && Date.parse(bucket.bucketStart) < Date.parse(typedBuckets[index - 1].bucketEnd)
  ))) return null
  return {
    metricCode: value.metricCode,
    grain: value.grain,
    window,
    metricDefinitionVersion: value.metricDefinitionVersion,
    projectionGeneration,
    projectionStatus: value.projectionStatus,
    buckets: typedBuckets,
  }
}

const adaptBreakdown = (raw: unknown): ChannelQualityGovernanceAnalyticsBreakdown | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'metricCode',
    'dimension',
    'window',
    'metricDefinitionVersion',
    'projectionGeneration',
    'projectionStatus',
    'items',
  ])) return null
  const window = adaptWindow(value.window)
  const projectionGeneration = safePositiveInteger(value.projectionGeneration)
  const items = Array.isArray(value.items) ? value.items.map((item) => {
    const source = asRecord(item)
    const measure = adaptMeasure(item)
    const sampleCount = source ? safeOptional(source.sampleCount, safeInteger) : undefined
    const dimensionValue = source ? safeStructuredCode(source.dimensionValue) : null
    return source && measure && onlyKeys(source, [
      'dimensionValue',
      'availability',
      'value',
      'numerator',
      'denominator',
      'sampleCount',
      'reason',
    ]) && dimensionValue && sampleCount !== undefined
      ? { dimensionValue, sampleCount, ...measure }
      : null
  }) : null
  if (
    !isOneOf(value.metricCode, METRIC_CODES)
    || !isOneOf(value.dimension, DIMENSIONS)
    || !window
    || typeof value.metricDefinitionVersion !== 'string'
    || !/^V43_\d+$/.test(value.metricDefinitionVersion)
    || projectionGeneration == null
    || !isOneOf(value.projectionStatus, PROJECTION_STATUSES)
    || !items
    || items.some((item) => item == null)
    || new Set(items.map((item) => item?.dimensionValue)).size !== items.length
  ) return null
  return {
    metricCode: value.metricCode,
    dimension: value.dimension,
    window,
    metricDefinitionVersion: value.metricDefinitionVersion,
    projectionGeneration,
    projectionStatus: value.projectionStatus,
    items: items as ChannelQualityGovernanceAnalyticsBreakdownItem[],
  }
}

const adaptProjectionHealth = (raw: unknown): ChannelQualityGovernanceAnalyticsProjectionHealth | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, [
    'asOf',
    'status',
    'activeGeneration',
    'latestCompletedGeneration',
    'sources',
    'dirtyBucketCount',
    'oldestDirtyBucket',
    'issueCount',
    'issuesCapped',
    'todoCapabilityStatus',
    'canRequestRebuild',
  ])) return null
  const asOf = safeTimestamp(value.asOf)
  const activeGeneration = safeOptional(value.activeGeneration, safePositiveInteger)
  const latestCompletedGeneration = safeOptional(value.latestCompletedGeneration, safePositiveInteger)
  const sources = Array.isArray(value.sources) ? value.sources.map(adaptSourceWatermark) : null
  const dirtyBucketCount = safeInteger(value.dirtyBucketCount)
  const oldestDirtyBucket = safeOptional(value.oldestDirtyBucket, safeTimestamp)
  const issueCount = safeInteger(value.issueCount)
  if (
    !asOf
    || !isOneOf(value.status, PROJECTION_STATUSES)
    || activeGeneration === undefined
    || latestCompletedGeneration === undefined
    || !sources
    || sources.some((item) => item == null)
    || dirtyBucketCount == null
    || oldestDirtyBucket === undefined
    || issueCount == null
    || typeof value.issuesCapped !== 'boolean'
    || !isOneOf(value.todoCapabilityStatus, AVAILABILITIES)
    || typeof value.canRequestRebuild !== 'boolean'
    || (dirtyBucketCount === 0 && oldestDirtyBucket != null)
    || (dirtyBucketCount > 0 && oldestDirtyBucket == null)
  ) return null
  return {
    asOf,
    status: value.status,
    activeGeneration,
    latestCompletedGeneration,
    sources: sources as ChannelQualityGovernanceAnalyticsSourceWatermark[],
    dirtyBucketCount,
    oldestDirtyBucket,
    issueCount,
    issuesCapped: value.issuesCapped,
    todoCapabilityStatus: value.todoCapabilityStatus,
    canRequestRebuild: value.canRequestRebuild,
  }
}

const adaptRebuildResult = (raw: unknown): ChannelQualityGovernanceAnalyticsRebuildResult | null => {
  const value = asRecord(raw)
  if (!value || !onlyKeys(value, ['requestId', 'status', 'dryRun', 'requestFingerprint'])) return null
  const requestId = typeof value.requestId === 'string' && /^[A-Za-z0-9_-]{1,96}$/.test(value.requestId)
    ? value.requestId
    : null
  return requestId
    && isOneOf(value.status, REBUILD_STATUSES)
    && typeof value.dryRun === 'boolean'
    && typeof value.requestFingerprint === 'string'
    && /^[a-f0-9]{64}$/.test(value.requestFingerprint)
    ? { requestId, status: value.status, dryRun: value.dryRun, requestFingerprint: value.requestFingerprint }
    : null
}

const normalizeWindowQuery = (
  query: ChannelQualityGovernanceAnalyticsOverviewQuery,
): ChannelQualityGovernanceAnalyticsOverviewQuery | null => {
  const from = safeTimestamp(query.from)
  const to = safeTimestamp(query.to)
  const riskCategory = query.riskCategory == null ? undefined : safeStructuredCode(query.riskCategory)
  const recurrenceWindowDays = query.recurrenceWindowDays == null ? 30 : query.recurrenceWindowDays
  if (
    !from
    || !to
    || Date.parse(to) <= Date.parse(from)
    || (query.domain != null && (!Number.isSafeInteger(query.domain) || query.domain < 1 || query.domain > 5))
    || (query.triggerType != null && query.triggerType !== 'RISK_EVENT' && query.triggerType !== 'DUE_STATE')
    || (query.riskCategory != null && !riskCategory)
    || !(RECURRENCE_WINDOWS as readonly number[]).includes(recurrenceWindowDays)
  ) return null
  return {
    from,
    to,
    domain: query.domain,
    triggerType: query.triggerType,
    riskCategory: riskCategory || undefined,
    recurrenceWindowDays,
  }
}

const normalizeRebuildRequest = (
  payload: ChannelQualityGovernanceAnalyticsRebuildRequest,
): ChannelQualityGovernanceAnalyticsRebuildRequest | null => {
  const window = normalizeWindowQuery(payload)
  const reason = payload.reason.trim()
  const idempotencyKey = payload.idempotencyKey.trim()
  if (
    !window
    || !Array.isArray(payload.domains)
    || payload.domains.length < 1
    || payload.domains.length > 5
    || payload.domains.some((domain) => !Number.isSafeInteger(domain) || domain < 1 || domain > 5)
    || new Set(payload.domains).size !== payload.domains.length
    || !Array.isArray(payload.metricFamilies)
    || payload.metricFamilies.length < 1
    || payload.metricFamilies.some((family) => !isOneOf(family, METRIC_FAMILIES))
    || new Set(payload.metricFamilies).size !== payload.metricFamilies.length
    || typeof payload.dryRun !== 'boolean'
    || !Number.isSafeInteger(payload.limit)
    || payload.limit < 1
    || payload.limit > 5000
    || reason.length < 1
    || reason.length > 240
    || /[\u0000-\u001f\u007f]/.test(reason)
    || idempotencyKey.length < 1
    || idempotencyKey.length > 96
    || /[\u0000-\u001f\u007f]/.test(idempotencyKey)
  ) return null
  return {
    from: window.from,
    to: window.to,
    domains: payload.domains,
    metricFamilies: payload.metricFamilies,
    dryRun: payload.dryRun,
    limit: payload.limit,
    reason,
    idempotencyKey,
  }
}

export class ChannelQualityGovernanceAnalyticsContractError extends Error {
  constructor() {
    super('频道质量治理分析数据不符合远端契约')
    this.name = 'ChannelQualityGovernanceAnalyticsContractError'
  }
}

const requireStrictRemoteResult = <T>(raw: Result<unknown>, adapt: (data: unknown) => T | null): Result<T> => {
  const result = withRemoteResultProvenance(raw)
  if (result.code !== 0 || result.source !== 'remote' || result.degraded || result.data == null) {
    throw new ChannelQualityGovernanceAnalyticsContractError()
  }
  const data = adapt(result.data)
  if (!data) throw new ChannelQualityGovernanceAnalyticsContractError()
  return { ...result, data }
}

export const channelQualityGovernanceAnalyticsApi = {
  overview: async (
    query: ChannelQualityGovernanceAnalyticsOverviewQuery,
    options: ChannelQualityGovernanceAnalyticsRequestOptions = {},
  ): Promise<Result<ChannelQualityGovernanceAnalyticsOverview>> => {
    const params = normalizeWindowQuery(query)
    if (!params) throw new ChannelQualityGovernanceAnalyticsContractError()
    const raw = await client.get(`${BASE_PATH}/overview`, {
      params,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptOverview)
  },
  trends: async (
    query: ChannelQualityGovernanceAnalyticsTrendsQuery,
    options: ChannelQualityGovernanceAnalyticsRequestOptions = {},
  ): Promise<Result<ChannelQualityGovernanceAnalyticsTrends>> => {
    const window = normalizeWindowQuery(query)
    if (!window || !isOneOf(query.metricCode, METRIC_CODES) || !isOneOf(query.grain, GRAINS)) {
      throw new ChannelQualityGovernanceAnalyticsContractError()
    }
    const raw = await client.get(`${BASE_PATH}/trends`, {
      params: { ...window, metricCode: query.metricCode, grain: query.grain },
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptTrends)
  },
  breakdown: async (
    query: ChannelQualityGovernanceAnalyticsBreakdownQuery,
    options: ChannelQualityGovernanceAnalyticsRequestOptions = {},
  ): Promise<Result<ChannelQualityGovernanceAnalyticsBreakdown>> => {
    const window = normalizeWindowQuery(query)
    if (!window || !isOneOf(query.metricCode, METRIC_CODES) || !isOneOf(query.dimension, DIMENSIONS)) {
      throw new ChannelQualityGovernanceAnalyticsContractError()
    }
    const raw = await client.get(`${BASE_PATH}/breakdown`, {
      params: { ...window, metricCode: query.metricCode, dimension: query.dimension },
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptBreakdown)
  },
  projectionHealth: async (
    options: ChannelQualityGovernanceAnalyticsRequestOptions = {},
  ): Promise<Result<ChannelQualityGovernanceAnalyticsProjectionHealth>> => {
    const raw = await client.get(`${BASE_PATH}/projection-health`, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptProjectionHealth)
  },
  requestRebuild: async (
    payload: ChannelQualityGovernanceAnalyticsRebuildRequest,
    options: ChannelQualityGovernanceAnalyticsRequestOptions = {},
  ): Promise<Result<ChannelQualityGovernanceAnalyticsRebuildResult>> => {
    const body = normalizeRebuildRequest(payload)
    if (!body) throw new ChannelQualityGovernanceAnalyticsContractError()
    const raw = await client.post(`${BASE_PATH}/projection/rebuild`, body, {
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    }) as Result<unknown>
    return requireStrictRemoteResult(raw, adaptRebuildResult)
  },
}
