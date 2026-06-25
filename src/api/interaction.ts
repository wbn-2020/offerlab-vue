import client, { Result } from './client'
import type { ApiId, Comment, CommentReport, PaginatedResponse, PostReportReq, PostReportReviewReq } from './types'
import { adaptComment, adaptCommentReport, adaptPage } from './adapters'

export interface CommentCreateResult {
  commentId: ApiId
  reviewRequired?: boolean
}

export const interactionApi = {
  like: (postId: ApiId): Promise<Result<{ liked: boolean; likeCount?: number }>> =>
    client.post(`/api/v1/posts/${postId}/like`),

  unlike: (postId: ApiId): Promise<Result<{ liked: boolean; likeCount?: number }>> =>
    client.delete(`/api/v1/posts/${postId}/like`),

  favorite: (postId: ApiId): Promise<Result<{ favorited: boolean }>> =>
    client.post(`/api/v1/posts/${postId}/favorite`),

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
