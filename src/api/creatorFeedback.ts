import client, { BizException, type Result } from './client'
import { isPublicPostVisible } from '@/utils/recommendationGovernance'
import { adaptId } from './adapters'
import type {
  CreatorCurationFeedback,
  CreatorCurationFeedbackSummary,
  CreatorCurationMetrics,
  CreatorContentImprovementSignal,
  CreatorContentImprovementSignals,
  CreatorFeedbackSummary,
  CreatorFeedbackWindow,
  CreatorGrowthWorkspace,
  CreatorIncentiveCopy,
  CreatorMaintainablePost,
  CreatorReplyOpportunity,
  CreatorRepresentativePost,
  CreatorSearchGap,
  CreatorTopPost,
  CreatorTopicEditorQuery,
  CreatorTopicIdea,
  CreatorTrustedContentMetrics,
  CreatorTrustedContentTaskItem,
  CreatorWorkspaceAction,
  CreatorWorkspaceSummary,
  CreatorWorkspaceSource,
  DisplayableCurationFeedbackSource,
  EditorAssistAction,
  EditorAssistContextType,
  EditorSearchGapContext,
} from './types'

const safeText = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const next = value.trim()
  return next || fallback
}

const asObject = (value: unknown): Record<string, unknown> | null => (
  value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
)

export const emptyCreatorContentImprovementSignals = (
  fallbackReason = 'empty_response',
): CreatorContentImprovementSignals => ({
  periodDays: 30,
  degraded: true,
  fallbackReason,
  items: [],
  hasMore: false,
})

const adaptCreatorContentImprovementSignal = (raw: unknown): CreatorContentImprovementSignal | null => {
  const value = asObject(raw)
  const postId = adaptId(value?.postId)
  const state = safeText(value?.state)
  if (
    !postId
    || (
      state !== 'REVIEW_RECOMMENDED'
      && state !== 'MAINTENANCE_EXISTS'
      && state !== 'UPDATED_AWAITING_ANONYMOUS_FEEDBACK'
    )
  ) return null
  const postHref = safeCreatorContentImprovementPostHref(value?.postHref, postId)
  const editHref = safeCreatorContentImprovementEditorHref(value?.editHref, postId)
  const workspaceHref = safeSameSitePath(value?.workspaceHref)
  if (!postHref || ((state === 'REVIEW_RECOMMENDED' || state === 'UPDATED_AWAITING_ANONYMOUS_FEEDBACK') && !editHref)
    || (state === 'MAINTENANCE_EXISTS' && workspaceHref !== '/me/maintenance')) return null
  return {
    postId,
    postTitle: safeText(value?.postTitle, '未命名公开内容'),
    domain: Number.isInteger(Number(value?.domain)) ? Number(value?.domain) : undefined,
    domainName: safeText(value?.domainName, '未分类'),
    state,
    headline: safeText(
      value?.headline,
      state === 'UPDATED_AWAITING_ANONYMOUS_FEEDBACK'
        ? '内容已更新，等待新的匿名反馈'
        : '近 30 天出现了足够匿名的质量复核信号',
    ),
    detail: safeText(
      value?.detail,
      state === 'UPDATED_AWAITING_ANONYMOUS_FEEDBACK'
        ? '旧版本的匿名复核信号不再代表当前内容；平台尚不能判断问题是否已解决。'
        : '建议检查标题、背景、过程和结论是否完整。',
    ),
    postHref,
    editHref: state === 'MAINTENANCE_EXISTS' ? undefined : editHref,
    workspaceHref: state === 'MAINTENANCE_EXISTS' ? workspaceHref : undefined,
  }
}

export const adaptCreatorContentImprovementSignals = (raw: unknown): CreatorContentImprovementSignals => {
  const value = asObject(raw)
  if (!value) {
    return emptyCreatorContentImprovementSignals('content_improvement_contract_missing')
  }
  const periodDays = Number(value.periodDays)
  const degraded = truthyFlag(value.degraded)
  const fallbackReason = safeText(value.fallbackReason) || undefined
  if (!Array.isArray(value.items)) {
    return emptyCreatorContentImprovementSignals('content_improvement_contract_invalid')
  }
  const items = value.items.map(adaptCreatorContentImprovementSignal)
  if (items.some((item) => item == null)) {
    return emptyCreatorContentImprovementSignals('content_improvement_contract_invalid')
  }
  const nextCursor = safeQueryText(value.nextCursor, 64) || undefined
  return {
    periodDays: Number.isSafeInteger(periodDays) && periodDays > 0 ? periodDays : 30,
    degraded,
    fallbackReason,
    items: items.slice(0, 10) as CreatorContentImprovementSignal[],
    nextCursor,
    hasMore: Boolean(value.hasMore && !degraded && nextCursor),
  }
}

type CreatorTrustedContentContract = CreatorTrustedContentMetrics & {
  degraded: boolean
  fallbackReason?: string
}

const TRUSTED_CONTENT_CONTRACT_MISSING = 'trusted_content_contract_missing'
const TRUSTED_CONTENT_CONTRACT_INVALID = 'trusted_content_contract_invalid'
const TRUSTED_CONTENT_METRIC_FIELDS = [
  'pendingSuggestions',
  'freshnessAwaitingConfirmation',
  'profileConfirmationDue',
  'unresolvedQuestions',
  'usefulFeedback7Days',
  'usefulFeedback30Days',
  'effectiveReads7Days',
  'effectiveReads30Days',
] as const
type CreatorTrustedContentMetricField = (typeof TRUSTED_CONTENT_METRIC_FIELDS)[number]

const trustedContentMetric = (value: unknown) => {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined
  if (typeof value === 'string' && !value.trim()) return undefined
  const metric = Number(value)
  return Number.isSafeInteger(metric) && metric >= 0 ? metric : undefined
}

const trustedContentTaskItems = (value: unknown): CreatorTrustedContentTaskItem[] => {
  if (!Array.isArray(value)) return []
  return value.slice(0, 5).flatMap((raw: any, index) => {
    const postId = adaptId(raw?.postId)
    if (!postId) return []
    const href = safeSameSitePath(raw?.href) || `/post/${postId}`
    return [{
      id: adaptId(raw?.id ?? raw?.suggestionId ?? `${postId}-${index}`),
      postId,
      postTitle: safeText(raw?.postTitle, '未命名公开内容'),
      status: safeText(raw?.status) || undefined,
      statusLabel: safeText(raw?.statusLabel ?? raw?.status ?? raw?.type, '待处理'),
      type: safeText(raw?.type) || undefined,
      href,
      suggestionId: raw?.suggestionId == null ? undefined : adaptId(raw.suggestionId),
      createdAt: raw?.createdAt == null ? undefined : toTimestamp(raw.createdAt),
      updatedAt: raw?.updatedAt == null ? undefined : toTimestamp(raw.updatedAt),
      submittedAt: raw?.submittedAt == null ? undefined : toTimestamp(raw.submittedAt),
    }]
  })
}

const adaptCreatorTrustedContent = (raw: any): CreatorTrustedContentContract => {
  const contractMissing = raw == null || typeof raw !== 'object' || Array.isArray(raw)
  const metrics: Record<CreatorTrustedContentMetricField, number | undefined> = {
    pendingSuggestions: trustedContentMetric(raw?.pendingSuggestions),
    freshnessAwaitingConfirmation: trustedContentMetric(raw?.freshnessAwaitingConfirmation),
    profileConfirmationDue: trustedContentMetric(raw?.profileConfirmationDue),
    unresolvedQuestions: trustedContentMetric(raw?.unresolvedQuestions),
    usefulFeedback7Days: trustedContentMetric(raw?.usefulFeedback7Days),
    usefulFeedback30Days: trustedContentMetric(raw?.usefulFeedback30Days),
    effectiveReads7Days: trustedContentMetric(raw?.effectiveReads7Days),
    effectiveReads30Days: trustedContentMetric(raw?.effectiveReads30Days),
  }
  const invalidMetricFields = TRUSTED_CONTENT_METRIC_FIELDS.filter((field) => metrics[field] == null)
  const declaredFallbackReason = contractMissing ? '' : safeText(raw?.fallbackReason)
  const degraded = contractMissing
    || truthyFlag(raw?.degraded)
    || invalidMetricFields.length > 0
    || Boolean(declaredFallbackReason)
  const fallbackReason = contractMissing
    ? TRUSTED_CONTENT_CONTRACT_MISSING
    : declaredFallbackReason || (degraded ? TRUSTED_CONTENT_CONTRACT_INVALID : undefined)
  return {
    degraded: degraded,
    fallbackReason,
    pendingSuggestions: metrics.pendingSuggestions ?? 0,
    freshnessAwaitingConfirmation: metrics.freshnessAwaitingConfirmation ?? 0,
    profileConfirmationDue: metrics.profileConfirmationDue ?? 0,
    unresolvedQuestions: metrics.unresolvedQuestions ?? 0,
    usefulFeedback7Days: metrics.usefulFeedback7Days ?? 0,
    usefulFeedback30Days: metrics.usefulFeedback30Days ?? 0,
    effectiveReads7Days: metrics.effectiveReads7Days ?? 0,
    effectiveReads30Days: metrics.effectiveReads30Days ?? 0,
    pendingSuggestionItems: trustedContentTaskItems(raw?.pendingSuggestionItems),
    freshnessItems: trustedContentTaskItems(raw?.freshnessItems),
    profileConfirmationItems: trustedContentTaskItems(raw?.profileConfirmationItems),
    pendingQuestionItems: trustedContentTaskItems(raw?.pendingQuestionItems),
  }
}

const textBlockers = [
  'fallback-demo',
  'demo seed',
  'fixture',
  'local_demo',
  'Code' + 'CoachAI',
  'mock' + 'Interview',
  'resume' + 'Match',
  'private' + 'Goal',
  'application' + 'Task',
  'AI ' + '教练',
  '私人' + '训练',
  '训练' + '计划',
  '模拟' + '面试',
  '简历' + '匹配',
  '简历' + '/JD',
  'JD ' + '分析',
  '投递' + '任务',
]

const safeCurationText = (value: unknown, fallback = '') => {
  const text = safeText(value, fallback)
  const normalized = text.toLowerCase()
  return textBlockers.some((blocker) => normalized.includes(blocker.toLowerCase())) ? fallback : text
}

const toNumber = (value: unknown, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

const toTimestamp = (value: unknown, fallback = 0) => {
  if (value == null || value === '') return fallback
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  const numeric = Number(value)
  if (Number.isFinite(numeric)) return numeric
  const text = String(value).trim()
  const normalized = text.includes('T') ? text : text.replace(' ', 'T')
  const parsed = Date.parse(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toList = <T,>(value: unknown, mapper: (item: any) => T): T[] => (
  Array.isArray(value) ? value.map(mapper) : []
)

const adaptStringList = (value: unknown) => toList(value, (item) => safeText(item)).filter(Boolean)

export const isSafeCurationFeedbackHref = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  const path = value.trim()
  return Boolean(
    path
    && path.startsWith('/')
    && !path.startsWith('//')
    && !path.startsWith('/api/')
    && !/\s/.test(path)
    && !/fallback|demo|fixture|local_demo/i.test(path),
  )
}

const safeSameSitePath = (value: unknown): string | undefined => (
  isSafeCurationFeedbackHref(value) ? value.trim() : undefined
)

export const CREATOR_WORKBENCH_EDITOR_SOURCE = 'creator_workbench' as const
const CREATOR_WORKBENCH_EDITOR_SOURCE_QUERY = { source: 'creator_workbench' } as const

const safeCreatorContentImprovementPostHref = (value: unknown, postId: string | number): string | undefined => {
  const href = safeSameSitePath(value)
  return href === `/post/${postId}` ? href : undefined
}

const safeCreatorContentImprovementEditorHref = (value: unknown, postId: string | number): string | undefined => {
  const href = safeSameSitePath(value)
  return href === `/editor/${postId}?source=${CREATOR_WORKBENCH_EDITOR_SOURCE}` ? href : undefined
}

const creatorEditorActions: ReadonlySet<EditorAssistAction> = new Set([
  'update',
  'reply',
  'continue',
  'series',
  'topic',
  'template',
])

const creatorEditorContextTypes: ReadonlySet<EditorAssistContextType> = new Set([
  'post',
  'reply',
  'idea',
  'series',
  'topic',
  'template',
])

const normalizeCreatorEditorAction = (value: unknown, fallback: EditorAssistAction = 'continue'): EditorAssistAction => {
  const action = safeText(value).toLowerCase()
  if (action === 'new') return 'template'
  return creatorEditorActions.has(action as EditorAssistAction) ? action as EditorAssistAction : fallback
}

const normalizeCreatorEditorContextType = (
  value: unknown,
  query: Partial<CreatorTopicEditorQuery>,
): EditorAssistContextType => {
  const contextType = safeText(value).toLowerCase()
  if (creatorEditorContextTypes.has(contextType as EditorAssistContextType)) return contextType as EditorAssistContextType
  if (query.commentId || query.action === 'reply') return 'reply'
  if (query.postId) return 'post'
  if (query.ideaId) return 'idea'
  if (query.seriesId || query.action === 'series') return 'series'
  if (query.topicId || query.action === 'topic') return 'topic'
  return 'template'
}

const workspaceSources: ReadonlySet<CreatorWorkspaceSource> = new Set([
  'remote',
  'empty',
  'demo',
  'fallback',
])

const normalizeCreatorWorkspaceSource = (value: unknown, fallback: CreatorWorkspaceSource): CreatorWorkspaceSource => {
  const source = safeText(value).toLowerCase()
  return workspaceSources.has(source as CreatorWorkspaceSource) ? source as CreatorWorkspaceSource : fallback
}

const safeQueryText = (value: unknown, maxLength: number) => {
  const text = safeCurationText(value)
  return text ? text.slice(0, maxLength) : undefined
}

export const buildCreatorWorkbenchEditorHref = (query: Partial<CreatorTopicEditorQuery> = {}) => {
  const params = new URLSearchParams()
  params.set('source', CREATOR_WORKBENCH_EDITOR_SOURCE)
  const action = normalizeCreatorEditorAction(query.action, 'template')
  const contextType = normalizeCreatorEditorContextType(query.contextType, { ...query, action })
  const title = safeQueryText(query.title, 96)
  const postType = safeQueryText(query.postType, 32)
  const topic = safeQueryText(query.topic, 32)
  const seriesId = safeQueryText(query.seriesId, 32)
  const postId = safeQueryText(query.postId, 32)
  const commentId = safeQueryText(query.commentId, 64)
  const ideaId = safeQueryText(query.ideaId, 64)
  const topicId = safeQueryText(query.topicId, 64)
  const templateCode = safeQueryText(query.templateCode, 64)
  const returnHref = safeSameSitePath(query.returnHref)
  const contextSource = safeQueryText(query.contextSource, 32)
  const reasonText = safeQueryText(query.reasonText, 140)
  if (action) params.set('action', action)
  if (contextType) params.set('contextType', contextType)
  if (title) params.set('title', title)
  if (postType) params.set('postType', postType)
  if (topic) params.set('topic', topic)
  if (seriesId) params.set('seriesId', seriesId)
  if (postId) params.set('postId', postId)
  if (commentId) params.set('commentId', commentId)
  if (ideaId) params.set('ideaId', ideaId)
  if (topicId) params.set('topicId', topicId)
  if (templateCode) params.set('templateCode', templateCode)
  if (returnHref) params.set('returnHref', returnHref)
  if (contextSource) params.set('contextSource', contextSource)
  if (reasonText) params.set('reasonText', reasonText)
  return `/editor?${params.toString()}`
}

const normalizeSearchGapSource = (value: unknown): EditorSearchGapContext['source'] => (
  safeText(value).toLowerCase() === 'search_discovery' ? 'search_discovery' : 'search_gap'
)

export const buildSearchGapEditorHref = (context: Partial<EditorSearchGapContext> = {}) => {
  const params = new URLSearchParams()
  const source = normalizeSearchGapSource(context.source)
  const keyword = safeQueryText(context.keyword, 80)
  const clusterId = safeQueryText(context.clusterId, 64)
  const reasonText = safeQueryText(context.reasonText, 140)
  const templateCode = safeQueryText(context.templateCode, 64)
  const topicId = safeQueryText(context.topicId, 64)
  const topicSlug = safeQueryText(context.topicSlug, 96)
  const returnHref = safeSameSitePath(context.returnHref)
  params.set('source', source)
  if (keyword) params.set('keyword', keyword)
  if (clusterId) params.set('clusterId', clusterId)
  if (reasonText) params.set('reasonText', reasonText)
  if (templateCode) params.set('templateCode', templateCode)
  if (topicId) params.set('topicId', topicId)
  if (topicSlug) params.set('topicSlug', topicSlug)
  if (returnHref) params.set('returnHref', returnHref)
  return `/editor?${params.toString()}`
}

const displayableCurationFeedbackSources: ReadonlySet<DisplayableCurationFeedbackSource> = new Set([
  'operation-curation',
  'topic-detail',
  'home-featured',
  'discovery-topic',
  'manual-curation',
  'remote',
])

export const isDisplayableCurationFeedbackSource = (value: unknown): value is DisplayableCurationFeedbackSource => {
  const source = safeText(value).toLowerCase()
  return displayableCurationFeedbackSources.has(source as DisplayableCurationFeedbackSource)
}

const curationFeedbackBlockerPattern = /candidate|hint|suggest|draft|preview|pending|review|rejected|filtered|private|deleted|removed|violat|blocked|hidden|restricted|fallback|demo|fixture/i
const curationFeedbackOfflinePattern = /offline|disabled|taken_down|takedown|removed/i
const curationFeedbackArchivedPattern = /archived|archive/i

const normalizeCreatorCurationFeedbackStatus = (raw: any) => {
  const lifecycleText = [
    raw?.topicStatus,
    raw?.topicLifecycleStatus,
    raw?.lifecycleStatus,
    raw?.placementStatus,
    raw?.publicStatus,
  ].map((item) => safeText(item)).filter(Boolean).join(' ')
  if (curationFeedbackArchivedPattern.test(lifecycleText)) return 'archived'
  if (curationFeedbackOfflinePattern.test(lifecycleText)) return 'offline'
  if (truthyFlag(raw?.degraded)) return 'degraded'
  return 'active'
}

const isConfirmedCreatorCurationFeedback = (raw: any) => {
  if (!raw || raw.publicVisible === false || raw.publiclyVisible === false || raw.visible === false) return false
  if (truthyFlag(raw?.anonymous ?? raw?.isAnonymous ?? raw?.anonymousPost) && raw?.anonymousProtected !== true) return false
  if (truthyFlag(raw?.deleted ?? raw?.isDeleted ?? raw?.private ?? raw?.hidden ?? raw?.restricted)) return false
  const source = safeText(raw?.source)
  if (!isDisplayableCurationFeedbackSource(source)) return false
  const boundaryText = [
    raw?.status,
    raw?.feedbackStatus,
    raw?.selectionStatus,
    raw?.recordStatus,
    raw?.candidateStatus,
    raw?.visibilityScope,
    raw?.visibility,
    raw?.contentStatus,
    raw?.postStatus,
    raw?.reviewStatus,
    raw?.auditStatus,
    raw?.moderationStatus,
    raw?.governanceStatus,
    raw?.candidateSource,
    raw?.eventType,
  ].map((item) => safeText(item)).filter(Boolean).join(' ')
  if (curationFeedbackBlockerPattern.test(boundaryText)) return false
  return true
}

const isDisplayableCreatorCurationFeedback = (item: CreatorCurationFeedback) => (
  Boolean(item.displayableSource && item.contentTitle && item.placementLabel && item.reasonText)
)

export const emptyCreatorCurationFeedbackSummary = (
  fallbackReason = 'backend_not_connected',
  source: CreatorWorkspaceSource = 'fallback',
): CreatorCurationFeedbackSummary => ({
  source,
  updatedAt: Date.now(),
  degraded: true,
  fallbackReason,
  total: 0,
  items: [],
  recentItems: [],
})

const adaptCreatorCurationMetrics = (raw: any): CreatorCurationMetrics => ({
  viewCount: toNumber(raw?.viewCount),
  likeCount: toNumber(raw?.likeCount),
  favoriteCount: toNumber(raw?.favoriteCount),
  commentCount: toNumber(raw?.commentCount),
})

export const adaptCreatorCurationFeedback = (raw: any): CreatorCurationFeedback => {
  const contentId = adaptId(raw?.contentId ?? raw?.postId ?? raw?.targetId)
  const source = safeText(raw?.source, 'unavailable')
  const displayableSource = isConfirmedCreatorCurationFeedback(raw) ? source as DisplayableCurationFeedbackSource : undefined
  const topicSlug = safeCurationText(raw?.topicSlug ?? raw?.slug)
  const topicTitle = safeCurationText(raw?.topicTitle ?? raw?.topicName)
  const sectionKey = safeCurationText(raw?.sectionKey)
  const sectionTitle = safeCurationText(raw?.sectionTitle ?? raw?.sectionName)
  const placementLabel = safeCurationText(
    raw?.placementLabel ?? topicTitle ?? sectionTitle ?? raw?.slotName,
    topicSlug ? `专题 ${topicSlug}` : '公开内容收录',
  )
  return {
    eventId: adaptId(raw?.eventId ?? raw?.id ?? `${contentId}:${raw?.triggeredAt ?? raw?.createdAt ?? ''}`),
    contentId,
    contentTitle: safeCurationText(raw?.contentTitle ?? raw?.postTitle ?? raw?.title, '公开内容标题暂未返回'),
    placementType: safeCurationText(raw?.placementType) || undefined,
    placementId: raw?.placementId == null ? undefined : adaptId(raw.placementId),
    placementLabel,
    topicSlug: topicSlug || undefined,
    topicTitle: topicTitle || undefined,
    sectionKey: sectionKey || undefined,
    sectionTitle: sectionTitle || sectionKey || undefined,
    reasonText: safeCurationText(raw?.reasonText ?? raw?.curationReason ?? raw?.reason, '运营收录理由暂未返回'),
    href: safeSameSitePath(raw?.href ?? raw?.targetPath ?? raw?.jumpPath ?? (contentId ? `/post/${contentId}` : undefined)),
    triggeredAt: toTimestamp(raw?.triggeredAt ?? raw?.includedAt ?? raw?.createdAt ?? raw?.createTime, Date.now()),
    includedAt: toTimestamp(raw?.includedAt ?? raw?.triggeredAt ?? raw?.createdAt ?? raw?.createTime, Date.now()),
    status: normalizeCreatorCurationFeedbackStatus(raw),
    source,
    displayableSource,
    publicMetrics: raw?.publicMetrics || raw?.metrics ? adaptCreatorCurationMetrics(raw?.publicMetrics ?? raw?.metrics) : undefined,
  }
}

export const adaptCreatorCurationFeedbackSummary = (raw: any): CreatorCurationFeedbackSummary => {
  const items = toList(raw?.items ?? raw?.records, adaptCreatorCurationFeedback).filter(isDisplayableCreatorCurationFeedback)
  const recentItems = toList(raw?.recentItems, adaptCreatorCurationFeedback).filter(isDisplayableCreatorCurationFeedback)
  const displayRecentItems = (recentItems.length ? recentItems : items)
    .slice(0, 5)
  return {
    source: normalizeCreatorWorkspaceSource(raw?.source, displayRecentItems.length ? 'remote' : 'empty'),
    updatedAt: toTimestamp(raw?.updatedAt ?? raw?.updateTime, Date.now()),
    degraded: Boolean(raw?.degraded),
    fallbackReason: safeText(raw?.fallbackReason) || undefined,
    total: items.length,
    items,
    recentItems: displayRecentItems,
  }
}

const adaptFeedbackWindow = (raw: any): CreatorFeedbackWindow => ({
  days: toNumber(raw?.days, 30),
  label: safeText(raw?.label, raw?.days === 7 ? '近 7 天' : '近 30 天'),
  postCount: toNumber(raw?.postCount),
  viewCount: toNumber(raw?.viewCount),
  likeCount: toNumber(raw?.likeCount),
  favoriteCount: toNumber(raw?.favoriteCount),
  commentCount: toNumber(raw?.commentCount),
  followerCount: toNumber(raw?.followerCount),
  replyCount: toNumber(raw?.replyCount ?? raw?.feedbackCount),
  feedbackCopy: safeText(raw?.feedbackCopy ?? raw?.trendText),
})

export const emptyCreatorFeedbackSummary = (
  fallbackReason = 'empty_response',
  source: CreatorWorkspaceSource = 'empty',
): CreatorFeedbackSummary => ({
  source,
  updatedAt: Date.now(),
  degraded: source !== 'remote',
  fallbackReason,
  degradationReasons: [fallbackReason],
  windows: [],
  responseRate: 0,
  unreadCommentCount: 0,
  topFeedbackSignals: [],
})

export const adaptCreatorFeedbackSummary = (raw: any): CreatorFeedbackSummary => ({
  source: normalizeCreatorWorkspaceSource(raw?.source, raw ? 'remote' : 'empty'),
  updatedAt: toNumber(raw?.updatedAt ?? raw?.updateTime, Date.now()),
  degraded: Boolean(raw?.degraded),
  fallbackReason: safeText(raw?.fallbackReason) || undefined,
  degradationReasons: adaptStringList(raw?.degradationReasons),
  windows: toList(raw?.windows, adaptFeedbackWindow),
  responseRate: toNumber(raw?.responseRate),
  unreadCommentCount: toNumber(raw?.unreadCommentCount),
  topFeedbackSignals: adaptStringList(raw?.topFeedbackSignals),
})

const truthyFlag = (value: unknown) => value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true'
const boundaryStatusPattern = /private|deleted|removed|reviewing|pending_review|under_review|violating|violation|blocked|hidden|restricted/i

const creatorWorkbenchPostSource = (raw: any) => raw?.post ?? raw?.item?.post ?? raw?.content ?? raw

export const isDisplayableWorkspaceItem = (raw: any) => {
  const post = creatorWorkbenchPostSource(raw)
  if (!post || typeof post !== 'object') return false
  if (truthyFlag(post.anonymous ?? post.isAnonymous ?? post.anonymousPost)) return false
  if (post.publicVisible === false || post.publiclyVisible === false || post.visible === false) return false
  if (truthyFlag(post.deleted ?? post.isDeleted ?? post.private ?? post.hidden ?? post.restricted)) return false
  const boundaryText = [
    post.visibilityScope,
    post.visibility,
    post.postVisibility,
    post.status,
    post.postStatus,
    post.publishStatus,
    post.reviewStatus,
    post.auditStatus,
    post.moderationStatus,
    post.governanceStatus,
  ].map((item) => safeText(item)).filter(Boolean).join(' ')
  if (boundaryStatusPattern.test(boundaryText)) return false
  return isPublicPostVisible(post)
}

export const isPublicCreatorWorkbenchPostVisible = isDisplayableWorkspaceItem

const toVisibleCreatorPostList = <T,>(value: unknown, mapper: (item: any) => T): T[] => (
  Array.isArray(value) ? value.filter(isDisplayableWorkspaceItem).map(mapper) : []
)

export const adaptCreatorTopPost = (raw: any): CreatorTopPost => ({
  postId: adaptId(raw?.postId ?? raw?.id),
  title: safeText(raw?.title, '未命名内容'),
  summary: safeText(raw?.summary) || undefined,
  domain: raw?.domain == null ? undefined : toNumber(raw.domain),
  domainName: safeText(raw?.domainName) || undefined,
  viewCount: toNumber(raw?.viewCount),
  likeCount: toNumber(raw?.likeCount),
  favoriteCount: toNumber(raw?.favoriteCount),
  commentCount: toNumber(raw?.commentCount),
  feedbackScore: toNumber(raw?.feedbackScore ?? raw?.feedbackCount),
  reason: safeText(raw?.reason),
  href: safeSameSitePath(raw?.href ?? raw?.targetPath ?? raw?.jumpPath) || undefined,
})

export const adaptCreatorMaintainablePost = (raw: any): CreatorMaintainablePost => {
  const post = adaptCreatorTopPost(raw)
  const action = normalizeCreatorEditorAction(raw?.action ?? 'update', 'update')
  return {
    ...post,
    actionHint: safeCurationText(raw?.actionHint ?? raw?.actionCopy ?? raw?.reason) || undefined,
    editorQuery: {
      source: CREATOR_WORKBENCH_EDITOR_SOURCE,
      action,
      contextType: 'post',
      postId: String(post.postId),
      title: post.title,
      postType: safeQueryText(raw?.postType ?? raw?.suggestedContentType, 32),
      topic: safeQueryText(raw?.topic ?? raw?.domainName, 32),
      contextSource: 'own_post_feedback',
      returnHref: '/me#creator-workbench',
    },
  }
}

export const adaptCreatorReplyOpportunity = (raw: any): CreatorReplyOpportunity => ({
  id: adaptId(raw?.id ?? raw?.commentId ?? raw?.postId),
  postId: adaptId(raw?.postId),
  postTitle: safeText(raw?.postTitle ?? raw?.title, '未命名内容'),
  commentId: raw?.commentId == null ? undefined : adaptId(raw.commentId),
  commenterName: safeText(raw?.commenterName) || undefined,
  excerpt: safeText(raw?.excerpt ?? raw?.commentExcerpt),
  reason: safeText(raw?.reason),
  priority: safeText(raw?.priority, 'medium'),
  suggestedReplyTone: safeText(raw?.suggestedReplyTone, '真诚补充上下文'),
  href: safeSameSitePath(raw?.href ?? raw?.targetPath ?? raw?.jumpPath) || undefined,
  createdAt: raw?.createdAt == null && raw?.createTime == null ? undefined : toNumber(raw?.createdAt ?? raw?.createTime),
})

export const adaptCreatorRepresentativePost = (raw: any): CreatorRepresentativePost => ({
  postId: adaptId(raw?.postId ?? raw?.id),
  title: safeText(raw?.title, '未命名内容'),
  summary: safeText(raw?.summary) || undefined,
  domain: raw?.domain == null ? undefined : toNumber(raw.domain),
  domainName: safeText(raw?.domainName) || undefined,
  heat: toNumber(raw?.heat ?? raw?.feedbackCount),
  featured: Boolean(raw?.featured),
  publicCollectionCount: toNumber(raw?.publicCollectionCount),
  reason: safeText(raw?.reason),
  source: safeText(raw?.source) || undefined,
  publicVisible: raw?.publicVisible == null ? undefined : Boolean(raw.publicVisible),
  boundaryCopy: safeText(raw?.boundaryCopy) || undefined,
  href: safeSameSitePath(raw?.href ?? raw?.targetPath ?? raw?.jumpPath) || undefined,
})

const adaptCreatorTopicEditorQuery = (raw: any) => {
  const editorQuery = raw?.editorQuery ?? raw?.query ?? raw?.jumpParams ?? {}
  const action = normalizeCreatorEditorAction(editorQuery?.action ?? raw?.action ?? 'continue', 'continue')
  const query: Partial<CreatorTopicEditorQuery> = {
    action,
    seriesId: safeQueryText(editorQuery?.seriesId, 32),
    postId: safeQueryText(editorQuery?.postId ?? raw?.postId, 32),
    commentId: safeQueryText(editorQuery?.commentId ?? raw?.commentId, 64),
    ideaId: safeQueryText(editorQuery?.ideaId ?? raw?.ideaId ?? raw?.id, 64),
    topicId: safeQueryText(editorQuery?.topicId ?? raw?.topicId, 64),
    templateCode: safeQueryText(editorQuery?.templateCode ?? raw?.templateCode, 64),
  }
  const contextType = normalizeCreatorEditorContextType(editorQuery?.contextType ?? raw?.contextType, query)
  return {
    source: CREATOR_WORKBENCH_EDITOR_SOURCE_QUERY.source,
    action,
    contextType,
    title: safeQueryText(editorQuery?.title ?? raw?.title, 96),
    postType: safeQueryText(editorQuery?.postType ?? raw?.suggestedFormat ?? raw?.suggestedContentType, 32),
    topic: safeQueryText(editorQuery?.topic ?? raw?.targetDomainName, 32),
    seriesId: query.seriesId,
    postId: query.postId,
    commentId: query.commentId,
    ideaId: query.ideaId,
    topicId: query.topicId,
    templateCode: query.templateCode,
    returnHref: safeSameSitePath(editorQuery?.returnHref ?? raw?.returnHref),
    contextSource: safeQueryText(editorQuery?.contextSource ?? raw?.sourceType ?? raw?.source, 32),
    reasonText: safeQueryText(editorQuery?.reasonText ?? raw?.reason, 140),
  }
}

const topicIdeaTitle = (raw: any) => {
  const explicitTitle = safeText(raw?.title)
  if (explicitTitle) return explicitTitle
  const source = safeText(raw?.source ?? raw?.sourceType)
  if (source === 'recent_feedback') return '回应近期讨论'
  if (source === 'public_series') return '补充公开合集'
  if (source === 'last_30_days') return '围绕近期反馈写一篇后续'
  return '新的选题灵感'
}

export const adaptCreatorTopicIdea = (raw: any): CreatorTopicIdea => {
  const editorQuery = adaptCreatorTopicEditorQuery(raw)
  return {
    id: adaptId(raw?.id ?? raw?.ideaId ?? raw?.title),
    title: topicIdeaTitle(raw),
    prompt: safeText(raw?.prompt),
    reason: safeText(raw?.reason),
    sourceType: safeText(raw?.sourceType ?? raw?.source ?? raw?.sourceSignals?.[0]) || undefined,
    sourceSignals: adaptStringList(raw?.sourceSignals ?? (raw?.source ? [raw.source] : [])),
    targetDomain: raw?.targetDomain == null ? undefined : toNumber(raw.targetDomain),
    targetDomainName: safeText(raw?.targetDomainName) || undefined,
    suggestedFormat: safeText(raw?.suggestedFormat ?? raw?.suggestedContentType) || undefined,
    editorQuery,
    editorHref: buildCreatorWorkbenchEditorHref(editorQuery),
  }
}

export const adaptCreatorSearchGap = (raw: any): CreatorSearchGap => {
  const keyword = safeQueryText(raw?.keyword ?? raw?.title ?? raw?.label, 80) || '聚合需求'
  const context: EditorSearchGapContext = {
    source: 'search_gap',
    keyword: safeQueryText(raw?.keyword ?? raw?.title ?? raw?.label, 80) || keyword,
    clusterId: safeQueryText(raw?.clusterId ?? raw?.clusterKey, 64),
    reasonText: safeQueryText(raw?.reasonText ?? raw?.reason ?? raw?.summary, 140) || '来自搜索发现的聚合需求，仅作为选题参考。',
    templateCode: safeQueryText(raw?.templateCode ?? raw?.suggestedTemplate, 64),
    topicId: safeQueryText(raw?.topicId, 64),
    topicSlug: safeQueryText(raw?.topicSlug ?? raw?.slug, 96),
    returnHref: safeSameSitePath(raw?.returnHref) || '/me#creator-workbench',
  }
  context.source = normalizeSearchGapSource(raw?.source)
  return {
    id: adaptId(raw?.id ?? raw?.gapId ?? context.clusterId ?? keyword),
    keyword,
    title: safeQueryText(raw?.title ?? raw?.keyword, 96) || keyword,
    reasonText: context.reasonText,
    demandLabel: safeQueryText(raw?.demandLabel ?? raw?.label, 40),
    clusterId: context.clusterId,
    topicId: raw?.topicId == null ? undefined : adaptId(raw.topicId),
    topicSlug: context.topicSlug,
    templateCode: context.templateCode,
    editorContext: context,
    editorHref: buildSearchGapEditorHref(context),
  }
}

export const adaptCreatorIncentiveCopy = (raw: any): CreatorIncentiveCopy => Array.isArray(raw) ? ({
  title: '继续经营公开内容',
  description: raw.map((item) => safeText(item)).filter(Boolean).join(' '),
  boundary: '非支付激励，不涉及支付，不承诺收益。',
}) : ({
  title: safeText(raw?.title, '继续经营公开内容'),
  description: safeText(raw?.description),
  boundary: safeText(raw?.boundary, '这是非支付激励，不涉及支付，不承诺收益。'),
  ctaLabel: safeText(raw?.ctaLabel) || undefined,
})

export const adaptCreatorWorkspaceAction = (raw: any, index = 0): CreatorWorkspaceAction | null => {
  const query = raw?.query || raw?.editorQuery || raw?.jumpParams
  const kind = safeText(raw?.kind ?? raw?.type, query ? 'open_editor' : 'view_feedback')
  const editorQuery = kind === 'open_editor' || safeText(raw?.href).startsWith('/editor')
    ? adaptCreatorTopicEditorQuery({ ...raw, editorQuery: query })
    : undefined
  const href = editorQuery
    ? buildCreatorWorkbenchEditorHref(editorQuery)
    : safeSameSitePath(raw?.href ?? raw?.targetPath ?? raw?.jumpPath)
  if (!href) return null
  return {
    id: adaptId(raw?.id ?? raw?.actionId ?? `creator-workbench-action-${index}`),
    label: safeCurationText(raw?.label ?? raw?.title, '继续经营公开内容'),
    href,
    kind,
    type: kind,
    description: safeCurationText(raw?.description ?? raw?.reason) || '',
    query: editorQuery,
    editorQuery,
    reason: safeCurationText(raw?.reason ?? raw?.description) || undefined,
    disabled: raw?.disabled == null ? undefined : Boolean(raw.disabled),
  }
}

const defaultCreatorWorkspaceActions = (topicIdeas: CreatorTopicIdea[]): CreatorWorkspaceAction[] => {
  const firstIdea = topicIdeas[0]
  const query = firstIdea?.editorQuery ?? {
    source: CREATOR_WORKBENCH_EDITOR_SOURCE,
    action: 'template',
    contextType: 'template',
    returnHref: '/me#creator-workbench',
  } as CreatorTopicEditorQuery
  return [
    {
      id: 'creator-workbench-editor',
      label: firstIdea?.title || '继续写公开内容',
      href: firstIdea?.editorHref || buildCreatorWorkbenchEditorHref(query),
      kind: 'open_editor',
      type: 'topic',
      description: firstIdea?.reason || '来自公开内容反馈的下一步选题',
      query,
      editorQuery: query,
      reason: firstIdea?.reason || 'based_on_public_feedback',
    },
    {
      id: 'creator-workbench-posts',
      label: '查看公开内容',
      href: '/me?tab=posts',
      kind: 'open_posts',
      type: 'open_post',
      description: '查看已发布公开内容',
    },
  ]
}

const adaptCreatorWorkspaceActions = (raw: unknown, topicIdeas: CreatorTopicIdea[]) => {
  const actions = Array.isArray(raw)
    ? raw.map(adaptCreatorWorkspaceAction).filter((item): item is CreatorWorkspaceAction => Boolean(item))
    : []
  return actions.length ? actions : defaultCreatorWorkspaceActions(topicIdeas)
}

const feedbackWindowForPeriod = (summary: CreatorFeedbackSummary, periodDays: number) => (
  summary.windows.find((item) => Number(item.days) === periodDays)
  ?? summary.windows.find((item) => Number(item.days) === 30)
  ?? summary.windows[0]
)

const feedbackTotalOf = (window?: CreatorFeedbackWindow) => (
  Number(window?.likeCount || 0)
  + Number(window?.favoriteCount || 0)
  + Number(window?.commentCount || 0)
)

const adaptCreatorWorkspaceSummary = (
  raw: any,
  periodDays: number,
  feedbackSummary: CreatorFeedbackSummary,
  maintainablePosts: CreatorMaintainablePost[],
  curationFeedback: CreatorCurationFeedback[],
  replyOpportunities: CreatorReplyOpportunity[],
  representativePosts: CreatorRepresentativePost[],
  updatedAt: number,
): CreatorWorkspaceSummary => {
  const window = feedbackWindowForPeriod(feedbackSummary, periodDays)
  const totalFeedbackCount = feedbackTotalOf(window)
  return {
    periodDays,
    publicPostCount: toNumber(raw?.publicPostCount ?? raw?.postCount ?? window?.postCount, maintainablePosts.length),
    totalFeedbackCount: toNumber(
      raw?.totalFeedbackCount ?? raw?.feedbackCount,
      totalFeedbackCount,
    ),
    viewCount: toNumber(raw?.viewCount, window?.viewCount ?? 0),
    likeCount: toNumber(raw?.likeCount ?? raw?.recentLikeCount, window?.likeCount ?? 0),
    favoriteCount: toNumber(raw?.favoriteCount ?? raw?.recentFavoriteCount, window?.favoriteCount ?? 0),
    commentCount: toNumber(raw?.commentCount ?? raw?.recentCommentCount, window?.commentCount ?? 0),
    curationCount: toNumber(raw?.curationCount ?? raw?.curationInclusionCount, curationFeedback.length),
    replyOpportunityCount: toNumber(raw?.replyOpportunityCount, replyOpportunities.length),
    representativeCount: toNumber(raw?.representativeCount ?? raw?.representativePostCount, representativePosts.length),
    updatedAt: toTimestamp(raw?.updatedAt ?? raw?.updateTime, updatedAt),
    copy: safeCurationText(
      raw?.copy ?? raw?.feedbackCopy ?? window?.feedbackCopy,
      '只聚合公开内容信号，不承诺曝光效果。',
    ),
  }
}

const curationFeedbackItemsOf = (raw: any) => {
  const value = raw?.curationFeedback ?? raw?.creatorCurationFeedback ?? raw?.curationFeedbackSummary
  if (Array.isArray(value)) return value
  return value?.items ?? value?.recentItems ?? []
}

const curationFeedbackSummaryOf = (raw: any) => {
  const value = raw?.curationFeedback ?? raw?.creatorCurationFeedback ?? raw?.curationFeedbackSummary
  if (Array.isArray(value)) {
    return adaptCreatorCurationFeedbackSummary({
      source: raw?.source,
      updatedAt: raw?.updatedAt ?? raw?.updateTime,
      degraded: raw?.degraded,
      fallbackReason: raw?.fallbackReason,
      items: value,
      recentItems: value,
      total: value.length,
    })
  }
  if (value) return adaptCreatorCurationFeedbackSummary(value)
  return emptyCreatorCurationFeedbackSummary('empty_curation_feedback', 'empty')
}

const workspaceHasData = (
  summary: CreatorFeedbackSummary,
  maintainablePosts: CreatorMaintainablePost[],
  curationFeedback: CreatorCurationFeedback[],
  replyOpportunities: CreatorReplyOpportunity[],
  representativePosts: CreatorRepresentativePost[],
  topicIdeas: CreatorTopicIdea[],
  searchGaps: CreatorSearchGap[],
) => Boolean(
  summary.windows.length
  || summary.topFeedbackSignals.length
  || maintainablePosts.length
  || curationFeedback.length
  || replyOpportunities.length
  || representativePosts.length
  || topicIdeas.length
  || searchGaps.length
)

export const emptyCreatorGrowthWorkspace = (
  fallbackReason = 'empty_response',
  source: CreatorWorkspaceSource = 'empty',
): CreatorGrowthWorkspace => {
  const feedbackSummary = emptyCreatorFeedbackSummary(fallbackReason, source)
  const curationFeedback: CreatorCurationFeedback[] = []
  const topicIdeas: CreatorTopicIdea[] = []
  const searchGaps: CreatorSearchGap[] = []
  const trustedContent = adaptCreatorTrustedContent(undefined)
  const degradationReasons = [fallbackReason]
  if (
    trustedContent.fallbackReason
    && !degradationReasons.includes(trustedContent.fallbackReason)
  ) {
    degradationReasons.push(trustedContent.fallbackReason)
  }
  const updatedAt = Date.now()
  const summary = adaptCreatorWorkspaceSummary(
    { copy: source === 'demo' ? '示例反馈只说明结构，不承诺曝光效果。' : '发布公开内容后，这里会展示公开反馈概览。' },
    30,
    feedbackSummary,
    [],
    curationFeedback,
    [],
    [],
    updatedAt,
  )
  return {
    source,
    updatedAt,
    periodDays: 30,
    degraded: trustedContent.degraded || source === 'fallback' || source === 'demo',
    fallbackReason,
    degradationReasons,
    summary,
    maintainablePosts: [],
    curationFeedback: curationFeedback,
    actions: adaptCreatorWorkspaceActions([], topicIdeas),
    feedbackSummary,
    topPosts: [],
    replyOpportunities: [],
    representativePosts: [],
    topicIdeas,
    searchGaps,
    trustedContent,
    incentiveCopy: adaptCreatorIncentiveCopy({}),
  }
}

export const fallbackCreatorGrowthWorkspace = () => emptyCreatorGrowthWorkspace('backend_not_connected', 'fallback')

export const adaptCreatorGrowthWorkspace = (raw: any): CreatorGrowthWorkspace => {
  if (!raw) return emptyCreatorGrowthWorkspace('empty_response', 'empty')
  const periodDays = toNumber(raw?.periodDays, 30)
  const updatedAt = toTimestamp(raw?.updatedAt ?? raw?.updateTime, Date.now())
  const feedbackSummary = raw?.feedbackSummary || raw?.creatorFeedbackSummary
    ? adaptCreatorFeedbackSummary(raw.feedbackSummary ?? raw.creatorFeedbackSummary)
    : emptyCreatorFeedbackSummary('empty_summary', 'empty')
  const maintainablePosts = toVisibleCreatorPostList(raw?.maintainablePosts ?? raw?.topPosts ?? raw?.creatorTopPosts, adaptCreatorMaintainablePost)
  const curationSummary = curationFeedbackSummaryOf(raw)
  const curationFeedback = (
    curationSummary.recentItems.length
      ? curationSummary.recentItems
      : toList(curationFeedbackItemsOf(raw), adaptCreatorCurationFeedback)
  )
    .filter(isDisplayableCreatorCurationFeedback)
    .slice(0, 10)
  const replyOpportunities = toVisibleCreatorPostList(raw?.replyOpportunities ?? raw?.creatorReplyOpportunities, adaptCreatorReplyOpportunity)
  const representativePosts = toVisibleCreatorPostList(raw?.representativePosts ?? raw?.creatorRepresentativePosts, adaptCreatorRepresentativePost)
  const topicIdeas = toList(raw?.topicIdeas ?? raw?.creatorTopicIdeas, adaptCreatorTopicIdea)
  const searchGaps = toList(raw?.searchGaps ?? raw?.creatorSearchGaps ?? raw?.aggregatedSearchGaps, adaptCreatorSearchGap)
    .filter((item) => Boolean(item.keyword && item.reasonText))
    .slice(0, 6)
  const trustedContent = adaptCreatorTrustedContent(raw?.trustedContent ?? raw?.trustedContentMetrics)
  const hasData = workspaceHasData(feedbackSummary, maintainablePosts, curationFeedback, replyOpportunities, representativePosts, topicIdeas, searchGaps)
  const source = normalizeCreatorWorkspaceSource(raw?.source, hasData ? 'remote' : 'empty')
  const sourceDegraded = source === 'fallback' || source === 'demo'
  const fallbackReason = safeText(raw?.fallbackReason)
    || (trustedContent.degraded ? trustedContent.fallbackReason : undefined)
    || (source === 'empty' ? 'empty_response' : undefined)
  const degradationReasons = adaptStringList(raw?.degradationReasons)
  if (fallbackReason && !degradationReasons.includes(fallbackReason)) degradationReasons.push(fallbackReason)
  if (
    trustedContent.degraded
    && trustedContent.fallbackReason
    && !degradationReasons.includes(trustedContent.fallbackReason)
  ) {
    degradationReasons.push(trustedContent.fallbackReason)
  }
  const summary = adaptCreatorWorkspaceSummary(
    raw?.summary,
    periodDays,
    feedbackSummary,
    maintainablePosts,
    curationFeedback,
    replyOpportunities,
    representativePosts,
    updatedAt,
  )
  return {
    source,
    updatedAt,
    periodDays,
    degraded: truthyFlag(raw?.degraded) || trustedContent.degraded || sourceDegraded,
    fallbackReason,
    degradationReasons,
    summary,
    maintainablePosts: maintainablePosts,
    curationFeedback,
    actions: adaptCreatorWorkspaceActions(raw?.actions ?? raw?.creatorActions, topicIdeas),
    feedbackSummary,
    topPosts: maintainablePosts,
    replyOpportunities,
    representativePosts,
    topicIdeas,
    searchGaps,
    trustedContent,
    incentiveCopy: adaptCreatorIncentiveCopy(raw?.incentiveCopy ?? raw?.nonPaymentIncentiveCopy),
  }
}

const localDemoResult = <T>(data: T): Result<T> => ({
  code: 0,
  message: 'local_demo_seed',
  data,
})

const loadDemoSeeds = () => import('@/data/demoSeeds')

export const isDemoFallbackEnabled = () => {
  const env = import.meta.env
  return Boolean(
    env.VITE_OFFERLAB_ALLOW_LOCAL_DEMO === 'true'
    || env.VITE_OFFERLAB_DEMO_FALLBACK === 'true'
    || env.VITE_OFFERLAB_USE_DEMO === 'true',
  )
}

export const shouldUseDemoFallback = (error: unknown) => {
  if (!isDemoFallbackEnabled()) return false
  if (error instanceof BizException) {
    if (error.code === 10401 || error.code === 10403) return false
    return error.code === 10404
  }
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 401 || status === 403) return false
  return status === 404
}

export const creatorFeedbackApi = {
  getFeedbackSummary: async (days = 30): Promise<Result<CreatorFeedbackSummary>> => {
    try {
      const res = await client.get('/api/v1/creator-growth/feedback-summary', {
        params: { days },
      }) as Result<unknown>
      return {
        ...res,
        data: res.data ? adaptCreatorFeedbackSummary(res.data) : emptyCreatorFeedbackSummary('empty_response', 'empty'),
      }
    } catch (error) {
      if (shouldUseDemoFallback(error)) {
        const { demoCreatorFeedbackSummary, isLocalDemoSeedAllowed } = await loadDemoSeeds()
        if (!isLocalDemoSeedAllowed()) throw error
        return localDemoResult(demoCreatorFeedbackSummary)
      }
      throw error
    }
  },

  getWorkspace: async (): Promise<Result<CreatorGrowthWorkspace>> => {
    try {
      const res = await client.get('/api/v1/creator-growth/workspace') as Result<any>
      return {
        ...res,
        data: res.data ? adaptCreatorGrowthWorkspace(res.data) : emptyCreatorGrowthWorkspace('empty_response', 'empty'),
      }
    } catch (error) {
      if (shouldUseDemoFallback(error)) {
        const { demoCreatorGrowthWorkspace, isLocalDemoSeedAllowed } = await loadDemoSeeds()
        if (!isLocalDemoSeedAllowed()) throw error
        return localDemoResult(demoCreatorGrowthWorkspace)
      }
      throw error
    }
  },

  getContentImprovementSignals: async (cursor?: string): Promise<Result<CreatorContentImprovementSignals>> => {
    try {
      const res = await client.get('/api/v1/creator-growth/content-improvement-signals', {
        params: { size: 5, ...(cursor ? { cursor } : {}) },
      }) as Result<any>
      return {
        ...res,
        data: res.data
          ? adaptCreatorContentImprovementSignals(res.data)
          : emptyCreatorContentImprovementSignals('empty_response'),
      }
    } catch (error) {
      if (shouldUseDemoFallback(error)) {
        return {
          code: 0,
          message: 'content_improvement_backend_not_connected',
          data: emptyCreatorContentImprovementSignals('backend_not_connected'),
        }
      }
      throw error
    }
  },

  getTopicIdeas: async (): Promise<Result<CreatorTopicIdea[]>> => {
    try {
      const res = await client.get('/api/v1/creator-growth/topic-ideas') as Result<any>
      return {
        ...res,
        data: Array.isArray(res.data) ? res.data.map(adaptCreatorTopicIdea) : [],
      }
    } catch (error) {
      if (shouldUseDemoFallback(error)) {
        const { demoCreatorTopicIdeas, isLocalDemoSeedAllowed } = await loadDemoSeeds()
        if (!isLocalDemoSeedAllowed()) throw error
        return localDemoResult(demoCreatorTopicIdeas)
      }
      throw error
    }
  },

  getRepresentativePosts: async (): Promise<Result<CreatorRepresentativePost[]>> => {
    try {
      const res = await client.get('/api/v1/creator-growth/representative-posts') as Result<any>
      return {
        ...res,
        data: toVisibleCreatorPostList(res.data, adaptCreatorRepresentativePost),
      }
    } catch (error) {
      if (shouldUseDemoFallback(error)) {
        const { demoCreatorRepresentativePosts, isLocalDemoSeedAllowed } = await loadDemoSeeds()
        if (!isLocalDemoSeedAllowed()) throw error
        return localDemoResult(demoCreatorRepresentativePosts)
      }
      throw error
    }
  },

  updateRepresentativePosts: async (postIds: Array<string | number>): Promise<Result<CreatorRepresentativePost[]>> => {
    const res = await client.put('/api/v1/creator-growth/representative-posts', { postIds }) as Result<any>
    return {
      ...res,
      data: toVisibleCreatorPostList(res.data, adaptCreatorRepresentativePost),
    }
  },

  getCurationFeedbackSummary: async (): Promise<Result<CreatorCurationFeedbackSummary>> => {
    try {
      const res = await client.get('/api/v1/creator-growth/curation-feedback') as Result<any>
      return {
        ...res,
        data: res.data ? adaptCreatorCurationFeedbackSummary(res.data) : emptyCreatorCurationFeedbackSummary('empty_response', 'empty'),
      }
    } catch (error) {
      if (shouldUseDemoFallback(error)) {
        return {
          code: 0,
          message: 'curation_feedback_backend_not_connected',
          data: emptyCreatorCurationFeedbackSummary('backend_not_connected'),
        }
      }
      throw error
    }
  },
}
