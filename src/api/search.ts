import client, { Result } from './client'
import type { Post, PaginatedResponse } from './types'

export interface SearchParams {
  q?: string
  company?: string
  position?: string
  yearsOfExp?: number
  sort?: 'relevance' | 'latest' | 'hot'
  cursor?: string
  size?: number
}

export const searchApi = {
  searchPosts: (params: SearchParams): Promise<Result<PaginatedResponse<Post>>> =>
    client.get('/api/v1/search/posts', { params }),

  suggest: (q: string): Promise<Result<any>> =>
    client.get('/api/v1/search/suggest', { params: { q } }),

  hotSearches: (): Promise<Result<string[]>> =>
    client.get('/api/v1/search/hot'),
}
