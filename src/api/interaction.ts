import client, { Result } from './client'
import type { ApiId, Comment, CommentReport, PaginatedResponse, PostReportReq, PostReportReviewReq } from './types'
import { adaptComment, adaptCommentReport, adaptPage } from './adapters'

export interface CommentCreateResult {
  commentId: ApiId
  reviewRequired?: boolean
}

export interface FavoriteOrganizationTarget {
  id: 'read_later' | 'unorganized_favorites'
  title: string
  visibility: 'private'
  syncStatus: 'server_favorite_only' | 'local_demo_only'
}

export interface FavoriteOrganizationResult {
  favorited: boolean
  defaultTarget: FavoriteOrganizationTarget
  boundary: 'server_favorite_only'
  message: string
}

const readLaterTarget: FavoriteOrganizationTarget = {
  id: 'read_later',
  title: '稍后读',
  visibility: 'private',
  syncStatus: 'server_favorite_only',
}

export const interactionApi = {
  like: (postId: ApiId): Promise<Result<{ liked: boolean; likeCount?: number }>> =>
    client.post(`/api/v1/posts/${postId}/like`),

  unlike: (postId: ApiId): Promise<Result<{ liked: boolean; likeCount?: number }>> =>
    client.delete(`/api/v1/posts/${postId}/like`),

  favorite: (postId: ApiId): Promise<Result<{ favorited: boolean }>> =>
    client.post(`/api/v1/posts/${postId}/favorite`),

  favoriteToReadLater: async (postId: ApiId): Promise<Result<FavoriteOrganizationResult>> => {
    const res = await client.post(`/api/v1/posts/${postId}/favorite`) as Result<{ favorited: boolean }>
    return {
      ...res,
      data: {
        favorited: Boolean(res.data?.favorited ?? true),
        defaultTarget: readLaterTarget,
        boundary: 'server_favorite_only',
        message: '已收藏；稍后读只是当前收藏整理入口，独立清单后端未接入时不会跨设备同步。',
      },
    }
  },

  listFavoriteOrganizationTargets: async (): Promise<Result<FavoriteOrganizationTarget[]>> => ({
    code: 0,
    message: 'local_demo_only',
    data: [
      readLaterTarget,
      {
        id: 'unorganized_favorites',
        title: '未整理收藏',
        visibility: 'private',
        syncStatus: 'local_demo_only',
      },
    ],
  }),

  unfavorite: (postId: ApiId): Promise<Result<{ favorited: boolean }>> =>
    client.delete(`/api/v1/posts/${postId}/favorite`),

  getPostInteraction: (postId: ApiId): Promise<Result<{ liked: boolean; favorited: boolean }>> =>
    client.get(`/api/v1/posts/${postId}/interaction`),

  comment: (postId: ApiId, content: string, parentId?: ApiId, replyToUid?: ApiId): Promise<Result<CommentCreateResult>> =>
    client.post(`/api/v1/posts/${postId}/comments`, { content, parentId, replyToUid }),

  getComments: async (postId: ApiId, cursor?: string, size = 20): Promise<Result<PaginatedResponse<Comment>>> => {
    const res = await client.get(`/api/v1/posts/${postId}/comments`, { params: { cursor, size } }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptComment) : null }
  },

  deleteComment: (commentId: ApiId): Promise<Result<void>> =>
    client.delete(`/api/v1/comments/${commentId}`),

  likeComment: (commentId: ApiId): Promise<Result<any>> =>
    client.post(`/api/v1/comments/${commentId}/like`),

  unlikeComment: (commentId: ApiId): Promise<Result<any>> =>
    client.delete(`/api/v1/comments/${commentId}/like`),

  reportComment: (commentId: ApiId, req: PostReportReq): Promise<Result<{ reportId?: ApiId }>> =>
    client.post(`/api/v1/comments/${commentId}/reports`, req),

  listAdminCommentReports: async (params?: { status?: number; domain?: number; limit?: number; includeTestData?: boolean }): Promise<Result<CommentReport[]>> => {
    const res = await client.get('/api/v1/comments/admin/reports', { params }) as Result<any>
    return { ...res, data: Array.isArray(res.data) ? res.data.map(adaptCommentReport) : [] }
  },

  reviewAdminCommentReport: (
    reportId: ApiId,
    req: PostReportReviewReq,
  ): Promise<Result<void>> =>
    client.post(`/api/v1/comments/admin/reports/${reportId}/review`, req),
}
