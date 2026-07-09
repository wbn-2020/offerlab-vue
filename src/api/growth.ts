import client, { BizException, type Result } from './client'
import { adaptId } from './adapters'
import type {
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

export const growthApi = {
  getProfile: async (days = 30): Promise<Result<GrowthProfile>> => {
    try {
      const res = await client.get('/api/v1/growth/profile', {
        params: { days },
      }) as Result<any>
      const data = res.data ? adaptGrowthProfile(res.data) : null
      return {
        ...res,
        data,
      }
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
      return {
        ...res,
        data,
      }
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
        }
      }
      throw error
    }
  },
}
