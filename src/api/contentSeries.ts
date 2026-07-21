import axios from 'axios'
import client, { BizException, type Result } from './client'
import type { KnowledgeRelationDisplayState, KnowledgeRelationReviewStatus, KnowledgeRelationSource } from './knowledge'
import type { ApiId, ContentSeriesItem, ContentSeriesProgress, PaginatedResponse, Post } from './types'
import { adaptPage, adaptPost } from './adapters'
import { normalizeDomain } from '@/utils/domains'
import { safeStorage } from '@/utils/safeStorage'
import { sanitizeVisibleText } from '@/utils/textQuality'
import { isPublicCollectionVisible, isPublicPostVisible } from '@/utils/recommendationGovernance'

export type ContentSeriesKnowledgeProjectionState = KnowledgeRelationDisplayState

export interface ContentSeriesRecord {
  id: string
  creatorUid?: ApiId
  title: string
  summary?: string
  coverUrl?: string
  domain: number
  visibility: 'public' | 'private'
  goalCount: number
  status: 'active' | 'paused' | 'completed'
  previewSource?: 'remote' | 'local' | 'fallback' | 'demo'
  knowledgeProjectionState: ContentSeriesKnowledgeProjectionState
  knowledgeProjectionReason?: string
  sourceNote?: string
  targetHref?: string
  deleted?: boolean
  restricted?: boolean
  riskLevel?: string | number
  moderationStatus?: string | number
  reviewStatus?: string | number
  items: ContentSeriesItem[]
  progress: ContentSeriesProgress
  createdAt: number
  updatedAt: number
}

export interface ContentSeriesDraftPayload {
  title: string
  summary?: string
  coverUrl?: string
  domain: number
  visibility?: 'public' | 'private'
  goalCount?: number
  status?: 'active' | 'paused' | 'completed'
}

export interface ContentSeriesAssignmentPayload {
  seriesId?: ApiId | null
  previousSeriesId?: ApiId | null
  draftId?: ApiId
  postId?: ApiId
  title: string
  summary?: string
  domain?: number
  status: 'draft' | 'published'
}

export interface ContentSeriesResult<T> extends Result<T> {
  status: 'remote' | 'fallback'
}

const STORAGE_PREFIX = 'offerlab:content-series:v1'
const LOCAL_ONLY_MESSAGE = 'local_only'

const safeText = (value: unknown) => sanitizeVisibleText(value) || ''
const numericTime = (value: unknown, fallback = Date.now()) => {
  const timestamp = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value)
      : NaN
  if (Number.isFinite(timestamp) && timestamp > 0) return timestamp
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : fallback
}

const seriesStorageKey = (ownerId?: ApiId) => `${STORAGE_PREFIX}:${String(ownerId || 'me')}`

const createLocalId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const computeProgress = (goalCount: number, items: ContentSeriesItem[], remoteProgress?: any): ContentSeriesProgress => {
  const remotePublished = Number(remoteProgress?.publishedPostCount ?? remoteProgress?.publishedCount)
  const remoteTotal = Number(remoteProgress?.totalPostCount ?? remoteProgress?.totalCount)
  const hasRemoteProgress = Number.isFinite(remotePublished) || Number.isFinite(remoteTotal)
  const publishedCount = hasRemoteProgress
    ? Math.max(0, Number.isFinite(remotePublished) ? Math.round(remotePublished) : 0)
    : items.filter((item) => item.status === 'published').length
  const totalCount = hasRemoteProgress
    ? Math.max(publishedCount, Number.isFinite(remoteTotal) ? Math.round(remoteTotal) : publishedCount)
    : items.length
  const draftCount = hasRemoteProgress
    ? Math.max(0, totalCount - publishedCount)
    : items.filter((item) => item.status === 'draft').length
  const safeGoalCount = Math.max(1, goalCount || totalCount || 1)
  const completionRate = Number.isFinite(Number(remoteProgress?.completionRate))
    ? clampRate(Number(remoteProgress?.completionRate))
    : clampRate(Math.round((publishedCount / safeGoalCount) * 100))
  const label = publishedCount >= safeGoalCount
    ? `已达成 ${publishedCount}/${safeGoalCount}`
    : `${publishedCount}/${safeGoalCount} 已发布 · ${draftCount} 草稿`
  return {
    publishedCount,
    draftCount,
    totalCount,
    goalCount: safeGoalCount,
    completionRate,
    label,
  }
}

const clampRate = (value: number) => Math.max(0, Math.min(100, Math.round(value)))
const normalizeVisibility = (value: unknown): ContentSeriesRecord['visibility'] => (
  value === 2 || value === '2' || value === 'private' || value === 'PRIVATE' ? 'private' : 'public'
)
const normalizePreviewSource = (raw: any): NonNullable<ContentSeriesRecord['previewSource']> => {
  const value = safeText(raw?.previewSource).toLowerCase()
  if (value === 'fallback' || raw?.source === 'fallback' || raw?.fallback) return 'fallback'
  if (value === 'demo') return 'demo'
  if (value === 'local' || String(raw?.id || '').startsWith('series_')) return 'local'
  return 'remote'
}
const knowledgeRelationSources = new Set<KnowledgeRelationSource>(['manual', 'topic', 'series', 'search', 'tag', 'curation'])
const knowledgeRelationReviewStatuses = new Set<KnowledgeRelationReviewStatus>(['AUTO_SAFE', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'])
const normalizeKnowledgeProjection = (
  raw: any,
  previewSource: NonNullable<ContentSeriesRecord['previewSource']>,
): Pick<ContentSeriesRecord, 'knowledgeProjectionState' | 'knowledgeProjectionReason'> => {
  if (previewSource !== 'remote') {
    return {
      knowledgeProjectionState: 'DEGRADED',
      knowledgeProjectionReason: `${previewSource} response has no formal relation evidence.`,
    }
  }

  const relationState = safeText(raw?.relationState ?? raw?.knowledgeProjectionState).toUpperCase()
  const relationReviewStatus = safeText(raw?.relationReviewStatus ?? raw?.knowledgeReviewStatus).toUpperCase()
  const relationSource = safeText(raw?.relationSource ?? raw?.knowledgeRelationSource)
  const sourceKnown = knowledgeRelationSources.has(relationSource as KnowledgeRelationSource)
  const reviewKnown = knowledgeRelationReviewStatuses.has(relationReviewStatus as KnowledgeRelationReviewStatus)
  const hasConfirmedEvidence = relationState === 'CONFIRMED'
    && sourceKnown
    && reviewKnown
    && relationReviewStatus === 'APPROVED'
    && Boolean(
      safeText(raw?.relationId)
      && safeText(raw?.sourceAssetId)
      && safeText(raw?.targetAssetId)
      && safeText(raw?.reasonText),
    )

  if (hasConfirmedEvidence) return { knowledgeProjectionState: 'CONFIRMED' }
  if (relationState === 'DEGRADED'
    || (relationState && relationState !== 'CONFIRMED' && relationState !== 'SUGGESTED')
    || (relationState === 'CONFIRMED' && (!sourceKnown || !reviewKnown))
    || (relationState === 'SUGGESTED' && ((relationSource && !sourceKnown) || (relationReviewStatus && !reviewKnown)))) {
    return {
      knowledgeProjectionState: 'DEGRADED',
      knowledgeProjectionReason: safeText(raw?.degradedReason) || 'Relation evidence is incomplete.',
    }
  }
  return {
    knowledgeProjectionState: 'SUGGESTED',
    knowledgeProjectionReason: relationState === 'CONFIRMED'
      ? 'Confirmed state was rejected because approved review or relation evidence is incomplete.'
      : undefined,
  }
}
const visibilityCodeOf = (value?: ContentSeriesDraftPayload['visibility']) => value === 'public' ? 1 : 2

const decorateRecord = (record: Omit<ContentSeriesRecord, 'progress'>, remoteProgress?: any): ContentSeriesRecord => ({
  ...record,
  progress: computeProgress(record.goalCount, record.items, remoteProgress),
})

const normalizeSeriesItem = (raw: any): ContentSeriesItem => ({
  id: safeText(raw?.id) || createLocalId('series_item'),
  postId: raw?.postId == null ? undefined : String(raw.postId),
  draftId: raw?.draftId == null ? undefined : String(raw.draftId),
  title: safeText(raw?.title) || '未命名内容',
  summary: safeText(raw?.summary) || undefined,
  domain: raw?.domain == null ? undefined : normalizeDomain(raw.domain),
  status: raw?.status === 'published' ? 'published' : 'draft',
  updatedAt: numericTime(raw?.updatedAt),
})

const adaptSeriesRecord = (raw: any): ContentSeriesRecord => {
  const items = Array.isArray(raw?.items) ? raw.items.map(normalizeSeriesItem) : []
  const previewSource = normalizePreviewSource(raw)
  return decorateRecord({
    id: safeText(raw?.id) || createLocalId('series'),
    creatorUid: raw?.creatorUid == null ? undefined : String(raw.creatorUid),
    title: safeText(raw?.title) || '未命名合集',
    summary: safeText(raw?.summary ?? raw?.description) || undefined,
    coverUrl: safeText(raw?.coverUrl) || undefined,
    domain: normalizeDomain(raw?.domain),
    visibility: normalizeVisibility(raw?.visibility),
    goalCount: Math.max(1, Number(raw?.goalCount || raw?.progress?.totalPostCount || items.length || 3)),
    status: raw?.status === 'paused' || raw?.status === 'completed' ? raw.status : 'active',
    previewSource,
    ...normalizeKnowledgeProjection(raw, previewSource),
    sourceNote: safeText(raw?.sourceNote) || '公开系列可参与请求时关系投影；local-only/fallback 仅作降级展示。',
    targetHref: safeText(raw?.targetHref ?? raw?.href) || undefined,
    deleted: raw?.deleted ?? raw?.isDeleted,
    restricted: raw?.restricted ?? raw?.isRestricted,
    riskLevel: raw?.riskLevel ?? raw?.risk,
    moderationStatus: raw?.moderationStatus ?? raw?.governanceStatus,
    reviewStatus: raw?.reviewStatus,
    items,
    createdAt: numericTime(raw?.createdAt ?? raw?.createTime),
    updatedAt: numericTime(raw?.updatedAt ?? raw?.updateTime),
  }, raw?.progress)
}

const mergeRemoteSeriesRecord = (raw: any, localRecord?: ContentSeriesRecord): ContentSeriesRecord => {
  const remoteRecord = adaptSeriesRecord(raw)
  return decorateRecord({
    id: remoteRecord.id,
    creatorUid: remoteRecord.creatorUid || localRecord?.creatorUid,
    title: remoteRecord.title || localRecord?.title || '未命名合集',
    summary: remoteRecord.summary || localRecord?.summary,
    coverUrl: remoteRecord.coverUrl || localRecord?.coverUrl,
    domain: normalizeDomain(remoteRecord.domain ?? localRecord?.domain),
    visibility: remoteRecord.visibility || localRecord?.visibility || 'private',
    goalCount: Math.max(
      1,
      Number(localRecord?.goalCount || 0),
      Number(remoteRecord.goalCount || 0),
      Number(remoteRecord.progress.totalCount || 0),
    ),
    status: localRecord?.status || remoteRecord.status || 'active',
    previewSource: remoteRecord.previewSource,
    knowledgeProjectionState: remoteRecord.knowledgeProjectionState,
    knowledgeProjectionReason: remoteRecord.knowledgeProjectionReason,
    sourceNote: remoteRecord.sourceNote || localRecord?.sourceNote || '公开系列可参与请求时关系投影。',
    targetHref: remoteRecord.targetHref || localRecord?.targetHref,
    deleted: remoteRecord.deleted ?? localRecord?.deleted,
    restricted: remoteRecord.restricted ?? localRecord?.restricted,
    riskLevel: remoteRecord.riskLevel ?? localRecord?.riskLevel,
    moderationStatus: remoteRecord.moderationStatus ?? localRecord?.moderationStatus,
    reviewStatus: remoteRecord.reviewStatus ?? localRecord?.reviewStatus,
    items: localRecord?.items || remoteRecord.items,
    createdAt: localRecord?.createdAt || remoteRecord.createdAt,
    updatedAt: Math.max(remoteRecord.updatedAt, localRecord?.updatedAt || 0),
  }, raw?.progress)
}

export const isPublicContentSeriesAssetVisible = (record: ContentSeriesRecord) => (
  record.visibility === 'public' && isPublicCollectionVisible(record)
)

export const isPublicContentSeriesPostVisible = (post: Post) => isPublicPostVisible(post)

const assertPublicContentSeriesAssetVisible = (record: ContentSeriesRecord) => {
  if (!isPublicContentSeriesAssetVisible(record)) {
    throw new BizException(10404, '公开合集暂不可见')
  }
  return record
}

const toRemoteSeriesPayload = (payload: ContentSeriesDraftPayload) => ({
  title: safeText(payload.title),
  description: safeText(payload.summary) || undefined,
  coverUrl: safeText(payload.coverUrl) || undefined,
  domain: normalizeDomain(payload.domain),
  visibility: visibilityCodeOf(payload.visibility),
})

const readLocalSeries = (ownerId?: ApiId) => {
  const raw = safeStorage.get(seriesStorageKey(ownerId))
  if (!raw) return [] as ContentSeriesRecord[]
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(adaptSeriesRecord) : []
  } catch {
    return []
  }
}

const writeLocalSeries = (ownerId: ApiId | undefined, records: ContentSeriesRecord[]) => {
  safeStorage.set(seriesStorageKey(ownerId), JSON.stringify(records))
}

const localOnlyResult = <T>(data: T): ContentSeriesResult<T> => ({
  code: 0,
  message: LOCAL_ONLY_MESSAGE,
  data,
  status: 'fallback',
})

const throwLocalOnlyWriteError = (error: unknown, message: string): never => {
  if (shouldRethrowSeriesError(error)) throw error
  throw new BizException(30901, message)
}

const shouldRethrowSeriesError = (error: unknown) => {
  if (error instanceof BizException) {
    return error.code === 10401 || error.code === 10403
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    return status === 401 || status === 403 || status === 404 || (typeof status === 'number' && status >= 500)
  }
  return false
}

const shouldRethrowAssignmentDeleteError = (error: unknown) => {
  if (error instanceof BizException) {
    return error.code === 10401 || error.code === 10403
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status === 404) return false
    return status === 401 || status === 403 || (typeof status === 'number' && status >= 500)
  }
  return false
}

const upsertLocalRecord = (ownerId: ApiId | undefined, record: ContentSeriesRecord) => {
  const records = readLocalSeries(ownerId)
  const next = records.filter((item) => item.id !== record.id)
  next.unshift(record)
  writeLocalSeries(ownerId, next.sort((a, b) => b.updatedAt - a.updatedAt))
  return record
}

const seriesItemIdentities = (payload: ContentSeriesAssignmentPayload) => {
  const ids = new Set<string>()
  if (payload.postId != null) ids.add(`post:${payload.postId}`)
  if (payload.draftId != null) ids.add(`draft:${payload.draftId}`)
  ids.add(`title:${payload.title.trim().toLowerCase()}`)
  return [...ids]
}

const syncLocalAssignment = (ownerId: ApiId | undefined, payload: ContentSeriesAssignmentPayload) => {
  const identities = new Set(seriesItemIdentities(payload))
  const records = readLocalSeries(ownerId).map((record) => ({
    ...record,
    items: record.items.filter((item) => !identities.has(item.id)),
  }))

  const nextSeriesId = payload.seriesId == null ? '' : String(payload.seriesId)
  const targetIndex = records.findIndex((record) => record.id === nextSeriesId)
  if (targetIndex >= 0 && nextSeriesId) {
    const target = records[targetIndex]
    const nextItem: ContentSeriesItem = {
      id: payload.postId != null
        ? `post:${payload.postId}`
        : payload.draftId != null
          ? `draft:${payload.draftId}`
          : `title:${payload.title.trim().toLowerCase()}`,
      postId: payload.postId == null ? undefined : payload.postId,
      draftId: payload.draftId == null ? undefined : payload.draftId,
      title: safeText(payload.title) || '未命名内容',
      summary: safeText(payload.summary) || undefined,
      domain: payload.domain == null ? undefined : normalizeDomain(payload.domain),
      status: payload.status,
      updatedAt: Date.now(),
    }
    target.items = [nextItem, ...target.items].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 20)
    target.updatedAt = Date.now()
    const { progress: _progress, ...targetBase } = target
    records[targetIndex] = decorateRecord(targetBase)
  }

  const normalized = records.map((record) => {
    const { progress: _progress, ...recordBase } = record
    return decorateRecord(recordBase)
  })
  writeLocalSeries(ownerId, normalized)
  return normalized.find((record) => record.id === nextSeriesId) || null
}

export const contentSeriesApi = {
  listMine: async (ownerId?: ApiId): Promise<ContentSeriesResult<ContentSeriesRecord[]>> => {
    try {
      const res = await client.get('/api/v1/content-series') as Result<any>
      const localMap = new Map(readLocalSeries(ownerId).map((item) => [item.id, item]))
      const data = Array.isArray(res.data)
        ? res.data.map((item) => mergeRemoteSeriesRecord(item, localMap.get(String(item?.id))))
        : []
      if (data.length) {
        writeLocalSeries(ownerId, data)
      }
      return { ...res, data, status: 'remote' }
    } catch (error) {
      if (shouldRethrowSeriesError(error)) throw error
      return localOnlyResult(readLocalSeries(ownerId))
    }
  },

  create: async (payload: ContentSeriesDraftPayload, ownerId?: ApiId): Promise<ContentSeriesResult<ContentSeriesRecord>> => {
    const localRecord = decorateRecord({
      id: createLocalId('series'),
      creatorUid: ownerId == null ? undefined : String(ownerId),
      title: safeText(payload.title) || '未命名合集',
      summary: safeText(payload.summary) || undefined,
      coverUrl: safeText(payload.coverUrl) || undefined,
      domain: normalizeDomain(payload.domain),
      visibility: payload.visibility || 'private',
      goalCount: Math.max(1, Number(payload.goalCount || 3)),
      status: payload.status || 'active',
      previewSource: 'local',
      knowledgeProjectionState: 'DEGRADED',
      knowledgeProjectionReason: 'Local-only series has no remote relation evidence.',
      sourceNote: 'local-only 系列仅保存在本地，不参与正式知识关系。',
      targetHref: undefined,
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    try {
      const res = await client.post('/api/v1/content-series', toRemoteSeriesPayload(payload)) as Result<any>
      const data = res.data ? mergeRemoteSeriesRecord(res.data, localRecord) : localRecord
      upsertLocalRecord(ownerId, data)
      return { ...res, data, status: 'remote' }
    } catch (error) {
      upsertLocalRecord(ownerId, localRecord)
      return throwLocalOnlyWriteError(error, 'Content series was saved locally only. Remote save failed; it is not public or synced.')
    }
  },

  update: async (seriesId: ApiId, payload: ContentSeriesDraftPayload, ownerId?: ApiId): Promise<ContentSeriesResult<ContentSeriesRecord>> => {
    const records = readLocalSeries(ownerId)
    const current = records.find((item) => item.id === String(seriesId))
    const localRecord = decorateRecord({
      id: String(seriesId),
      creatorUid: current?.creatorUid || (ownerId == null ? undefined : String(ownerId)),
      title: safeText(payload.title) || current?.title || '未命名合集',
      summary: safeText(payload.summary) || current?.summary || undefined,
      coverUrl: safeText(payload.coverUrl) || current?.coverUrl || undefined,
      domain: normalizeDomain(payload.domain ?? current?.domain),
      visibility: payload.visibility || current?.visibility || 'private',
      goalCount: Math.max(1, Number(payload.goalCount || current?.goalCount || 3)),
      status: payload.status || current?.status || 'active',
      previewSource: 'local',
      knowledgeProjectionState: 'DEGRADED',
      knowledgeProjectionReason: 'Local update has no confirmed remote relation evidence.',
      sourceNote: 'local-only 系列更新仅保存在本地，不参与正式知识关系。',
      targetHref: current?.targetHref,
      items: current?.items || [],
      createdAt: current?.createdAt || Date.now(),
      updatedAt: Date.now(),
    })

    try {
      const res = await client.put(`/api/v1/content-series/${seriesId}`, toRemoteSeriesPayload(payload)) as Result<any>
      const data = res.data ? mergeRemoteSeriesRecord(res.data, localRecord) : localRecord
      upsertLocalRecord(ownerId, data)
      return { ...res, data, status: 'remote' }
    } catch (error) {
      upsertLocalRecord(ownerId, localRecord)
      return throwLocalOnlyWriteError(error, 'Content series was saved locally only. Remote update failed; public data was not changed.')
    }
  },

  syncAssignment: async (payload: ContentSeriesAssignmentPayload, ownerId?: ApiId): Promise<ContentSeriesResult<ContentSeriesRecord | null>> => {
    const localRecord = syncLocalAssignment(ownerId, payload)
    const nextSeriesId = payload.seriesId == null ? '' : String(payload.seriesId)
    const previousSeriesId = payload.previousSeriesId == null ? '' : String(payload.previousSeriesId)
    if (payload.postId == null) {
      return localOnlyResult(localRecord)
    }

    try {
      if (previousSeriesId && previousSeriesId !== nextSeriesId) {
        try {
          await client.delete(`/api/v1/content-series/${previousSeriesId}/posts/${payload.postId}`)
        } catch (error) {
          if (shouldRethrowAssignmentDeleteError(error)) throw error
        }
      }
      if (!nextSeriesId) {
        return {
          code: 0,
          message: 'assignment_removed',
          data: localRecord,
          status: 'remote',
        }
      }
      const res = await client.post(`/api/v1/content-series/${nextSeriesId}/posts`, {
        postId: payload.postId,
      }) as Result<any>
      const data = res.data ? mergeRemoteSeriesRecord(res.data, localRecord || undefined) : localRecord
      if (data) upsertLocalRecord(ownerId, data)
      return { ...res, data, status: 'remote' }
    } catch (error) {
      return throwLocalOnlyWriteError(error, 'Content series assignment was saved locally only. Remote assignment failed; public data was not changed.')
    }
  },

  getPublicDetail: async (seriesId: ApiId): Promise<ContentSeriesResult<ContentSeriesRecord>> => {
    const res = await client.get(`/api/v1/content-series/${seriesId}`) as Result<any>
    return { ...res, data: assertPublicContentSeriesAssetVisible(adaptSeriesRecord(res.data)), status: 'remote' }
  },

  listPublicByUser: async (uid: ApiId, cursor?: string, size = 12): Promise<ContentSeriesResult<ContentSeriesRecord[]>> => {
    const res = await client.get(`/api/v1/content-series/users/${uid}`, { params: { cursor, size } }) as Result<any>
    return {
      ...res,
      data: Array.isArray(res.data) ? res.data.map(adaptSeriesRecord).filter(isPublicContentSeriesAssetVisible) : [],
      status: 'remote',
    }
  },

  listPublicPosts: async (seriesId: ApiId, cursor?: string, size = 20): Promise<ContentSeriesResult<PaginatedResponse<Post> | null>> => {
    const res = await client.get(`/api/v1/content-series/${seriesId}/posts`, { params: { cursor, size } }) as Result<any>
    const data = res.data ? adaptPage(res.data, adaptPost) : null
    return {
      ...res,
      data: data
        ? {
            ...data,
            items: data.items.filter(isPublicContentSeriesPostVisible),
          }
        : null,
      status: 'remote',
    }
  },
}
