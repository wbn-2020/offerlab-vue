import client, { BizException, type Result } from './client'
import { postApi } from './post'
import type { ApiId, OperationTopicPublishCheckContract, Post } from './types'
import { filterStrongExposurePosts, filterVisiblePosts } from '@/utils/recommendationGovernance'
import { legacyTopicSectionKey, nonEmptyTopicItemList } from '@/utils/topicSectionIdentity'
import { localizePublicCopy } from '@/utils/publicDisplay'
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
export type OperationStatus = 'DRAFT' | 'PREVIEW' | 'PUBLISHED' | 'OFFLINE' | 'ARCHIVED' | 'ACTIVE' | 'PAUSED' | 'HIDDEN' | string
export type OperationResourceKind = 'topic' | 'slot'
export type OperationAction = 'preview' | 'publish' | 'offline' | 'rollback' | 'archive'
export type ContentGapSourceStatus = 'remote' | 'fallback-demo' | 'unavailable'
export type ContentGapSourceKind = 'topic' | 'search'

export interface ContentGapSourceRef {
  readonly kind: ContentGapSourceKind
  readonly id: ApiId
  readonly status: ContentGapSourceStatus
  readonly fallback?: boolean
  readonly demo?: boolean
}

export interface TopicContentGap {
  readonly id: ApiId
  readonly title: string
  readonly summary?: string
  readonly source: 'topic'
  readonly sourceRef: ContentGapSourceRef
  readonly sourceStatus: ContentGapSourceStatus
  readonly readOnly: boolean
}

export interface SearchContentGap {
  readonly id: ApiId
  readonly title: string
  readonly summary?: string
  readonly source: 'search'
  readonly sourceRef: ContentGapSourceRef
  readonly sourceStatus: ContentGapSourceStatus
  readonly readOnly: boolean
}

export interface SearchTopicGap extends SearchContentGap {
  readonly topicSlug?: string
}

export interface MergedContentGap {
  readonly id: ApiId
  readonly title: string
  readonly summary?: string
  readonly sourceRefs: readonly ContentGapSourceRef[]
  readonly sourceStatuses: readonly ContentGapSourceStatus[]
  readonly readOnly: boolean
  readonly dispatchAllowed: boolean
}

export interface KnowledgeEntryQuery {
  readonly phase: 'phase-5-reserved'
  readonly assetId: ApiId
  readonly assetType: 'topic' | 'post' | 'content-gap'
  readonly topicSlug?: string
  readonly includeArchived?: boolean
  readonly limit?: number
}

export interface SearchAssetMapping {
  readonly assetId: ApiId
  readonly assetType: 'topic' | 'post'
  readonly title: string
  readonly href?: string
  readonly status: 'PUBLISHED' | 'ARCHIVED' | 'OFFLINE'
  readonly displayState: 'public' | 'archived' | 'offline'
  readonly ordinarySearchIncluded: boolean
  readonly readOnly: boolean
  readonly sourceRef: ContentGapSourceRef
}

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
  topicId?: ApiId
  topicSlug?: string
  sectionKey?: string
  domain?: number | null
  contentType?: string
  reason?: string
  reasonText?: string
  visibilityCheck?: string
  governanceState?: string
  blockReasons?: string[]
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
  // 仅专题类条目携带：后端派生的专题范围，用于入口卡诚实标注「跨频道」。
  topicScope?: 'DOMAIN' | 'CROSS_DOMAIN'
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

export interface OperationTopicItem {
  id: ApiId
  sourceType: 'POST' | string
  sourceId: ApiId
  contentId?: ApiId
  domain?: number | null
  title: string
  summary?: string
  href?: string
  status: OperationStatus
  sortOrder: number
  reasonText: string
  source?: OperationSource
  blocked?: boolean
  blockReasons?: string[]
  fallback?: boolean
  example?: boolean
  exampleLabel?: string
}

export interface OperationTopicSection {
  id?: ApiId
  key: string
  title: string
  summary?: string
  status: OperationStatus
  sortOrder: number
  reasonText?: string
  items: OperationTopicItem[]
}

export type OperationTopicPublishCheckItem = OperationTopicPublishCheckContract['items'][number]

export interface OperationTopicPublishCheck extends OperationTopicPublishCheckContract {
  source: OperationSource
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
  currentVersion?: number
  draftRevision?: number
  archivedReason?: string
  source?: OperationSource
  degraded?: boolean
  fallbackReason?: string
  // 只读透传后端派生的专题范围；缺失时不自行推断。
  topicScope?: 'DOMAIN' | 'CROSS_DOMAIN'
  // 单频道专题的频道值；跨频道专题恒为空。
  domain?: number | null
  sections?: OperationTopicSection[]
  publishCheck?: OperationTopicPublishCheck
  fallback?: boolean
  example?: boolean
  exampleLabel?: string
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
  domain?: number | null
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
  currentVersion?: number
  version?: number
  draftRevision?: number
  archivedReason?: string
  source?: OperationSource
  degraded?: boolean
  fallbackReason?: string
  topicScope?: string
  domain?: number | null
  sections?: RemoteOperationTopicSection[]
  publishCheck?: OperationTopicPublishCheck
  updateTime?: string
}

interface RemoteOperationTopicSection {
  id?: ApiId
  key?: string
  sectionKey?: string
  title?: string
  name?: string
  summary?: string
  description?: string
  sourceType?: string
  sourceId?: ApiId
  post?: RemotePostBrief
  status?: OperationStatus
  sortOrder?: number
  rank?: number
  note?: string
  reasonText?: string
  items?: RemoteOperationTopicItem[]
  contents?: RemoteOperationTopicItem[]
}

interface RemoteOperationTopicItem {
  id?: ApiId
  sourceType?: string
  sourceId?: ApiId
  contentId?: ApiId
  postId?: ApiId
  title?: string
  summary?: string
  note?: string
  reasonText?: string
  status?: OperationStatus
  sortOrder?: number
  rank?: number
  source?: OperationSource
  blocked?: boolean
  blockReasons?: string[]
  post?: RemotePostBrief
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
const isReadOnlyGapStatus = (status: ContentGapSourceStatus) => status === 'fallback-demo' || status === 'unavailable'
const isPublicOperationSlotCode = (slotCode: string): slotCode is PublicOperationSlotCode => (
  PUBLIC_OPERATION_SLOT_CODES.includes(slotCode as PublicOperationSlotCode)
)

export const canDispatchMergedContentGap = (gap: Pick<MergedContentGap, 'sourceRefs' | 'readOnly'>) => {
  if (gap.readOnly) return false
  if (gap.sourceRefs.some((ref) => ref.status === 'fallback-demo' || ref.fallback || ref.demo)) return false
  if (gap.sourceRefs.some((ref) => ref.status === 'unavailable')) return false
  return true
}

export const mergeContentGaps = (
  topicGap: TopicContentGap,
  searchGap?: SearchContentGap | SearchTopicGap | null,
): MergedContentGap => {
  const sourceRefs = [topicGap.sourceRef, ...(searchGap ? [searchGap.sourceRef] : [])]
  const sourceStatuses = sourceRefs.map((ref) => ref.status)
  const readOnly = topicGap.readOnly
    || Boolean(searchGap?.readOnly)
    || sourceStatuses.some(isReadOnlyGapStatus)
  const merged: MergedContentGap = {
    id: searchGap?.id || topicGap.id,
    title: searchGap?.title || topicGap.title,
    summary: searchGap?.summary || topicGap.summary,
    sourceRefs: [topicGap.sourceRef, ...(searchGap ? [searchGap.sourceRef] : [])],
    sourceStatuses,
    readOnly,
    dispatchAllowed: false,
  }
  return {
    ...merged,
    dispatchAllowed: canDispatchMergedContentGap(merged),
  }
}

export const toSearchAssetMapping = (asset: {
  assetId: ApiId
  assetType: 'topic' | 'post'
  title: string
  href?: string
  status: 'PUBLISHED' | 'ARCHIVED' | 'OFFLINE'
  sourceRef: ContentGapSourceRef
}): SearchAssetMapping => {
  if (asset.status === 'OFFLINE') {
    return {
      assetId: asset.assetId,
      assetType: asset.assetType,
      title: asset.title,
      href: asset.href,
      status: 'OFFLINE',
      displayState: 'offline',
      ordinarySearchIncluded: false,
      readOnly: true,
      sourceRef: asset.sourceRef,
    }
  }
  if (asset.status === 'ARCHIVED') {
    return {
      assetId: asset.assetId,
      assetType: asset.assetType,
      title: asset.title,
      href: asset.href,
      status: 'ARCHIVED',
      displayState: 'archived',
      ordinarySearchIncluded: true,
      readOnly: true,
      sourceRef: asset.sourceRef,
    }
  }
  return {
    assetId: asset.assetId,
    assetType: asset.assetType,
    title: asset.title,
    href: asset.href,
    status: 'PUBLISHED',
    displayState: 'public',
    ordinarySearchIncluded: true,
    readOnly: false,
    sourceRef: asset.sourceRef,
  }
}

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
    topicId: item?.topicId,
    topicSlug: item?.topicSlug,
    sectionKey: item?.sectionKey,
    domain: post?.domain,
    contentType: post?.tags?.[0]?.name || post?.tags?.[0]?.tagName,
    reason: item?.reason || 'PUBLIC_VISIBLE_GOVERNED',
    reasonText: item?.reasonText || item?.reason,
    visibilityCheck: item?.visibilityCheck,
    governanceState: item?.operable === true ? 'eligible' : 'filtered',
    blockReasons: Array.isArray(item?.blockReasons) ? item.blockReasons : [],
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

const adaptRemoteTopicItem = (item: RemoteOperationTopicItem, sortFallback: number): OperationTopicItem => {
  const post = item.post
  const postItem = adaptRemotePostItem(post, item.title || 'Topic content')
  const sourceId = item.sourceId || item.contentId || item.postId || postIdOf(post) || postItem.id
  return {
    id: item.id || `${item.sourceType || 'POST'}:${sourceId}`,
    sourceType: item.sourceType || 'POST',
    sourceId,
    contentId: item.contentId || item.postId || sourceId,
    domain: post?.domain,
    title: item.title || postItem.title,
    summary: item.summary || postItem.summary || item.note,
    href: postItem.href || (sourceId ? postHref(sourceId) : undefined),
    status: item.status || 'ACTIVE',
    sortOrder: item.sortOrder ?? item.rank ?? sortFallback,
    reasonText: item.reasonText || item.note || '',
    source: item.source || 'remote',
    blocked: Boolean(item.blocked),
    blockReasons: item.blockReasons || [],
    fallback: item.source ? item.source !== 'remote' : false,
  }
}

const candidateToTopicItem = (
  candidate: OperationCandidate,
  reasonText: string,
  sortOrder: number,
): OperationTopicItem => ({
  id: `candidate:${candidate.sourceType}:${candidate.sourceId}`,
  sourceType: candidate.sourceType,
  sourceId: candidate.sourceId,
  contentId: candidate.sourceId,
  domain: candidate.domain,
  title: candidate.title,
  summary: candidate.summary,
  href: candidate.href,
  status: 'ACTIVE',
  sortOrder,
  reasonText,
  source: 'remote',
  blocked: candidate.governanceState === 'filtered',
  blockReasons: candidate.governanceState === 'filtered' ? ['governance_filtered'] : [],
})

const adaptRemoteTopicSection = (section: RemoteOperationTopicSection, sortFallback: number): OperationTopicSection => {
  const sourceId = section.sourceId || postIdOf(section.post)
  const nestedItems = nonEmptyTopicItemList(section.items, section.contents)
  const items = nestedItems || (sourceId ? [{
    id: section.id,
    sourceType: section.sourceType || 'POST',
    sourceId,
    title: section.title || section.name,
    summary: section.summary || section.description,
    note: section.note,
    reasonText: section.reasonText || section.note,
    status: section.status,
    sortOrder: section.sortOrder ?? section.rank,
    post: section.post,
  }] : [])
  const title = section.title || section.name || ''
  const key = section.sectionKey
    || section.key
    || legacyTopicSectionKey(title, sortFallback)
  return {
    id: section.id,
    key,
    title: title || key,
    summary: section.summary || section.description,
    status: section.status || 'ACTIVE',
    sortOrder: section.sortOrder ?? section.rank ?? sortFallback,
    // The backend stores one row per content item. A row reason belongs to that
    // item, not to the logical section assembled by sectionKey.
    reasonText: nestedItems ? section.reasonText : undefined,
    items: items.map((item, index) => adaptRemoteTopicItem(item, index + 1)),
  }
}

const mergeOperationTopicSections = (sections: OperationTopicSection[]): OperationTopicSection[] => {
  const merged = new Map<string, OperationTopicSection>()
  sections.forEach((section) => {
    const key = section.key
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, {
        ...section,
        reasonText: undefined,
        items: [...(section.items || [])],
      })
      return
    }
    existing.items = [...existing.items, ...(section.items || [])]
      .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
    existing.sortOrder = Math.min(Number(existing.sortOrder) || 0, Number(section.sortOrder) || Number(existing.sortOrder) || 0)
  })
  return Array.from(merged.values()).sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
}

const operationTopicSectionPayloads = (topic: OperationTopic) => {
  const sections = topic.sections || []
  const emptySection = sections.find((section) => !(section.items || []).length)
  if (emptySection) {
    throw new BizException(10001, `Operation topic section "${emptySection.title || emptySection.key}" has no content items`)
  }
  return sections.flatMap((section) => {
    const sectionItems = section.items || []
    return sectionItems.map((item) => ({
      title: section.title,
      sectionKey: section.key,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      status: item.status,
      sortOrder: item.sortOrder,
      reasonText: item.reasonText,
      reasonConfirmed: Boolean(item.reasonText),
      note: item.reasonText,
    }))
  })
}

const adaptRemoteTopic = (topic: RemoteOperationTopic): OperationTopic => {
  const source = topic.source || 'remote'
  const degraded = Boolean(topic.degraded || source !== 'remote')
  const sections = mergeOperationTopicSections((topic.sections || []).map((section, index) => adaptRemoteTopicSection(section, index + 1)))
  const itemCount = sections.reduce((total, section) => total + section.items.length, 0)
  return {
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
    itemCount: itemCount || sections.length,
    currentVersion: topic.currentVersion ?? topic.version,
    draftRevision: validDraftRevision(topic.draftRevision),
    archivedReason: topic.archivedReason,
    source,
    degraded,
    fallbackReason: topic.fallbackReason,
    topicScope: adaptOperationTopicScope(topic.topicScope),
    domain: topic.domain,
    sections,
    publishCheck: topic.publishCheck,
    fallback: degraded,
  }
}

// 只认后端派生的两态；缺失/异常值置空，不由 domain 是否为空自行推断跨频道。
const adaptOperationTopicScope = (raw: string | undefined): 'DOMAIN' | 'CROSS_DOMAIN' | undefined => (
  raw === 'DOMAIN' || raw === 'CROSS_DOMAIN' ? raw : undefined
)

const validDraftRevision = (value: unknown): number | undefined => (
  Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : undefined
)

const OPERATION_SOURCES: readonly OperationSource[] = [
  'remote',
  'legacy-featured',
  'public-content-query',
  'fallback-demo',
  'unavailable',
]

const adaptTopicPublishCheck = (
  raw: unknown,
  expectedTopicId: ApiId,
): OperationTopicPublishCheck => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new BizException(20500, '发布前检查响应格式不正确，请刷新后重试')
  }
  const value = raw as Record<string, unknown>
  const draftRevision = validDraftRevision(value.draftRevision)
  const source = typeof value.source === 'string'
    && OPERATION_SOURCES.includes(value.source as OperationSource)
    ? value.source as OperationSource
    : undefined
  const rawItems = value.items
  const validItems = Array.isArray(rawItems) && rawItems.every((item) => (
    item != null
    && typeof item === 'object'
    && !Array.isArray(item)
    && typeof (item as Record<string, unknown>).code === 'string'
    && typeof (item as Record<string, unknown>).label === 'string'
    && typeof (item as Record<string, unknown>).passed === 'boolean'
    && typeof (item as Record<string, unknown>).detail === 'string'
  ))
  if (
    String(value.topicId ?? '') !== String(expectedTopicId)
    || draftRevision === undefined
    || typeof value.canPublish !== 'boolean'
    || source === undefined
    || typeof value.degraded !== 'boolean'
    || !validItems
    || (value.checkedAt != null && typeof value.checkedAt !== 'string')
  ) {
    throw new BizException(20500, '发布前检查响应缺少有效的服务端修订号，请刷新后重试')
  }
  return {
    topicId: value.topicId as ApiId,
    draftRevision,
    canPublish: value.canPublish,
    source,
    degraded: value.degraded,
    checkedAt: value.checkedAt as string | undefined,
    items: rawItems as OperationTopicPublishCheckItem[],
  }
}

// 后端候选阻断码 → 运营者可读的人话；未知码原样透出，不掩盖。
const CANDIDATE_BLOCK_COPY: Record<string, string> = {
  DOMAIN_MISMATCH_FOR_SCOPED_TOPIC: '频道不匹配：单频道专题不能收录其他频道内容',
  POST_DOMAIN_UNKNOWN: '该内容暂无频道归属，单频道专题不能收录',
  POST_UNAVAILABLE: '内容不可用或不可见',
  POST_NOT_PUBLIC_GOVERNED: '内容未通过公开治理过滤',
  ALREADY_IN_TOPIC: '该内容已在专题中',
}

const describeCandidateBlock = (blockReasons: string[] | undefined): string => {
  const reasons = (blockReasons || []).map((code) => CANDIDATE_BLOCK_COPY[code] || code)
  return reasons.length ? `无法收录：${reasons.join('；')}` : '无法收录：候选未通过治理校验'
}

const adaptRemoteSlotItem = (item: RemoteOperationSlotItem, rankFallback: number): OperationSlotItem => {
  if (item.topic) {
    const topic = adaptRemoteTopic(item.topic)
    const id = item.id || `topic:${topic.id}`
    const sourceId = item.sourceId || item.contentId || topic.id
    const reason = localizePublicCopy(item.note || item.reasonText, '公开话题运营整理')
    return {
      id,
      contentId: sourceId,
      contentType: item.contentType || item.sourceType || 'OPERATION_TOPIC',
      title: topic.title,
      summary: topic.summary || item.note,
      href: topic.entryPath,
      sourceType: item.sourceType || 'OPERATION_TOPIC',
      sourceId,
      reason,
      reasonText: reason,
      rank: item.rank ?? item.sortOrder ?? rankFallback,
      source: item.source || 'remote',
      blocked: Boolean(item.blocked),
      blockReasons: item.blockReasons || [],
      topicScope: topic.topicScope,
    }
  }
  const postItem = adaptRemotePostItem(item.post, 'Curated public content')
  const sourceId = item.sourceId || item.contentId || postItem.id
  const reason = localizePublicCopy(item.note || item.reasonText, '来自公开内容的运营整理')
  return {
    id: item.id || `post:${sourceId}`,
    contentId: sourceId,
    contentType: item.contentType || item.sourceType || 'POST',
    title: postItem.title,
    summary: postItem.summary || item.note,
    href: postItem.href,
    sourceType: item.sourceType || 'POST',
    sourceId,
    reason,
    reasonText: reason,
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
    title: slot.name || slot.title || '社区运营整理',
    description: slot.description,
    status: slot.status || 'DRAFT',
    displayLabel: '运营整理',
    explanation: slot.description || '由社区运营从公开可见内容中整理，不等同于自然排序。',
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
  reason: localizePublicCopy(post.recommendationReasons?.[0], '来自公开内容的补充结果'),
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
    title: '社区运营整理',
    description: '运营整理入口暂时不可用。',
    status: 'OFFLINE',
    displayLabel: '示例/fallback',
    explanation: '运营整理暂时不可用，当前展示稳定空状态。',
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

  getPublicOperationSlot: async (
    slotCode: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<Result<OperationSlot>> => {
    const normalizedSlotCode = slotCode
    if (!isPublicOperationSlotCode(normalizedSlotCode)) {
      return emptyPublicOperationSlot(normalizedSlotCode, 'unsupported_operation_slot')
    }
    try {
      const res = await client.get(
        `/api/v1/operations/slots/${encodeURIComponent(normalizedSlotCode)}`,
        { signal: options.signal },
      ) as Result<RemoteOperationSlot>
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

  getOperationTopic: async (topicId: ApiId): Promise<Result<OperationTopic>> => {
    const res = await client.get(`/api/v1/operations/admin/topics/${topicId}`) as Result<RemoteOperationTopic>
    return { ...res, data: adaptRemoteTopic(res.data || { id: topicId }) }
  },

  saveOperationTopicDraft: async (topic: OperationTopic): Promise<Result<OperationTopic>> => {
    if (topic.topicScope !== 'DOMAIN' && topic.topicScope !== 'CROSS_DOMAIN') {
      throw new BizException(10001, '请先明确专题范围：单频道或跨频道（全站）')
    }
    if (topic.topicScope === 'DOMAIN' && topic.domain == null) {
      throw new BizException(10001, '单频道专题需要选择一个频道')
    }
    const expectedDraftRevision = validDraftRevision(topic.draftRevision)
    if (expectedDraftRevision === undefined) {
      throw new BizException(30003, '专题草稿缺少服务端修订号，请刷新后重试')
    }
    const res = await client.put(`/api/v1/operations/admin/topics/${topic.id}`, {
      name: topic.title,
      description: topic.summary,
      status: topic.status,
      operationType: topic.activityType || 'TOPIC',
      startsAt: topic.startTime,
      endsAt: topic.endTime,
      topicScope: topic.topicScope,
      domain: topic.topicScope === 'CROSS_DOMAIN' ? null : topic.domain,
      expectedDraftRevision,
      sections: operationTopicSectionPayloads(topic),
    }) as Result<RemoteOperationTopic>
    if (!res.data) {
      throw new BizException(20500, '专题保存响应缺少服务端草稿，请刷新后重试')
    }
    const saved = adaptRemoteTopic(res.data)
    if (String(saved.id) !== String(topic.id)
      || validDraftRevision(saved.draftRevision) === undefined
      || Number(saved.draftRevision) <= expectedDraftRevision) {
      throw new BizException(20500, '专题保存响应缺少新的服务端修订号，请刷新后重试')
    }
    return { ...res, data: saved }
  },

  addTopicCandidateToSection: async (
    topicId: ApiId,
    sectionKey: string,
    candidate: OperationCandidate,
    reasonText: string,
    sortOrder = 100,
  ): Promise<Result<OperationTopicItem>> => {
    const res = await client.post(`/api/v1/operations/admin/topics/${topicId}/candidate-hints`, [{
      candidateSource: 'SECTION_ADD',
      source: 'operation_ui',
      sourceType: candidate.sourceType,
      sourceId: candidate.sourceId,
      topicId,
      topicSlug: candidate.topicSlug,
      sectionKey,
      title: candidate.title,
      href: candidate.href,
      reasonText,
      visibilityCheck: candidate.visibilityCheck,
      returnHref: candidate.href,
      persistCandidate: false,
    }]) as Result<unknown>
    const remoteCandidates = normalizeItems(res.data).map(adaptRemoteCandidate)
    const selected = remoteCandidates.find((item) => (
      item.sourceType === candidate.sourceType
      && String(item.sourceId) === String(candidate.sourceId)
    ))
    if (!selected) {
      throw new BizException(10001, '候选校验未返回匹配结果，请刷新后重试')
    }
    if (selected.governanceState === 'filtered') {
      throw new BizException(10001, describeCandidateBlock(selected.blockReasons))
    }
    return { ...res, data: candidateToTopicItem(selected, reasonText, sortOrder) }
  },

  runTopicPublishCheck: async (topicId: ApiId): Promise<Result<OperationTopicPublishCheck>> => {
    const res = await client.post(`/api/v1/operations/admin/topics/${topicId}/publish-check`) as Result<unknown>
    return { ...res, data: adaptTopicPublishCheck(res.data, topicId) }
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
    expectedDraftRevision?: number,
  ): Promise<Result<OperationActionResult>> => {
    if (action === 'archive' && !canMutateOpsOrchestration(permissions, 'offline')) {
      return Promise.reject(new BizException(10403, 'operation orchestration permission required'))
    }
    if (action !== 'preview' && action !== 'archive' && !canMutateOpsOrchestration(permissions, action as OpsOrchestrationAction)) {
      return Promise.reject(new BizException(10403, 'operation orchestration permission required'))
    }
    if (resourceKind === 'topic' && validDraftRevision(expectedDraftRevision) === undefined) {
      return Promise.reject(new BizException(30003, '专题草稿缺少服务端修订号，请刷新后重试'))
    }
    return client.post(`/api/v1/operations/admin/${resourceKind}s/${id}/${action}`, {
      note,
      confirmationPhrase: action === 'preview' ? undefined : 'CONFIRM',
      expectedDraftRevision: resourceKind === 'topic' ? expectedDraftRevision : undefined,
    })
  },
}

export const createKnowledgeEntryQuery = (
  mapping: Pick<SearchAssetMapping, 'assetId' | 'assetType' | 'status'> & { topicSlug?: string },
  limit = 8,
): KnowledgeEntryQuery => ({
  phase: 'phase-5-reserved',
  assetId: mapping.assetId,
  assetType: mapping.assetType === 'topic' ? 'topic' : 'post',
  topicSlug: mapping.topicSlug,
  includeArchived: mapping.status === 'ARCHIVED',
  limit,
})
