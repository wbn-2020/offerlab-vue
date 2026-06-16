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

export interface TrendDashboard {
  range: TrendRange
  days: number
  totalPosts: number
  featuredPosts?: number
  activeAuthors?: number
  publishTrend: TrendPoint[]
  topCompanies: RankedMetric[]
  topTags: RankedMetric[]
  contentTypeDistribution?: RankedMetric[]
  featuredContent?: RankedMetric[]
  positionDistribution: RankedMetric[]
  resultDistribution: RankedMetric[]
}

export const dashboardApi = {
  getTrendDashboard: (range?: TrendRange): Promise<Result<TrendDashboard>> =>
    client.get('/api/v1/dashboard/trend', { params: { range } }),

  getPersonalDashboard: (): Promise<Result<any>> =>
    client.get('/api/v1/dashboard/me'),
}
