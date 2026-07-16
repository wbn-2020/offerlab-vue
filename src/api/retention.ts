import client, { type Result } from './client'
import type { ApiId, PaginatedResponse } from './types'
import { adaptId, adaptPage, adaptTime } from './adapters'

export const RETENTION_BLOCK_DEFAULT_LIMIT = 3
export const RETENTION_BLOCK_MAX_LIMIT = 5
export const RETENTION_SAME_SOURCE_DEFAULT_LIMIT = 1
export const RETENTION_TOPIC_UPDATES_ENABLED = false

export type RevisitStatus = 'OPEN' | 'SNOOZED' | 'COMPLETED' | 'IGNORED'
export type RevisitSourceType =
  | 'DISCUSSION'
  | 'FAVORITE'
  | 'FOLLOWING_AUTHOR'
  | string

export interface RevisitItem {
  id: ApiId
  sourceType: RevisitSourceType
  sourceId: string
  reasonType: string
  activityCursor?: ApiId
  title: string
  description?: string
  targetPath: string
  status: RevisitStatus
  dueAt?: number
  snoozedUntil?: number
  completedAt?: number
  createdAt: number
  updatedAt: number
  onSiteOnly: boolean
  externalPush: false
  advertising: false
  payment: false
}

export interface RevisitSnoozeReq {
  until: string
}

export interface RevisitListParams {
  status?: RevisitStatus
  cursor?: string
  size?: number
}

const revisitStatuses = new Set<RevisitStatus>([
  'OPEN',
  'SNOOZED',
  'COMPLETED',
  'IGNORED',
])

const safeText = (value: unknown, maxLength: number) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, maxLength) : ''
}

const safeSameSitePath = (value: unknown) => {
  const path = String(value ?? '').trim()
  return path.startsWith('/')
    && !path.startsWith('//')
    && !path.startsWith('/api/')
    && !/[\s\\]/.test(path)
    ? path
    : '/me'
}

export const adaptRevisitItem = (raw: any): RevisitItem => {
  const status = String(raw?.status ?? raw?.revisitStatus ?? 'OPEN').toUpperCase() as RevisitStatus
  return {
    id: adaptId(raw?.id),
    sourceType: safeText(raw?.sourceType, 32) || 'OTHER',
    sourceId: safeText(raw?.sourceId, 64),
    reasonType: safeText(raw?.reasonType, 32),
    activityCursor: raw?.activityCursor == null ? undefined : adaptId(raw.activityCursor),
    title: safeText(raw?.title, 160) || '可回看的站内内容',
    description: safeText(raw?.description, 500) || undefined,
    targetPath: safeSameSitePath(raw?.targetPath),
    status: revisitStatuses.has(status) ? status : 'OPEN',
    dueAt: raw?.dueAt ? adaptTime(raw.dueAt) : undefined,
    snoozedUntil: raw?.snoozedUntil ? adaptTime(raw.snoozedUntil) : undefined,
    completedAt: raw?.completedAt ? adaptTime(raw.completedAt) : undefined,
    createdAt: adaptTime(raw?.createTime ?? raw?.createdAt),
    updatedAt: adaptTime(raw?.updateTime ?? raw?.updatedAt ?? raw?.createTime ?? raw?.createdAt),
    onSiteOnly: raw?.onSiteOnly !== false,
    externalPush: false,
    advertising: false,
    payment: false,
  }
}

const adaptRevisitResult = (res: Result<any>): Result<RevisitItem> => ({
  ...res,
  data: res.data ? adaptRevisitItem(res.data) : null,
})

export const retentionApi = {
  listRevisits: async (params: RevisitListParams = {}): Promise<Result<PaginatedResponse<RevisitItem>>> => {
    const res = await client.get('/api/v1/users/me/revisits', {
      params: {
        status: params.status ?? 'OPEN',
        cursor: params.cursor,
        size: Math.max(1, Math.min(params.size ?? 20, 50)),
      },
    }) as Result<any>
    return {
      ...res,
      data: res.data ? adaptPage(res.data, adaptRevisitItem) : null,
    }
  },

  completeRevisit: async (itemId: ApiId): Promise<Result<RevisitItem>> => {
    const res = await client.post(`/api/v1/users/me/revisits/${itemId}/complete`) as Result<any>
    return adaptRevisitResult(res)
  },

  snoozeRevisit: async (itemId: ApiId, req: RevisitSnoozeReq): Promise<Result<RevisitItem>> => {
    const res = await client.post(`/api/v1/users/me/revisits/${itemId}/snooze`, req) as Result<any>
    return adaptRevisitResult(res)
  },

  ignoreRevisit: async (itemId: ApiId): Promise<Result<RevisitItem>> => {
    const res = await client.post(`/api/v1/users/me/revisits/${itemId}/ignore`) as Result<any>
    return adaptRevisitResult(res)
  },
}
