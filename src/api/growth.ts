import client, { type Result } from './client'
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

export const growthApi = {
  getProfile: async (days = 30): Promise<Result<GrowthProfile>> => {
    const res = await client.get('/api/v1/growth/profile', {
      params: { days },
      skipAuthRedirect: true,
    }) as Result<any>
    return {
      ...res,
      data: res.data ? adaptGrowthProfile(res.data) : null,
    }
  },

  getReport: async (period: 'weekly' | 'monthly' = 'weekly'): Promise<Result<GrowthReport>> => {
    const res = await client.get('/api/v1/growth/report', {
      params: { period },
      skipAuthRedirect: true,
    }) as Result<any>
    return {
      ...res,
      data: res.data ? adaptGrowthReport(res.data) : null,
    }
  },
}
