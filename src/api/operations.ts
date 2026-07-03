import client, { BizException, type Result } from './client'
import { postApi } from './post'
import type { ApiId, CommunityTopic, Post } from './types'
import { filterStrongExposurePosts, filterVisiblePosts } from '@/utils/recommendationGovernance'
import {
  canMutateOpsOrchestration,
  filterOpsOrchestrationDisplayItems,
  isOpsOrchestrationCopyAllowed,
  markOpsOrchestrationExample,
  type OpsOrchestrationAction,
  type OpsOrchestrationPermissions,
} from '@/utils/opsOrchestrationGuard'

export type OperationStatus = 'DRAFT' | 'PREVIEW' | 'PUBLISHED' | 'OFFLINE' | 'ACTIVE' | 'PAUSED' | 'HIDDEN' | string
export type OperationResourceKind = 'topic' | 'slot'
export type OperationAction = 'preview' | 'publish' | 'offline' | 'rollback'

export interface OperationCapability<T> {
  available: boolean
  source: 'remote' | 'legacy-featured' | 'public-content-query' | 'fallback-demo' | 'unavailable'
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
  title: string
  summary?: string
  href?: string
  sourceType?: string
  sourceId?: ApiId
  reason?: string
}

export interface OperationSlot {
  id: ApiId
  slotCode: string
  title: string
  description?: string
  status: OperationStatus
  displayLabel?: string
  explanation?: string
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
  note?: string
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
  source: OperationCapability<T>['source'],
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

const adaptRemotePostItem = (post: RemotePostBrief | undefined, fallbackTitle = '未命名内容') => {
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
  const postItem = adaptRemotePostItem(post, '公开内容')
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
  const postItem = adaptRemotePostItem(post, '精选池条目')
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
  title: topic.name || topic.title || '专题草稿',
  summary: topic.description,
  entryPath: topicHref(topic.slug),
  status: topic.status || 'DRAFT',
  activityType: topic.operationType,
  startTime: topic.startsAt,
  endTime: topic.endsAt,
  previewToken: topic.previewToken,
  itemCount: Array.isArray(topic.sections) ? topic.sections.length : 0,
})

const adaptRemoteSlotItem = (item: RemoteOperationSlotItem): OperationSlotItem => {
  if (item.topic) {
    const topic = adaptRemoteTopic(item.topic)
    return {
      id: item.id || `topic:${topic.id}`,
      title: topic.title,
      summary: topic.summary || item.note,
      href: topic.entryPath,
      sourceType: item.sourceType || 'OPERATION_TOPIC',
      sourceId: item.sourceId || topic.id,
      reason: item.note || '来自专题整理',
    }
  }
  const postItem = adaptRemotePostItem(item.post, '运营整理内容')
  return {
    id: item.id || `post:${item.sourceId || postItem.id}`,
    title: postItem.title,
    summary: postItem.summary || item.note,
    href: postItem.href,
    sourceType: item.sourceType || 'POST',
    sourceId: item.sourceId || postItem.id,
    reason: item.note || '来自公开内容整理',
  }
}

const adaptRemoteSlot = (slot: RemoteOperationSlot): OperationSlot => ({
  id: slot.id || slot.slotCode || 'slot',
  slotCode: slot.slotCode || 'HOME_FEATURED',
  title: slot.name || slot.title || '社区运营整理',
  description: slot.description,
  status: slot.status || 'DRAFT',
  displayLabel: '运营整理',
  explanation: slot.description || '由社区运营从公开可见内容中整理，和自然推荐分开说明。',
  items: (slot.items || [])
    .map(adaptRemoteSlotItem)
    .filter((item) => isOpsOrchestrationCopyAllowed(`${item.title} ${item.summary || ''} ${item.reason || ''}`))
    .slice(0, slot.defaultLimit || 5),
  updatedAt: slot.updateTime,
})

const adaptPostCandidate = (post: Post): OperationCandidate => ({
  id: `post:${post.postId}`,
  title: post.title,
  summary: post.summary || post.content?.slice(0, 120),
  sourceType: 'POST',
  sourceId: post.postId,
  domain: post.domain,
  contentType: post.tags?.[0]?.name,
  reason: post.recommendationReasons?.[0] || '公开内容查询降级',
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

const adaptTopicSlotItem = (topic: CommunityTopic): OperationSlotItem => ({
  id: `topic:${topic.id}`,
  title: topic.name,
  summary: topic.description,
  href: topicHref(topic.slug),
  sourceType: 'TOPIC',
  sourceId: topic.id,
  reason: '公开专题降级示例',
})

const publicFallbackSlot = async (slotCode: string): Promise<Result<OperationSlot>> => {
  const [topicRes, featuredRes] = await Promise.allSettled([
    postApi.listTopics({ featured: true, limit: 4 }),
    postApi.list({ featured: true, size: 4 }),
  ])
  const topicItems = topicRes.status === 'fulfilled'
    ? (topicRes.value.data || []).filter((item) => item.status == null || Number(item.status) === 1).map(adaptTopicSlotItem)
    : []
  const postItems = featuredRes.status === 'fulfilled'
    ? filterOpsOrchestrationDisplayItems(filterStrongExposurePosts(featuredRes.value.data?.items || [], 4), {}, 4).map((post) => ({
      id: `post:${post.postId}`,
      title: post.title,
      summary: post.summary,
      href: postHref(post.postId),
      sourceType: 'POST',
      sourceId: post.postId,
      reason: '公开精选内容降级示例',
    }))
    : []
  const items = [...topicItems, ...postItems]
    .filter((item) => isOpsOrchestrationCopyAllowed(`${item.title} ${item.summary || ''} ${item.reason || ''}`))
    .slice(0, 4)
  return {
    code: 0,
    message: 'fallback example operations slot',
    data: {
      id: `fallback:${slotCode}`,
      slotCode,
      title: '社区运营整理入口',
      description: '后端运营位不可用时，由公开内容组成的降级示例。',
      status: 'HIDDEN',
      displayLabel: '示例/fallback',
      explanation: '后端运营位暂不可用；此处明确标记为示例，不代表真实发布配置。',
      items,
      fallback: true,
      ...markOpsOrchestrationExample({}),
    },
  }
}

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
      return capabilityResult(normalizeItems<RemoteOperationSlot>(res.data).map(adaptRemoteSlot), 'remote')
    } catch (error) {
      if (!operationUnavailable(error)) throw error
      return unavailableResult([])
    }
  },

  getPublicOperationSlot: async (slotCode: string): Promise<Result<OperationSlot>> => {
    try {
      const res = await client.get(`/api/v1/operations/slots/${encodeURIComponent(slotCode)}`) as Result<RemoteOperationSlot>
      if (!res.data) return publicFallbackSlot(slotCode)
      return { ...res, data: adaptRemoteSlot(res.data) }
    } catch (error) {
      if (!operationUnavailable(error)) throw error
      return publicFallbackSlot(slotCode)
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
