import client, { Result } from './client'
import type { ApiId, Comment, CommentReport, CommentSort, ContactRequest, ContactRequestCreateReq, ContactRequestSettings, ContactRequestStats, ContactRequestStatus, DiscussionFollowStatus, FavoriteBatchMoveReq, FavoriteFolder, FavoriteFolderCreateReq, FavoriteFolderSortReq, FavoriteFolderUpdateReq, FavoriteMoveReq, PaginatedResponse, Post, PostReportReq, PostReportReviewReq, UserReportReceipt, UserReportSourceType, UserReportStatus } from './types'
import { adaptComment, adaptCommentReport, adaptContactRequest, adaptContactRequestSettings, adaptContactRequestStats, adaptFavoriteFolder, adaptPage, adaptPost, adaptUserReportReceipt } from './adapters'
export type { ContactRequestCreateReq, ContactRequestScene, ContactRequestSourceType } from './types'

export interface CommentCreateResult {
  commentId: ApiId
  reviewRequired?: boolean
}

export interface FavoriteOrganizationTarget {
  id: ApiId
  title: string
  visibility: 'public' | 'private'
  syncStatus: 'server'
  isDefault?: boolean
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
    const [favoriteRes, folderRes] = await Promise.all([
      client.post(`/api/v1/posts/${postId}/favorite`) as Promise<Result<{ favorited: boolean; folderId?: ApiId | null }>>,
      interactionApi.listFavoriteOrganizationTargets(),
    ])
    const defaultTarget = folderRes.data?.find(item => item.isDefault) || folderRes.data?.[0] || {
      id: favoriteRes.data?.folderId || 'default',
      title: 'Default folder',
      visibility: 'private',
      syncStatus: 'server',
      isDefault: true,
    }
    return {
      ...favoriteRes,
      data: {
        favorited: Boolean(favoriteRes.data?.favorited ?? true),
        defaultTarget,
        boundary: 'server_favorite_only',
        message: 'Saved to the server-backed favorite folder.',
      },
    }
  },

  listFavoriteOrganizationTargets: async (): Promise<Result<FavoriteOrganizationTarget[]>> => {
    const res = await interactionApi.listFavoriteFolders()
    return {
      ...res,
      data: (res.data || []).map(folder => ({
        id: folder.id,
        title: folder.name,
        visibility: folder.visibility,
        syncStatus: 'server',
        isDefault: folder.isDefault || folder.defaultFolder,
      })),
    }
  },

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

  sortFavoriteFolder: async (folderId: ApiId, req: FavoriteFolderSortReq): Promise<Result<FavoriteFolder>> => {
    const res = await client.post(`/api/v1/users/me/favorite-folders/${encodeURIComponent(String(folderId))}/sort`, req) as Result<any>
    return { ...res, data: res.data ? adaptFavoriteFolder(res.data) : null }
  },

  deleteFavoriteFolder: (folderId: ApiId, targetFolderId?: ApiId | null): Promise<Result<void>> =>
    client.delete(`/api/v1/users/me/favorite-folders/${encodeURIComponent(String(folderId))}`, {
      params: targetFolderId ? { targetFolderId } : undefined,
    }),

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

  batchMoveFavoritesToFolder: async (req: FavoriteBatchMoveReq): Promise<Result<FavoriteFolder>> => {
    const res = await client.put('/api/v1/users/me/favorites/batch-folder', { postIds: req.postIds, folderId: req.folderId }) as Result<any>
    return { ...res, data: res.data ? adaptFavoriteFolder(res.data) : null }
  },

  getPublicFavoriteFolder: async (folderId: ApiId): Promise<Result<FavoriteFolder>> => {
    const res = await client.get(`/api/v1/favorite-folders/${encodeURIComponent(String(folderId))}`) as Result<any>
    return { ...res, data: res.data ? adaptFavoriteFolder(res.data) : null }
  },

  listPublicFavoriteFoldersByUser: async (uid: ApiId, limit = 6): Promise<Result<FavoriteFolder[]>> => {
    const res = await client.get(`/api/v1/users/${encodeURIComponent(String(uid))}/favorite-folders`, { params: { limit } }) as Result<any>
    return { ...res, data: Array.isArray(res.data) ? res.data.map(adaptFavoriteFolder) : [] }
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

  getContactRequestStats: async (): Promise<Result<ContactRequestStats>> => {
    const res = await client.get('/api/v1/contact-requests/stats') as Result<any>
    return { ...res, data: res.data ? adaptContactRequestStats(res.data) : null }
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
    const payload = {
      reason: req?.reason?.trim() || 'CONTACT_REQUEST_ABUSE',
      detail: req?.detail?.trim() || undefined,
    }
    const res = await client.post(`/api/v1/contact-requests/${encodeURIComponent(String(id))}/report`, payload) as Result<any>
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

  getCommentReplies: async (
    postId: ApiId,
    rootId: ApiId,
    cursor?: string,
    size = 20,
  ): Promise<Result<PaginatedResponse<Comment>>> => {
    const res = await client.get(`/api/v1/posts/${postId}/comments/${rootId}/replies`, {
      params: { cursor, size },
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
