import client, { Result } from './client'
import type { ApiId, Comment, CommentReport, CommentSort, ContactRequest, ContactRequestCreateReq, ContactRequestSettings, ContactRequestStatus, DiscussionFollowStatus, FavoriteFolder, FavoriteFolderCreateReq, FavoriteFolderUpdateReq, FavoriteMoveReq, PaginatedResponse, Post, PostReportReq, PostReportReviewReq, UserReportReceipt, UserReportSourceType, UserReportStatus } from './types'
import { adaptComment, adaptCommentReport, adaptContactRequest, adaptContactRequestSettings, adaptFavoriteFolder, adaptPage, adaptPost, adaptUserReportReceipt } from './adapters'
export type { ContactRequestCreateReq, ContactRequestScene, ContactRequestSourceType } from './types'

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

export interface CommentListParams {
  cursor?: string
  size?: number
  sort?: CommentSort
}

export interface UserReportListParams {
  sourceType?: UserReportSourceType
  status?: UserReportStatus
  cursor?: string
  limit?: number
}

export interface FavoriteFolderPostListParams {
  cursor?: string
  size?: number
}

export interface ContactRequestListParams {
  status?: ContactRequestStatus | string
  cursor?: string
  limit?: number
}

const readLaterTarget: FavoriteOrganizationTarget = {
  id: 'read_later',
  title: '稍后读',
  visibility: 'private',
  syncStatus: 'server_favorite_only',
}

const adaptDiscussionFollowStatus = (raw: any, postId: ApiId): DiscussionFollowStatus => ({
  postId: raw?.postId ?? postId,
  followed: Boolean(raw?.followed),
  lastReadCommentId: raw?.lastReadCommentId,
  lastNotifiedCommentId: raw?.lastNotifiedCommentId,
  source: raw?.source,
})

const normalizeCommentListParams = (
  cursorOrParams?: string | CommentListParams | null,
  size = 20,
): { cursor?: string; size: number; sort?: CommentSort } => {
  if (cursorOrParams && typeof cursorOrParams === 'object') {
    return {
      cursor: cursorOrParams.cursor,
      size: cursorOrParams.size ?? size,
      sort: cursorOrParams.sort,
    }
  }
  return {
    cursor: cursorOrParams ?? undefined,
    size,
  }
}

const favoriteFolderPayload = (folderId?: ApiId | null) => (
  folderId === undefined ? undefined : { folderId }
)

const normalizeFavoriteFolderVisibilityValue = (
  visibility?: FavoriteFolderCreateReq['visibility'] | FavoriteFolderUpdateReq['visibility'],
  isPublic?: boolean,
) => {
  if (isPublic !== undefined) return isPublic ? 'public' : 'private'
  if (visibility === 1 || String(visibility).toLowerCase() === 'public') return 'public'
  if (visibility === 2 || String(visibility).toLowerCase() === 'private') return 'private'
  return undefined
}

const favoriteFolderRequestPayload = (req: FavoriteFolderCreateReq | FavoriteFolderUpdateReq) => {
  const visibility = normalizeFavoriteFolderVisibilityValue(req.visibility, req.isPublic)
  return {
    ...req,
    visibility,
    privateFolder: req.privateFolder ?? (visibility === undefined ? undefined : visibility !== 'public'),
  }
}

const normalizeFavoriteFolderPostParams = (
  paramsOrCursor?: FavoriteFolderPostListParams | string,
  size?: number,
): FavoriteFolderPostListParams | undefined => {
  if (paramsOrCursor && typeof paramsOrCursor === 'object') return paramsOrCursor
  if (paramsOrCursor !== undefined || size !== undefined) {
    return { cursor: paramsOrCursor, size }
  }
  return undefined
}

export const interactionApi = {
  like: (postId: ApiId): Promise<Result<{ liked: boolean; likeCount?: number }>> =>
    client.post(`/api/v1/posts/${postId}/like`),

  unlike: (postId: ApiId): Promise<Result<{ liked: boolean; likeCount?: number }>> =>
    client.delete(`/api/v1/posts/${postId}/like`),

  favorite: (postId: ApiId, folderId?: ApiId | null): Promise<Result<{ favorited: boolean; folderId?: ApiId | null }>> =>
    client.post(`/api/v1/posts/${postId}/favorite`, favoriteFolderPayload(folderId)),

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

  listFavoriteFolders: async (): Promise<Result<FavoriteFolder[]>> => {
    const res = await client.get('/api/v1/users/me/favorite-folders') as Result<any>
    return { ...res, data: Array.isArray(res.data) ? res.data.map(adaptFavoriteFolder) : [] }
  },

  createFavoriteFolder: async (req: FavoriteFolderCreateReq): Promise<Result<FavoriteFolder>> => {
    const res = await client.post('/api/v1/users/me/favorite-folders', favoriteFolderRequestPayload(req)) as Result<any>
    return { ...res, data: res.data ? adaptFavoriteFolder(res.data) : null }
  },

  updateFavoriteFolder: async (folderId: ApiId, req: FavoriteFolderUpdateReq): Promise<Result<FavoriteFolder>> => {
    const res = await client.put(`/api/v1/users/me/favorite-folders/${encodeURIComponent(String(folderId))}`, favoriteFolderRequestPayload(req)) as Result<any>
    return { ...res, data: res.data ? adaptFavoriteFolder(res.data) : null }
  },

  deleteFavoriteFolder: (folderId: ApiId): Promise<Result<void>> =>
    client.delete(`/api/v1/users/me/favorite-folders/${encodeURIComponent(String(folderId))}`),

  listFavoriteFolderPosts: async (
    folderId: ApiId,
    paramsOrCursor?: FavoriteFolderPostListParams | string,
    size?: number,
  ): Promise<Result<PaginatedResponse<Post>>> => {
    const params = normalizeFavoriteFolderPostParams(paramsOrCursor, size)
    const res = await client.get(`/api/v1/users/me/favorite-folders/${encodeURIComponent(String(folderId))}/posts`, { params }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
  },

  moveFavoriteToFolder: (req: FavoriteMoveReq): Promise<Result<void>> =>
    client.put(`/api/v1/users/me/favorites/${encodeURIComponent(String(req.postId))}/folder`, { folderId: req.folderId }),

  getPublicFavoriteFolder: async (folderId: ApiId): Promise<Result<FavoriteFolder>> => {
    const res = await client.get(`/api/v1/favorite-folders/${encodeURIComponent(String(folderId))}`) as Result<any>
    return { ...res, data: res.data ? adaptFavoriteFolder(res.data) : null }
  },

  listPublicFavoriteFolderPosts: async (
    folderId: ApiId,
    params?: FavoriteFolderPostListParams,
  ): Promise<Result<PaginatedResponse<Post>>> => {
    const res = await client.get(`/api/v1/favorite-folders/${encodeURIComponent(String(folderId))}/posts`, { params }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
  },

  getPostInteraction: (postId: ApiId): Promise<Result<{ liked: boolean; favorited: boolean }>> =>
    client.get(`/api/v1/posts/${postId}/interaction`),

  createContactRequest: async (req: ContactRequestCreateReq): Promise<Result<ContactRequest>> => {
    const res = await client.post('/api/v1/contact-requests', req) as Result<any>
    return { ...res, data: res.data ? adaptContactRequest(res.data) : null }
  },

  listContactRequestInbox: async (params?: ContactRequestListParams): Promise<Result<PaginatedResponse<ContactRequest>>> => {
    const res = await client.get('/api/v1/contact-requests/inbox', { params }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptContactRequest) : null }
  },

  listContactRequestOutbox: async (params?: ContactRequestListParams): Promise<Result<PaginatedResponse<ContactRequest>>> => {
    const res = await client.get('/api/v1/contact-requests/outbox', { params }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptContactRequest) : null }
  },

  acceptContactRequest: async (id: ApiId): Promise<Result<ContactRequest>> => {
    const res = await client.post(`/api/v1/contact-requests/${encodeURIComponent(String(id))}/accept`) as Result<any>
    return { ...res, data: res.data ? adaptContactRequest(res.data) : null }
  },

  rejectContactRequest: async (id: ApiId): Promise<Result<ContactRequest>> => {
    const res = await client.post(`/api/v1/contact-requests/${encodeURIComponent(String(id))}/reject`) as Result<any>
    return { ...res, data: res.data ? adaptContactRequest(res.data) : null }
  },

  ignoreContactRequest: async (id: ApiId): Promise<Result<ContactRequest>> => {
    const res = await client.post(`/api/v1/contact-requests/${encodeURIComponent(String(id))}/ignore`) as Result<any>
    return { ...res, data: res.data ? adaptContactRequest(res.data) : null }
  },

  reportContactRequest: async (id: ApiId, req?: PostReportReq): Promise<Result<ContactRequest>> => {
    const res = await client.post(`/api/v1/contact-requests/${encodeURIComponent(String(id))}/report`, req) as Result<any>
    return { ...res, data: res.data ? adaptContactRequest(res.data) : null }
  },

  getContactRequestSettings: async (): Promise<Result<ContactRequestSettings>> => {
    const res = await client.get('/api/v1/users/me/contact-request-settings') as Result<any>
    return { ...res, data: res.data ? adaptContactRequestSettings(res.data) : null }
  },

  updateContactRequestSettings: async (req: Partial<ContactRequestSettings>): Promise<Result<ContactRequestSettings>> => {
    const res = await client.put('/api/v1/users/me/contact-request-settings', req) as Result<any>
    return { ...res, data: res.data ? adaptContactRequestSettings(res.data) : null }
  },

  getDiscussionFollowStatus: async (postId: ApiId): Promise<Result<DiscussionFollowStatus>> => {
    const res = await client.get(`/api/v1/posts/${postId}/discussion-follow`, { skipAuthRedirect: true }) as Result<any>
    return { ...res, data: adaptDiscussionFollowStatus(res.data, postId) }
  },

  followDiscussion: async (postId: ApiId): Promise<Result<DiscussionFollowStatus>> => {
    const res = await client.post(`/api/v1/posts/${postId}/discussion-follow`) as Result<any>
    return { ...res, data: adaptDiscussionFollowStatus(res.data, postId) }
  },

  unfollowDiscussion: async (postId: ApiId): Promise<Result<DiscussionFollowStatus>> => {
    const res = await client.delete(`/api/v1/posts/${postId}/discussion-follow`) as Result<any>
    return { ...res, data: adaptDiscussionFollowStatus(res.data, postId) }
  },

  listDiscussionFollows: async (cursor?: string, size = 20): Promise<Result<PaginatedResponse<Post>>> => {
    const res = await client.get('/api/v1/users/me/discussion-follows', { params: { cursor, size } }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
  },

  comment: (postId: ApiId, content: string, parentId?: ApiId, replyToUid?: ApiId): Promise<Result<CommentCreateResult>> =>
    client.post(`/api/v1/posts/${postId}/comments`, { content, parentId, replyToUid }),

  getComments: async (
    postId: ApiId,
    cursorOrParams?: string | CommentListParams | null,
    size = 20,
  ): Promise<Result<PaginatedResponse<Comment>>> => {
    const res = await client.get(`/api/v1/posts/${postId}/comments`, {
      params: normalizeCommentListParams(cursorOrParams, size),
    }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptComment) : null }
  },

  deleteComment: (commentId: ApiId): Promise<Result<void>> =>
    client.delete(`/api/v1/comments/${commentId}`),

  likeComment: (commentId: ApiId): Promise<Result<any>> =>
    client.post(`/api/v1/comments/${commentId}/like`),

  unlikeComment: (commentId: ApiId): Promise<Result<any>> =>
    client.delete(`/api/v1/comments/${commentId}/like`),

  helpfulComment: (commentId: ApiId): Promise<Result<any>> =>
    client.post(`/api/v1/comments/${commentId}/helpful`),

  unhelpfulComment: (commentId: ApiId): Promise<Result<any>> =>
    client.delete(`/api/v1/comments/${commentId}/helpful`),

  pinComment: (postId: ApiId, commentId: ApiId): Promise<Result<any>> =>
    client.post(`/api/v1/posts/${postId}/comments/${commentId}/pin`),

  unpinComment: (postId: ApiId, commentId: ApiId): Promise<Result<any>> =>
    client.delete(`/api/v1/posts/${postId}/comments/${commentId}/pin`),

  featureComment: (commentId: ApiId): Promise<Result<any>> =>
    client.post(`/api/v1/comments/${commentId}/featured`),

  unfeatureComment: (commentId: ApiId): Promise<Result<any>> =>
    client.delete(`/api/v1/comments/${commentId}/featured`),

  foldComment: (commentId: ApiId, reason?: string): Promise<Result<any>> =>
    client.post(`/api/v1/comments/${commentId}/fold`, reason ? { reason } : undefined),

  unfoldComment: (commentId: ApiId): Promise<Result<any>> =>
    client.delete(`/api/v1/comments/${commentId}/fold`),

  reportComment: (commentId: ApiId, req: PostReportReq): Promise<Result<{ reportId?: ApiId }>> =>
    client.post(`/api/v1/comments/${commentId}/reports`, req),

  listMyReports: async (params?: UserReportListParams): Promise<Result<PaginatedResponse<UserReportReceipt>>> => {
    const res = await client.get('/api/v1/users/me/reports', { params }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptUserReportReceipt) : null }
  },

  getMyReportDetail: async (
    sourceType: UserReportSourceType,
    reportId: ApiId,
  ): Promise<Result<UserReportReceipt>> => {
    const res = await client.get(`/api/v1/users/me/reports/${sourceType}/${encodeURIComponent(String(reportId))}`) as Result<any>
    return { ...res, data: res.data ? adaptUserReportReceipt(res.data) : null }
  },

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
