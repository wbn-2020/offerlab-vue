import client, { type Result } from './client'
import { adaptPage } from './adapters'
import type { ApiId, PaginatedResponse } from './types'

export type UpdateDigestSourceType = 'POST' | 'TOPIC' | 'NEED' | 'COLLECTION' | 'SERIES'

export interface UpdateDigestRevisitState {
  itemId: ApiId
  status: string
  targetPath?: string
  dueAt?: string
  updateTime?: string
}

export interface UpdateDigestItem {
  projectionType: 'UPDATE_DIGEST'
  digestKey: string
  dedupKey?: string
  eventId: string
  eventType: string
  sourceType: UpdateDigestSourceType
  sourceId: string
  title: string
  summary?: string
  targetPath?: string
  occurredAt?: string
  occurrenceCount: number
  notificationIds: ApiId[]
  notificationUnread: boolean
  revisit?: UpdateDigestRevisitState
}

export interface UpdateDigestListParams {
  sourceType?: UpdateDigestSourceType
  sourceId?: string | number
  unreadOnly?: boolean
  cursor?: string
  size?: number
}

const supportedSources = new Set<UpdateDigestSourceType>([
  'POST',
  'TOPIC',
  'NEED',
  'COLLECTION',
  'SERIES',
])

const safeText = (value: unknown, maxLength = 500) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, maxLength) : ''
}

const safeSameSitePath = (value: unknown) => {
  const path = safeText(value, 300)
  return path.startsWith('/')
    && !path.startsWith('//')
    && !path.startsWith('/api/')
    && !/[\s\\]/.test(path)
    ? path
    : undefined
}

const adaptDigestItem = (raw: any): UpdateDigestItem => {
  const source = safeText(raw?.sourceType, 24).toUpperCase() as UpdateDigestSourceType
  const sourceType = supportedSources.has(source) ? source : 'POST'
  const eventId = safeText(raw?.eventId, 160) || `digest:${safeText(raw?.digestKey, 160)}`
  const revisit = raw?.revisit && raw.revisit.itemId != null
    ? {
        itemId: raw.revisit.itemId as ApiId,
        status: safeText(raw.revisit.status, 32) || 'OPEN',
        targetPath: safeSameSitePath(raw.revisit.targetPath),
        dueAt: safeText(raw.revisit.dueAt, 64) || undefined,
        updateTime: safeText(raw.revisit.updateTime, 64) || undefined,
      }
    : undefined
  return {
    projectionType: 'UPDATE_DIGEST',
    digestKey: safeText(raw?.digestKey, 160) || `${sourceType}:${safeText(raw?.sourceId, 80)}:${eventId}`,
    dedupKey: safeText(raw?.dedupKey, 160) || undefined,
    eventId,
    eventType: safeText(raw?.eventType, 64) || 'PUBLIC_UPDATE',
    sourceType,
    sourceId: safeText(raw?.sourceId, 80),
    title: safeText(raw?.title, 180) || '公开内容更新',
    summary: safeText(raw?.summary, 500) || undefined,
    targetPath: safeSameSitePath(raw?.targetPath),
    occurredAt: safeText(raw?.occurredAt, 64) || undefined,
    occurrenceCount: Math.max(1, Number(raw?.occurrenceCount || 1)),
    notificationIds: Array.isArray(raw?.notificationIds)
      ? raw.notificationIds.filter((id: unknown) => id != null) as ApiId[]
      : [],
    notificationUnread: raw?.notificationUnread === true,
    revisit,
  }
}

export const updateDigestApi = {
  list: async (params: UpdateDigestListParams = {}): Promise<Result<PaginatedResponse<UpdateDigestItem>>> => {
    const res = await client.get('/api/v1/users/me/updates', {
      params: {
        sourceType: params.sourceType,
        sourceId: params.sourceId == null ? undefined : String(params.sourceId),
        unreadOnly: params.unreadOnly === true,
        cursor: params.cursor || '0',
        size: Math.max(1, Math.min(params.size ?? 20, 50)),
      },
      skipAuthRedirect: true,
    }) as Result<any>
    return {
      ...res,
      data: res.data ? adaptPage(res.data, adaptDigestItem) : null,
    }
  },
}
