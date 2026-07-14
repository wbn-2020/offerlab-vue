import client, { type Result } from './client'
import type { ApiId } from './types'
import type { ContentSuggestionDecision, ContentSuggestionType } from './contentSuggestions'

export type QuestionStatus =
  | 'OPEN'
  | 'ANSWERED'
  | 'ACCEPTED'
  | 'NO_RELIABLE_CONCLUSION'
  | 'CLOSED'
  | 'DUPLICATE'

export type FreshnessStatus =
  | 'CURRENT'
  | 'POSSIBLY_STALE'
  | 'AWAITING_AUTHOR_CONFIRMATION'
  | 'UPDATED'
  | 'SUPERSEDED'

export type UsefulFeedbackReason =
  | 'SOLVED_PROBLEM'
  | 'SAVED_TIME'
  | 'HELPED_DECISION'
  | 'NEW_PERSPECTIVE'
  | 'WORTH_PRACTICING'

export type UsefulReasonCounts = Record<UsefulFeedbackReason, number>

export interface TrustedContentPublicSuggestionRecord {
  suggestionId: ApiId
  type: ContentSuggestionType
  decision: ContentSuggestionDecision
  publicNote?: string
  submitterNickname?: string
  resultVersion?: number
  decidedAt?: number
}

export interface TrustedContentUsefulFeedback {
  total: number
  reasonCounts: UsefulReasonCounts
  myReason: UsefulFeedbackReason | null
}

export interface TrustedContentState {
  postId: ApiId
  questionStatus: QuestionStatus | null
  allowedQuestionStatuses: QuestionStatus[]
  acceptedCommentId: ApiId | null
  duplicatePostId: ApiId | null
  freshnessStatus: FreshnessStatus
  lastConfirmedAt: number | null
  successorPostId: ApiId | null
  suggestionsOpen: boolean
  usefulFeedbackTotal: number
  usefulReasonCounts: UsefulReasonCounts
  myUsefulReason: UsefulFeedbackReason | null
  publicSuggestionRecords: TrustedContentPublicSuggestionRecord[]
  usefulFeedback: TrustedContentUsefulFeedback
}

export interface UsefulFeedbackReq {
  reason: UsefulFeedbackReason
}

export interface QuestionStateReq {
  status: QuestionStatus
  duplicatePostId?: ApiId | null
}

export interface AcceptedAnswerReq {
  commentId: ApiId
}

export interface FreshnessUpdateReq {
  status: FreshnessStatus
  successorPostId?: ApiId | null
}

export interface TrustedContentRequestOptions {
  signal?: AbortSignal
}

export const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  OPEN: '待回答',
  ANSWERED: '已有回答',
  ACCEPTED: '已有采纳回答',
  NO_RELIABLE_CONCLUSION: '未形成可靠结论',
  CLOSED: '已关闭',
  DUPLICATE: '重复问题',
}

export const FRESHNESS_STATUS_LABELS: Record<FreshnessStatus, string> = {
  CURRENT: '当前有效',
  POSSIBLY_STALE: '可能已过时',
  AWAITING_AUTHOR_CONFIRMATION: '等待作者确认',
  UPDATED: '已更新',
  SUPERSEDED: '已有后续内容',
}

export const USEFUL_FEEDBACK_REASON_OPTIONS: Array<{
  value: UsefulFeedbackReason
  label: string
  description: string
}> = [
  { value: 'SOLVED_PROBLEM', label: '解决了问题', description: '内容直接帮助我解决了一个具体问题。' },
  { value: 'SAVED_TIME', label: '节省了时间', description: '内容减少了检索、试错或整理成本。' },
  { value: 'HELPED_DECISION', label: '帮助了决策', description: '内容让我更清楚地比较选项或判断下一步。' },
  { value: 'NEW_PERSPECTIVE', label: '提供了新视角', description: '内容补充了此前没有注意到的角度。' },
  { value: 'WORTH_PRACTICING', label: '值得实践', description: '内容给出了可以实际尝试的方法。' },
]

export const USEFUL_REASON_OPTIONS = USEFUL_FEEDBACK_REASON_OPTIONS

const QUESTION_STATUSES = new Set<QuestionStatus>([
  'OPEN',
  'ANSWERED',
  'ACCEPTED',
  'NO_RELIABLE_CONCLUSION',
  'CLOSED',
  'DUPLICATE',
])

const FRESHNESS_STATUSES = new Set<FreshnessStatus>([
  'CURRENT',
  'POSSIBLY_STALE',
  'AWAITING_AUTHOR_CONFIRMATION',
  'UPDATED',
  'SUPERSEDED',
])

const USEFUL_REASONS: UsefulFeedbackReason[] = [
  'SOLVED_PROBLEM',
  'SAVED_TIME',
  'HELPED_DECISION',
  'NEW_PERSPECTIVE',
  'WORTH_PRACTICING',
]

const SUGGESTION_TYPES = new Set<ContentSuggestionType>([
  'CORRECTION',
  'FRESHNESS_UPDATE',
  'CONDITIONS',
  'COUNTEREXAMPLE',
  'SOURCE',
  'FOLLOW_UP_RESULT',
])

const SUGGESTION_DECISIONS = new Set<ContentSuggestionDecision>([
  'ACCEPTED',
  'PARTIAL_ACCEPTED',
  'REJECTED',
  'MERGED',
])

const optionalId = (value: unknown): ApiId | null => (
  value === null || value === undefined || value === '' ? null : String(value)
)

const optionalTime = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  const timestamp = new Date(String(value)).getTime()
  return Number.isFinite(timestamp) ? timestamp : undefined
}

const finiteCount = (value: unknown) => {
  const count = Number(value)
  return Number.isFinite(count) ? Math.max(0, count) : 0
}

const adaptQuestionStatus = (value: unknown): QuestionStatus | null => {
  const status = String(value ?? '') as QuestionStatus
  return QUESTION_STATUSES.has(status) ? status : null
}

const adaptAllowedQuestionStatuses = (value: unknown): QuestionStatus[] => {
  if (!Array.isArray(value)) return []
  const statuses: QuestionStatus[] = []
  for (const candidate of value) {
    const status = adaptQuestionStatus(candidate)
    if (status && status !== 'ACCEPTED' && !statuses.includes(status)) {
      statuses.push(status)
    }
  }
  return statuses
}

const adaptFreshnessStatus = (value: unknown): FreshnessStatus => {
  const status = String(value ?? '') as FreshnessStatus
  return FRESHNESS_STATUSES.has(status) ? status : 'CURRENT'
}

const adaptUsefulReason = (value: unknown): UsefulFeedbackReason | null => {
  const reason = String(value ?? '') as UsefulFeedbackReason
  return USEFUL_REASONS.includes(reason) ? reason : null
}

const adaptUsefulReasonCounts = (value: unknown): UsefulReasonCounts => {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return USEFUL_REASONS.reduce((counts, reason) => {
    counts[reason] = finiteCount(source[reason])
    return counts
  }, {} as UsefulReasonCounts)
}

const adaptPublicSuggestionRecord = (raw: any): TrustedContentPublicSuggestionRecord | null => {
  const type = String(raw?.type ?? raw?.suggestionType ?? '') as ContentSuggestionType
  const decision = String(raw?.decision ?? '') as ContentSuggestionDecision
  if (!SUGGESTION_TYPES.has(type) || !SUGGESTION_DECISIONS.has(decision)) return null
  return {
    suggestionId: optionalId(raw?.suggestionId ?? raw?.id) ?? '',
    type,
    decision,
    publicNote: raw?.publicNote ? String(raw.publicNote) : undefined,
    submitterNickname: raw?.submitterNickname ? String(raw.submitterNickname) : undefined,
    resultVersion: raw?.resultVersion == null ? undefined : Number(raw.resultVersion),
    decidedAt: optionalTime(raw?.decidedAt ?? raw?.decisionTime ?? raw?.updatedAt ?? raw?.updateTime),
  }
}

export const adaptTrustedContentState = (raw: any): TrustedContentState => {
  const usefulFeedback = raw?.usefulFeedback && typeof raw.usefulFeedback === 'object'
    ? raw.usefulFeedback
    : {}
  const usefulReasonCounts = adaptUsefulReasonCounts(
    raw?.usefulReasonCounts
      ?? raw?.usefulFeedbackByReason
      ?? usefulFeedback?.reasonCounts
      ?? usefulFeedback?.counts,
  )
  const usefulFeedbackTotal = finiteCount(
    raw?.usefulFeedbackTotal
      ?? raw?.usefulCount
      ?? usefulFeedback?.total,
  )
  const myUsefulReason = adaptUsefulReason(
    raw?.myUsefulReason
      ?? raw?.myUsefulFeedbackReason
      ?? usefulFeedback?.myReason,
  )
  const publicSuggestionSource: unknown[] = (
    Array.isArray(raw?.publicSuggestionRecords)
      ? raw.publicSuggestionRecords
      : Array.isArray(raw?.publicSuggestionDecisions)
        ? raw.publicSuggestionDecisions
        : []
  )
  const publicSuggestionRecords = publicSuggestionSource
    .map(adaptPublicSuggestionRecord)
    .filter((item): item is TrustedContentPublicSuggestionRecord => Boolean(item))

  return {
    postId: optionalId(raw?.postId) ?? '',
    questionStatus: adaptQuestionStatus(raw?.questionStatus),
    allowedQuestionStatuses: adaptAllowedQuestionStatuses(raw?.allowedQuestionStatuses),
    acceptedCommentId: optionalId(raw?.acceptedCommentId ?? raw?.acceptedAnswerCommentId),
    duplicatePostId: optionalId(raw?.duplicatePostId ?? raw?.duplicateQuestionPostId),
    freshnessStatus: adaptFreshnessStatus(raw?.freshnessStatus),
    lastConfirmedAt: optionalTime(raw?.lastConfirmedAt ?? raw?.freshnessConfirmedAt) ?? null,
    successorPostId: optionalId(raw?.successorPostId),
    suggestionsOpen: raw?.suggestionsOpen !== false,
    usefulFeedbackTotal,
    usefulReasonCounts,
    myUsefulReason,
    publicSuggestionRecords,
    usefulFeedback: {
      total: usefulFeedbackTotal,
      reasonCounts: usefulReasonCounts,
      myReason: myUsefulReason,
    },
  }
}

const adaptTrustedContentResult = (res: Result<any>): Result<TrustedContentState> => ({
  ...res,
  data: res.data ? adaptTrustedContentState(res.data) : null,
})

export const trustedContentApi = {
  loadTrustedContent: async (
    postId: ApiId,
    options?: TrustedContentRequestOptions,
  ): Promise<Result<TrustedContentState>> => {
    const res = await client.get(`/api/v1/posts/${postId}/trusted-content`, {
      signal: options?.signal,
    }) as Result<any>
    return adaptTrustedContentResult(res)
  },

  saveUsefulFeedback: async (
    postId: ApiId,
    req: UsefulFeedbackReq,
    options?: TrustedContentRequestOptions,
  ): Promise<Result<TrustedContentState>> => {
    const res = await client.put(`/api/v1/posts/${postId}/useful-feedback`, req, {
      signal: options?.signal,
    }) as Result<any>
    return adaptTrustedContentResult(res)
  },

  clearUsefulFeedback: async (
    postId: ApiId,
    options?: TrustedContentRequestOptions,
  ): Promise<Result<TrustedContentState>> => {
    const res = await client.delete(`/api/v1/posts/${postId}/useful-feedback`, {
      signal: options?.signal,
    }) as Result<any>
    return adaptTrustedContentResult(res)
  },

  setQuestionState: async (
    postId: ApiId,
    req: QuestionStateReq,
    options?: TrustedContentRequestOptions,
  ): Promise<Result<TrustedContentState>> => {
    const res = await client.put(`/api/v1/posts/${postId}/question-state`, req, {
      signal: options?.signal,
    }) as Result<any>
    return adaptTrustedContentResult(res)
  },

  acceptAnswer: async (
    postId: ApiId,
    req: AcceptedAnswerReq,
    options?: TrustedContentRequestOptions,
  ): Promise<Result<TrustedContentState>> => {
    const res = await client.put(`/api/v1/posts/${postId}/accepted-answer`, req, {
      signal: options?.signal,
    }) as Result<any>
    return adaptTrustedContentResult(res)
  },

  clearAcceptedAnswer: async (
    postId: ApiId,
    options?: TrustedContentRequestOptions,
  ): Promise<Result<TrustedContentState>> => {
    const res = await client.delete(`/api/v1/posts/${postId}/accepted-answer`, {
      signal: options?.signal,
    }) as Result<any>
    return adaptTrustedContentResult(res)
  },

  updateFreshness: async (
    postId: ApiId,
    req: FreshnessUpdateReq,
    options?: TrustedContentRequestOptions,
  ): Promise<Result<TrustedContentState>> => {
    const res = await client.put(`/api/v1/posts/${postId}/freshness`, req, {
      signal: options?.signal,
    }) as Result<any>
    return adaptTrustedContentResult(res)
  },
}

export const loadTrustedContent = trustedContentApi.loadTrustedContent
export const saveUsefulFeedback = trustedContentApi.saveUsefulFeedback
export const clearUsefulFeedback = trustedContentApi.clearUsefulFeedback
export const setQuestionState = trustedContentApi.setQuestionState
export const acceptAnswer = trustedContentApi.acceptAnswer
export const clearAcceptedAnswer = trustedContentApi.clearAcceptedAnswer
export const updateFreshness = trustedContentApi.updateFreshness
