import client, { type Result } from './client'
import type { ApiId } from './types'

const PUBLIC_CONTRIBUTIONS_PATH = '/api/v1/users'
const NEED_FUNNEL_PATH = '/api/v1/collaboration/analytics/need-funnel'
const DEFAULT_CONTRIBUTION_LIMIT = 200

export interface CollaborationAnalyticsRequestOptions {
  signal?: AbortSignal
  limit?: number
}

export interface PublicCollaborationContributionFact {
  factType: string
  sourceId: ApiId | null
  referenceType: string | null
  referenceId: ApiId | null
  domain: number | null
  occurredAt: string | null
}

export interface PublicCollaborationContributionProfile {
  uid: ApiId | null
  factCount: number
  truncated: boolean
  generatedAt: string | null
  facts: PublicCollaborationContributionFact[]
  degraded: boolean
  degradationReasons: string[]
}

export interface CollaborationNeedFunnel {
  domain: number | null
  windowStart: string | null
  windowEnd: string | null
  timezone: string | null
  deduplicationPolicy: string | null
  emptyDenominatorPolicy: string | null
  dataFreshness: string | null
  degraded: boolean
  degradationReasons: string[]
  createdNeedCount: number | null
  claimedNeedCount: number | null
  submittedNeedCount: number | null
  acceptedNeedCount: number | null
  rejectedNeedCount: number | null
  resubmittedNeedCount: number | null
  releasedNeedCount: number | null
  reclaimedNeedCount: number | null
  activeClaimedNeedCount: number | null
  stalledNeedCount: number | null
  followedNeedCount: number | null
  followedToClaimedNeedCount: number | null
  maintenanceTaskCount: number | null
  completedMaintenanceTaskCount: number | null
  claimRate: number | null
  submitRate: number | null
  acceptanceRate: number | null
  rejectionResubmissionRate: number | null
  releaseRate: number | null
  reclaimRate: number | null
  stalledRate: number | null
  followedToClaimedRate: number | null
  maintenanceCompletionRate: number | null
  averageCreateToClaimSeconds: number | null
  averageClaimToSubmitSeconds: number | null
  averageSubmitToAcceptSeconds: number | null
}

const asObject = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' ? value as Record<string, unknown> : null
)

const numberOrNull = (value: unknown): number | null => {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null
}

const textOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text || null
}

const idOrNull = (value: unknown): ApiId | null => {
  if (value == null || value === '') return null
  return typeof value === 'number' ? value : String(value)
}

const booleanOrFalse = (value: unknown) => value === true || value === 'true' || value === 1

const stringList = (value: unknown): string[] => (
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : []
)

const adaptFact = (raw: unknown): PublicCollaborationContributionFact | null => {
  const item = asObject(raw)
  if (!item) return null
  const factType = textOrNull(item.factType)
  if (!factType) return null
  return {
    factType,
    sourceId: idOrNull(item.sourceId),
    referenceType: textOrNull(item.referenceType),
    referenceId: idOrNull(item.referenceId),
    domain: numberOrNull(item.domain),
    occurredAt: textOrNull(item.occurredAt),
  }
}

export const adaptPublicContributionProfile = (
  raw: unknown,
): PublicCollaborationContributionProfile | null => {
  const source = Array.isArray(raw) ? { facts: raw } : asObject(raw)
  if (!source) return null
  const facts = Array.isArray(source.facts)
    ? source.facts.map(adaptFact).filter((item): item is PublicCollaborationContributionFact => Boolean(item))
    : []
  return {
    uid: idOrNull(source.uid),
    factCount: numberOrNull(source.factCount) ?? facts.length,
    truncated: booleanOrFalse(source.truncated),
    generatedAt: textOrNull(source.generatedAt),
    facts,
    degraded: booleanOrFalse(source.degraded),
    degradationReasons: stringList(source.degradationReasons),
  }
}

const funnelCountFields = [
  'createdNeedCount',
  'claimedNeedCount',
  'submittedNeedCount',
  'acceptedNeedCount',
  'rejectedNeedCount',
  'resubmittedNeedCount',
  'releasedNeedCount',
  'reclaimedNeedCount',
  'activeClaimedNeedCount',
  'stalledNeedCount',
  'followedNeedCount',
  'followedToClaimedNeedCount',
  'maintenanceTaskCount',
  'completedMaintenanceTaskCount',
  'averageCreateToClaimSeconds',
  'averageClaimToSubmitSeconds',
  'averageSubmitToAcceptSeconds',
] as const

const funnelRateFields = [
  'claimRate',
  'submitRate',
  'acceptanceRate',
  'rejectionResubmissionRate',
  'releaseRate',
  'reclaimRate',
  'stalledRate',
  'followedToClaimedRate',
  'maintenanceCompletionRate',
] as const

export const adaptCollaborationNeedFunnel = (raw: unknown): CollaborationNeedFunnel | null => {
  const source = asObject(raw)
  if (!source) return null

  const funnel = {
    domain: numberOrNull(source.domain),
    windowStart: textOrNull(source.windowStart),
    windowEnd: textOrNull(source.windowEnd),
    timezone: textOrNull(source.timezone),
    deduplicationPolicy: textOrNull(source.deduplicationPolicy),
    emptyDenominatorPolicy: textOrNull(source.emptyDenominatorPolicy),
    dataFreshness: textOrNull(source.dataFreshness),
    degraded: booleanOrFalse(source.degraded),
    degradationReasons: stringList(source.degradationReasons),
  } as CollaborationNeedFunnel

  for (const field of funnelCountFields) {
    funnel[field] = numberOrNull(source[field])
  }
  for (const field of funnelRateFields) {
    funnel[field] = numberOrNull(source[field])
  }
  return funnel
}

const adaptResult = <T>(
  result: Result<unknown>,
  adapter: (value: unknown) => T | null,
): Result<T> => ({
  ...result,
  data: adapter(result.data),
})

const publicContributionRequest = async (
  uid: ApiId,
  options: CollaborationAnalyticsRequestOptions = {},
) => {
  const response = await client.get(
    `${PUBLIC_CONTRIBUTIONS_PATH}/${encodeURIComponent(String(uid))}/public-contributions`,
    {
      params: {
        limit: Math.max(1, Math.min(options.limit || DEFAULT_CONTRIBUTION_LIMIT, DEFAULT_CONTRIBUTION_LIMIT)),
      },
      signal: options.signal,
      skipAuthRedirect: true,
    },
  ) as Result<unknown>
  return adaptResult(response, adaptPublicContributionProfile)
}

const publicContributionsMine = async (
  uid: ApiId,
  options: CollaborationAnalyticsRequestOptions = {},
) => {
  return publicContributionRequest(uid, options)
}

const needFunnel = async (
  query: { days?: number; domain?: number | null } = {},
  options: Pick<CollaborationAnalyticsRequestOptions, 'signal'> = {},
): Promise<Result<CollaborationNeedFunnel>> => {
  const response = await client.get(NEED_FUNNEL_PATH, {
    params: {
      days: query.days,
      domain: query.domain == null ? undefined : query.domain,
    },
    signal: options.signal,
    skipAuthRedirect: true,
  }) as Result<unknown>
  return adaptResult(response, adaptCollaborationNeedFunnel)
}

export const collaborationAnalyticsApi = {
  contributions: {
    mine: publicContributionsMine,
    forUser: publicContributionRequest,
  },
  analytics: {
    needFunnel,
  },
}

export type CollaborationAnalyticsResult<T> = Result<T>
