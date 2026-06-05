import client, { Result } from './client'
import type { ApiId, Post, PaginatedResponse } from './types'
import { adaptPage, adaptPost } from './adapters'

const cleanRemark = (remark?: string | null) => {
  const value = remark?.trim()
  return value ? { remark: value } : undefined
}

export interface SearchParams {
  q?: string
  company?: string
  position?: string
  type?: number
  yearsOfExp?: number
  sort?: 'relevance' | 'latest' | 'hot'
  cursor?: string
  size?: number
}

export interface SearchStatus {
  enabled: boolean
  available: boolean
  indexName: string
  indexExists: boolean
  indexReady: boolean
}

export interface SearchIndexTask {
  taskId: string
  type: string
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  operatorUid?: ApiId
  accepted: boolean
  indexed: number
  failed: number
  total: number
  indexName?: string
  message?: string
  createdAt?: string
  updatedAt?: string
}

export interface SearchAnalyticsTrackReq {
  eventType: 'PREP_CLICK'
  keyword?: string
  company?: string
}

export const searchApi = {
  searchPosts: async (params: SearchParams): Promise<Result<PaginatedResponse<Post>>> => {
    const res = await client.get('/api/v1/search/posts', { params }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
  },

  suggest: (q: string): Promise<Result<any>> =>
    client.get('/api/v1/search/suggest', { params: { prefix: q } }),

  hotSearches: (): Promise<Result<string[]>> =>
    client.get('/api/v1/search/hot'),

  status: (): Promise<Result<SearchStatus>> =>
    client.get('/api/v1/search/status'),

  rebuildIndex: (remark?: string): Promise<Result<SearchIndexTask>> =>
    client.post('/api/v1/search/admin/rebuild', cleanRemark(remark)),

  getRebuildTask: (taskId: string): Promise<Result<SearchIndexTask>> =>
    client.get(`/api/v1/search/admin/tasks/${taskId}`),

  listRebuildTasks: (limit = 10): Promise<Result<SearchIndexTask[]>> =>
    client.get('/api/v1/search/admin/tasks', { params: { limit } }),

  trackAnalytics: (data: SearchAnalyticsTrackReq): Promise<Result<{ tracked: boolean }>> =>
    client.post('/api/v1/search/analytics/track', data),
}
