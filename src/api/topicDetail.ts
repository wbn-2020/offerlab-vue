import client, { BizException, type Result } from './client'
import { adaptPost } from './adapters'
import type { ApiId, Post } from './types'

export type TopicDetailSource =
  | 'remote'
  | 'operation-curation'
  | 'community-topic'
  | 'public-content-query'
  | 'fallback-demo'
  | 'unavailable'

export type DisplayableTopicDetailSource = Exclude<TopicDetailSource, 'fallback-demo' | 'unavailable'>
export type TopicDetailStatus = 'READY' | 'EMPTY' | 'UNAVAILABLE'

export interface CuratedTopicItem {
  id: string
  title: string
  summary?: string
  href?: string
  disabled: boolean
  source: DisplayableTopicDetailSource
  sourceType: string
  sourceId?: ApiId
  reasonText?: string
  sortOrder: number
  post?: Post
}

export interface CuratedTopicSection {
  id: string
  title: string
  source: DisplayableTopicDetailSource
  sourceType: string
  sourceId?: ApiId
  reasonText?: string
  sortOrder: number
  items: CuratedTopicItem[]
}

export interface TopicRelatedEntry {
  id: string
  title: string
  href?: string
  disabled: boolean
  source: DisplayableTopicDetailSource
  reasonText?: string
}

export interface CuratedTopicDetail {
  id: ApiId | string
  slug: string
  title: string
  summary?: string
  coverUrl?: string
  status: TopicDetailStatus
  source: TopicDetailSource
  degraded: boolean
  fallbackReason?: string
  currentVersion?: number
  sourceNote?: string
  sortNote?: string
  sections: CuratedTopicSection[]
  relatedEntries: TopicRelatedEntry[]
  updatedAt?: string
}

interface RemoteTopicSection {
  id?: ApiId
  title?: string
  sourceType?: string
  sourceId?: ApiId
  status?: string
  sortOrder?: number
  note?: string
  reasonText?: string
  post?: unknown
  items?: RemoteTopicSection[]
}

interface RemoteTopicDetail {
  id?: ApiId
  slug?: string
  name?: string
  title?: string
  description?: string
  coverUrl?: string
  status?: string
  source?: TopicDetailSource
  degraded?: boolean
  fallbackReason?: string
  operationType?: string
  currentVersion?: number
  sections?: RemoteTopicSection[]
  updateTime?: string
}

const displayableSources: ReadonlySet<TopicDetailSource> = new Set([
  'remote',
  'operation-curation',
  'community-topic',
  'public-content-query',
])

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

const isDisplayableSource = (source: TopicDetailSource | undefined): source is DisplayableTopicDetailSource => (
  Boolean(source && displayableSources.has(source))
)

const isSafeText = (value: string | undefined) => {
  const normalized = (value || '').trim()
  return !textBlockers.some((blocker) => normalized.toLowerCase().includes(blocker.toLowerCase()))
}

const isSafeHref = (href: string | undefined): href is string => (
  Boolean(href)
  && href!.startsWith('/')
  && !href!.startsWith('//')
  && !/fallback|demo|fixture|local_demo/i.test(href!)
)

const postHref = (post: Post | null | undefined) => {
  const id = post?.postId
  return id ? `/post/${encodeURIComponent(String(id))}` : undefined
}

const emptyTopicDetail = (slug: string, fallbackReason = 'operation_topic_unavailable'): CuratedTopicDetail => ({
  id: `empty:${slug}`,
  slug,
  title: slug || 'Topic',
  status: 'UNAVAILABLE',
  source: 'unavailable',
  degraded: true,
  fallbackReason,
  sections: [],
  relatedEntries: [],
})

const adaptItem = (
  raw: RemoteTopicSection | undefined,
  source: TopicDetailSource,
  rankFallback: number,
): CuratedTopicItem | null => {
  if (!raw || !isDisplayableSource(source) || !isSafeText(raw.title) || !isSafeText(raw.note || raw.reasonText)) return null
  const post = raw.post ? adaptPost(raw.post) : undefined
  if (raw.post && (!post?.postId || !isSafeText(post.title) || !isSafeText(post.summary))) return null
  let href = postHref(post)
  href = isSafeHref(href) ? href : undefined
  const title = post?.title || raw.title || 'Curated content'
  if (!isSafeText(title)) return null
  return {
    id: String(raw.id || `${raw.sourceType || 'POST'}:${raw.sourceId || rankFallback}`),
    title,
    summary: post?.summary || raw.note,
    href,
    disabled: !href,
    source,
    sourceType: raw.sourceType || 'POST',
    sourceId: raw.sourceId,
    reasonText: isSafeText(raw.reasonText || raw.note) ? raw.reasonText || raw.note : undefined,
    sortOrder: raw.sortOrder ?? rankFallback,
    post,
  }
}

const adaptSection = (
  raw: RemoteTopicSection | undefined,
  index: number,
  source: TopicDetailSource,
): CuratedTopicSection | null => {
  if (!raw || !isDisplayableSource(source) || !isSafeText(raw.title) || !isSafeText(raw.note || raw.reasonText)) return null
  const rawItems = Array.isArray(raw.items) && raw.items.length ? raw.items : [raw]
  const items = rawItems
    .map((item, itemIndex) => adaptItem(item, source, itemIndex + 1))
    .filter(Boolean) as CuratedTopicItem[]
  if (!items.length) return null
  return {
    id: String(raw.id || `section:${index + 1}`),
    title: raw.title || `Section ${index + 1}`,
    source,
    sourceType: raw.sourceType || 'POST',
    sourceId: raw.sourceId,
    reasonText: isSafeText(raw.reasonText || raw.note) ? raw.reasonText || raw.note : undefined,
    sortOrder: raw.sortOrder ?? index + 1,
    items,
  }
}

const hasDisplayableItems = (section: CuratedTopicSection | null): section is CuratedTopicSection => (
  Boolean(section && section.items.length > 0)
)

const adaptTopicDetail = (raw: RemoteTopicDetail | null | undefined, slug: string): CuratedTopicDetail => {
  if (!raw) return emptyTopicDetail(slug, 'operation_topic_empty')
  const source = raw.source
  if (!isDisplayableSource(source) || !isSafeText(raw.name || raw.title) || !isSafeText(raw.description)) {
    return emptyTopicDetail(slug, 'operation_topic_filtered')
  }
  const sections = (Array.isArray(raw.sections) ? raw.sections : [])
    .map((section, index) => adaptSection(section, index, source))
    .filter(hasDisplayableItems)
  if (!sections.length) return emptyTopicDetail(slug, 'operation_topic_sections_empty')
  return {
    id: raw.id || raw.slug || slug,
    slug: raw.slug || slug,
    title: raw.name || raw.title || slug,
    summary: raw.description,
    coverUrl: raw.coverUrl,
    status: 'READY',
    source,
    degraded: Boolean(raw.degraded),
    fallbackReason: raw.fallbackReason,
    currentVersion: raw.currentVersion,
    sourceNote: 'Curated from public community content.',
    sortNote: 'Sections follow the published operation order.',
    sections,
    relatedEntries: [],
    updatedAt: raw.updateTime,
  }
}

const topicNotFound = (error: unknown) => {
  if (error instanceof BizException) return error.code === 10404
  const status = (error as { response?: { status?: number } } | null)?.response?.status
  return status === 404 || status === 405
}

export const topicDetailApi = {
  getCuratedTopicDetail: async (slug: string): Promise<Result<CuratedTopicDetail>> => {
    try {
      const res = await client.get(`/api/v1/operations/topics/${encodeURIComponent(slug)}`) as Result<RemoteTopicDetail>
      return { ...res, data: adaptTopicDetail(res.data, slug) }
    } catch (error) {
      if (!topicNotFound(error)) throw error
      return {
        code: 0,
        message: 'operation topic unavailable',
        data: emptyTopicDetail(slug, 'operation_topic_not_found'),
      }
    }
  },
}
