import type { Post, User } from '@/api/types'
import type { ContentSeriesRecord } from '@/api/contentSeries'
import { getContentTypeShortLabel } from '@/utils/contentTypes'
import { getDomainLabel } from '@/utils/domains'
import { publicAuthorPosts } from '@/utils/creatorSignals'
import {
  filterVisibleCollections,
  filterVisiblePosts,
  neutralizeHighRiskRecommendationReason,
} from '@/utils/recommendationGovernance'
import type { ContributionSummary } from '@/utils/communityMetrics'

export interface ExplainableSignal {
  key: string
  label: string
  value: string
  description: string
  neutral?: boolean
}

export interface PublicIdentitySummary {
  signals: ExplainableSignal[]
  focusLabels: string[]
  sourceNote: string
}

export interface RelationshipContext {
  visibleToViewer: boolean
  items: ExplainableSignal[]
}

const countText = (value: number, unit: string) => `${Math.max(0, Number(value || 0))} ${unit}`

export const buildPublicIdentitySummary = (
  user?: User | null,
  posts: Post[] = [],
  collections: ContentSeriesRecord[] = [],
  contribution?: ContributionSummary | null,
): PublicIdentitySummary => {
  if (!user || user.profileVisible === false) {
    return {
      signals: [],
      focusLabels: [],
      sourceNote: '主页可见范围由作者隐私设置决定。',
    }
  }

  const visiblePosts = publicAuthorPosts(filterVisiblePosts(posts))
  const visibleCollections = filterVisibleCollections(collections)
  const domainCounts = new Map<string, number>()
  const typeCounts = new Map<string, number>()
  visiblePosts.forEach((post) => {
    const domainLabel = post.domain ? getDomainLabel(post.domain) : ''
    const typeLabel = getContentTypeShortLabel(post.postType)
    if (domainLabel) domainCounts.set(domainLabel, (domainCounts.get(domainLabel) || 0) + 1)
    if (typeLabel) typeCounts.set(typeLabel, (typeCounts.get(typeLabel) || 0) + 1)
  })
  const focusLabels = [...domainCounts.entries(), ...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label]) => label)
    .slice(0, 6)

  const signals: ExplainableSignal[] = [
    {
      key: 'public_posts',
      label: '公开内容',
      value: countText(visiblePosts.length, '篇'),
      description: '仅统计公开、已发布、未受治理限制且非匿名的作者内容。',
      neutral: true,
    },
    {
      key: 'public_collections',
      label: '公开合集',
      value: countText(visibleCollections.length, '个'),
      description: '仅统计作者公开整理且可访问的内容合集。',
      neutral: true,
    },
  ]

  const featuredCount = Math.max(0, Number(contribution?.featuredCount || 0))
  if (featuredCount > 0) {
    signals.push({
      key: 'featured_public_posts',
      label: '频道整理',
      value: countText(featuredCount, '篇'),
      description: '表示内容曾被加入公开频道整理，不构成身份结论。',
      neutral: true,
    })
  }

  const savedCount = Math.max(0, Number(contribution?.favoriteCount || 0))
  if (savedCount > 0) {
    signals.push({
      key: 'reader_saves',
      label: '读者回看',
      value: countText(savedCount, '次'),
      description: '来自公开内容的收藏回看数据，只说明读者行为。',
      neutral: true,
    })
  }

  return {
    signals,
    focusLabels,
    sourceNote: '这些信息来自公开可见内容、公开合集和公开互动汇总，不代表平台排序或身份结论。',
  }
}

export const buildContentTrustSignals = (post?: Post | null): ExplainableSignal[] => {
  if (!post || !filterVisiblePosts([post]).length) return []
  const signals: ExplainableSignal[] = [
    {
      key: 'public_source',
      label: '公开来源',
      value: '可访问',
      description: '当前内容处于公开可访问状态，展示前已经过可见性过滤。',
      neutral: true,
    },
    {
      key: 'author_visible',
      label: '作者信息',
      value: post.anonymous || post.author?.profileVisible === false ? '不展示主页' : '可查看主页',
      description: post.anonymous
        ? '匿名发布内容不会进入作者公开身份摘要。'
        : '作者主页仅展示公开、合规、可见内容形成的解释信息。',
      neutral: true,
    },
  ]
  const reason = neutralizeHighRiskRecommendationReason(post.recommendationReasons?.[0], post)
  if (reason) {
    signals.push({
      key: 'neutral_context',
      label: '展示上下文',
      value: '中性说明',
      description: reason,
      neutral: true,
    })
  }
  return signals
}

export const buildRelationshipContext = (input: {
  viewerUid?: string | number | null
  author?: User | null
  post?: Post | null
  isLoggedIn: boolean
  isPublicVisitor?: boolean
}): RelationshipContext => {
  const sameUser = String(input.viewerUid ?? '') === String(input.author?.uid ?? '')
  if (!input.isLoggedIn || input.isPublicVisitor || !input.viewerUid || !input.author || sameUser) {
    return { visibleToViewer: false, items: [] }
  }

  const items: ExplainableSignal[] = []
  if (input.author.isFollowing) {
    items.push({
      key: 'following_author',
      label: '你的关系',
      value: '已关注',
      description: '仅你本人可见，用于说明你和作者的站内关系。',
      neutral: true,
    })
  }
  if (input.post?.myInteraction?.favorited) {
    items.push({
      key: 'saved_post',
      label: '你的回看',
      value: '已收藏',
      description: '仅你本人可见，不进入公开访客视角。',
      neutral: true,
    })
  }
  if (input.post?.myInteraction?.liked) {
    items.push({
      key: 'liked_post',
      label: '你的互动',
      value: '已点赞',
      description: '仅你本人可见，用于帮助你回忆已发生的站内互动。',
      neutral: true,
    })
  }

  return {
    visibleToViewer: items.length > 0,
    items,
  }
}
