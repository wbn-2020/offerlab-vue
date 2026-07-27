import client, { BizException, type Result, withRemoteResultProvenance } from './client'
import { adaptId } from './adapters'
import type {
  ApiId,
  EffectiveReadAbandonReq,
  EffectiveReadAbandonResult,
  EffectiveReadCompleteReq,
  EffectiveReadCompleteResult,
  EffectiveReadHeartbeatReq,
  EffectiveReadHeartbeatResult,
  EffectiveReadSession,
  GrowthProfile,
  GrowthProfileDimension,
  GrowthProfileDomain,
  GrowthProfileReferencePost,
  GrowthReport,
  GrowthReportDomainChange,
  GrowthReportHighlightPost,
} from './types'

const safeText = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const next = value.trim()
  return next || fallback
}

const toNumber = (value: unknown, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

const toList = <T,>(value: unknown, mapper: (item: any) => T): T[] => (
  Array.isArray(value) ? value.map(mapper) : []
)

const isNonNegativeSafeIntegerLike = (value: unknown) => {
  if (typeof value !== 'number' && typeof value !== 'string') return false
  if (typeof value === 'string' && !value.trim()) return false
  const count = Number(value)
  return Number.isSafeInteger(count) && count >= 0
}

export const isGrowthProfilePathPayloadShape = (raw: unknown): boolean => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const value = raw as Record<string, unknown>
  const normalizedDays = Number(value.days)
  if (!Number.isSafeInteger(normalizedDays) || normalizedDays <= 0) return false
  if (typeof value.degraded !== 'boolean') return false
  if (!Array.isArray(value.degradationReasons)
    || !value.degradationReasons.every((reason) => typeof reason === 'string')) return false
  if (!Array.isArray(value.domains)) return false
  return value.domains.every((domain) => (
    domain != null
    && typeof domain === 'object'
    && !Array.isArray(domain)
    && isNonNegativeSafeIntegerLike((domain as Record<string, unknown>).postCount)
  ))
}

const adaptDimension = (raw: any): GrowthProfileDimension => ({
  key: safeText(raw?.key),
  label: safeText(raw?.label),
  score: toNumber(raw?.score),
  explanation: safeText(raw?.explanation),
})

const adaptReferencePost = (raw: any): GrowthProfileReferencePost => ({
  postId: adaptId(raw?.postId ?? raw?.id),
  title: safeText(raw?.title, 'Untitled post'),
  domain: raw?.domain == null ? undefined : toNumber(raw.domain),
  heat: toNumber(raw?.heat),
  featured: Boolean(raw?.featured),
})

const adaptProfileDomain = (raw: any): GrowthProfileDomain => ({
  domain: toNumber(raw?.domain),
  domainName: safeText(raw?.domainName),
  postCount: toNumber(raw?.postCount),
  seriesCount: toNumber(raw?.seriesCount),
  activeDays: toNumber(raw?.activeDays),
  interactionCount: toNumber(raw?.interactionCount),
  viewCount: toNumber(raw?.viewCount),
  dimensions: toList(raw?.dimensions, adaptDimension),
  representativePosts: toList(raw?.representativePosts, adaptReferencePost),
})

const adaptDomainChange = (raw: any): GrowthReportDomainChange => ({
  domain: toNumber(raw?.domain),
  domainName: safeText(raw?.domainName),
  currentPostCount: toNumber(raw?.currentPostCount),
  previousPostCount: toNumber(raw?.previousPostCount),
  trend: safeText(raw?.trend),
  reason: safeText(raw?.reason),
})

const adaptHighlightPost = (raw: any): GrowthReportHighlightPost => ({
  postId: adaptId(raw?.postId ?? raw?.id),
  title: safeText(raw?.title, 'Untitled post'),
  domain: raw?.domain == null ? undefined : toNumber(raw.domain),
  domainName: safeText(raw?.domainName),
  interactionCount: toNumber(raw?.interactionCount),
  featured: Boolean(raw?.featured),
})

const adaptGrowthProfile = (raw: any): GrowthProfile => ({
  days: toNumber(raw?.days, 30),
  degraded: Boolean(raw?.degraded),
  degradationReasons: toList(raw?.degradationReasons, (item) => safeText(item)).filter(Boolean),
  strongestDomain: safeText(raw?.strongestDomain),
  emergingDomain: safeText(raw?.emergingDomain),
  nextFocus: safeText(raw?.nextFocus),
  domains: toList(raw?.domains, adaptProfileDomain),
})

const adaptGrowthReport = (raw: any): GrowthReport => ({
  period: safeText(raw?.period, 'weekly'),
  days: toNumber(raw?.days, 7),
  degraded: Boolean(raw?.degraded),
  degradationReasons: toList(raw?.degradationReasons, (item) => safeText(item)).filter(Boolean),
  publishedPostCount: toNumber(raw?.publishedPostCount),
  interactionCount: toNumber(raw?.interactionCount),
  featuredPostCount: toNumber(raw?.featuredPostCount),
  seriesContributionCount: toNumber(raw?.seriesContributionCount),
  domainChanges: toList(raw?.domainChanges, adaptDomainChange),
  highlightPosts: toList(raw?.highlightPosts, adaptHighlightPost),
  nextActions: toList(raw?.nextActions, (item) => safeText(item)).filter(Boolean),
})

const localDemoResult = <T>(data: T): Result<T> => ({
  code: 0,
  message: 'local_demo_seed',
  data,
  source: 'demo',
  degraded: true,
  fallbackReason: 'local_demo_seed',
})

const loadDemoSeeds = () => import('@/data/demoSeeds')

const emptyGrowthProfile = (days = 30): GrowthProfile => ({
  days,
  degraded: true,
  degradationReasons: ['backend_not_connected'],
  strongestDomain: undefined,
  emergingDomain: undefined,
  nextFocus: undefined,
  domains: [],
})

const emptyGrowthReport = (period: 'weekly' | 'monthly' | string = 'weekly'): GrowthReport => ({
  period,
  days: period === 'monthly' ? 30 : 7,
  degraded: true,
  degradationReasons: ['backend_not_connected'],
  publishedPostCount: 0,
  interactionCount: 0,
  featuredPostCount: 0,
  seriesContributionCount: 0,
  domainChanges: [],
  highlightPosts: [],
  nextActions: [],
})

export const isDemoFallbackEnabled = () => {
  const env = import.meta.env
  if (env.PROD) return false
  return Boolean(
    env.DEV
    || env.VITE_OFFERLAB_DEMO_FALLBACK === 'true'
    || env.VITE_OFFERLAB_USE_DEMO === 'true',
  )
}

const isBackendNotFound = (error: unknown) => {
  if (error instanceof BizException) {
    if (error.code === 10401 || error.code === 10403) return false
    return error.code === 10404
  }
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 401 || status === 403) return false
  return status === 404
}

const shouldUseDemoFallback = (error: unknown) => {
  return isDemoFallbackEnabled() && isBackendNotFound(error)
}

type EffectiveReadAbandonOptions = {
  keepalive?: boolean
}

export const growthApi = {
  startEffectiveReadSession: async (
    postId: ApiId,
    signal?: AbortSignal,
  ): Promise<Result<EffectiveReadSession>> => {
    const res = await client.post('/api/v1/growth/effective-read/session', { postId }, { signal }) as Result<any>
    return {
      ...res,
      data: res.data ? {
        sessionToken: safeText(res.data.sessionToken),
        postId: res.data.postId == null ? undefined : adaptId(res.data.postId),
        minimumActiveSeconds: Math.max(1, toNumber(res.data.minimumActiveSeconds, 20)),
        minimumScrollPercent: Math.max(1, Math.min(100, toNumber(res.data.minimumScrollPercent, 60))),
        heartbeatIntervalSeconds: Math.max(1, toNumber(res.data.heartbeatIntervalSeconds, 5)),
        heartbeatTimeoutSeconds: Math.max(1, toNumber(res.data.heartbeatTimeoutSeconds, 8)),
        nextHeartbeatSeq: Math.max(1, toNumber(res.data.nextHeartbeatSeq, 1)),
        activeSeconds: Math.max(0, toNumber(res.data.activeSeconds)),
        maxScrollPercent: Math.max(0, Math.min(100, toNumber(res.data.maxScrollPercent))),
        qualified: Boolean(res.data.qualified),
        completed: Boolean(res.data.completed),
        expiresAt: res.data.expiresAt ? new Date(res.data.expiresAt).getTime() : undefined,
      } : null,
    }
  },

  heartbeatEffectiveRead: async (
    req: EffectiveReadHeartbeatReq,
    signal?: AbortSignal,
  ): Promise<Result<EffectiveReadHeartbeatResult>> => {
    const res = await client.post('/api/v1/growth/effective-read/heartbeat', req, { signal }) as Result<any>
    return {
      ...res,
      data: res.data ? {
        accepted: Boolean(res.data.accepted),
        countingActive: Boolean(res.data.countingActive),
        nextHeartbeatSeq: Math.max(1, toNumber(res.data.nextHeartbeatSeq, req.heartbeatSeq)),
        activeSeconds: Math.max(0, toNumber(res.data.activeSeconds)),
        maxScrollPercent: Math.max(0, Math.min(100, toNumber(res.data.maxScrollPercent))),
        qualified: Boolean(res.data.qualified),
        completed: Boolean(res.data.completed),
        expiresAt: res.data.expiresAt ? new Date(res.data.expiresAt).getTime() : undefined,
      } : null,
    }
  },

  completeEffectiveRead: async (
    req: EffectiveReadCompleteReq,
    signal?: AbortSignal,
  ): Promise<Result<EffectiveReadCompleteResult>> => {
    const res = await client.post('/api/v1/growth/effective-read/complete', req, { signal }) as Result<any>
    return {
      ...res,
      data: res.data ? {
        recorded: Boolean(res.data.recorded),
        completed: Boolean(res.data.completed ?? res.data.recorded),
        activeSeconds: Math.max(0, toNumber(res.data.activeSeconds)),
        maxScrollPercent: Math.max(0, Math.min(100, toNumber(res.data.maxScrollPercent))),
      } : null,
    }
  },

  abandonEffectiveRead: async (
    req: EffectiveReadAbandonReq,
    options: EffectiveReadAbandonOptions = {},
  ): Promise<Result<EffectiveReadAbandonResult>> => {
    const res = await client.post('/api/v1/growth/effective-read/abandon', req, {
      ...(options.keepalive
        ? {
            adapter: 'fetch',
            fetchOptions: { keepalive: true },
          }
        : {}),
      skipAuthRedirect: true,
    }) as Result<any>
    return {
      ...res,
      data: res.data ? {
        abandoned: Boolean(res.data.abandoned),
      } : null,
    }
  },

  getProfile: async (days = 30): Promise<Result<GrowthProfile>> => {
    try {
      const res = await client.get('/api/v1/growth/profile', {
        params: { days },
      }) as Result<any>
      const data = res.data ? adaptGrowthProfile(res.data) : null
      const adapted = withRemoteResultProvenance({
        ...res,
        data,
      })
      return res.data && !isGrowthProfilePathPayloadShape(res.data)
        ? {
            ...adapted,
            degraded: true,
            fallbackReason: 'malformed_growth_profile',
          }
        : adapted
    } catch (error) {
      if (shouldUseDemoFallback(error)) {
        const { demoGrowthProfile, isLocalDemoSeedAllowed } = await loadDemoSeeds()
        if (!isLocalDemoSeedAllowed()) throw error
        return localDemoResult({ ...demoGrowthProfile, days })
      }
      if (isBackendNotFound(error)) {
        return {
          code: 0,
          message: 'growth_profile_backend_not_connected',
          data: emptyGrowthProfile(days),
          source: 'unavailable',
          degraded: true,
          fallbackReason: 'backend_not_connected',
        }
      }
      throw error
    }
  },

  getReport: async (period: 'weekly' | 'monthly' = 'weekly'): Promise<Result<GrowthReport>> => {
    try {
      const res = await client.get('/api/v1/growth/report', {
        params: { period },
      }) as Result<any>
      const data = res.data ? adaptGrowthReport(res.data) : null
      return withRemoteResultProvenance({
        ...res,
        data,
      })
    } catch (error) {
      if (shouldUseDemoFallback(error)) {
        const { demoGrowthReport, isLocalDemoSeedAllowed } = await loadDemoSeeds()
        if (!isLocalDemoSeedAllowed()) throw error
        return localDemoResult({ ...demoGrowthReport, period })
      }
      if (isBackendNotFound(error)) {
        return {
          code: 0,
          message: 'growth_report_backend_not_connected',
          data: emptyGrowthReport(period),
          source: 'unavailable',
          degraded: true,
          fallbackReason: 'backend_not_connected',
        }
      }
      throw error
    }
  },
}
