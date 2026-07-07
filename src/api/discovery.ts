import client, { BizException, type Result } from './client'
import type { ApiId, PaginatedResponse, Post } from './types'
import { adaptPage, adaptPost } from './adapters'

export type DiscoverySource =
  | 'remote'
  | 'operation-curation'
  | 'community-topic'
  | 'search-analytics'
  | 'public-content-query'
  | 'fallback-demo'
  | 'unavailable'

export type DisplayableDiscoverySource = Exclude<DiscoverySource, 'fallback-demo' | 'unavailable'>
export type DiscoveryModuleStatus = 'READY' | 'EMPTY' | 'DEGRADED' | 'UNAVAILABLE' | 'HIDDEN'
export type DiscoveryItemType = 'operation-topic' | 'community-topic' | 'channel' | 'search' | 'post' | string

export interface DiscoveryModuleState {
  key: string
  title: string
  status: DiscoveryModuleStatus
  source: DiscoverySource
  degraded: boolean
  fallbackReason?: string
  itemCount: number
}

export interface DiscoveryItem {
  id: string
  type: DiscoveryItemType
  title: string
  summary?: string
  href: string
  source: DisplayableDiscoverySource
  slug?: string
  sourceId?: string | number
  domain?: number
  icon?: string
  tags?: string[]
  reason?: string
  reasonText?: string
}

export interface DiscoveryMap {
  source: DiscoverySource
  degraded: boolean
  fallbackReason?: string
  generatedAt?: string
  modules: Record<string, DiscoveryModuleState>
  featuredTopics: DiscoveryItem[]
  channels: DiscoveryItem[]
  activeTopics: DiscoveryItem[]
  searchEntrypoints: DiscoveryItem[]
}

interface RemoteDiscoveryModuleState {
  key?: string
  title?: string
  status?: DiscoveryModuleStatus
  source?: DiscoverySource
  degraded?: boolean
  fallbackReason?: string
  itemCount?: number
}

interface RemoteDiscoveryItem {
  id?: string | number
  type?: string
  title?: string
  summary?: string
  href?: string
  source?: DiscoverySource
  slug?: string
  sourceId?: string | number
  domain?: number
  icon?: string
  tags?: unknown[]
  reason?: string
  reasonText?: string
}

interface RemoteDiscoveryMap {
  source?: DiscoverySource
  degraded?: boolean
  fallbackReason?: string
  generatedAt?: string
  modules?: Record<string, RemoteDiscoveryModuleState>
  featuredTopics?: RemoteDiscoveryItem[]
  channels?: RemoteDiscoveryItem[]
  activeTopics?: RemoteDiscoveryItem[]
  searchEntrypoints?: RemoteDiscoveryItem[]
}

const displayableSources: ReadonlySet<DiscoverySource> = new Set([
  'remote',
  'operation-curation',
  'community-topic',
  'search-analytics',
  'public-content-query',
])

const moduleKeys = ['featuredTopics', 'channels', 'activeTopics', 'searchEntrypoints'] as const

const moduleTitles: Record<typeof moduleKeys[number], string> = {
  featuredTopics: '精选专题',
  channels: '频道入口',
  activeTopics: '活跃话题',
  searchEntrypoints: '搜索延展',
}

const emptyItemArrays = () => ({
  featuredTopics: [] as DiscoveryItem[],
  channels: [] as DiscoveryItem[],
  activeTopics: [] as DiscoveryItem[],
  searchEntrypoints: [] as DiscoveryItem[],
})

const isDisplayableSource = (source: DiscoverySource | undefined): source is DisplayableDiscoverySource => (
  Boolean(source && displayableSources.has(source))
)

const isSafeHref = (href: string | undefined): href is string => (
  Boolean(href)
  && href!.startsWith('/')
  && !href!.startsWith('//')
  && !href!.startsWith('/api/')
  && !/\s/.test(href!)
  && !/fallback|demo|fixture|local_demo/i.test(href!)
)

const isSafeText = (value: string | undefined) => !/fallback-demo|demo seed|fixture|local_demo|CodeCoachAI|mockInterview|resumeMatch|privateGoal|applicationTask|AI 教练|私人训练|训练计划|模拟面试|简历匹配|简历\/JD|JD 分析|投递任务/i.test(value || '')

const deriveTopicSlug = (item: RemoteDiscoveryItem): string | undefined => {
  if (item.slug && isSafeText(item.slug)) return item.slug
  const match = item.href?.match(/^\/topics\/([^/?#]+)/)
  if (!match) return undefined
  try {
    return decodeURIComponent(match[1])
  } catch {
    return undefined
  }
}

const adaptItem = (item: RemoteDiscoveryItem | undefined): DiscoveryItem | null => {
  if (!item || !isDisplayableSource(item.source) || !isSafeHref(item.href) || !item.title || !isSafeText(item.title)) {
    return null
  }
  const summary = isSafeText(item.summary) ? item.summary : undefined
  const safeReasonText = isSafeText(item.reasonText || item.reason) ? item.reasonText || item.reason : undefined
  return {
    id: String(item.id || item.href),
    type: item.type || 'search',
    title: item.title,
    summary,
    href: item.href,
    source: item.source,
    slug: deriveTopicSlug(item),
    sourceId: item.sourceId,
    domain: item.domain,
    icon: item.icon,
    tags: Array.isArray(item.tags) ? item.tags.map(String).filter(isSafeText).slice(0, 4) : [],
    reason: safeReasonText,
    reasonText: safeReasonText,
  }
}

const adaptItems = (items: RemoteDiscoveryItem[] | undefined, limit: number) => (
  Array.isArray(items) ? items.map(adaptItem).filter(Boolean).slice(0, limit) as DiscoveryItem[] : []
)

const unavailableModule = (key: typeof moduleKeys[number], fallbackReason = 'discovery_map_unavailable'): DiscoveryModuleState => ({
  key,
  title: moduleTitles[key],
  status: 'UNAVAILABLE',
  source: 'unavailable',
  degraded: true,
  fallbackReason,
  itemCount: 0,
})

const adaptModule = (
  key: typeof moduleKeys[number],
  raw: RemoteDiscoveryModuleState | undefined,
  items: DiscoveryItem[],
): DiscoveryModuleState => {
  if (!raw) {
    return items.length
      ? { key, title: moduleTitles[key], status: 'READY', source: items[0].source, degraded: false, itemCount: items.length }
      : unavailableModule(key, `${key}_unavailable`)
  }
  const source = raw.source && isDisplayableSource(raw.source) && items.length ? raw.source : (items.length ? items[0].source : 'unavailable')
  return {
    key: raw.key || key,
    title: raw.title || moduleTitles[key],
    status: items.length ? (raw.status || 'READY') : (raw.status === 'EMPTY' ? 'EMPTY' : 'UNAVAILABLE'),
    source,
    degraded: Boolean(raw.degraded || !items.length),
    fallbackReason: raw.fallbackReason,
    itemCount: items.length,
  }
}

const emptyDiscoveryMap = (fallbackReason = 'discovery_map_unavailable'): DiscoveryMap => ({
  source: 'unavailable',
  degraded: true,
  fallbackReason,
  modules: Object.fromEntries(moduleKeys.map((key) => [key, unavailableModule(key, fallbackReason)])) as Record<string, DiscoveryModuleState>,
  ...emptyItemArrays(),
})

const adaptMap = (raw: RemoteDiscoveryMap | null | undefined): DiscoveryMap => {
  if (!raw) return emptyDiscoveryMap('discovery_map_empty')
  const featuredTopics = adaptItems(raw.featuredTopics, 5)
  const channels = adaptItems(raw.channels, 8)
  const activeTopics = adaptItems(raw.activeTopics, 8)
  const searchEntrypoints = adaptItems(raw.searchEntrypoints, 6)
  const arrays = { featuredTopics, channels, activeTopics, searchEntrypoints }
  const modules = Object.fromEntries(moduleKeys.map((key) => [
    key,
    adaptModule(key, raw.modules?.[key], arrays[key]),
  ])) as Record<string, DiscoveryModuleState>
  const degraded = Boolean(raw.degraded || Object.values(modules).some((item) => item.degraded))
  return {
    source: raw.source || (degraded ? 'public-content-query' : 'operation-curation'),
    degraded,
    fallbackReason: raw.fallbackReason,
    generatedAt: raw.generatedAt,
    modules,
    featuredTopics,
    channels,
    activeTopics,
    searchEntrypoints,
  }
}

const discoveryUnavailable = (error: unknown) => {
  if (error instanceof BizException) return error.code === 10404 || error.code >= 20000
  const status = (error as { response?: { status?: number } } | null)?.response?.status
  return status === 404 || status === 405 || Boolean(status && status >= 500)
}

export const discoveryApi = {
  getDiscoveryMap: async (): Promise<Result<DiscoveryMap>> => {
    try {
      const res = await client.get('/api/v1/discovery/map') as Result<RemoteDiscoveryMap>
      return { ...res, data: adaptMap(res.data) }
    } catch (error) {
      if (!discoveryUnavailable(error)) throw error
      return {
        code: 0,
        message: 'discovery map unavailable',
        data: emptyDiscoveryMap('discovery_map_backend_unavailable'),
      }
    }
  },

  listPublicChannelPosts: async (params: {
    type: number
    domain?: number
    cursor?: string
    size?: number
  }): Promise<Result<PaginatedResponse<Post>>> => {
    const res = await client.get('/api/v1/posts', { params }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
  },

  followPublicAuthor: (uid: ApiId): Promise<Result<void>> =>
    client.post(`/api/v1/users/${uid}/follow`),

  unfollowPublicAuthor: (uid: ApiId): Promise<Result<void>> =>
    client.delete(`/api/v1/users/${uid}/follow`),
}
