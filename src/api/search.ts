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

export const searchApi = {
  searchPosts: async (params: SearchParams): Promise<Result<PaginatedResponse<Post>>> => {
    const res = await client.get('/api/v1/search/posts', { params }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
  },

  suggest: (q: string): Promise<Result<any>> =>
    client.get('/api/v1/search/suggest', { params: { prefix: q } }),

  hotSearches: (): Promise<Result<string[]>> =>
    client.get('/api/v1/search/hot'),
}
