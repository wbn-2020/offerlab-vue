import client, { BizException, type Result } from './client'
import {
  demoCreatorFeedbackSummary,
  demoCreatorGrowthWorkspace,
  demoCreatorRepresentativePosts,
  demoCreatorTopicIdeas,
} from '@/data/demoSeeds'
import { adaptId } from './adapters'
import type {
  CreatorCurationFeedback,
  CreatorCurationFeedbackSummary,
  CreatorCurationMetrics,
  CreatorFeedbackSummary,
  CreatorFeedbackWindow,
  CreatorGrowthWorkspace,
  CreatorIncentiveCopy,
  CreatorReplyOpportunity,
  CreatorRepresentativePost,
  CreatorTopPost,
  CreatorTopicIdea,
  DisplayableCurationFeedbackSource,
} from './types'

const safeText = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const next = value.trim()
  return next || fallback
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

export const emptyCreatorCurationFeedbackSummary = (fallbackReason = 'backend_not_connected'): CreatorCurationFeedbackSummary => ({
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
  const displayableSource = isDisplayableCurationFeedbackSource(source) ? source : undefined
  return {
    eventId: adaptId(raw?.eventId ?? raw?.id ?? `${contentId}:${raw?.triggeredAt ?? raw?.createdAt ?? ''}`),
    contentId,
    contentTitle: safeCurationText(raw?.contentTitle ?? raw?.postTitle ?? raw?.title, '公开内容标题暂未返回'),
    placementLabel: safeCurationText(raw?.placementLabel ?? raw?.topicTitle ?? raw?.sectionTitle ?? raw?.slotName, '公开内容收录'),
    reasonText: safeCurationText(raw?.reasonText ?? raw?.curationReason ?? raw?.reason, '运营收录理由暂未返回'),
    href: safeSameSitePath(raw?.href ?? raw?.targetPath ?? raw?.jumpPath ?? (contentId ? `/post/${contentId}` : undefined)),
    triggeredAt: toTimestamp(raw?.triggeredAt ?? raw?.createdAt ?? raw?.createTime, Date.now()),
    source,
    displayableSource,
    publicMetrics: raw?.publicMetrics || raw?.metrics ? adaptCreatorCurationMetrics(raw?.publicMetrics ?? raw?.metrics) : undefined,
  }
}

export const adaptCreatorCurationFeedbackSummary = (raw: any): CreatorCurationFeedbackSummary => {
  const items = toList(raw?.items ?? raw?.records, adaptCreatorCurationFeedback)
  const recentItems = toList(raw?.recentItems, adaptCreatorCurationFeedback)
  const displayRecentItems = (recentItems.length ? recentItems : items)
    .filter((item) => item.displayableSource && item.contentTitle && item.placementLabel && item.reasonText)
    .slice(0, 5)
  return {
    updatedAt: toTimestamp(raw?.updatedAt ?? raw?.updateTime, Date.now()),
    degraded: Boolean(raw?.degraded),
    fallbackReason: safeText(raw?.fallbackReason) || undefined,
    total: toNumber(raw?.total, items.length),
    items,
    recentItems: displayRecentItems,
  }
}

const adaptFeedbackWindow = (raw: any): CreatorFeedbackWindow => ({
  days: toNumber(raw?.days, 30),
  label: safeText(raw?.label, raw?.days === 7 ? '近 7 天' : '近 30 天'),
  viewCount: toNumber(raw?.viewCount),
  likeCount: toNumber(raw?.likeCount),
  favoriteCount: toNumber(raw?.favoriteCount),
  commentCount: toNumber(raw?.commentCount),
  followerCount: toNumber(raw?.followerCount),
  replyCount: toNumber(raw?.replyCount ?? raw?.feedbackCount),
  feedbackCopy: safeText(raw?.feedbackCopy ?? raw?.trendText),
})

export const adaptCreatorFeedbackSummary = (raw: any): CreatorFeedbackSummary => ({
  updatedAt: toNumber(raw?.updatedAt ?? raw?.updateTime, Date.now()),
  degraded: Boolean(raw?.degraded),
  degradationReasons: adaptStringList(raw?.degradationReasons),
  windows: toList(raw?.windows, adaptFeedbackWindow),
  responseRate: toNumber(raw?.responseRate),
  unreadCommentCount: toNumber(raw?.unreadCommentCount),
  topFeedbackSignals: adaptStringList(raw?.topFeedbackSignals),
})

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
  href: safeText(raw?.href) || undefined,
})

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
  href: safeText(raw?.href) || undefined,
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
  href: safeText(raw?.href) || undefined,
})

const adaptCreatorTopicEditorQuery = (raw: any) => {
  const editorQuery = raw?.editorQuery ?? raw?.query ?? raw?.jumpParams ?? {}
  const source = safeText(editorQuery?.source ?? raw?.sourceType ?? raw?.sourceSignals?.[0], 'creator_topic_idea')
  return {
    source,
    title: safeText(editorQuery?.title ?? raw?.title) || undefined,
    postType: safeText(editorQuery?.postType ?? raw?.suggestedFormat ?? raw?.suggestedContentType) || undefined,
    topic: safeText(editorQuery?.topic ?? raw?.targetDomainName) || undefined,
    seriesId: safeText(editorQuery?.seriesId) || undefined,
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

export const adaptCreatorTopicIdea = (raw: any): CreatorTopicIdea => ({
  id: adaptId(raw?.id ?? raw?.ideaId ?? raw?.title),
  title: topicIdeaTitle(raw),
  prompt: safeText(raw?.prompt),
  reason: safeText(raw?.reason),
  sourceType: safeText(raw?.sourceType ?? raw?.source ?? raw?.sourceSignals?.[0]) || undefined,
  sourceSignals: adaptStringList(raw?.sourceSignals ?? (raw?.source ? [raw.source] : [])),
  targetDomain: raw?.targetDomain == null ? undefined : toNumber(raw.targetDomain),
  targetDomainName: safeText(raw?.targetDomainName) || undefined,
  suggestedFormat: safeText(raw?.suggestedFormat ?? raw?.suggestedContentType) || undefined,
  editorQuery: adaptCreatorTopicEditorQuery(raw),
})

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

export const adaptCreatorGrowthWorkspace = (raw: any): CreatorGrowthWorkspace => ({
  updatedAt: toNumber(raw?.updatedAt ?? raw?.updateTime, Date.now()),
  degraded: Boolean(raw?.degraded),
  degradationReasons: adaptStringList(raw?.degradationReasons),
  feedbackSummary: adaptCreatorFeedbackSummary(raw?.feedbackSummary ?? raw?.creatorFeedbackSummary),
  topPosts: toList(raw?.topPosts ?? raw?.creatorTopPosts, adaptCreatorTopPost),
  replyOpportunities: toList(raw?.replyOpportunities ?? raw?.creatorReplyOpportunities, adaptCreatorReplyOpportunity),
  representativePosts: toList(raw?.representativePosts ?? raw?.creatorRepresentativePosts, adaptCreatorRepresentativePost),
  topicIdeas: toList(raw?.topicIdeas ?? raw?.creatorTopicIdeas, adaptCreatorTopicIdea),
  incentiveCopy: adaptCreatorIncentiveCopy(raw?.incentiveCopy ?? raw?.nonPaymentIncentiveCopy),
})

const localDemoResult = <T>(data: T): Result<T> => ({
  code: 0,
  message: 'local_demo_seed',
  data,
})

export const isDemoFallbackEnabled = () => {
  const env = import.meta.env
  return Boolean(
    env.DEV
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
        skipAuthRedirect: true,
      }) as Result<any>
      return {
        ...res,
        data: res.data ? adaptCreatorFeedbackSummary(res.data) : null,
      }
    } catch (error) {
      if (shouldUseDemoFallback(error)) {
        return localDemoResult(demoCreatorFeedbackSummary)
      }
      throw error
    }
  },

  getWorkspace: async (): Promise<Result<CreatorGrowthWorkspace>> => {
    try {
      const res = await client.get('/api/v1/creator-growth/workspace', {
        skipAuthRedirect: true,
      }) as Result<any>
      return {
        ...res,
        data: res.data ? adaptCreatorGrowthWorkspace(res.data) : null,
      }
    } catch (error) {
      if (shouldUseDemoFallback(error)) {
        return localDemoResult(demoCreatorGrowthWorkspace)
      }
      throw error
    }
  },

  getTopicIdeas: async (): Promise<Result<CreatorTopicIdea[]>> => {
    try {
      const res = await client.get('/api/v1/creator-growth/topic-ideas', {
        skipAuthRedirect: true,
      }) as Result<any>
      return {
        ...res,
        data: Array.isArray(res.data) ? res.data.map(adaptCreatorTopicIdea) : [],
      }
    } catch (error) {
      if (shouldUseDemoFallback(error)) {
        return localDemoResult(demoCreatorTopicIdeas)
      }
      throw error
    }
  },

  getRepresentativePosts: async (): Promise<Result<CreatorRepresentativePost[]>> => {
    try {
      const res = await client.get('/api/v1/creator-growth/representative-posts', {
        skipAuthRedirect: true,
      }) as Result<any>
      return {
        ...res,
        data: Array.isArray(res.data) ? res.data.map(adaptCreatorRepresentativePost) : [],
      }
    } catch (error) {
      if (shouldUseDemoFallback(error)) {
        return localDemoResult(demoCreatorRepresentativePosts)
      }
      throw error
    }
  },

  updateRepresentativePosts: async (postIds: Array<string | number>): Promise<Result<CreatorRepresentativePost[]>> => {
    const res = await client.put('/api/v1/creator-growth/representative-posts', { postIds }) as Result<any>
    return {
      ...res,
      data: Array.isArray(res.data) ? res.data.map(adaptCreatorRepresentativePost) : [],
    }
  },

  getCurationFeedbackSummary: async (): Promise<Result<CreatorCurationFeedbackSummary>> => {
    try {
      const res = await client.get('/api/v1/creator-growth/curation-feedback', {
        skipAuthRedirect: true,
      }) as Result<any>
      return {
        ...res,
        data: res.data ? adaptCreatorCurationFeedbackSummary(res.data) : emptyCreatorCurationFeedbackSummary('empty_response'),
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
