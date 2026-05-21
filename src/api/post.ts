import client, { Result } from './client'
import type { ApiId, Post, PaginatedResponse, Tag } from './types'
import { adaptPage, adaptPost, adaptTag } from './adapters'

export interface PostCreateReq {
  postType: number
  title: string
  content: string
  coverUrl?: string
  visibility?: number
  extJson?: string
  tagIds?: ApiId[]
}

export interface PostUpdateReq {
  title?: string
  content?: string
  coverUrl?: string
  visibility?: number
  extJson?: string
  tagIds?: ApiId[]
}

export const postApi = {
  create: (req: PostCreateReq): Promise<Result<{ postId: number }>> =>
    client.post('/api/v1/posts', req),

  getDetail: async (postId: ApiId): Promise<Result<Post>> => {
    const res = await client.get(`/api/v1/posts/${postId}`) as Result<any>
    return { ...res, data: res.data ? adaptPost(res.data) : null }
  },

  update: (postId: ApiId, req: PostUpdateReq): Promise<Result<Post>> =>
    client.put(`/api/v1/posts/${postId}`, req),

  delete: (postId: ApiId): Promise<Result<void>> =>
    client.delete(`/api/v1/posts/${postId}`),

  list: async (params: {
    authorId?: ApiId
    tagId?: ApiId
    tag?: ApiId
    type?: number
    cursor?: string
    size?: number
  }): Promise<Result<PaginatedResponse<Post>>> => {
    const res = await client.get('/api/v1/posts', { params }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
  },

  getTags: async (): Promise<Result<Tag[]>> => {
    const res = await client.get('/api/v1/tags') as Result<any>
    return { ...res, data: Array.isArray(res.data) ? res.data.map(adaptTag) : [] }
  },

  getTagPosts: async (tagId: ApiId, cursor?: string, size = 20): Promise<Result<PaginatedResponse<Post>>> => {
    const res = await client.get(`/api/v1/tags/${tagId}/posts`, { params: { cursor, size } }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
  },

  getMyFavorites: async (cursor?: string, size = 20): Promise<Result<PaginatedResponse<Post>>> => {
    const res = await client.get('/api/v1/users/me/favorite-posts', { params: { cursor, size } }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
  },

  getMyLikedPosts: async (cursor?: string, size = 20): Promise<Result<PaginatedResponse<Post>>> => {
    const res = await client.get('/api/v1/users/me/liked-posts', { params: { cursor, size } }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
  },
}
