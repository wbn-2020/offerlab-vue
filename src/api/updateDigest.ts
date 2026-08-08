import client, { type Result } from './client'
import { adaptPage } from './adapters'
import type { ApiId, PaginatedResponse } from './types'

export const UPDATE_DIGEST_SUBSCRIPTION_SOURCE_TYPES = [
  'TOPIC',
  'DISCUSSION',
  'NEED',
] as const

export type UpdateDigestSubscriptionSourceType =
  typeof UPDATE_DIGEST_SUBSCRIPTION_SOURCE_TYPES[number]

export const UPDATE_DIGEST_RESOURCE_TYPES = [
  'POST',
  'TOPIC',
  'NEED',
  'COLLECTION',
  'SERIES',
] as const

export type UpdateDigestResourceType = typeof UPDATE_DIGEST_RESOURCE_TYPES[number]

/**
 * V25 keeps the old source fields as resource aliases during the compatibility
 * window. New code should use subscriptionSource* and resource* explicitly.
 */
export type UpdateDigestSourceType = UpdateDigestResourceType

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
  subscriptionSourceType?: UpdateDigestSubscriptionSourceType
  subscriptionSourceId?: string
  resourceType: UpdateDigestResourceType
  resourceId: string
  /** @deprecated Use resourceType. */
  sourceType: UpdateDigestSourceType
  /** @deprecated Use resourceId. */
  sourceId: string
  title: string
  summary?: string
  targetPath?: string
  occurredAt?: string
  occurrenceCount: number
  revisit?: UpdateDigestRevisitState
}

export interface UpdateDigestListParams {
  subscriptionSourceType?: UpdateDigestSubscriptionSourceType
  subscriptionSourceId?: string | number
  resourceType?: UpdateDigestResourceType
  resourceId?: string | number
  /** @deprecated Use subscriptionSourceType or resourceType. */
  sourceType?: UpdateDigestSourceType
  /** @deprecated Use subscriptionSourceId or resourceId. */
  sourceId?: string | number
  cursor?: string
  size?: number
}

const subscriptionSourceTypes = new Set<UpdateDigestSubscriptionSourceType>(
  UPDATE_DIGEST_SUBSCRIPTION_SOURCE_TYPES,
)
const resourceTypes = new Set<UpdateDigestResourceType>(UPDATE_DIGEST_RESOURCE_TYPES)

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

const asObject = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' ? value as Record<string, unknown> : {}
)

const normalizeSubscriptionSourceType = (value: unknown): UpdateDigestSubscriptionSourceType | undefined => {
  const sourceType = safeText(value, 24).toUpperCase() as UpdateDigestSubscriptionSourceType
  return subscriptionSourceTypes.has(sourceType) ? sourceType : undefined
}

const normalizeResourceType = (value: unknown): UpdateDigestResourceType => {
  const resourceType = safeText(value, 24).toUpperCase() as UpdateDigestResourceType
  return resourceTypes.has(resourceType) ? resourceType : 'POST'
}

const safeIdentifier = (value: unknown) => safeText(value, 80)

const queryIdentifier = (value: string | number | undefined) => {
  if (value == null) return undefined
  const identifier = safeIdentifier(value)
  return /^[1-9][0-9]{0,79}$/.test(identifier) ? identifier : undefined
}

const adaptDigestItem = (raw: unknown): UpdateDigestItem => {
  const source = asObject(raw)
  const resourceType = normalizeResourceType(source.resourceType ?? source.sourceType)
  const resourceId = safeIdentifier(source.resourceId ?? source.sourceId)
  const subscriptionSourceType = normalizeSubscriptionSourceType(source.subscriptionSourceType)
  const subscriptionSourceId = subscriptionSourceType
    ? safeIdentifier(source.subscriptionSourceId) || undefined
    : undefined
  const legacySourceId = safeIdentifier(source.sourceId)
  const eventId = safeText(source.eventId, 160) || `digest:${safeText(source.digestKey, 160)}`
  const revisitSource = asObject(source.revisit)
  const revisit = source.revisit && revisitSource.itemId != null
    ? {
        itemId: revisitSource.itemId as ApiId,
        status: safeText(revisitSource.status, 32) || 'OPEN',
        targetPath: safeSameSitePath(revisitSource.targetPath),
        dueAt: safeText(revisitSource.dueAt, 64) || undefined,
        updateTime: safeText(revisitSource.updateTime, 64) || undefined,
      }
    : undefined
  return {
    projectionType: 'UPDATE_DIGEST',
    digestKey: safeText(source.digestKey, 160)
      || `${subscriptionSourceType ?? resourceType}:${subscriptionSourceId ?? resourceId}:${eventId}`,
    dedupKey: safeText(source.dedupKey, 160) || undefined,
    eventId,
    eventType: safeText(source.eventType, 64) || 'PUBLIC_UPDATE',
    subscriptionSourceType,
    subscriptionSourceId,
    resourceType,
    resourceId,
    sourceType: resourceType,
    sourceId: legacySourceId || resourceId,
    title: safeText(source.title, 180) || '公开内容更新',
    summary: safeText(source.summary, 500) || undefined,
    targetPath: safeSameSitePath(source.targetPath),
    occurredAt: safeText(source.occurredAt, 64) || undefined,
    occurrenceCount: Math.max(1, Number(source.occurrenceCount || 1)),
    revisit,
  }
}

export const updateDigestApi = {
  list: async (params: UpdateDigestListParams = {}): Promise<Result<PaginatedResponse<UpdateDigestItem>>> => {
    const resourceId = queryIdentifier(params.resourceId)
    const hasExplicitResourceFilter = Boolean(params.resourceType || resourceId)
    const res = await client.get('/api/v1/users/me/updates', {
      params: {
        subscriptionSourceType: params.subscriptionSourceType,
        subscriptionSourceId: queryIdentifier(params.subscriptionSourceId),
        resourceType: params.resourceType,
        resourceId,
        sourceType: hasExplicitResourceFilter ? undefined : params.sourceType,
        sourceId: hasExplicitResourceFilter ? undefined : queryIdentifier(params.sourceId),
        cursor: params.cursor || '0',
        size: Math.max(1, Math.min(params.size ?? 20, 50)),
      },
      skipAuthRedirect: true,
    }) as Result<unknown>
    return {
      ...res,
      data: res.data ? adaptPage(res.data, adaptDigestItem) : null,
    }
  },
}
