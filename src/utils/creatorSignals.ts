import type { CreatorTopicIdea, Post, User } from '@/api/types'
import type { ContentSeriesRecord } from '@/api/contentSeries'
import { getDomainLabel } from '@/utils/domains'
import { getContentTypeShortLabel } from '@/utils/contentTypes'
import { isFeaturedPost, type ContributionSummary } from '@/utils/communityMetrics'
import { sanitizePublicVisibleText } from '@/utils/textQuality'

export interface CreatorActionItem {
  title: string
  description: string
  href: string
}

export type Phase10P0CreatorSignal =
  | 'feedback_summary'
  | 'top_posts'
  | 'reply_opportunities'
  | 'representative_posts'
  | 'public_collections'
  | 'topic_ideas'
  | 'non_payment_incentive'

const PHASE10_P0_CREATOR_SIGNALS = new Set<Phase10P0CreatorSignal>([
  'feedback_summary',
  'top_posts',
  'reply_opportunities',
  'representative_posts',
  'public_collections',
  'topic_ideas',
  'non_payment_incentive',
])

export const CREATOR_NON_PAYMENT_INCENTIVE_COPY = '非支付激励：不涉及支付，不承诺收益，不代表平台专业背书。'

export const isPhase10P0CreatorSignal = (value: unknown): value is Phase10P0CreatorSignal => (
  PHASE10_P0_CREATOR_SIGNALS.has(String(value) as Phase10P0CreatorSignal)
)

export const buildCreatorFeedbackWindowCopy = (
  days: 7 | 30 | number,
  metrics: Partial<{
    commentCount: number
    favoriteCount: number
    replyCount: number
  }> = {},
) => {
  const label = days === 7 ? '近 7 天' : days === 30 ? '近 30 天' : `近 ${Math.max(1, Number(days) || 30)} 天`
  const comments = Math.max(0, Number(metrics.commentCount || 0))
  const favorites = Math.max(0, Number(metrics.favoriteCount || 0))
  const replies = Math.max(0, Number(metrics.replyCount || 0))
  if (!comments && !favorites && !replies) {
    return `${label}反馈会汇总公开内容的评论、收藏和回应线索；暂无数据时只展示空状态，不伪装真实趋势。`
  }
  return `${label}反馈：${comments} 条评论、${favorites} 次收藏、${replies} 条可继续回应的线索。`
}

export const buildCreatorTopicIdeaCopy = (idea: Pick<CreatorTopicIdea, 'title' | 'reason' | 'sourceType'> | string) => {
  if (typeof idea === 'string') {
    return `选题灵感：${idea}。来源会标明为示例或公开内容反馈，不承诺推荐、涨粉或曝光效果。`
  }
  const sourceCopy = idea.sourceType ? `来源：${idea.sourceType}。` : ''
  return `选题灵感：${idea.title}。${sourceCopy}${idea.reason || '基于公开内容反馈或示例规则生成，可自行调整方向。'}`
}

const engagementScore = (post: Post) => (
  (isFeaturedPost(post) ? 10_000 : 0)
  + Number(post.counter?.favorite || 0) * 6
  + Number(post.counter?.comment || 0) * 4
  + Number(post.counter?.like || 0) * 2
  + Number(post.counter?.view || 0) * 0.1
  + Number(post.updatedAt || post.createdAt || 0) / 10_000_000_000
)

export const isPublicAuthor = (user?: User | null) => Boolean(user?.uid)
  && String(user?.uid) !== '0'
  && user?.profileVisible !== false

export const publicAuthorPosts = (posts: Post[]) => posts.filter((post) => (
  !post.anonymous
  && post.author?.profileVisible !== false
  && String(post.author?.uid || '') !== '0'
))

export const pickRepresentativePosts = (posts: Post[], limit = 3) => (
  [...publicAuthorPosts(posts)]
    .sort((a, b) => engagementScore(b) - engagementScore(a))
    .slice(0, limit)
)

export const latestPublicPosts = (posts: Post[], limit = 6) => (
  [...publicAuthorPosts(posts)]
    .sort((a, b) => Number(b.createdAt || b.updatedAt || 0) - Number(a.createdAt || a.updatedAt || 0))
    .slice(0, limit)
)

export const creatorFocusLabels = (posts: Post[], limit = 4) => {
  const labels = new Map<string, number>()
  publicAuthorPosts(posts).forEach((post) => {
    const domainLabel = post.domain ? getDomainLabel(post.domain) : ''
    if (domainLabel) labels.set(domainLabel, (labels.get(domainLabel) || 0) + 2)
    const typeLabel = getContentTypeShortLabel(post.postType)
    if (typeLabel) labels.set(typeLabel, (labels.get(typeLabel) || 0) + 1)
    post.tags?.slice(0, 3).forEach((tag) => {
      if (tag.name) labels.set(tag.name, (labels.get(tag.name) || 0) + 1)
    })
  })
  return [...labels.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label]) => label)
    .slice(0, limit)
}

export const buildFollowReasons = (
  user: User | null | undefined,
  posts: Post[] = [],
  contribution?: ContributionSummary | null,
  collections: ContentSeriesRecord[] = [],
) => {
  if (!isPublicAuthor(user)) return ['主页可见范围由作者隐私设置决定。']
  const reasons: string[] = []
  const focus = creatorFocusLabels(posts, 2)
  if (focus.length) reasons.push(`持续分享 ${focus.join('、')} 相关内容。`)
  if ((contribution?.featuredCount || 0) > 0) reasons.push(`已有 ${contribution?.featuredCount} 篇内容被精选。`)
  if ((contribution?.favoriteCount || 0) >= 5) reasons.push('多篇内容被收藏，适合长期回看。')
  if (collections.length > 0) reasons.push(`整理了 ${collections.length} 个公开合集，方便连续阅读。`)
  if ((user?.postCount || posts.length) > 0 && !reasons.length) reasons.push('已经沉淀公开内容，可以从主页继续了解。')
  if (!reasons.length) reasons.push('关注后可以更方便看到 TA 的后续公开内容。')
  return reasons.slice(0, 3)
}

export const buildCreatorActions = (
  posts: Post[],
  contribution: ContributionSummary,
  hasPublicCollections: boolean,
): CreatorActionItem[] => {
  const actions: CreatorActionItem[] = []
  if (!posts.length) {
    actions.push({
      title: '发布第一篇公开内容',
      description: '经验、问题、攻略或资源都可以成为作者主页的起点。',
      href: '/editor',
    })
  }
  if (!hasPublicCollections) {
    actions.push({
      title: '整理一个公开合集',
      description: '把相关内容放进合集，让读者可以连续阅读。',
      href: '/series/workbench',
    })
  }
  if ((contribution.featuredCount || 0) === 0 && posts.length > 0) {
    actions.push({
      title: '打磨一篇代表内容',
      description: '标题、摘要、标签和内容结构越清楚，越容易被读者收藏。',
      href: '/me?tab=posts',
    })
  }
  return actions.slice(0, 4)
}

export const safeCreatorBio = (value?: string, fallback = '这位作者还没有填写简介。') => (
  sanitizePublicVisibleText(value, fallback)
)
