import type { Result } from './client'
import type { ApiId, Post } from './types'
import { isPublicPostVisible } from '@/utils/recommendationGovernance'

export type ContentSuggestionType =
  | 'SUPPLEMENT'
  | 'CORRECTION'
  | 'BROKEN_LINK'
  | 'CLARIFICATION'
  | 'RELATED_CONTENT'

export type ContentSuggestionStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REPLIED'
  | 'IGNORED'
  | 'CLOSED'
  | 'HIDDEN'

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
  allowPublicAttribution: boolean
  status: ContentSuggestionStatus
  authorReply?: string
  acceptedPublicNote?: string
  createdAt?: number
  updatedAt?: number
}

export interface ContentSuggestionSubmitReq {
  type: ContentSuggestionType
  detail: string
  sourceUrl?: string
  allowPublicAttribution?: boolean
}

export interface ContentSuggestionActionReq {
  reply?: string
  publicNote?: string
}

export interface ContentSuggestionSubmitGuardInput {
  isLoggedIn: boolean
  isAuthor: boolean
  suggestionsOpen?: boolean
  post?: Post | null
  type?: ContentSuggestionType
  detail?: string
  duplicatePending?: boolean
  dailySubmissionCount?: number
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
    | 'RATE_LIMITED'
    | 'BLOCKED'
    | 'GOVERNANCE_RESTRICTED'
  reason: string
}

export const CONTENT_SUGGESTION_DAILY_LIMIT = 10
export const CONTENT_SUGGESTIONS_ENABLED = false

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

const disabledResult = <T>(data: T | null, message = 'content_suggestions_disabled'): Result<T> => ({
  code: 0,
  message,
  data,
})

export const CONTENT_SUGGESTION_TYPE_OPTIONS: Array<{
  value: ContentSuggestionType
  label: string
  description: string
}> = [
  { value: 'SUPPLEMENT', label: '补充资料', description: '补充来源、背景或更多上下文。' },
  { value: 'CORRECTION', label: '事实更正', description: '指出可能需要作者核对的事实或来源。' },
  { value: 'BROKEN_LINK', label: '链接失效', description: '反馈失效链接、图片或引用入口。' },
  { value: 'CLARIFICATION', label: '表达不清', description: '说明哪些段落需要解释得更清楚。' },
  { value: 'RELATED_CONTENT', label: '相关内容推荐', description: '推荐可补充阅读的公开内容。' },
]

export const CONTENT_SUGGESTION_STATUS_LABELS: Record<ContentSuggestionStatus, string> = {
  PENDING: '待作者处理',
  ACCEPTED: '作者已采纳',
  REPLIED: '作者已回复',
  IGNORED: '作者已忽略',
  CLOSED: '已关闭',
  HIDDEN: '治理隐藏',
}

export const normalizeContentSuggestionSubmitReq = (
  req: ContentSuggestionSubmitReq,
): Required<Pick<ContentSuggestionSubmitReq, 'type' | 'detail' | 'allowPublicAttribution'>> & Pick<ContentSuggestionSubmitReq, 'sourceUrl'> => ({
  type: req.type,
  detail: String(req.detail || '').trim(),
  sourceUrl: normalizeHttpUrl(req.sourceUrl),
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
  String(input.detail ?? '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 160),
].join(':')

export const canSubmitContentSuggestion = (
  input: ContentSuggestionSubmitGuardInput,
): ContentSuggestionSubmitGuardResult => {
  if (!CONTENT_SUGGESTIONS_ENABLED) return { allowed: false, code: 'ENTRY_CLOSED', reason: '内容协作建议入口暂未启用。' }
  if (!input.isLoggedIn) return { allowed: false, code: 'LOGIN_REQUIRED', reason: '请先登录后再提交补充或纠错建议。' }
  if (input.isAuthor) return { allowed: false, code: 'AUTHOR_SELF_SUBMIT', reason: '作者可以直接编辑内容，不需要给自己提交建议。' }
  if (input.suggestionsOpen === false) return { allowed: false, code: 'ENTRY_CLOSED', reason: '作者已关闭这篇内容的建议入口。' }
  if (!input.post || !isPublicPostVisible(input.post)) return { allowed: false, code: 'POST_UNAVAILABLE', reason: '当前内容不可提交协作建议。' }
  if (input.blockedByAuthor) return { allowed: false, code: 'BLOCKED', reason: '当前关系状态下无法继续提交建议。' }
  if (input.governanceRestricted) return { allowed: false, code: 'GOVERNANCE_RESTRICTED', reason: '当前账号状态暂不能提交协作建议。' }
  if (!String(input.detail || '').trim()) return { allowed: false, code: 'DETAIL_REQUIRED', reason: '请写下具体建议，方便作者判断是否处理。' }
  if (input.duplicatePending) return { allowed: false, code: 'DUPLICATE_PENDING', reason: '同一内容已有相同类型的待处理建议，请等待作者处理。' }
  if (Number(input.dailySubmissionCount || 0) >= CONTENT_SUGGESTION_DAILY_LIMIT) {
    return { allowed: false, code: 'RATE_LIMITED', reason: '今天提交较多，请明天再继续补充。' }
  }
  return { allowed: true, code: 'OK', reason: '可以提交。' }
}

const adaptTime = (value: unknown) => {
  if (!value) return undefined
  if (typeof value === 'number') return value
  const time = new Date(String(value)).getTime()
  return Number.isFinite(time) ? time : undefined
}

const adaptContentSuggestion = (raw: any): ContentSuggestionRecord => ({
  id: String(raw?.id ?? raw?.suggestionId ?? ''),
  postId: String(raw?.postId ?? ''),
  postTitle: raw?.postTitle ? String(raw.postTitle) : undefined,
  postAuthorUid: raw?.postAuthorUid ?? raw?.authorUid,
  submitterUid: raw?.submitterUid,
  submitterNickname: raw?.submitterNickname ? String(raw.submitterNickname) : undefined,
  type: String(raw?.type ?? raw?.suggestionType ?? 'SUPPLEMENT') as ContentSuggestionType,
  detail: String(raw?.detail ?? raw?.content ?? ''),
  sourceUrl: normalizeHttpUrl(raw?.sourceUrl),
  allowPublicAttribution: raw?.allowPublicAttribution === true,
  status: String(raw?.status ?? 'PENDING') as ContentSuggestionStatus,
  authorReply: raw?.authorReply ? String(raw.authorReply) : undefined,
  acceptedPublicNote: raw?.acceptedPublicNote ? String(raw.acceptedPublicNote) : undefined,
  createdAt: adaptTime(raw?.createdAt ?? raw?.createTime),
  updatedAt: adaptTime(raw?.updatedAt ?? raw?.updateTime),
})

export const contentSuggestionApi = {
  submit: async (postId: ApiId, req: ContentSuggestionSubmitReq): Promise<Result<ContentSuggestionRecord>> => {
    void postId
    void req
    return disabledResult<ContentSuggestionRecord>(null)
  },

  listMineForPost: async (postId: ApiId): Promise<Result<ContentSuggestionRecord[]>> => {
    void postId
    return disabledResult<ContentSuggestionRecord[]>([])
  },

  listForAuthorPost: async (postId: ApiId, status?: ContentSuggestionStatus): Promise<Result<ContentSuggestionRecord[]>> => {
    void postId
    void status
    return disabledResult<ContentSuggestionRecord[]>([])
  },

  accept: async (id: ApiId, req: ContentSuggestionActionReq = {}): Promise<Result<ContentSuggestionRecord>> => {
    void id
    void req
    return disabledResult<ContentSuggestionRecord>(null)
  },

  reply: async (id: ApiId, req: ContentSuggestionActionReq): Promise<Result<ContentSuggestionRecord>> => {
    void id
    void req
    return disabledResult<ContentSuggestionRecord>(null)
  },

  ignore: async (id: ApiId): Promise<Result<ContentSuggestionRecord>> => {
    void id
    return disabledResult<ContentSuggestionRecord>(null)
  },

  close: async (id: ApiId, req: ContentSuggestionActionReq = {}): Promise<Result<ContentSuggestionRecord>> => {
    void id
    void req
    return disabledResult<ContentSuggestionRecord>(null)
  },

  closePostEntry: (postId: ApiId): Promise<Result<{ postId: ApiId; suggestionsOpen: boolean }>> => {
    return Promise.resolve(disabledResult<{ postId: ApiId; suggestionsOpen: boolean }>({ postId, suggestionsOpen: false }))
  },
}
