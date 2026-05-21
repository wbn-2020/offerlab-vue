import client, { Result } from './client'
import type { Post, PaginatedResponse } from './types'

export interface PostCreateReq {
  postType: number
  title: string
  content: string
  tags: number[]
  extension?: Record<string, any>
}

export interface PostUpdateReq {
  title?: string
  content?: string
  tags?: number[]
  extension?: Record<string, any>
}

export const postApi = {
  create: (req: PostCreateReq): Promise<Result<{ postId: number }>> =>
    client.post('/api/v1/posts', req),

  getDetail: (postId: number): Promise<Result<Post>> =>
    client.get(`/api/v1/posts/${postId}`),

  update: (postId: number, req: PostUpdateReq): Promise<Result<Post>> =>
    client.put(`/api/v1/posts/${postId}`, req),

  delete: (postId: number): Promise<Result<void>> =>
    client.delete(`/api/v1/posts/${postId}`),

  list: (params: {
    author?: number
    tag?: number
    type?: number
    cursor?: string
    size?: number
  }): Promise<Result<PaginatedResponse<Post>>> =>
    client.get('/api/v1/posts', { params }),

  getTags: (): Promise<Result<any[]>> =>
    client.get('/api/v1/tags'),

  getTagPosts: (tagId: number, cursor?: string, size = 20): Promise<Result<PaginatedResponse<Post>>> =>
    client.get(`/api/v1/tags/${tagId}/posts`, { params: { cursor, size } }),
}
