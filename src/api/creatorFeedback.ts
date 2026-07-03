import client, { BizException, type Result } from './client'
import {
  demoCreatorFeedbackSummary,
  demoCreatorGrowthWorkspace,
  demoCreatorRepresentativePosts,
  demoCreatorTopicIdeas,
} from '@/data/demoSeeds'
import { adaptId } from './adapters'
import type {
  CreatorFeedbackSummary,
  CreatorFeedbackWindow,
  CreatorGrowthWorkspace,
  CreatorIncentiveCopy,
  CreatorReplyOpportunity,
  CreatorRepresentativePost,
  CreatorTopPost,
  CreatorTopicIdea,
} from './types'

const safeText = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const next = value.trim()
  return next || fallback
}

const toNumber = (value: unknown, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

const toList = <T,>(value: unknown, mapper: (item: any) => T): T[] => (
  Array.isArray(value) ? value.map(mapper) : []
)

const adaptStringList = (value: unknown) => toList(value, (item) => safeText(item)).filter(Boolean)

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

export const shouldUseDemoFallback = (error: unknown) => {
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
      if (shouldUseDemoFallback(error)) return localDemoResult(demoCreatorFeedbackSummary)
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
      if (shouldUseDemoFallback(error)) return localDemoResult(demoCreatorGrowthWorkspace)
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
      if (shouldUseDemoFallback(error)) return localDemoResult(demoCreatorTopicIdeas)
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
      if (shouldUseDemoFallback(error)) return localDemoResult(demoCreatorRepresentativePosts)
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
}
