import axios from 'axios'
import client, { BizException, type Result } from './client'
import type { ApiId, ContentSeriesItem, ContentSeriesProgress } from './types'
import { normalizeDomain } from '@/utils/domains'
import { safeStorage } from '@/utils/safeStorage'
import { sanitizeVisibleText } from '@/utils/textQuality'

export interface ContentSeriesRecord {
  id: string
  title: string
  summary?: string
  domain: number
  goalCount: number
  status: 'active' | 'paused' | 'completed'
  items: ContentSeriesItem[]
  progress: ContentSeriesProgress
  createdAt: number
  updatedAt: number
}

export interface ContentSeriesDraftPayload {
  title: string
  summary?: string
  domain: number
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
  return decorateRecord({
    id: safeText(raw?.id) || createLocalId('series'),
    title: safeText(raw?.title) || '未命名系列',
    summary: safeText(raw?.summary ?? raw?.description) || undefined,
    domain: normalizeDomain(raw?.domain),
    goalCount: Math.max(1, Number(raw?.goalCount || raw?.progress?.totalPostCount || items.length || 3)),
    status: raw?.status === 'paused' || raw?.status === 'completed' ? raw.status : 'active',
    items,
    createdAt: numericTime(raw?.createdAt ?? raw?.createTime),
    updatedAt: numericTime(raw?.updatedAt ?? raw?.updateTime),
  }, raw?.progress)
}

const mergeRemoteSeriesRecord = (raw: any, localRecord?: ContentSeriesRecord): ContentSeriesRecord => {
  const remoteRecord = adaptSeriesRecord(raw)
  return decorateRecord({
    id: remoteRecord.id,
    title: remoteRecord.title || localRecord?.title || '未命名系列',
    summary: remoteRecord.summary || localRecord?.summary,
    domain: normalizeDomain(remoteRecord.domain ?? localRecord?.domain),
    goalCount: Math.max(
      1,
      Number(localRecord?.goalCount || 0),
      Number(remoteRecord.goalCount || 0),
      Number(remoteRecord.progress.totalCount || 0),
    ),
    status: localRecord?.status || remoteRecord.status || 'active',
    items: localRecord?.items || remoteRecord.items,
    createdAt: localRecord?.createdAt || remoteRecord.createdAt,
    updatedAt: Math.max(remoteRecord.updatedAt, localRecord?.updatedAt || 0),
  }, raw?.progress)
}

const toRemoteSeriesPayload = (payload: ContentSeriesDraftPayload) => ({
  title: safeText(payload.title),
  description: safeText(payload.summary) || undefined,
  domain: normalizeDomain(payload.domain),
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
      title: safeText(payload.title) || '未命名系列',
      summary: safeText(payload.summary) || undefined,
      domain: normalizeDomain(payload.domain),
      goalCount: Math.max(1, Number(payload.goalCount || 3)),
      status: payload.status || 'active',
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
      if (shouldRethrowSeriesError(error)) throw error
      upsertLocalRecord(ownerId, localRecord)
      return localOnlyResult(localRecord)
    }
  },

  update: async (seriesId: ApiId, payload: ContentSeriesDraftPayload, ownerId?: ApiId): Promise<ContentSeriesResult<ContentSeriesRecord>> => {
    const records = readLocalSeries(ownerId)
    const current = records.find((item) => item.id === String(seriesId))
    const localRecord = decorateRecord({
      id: String(seriesId),
      title: safeText(payload.title) || current?.title || '未命名系列',
      summary: safeText(payload.summary) || current?.summary || undefined,
      domain: normalizeDomain(payload.domain ?? current?.domain),
      goalCount: Math.max(1, Number(payload.goalCount || current?.goalCount || 3)),
      status: payload.status || current?.status || 'active',
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
      if (shouldRethrowSeriesError(error)) throw error
      upsertLocalRecord(ownerId, localRecord)
      return localOnlyResult(localRecord)
    }
  },

  syncAssignment: async (payload: ContentSeriesAssignmentPayload, ownerId?: ApiId): Promise<ContentSeriesResult<ContentSeriesRecord | null>> => {
    const localRecord = syncLocalAssignment(ownerId, payload)
    if (!payload.seriesId || payload.postId == null) {
      return localOnlyResult(localRecord)
    }

    try {
      const res = await client.post(`/api/v1/content-series/${payload.seriesId}/posts`, {
        postId: payload.postId,
      }) as Result<any>
      const data = res.data ? mergeRemoteSeriesRecord(res.data, localRecord || undefined) : localRecord
      if (data) upsertLocalRecord(ownerId, data)
      return { ...res, data, status: 'remote' }
    } catch (error) {
      if (shouldRethrowSeriesError(error)) throw error
      return localOnlyResult(localRecord)
    }
  },
}
