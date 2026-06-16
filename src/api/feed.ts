import client, { Result } from './client'
import type { Post, PaginatedResponse } from './types'
import { adaptPage, adaptPost } from './adapters'

async function getFeed(path: string, cursor?: string, size = 20): Promise<Result<PaginatedResponse<Post>>> {
  const res = await client.get(path, { params: { cursor, size } }) as Result<any>
  return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
}

export const feedApi = {
  getFollowing: (cursor?: string, size = 20): Promise<Result<PaginatedResponse<Post>>> =>
    getFeed('/api/v1/feeds/following', cursor, size),

  getRecommend: (cursor?: string, size = 20): Promise<Result<PaginatedResponse<Post>>> =>
    getFeed('/api/v1/feeds/recommend', cursor, size),

  getLatest: (cursor?: string, size = 20): Promise<Result<PaginatedResponse<Post>>> =>
    getFeed('/api/v1/feeds/latest', cursor, size),

  getHot: (cursor?: string, size = 20): Promise<Result<PaginatedResponse<Post>>> =>
    getFeed('/api/v1/feeds/hot', cursor, size),

  getFeatured: async (cursor?: string, size = 20): Promise<Result<PaginatedResponse<Post>>> => {
    const res = await client.get('/api/v1/posts', { params: { cursor, size, featured: true } }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
  },

  recordFeedback: (postId: string | number, reason: string, action = 'not_interested'): Promise<Result<void>> =>
    client.post('/api/v1/feeds/feedback', { postId, action, reason }),
}
