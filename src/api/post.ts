import client, { BizException, Result } from './client'
import type { ApiId, CommunityTopic, ContentTypeOption, PaginatedResponse, Post, PostPublishStatus, PostReport, PostReportReq, PostReportReviewReq, PostVersionHistory, Tag } from './types'
import { adaptCommunityTopic, adaptPage, adaptPost, adaptPostReport, adaptPostVersionHistory, adaptTag, adaptTime } from './adapters'
import { safeVisibleText, sanitizeVisibleText } from '@/utils/textQuality'

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
    title: sanitizeVisibleText(raw?.title) || undefined,
    content: sanitizeVisibleText(raw?.content) || undefined,
    coverUrl: raw?.coverUrl || undefined,
    visibility: raw?.visibility,
    extJson: raw?.extJson || undefined,
    tagIds: Array.isArray(raw?.tagIds) ? raw.tagIds.map(String) : [],
    tagNames: Array.isArray(raw?.tagNames) ? raw.tagNames.map((item: unknown) => safeVisibleText(item, '未归类主题')).filter(Boolean) : [],
    createTime: raw?.createTime,
    updateTime: raw?.updateTime,
  }
}

export interface CommunityTopicReq {
  slug?: string
  name?: string
  description?: string
  topicType?: string
  coverUrl?: string
  sortOrder?: number
  featured?: boolean
  status?: number
  tagIds?: ApiId[]
  tagNames?: string[]
  note?: string
}

export interface TagGovernanceReq {
  name?: string
  tagType?: number
  status?: number
  recommended?: boolean
  mergeTargetId?: ApiId
  synonyms?: string[]
  note?: string
  confirmationPhrase?: string
}

export interface PostKnowledgeReviewReq {
  summary?: string
  faqJson?: string
  knowledgeCardJson?: string
  techStacks?: string[]
  suggestedTags?: string[]
  note?: string
}

export interface InterviewMaterialPack {
  id: ApiId
  uid: ApiId
  postId: ApiId
  sourcePostVersion?: number
  generationStatus?: string
  starSituation?: string
  starTask?: string
  starAction?: string
  starResult?: string
  resumeBullets: string[]
  followUpQuestions: string[]
  technicalHighlights: string[]
  missingHints: string[]
  userNote?: string
  savedToPrep: boolean
  provider?: string
  fallbackUsed?: boolean
  sourcePost?: Post
  createTime?: number
  updateTime?: number
}

export interface InterviewMaterialUpdateReq {
  starSituation?: string
  starTask?: string
  starAction?: string
  starResult?: string
  resumeBullets?: string[]
  followUpQuestions?: string[]
  technicalHighlights?: string[]
  missingHints?: string[]
  userNote?: string
}

const adaptStringList = (value: unknown): string[] => (
  Array.isArray(value)
    ? value.map((item) => sanitizeVisibleText(item)).filter(Boolean)
    : []
)

export function adaptInterviewMaterialPack(raw: any): InterviewMaterialPack {
  return {
    id: String(raw?.id ?? ''),
    uid: String(raw?.uid ?? ''),
    postId: String(raw?.postId ?? ''),
    sourcePostVersion: raw?.sourcePostVersion == null ? undefined : Number(raw.sourcePostVersion),
    generationStatus: sanitizeVisibleText(raw?.generationStatus) || undefined,
    starSituation: sanitizeVisibleText(raw?.starSituation) || undefined,
    starTask: sanitizeVisibleText(raw?.starTask) || undefined,
    starAction: sanitizeVisibleText(raw?.starAction) || undefined,
    starResult: sanitizeVisibleText(raw?.starResult) || undefined,
    resumeBullets: adaptStringList(raw?.resumeBullets),
    followUpQuestions: adaptStringList(raw?.followUpQuestions),
    technicalHighlights: adaptStringList(raw?.technicalHighlights),
    missingHints: adaptStringList(raw?.missingHints),
    userNote: sanitizeVisibleText(raw?.userNote) || undefined,
    savedToPrep: Boolean(raw?.savedToPrep),
    provider: sanitizeVisibleText(raw?.provider) || undefined,
    fallbackUsed: Boolean(raw?.fallbackUsed),
    sourcePost: raw?.sourcePost ? adaptPost(raw.sourcePost) : undefined,
    createTime: adaptTime(raw?.createTime),
    updateTime: adaptTime(raw?.updateTime),
  }
}

let serverDraftsAvailable = true

const emptyResult = <T>(data: T | null): Result<T> => ({
  code: 0,
  message: serverDraftsAvailable ? 'ok' : 'server drafts unavailable',
  data,
})

const shouldDisableServerDrafts = (error: unknown) => {
  if (error instanceof BizException) {
    return error.code === 10404 || error.code >= 20000
  }
  const status = (error as any)?.response?.status
  return status === 404 || status === 405 || status >= 500
}

const rememberDraftFailure = (error: unknown) => {
  if (shouldDisableServerDrafts(error)) {
    serverDraftsAvailable = false
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
    if (!serverDraftsAvailable) return emptyResult([])
    try {
      const res = await client.get('/api/v1/post-drafts', { params: { limit } }) as Result<any>
      return { ...res, data: Array.isArray(res.data) ? res.data.map(adaptPostDraft) : [] }
    } catch (error) {
      rememberDraftFailure(error)
      if (!serverDraftsAvailable) return emptyResult([])
      throw error
    }
  },

  getDraft: async (id: ApiId): Promise<Result<PostDraft>> => {
    if (!serverDraftsAvailable) return emptyResult<PostDraft>(null)
    try {
      const res = await client.get(`/api/v1/post-drafts/${id}`) as Result<any>
      return { ...res, data: res.data ? adaptPostDraft(res.data) : null }
    } catch (error) {
      rememberDraftFailure(error)
      if (!serverDraftsAvailable) return emptyResult<PostDraft>(null)
      throw error
    }
  },

  getLatestDraftBySourcePost: async (sourcePostId: ApiId): Promise<Result<PostDraft>> => {
    if (!serverDraftsAvailable) return emptyResult<PostDraft>(null)
    try {
      const res = await client.get('/api/v1/post-drafts/latest', { params: { sourcePostId } }) as Result<any>
      return { ...res, data: res.data ? adaptPostDraft(res.data) : null }
    } catch (error) {
      rememberDraftFailure(error)
      if (!serverDraftsAvailable) return emptyResult<PostDraft>(null)
      throw error
    }
  },

  saveDraft: async (req: PostDraftReq): Promise<Result<PostDraft>> => {
    if (!serverDraftsAvailable) {
      throw new BizException(20500, '服务端草稿暂不可用，已保留本地草稿')
    }
    try {
      const res = req.id
        ? await client.put(`/api/v1/post-drafts/${req.id}`, req) as Result<any>
        : await client.post('/api/v1/post-drafts', req) as Result<any>
      return { ...res, data: res.data ? adaptPostDraft(res.data) : null }
    } catch (error) {
      rememberDraftFailure(error)
      throw error
    }
  },

  deleteDraft: async (id: ApiId): Promise<Result<{ id: ApiId; deleted: boolean }>> => {
    if (!serverDraftsAvailable) {
      return emptyResult({ id, deleted: false })
    }
    try {
      return await client.delete(`/api/v1/post-drafts/${id}`)
    } catch (error) {
      rememberDraftFailure(error)
      if (!serverDraftsAvailable) return emptyResult({ id, deleted: false })
      throw error
    }
  },

  delete: (postId: ApiId): Promise<Result<void>> =>
    client.delete(`/api/v1/posts/${postId}`),

  list: async (params: {
    authorId?: ApiId
    tagId?: ApiId
    tag?: ApiId
    type?: number
    featured?: boolean
    includeTestData?: boolean
    cursor?: string
    size?: number
  }): Promise<Result<PaginatedResponse<Post>>> => {
    const res = await client.get('/api/v1/posts', { params }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
  },

  getContentTypes: async (): Promise<Result<ContentTypeOption[]>> => {
    const res = await client.get('/api/v1/posts/content-types') as Result<any>
    return { ...res, data: Array.isArray(res.data) ? res.data : [] }
  },

  getPublishStatus: async (postId: ApiId): Promise<Result<PostPublishStatus>> => {
    const res = await client.get(`/api/v1/search/posts/${postId}/publish-status`, { skipAuthRedirect: true }) as Result<any>
    return { ...res, data: res.data || null }
  },

  getInterviewMaterials: async (postId: ApiId): Promise<Result<InterviewMaterialPack>> => {
    const res = await client.get(`/api/v1/posts/${postId}/interview-materials`) as Result<any>
    return { ...res, data: res.data ? adaptInterviewMaterialPack(res.data) : null }
  },

  generateInterviewMaterials: async (postId: ApiId): Promise<Result<InterviewMaterialPack>> => {
    const res = await client.post(`/api/v1/posts/${postId}/interview-materials/generate`) as Result<any>
    return { ...res, data: res.data ? adaptInterviewMaterialPack(res.data) : null }
  },

  updateInterviewMaterial: async (id: ApiId, req: InterviewMaterialUpdateReq): Promise<Result<InterviewMaterialPack>> => {
    const res = await client.put(`/api/v1/interview-materials/${id}`, req) as Result<any>
    return { ...res, data: res.data ? adaptInterviewMaterialPack(res.data) : null }
  },

  saveInterviewMaterialToPrep: async (id: ApiId): Promise<Result<InterviewMaterialPack>> => {
    const res = await client.post(`/api/v1/interview-materials/${id}/save-to-prep`) as Result<any>
    return { ...res, data: res.data ? adaptInterviewMaterialPack(res.data) : null }
  },

  getTags: async (): Promise<Result<Tag[]>> => {
    const res = await client.get('/api/v1/tags') as Result<any>
    return { ...res, data: Array.isArray(res.data) ? res.data.map(adaptTag) : [] }
  },

  listAdminTags: async (params?: { status?: number; recommended?: boolean; keyword?: string; limit?: number }): Promise<Result<Tag[]>> => {
    const res = await client.get('/api/v1/tags/admin', { params }) as Result<any>
    return { ...res, data: Array.isArray(res.data) ? res.data.map(adaptTag) : [] }
  },

  updateTag: async (tagId: ApiId, req: TagGovernanceReq): Promise<Result<Tag>> => {
    const res = await client.put(`/api/v1/tags/admin/${tagId}`, req) as Result<any>
    return { ...res, data: res.data ? adaptTag(res.data) : null }
  },

  updateTagStatus: async (tagId: ApiId, status: number, note?: string): Promise<Result<Tag>> => {
    const res = await client.post(`/api/v1/tags/admin/${tagId}/status`, { status, note }) as Result<any>
    return { ...res, data: res.data ? adaptTag(res.data) : null }
  },

  updateTagRecommended: async (tagId: ApiId, recommended: boolean, note?: string): Promise<Result<Tag>> => {
    const res = await client.post(`/api/v1/tags/admin/${tagId}/recommend`, { recommended, note }) as Result<any>
    return { ...res, data: res.data ? adaptTag(res.data) : null }
  },

  updateTagSynonyms: async (tagId: ApiId, synonyms: string[], note?: string): Promise<Result<Tag>> => {
    const res = await client.post(`/api/v1/tags/admin/${tagId}/synonyms`, { synonyms, note }) as Result<any>
    return { ...res, data: res.data ? adaptTag(res.data) : null }
  },

  mergeTag: async (tagId: ApiId, mergeTargetId: ApiId, note?: string): Promise<Result<Tag>> => {
    const res = await client.post(`/api/v1/tags/admin/${tagId}/merge`, {
      mergeTargetId,
      note,
      confirmationPhrase: 'CONFIRM',
    }) as Result<any>
    return { ...res, data: res.data ? adaptTag(res.data) : null }
  },

  getTagPosts: async (tagId: ApiId, cursor?: string, size = 20, params?: { type?: number; featured?: boolean }): Promise<Result<PaginatedResponse<Post>>> => {
    const res = await client.get(`/api/v1/tags/${tagId}/posts`, { params: { cursor, size, ...params } }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
  },

  listTopics: async (params?: { featured?: boolean; limit?: number }): Promise<Result<CommunityTopic[]>> => {
    const res = await client.get('/api/v1/topics', { params }) as Result<any>
    return { ...res, data: Array.isArray(res.data) ? res.data.map(adaptCommunityTopic) : [] }
  },

  getTopic: async (slug: string): Promise<Result<CommunityTopic>> => {
    const res = await client.get(`/api/v1/topics/${encodeURIComponent(slug)}`) as Result<any>
    return { ...res, data: res.data ? adaptCommunityTopic(res.data) : null }
  },

  getTopicFollowStatus: async (slug: string): Promise<Result<CommunityTopic>> => {
    const res = await client.get(`/api/v1/topics/${encodeURIComponent(slug)}/follow-status`, { skipAuthRedirect: true }) as Result<any>
    return { ...res, data: res.data ? adaptCommunityTopic(res.data) : null }
  },

  followTopic: async (slug: string): Promise<Result<CommunityTopic>> => {
    const res = await client.post(`/api/v1/topics/${encodeURIComponent(slug)}/follow`) as Result<any>
    return { ...res, data: res.data ? adaptCommunityTopic(res.data) : null }
  },

  unfollowTopic: async (slug: string): Promise<Result<CommunityTopic>> => {
    const res = await client.delete(`/api/v1/topics/${encodeURIComponent(slug)}/follow`) as Result<any>
    return { ...res, data: res.data ? adaptCommunityTopic(res.data) : null }
  },

  listFollowingTopics: async (cursor?: string, size = 20): Promise<Result<PaginatedResponse<CommunityTopic>>> => {
    const res = await client.get('/api/v1/topics/me/following', { params: { cursor, size } }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptCommunityTopic) : null }
  },

  getTopicPosts: async (slug: string, cursor?: string, size = 20, params?: { type?: number; featured?: boolean }): Promise<Result<PaginatedResponse<Post>>> => {
    const res = await client.get(`/api/v1/topics/${encodeURIComponent(slug)}/posts`, { params: { cursor, size, ...params } }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
  },

  listAdminTopics: async (params?: { status?: number; keyword?: string; limit?: number }): Promise<Result<CommunityTopic[]>> => {
    const res = await client.get('/api/v1/topics/admin', { params }) as Result<any>
    return { ...res, data: Array.isArray(res.data) ? res.data.map(adaptCommunityTopic) : [] }
  },

  createTopic: async (req: CommunityTopicReq): Promise<Result<CommunityTopic>> => {
    const res = await client.post('/api/v1/topics/admin', req) as Result<any>
    return { ...res, data: res.data ? adaptCommunityTopic(res.data) : null }
  },

  updateTopic: async (topicId: ApiId, req: CommunityTopicReq): Promise<Result<CommunityTopic>> => {
    const res = await client.put(`/api/v1/topics/admin/${topicId}`, req) as Result<any>
    return { ...res, data: res.data ? adaptCommunityTopic(res.data) : null }
  },

  updateTopicStatus: async (topicId: ApiId, status: number, note?: string): Promise<Result<CommunityTopic>> => {
    const res = await client.post(`/api/v1/topics/admin/${topicId}/status`, { status, note }) as Result<any>
    return { ...res, data: res.data ? adaptCommunityTopic(res.data) : null }
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

  listAdminReports: async (params?: { status?: number; limit?: number; includeTestData?: boolean }): Promise<Result<PostReport[]>> => {
    const res = await client.get('/api/v1/posts/admin/reports', { params }) as Result<any>
    return { ...res, data: Array.isArray(res.data) ? res.data.map(adaptPostReport) : [] }
  },

  reviewAdminReport: (
    reportId: ApiId,
    req: PostReportReviewReq,
  ): Promise<Result<void>> =>
    client.post(`/api/v1/posts/admin/reports/${reportId}/review`, req),

  updateFeatured: (
    postId: ApiId,
    featured: boolean,
    note?: string,
  ): Promise<Result<{ postId: ApiId; featured: boolean; extJson?: string }>> =>
    client.post(`/api/v1/posts/admin/featured/${postId}`, { featured, note }),

  reviewKnowledge: (
    postId: ApiId,
    req: PostKnowledgeReviewReq,
  ): Promise<Result<{ postId: ApiId; extJson?: string; knowledgeReviewed?: boolean }>> =>
    client.post(`/api/v1/posts/admin/knowledge/${postId}/review`, req),
}
