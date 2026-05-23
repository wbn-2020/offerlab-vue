import client, { Result } from './client'
import type { ApiId, PaginatedResponse, Post, PostReport, PostReportReq, PostReportReviewReq, Tag } from './types'
import { adaptPage, adaptPost, adaptPostReport, adaptTag } from './adapters'

export interface PostCreateReq {
  postType: number
  title: string
  content: string
  coverUrl?: string
  visibility?: number
  extJson?: string
  tagIds?: ApiId[]
  tagNames?: string[]
}

export interface PostUpdateReq {
  title?: string
  content?: string
  coverUrl?: string
  visibility?: number
  extJson?: string
  tagIds?: ApiId[]
  tagNames?: string[]
}

export const postApi = {
  create: (req: PostCreateReq): Promise<Result<{ postId: ApiId }>> =>
    client.post('/api/v1/posts', req),

  getDetail: async (postId: ApiId): Promise<Result<Post>> => {
    const res = await client.get(`/api/v1/posts/${postId}`) as Result<any>
    return { ...res, data: res.data ? adaptPost(res.data) : null }
  },

  update: (postId: ApiId, req: PostUpdateReq): Promise<Result<void>> =>
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

  report: (postId: ApiId, req: PostReportReq): Promise<Result<{ reportId?: ApiId }>> =>
    client.post(`/api/v1/posts/${postId}/reports`, req),

  listAdminReports: async (params?: { status?: number; limit?: number }): Promise<Result<PostReport[]>> => {
    const res = await client.get('/api/v1/posts/admin/reports', { params }) as Result<any>
    return { ...res, data: Array.isArray(res.data) ? res.data.map(adaptPostReport) : [] }
  },

  reviewAdminReport: (
    reportId: ApiId,
    req: PostReportReviewReq,
  ): Promise<Result<void>> =>
    client.post(`/api/v1/posts/admin/reports/${reportId}/review`, req),
}
