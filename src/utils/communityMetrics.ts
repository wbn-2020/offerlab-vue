import type { Post, Tag } from '@/api/types'
import { COMMUNITY_CONTENT_TYPES, getContentTypeShortLabel } from '@/utils/contentTypes'

export interface MetricItem {
  name: string
  count: number
  percentage?: number
}

export interface ContributionSummary {
  score: number
  level: string
  badge: string
  postCount: number
  featuredCount: number
  likeCount: number
  favoriteCount: number
  commentCount: number
  viewCount: number
  source?: string
  estimated?: boolean
  profileVisible?: boolean
}

export const isFeaturedPost = (post?: Pick<Post, 'extension'> | null) => {
  const value = post?.extension?.featured
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true'
}

export const buildTypeDistribution = (posts: Post[]): MetricItem[] => {
  const counts = new Map<number, number>()
  posts.forEach((post) => {
    counts.set(Number(post.postType), (counts.get(Number(post.postType)) || 0) + 1)
  })
  const total = Math.max(1, posts.length)
  return COMMUNITY_CONTENT_TYPES
    .map((type) => ({
      name: type.label,
      count: counts.get(Number(type.value)) || 0,
      percentage: Math.round(((counts.get(Number(type.value)) || 0) / total) * 100),
    }))
    .filter((item) => item.count > 0)
}

export const buildContributionSummary = (posts: Post[]): ContributionSummary => {
  const featuredCount = posts.filter(isFeaturedPost).length
  const likeCount = posts.reduce((sum, post) => sum + Number(post.counter?.like || 0), 0)
  const favoriteCount = posts.reduce((sum, post) => sum + Number(post.counter?.favorite || 0), 0)
  const commentCount = posts.reduce((sum, post) => sum + Number(post.counter?.comment || 0), 0)
  const viewCount = posts.reduce((sum, post) => sum + Number(post.counter?.view || 0), 0)
  const score = posts.length * 10 + featuredCount * 30 + likeCount + favoriteCount * 2 + commentCount * 2
  return {
    score,
    level: contributionLevel(score),
    badge: contributionBadge(score, featuredCount),
    postCount: posts.length,
    featuredCount,
    likeCount,
    favoriteCount,
    commentCount,
    viewCount,
  }
}

export const buildTopicItems = (posts: Post[], tags: Tag[] = [], limit = 8): MetricItem[] => {
  const counts = new Map<string, number>()
  const add = (value: unknown) => {
    const text = String(value || '').trim()
    if (!text) return
    counts.set(text, (counts.get(text) || 0) + 1)
  }
  posts.forEach((post) => {
    const stacks = Array.isArray(post.extension?.techStacks) ? post.extension.techStacks : []
    stacks.forEach(add)
    add(post.extension?.scenario)
    post.tags?.forEach((tag) => add(tag.name))
  })
  tags.forEach((tag) => {
    const name = String(tag.name || '').trim()
    if (name) counts.set(name, Math.max(counts.get(name) || 0, Number(tag.count || 0)))
  })
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
}

export const postTypeSummary = (posts: Post[]) => {
  const distribution = buildTypeDistribution(posts)
  if (!distribution.length) return '暂无内容类型分布'
  return distribution
    .slice(0, 3)
    .map((item) => `${item.name} ${item.count}`)
    .join(' / ')
}

export const contentTypeName = (type?: number | null) => getContentTypeShortLabel(type)

const contributionLevel = (score: number) => {
  if (score >= 500) return 'L5 社区专家'
  if (score >= 240) return 'L4 深度作者'
  if (score >= 120) return 'L3 经验沉淀者'
  if (score >= 40) return 'L2 活跃分享者'
  return 'L1 新作者'
}

const contributionBadge = (score: number, featuredCount: number) => {
  if (featuredCount >= 5) return '精选作者'
  if (score >= 240) return '高质量贡献者'
  if (score >= 120) return '持续输出'
  if (score >= 40) return '社区新星'
  return '开始沉淀'
}
