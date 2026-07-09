import client, { Result } from './client'
import type { Post, PaginatedResponse } from './types'
import { adaptPage, adaptPost } from './adapters'

export type FeedFeedbackAction = 'not_interested' | 'less_like_this' | 'hide_author' | 'more_like_this'
type BackendFeedFeedbackAction = 'not_interested' | 'less_like_this' | 'hide_author' | 'more_like_this'

const feedbackPayload = (action: FeedFeedbackAction, reason: string) => {
  const normalizedReason = reason || action
  return {
    action: action as BackendFeedFeedbackAction,
    reason: action === 'not_interested' ? normalizedReason : `${action}:${normalizedReason}`,
  }
}

async function getFeed(path: string, cursor?: string, size = 20, domain?: number): Promise<Result<PaginatedResponse<Post>>> {
  const params: Record<string, unknown> = { cursor, size }
  if (domain != null) params.domain = domain
  const res = await client.get(path, { params }) as Result<any>
  return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
}

export const feedApi = {
  getFollowing: (cursor?: string, size = 20, domain?: number): Promise<Result<PaginatedResponse<Post>>> =>
    getFeed('/api/v1/feeds/following', cursor, size, domain),

  getRecommend: (cursor?: string, size = 20, domain?: number): Promise<Result<PaginatedResponse<Post>>> =>
    getFeed('/api/v1/feeds/recommend', cursor, size, domain),

  getLatest: (cursor?: string, size = 20, domain?: number): Promise<Result<PaginatedResponse<Post>>> =>
    getFeed('/api/v1/feeds/latest', cursor, size, domain),

  getHot: (cursor?: string, size = 20, domain?: number): Promise<Result<PaginatedResponse<Post>>> =>
    getFeed('/api/v1/feeds/hot', cursor, size, domain),

  getFeatured: async (cursor?: string, size = 20, domain?: number): Promise<Result<PaginatedResponse<Post>>> => {
    const params: Record<string, unknown> = { cursor, size, featured: true }
    if (domain != null) params.domain = domain
    const res = await client.get('/api/v1/posts', { params }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
  },

  recordFeedback: (postId: string | number, action: FeedFeedbackAction = 'not_interested', reason = ''): Promise<Result<void>> => {
    const payload = feedbackPayload(action, reason)
    return client.post('/api/v1/feeds/feedback', { postId, ...payload })
  },
}
