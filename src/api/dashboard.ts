import client, { Result } from './client'

export type TrendRange = '7d' | '30d' | '90d'

export interface RankedMetric {
  name: string
  count: number
  percentage?: number
}

export interface TrendPoint {
  label: string
  count: number
}

export interface DomainComparisonMetric {
  domain: number
  name: string
  postCount: number
  featuredCount: number
  activeAuthors: number
  share: number
  featuredRate: number
  topTags?: RankedMetric[]
  hotContent?: RankedMetric[]
}

export interface TrendDashboard {
  range: TrendRange
  activeDomain?: number | null
  days: number
  totalPosts: number
  featuredPosts?: number
  activeAuthors?: number
  publishTrend: TrendPoint[]
  topCompanies: RankedMetric[]
  topTags: RankedMetric[]
  domainDistribution?: RankedMetric[]
  domainComparison?: DomainComparisonMetric[]
  domainHotContent?: RankedMetric[]
  contentTypeDistribution?: RankedMetric[]
  featuredContent?: RankedMetric[]
  positionDistribution: RankedMetric[]
  resultDistribution: RankedMetric[]
}

export const dashboardApi = {
  getTrendDashboard: (range?: TrendRange, domain?: number): Promise<Result<TrendDashboard>> => {
    const params: { range?: TrendRange; domain?: number } = { range }
    if (domain != null) {
      params.domain = domain
    }
    return client.get('/api/v1/dashboard/trend', { params })
  },

  getPersonalDashboard: (): Promise<Result<any>> =>
    client.get('/api/v1/dashboard/me'),
}
