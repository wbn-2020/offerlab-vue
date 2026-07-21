import client, { type Result } from './client'
import type { ApiId, Post } from './types'
import { isPublicPostVisible } from '@/utils/recommendationGovernance'

export type ContentSuggestionType =
  | 'CORRECTION'
  | 'FRESHNESS_UPDATE'
  | 'CONDITIONS'
  | 'COUNTEREXAMPLE'
  | 'SOURCE'
  | 'FOLLOW_UP_RESULT'

export type ContentSuggestionStatus =
  | 'PENDING'
  | 'DECIDED'

export type ContentSuggestionDecision =
  | 'ACCEPTED'
  | 'PARTIAL_ACCEPTED'
  | 'REJECTED'
  | 'MERGED'
  | 'PLANNED'

export type ContentSuggestionResolution =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PARTIAL'
  | 'REJECTED'
  | 'PLANNED'

export type ContentSuggestionDeliveryStatus = 'UNLINKED' | 'LINKED'
export type ContentSuggestionTargetScope = 'TITLE' | 'CONTENT' | 'SECTION' | 'REFERENCE' | 'FRESHNESS' | 'OTHER'

export interface ContentSuggestionRecord {
  id: ApiId
  postId: ApiId
  postTitle?: string
  postAuthorUid?: ApiId
  submitterUid?: ApiId
  submitterNickname?: string
  type: ContentSuggestionType
  detail: string
  sourceUrl?: string
  baseVersion?: number
  targetScope?: ContentSuggestionTargetScope
  targetLocator?: string
  expectedChange?: string
  resolution?: ContentSuggestionResolution
  deliveryStatus?: ContentSuggestionDeliveryStatus
  allowPublicAttribution: boolean
  status: ContentSuggestionStatus
  decision?: ContentSuggestionDecision
  decisionReason?: string
  publicNote?: string
  resultVersion?: number
  createdAt?: number
  updatedAt?: number
  decidedAt?: number
  authorReply?: string
  acceptedPublicNote?: string
}

export interface ContentSuggestionSubmitReq {
  type: ContentSuggestionType
  detail: string
  sourceUrl?: string
  targetScope?: ContentSuggestionTargetScope
  targetLocator?: string
  expectedChange?: string
  allowPublicAttribution?: boolean
}

export interface ContentSuggestionDecisionReq {
  decision: ContentSuggestionDecision
  authorReply?: string
  publicNote?: string
}

export interface ContentSuggestionRequestOptions {
  signal?: AbortSignal
}

export interface ContentSuggestionSubmitGuardInput {
  isLoggedIn: boolean
  isAuthor: boolean
  suggestionsOpen?: boolean
  post?: Post | null
  type?: ContentSuggestionType
  detail?: string
  duplicatePending?: boolean
  blockedByAuthor?: boolean
  governanceRestricted?: boolean
}

export interface ContentSuggestionSubmitGuardResult {
  allowed: boolean
  code:
    | 'OK'
    | 'LOGIN_REQUIRED'
    | 'AUTHOR_SELF_SUBMIT'
    | 'ENTRY_CLOSED'
    | 'POST_UNAVAILABLE'
    | 'DETAIL_REQUIRED'
    | 'DUPLICATE_PENDING'
    | 'BLOCKED'
    | 'GOVERNANCE_RESTRICTED'
  reason: string
}

export const CONTENT_SUGGESTIONS_ENABLED = true

export const CONTENT_SUGGESTION_TYPE_OPTIONS: Array<{
  value: ContentSuggestionType
  label: string
  description: string
}> = [
  { value: 'CORRECTION', label: '事实更正', description: '指出需要作者核对的事实、数据或表述。' },
  { value: 'FRESHNESS_UPDATE', label: '时效更新', description: '说明信息、价格、规则或链接可能已经变化。' },
  { value: 'CONDITIONS', label: '补充条件', description: '补充方法成立所需的背景、前提和限制。' },
  { value: 'COUNTEREXAMPLE', label: '反例补充', description: '提供与正文结论不同的真实情形。' },
  { value: 'SOURCE', label: '来源补充', description: '补充可核验的公开来源或原始材料。' },
  { value: 'FOLLOW_UP_RESULT', label: '后续结果', description: '补充实践后的结果、变化或复盘。' },
]

export const CONTENT_SUGGESTION_STATUS_LABELS: Record<ContentSuggestionStatus, string> = {
  PENDING: '待作者处理',
  DECIDED: '作者已处理',
}

export const CONTENT_SUGGESTION_DECISION_LABELS: Record<ContentSuggestionDecision, string> = {
  ACCEPTED: '已采纳',
  PARTIAL_ACCEPTED: '部分采纳',
  REJECTED: '未采纳',
  MERGED: '已合并到新版本',
  PLANNED: '计划处理',
}

export const normalizeHttpUrl = (value: unknown) => {
  const raw = String(value || '').trim()
  if (!raw) return undefined
  try {
    const url = new URL(raw)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

export const normalizeContentSuggestionSubmitReq = (
  req: ContentSuggestionSubmitReq,
): Required<Pick<ContentSuggestionSubmitReq, 'type' | 'detail' | 'allowPublicAttribution'>>
& Pick<ContentSuggestionSubmitReq, 'sourceUrl' | 'targetScope' | 'targetLocator' | 'expectedChange'> => ({
  type: req.type,
  detail: String(req.detail || '').trim(),
  sourceUrl: normalizeHttpUrl(req.sourceUrl),
  targetScope: req.targetScope,
  targetLocator: req.targetLocator?.trim() || undefined,
  expectedChange: req.expectedChange?.trim() || undefined,
  allowPublicAttribution: false || req.allowPublicAttribution === true,
})

export const buildContentSuggestionDuplicateKey = (input: {
  postId?: ApiId
  submitterUid?: ApiId
  type?: ContentSuggestionType
  detail?: string
}) => [
  String(input.postId ?? ''),
  String(input.submitterUid ?? ''),
  String(input.type ?? ''),
  String(input.detail ?? '').replace(/\s+/g, ' ').trim().toLowerCase(),
].join(':')

export const canSubmitContentSuggestion = (
  input: ContentSuggestionSubmitGuardInput,
): ContentSuggestionSubmitGuardResult => {
  if (!input.isLoggedIn) return { allowed: false, code: 'LOGIN_REQUIRED', reason: '请先登录后再提交补充或纠错建议。' }
  if (input.isAuthor) return { allowed: false, code: 'AUTHOR_SELF_SUBMIT', reason: '作者可以直接编辑内容，不需要给自己提交建议。' }
  if (input.suggestionsOpen === false) return { allowed: false, code: 'ENTRY_CLOSED', reason: '作者已关闭这篇内容的建议入口。' }
  if (!input.post || !isPublicPostVisible(input.post)) return { allowed: false, code: 'POST_UNAVAILABLE', reason: '当前内容不可提交协作建议。' }
  if (input.blockedByAuthor) return { allowed: false, code: 'BLOCKED', reason: '当前关系状态下无法继续提交建议。' }
  if (input.governanceRestricted) return { allowed: false, code: 'GOVERNANCE_RESTRICTED', reason: '当前账号状态暂不能提交协作建议。' }
  if (!String(input.detail || '').trim()) return { allowed: false, code: 'DETAIL_REQUIRED', reason: '请写下具体建议，方便作者判断是否处理。' }
  if (input.duplicatePending) return { allowed: false, code: 'DUPLICATE_PENDING', reason: '同一内容已有相同类型的待处理建议，请等待作者处理。' }
  return { allowed: true, code: 'OK', reason: '可以提交。' }
}

const adaptTime = (value: unknown) => {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  const time = new Date(String(value)).getTime()
  return Number.isFinite(time) ? time : undefined
}

const adaptContentSuggestion = (raw: any): ContentSuggestionRecord => {
  const publicNote = raw?.publicNote ?? raw?.acceptedPublicNote
  const decisionReason = raw?.decisionReason ?? raw?.authorReply ?? raw?.reason
  return {
    id: String(raw?.id ?? raw?.suggestionId ?? ''),
    postId: String(raw?.postId ?? ''),
    postTitle: raw?.postTitle ? String(raw.postTitle) : undefined,
    postAuthorUid: raw?.postAuthorUid ?? raw?.authorUid,
    submitterUid: raw?.submitterUid,
    submitterNickname: raw?.submitterNickname ? String(raw.submitterNickname) : undefined,
    type: String(raw?.type ?? raw?.suggestionType ?? 'CORRECTION') as ContentSuggestionType,
    detail: String(raw?.detail ?? raw?.content ?? ''),
    sourceUrl: normalizeHttpUrl(raw?.sourceUrl),
    baseVersion: raw?.baseVersion == null ? undefined : Number(raw.baseVersion),
    targetScope: raw?.targetScope ? String(raw.targetScope) as ContentSuggestionTargetScope : undefined,
    targetLocator: raw?.targetLocator ? String(raw.targetLocator) : undefined,
    expectedChange: raw?.expectedChange ? String(raw.expectedChange) : undefined,
    resolution: raw?.resolution ? String(raw.resolution) as ContentSuggestionResolution : undefined,
    deliveryStatus: raw?.deliveryStatus ? String(raw.deliveryStatus) as ContentSuggestionDeliveryStatus : undefined,
    allowPublicAttribution: raw?.allowPublicAttribution === true,
    status: String(raw?.status ?? (raw?.decision ? 'DECIDED' : 'PENDING')) as ContentSuggestionStatus,
    decision: raw?.decision ? String(raw.decision) as ContentSuggestionDecision : undefined,
    decisionReason: decisionReason ? String(decisionReason) : undefined,
    publicNote: publicNote ? String(publicNote) : undefined,
    resultVersion: raw?.resultVersion == null ? undefined : Number(raw.resultVersion),
    createdAt: adaptTime(raw?.createdAt ?? raw?.createTime),
    updatedAt: adaptTime(raw?.updatedAt ?? raw?.updateTime),
    decidedAt: adaptTime(raw?.decidedAt ?? raw?.decisionTime),
    authorReply: decisionReason ? String(decisionReason) : undefined,
    acceptedPublicNote: publicNote ? String(publicNote) : undefined,
  }
}

const adaptSuggestionResult = (res: Result<any>): Result<ContentSuggestionRecord> => ({
  ...res,
  data: res.data ? adaptContentSuggestion(res.data) : null,
})

const adaptSuggestionListResult = (res: Result<any>): Result<ContentSuggestionRecord[]> => ({
  ...res,
  data: Array.isArray(res.data) ? res.data.map(adaptContentSuggestion) : [],
})

export const contentSuggestionApi = {
  submit: async (
    postId: ApiId,
    req: ContentSuggestionSubmitReq,
    options: ContentSuggestionRequestOptions = {},
  ): Promise<Result<ContentSuggestionRecord>> => {
    const res = await client.post(
      `/api/v1/posts/${postId}/content-suggestions`,
      normalizeContentSuggestionSubmitReq(req),
      { signal: options.signal },
    ) as Result<any>
    return adaptSuggestionResult(res)
  },

  getById: async (
    suggestionId: ApiId,
    options: ContentSuggestionRequestOptions = {},
  ): Promise<Result<ContentSuggestionRecord>> => {
    const res = await client.get(`/api/v1/content-suggestions/${suggestionId}`, {
      signal: options.signal,
    }) as Result<any>
    return adaptSuggestionResult(res)
  },

  listMineForPost: async (
    postId: ApiId,
    options: ContentSuggestionRequestOptions = {},
  ): Promise<Result<ContentSuggestionRecord[]>> => {
    const res = await client.get(`/api/v1/posts/${postId}/content-suggestions/mine`, {
      signal: options.signal,
    }) as Result<any>
    return adaptSuggestionListResult(res)
  },

  listForAuthorPost: async (
    postId: ApiId,
    status?: ContentSuggestionStatus,
    limit = 50,
    options: ContentSuggestionRequestOptions = {},
  ): Promise<Result<ContentSuggestionRecord[]>> => {
    const res = await client.get(`/api/v1/posts/${postId}/content-suggestions/author`, {
      params: { status, limit: Math.max(1, Math.min(limit, 50)) },
      signal: options.signal,
    }) as Result<any>
    return adaptSuggestionListResult(res)
  },

  decide: async (
    suggestionId: ApiId,
    req: ContentSuggestionDecisionReq,
    options: ContentSuggestionRequestOptions = {},
  ): Promise<Result<ContentSuggestionRecord>> => {
    const res = await client.put(
      `/api/v1/content-suggestions/${suggestionId}/decision`,
      req,
      { signal: options.signal },
    ) as Result<any>
    return adaptSuggestionResult(res)
  },

  setPostEntry: (
    postId: ApiId,
    suggestionsOpen: boolean,
    options: ContentSuggestionRequestOptions = {},
  ): Promise<Result<{ postId: ApiId; suggestionsOpen: boolean }>> =>
    client.put(
      `/api/v1/posts/${postId}/content-suggestions/settings`,
      { suggestionsOpen },
      { signal: options.signal },
    ),

  closePostEntry: (
    postId: ApiId,
    options: ContentSuggestionRequestOptions = {},
  ): Promise<Result<{ postId: ApiId; suggestionsOpen: boolean }>> =>
    client.put(
      `/api/v1/posts/${postId}/content-suggestions/settings`,
      { suggestionsOpen: false },
      { signal: options.signal },
    ),
}
