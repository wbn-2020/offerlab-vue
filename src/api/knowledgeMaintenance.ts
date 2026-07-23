import client, { type Result } from './client'
import type { ApiId, ApiLong } from './types'

export type KnowledgeActionType =
  | 'SUGGESTION_RESPONSE'
  | 'STALE_SUGGESTION'
  | 'FRESHNESS_CONFIRMATION'
  | 'REFERENCE_REVIEW'
  | 'RELATION_REVIEW'
  | 'OUTCOME_REVISIT'
  | 'MAINTENANCE_TASK'

export type KnowledgeActionItemType = KnowledgeActionType | 'UNKNOWN'

export interface KnowledgeActionListQuery {
  cursor?: string
  size?: number
  type?: KnowledgeActionType
  status?: string
}

export interface KnowledgeMaintenanceRequestOptions {
  signal?: AbortSignal
}

export interface KnowledgeActionItem {
  id: string
  type: KnowledgeActionItemType
  title: string
  reason: string
  status: string
  priority: string
  canonicalRoute: string
  postId?: ApiId
  updatedAt?: string
}

export interface KnowledgeActionPage {
  items: KnowledgeActionItem[]
  nextCursor?: string
  hasMore: boolean
  total?: ApiLong
  sourceErrors?: string[]
}

export interface KnowledgeActionSummary {
  total: ApiLong
  counts: Partial<Record<KnowledgeActionType, ApiLong>>
  degraded: boolean
  sourceErrors: Record<string, string>
  generatedAt?: string
}

const actionTypes: readonly KnowledgeActionType[] = [
  'SUGGESTION_RESPONSE',
  'STALE_SUGGESTION',
  'FRESHNESS_CONFIRMATION',
  'REFERENCE_REVIEW',
  'RELATION_REVIEW',
  'OUTCOME_REVISIT',
  'MAINTENANCE_TASK',
]
const actionTypeSet = new Set<string>(actionTypes)

const recordOf = (raw: unknown): Record<string, unknown> => (
  raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
)

const stringValue = (value: unknown) => value == null ? '' : String(value)

const adaptActionType = (value: unknown): KnowledgeActionItemType => {
  const normalized = stringValue(value).trim().toUpperCase()
  return actionTypeSet.has(normalized)
    ? normalized as KnowledgeActionType
    : 'UNKNOWN'
}

const adaptCanonicalRoute = (value: unknown) => {
  const route = stringValue(value).trim()
  return route.startsWith('/') && !route.startsWith('//') && !/\s/.test(route) ? route : ''
}

const adaptItem = (raw: unknown): KnowledgeActionItem => {
  const item = recordOf(raw)
  return {
    id: stringValue(item.id),
    type: adaptActionType(item.type),
    title: stringValue(item.title),
    reason: stringValue(item.reason),
    status: stringValue(item.status),
    priority: stringValue(item.priority),
    canonicalRoute: adaptCanonicalRoute(item.canonicalRoute),
    postId: item.postId == null ? undefined : String(item.postId),
    updatedAt: item.updatedAt == null ? undefined : String(item.updatedAt),
  }
}

const adaptPage = (raw: unknown): KnowledgeActionPage => {
  const page = recordOf(raw)
  return {
    items: Array.isArray(page.items) ? page.items.map(adaptItem) : [],
    nextCursor: page.nextCursor ? String(page.nextCursor) : undefined,
    hasMore: page.hasMore === true,
    total: page.total == null ? undefined : String(page.total),
    sourceErrors: Array.isArray(page.sourceErrors)
      ? page.sourceErrors.map(String).filter(Boolean)
      : undefined,
  }
}

const adaptSummary = (raw: unknown): KnowledgeActionSummary => {
  const summary = recordOf(raw)
  const rawCounts = recordOf(summary.counts)
  const counts: Partial<Record<KnowledgeActionType, ApiLong>> = {}
  for (const type of actionTypes) {
    if (rawCounts[type] != null) counts[type] = String(rawCounts[type])
  }

  const rawSourceErrors = recordOf(summary.sourceErrors)
  const sourceErrors = Object.fromEntries(
    Object.entries(rawSourceErrors)
      .map(([key, value]) => [key, stringValue(value)] as const)
      .filter(([, value]) => Boolean(value)),
  )

  return {
    total: summary.total == null ? '0' : String(summary.total),
    counts,
    degraded: summary.degraded === true,
    sourceErrors,
    generatedAt: summary.generatedAt == null ? undefined : String(summary.generatedAt),
  }
}

export const knowledgeMaintenanceApi = {
  actions: async (
    params: KnowledgeActionListQuery = {},
    options: KnowledgeMaintenanceRequestOptions = {},
  ) => {
    const res = await client.get('/api/v1/users/me/knowledge-actions', {
      params,
      signal: options.signal,
    }) as Result<unknown>
    return { ...res, data: res.data ? adaptPage(res.data) : null } as Result<KnowledgeActionPage>
  },
  summary: async (options: KnowledgeMaintenanceRequestOptions = {}) => {
    const res = await client.get('/api/v1/users/me/knowledge-action-summary', {
      signal: options.signal,
    }) as Result<unknown>
    return {
      ...res,
      data: res.data ? adaptSummary(res.data) : null,
    } as Result<KnowledgeActionSummary>
  },
}
