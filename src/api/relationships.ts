import client, { type Result } from './client'
import type { ApiId, PaginatedResponse } from './types'
import { adaptId, adaptPage, adaptTime } from './adapters'

export const RELATIONSHIP_SOURCE_TYPES = [
  'USER',
  'TOPIC',
  'DISCUSSION',
  'NEED',
  'SERIES',
  'ACTIVITY',
] as const

export type RelationshipSourceType = typeof RELATIONSHIP_SOURCE_TYPES[number]
export type RelationshipMode = 'ALL' | 'ACTIVE' | 'MUTED'
export type RelationshipDeliveryMode = 'IMMEDIATE' | 'DIGEST' | 'MUTED'

export interface RelationshipListQuery {
  sourceType?: RelationshipSourceType
  mode?: RelationshipMode
  cursor?: string
  size?: number
}

export interface RelationshipPreference {
  deliveryMode: RelationshipDeliveryMode
  expiresAt?: number
}

export interface RelationshipItem {
  sourceType: RelationshipSourceType
  sourceId: ApiId
  title: string
  summary?: string
  targetPath: string
  relationshipStatus: string
  deliveryMode: RelationshipDeliveryMode
  updatedAt: number
  expiresAt?: number
  unreadCount: number
  sourceVisible: boolean
}

export interface RelationshipSummary {
  total: number
  active: number
  muted: number
  immediate: number
  digest: number
  bySourceType: Partial<Record<RelationshipSourceType, number>>
  generatedAt?: number
}

const requestResult = <T>(request: Promise<unknown>) => request as Promise<Result<T>>
const resourceId = (value: ApiId) => encodeURIComponent(String(value))

const sourceTypes = new Set<string>(RELATIONSHIP_SOURCE_TYPES)
const deliveryModes = new Set<RelationshipDeliveryMode>(['IMMEDIATE', 'DIGEST', 'MUTED'])
const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {}

const safeText = (value: unknown, maxLength: number) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, maxLength) : ''
}

const safePath = (value: unknown) => {
  const path = safeText(value, 300)
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/api/') && !/[\s\\]/.test(path)
    ? path
    : '/me/relationships'
}

const normalizeSourceType = (value: unknown): RelationshipSourceType => {
  const normalized = safeText(value, 32).toUpperCase()
  return sourceTypes.has(normalized) ? normalized as RelationshipSourceType : 'USER'
}

const normalizeDeliveryMode = (value: unknown): RelationshipDeliveryMode => {
  const normalized = safeText(value, 32).toUpperCase() as RelationshipDeliveryMode
  return deliveryModes.has(normalized) ? normalized : 'IMMEDIATE'
}

const adaptRelationship = (raw: unknown): RelationshipItem => {
  const source = asObject(raw)
  const preference = asObject(source.preference)
  const sourceType = normalizeSourceType(source.sourceType ?? source.type)
  const sourceId = adaptId(source.sourceId ?? source.targetId ?? source.id)
  const deliveryMode = normalizeDeliveryMode(source.deliveryMode ?? preference.deliveryMode)
  const updatedAt = source.updatedAt ?? source.updateTime ?? source.lastPublishedAt ?? source.createTime
  const expiresAt = source.expiresAt ?? preference.expiresAt
  return {
    sourceType,
    sourceId,
    title: safeText(source.title ?? source.name ?? source.sourceTitle, 160) || '未命名关系',
    summary: safeText(source.summary ?? source.description ?? source.excerpt, 500) || undefined,
    targetPath: safePath(source.targetPath ?? source.canonicalPath ?? source.path),
    relationshipStatus: safeText(source.relationshipStatus ?? source.status ?? source.relationStatus, 40).toUpperCase() || 'ACTIVE',
    deliveryMode,
    updatedAt: updatedAt ? adaptTime(updatedAt) : 0,
    expiresAt: expiresAt ? adaptTime(expiresAt) : undefined,
    unreadCount: Math.max(0, Number(source.unreadCount ?? source.unread ?? 0)),
    sourceVisible: source.sourceVisible !== false && source.visible !== false,
  }
}

const adaptSummary = (raw: unknown): RelationshipSummary => {
  const source = asObject(raw)
  const counts = asObject(source.bySourceType ?? source.sourceTypeCounts)
  const bySourceType = Object.fromEntries(
    RELATIONSHIP_SOURCE_TYPES.map((type) => [type, Math.max(0, Number(counts[type] ?? counts[type.toLowerCase()] ?? 0))]),
  ) as Partial<Record<RelationshipSourceType, number>>
  const total = Math.max(0, Number(source.total ?? source.totalCount ?? 0))
  const muted = Math.max(0, Number(source.muted ?? source.mutedCount ?? 0))
  const active = Math.max(0, Number(source.active ?? source.activeCount ?? Math.max(0, total - muted)))
  return {
    total,
    active,
    muted,
    immediate: Math.max(0, Number(source.immediate ?? source.immediateCount ?? 0)),
    digest: Math.max(0, Number(source.digest ?? source.digestCount ?? 0)),
    bySourceType,
    generatedAt: source.generatedAt ? adaptTime(source.generatedAt) : undefined,
  }
}

export const relationshipsApi = {
  list: async (
    query: RelationshipListQuery = {},
    options?: { signal?: AbortSignal },
  ): Promise<Result<PaginatedResponse<RelationshipItem>>> => {
    const res = await requestResult<unknown>(
      client.get('/api/v1/users/me/relationships', {
        params: {
          sourceType: query.sourceType,
          mode: query.mode ?? 'ALL',
          cursor: query.cursor,
          size: Math.max(1, Math.min(query.size ?? 20, 50)),
        },
        signal: options?.signal,
      }),
    )
    return { ...res, data: res.data ? adaptPage(res.data, adaptRelationship) : null }
  },

  summary: async (options?: { signal?: AbortSignal }): Promise<Result<RelationshipSummary>> => {
    const res = await requestResult<unknown>(
      client.get('/api/v1/users/me/relationship-summary', { signal: options?.signal }),
    )
    return { ...res, data: res.data ? adaptSummary(res.data) : null }
  },

  getPreference: async (
    sourceType: RelationshipSourceType,
    sourceId: ApiId,
  ): Promise<Result<RelationshipPreference>> => {
    const res = await requestResult<unknown>(
      client.get(`/api/v1/users/me/relationships/${sourceType}/${resourceId(sourceId)}/preference`),
    )
    const data = asObject(res.data)
    return {
      ...res,
      data: res.data
        ? {
            deliveryMode: normalizeDeliveryMode(data.deliveryMode),
            expiresAt: data.expiresAt ? adaptTime(data.expiresAt) : undefined,
          }
        : null,
    }
  },

  updatePreference: async (
    sourceType: RelationshipSourceType,
    sourceId: ApiId,
    preference: { deliveryMode: RelationshipDeliveryMode; expiresAt?: string | null },
  ): Promise<Result<RelationshipPreference>> => {
    const res = await requestResult<unknown>(
      client.put(
        `/api/v1/users/me/relationships/${sourceType}/${resourceId(sourceId)}/preference`,
        preference,
      ),
    )
    const data = asObject(res.data)
    return {
      ...res,
      data: res.data
        ? {
            deliveryMode: normalizeDeliveryMode(data.deliveryMode),
            expiresAt: data.expiresAt ? adaptTime(data.expiresAt) : undefined,
          }
        : null,
    }
  },

  deletePreference: (sourceType: RelationshipSourceType, sourceId: ApiId) =>
    requestResult<void>(
      client.delete(`/api/v1/users/me/relationships/${sourceType}/${resourceId(sourceId)}/preference`),
    ),
}
