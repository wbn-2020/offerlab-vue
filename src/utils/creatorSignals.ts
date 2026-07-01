import type { Post, User } from '@/api/types'
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
  hasCertificationEntry = true,
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
  if (hasCertificationEntry) {
    actions.push({
      title: '查看认证作者条件',
      description: '认证是社区贡献标识，会经过人工审核，不代表平台对每条内容背书。',
      href: '/certification/apply',
    })
  }
  return actions.slice(0, 4)
}

export const safeCreatorBio = (value?: string, fallback = '这位作者还没有填写简介。') => (
  sanitizePublicVisibleText(value, fallback)
)
