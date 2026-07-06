import client, { type Result } from './client'
import { adaptDistributionPage, adaptPost } from './adapters'
import type { CrossDomainRecommendation, PaginatedResponse } from './types'
import { filterDistributionPosts, neutralizeHighRiskRecommendationReason, normalizeRecommendationReason } from '@/utils/recommendationGovernance'

const safeText = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const next = value.trim()
  return next || fallback
}

const adaptCrossDomainRecommendation = (raw: any): CrossDomainRecommendation => ({
  item: {
    post: raw?.item?.post ? adaptPost(raw.item.post) : null,
  },
  sourceDomain: raw?.sourceDomain == null ? undefined : Number(raw.sourceDomain),
  sourceDomainName: safeText(raw?.sourceDomainName),
  targetDomain: raw?.targetDomain == null ? undefined : Number(raw.targetDomain),
  targetDomainName: safeText(raw?.targetDomainName),
  recommendationReason: neutralizeHighRiskRecommendationReason(
    normalizeRecommendationReason(safeText(raw?.recommendationReason, '近期社区互动热度较高')),
    raw?.item?.post,
  ),
  degraded: Boolean(raw?.degraded),
})

const isVisibleCrossDomainRecommendation = (raw: any) => filterDistributionPosts(raw?.item?.post ? [raw.item.post] : []).length > 0

export const recommendationsApi = {
  listCrossDomain: async (cursor?: string, size = 6): Promise<Result<PaginatedResponse<CrossDomainRecommendation>>> => {
    const res = await client.get('/api/v1/recommendations/cross-domain', {
      params: { cursor, size },
      skipAuthRedirect: true,
    }) as Result<any>
    return {
      ...res,
      data: res.data
        ? adaptDistributionPage({
            ...res.data,
            items: (Array.isArray(res.data.items) ? res.data.items : []).filter(isVisibleCrossDomainRecommendation),
          }, adaptCrossDomainRecommendation)
        : null,
    }
  },
}
