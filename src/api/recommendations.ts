import client, { type Result } from './client'
import { adaptPage, adaptPost } from './adapters'
import type { CrossDomainRecommendation, PaginatedResponse } from './types'

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
  recommendationReason: safeText(raw?.recommendationReason, 'Based on your recent community activity.'),
  degraded: Boolean(raw?.degraded),
})

export const recommendationsApi = {
  listCrossDomain: async (cursor?: string, size = 6): Promise<Result<PaginatedResponse<CrossDomainRecommendation>>> => {
    const res = await client.get('/api/v1/recommendations/cross-domain', {
      params: { cursor, size },
      skipAuthRedirect: true,
    }) as Result<any>
    return {
      ...res,
      data: res.data ? adaptPage(res.data, adaptCrossDomainRecommendation) : null,
    }
  },
}
