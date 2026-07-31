import client, { BizException, type Result } from './client'
import { adaptPost } from './adapters'
import type { ApiId, Post } from './types'
import { legacyTopicSectionKey, nonEmptyTopicItemList } from '@/utils/topicSectionIdentity'

export type TopicDetailSource =
  | 'remote'
  | 'operation-curation'
  | 'community-topic'
  | 'public-content-query'
  | 'fallback-demo'
  | 'unavailable'

export type DisplayableTopicDetailSource = Exclude<TopicDetailSource, 'fallback-demo' | 'unavailable'>
export type TopicDetailStatus = 'PUBLISHED' | 'ARCHIVED' | 'OFFLINE' | 'DEGRADED' | 'UNAVAILABLE'

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

export type CuratedTopicScope = 'DOMAIN' | 'CROSS_DOMAIN'

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
  publishedAt?: string
  archivedAt?: string
  offlineAt?: string
  // 只读透传后端派生的专题范围；前端不得自行由 domain 是否为空推断跨频道。
  topicScope?: CuratedTopicScope
  // 单频道专题保留后端频道值；跨频道专题为 null，缺失字段保持 undefined。
  domain?: number | null
  sections: CuratedTopicSection[]
  relatedEntries: TopicRelatedEntry[]
  updatedAt?: string
}

export interface PublishedTopicIndex {
  id: ApiId | string
  slug: string
  title: string
  summary?: string
  href: string
  status: 'PUBLISHED' | 'ARCHIVED'
  source: DisplayableTopicDetailSource
  displayState: 'public' | 'archived'
  archived: boolean
  readOnly: boolean
  publishedAt?: string
  archivedAt?: string
  updatedAt?: string
}

export interface ArchivedTopicAsset extends Omit<PublishedTopicIndex, 'status' | 'displayState' | 'archived' | 'readOnly'> {
  status: 'ARCHIVED'
  displayState: 'archived'
  archived: true
  readOnly: true
}

interface RemoteTopicSection {
  id?: ApiId
  sectionKey?: string
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
  lifecycleStatus?: string
  publicStatus?: string
  publishStatus?: string
  source?: TopicDetailSource
  degraded?: boolean
  fallbackReason?: string
  operationType?: string
  currentVersion?: number
  topicScope?: string
  domain?: number | null
  sections?: RemoteTopicSection[]
  publishedAt?: string
  publishTime?: string
  archivedAt?: string
  archiveTime?: string
  offlineAt?: string
  offlineTime?: string
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

const normalizeTopicDetailStatus = (raw: RemoteTopicDetail): TopicDetailStatus => {
  const value = String(raw.lifecycleStatus || raw.publicStatus || raw.publishStatus || raw.status || '').trim().toUpperCase()
  if (!value && isDisplayableSource(raw.source)) return 'PUBLISHED'
  if (['PUBLISHED', 'READY', 'ACTIVE', 'LIVE', 'ONLINE'].includes(value)) return 'PUBLISHED'
  if (['ARCHIVED', 'ARCHIVE'].includes(value)) return 'ARCHIVED'
  if (['OFFLINE', 'DISABLED', 'TAKEN_DOWN', 'TAKEDOWN', 'REMOVED'].includes(value)) return 'OFFLINE'
  if (['DEGRADED', 'UNAVAILABLE'].includes(value)) return 'DEGRADED'
  return 'UNAVAILABLE'
}

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

const unavailableTopicDetail = (
  raw: RemoteTopicDetail | null | undefined,
  slug: string,
  status: TopicDetailStatus,
  fallbackReason: string,
): CuratedTopicDetail => ({
  id: raw?.id || raw?.slug || `empty:${slug}`,
  slug: raw?.slug || slug,
  title: isSafeText(raw?.name || raw?.title) ? raw?.name || raw?.title || slug : slug || 'Topic',
  summary: isSafeText(raw?.description) ? raw?.description : undefined,
  coverUrl: raw?.coverUrl,
  status,
  source: isDisplayableSource(raw?.source) ? raw!.source! : 'unavailable',
  degraded: true,
  fallbackReason,
  currentVersion: raw?.currentVersion,
  topicScope: adaptTopicScope(raw?.topicScope),
  domain: raw?.domain,
  sourceNote: status === 'OFFLINE'
    ? '专题已下线，当前不作为公开专题继续展示。'
    : '专题暂时不可用，未展示后台草稿、预览或内部说明。',
  sortNote: '可继续搜索相似公开内容。',
  sections: [],
  relatedEntries: [],
  updatedAt: raw?.updateTime,
  offlineAt: raw?.offlineAt || raw?.offlineTime,
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
  if (!raw || !isDisplayableSource(source) || !isSafeText(raw.title)) return null
  const rawItems = nonEmptyTopicItemList(raw.items, undefined) || [raw]
  const items = rawItems
    .map((item, itemIndex) => adaptItem(item, source, itemIndex + 1))
    .filter(Boolean) as CuratedTopicItem[]
  if (!items.length) return null
  return {
    id: String(raw.sectionKey || raw.id || `section:${index + 1}`),
    title: raw.title || `Section ${index + 1}`,
    source,
    sourceType: raw.sourceType || 'POST',
    sourceId: raw.sourceId,
    reasonText: undefined,
    sortOrder: raw.sortOrder ?? index + 1,
    items,
  }
}

const mergeRemoteTopicSections = (sections: RemoteTopicSection[]): RemoteTopicSection[] => {
  const merged = new Map<string, RemoteTopicSection>()
  sections.forEach((section, index) => {
    const title = String(section?.title || '').trim()
    const key = String(
      section?.sectionKey
      || legacyTopicSectionKey(title, index + 1),
    )
    const items = nonEmptyTopicItemList(section?.items, undefined) || [section]
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, {
        ...section,
        sectionKey: key,
        reasonText: undefined,
        note: undefined,
        items: [...items],
      })
      return
    }
    existing.items = [...(existing.items || []), ...items]
      .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
    existing.sortOrder = Math.min(
      Number(existing.sortOrder) || Number(section.sortOrder) || index + 1,
      Number(section.sortOrder) || Number(existing.sortOrder) || index + 1,
    )
  })
  return [...merged.values()].sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
}

const hasDisplayableItems = (section: CuratedTopicSection | null): section is CuratedTopicSection => (
  Boolean(section && section.items.length > 0)
)

export const isTopicIncludedInOrdinarySearch = (
  topic: Pick<CuratedTopicDetail, 'status' | 'source' | 'degraded'>,
) => {
  if (topic.status === 'OFFLINE') return false
  if (topic.status !== 'PUBLISHED' && topic.status !== 'ARCHIVED') return false
  if (!isDisplayableSource(topic.source)) return false
  return !topic.degraded
}

export const toPublishedTopicIndex = (
  topic: CuratedTopicDetail,
): PublishedTopicIndex | ArchivedTopicAsset | null => {
  if (!isTopicIncludedInOrdinarySearch(topic) || !isDisplayableSource(topic.source)) return null
  if (topic.status === 'ARCHIVED') {
    return {
      id: topic.id,
      slug: topic.slug,
      title: topic.title,
      summary: topic.summary,
      href: `/topics/${encodeURIComponent(topic.slug)}`,
      status: 'ARCHIVED',
      source: topic.source,
      displayState: 'archived',
      archived: true,
      readOnly: true,
      publishedAt: topic.publishedAt,
      archivedAt: topic.archivedAt,
      updatedAt: topic.updatedAt,
    }
  }
  return {
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    summary: topic.summary,
    href: `/topics/${encodeURIComponent(topic.slug)}`,
    status: 'PUBLISHED',
    source: topic.source,
    displayState: 'public',
    archived: false,
    readOnly: false,
    publishedAt: topic.publishedAt,
    updatedAt: topic.updatedAt,
  }
}

const adaptTopicDetail = (raw: RemoteTopicDetail | null | undefined, slug: string): CuratedTopicDetail => {
  if (!raw) return emptyTopicDetail(slug, 'operation_topic_empty')
  const source = raw.source
  const status = normalizeTopicDetailStatus(raw)
  if (!isDisplayableSource(source) || !isSafeText(raw.name || raw.title) || !isSafeText(raw.description)) {
    return emptyTopicDetail(slug, 'operation_topic_filtered')
  }
  if (status === 'OFFLINE') return unavailableTopicDetail(raw, slug, 'OFFLINE', 'operation_topic_offline')
  if (status !== 'PUBLISHED' && status !== 'ARCHIVED') {
    return unavailableTopicDetail(raw, slug, status === 'DEGRADED' ? 'DEGRADED' : 'UNAVAILABLE', 'operation_topic_not_public_snapshot')
  }
  const sections = mergeRemoteTopicSections(Array.isArray(raw.sections) ? raw.sections : [])
    .map((section, index) => adaptSection(section, index, source))
    .filter(hasDisplayableItems)
  if (!sections.length) {
    return unavailableTopicDetail(raw, slug, raw.degraded ? 'DEGRADED' : 'UNAVAILABLE', 'operation_topic_sections_empty')
  }
  return {
    id: raw.id || raw.slug || slug,
    slug: raw.slug || slug,
    title: raw.name || raw.title || slug,
    summary: raw.description,
    coverUrl: raw.coverUrl,
    status,
    source,
    degraded: Boolean(raw.degraded),
    fallbackReason: raw.fallbackReason,
    currentVersion: raw.currentVersion,
    sourceNote: status === 'ARCHIVED'
      ? '专题已归档，仍可作为公开资料浏览。'
      : '由社区运营从公开内容中整理。',
    sortNote: '章节顺序来自已发布快照。',
    publishedAt: raw.publishedAt || raw.publishTime,
    archivedAt: raw.archivedAt || raw.archiveTime,
    topicScope: adaptTopicScope(raw.topicScope),
    domain: raw.domain,
    sections,
    relatedEntries: [],
    updatedAt: raw.updateTime,
  }
}

// 只认后端派生的两态；缺失/异常值一律置空，绝不由 domain 是否为空自行推断。
const adaptTopicScope = (raw: string | undefined): CuratedTopicScope | undefined => (
  raw === 'DOMAIN' || raw === 'CROSS_DOMAIN' ? raw : undefined
)

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
