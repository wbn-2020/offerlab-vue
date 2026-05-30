import client, { Result } from './client'
import type { ApiId, PaginatedResponse, Post, PostReport, PostReportReq, PostReportReviewReq, PostVersionHistory, Tag } from './types'
import { adaptPage, adaptPost, adaptPostReport, adaptPostVersionHistory, adaptTag } from './adapters'

export interface PostCreateReq {
  postType: number
  title: string
  content: string
  coverUrl?: string
  visibility?: number
  extJson?: string
  tagIds?: ApiId[]
  tagNames?: string[]
  draftId?: ApiId
}

export interface PostUpdateReq {
  title?: string
  content?: string
  coverUrl?: string
  visibility?: number
  extJson?: string
  tagIds?: ApiId[]
  tagNames?: string[]
  draftId?: ApiId
}

export interface PostCreateResult {
  postId: ApiId
  reviewRequired?: boolean
}

export interface PostDraft {
  id: ApiId
  uid: ApiId
  sourcePostId?: ApiId
  postType: number
  title?: string
  content?: string
  coverUrl?: string
  visibility?: number
  extJson?: string
  tagIds: ApiId[]
  tagNames: string[]
  createTime?: string
  updateTime?: string
}

export interface PostDraftReq {
  id?: ApiId
  sourcePostId?: ApiId
  postType?: number
  title?: string
  content?: string
  coverUrl?: string
  visibility?: number
  extJson?: string
  tagIds?: ApiId[]
  tagNames?: string[]
}

function adaptPostDraft(raw: any): PostDraft {
  return {
    id: String(raw?.id ?? ''),
    uid: String(raw?.uid ?? ''),
    sourcePostId: raw?.sourcePostId ? String(raw.sourcePostId) : undefined,
    postType: Number(raw?.postType ?? 1),
    title: raw?.title || undefined,
    content: raw?.content || undefined,
    coverUrl: raw?.coverUrl || undefined,
    visibility: raw?.visibility,
    extJson: raw?.extJson || undefined,
    tagIds: Array.isArray(raw?.tagIds) ? raw.tagIds.map(String) : [],
    tagNames: Array.isArray(raw?.tagNames) ? raw.tagNames.map(String) : [],
    createTime: raw?.createTime,
    updateTime: raw?.updateTime,
  }
}

export const postApi = {
  create: (req: PostCreateReq): Promise<Result<PostCreateResult>> =>
    client.post('/api/v1/posts', req),

  getDetail: async (postId: ApiId): Promise<Result<Post>> => {
    const res = await client.get(`/api/v1/posts/${postId}`) as Result<any>
    return { ...res, data: res.data ? adaptPost(res.data) : null }
  },


  listVersions: async (postId: ApiId, limit = 10): Promise<Result<PostVersionHistory[]>> => {
    const res = await client.get(`/api/v1/posts/${postId}/versions`, { params: { limit } }) as Result<any>
    return { ...res, data: Array.isArray(res.data) ? res.data.map(adaptPostVersionHistory) : [] }
  },
  update: (postId: ApiId, req: PostUpdateReq): Promise<Result<PostCreateResult>> =>
    client.put(`/api/v1/posts/${postId}`, req),

  listDrafts: async (limit = 10): Promise<Result<PostDraft[]>> => {
    const res = await client.get('/api/v1/post-drafts', { params: { limit } }) as Result<any>
    return { ...res, data: Array.isArray(res.data) ? res.data.map(adaptPostDraft) : [] }
  },

  getDraft: async (id: ApiId): Promise<Result<PostDraft>> => {
    const res = await client.get(`/api/v1/post-drafts/${id}`) as Result<any>
    return { ...res, data: res.data ? adaptPostDraft(res.data) : null }
  },

  getLatestDraftBySourcePost: async (sourcePostId: ApiId): Promise<Result<PostDraft>> => {
    const res = await client.get('/api/v1/post-drafts/latest', { params: { sourcePostId } }) as Result<any>
    return { ...res, data: res.data ? adaptPostDraft(res.data) : null }
  },

  saveDraft: async (req: PostDraftReq): Promise<Result<PostDraft>> => {
    const res = req.id
      ? await client.put(`/api/v1/post-drafts/${req.id}`, req) as Result<any>
      : await client.post('/api/v1/post-drafts', req) as Result<any>
    return { ...res, data: res.data ? adaptPostDraft(res.data) : null }
  },

  deleteDraft: (id: ApiId): Promise<Result<{ id: ApiId; deleted: boolean }>> =>
    client.delete(`/api/v1/post-drafts/${id}`),

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
