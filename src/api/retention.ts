import { type Result } from './client'
import { feedApi } from './feed'
import { notificationApi } from './notification'
import { postApi } from './post'
import type { Notification, Post } from './types'
import { filterVisiblePosts, isPublicPostVisible } from '@/utils/recommendationGovernance'

export const RETENTION_BLOCK_DEFAULT_LIMIT = 3
export const RETENTION_BLOCK_MAX_LIMIT = 5
export const RETENTION_SAME_SOURCE_DEFAULT_LIMIT = 1
export const RETENTION_TOPIC_UPDATES_ENABLED = false

export const RETENTION_SOURCE_WHITELIST = [
  'favorite',
  'unorganized_favorite',
  'discussion_revisit',
  'following_author_update',
  'following_topic_update',
] as const

export type RetentionSource = typeof RETENTION_SOURCE_WHITELIST[number]

export interface RetentionSummaryItem {
  id: string
  source: RetentionSource
  title: string
  description?: string
  href: string
  post?: Post
  sourceKey?: string
  createdAt?: number
}

export interface RetentionSummaryBlock {
  key: 'continue_reading' | 'discussion_revisits' | 'following_author_updates' | 'following_topic_updates'
  title: string
  description: string
  source: RetentionSource
  items: RetentionSummaryItem[]
  degraded?: boolean
  fallbackReason?: string
}

export interface RetentionSummary {
  status: 'ready' | 'unauthenticated' | 'degraded'
  generatedAt: number
  preferenceNote: 'existing_notification_preferences'
  blocks: RetentionSummaryBlock[]
  externalPush: false
  advertising: false
  payment: false
}

export const RETENTION_FORBIDDEN_COPY_PATTERNS = [
  /你错过了很多/,
  /再不看就晚了/,
  /连续第\s*\d+\s*天/,
  /大家都在看但你没看/,
  /限时回归/,
  /外部推送|短信|邮件|设备\s*token/i,
  /广告召回|付费曝光|商业推荐/,
  /真实支付|会员|订阅|提现|打赏/,
] as const

const retentionSourceSet = new Set<string>(RETENTION_SOURCE_WHITELIST)

export const isRetentionSourceAllowed = (source: unknown): source is RetentionSource => (
  typeof source === 'string' && retentionSourceSet.has(source)
)

export const hasForbiddenRetentionCopy = (text: unknown) => (
  RETENTION_FORBIDDEN_COPY_PATTERNS.some((pattern) => pattern.test(String(text || '')))
)

const safeText = (value: unknown, fallback: string, maxLength = 72) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  const candidate = text && !hasForbiddenRetentionCopy(text) ? text : fallback
  return candidate.length > maxLength ? `${candidate.slice(0, maxLength - 1)}...` : candidate
}

const sourceKeyOf = (item: RetentionSummaryItem) => item.sourceKey || item.id

const limitBySource = (items: RetentionSummaryItem[], limit = RETENTION_SAME_SOURCE_DEFAULT_LIMIT) => {
  const counts = new Map<string, number>()
  return items.filter((item) => {
    const key = `${item.source}:${sourceKeyOf(item)}`
    const count = counts.get(key) || 0
    if (count >= limit) return false
    counts.set(key, count + 1)
    return true
  })
}

export const sanitizeRetentionItems = (
  items: RetentionSummaryItem[],
  limit = RETENTION_BLOCK_DEFAULT_LIMIT,
) => {
  const safeItems = items
    .filter((item) => isRetentionSourceAllowed(item.source))
    .filter((item) => !item.post || isPublicPostVisible(item.post))
    .filter((item) => !hasForbiddenRetentionCopy(`${item.title} ${item.description || ''}`))
    .map((item) => ({
      ...item,
      title: safeText(item.title, '可回看的公开内容'),
      description: item.description ? safeText(item.description, '来自站内公开内容和社区互动') : undefined,
    }))
  return limitBySource(safeItems).slice(0, Math.min(limit, RETENTION_BLOCK_MAX_LIMIT))
}

const postToItem = (post: Post, source: RetentionSource): RetentionSummaryItem => ({
  id: `${source}:${post.postId}`,
  source,
  title: safeText(post.title, '可回看的公开内容'),
  description: safeText(post.summary || post.content, source === 'following_author_update' ? '你关注的作者发布了公开内容' : '来自你的收藏和稍后整理入口'),
  href: `/post/${post.postId}`,
  post,
  sourceKey: source === 'following_author_update' ? String(post.author?.uid || post.postId) : String(post.postId),
  createdAt: Number(post.updatedAt || post.createdAt || 0),
})

const notificationToDiscussionItem = (notification: Notification): RetentionSummaryItem | null => {
  if (!['comment', 'mention', 'favorite'].includes(notification.type)) return null
  const href = notification.targetPath || (notification.relatedId ? `/post/${notification.relatedId}` : '')
  if (!href) return null
  return {
    id: `discussion_revisit:${notification.notificationId}`,
    source: 'discussion_revisit',
    title: safeText(notification.title, '你参与过的讨论有新回应'),
    description: safeText(notification.content, '可以回到相关内容继续交流'),
    href,
    sourceKey: String(notification.relatedId || notification.targetPath || notification.notificationId),
    createdAt: Number(notification.createdAt || 0),
  }
}

const emptySummary = (status: RetentionSummary['status']): RetentionSummary => ({
  status,
  generatedAt: Date.now(),
  preferenceNote: 'existing_notification_preferences',
  externalPush: false,
  advertising: false,
  payment: false,
  blocks: [],
})

const normalizeServerBlock = (block: any): RetentionSummaryBlock | null => {
  if (!block || !isRetentionSourceAllowed(block.source)) return null
  const items = Array.isArray(block.items) ? block.items : []
  return {
    key: block.key,
    title: safeText(block.title, '回来看看'),
    description: safeText(block.description, '来自站内公开内容和社区互动'),
    source: block.source,
    items: sanitizeRetentionItems(items, RETENTION_BLOCK_DEFAULT_LIMIT),
    degraded: Boolean(block.degraded),
    fallbackReason: typeof block.fallbackReason === 'string' ? block.fallbackReason : undefined,
  }
}

const normalizeServerSummary = (raw: any): RetentionSummary => ({
  ...emptySummary(raw?.status === 'unauthenticated' ? 'unauthenticated' : raw?.status === 'degraded' ? 'degraded' : 'ready'),
  generatedAt: Number(raw?.generatedAt || Date.now()),
  blocks: (Array.isArray(raw?.blocks) ? raw.blocks : [])
    .map(normalizeServerBlock)
    .filter((block: RetentionSummaryBlock | null): block is RetentionSummaryBlock => Boolean(block))
    .slice(0, 4),
})

const buildFallbackSummary = async (): Promise<RetentionSummary> => {
  const [favoritesRes, followingRes, notificationsRes] = await Promise.allSettled([
    postApi.getMyUnorganizedFavorites(undefined, RETENTION_BLOCK_MAX_LIMIT),
    feedApi.getFollowing(undefined, RETENTION_BLOCK_MAX_LIMIT * 2),
    notificationApi.getList('comment', undefined, RETENTION_BLOCK_MAX_LIMIT),
  ])

  const favoritePosts = favoritesRes.status === 'fulfilled'
    ? filterVisiblePosts(favoritesRes.value.data?.items || [], RETENTION_BLOCK_MAX_LIMIT)
    : []
  const followingPosts = followingRes.status === 'fulfilled'
    ? filterVisiblePosts(followingRes.value.data?.items || [], RETENTION_BLOCK_MAX_LIMIT * 2)
    : []
  const discussionNotifications = notificationsRes.status === 'fulfilled'
    ? notificationsRes.value.data?.items || []
    : []

  const continueItems = sanitizeRetentionItems(
    favoritePosts.map((post) => postToItem(post, 'unorganized_favorite')),
  )
  const followingItems = sanitizeRetentionItems(
    followingPosts.map((post) => postToItem(post, 'following_author_update')),
  )
  const discussionItems = sanitizeRetentionItems(
    discussionNotifications
      .map(notificationToDiscussionItem)
      .filter((item): item is RetentionSummaryItem => Boolean(item)),
  )

  const blocks: RetentionSummaryBlock[] = [
    {
      key: 'continue_reading',
      title: '继续阅读和稍后整理',
      description: '优先使用稍后读和未整理收藏；后端清单未稳定时使用收藏兜底。',
      source: 'unorganized_favorite',
      items: continueItems,
      degraded: favoritesRes.status !== 'fulfilled' || Boolean(favoritesRes.value.data?.degraded),
      fallbackReason: favoritesRes.status === 'fulfilled' ? favoritesRes.value.data?.fallbackReason : 'favorites_unavailable',
    },
    {
      key: 'discussion_revisits',
      title: '最近参与讨论',
      description: '只汇总评论、提及和收藏相关的站内讨论入口。',
      source: 'discussion_revisit',
      items: discussionItems,
      degraded: notificationsRes.status !== 'fulfilled',
      fallbackReason: notificationsRes.status !== 'fulfilled' ? 'notifications_unavailable' : undefined,
    },
    {
      key: 'following_author_updates',
      title: '关注作者更新',
      description: '按作者去重展示公开更新，同一作者默认只给一条。',
      source: 'following_author_update',
      items: followingItems,
      degraded: followingRes.status !== 'fulfilled',
      fallbackReason: followingRes.status !== 'fulfilled' ? 'following_feed_unavailable' : undefined,
    },
  ]

  return {
    ...emptySummary(blocks.some((block) => block.degraded) ? 'degraded' : 'ready'),
    blocks,
  }
}

export const retentionApi = {
  getSummary: async (authenticated: boolean): Promise<Result<RetentionSummary>> => {
    if (!authenticated) {
      return { code: 0, message: 'unauthenticated', data: emptySummary('unauthenticated') }
    }

    return { code: 0, message: 'frontend_retention_summary', data: await buildFallbackSummary() }
  },
}
