import client, { type Result } from './client'
import type { ApiId } from './types'

export type CommunitySpaceType = 'topic' | 'collection' | 'series'
export type CommunitySpaceVisibility = 'PUBLIC' | 'HIDDEN'

export interface CommunitySpacePostBrief {
  id: ApiId
  authorId?: ApiId
  postType?: number
  title: string
  summary?: string
  highlightTitle?: string
  highlightSummary?: string
  coverUrl?: string
  domain?: number
  anonymous?: boolean
  createTime?: string
}

export interface CommunitySpaceUpdate {
  eventId: string
  dedupKey?: string
  sourceType?: string
  sourceId?: string
  title: string
  summary?: string
  impactScope?: string
  targetPath?: string
  resultVersion?: number
  updatedAt?: string
}

export interface CommunitySpaceNeed {
  id: ApiId
  sourceType?: string
  sourceRefId?: ApiId
  contentFormat?: string
  title: string
  description?: string
  status?: string
  updateTime?: string
  targetPath?: string
}

export interface CommunitySpaceContribution {
  contributionId: ApiId
  postId?: ApiId
  contributorUid?: ApiId
  contributionType?: string
  title: string
  targetPath?: string
  createTime?: string
}

export interface CommunitySpaceGovernanceSummary {
  publicItemCount: number
  publicContributionCount: number
  hasPublicMaintenance: boolean
  publicStatus?: string
}

export interface CommunitySpaceKnowledge {
  assets?: Array<{
    assetId?: string
    assetType?: string
    title?: string
    summary?: string
    assetStatus?: string
    visibilityState?: string
    targetHref?: string
    updatedAt?: string
  }>
  relations?: unknown[]
  paths?: Array<{
    pathId?: string
    title?: string
    summary?: string
    displayState?: string
    updatedAt?: string
  }>
  gaps?: Array<{
    gapId?: string
    title?: string
    reasonText?: string
    reviewStatus?: string
  }>
  snapshots?: unknown[]
}

export interface CommunitySpaceDiscovery {
  source?: string
  degraded?: boolean
  fallbackReason?: string
  featuredTopics?: unknown[]
  channels?: unknown[]
  contentForms?: unknown[]
  activeTopics?: unknown[]
  searchEntrypoints?: unknown[]
}

export interface CommunitySpace {
  spaceType: string
  spaceId?: ApiId
  slug?: string
  title: string
  description?: string
  domain?: number
  visibility: CommunitySpaceVisibility
  canonicalPath?: string
  representativeItems: CommunitySpacePostBrief[]
  knowledge?: CommunitySpaceKnowledge
  discovery?: CommunitySpaceDiscovery
  latestUpdates: CommunitySpaceUpdate[]
  relatedNeeds: CommunitySpaceNeed[]
  relatedContributions: CommunitySpaceContribution[]
  governanceSummary?: CommunitySpaceGovernanceSummary
  nextCursor?: string
  hasMore: boolean
  degradedSources: string[]
}

const MAX_PAGE_SIZE = 20

const safeText = (value: unknown, fallback = '') => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, 500) : fallback
}

const safePath = (value: unknown) => {
  const path = safeText(value)
  return path.startsWith('/')
    && !path.startsWith('//')
    && !path.startsWith('/api/')
    && !/[\s\\]/.test(path)
    ? path
    : undefined
}

const safeId = (value: unknown): ApiId | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = safeText(value)
  return text || undefined
}

const safeTime = (value: unknown) => {
  if (typeof value === 'string' && value.trim()) return value
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString()
  return undefined
}

const normalizePost = (raw: any): CommunitySpacePostBrief | null => {
  const id = safeId(raw?.id)
  if (id == null) return null
  return {
    id,
    authorId: safeId(raw?.authorId),
    postType: raw?.postType == null ? undefined : Number(raw.postType),
    title: safeText(raw?.title, '未命名公开内容'),
    summary: safeText(raw?.summary || raw?.highlightSummary) || undefined,
    highlightTitle: safeText(raw?.highlightTitle) || undefined,
    highlightSummary: safeText(raw?.highlightSummary) || undefined,
    coverUrl: safeText(raw?.coverUrl) || undefined,
    domain: raw?.domain == null ? undefined : Number(raw.domain),
    anonymous: raw?.anonymous === true,
    createTime: safeTime(raw?.createTime),
  }
}

const normalizeSpace = (raw: any, kind: CommunitySpaceType, identifier: string): CommunitySpace => {
  const defaultPath = kind === 'topic'
    ? `/topics/${encodeURIComponent(identifier)}`
    : kind === 'collection'
      ? `/collections/${encodeURIComponent(identifier)}`
      : `/collaboration/series/${encodeURIComponent(identifier)}`
  const visibility = String(raw?.visibility || '').toUpperCase() === 'PUBLIC' ? 'PUBLIC' : 'HIDDEN'
  const knowledge = raw?.knowledge && typeof raw.knowledge === 'object'
    ? {
        ...raw.knowledge,
        assets: Array.isArray(raw.knowledge.assets) ? raw.knowledge.assets.map((item: any) => ({
          assetId: safeText(item?.assetId) || undefined,
          assetType: safeText(item?.assetType) || undefined,
          title: safeText(item?.title) || undefined,
          summary: safeText(item?.summary) || undefined,
          assetStatus: safeText(item?.assetStatus) || undefined,
          visibilityState: safeText(item?.visibilityState) || undefined,
          targetHref: safePath(item?.targetHref),
          updatedAt: safeTime(item?.updatedAt),
        })) : [],
        relations: Array.isArray(raw.knowledge.relations) ? raw.knowledge.relations : [],
        paths: Array.isArray(raw.knowledge.paths) ? raw.knowledge.paths.map((item: any) => ({
          pathId: safeText(item?.pathId) || undefined,
          title: safeText(item?.title) || undefined,
          summary: safeText(item?.summary) || undefined,
          displayState: safeText(item?.displayState) || undefined,
          updatedAt: safeTime(item?.updatedAt),
        })) : [],
        gaps: Array.isArray(raw.knowledge.gaps) ? raw.knowledge.gaps.map((item: any) => ({
          gapId: safeText(item?.gapId) || undefined,
          title: safeText(item?.title) || undefined,
          reasonText: safeText(item?.reasonText) || undefined,
          reviewStatus: safeText(item?.reviewStatus) || undefined,
        })) : [],
        snapshots: Array.isArray(raw.knowledge.snapshots) ? raw.knowledge.snapshots : [],
      }
    : undefined

  return {
    spaceType: safeText(raw?.spaceType, kind.toUpperCase()),
    spaceId: safeId(raw?.spaceId),
    slug: safeText(raw?.slug) || undefined,
    title: safeText(raw?.title, kind === 'topic' ? identifier : '公开社区空间'),
    description: safeText(raw?.description) || undefined,
    domain: raw?.domain == null ? undefined : Number(raw.domain),
    visibility,
    canonicalPath: safePath(raw?.canonicalPath) || defaultPath,
    representativeItems: (Array.isArray(raw?.representativeItems) ? raw.representativeItems : [])
      .map(normalizePost)
      .filter(Boolean) as CommunitySpacePostBrief[],
    knowledge,
    discovery: raw?.discovery && typeof raw.discovery === 'object'
      ? {
          ...raw.discovery,
          featuredTopics: Array.isArray(raw.discovery.featuredTopics) ? raw.discovery.featuredTopics : [],
          channels: Array.isArray(raw.discovery.channels) ? raw.discovery.channels : [],
          contentForms: Array.isArray(raw.discovery.contentForms) ? raw.discovery.contentForms : [],
          activeTopics: Array.isArray(raw.discovery.activeTopics) ? raw.discovery.activeTopics : [],
          searchEntrypoints: Array.isArray(raw.discovery.searchEntrypoints) ? raw.discovery.searchEntrypoints : [],
        }
      : undefined,
    latestUpdates: (Array.isArray(raw?.latestUpdates) ? raw.latestUpdates : []).map((item: any, index: number) => ({
      eventId: safeText(item?.eventId, `update:${index + 1}`),
      dedupKey: safeText(item?.dedupKey) || undefined,
      sourceType: safeText(item?.sourceType) || undefined,
      sourceId: safeText(item?.sourceId) || undefined,
      title: safeText(item?.title, '公开内容更新'),
      summary: safeText(item?.summary) || undefined,
      impactScope: safeText(item?.impactScope) || undefined,
      targetPath: safePath(item?.targetPath),
      resultVersion: item?.resultVersion == null ? undefined : Number(item.resultVersion),
      updatedAt: safeTime(item?.updatedAt),
    })),
    relatedNeeds: (Array.isArray(raw?.relatedNeeds) ? raw.relatedNeeds : []).map((item: any, index: number) => ({
      id: safeId(item?.id) ?? `need:${index + 1}`,
      sourceType: safeText(item?.sourceType) || undefined,
      sourceRefId: safeId(item?.sourceRefId),
      contentFormat: safeText(item?.contentFormat) || undefined,
      title: safeText(item?.title, '公开共建需求'),
      description: safeText(item?.description) || undefined,
      status: safeText(item?.status) || undefined,
      updateTime: safeTime(item?.updateTime),
      targetPath: safePath(item?.targetPath),
    })),
    relatedContributions: (Array.isArray(raw?.relatedContributions) ? raw.relatedContributions : []).map((item: any, index: number) => ({
      contributionId: safeId(item?.contributionId) ?? `contribution:${index + 1}`,
      postId: safeId(item?.postId),
      contributorUid: safeId(item?.contributorUid),
      contributionType: safeText(item?.contributionType) || undefined,
      title: safeText(item?.title, '公开共建贡献'),
      targetPath: safePath(item?.targetPath),
      createTime: safeTime(item?.createTime),
    })),
    governanceSummary: raw?.governanceSummary && typeof raw.governanceSummary === 'object'
      ? {
          publicItemCount: Math.max(0, Number(raw.governanceSummary.publicItemCount || 0)),
          publicContributionCount: Math.max(0, Number(raw.governanceSummary.publicContributionCount || 0)),
          hasPublicMaintenance: raw.governanceSummary.hasPublicMaintenance === true,
          publicStatus: safeText(raw.governanceSummary.publicStatus) || undefined,
        }
      : undefined,
    nextCursor: raw?.nextCursor == null ? undefined : String(raw.nextCursor),
    hasMore: raw?.hasMore === true,
    degradedSources: Array.isArray(raw?.degradedSources)
      ? raw.degradedSources.map((item: unknown) => safeText(item)).filter(Boolean)
      : [],
  }
}

const requestSpace = async (
  kind: CommunitySpaceType,
  identifier: string,
  cursor?: string,
  size = 10,
): Promise<Result<CommunitySpace>> => {
  const encodedIdentifier = encodeURIComponent(identifier)
  const path = kind === 'topic'
    ? `/api/v1/community-spaces/topics/${encodedIdentifier}`
    : kind === 'collection'
      ? `/api/v1/community-spaces/collections/${encodedIdentifier}`
      : `/api/v1/community-spaces/series/${encodedIdentifier}`
  const res = await client.get(path, {
    params: {
      cursor: cursor || '0',
      size: Math.max(1, Math.min(size, MAX_PAGE_SIZE)),
    },
  }) as Result<any>
  return {
    ...res,
    data: res.data ? normalizeSpace(res.data, kind, identifier) : null,
  }
}

export const communitySpacesApi = {
  getTopic: (slug: string, cursor?: string, size = 10) => requestSpace('topic', slug, cursor, size),
  getCollection: (seriesId: ApiId, cursor?: string, size = 10) => requestSpace('collection', String(seriesId), cursor, size),
  getSeries: (seriesId: ApiId, cursor?: string, size = 10) => requestSpace('series', String(seriesId), cursor, size),
}
