import client, { Result } from './client'
import type { Post, PaginatedResponse } from './types'

export const feedApi = {
  getFollowing: (cursor?: string, size = 20): Promise<Result<PaginatedResponse<Post>>> =>
    client.get('/api/v1/feeds/following', { params: { cursor, size } }),

  getRecommend: (cursor?: string, size = 20): Promise<Result<PaginatedResponse<Post>>> =>
    client.get('/api/v1/feeds/recommend', { params: { cursor, size } }),

  getLatest: (cursor?: string, size = 20): Promise<Result<PaginatedResponse<Post>>> =>
    client.get('/api/v1/feeds/latest', { params: { cursor, size } }),

  getHot: (cursor?: string, size = 20): Promise<Result<PaginatedResponse<Post>>> =>
    client.get('/api/v1/feeds/hot', { params: { cursor, size } }),
}
