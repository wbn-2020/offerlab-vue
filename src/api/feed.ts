import client, { Result } from './client'
import type { Post, PaginatedResponse } from './types'
import { adaptPage, adaptPost } from './adapters'
import { sanitizeVisibleText } from '@/utils/textQuality'
import { explainFeedControl, explainRecommendationReason } from '@/utils/recommendationGovernance'

export type FeedControlAction = 'HIDE' | 'LESS_LIKE_THIS' | 'RESTORE'
export type LegacyFeedFeedbackAction = 'not_interested' | 'less_like_this' | 'hide_author' | 'more_like_this'
export type FeedFeedbackAction = FeedControlAction | LegacyFeedFeedbackAction
type BackendFeedFeedbackAction = 'not_interested' | 'less_like_this' | 'hide_author' | 'more_like_this'

export interface FeedPresentationMeta {
  sourceType?: string
  sourceLabel?: string
  reasonCode?: string
  reasonText?: string
}

export type FeedPost = Post & FeedPresentationMeta

export interface FeedPreference {
  postId: Post['postId']
  action: FeedControlAction
  reason?: string
  reasonCode?: string
  reasonText?: string
  updatedAt?: string | number
}

const requestResult = <T>(request: Promise<unknown>) => request as Promise<Result<T>>

const feedbackPayload = (action: LegacyFeedFeedbackAction, reason: string) => {
  const normalizedReason = reason || action
  return {
    action: action as BackendFeedFeedbackAction,
    reason: action === 'not_interested' ? normalizedReason : `${action}:${normalizedReason}`,
  }
}

const cleanFeedText = (value: unknown) => {
  const text = sanitizeVisibleText(value)
  return text || undefined
}

const adaptFeedPost = (raw: any): FeedPost => {
  const source = raw?.post ?? raw
  const sourceType = cleanFeedText(raw?.sourceType ?? source?.sourceType)
  const reasonCode = cleanFeedText(raw?.reasonCode ?? source?.reasonCode)
  return Object.assign(adaptPost(raw), {
    sourceType,
    sourceLabel: cleanFeedText(raw?.sourceLabel ?? source?.sourceLabel),
    reasonCode,
    reasonText: explainRecommendationReason(
      cleanFeedText(raw?.reasonText ?? source?.reasonText),
      reasonCode,
      sourceType,
    ),
  })
}

const normalizeControlAction = (value: unknown): FeedControlAction => {
  const action = String(value ?? '').trim().toUpperCase()
  if (action === 'LESS_LIKE_THIS') return 'LESS_LIKE_THIS'
  if (action === 'RESTORE') return 'RESTORE'
  return 'HIDE'
}

const adaptFeedPreference = (raw: any): FeedPreference => {
  const action = normalizeControlAction(raw?.action ?? raw?.feedbackAction)
  const reasonCode = cleanFeedText(raw?.reasonCode)
  return {
    postId: String(raw?.postId ?? raw?.targetId ?? raw?.id ?? ''),
    action,
    reason: cleanFeedText(raw?.reason),
    reasonCode,
    reasonText: explainFeedControl(cleanFeedText(raw?.reasonText), reasonCode, action),
    updatedAt: raw?.updatedAt ?? raw?.updateTime,
  }
}

async function getFeed(path: string, cursor?: string, size = 20, domain?: number): Promise<Result<PaginatedResponse<FeedPost>>> {
  const params: Record<string, unknown> = { cursor, size }
  if (domain != null) params.domain = domain
  const res = await client.get(path, { params }) as Result<any>
  return { ...res, data: res.data ? adaptPage(res.data, adaptFeedPost) : null }
}

export const feedApi = {
  getFollowing: (cursor?: string, size = 20, domain?: number): Promise<Result<PaginatedResponse<FeedPost>>> =>
    getFeed('/api/v1/feeds/following', cursor, size, domain),

  getRecommend: (cursor?: string, size = 20, domain?: number): Promise<Result<PaginatedResponse<FeedPost>>> =>
    getFeed('/api/v1/feeds/recommend', cursor, size, domain),

  getLatest: (cursor?: string, size = 20, domain?: number): Promise<Result<PaginatedResponse<FeedPost>>> =>
    getFeed('/api/v1/feeds/latest', cursor, size, domain),

  getHot: (cursor?: string, size = 20, domain?: number): Promise<Result<PaginatedResponse<FeedPost>>> =>
    getFeed('/api/v1/feeds/hot', cursor, size, domain),

  getFeatured: async (cursor?: string, size = 20, domain?: number): Promise<Result<PaginatedResponse<FeedPost>>> => {
    const params: Record<string, unknown> = { cursor, size, featured: true }
    if (domain != null) params.domain = domain
    const res = await client.get('/api/v1/posts', { params }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptFeedPost) : null }
  },

  recordFeedback: (postId: string | number, action: FeedFeedbackAction = 'not_interested', reason = ''): Promise<Result<void>> => {
    if (action === 'HIDE' || action === 'LESS_LIKE_THIS' || action === 'RESTORE') {
      return requestResult<void>(client.post('/api/v1/feeds/feedback', {
        postId,
        action,
        reason: reason || action.toLowerCase(),
      }))
    }
    const payload = feedbackPayload(action, reason)
    return client.post('/api/v1/feeds/feedback', { postId, ...payload })
  },

  listFeedbackPreferences: async (cursor?: string, size = 100): Promise<Result<PaginatedResponse<FeedPreference>>> => {
    const res = await client.get('/api/v1/feeds/feedback/preferences', {
      params: { cursor, size },
    }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptFeedPreference) : null }
  },

  getFeedbackPreference: async (postId: string | number): Promise<Result<FeedPreference>> => {
    const res = await client.get(`/api/v1/feeds/feedback/preferences/${encodeURIComponent(String(postId))}`) as Result<any>
    return { ...res, data: res.data ? adaptFeedPreference(res.data) : null }
  },

  restoreFeedback: (postId: string | number, reason = 'user_restore'): Promise<Result<void>> =>
    requestResult<void>(client.post('/api/v1/feeds/feedback', {
      postId,
      action: 'RESTORE' satisfies FeedControlAction,
      reason,
    })),

  deleteFeedbackPreference: (postId: string | number): Promise<Result<void>> =>
    requestResult<void>(client.delete(`/api/v1/feeds/feedback/preferences/${encodeURIComponent(String(postId))}`)),
}
