import client, { Result } from './client'

export const interactionApi = {
  like: (postId: number): Promise<Result<{ liked: boolean; likeCount: number }>> =>
    client.post(`/api/v1/posts/${postId}/like`),

  unlike: (postId: number): Promise<Result<{ liked: boolean; likeCount: number }>> =>
    client.delete(`/api/v1/posts/${postId}/like`),

  favorite: (postId: number): Promise<Result<{ favorited: boolean }>> =>
    client.post(`/api/v1/posts/${postId}/favorite`),

  unfavorite: (postId: number): Promise<Result<{ favorited: boolean }>> =>
    client.delete(`/api/v1/posts/${postId}/favorite`),

  comment: (postId: number, content: string, parentId?: number): Promise<Result<any>> =>
    client.post(`/api/v1/posts/${postId}/comments`, { content, parentId }),

  getComments: (postId: number, cursor?: string, size = 20): Promise<Result<any>> =>
    client.get(`/api/v1/posts/${postId}/comments`, { params: { cursor, size } }),

  deleteComment: (commentId: number): Promise<Result<void>> =>
    client.delete(`/api/v1/comments/${commentId}`),

  likeComment: (commentId: number): Promise<Result<any>> =>
    client.post(`/api/v1/comments/${commentId}/like`),
}
