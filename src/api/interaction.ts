import client, { Result } from './client'
import type { ApiId, Comment, PaginatedResponse } from './types'
import { adaptComment, adaptPage } from './adapters'

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

  comment: (postId: ApiId, content: string, parentId?: ApiId): Promise<Result<any>> =>
    client.post(`/api/v1/posts/${postId}/comments`, { content, parentId }),

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
}
