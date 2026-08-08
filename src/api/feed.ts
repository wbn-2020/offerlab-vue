import client, { Result } from './client'
import type { Post, PaginatedResponse } from './types'
import { adaptPage, adaptPost } from './adapters'
import { sanitizeVisibleText } from '@/utils/textQuality'
import { explainFeedControl, explainRecommendationReason } from '@/utils/recommendationGovernance'

export type FeedControlAction = 'HIDE' | 'LESS_LIKE_THIS' | 'RESTORE'
export type LegacyFeedFeedbackAction = 'not_interested' | 'less_like_this' | 'more_like_this'
export type FeedFeedbackAction = FeedControlAction | LegacyFeedFeedbackAction
type BackendFeedFeedbackAction = LegacyFeedFeedbackAction
export type FeedControlType = 'POST' | 'DOMAIN' | 'AUTHOR'
export type FeedbackReasonCode = 'NOT_RELEVANT' | 'TOO_FREQUENT' | 'ALREADY_KNOWN' | 'QUALITY_NOT_EXPECTED' | 'OTHER'

export interface RecommendationReasonDetail {
  code: string
  text: string
}

export interface FeedPresentationMeta {
  sourceType?: string
  sourceLabel?: string
  reasonCode?: string
  reasonText?: string
  recommendationReasonDetails?: RecommendationReasonDetail[]
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

export interface FeedControl {
  id: string
  controlType: FeedControlType
  targetId: string
  action: string
  targetLabel: string
  createdAt?: string | number
  updatedAt?: string | number
  expiresAt?: string | number | null
}

export interface ChannelHotBoardItem {
  rank: number
  item: FeedPost
  reasonText: string
}

export interface ChannelHotBoard {
  domain: number
  ruleVersion: string
  generatedAt?: string | number
  items: ChannelHotBoardItem[]
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

const adaptRecommendationReasonDetails = (raw: unknown): RecommendationReasonDetail[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => ({
      code: cleanFeedText(item?.code) || 'RECENT_ACTIVITY',
      text: cleanFeedText(item?.text) || '',
    }))
    .filter((item) => Boolean(item.text))
    .slice(0, 3)
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
    recommendationReasonDetails: adaptRecommendationReasonDetails(
      raw?.recommendationReasonDetails ?? source?.recommendationReasonDetails,
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

const normalizeControlType = (value: unknown): FeedControlType => {
  const controlType = String(value ?? '').trim().toUpperCase()
  if (controlType === 'AUTHOR') return 'AUTHOR'
  if (controlType === 'DOMAIN') return 'DOMAIN'
  return 'POST'
}

const adaptFeedControl = (raw: any): FeedControl => {
  const controlType = normalizeControlType(raw?.controlType ?? raw?.targetType)
  const action = cleanFeedText(raw?.action) || (controlType === 'AUTHOR' ? 'BLOCK_AUTHOR' : 'HIDE')
  const targetLabel = cleanFeedText(raw?.targetLabel)
    || (controlType === 'AUTHOR'
      ? '已屏蔽作者'
      : controlType === 'DOMAIN'
        ? '已减少此频道内容'
        : '已隐藏内容')
  return {
    id: String(raw?.id ?? ''),
    controlType,
    targetId: String(raw?.targetId ?? ''),
    action,
    targetLabel,
    createdAt: raw?.createdAt ?? raw?.createTime,
    updatedAt: raw?.updatedAt ?? raw?.updateTime,
    expiresAt: raw?.expiresAt ?? null,
  }
}

async function getFeed(path: string, cursor?: string, size = 20, domain?: number): Promise<Result<PaginatedResponse<FeedPost>>> {
  const params: Record<string, unknown> = { cursor, size }
  if (domain != null) params.domain = domain
  const res = await client.get(path, { params }) as Result<any>
  return { ...res, data: res.data ? adaptPage(res.data, adaptFeedPost) : null }
}

const adaptChannelHotBoard = (raw: any): ChannelHotBoard => ({
  domain: Number(raw?.domain || 0),
  ruleVersion: cleanFeedText(raw?.ruleVersion) || 'channel-hot.v1',
  generatedAt: raw?.generatedAt,
  items: Array.isArray(raw?.items)
    ? raw.items
      .map((item: any) => ({
        rank: Math.max(1, Number(item?.rank || 0)),
        item: adaptFeedPost(item?.item),
        reasonText: cleanFeedText(item?.reasonText) || '按公开互动与发布时间综合排序',
      }))
      .filter((item: ChannelHotBoardItem) => Boolean(item.item?.postId))
    : [],
})

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

  recordFeedback: (
    postId: string | number,
    action: FeedFeedbackAction = 'not_interested',
    reason = '',
    reasonCode?: FeedbackReasonCode,
  ): Promise<Result<void>> => {
    if (action === 'HIDE' || action === 'LESS_LIKE_THIS' || action === 'RESTORE') {
      return requestResult<void>(client.post('/api/v1/feeds/feedback', {
        postId,
        action,
        reason: reason || action.toLowerCase(),
        ...(reasonCode ? { reasonCode } : {}),
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

  getChannelHotBoard: async (domain: string | number, size = 10): Promise<Result<ChannelHotBoard>> => {
    const res = await client.get(`/api/v1/feeds/channels/${encodeURIComponent(String(domain))}/hot-board`, {
      params: { size },
    }) as Result<any>
    return { ...res, data: res.data ? adaptChannelHotBoard(res.data) : null }
  },

  restoreFeedback: (postId: string | number, reason = 'user_restore'): Promise<Result<void>> =>
    requestResult<void>(client.post('/api/v1/feeds/feedback', {
      postId,
      action: 'RESTORE' satisfies FeedControlAction,
      reason,
    })),

  deleteFeedbackPreference: (postId: string | number): Promise<Result<void>> =>
    requestResult<void>(client.delete(`/api/v1/feeds/feedback/preferences/${encodeURIComponent(String(postId))}`)),

  blockAuthor: async (authorUid: string | number): Promise<Result<FeedControl>> => {
    const res = await client.post('/api/v1/feeds/author-controls', { authorUid }) as Result<any>
    return { ...res, data: res.data ? adaptFeedControl(res.data) : null }
  },

  unblockAuthor: (authorUid: string | number): Promise<Result<void>> =>
    requestResult<void>(client.delete(`/api/v1/feeds/author-controls/${encodeURIComponent(String(authorUid))}`)),

  listControls: async (cursor?: string, size = 20): Promise<Result<PaginatedResponse<FeedControl>>> => {
    const res = await client.get('/api/v1/feeds/controls', {
      params: { cursor, size },
    }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptFeedControl) : null }
  },

  deleteControl: (controlId: string | number): Promise<Result<void>> =>
    requestResult<void>(client.delete(`/api/v1/feeds/controls/${encodeURIComponent(String(controlId))}`)),
}
