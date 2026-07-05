import client, { BizException, type Result } from './client'
import { postApi } from './post'
import type { ApiId, Post } from './types'
import { filterStrongExposurePosts, filterVisiblePosts } from '@/utils/recommendationGovernance'
import {
  canMutateOpsOrchestration,
  filterOpsOrchestrationDisplayItems,
  isOpsOrchestrationCopyAllowed,
  markOpsOrchestrationExample,
  type OpsOrchestrationAction,
  type OpsOrchestrationPermissions,
} from '@/utils/opsOrchestrationGuard'

export const HOME_FEATURED_SLOT_CODE = 'HOME_FEATURED'
export const DISCOVERY_FEATURED_TOPICS_SLOT_CODE = 'DISCOVERY_FEATURED_TOPICS'
export const PUBLIC_OPERATION_SLOT_CODES = [
  HOME_FEATURED_SLOT_CODE,
  DISCOVERY_FEATURED_TOPICS_SLOT_CODE,
] as const
export type PublicOperationSlotCode = typeof PUBLIC_OPERATION_SLOT_CODES[number]

export type OperationSource = 'remote' | 'legacy-featured' | 'public-content-query' | 'fallback-demo' | 'unavailable'
export type OperationStatus = 'DRAFT' | 'PREVIEW' | 'PUBLISHED' | 'OFFLINE' | 'ACTIVE' | 'PAUSED' | 'HIDDEN' | string
export type OperationResourceKind = 'topic' | 'slot'
export type OperationAction = 'preview' | 'publish' | 'offline' | 'rollback'

export interface OperationCapability<T> {
  available: boolean
  source: OperationSource
  degraded: boolean
  fallbackReason?: string
  items: T[]
}

export interface OperationCandidate {
  id: ApiId
  title: string
  summary?: string
  sourceType: string
  sourceId: ApiId
  domain?: number
  contentType?: string
  reason?: string
  governanceState?: string
  updatedAt?: string
  href?: string
  fallback?: boolean
  example?: boolean
  exampleLabel?: string
}

export interface CurationPoolItem {
  id: ApiId
  title: string
  summary?: string
  sourceType: string
  sourceId: ApiId
  status: OperationStatus
  sortOrder?: number
  note?: string
  href?: string
  fallback?: boolean
  example?: boolean
  exampleLabel?: string
}

export interface OperationSlotItem {
  id: ApiId
  contentId: ApiId
  contentType: string
  title: string
  summary?: string
  href?: string
  sourceType?: string
  sourceId?: ApiId
  reason?: string
  reasonText?: string
  rank: number
  source: OperationSource
  blocked?: boolean
  blockReasons?: string[]
  fallback?: boolean
  example?: boolean
  exampleLabel?: string
}

export interface OperationSlot {
  id: ApiId
  slotCode: string
  title: string
  description?: string
  status: OperationStatus
  displayLabel?: string
  explanation?: string
  source?: OperationSource
  degraded?: boolean
  fallbackReason?: string
  currentVersion?: number
  publishedAt?: string
  items: OperationSlotItem[]
  updatedAt?: string
  fallback?: boolean
  example?: boolean
  exampleLabel?: string
}

export interface OperationTopic {
  id: ApiId
  slug?: string
  title: string
  summary?: string
  entryPath?: string
  status: OperationStatus
  activityType?: string
  startTime?: string
  endTime?: string
  previewToken?: string
  itemCount?: number
  fallback?: boolean
}

export interface OperationAuditLog {
  id: ApiId
  action: string
  resourceType: string
  resourceId?: ApiId
  operatorUid?: ApiId
  remark?: string
  createTime?: string
}

export interface OperationActionResult {
  id: ApiId
  resourceKind: OperationResourceKind
  action: OperationAction
  status?: OperationStatus
}

interface RemotePostBrief {
  id?: ApiId
  postId?: ApiId
  title?: string
  summary?: string
  content?: string
  domain?: number
  postType?: number
  tags?: Array<{ name?: string; tagName?: string }>
  createTime?: string
}

interface RemoteOperationTopic {
  id?: ApiId
  slug?: string
  name?: string
  title?: string
  description?: string
  status?: OperationStatus
  operationType?: string
  startsAt?: string
  endsAt?: string
  previewToken?: string
  sections?: unknown[]
  updateTime?: string
}

interface RemoteOperationSlotItem {
  id?: ApiId
  sourceType?: string
  sourceId?: ApiId
  contentId?: ApiId
  contentType?: string
  note?: string
  reasonText?: string
  rank?: number
  sortOrder?: number
  source?: OperationSource
  blocked?: boolean
  blockReasons?: string[]
  post?: RemotePostBrief
  topic?: RemoteOperationTopic
}

interface RemoteOperationSlot {
  id?: ApiId
  slotCode?: string
  name?: string
  title?: string
  description?: string
  status?: OperationStatus
  defaultLimit?: number
  source?: OperationSource
  degraded?: boolean
  fallbackReason?: string
  currentVersion?: number
  items?: RemoteOperationSlotItem[]
  updateTime?: string
}

const unavailableResult = <T>(items: T[] = [], fallbackReason = 'operations_backend_unavailable'): Result<OperationCapability<T>> => ({
  code: 0,
  message: 'operations capability unavailable',
  data: {
    available: false,
    source: 'unavailable',
    degraded: true,
    fallbackReason,
    items,
  },
})

const capabilityResult = <T>(
  items: T[],
  source: OperationSource,
  options: { available?: boolean; degraded?: boolean; fallbackReason?: string } = {},
): Result<OperationCapability<T>> => ({
  code: 0,
  message: options.degraded ? 'degraded operations capability' : 'ok',
  data: {
    available: options.available ?? source === 'remote',
    source,
    degraded: options.degraded ?? source !== 'remote',
    fallbackReason: options.fallbackReason,
    items,
  },
})

const operationUnavailable = (error: unknown) => {
  if (error instanceof BizException) return error.code === 10404
  const status = (error as { response?: { status?: number } } | null)?.response?.status
  return status === 404 || status === 405
}

const normalizeItems = <T>(raw: unknown): T[] => {
  if (Array.isArray(raw)) return raw as T[]
  if (!raw || typeof raw !== 'object') return []
  const value = raw as { items?: unknown; records?: unknown; content?: unknown; list?: unknown }
  if (Array.isArray(value.items)) return value.items as T[]
  if (Array.isArray(value.records)) return value.records as T[]
  if (Array.isArray(value.content)) return value.content as T[]
  if (Array.isArray(value.list)) return value.list as T[]
  return []
}

const postIdOf = (post: RemotePostBrief | Post | undefined) => {
  const value = post as { postId?: ApiId; id?: ApiId } | undefined
  return value?.postId ?? value?.id
}

const postHref = (postId: ApiId) => `/post/${postId}`
const topicHref = (slug?: string) => slug ? `/topics/${encodeURIComponent(slug)}` : '/explore'
const isPublicOperationSlotCode = (slotCode: string): slotCode is PublicOperationSlotCode => (
  PUBLIC_OPERATION_SLOT_CODES.includes(slotCode as PublicOperationSlotCode)
)

const adaptRemotePostItem = (post: RemotePostBrief | undefined, fallbackTitle = 'Untitled public content') => {
  const id = postIdOf(post) ?? fallbackTitle
  return {
    id,
    title: post?.title || fallbackTitle,
    summary: post?.summary || post?.content?.slice(0, 120),
    href: postIdOf(post) ? postHref(postIdOf(post) as ApiId) : undefined,
  }
}

const adaptRemoteCandidate = (item: any): OperationCandidate => {
  const post = item?.post as RemotePostBrief | undefined
  const postItem = adaptRemotePostItem(post, 'Public content')
  return {
    id: `${item?.sourceType || 'POST'}:${item?.sourceId || postItem.id}`,
    title: postItem.title,
    summary: postItem.summary,
    sourceType: item?.sourceType || 'POST',
    sourceId: item?.sourceId ?? postIdOf(post) ?? postItem.id,
    domain: post?.domain,
    contentType: post?.tags?.[0]?.name || post?.tags?.[0]?.tagName,
    reason: item?.reason || 'PUBLIC_VISIBLE_GOVERNED',
    governanceState: item?.operable === false ? 'filtered' : 'eligible',
    updatedAt: post?.createTime,
    href: postItem.href,
  }
}

const adaptRemoteCuration = (item: any): CurationPoolItem => {
  const post = item?.post as RemotePostBrief | undefined
  const postItem = adaptRemotePostItem(post, 'Curation pool item')
  return {
    id: item?.id ?? `${item?.sourceType || 'POST'}:${item?.sourceId || postItem.id}`,
    title: postItem.title,
    summary: postItem.summary,
    sourceType: item?.sourceType || 'POST',
    sourceId: item?.sourceId ?? postIdOf(post) ?? postItem.id,
    status: item?.status || 'ACTIVE',
    sortOrder: item?.sortOrder,
    note: item?.note,
    href: postItem.href,
  }
}

const adaptRemoteTopic = (topic: RemoteOperationTopic): OperationTopic => ({
  id: topic.id || topic.slug || 'topic',
  slug: topic.slug,
  title: topic.name || topic.title || 'Topic draft',
  summary: topic.description,
  entryPath: topicHref(topic.slug),
  status: topic.status || 'DRAFT',
  activityType: topic.operationType,
  startTime: topic.startsAt,
  endTime: topic.endsAt,
  previewToken: topic.previewToken,
  itemCount: Array.isArray(topic.sections) ? topic.sections.length : 0,
})

const adaptRemoteSlotItem = (item: RemoteOperationSlotItem, rankFallback: number): OperationSlotItem => {
  if (item.topic) {
    const topic = adaptRemoteTopic(item.topic)
    const id = item.id || `topic:${topic.id}`
    const sourceId = item.sourceId || item.contentId || topic.id
    return {
      id,
      contentId: sourceId,
      contentType: item.contentType || item.sourceType || 'OPERATION_TOPIC',
      title: topic.title,
      summary: topic.summary || item.note,
      href: topic.entryPath,
      sourceType: item.sourceType || 'OPERATION_TOPIC',
      sourceId,
      reason: item.note || item.reasonText || 'Curated public topic',
      reasonText: item.reasonText || item.note,
      rank: item.rank ?? item.sortOrder ?? rankFallback,
      source: item.source || 'remote',
      blocked: Boolean(item.blocked),
      blockReasons: item.blockReasons || [],
    }
  }
  const postItem = adaptRemotePostItem(item.post, 'Curated public content')
  const sourceId = item.sourceId || item.contentId || postItem.id
  return {
    id: item.id || `post:${sourceId}`,
    contentId: sourceId,
    contentType: item.contentType || item.sourceType || 'POST',
    title: postItem.title,
    summary: postItem.summary || item.note,
    href: postItem.href,
    sourceType: item.sourceType || 'POST',
    sourceId,
    reason: item.note || item.reasonText || 'Curated from public content',
    reasonText: item.reasonText || item.note,
    rank: item.rank ?? item.sortOrder ?? rankFallback,
    source: item.source || 'remote',
    blocked: Boolean(item.blocked),
    blockReasons: item.blockReasons || [],
  }
}

const adaptRemoteSlot = (slot: RemoteOperationSlot): OperationSlot => {
  const source = slot.source || 'remote'
  const degraded = Boolean(slot.degraded || source !== 'remote')
  return {
    id: slot.id || slot.slotCode || HOME_FEATURED_SLOT_CODE,
    slotCode: slot.slotCode || HOME_FEATURED_SLOT_CODE,
    title: slot.name || slot.title || 'Community Featured',
    description: slot.description,
    status: slot.status || 'DRAFT',
    displayLabel: 'Community curation',
    explanation: slot.description || 'Curated by community operations from public, governed content.',
    source,
    degraded,
    fallbackReason: slot.fallbackReason,
    currentVersion: slot.currentVersion,
    items: (slot.items || [])
      .map((item, index) => adaptRemoteSlotItem(item, index + 1))
      .filter((item) => isOpsOrchestrationCopyAllowed(`${item.title} ${item.summary || ''} ${item.reasonText || item.reason || ''}`))
      .slice(0, slot.defaultLimit || 5),
    updatedAt: slot.updateTime,
    fallback: degraded,
  }
}

const adaptPostCandidate = (post: Post): OperationCandidate => ({
  id: `post:${post.postId}`,
  title: post.title,
  summary: post.summary || post.content?.slice(0, 120),
  sourceType: 'POST',
  sourceId: post.postId,
  domain: post.domain,
  contentType: post.tags?.[0]?.name,
  reason: post.recommendationReasons?.[0] || 'public content query fallback',
  governanceState: 'degraded',
  href: postHref(post.postId),
  fallback: true,
  ...markOpsOrchestrationExample({}),
})

const adaptPostCuration = (post: Post): CurationPoolItem => ({
  id: `featured:${post.postId}`,
  title: post.title,
  summary: post.summary || post.content?.slice(0, 120),
  sourceType: 'POST',
  sourceId: post.postId,
  status: 'PUBLISHED',
  href: postHref(post.postId),
  fallback: true,
  ...markOpsOrchestrationExample({}),
})

const emptyPublicOperationSlot = (
  slotCode = HOME_FEATURED_SLOT_CODE,
  fallbackReason = 'operation_slot_backend_unavailable',
): Result<OperationSlot> => ({
  code: 0,
  message: 'operation slot unavailable',
  data: {
    id: `unavailable:${slotCode}`,
    slotCode,
    title: 'Community Featured',
    description: 'The featured slot is temporarily unavailable.',
    status: 'OFFLINE',
    displayLabel: 'Unavailable',
    explanation: 'The public featured slot is empty while the backend curation service is unavailable.',
    source: 'unavailable',
    degraded: true,
    fallbackReason,
    items: [],
  },
})

export const operationsApi = {
  listOperationCandidates: async (params?: { domain?: number; keyword?: string; limit?: number }): Promise<Result<OperationCapability<OperationCandidate>>> => {
    try {
      const res = await client.get('/api/v1/operations/admin/candidates', { params }) as Result<unknown>
      return capabilityResult(normalizeItems(res.data).map(adaptRemoteCandidate), 'remote')
    } catch (error) {
      if (!operationUnavailable(error)) throw error
      const fallback = await postApi.list({ domain: params?.domain, size: params?.limit || 12 })
      return capabilityResult(
        filterOpsOrchestrationDisplayItems(filterVisiblePosts(fallback.data?.items || [], params?.limit || 12), {}, params?.limit || 12).map(adaptPostCandidate),
        'public-content-query',
        { available: false, degraded: true, fallbackReason: 'candidate_pool_backend_unavailable' },
      )
    }
  },

  listCurationPool: async (params?: { status?: OperationStatus; limit?: number }): Promise<Result<OperationCapability<CurationPoolItem>>> => {
    try {
      const res = await client.get('/api/v1/operations/admin/curation-pool', { params }) as Result<unknown>
      return capabilityResult(normalizeItems(res.data).map(adaptRemoteCuration), 'remote')
    } catch (error) {
      if (!operationUnavailable(error)) throw error
      const fallback = await postApi.list({ featured: true, size: params?.limit || 12 })
      return capabilityResult(
        filterOpsOrchestrationDisplayItems(filterStrongExposurePosts(fallback.data?.items || [], params?.limit || 12), {}, params?.limit || 12).map(adaptPostCuration),
        'legacy-featured',
        { available: false, degraded: true, fallbackReason: 'curation_pool_backend_unavailable' },
      )
    }
  },

  listOperationSlots: async (): Promise<Result<OperationCapability<OperationSlot>>> => {
    try {
      const res = await client.get('/api/v1/operations/admin/slots') as Result<unknown>
      const items = normalizeItems<RemoteOperationSlot>(res.data)
        .map(adaptRemoteSlot)
        .filter((slot) => isPublicOperationSlotCode(slot.slotCode))
      return capabilityResult(items, 'remote')
    } catch (error) {
      if (!operationUnavailable(error)) throw error
      return unavailableResult([])
    }
  },

  getPublicOperationSlot: async (slotCode: string): Promise<Result<OperationSlot>> => {
    const normalizedSlotCode = slotCode
    if (!isPublicOperationSlotCode(normalizedSlotCode)) {
      return emptyPublicOperationSlot(normalizedSlotCode, 'unsupported_operation_slot')
    }
    try {
      const res = await client.get(`/api/v1/operations/slots/${encodeURIComponent(normalizedSlotCode)}`) as Result<RemoteOperationSlot>
      if (!res.data) return emptyPublicOperationSlot(normalizedSlotCode, 'operation_slot_empty')
      return { ...res, data: adaptRemoteSlot(res.data) }
    } catch (error) {
      if (!operationUnavailable(error)) throw error
      return emptyPublicOperationSlot(normalizedSlotCode)
    }
  },

  listOperationTopics: async (): Promise<Result<OperationCapability<OperationTopic>>> => {
    try {
      const res = await client.get('/api/v1/operations/admin/topics') as Result<unknown>
      return capabilityResult(normalizeItems<RemoteOperationTopic>(res.data).map(adaptRemoteTopic), 'remote')
    } catch (error) {
      if (!operationUnavailable(error)) throw error
      return unavailableResult([])
    }
  },

  listOperationAudit: async (params?: { limit?: number }): Promise<Result<OperationCapability<OperationAuditLog>>> => {
    try {
      const res = await client.get('/api/v1/operations/admin/audit-logs', { params }) as Result<unknown>
      return capabilityResult(normalizeItems<OperationAuditLog>(res.data), 'remote')
    } catch (error) {
      if (!operationUnavailable(error)) throw error
      return unavailableResult([], 'operation_audit_backend_unavailable')
    }
  },

  addSlotItemToHomeFeatured: (
    slotId: ApiId,
    sourceType: string,
    sourceId: ApiId,
    note?: string,
    sortOrder = 100,
  ): Promise<Result<OperationSlotItem>> => client.post(`/api/v1/operations/admin/slots/${slotId}/items`, {
    sourceType,
    sourceId,
    note,
    sortOrder,
    status: 'ACTIVE',
  }),

  removeSlotItemFromHomeFeatured: (itemId: ApiId, note?: string): Promise<Result<void>> => (
    client.delete(`/api/v1/operations/admin/slots/items/${itemId}`, { params: { note } })
  ),

  updateHomeFeaturedItemReason: (
    slotId: ApiId,
    item: OperationSlotItem,
    reasonText: string,
  ): Promise<Result<OperationSlotItem>> => client.post(`/api/v1/operations/admin/slots/${slotId}/items`, {
    sourceType: item.sourceType || item.contentType,
    sourceId: item.sourceId || item.contentId,
    note: reasonText,
    sortOrder: item.rank,
    status: item.blocked ? 'PAUSED' : 'ACTIVE',
  }),

  moveHomeFeaturedItem: (
    slotId: ApiId,
    item: OperationSlotItem,
    rank: number,
  ): Promise<Result<OperationSlotItem>> => client.post(`/api/v1/operations/admin/slots/${slotId}/items`, {
    sourceType: item.sourceType || item.contentType,
    sourceId: item.sourceId || item.contentId,
    note: item.reasonText || item.reason,
    sortOrder: rank,
    status: item.blocked ? 'PAUSED' : 'ACTIVE',
  }),

  publishHomeFeaturedSlot: (
    slotId: ApiId,
    note?: string,
    permissions?: OpsOrchestrationPermissions | null,
  ) => operationsApi.runLifecycleAction('slot', slotId, 'publish', note, permissions),

  offlineHomeFeaturedSlot: (
    slotId: ApiId,
    note?: string,
    permissions?: OpsOrchestrationPermissions | null,
  ) => operationsApi.runLifecycleAction('slot', slotId, 'offline', note, permissions),

  rollbackHomeFeaturedSlot: (
    slotId: ApiId,
    note?: string,
    permissions?: OpsOrchestrationPermissions | null,
  ) => operationsApi.runLifecycleAction('slot', slotId, 'rollback', note, permissions),

  runLifecycleAction: (
    resourceKind: OperationResourceKind,
    id: ApiId,
    action: OperationAction,
    note?: string,
    permissions?: OpsOrchestrationPermissions | null,
  ): Promise<Result<OperationActionResult>> => {
    if (action !== 'preview' && !canMutateOpsOrchestration(permissions, action as OpsOrchestrationAction)) {
      return Promise.reject(new BizException(10403, 'operation orchestration permission required'))
    }
    return client.post(`/api/v1/operations/admin/${resourceKind}s/${id}/${action}`, {
      note,
      confirmationPhrase: action === 'preview' ? undefined : 'CONFIRM',
    })
  },
}
