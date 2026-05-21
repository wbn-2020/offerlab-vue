import client, { Result } from './client'
import type { Post, PaginatedResponse } from './types'
import { adaptPage, adaptPost } from './adapters'

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
  operatorUid?: number
  accepted: boolean
  indexed: number
  failed: number
  total: number
  indexName?: string
  message?: string
  createdAt?: string
  updatedAt?: string
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

  rebuildIndex: (): Promise<Result<SearchIndexTask>> =>
    client.post('/api/v1/search/admin/rebuild'),

  getRebuildTask: (taskId: string): Promise<Result<SearchIndexTask>> =>
    client.get(`/api/v1/search/admin/tasks/${taskId}`),
}
