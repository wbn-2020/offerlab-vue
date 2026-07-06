import client, { Result } from './client'
import type { ApiId, Post, PaginatedResponse } from './types'
import { adaptPage, adaptPost } from './adapters'
import {
  adaptSearchSuggestionItems,
  buildZeroResultActions,
  isDownstreamSearchDiscoveryItem,
  isDownstreamZeroResultAction,
  isFormalZeroResultAction,
  isPersistableSearchDiscoveryItem,
  normalizeSearchSuggestionItem,
} from '@/utils/searchSuggestionDiscovery'

const cleanRemark = (remark?: string | null) => {
  const value = remark?.trim()
  return value ? { remark: value } : undefined
}

const riskConfirmPayload = (remark?: string | null) => ({
  ...(cleanRemark(remark) || {}),
  confirmationPhrase: 'CONFIRM',
})

export interface SearchParams {
  q?: string
  company?: string
  position?: string
  type?: number
  yearsOfExp?: number
  sort?: 'relevance' | 'latest' | 'hot'
  cursor?: string
  size?: number
  includeTestData?: boolean
}

export interface SearchStatus {
  status?: string
  enabled: boolean
  available: boolean
  indexName: string
  indexExists: boolean
  indexReady: boolean
  publicSearchAvailable?: boolean
  publicSearchDegraded?: boolean
  publicSearchSource?: string
  dbFallbackAvailable?: boolean
  fallbackSource?: string
  fallbackMode?: string
  fallbackScanLimit?: number
  fallbackSchemaReady?: boolean
  message?: string
  diagnosticMessage?: string
  action?: string
}

export interface SearchIndexTask {
  taskId: string
  type: string
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  operatorUid?: ApiId
  accepted: boolean
  indexed: number
  failed: number
  total: number
  indexName?: string
  message?: string
  createdAt?: string
  updatedAt?: string
}

export interface SearchAnalyticsTrackReq {
  eventType: 'COMMUNITY_RECOMMEND_CLICK'
  keyword?: string
  company?: string
  target?: string
}

export type SearchSuggestionType = 'keyword' | 'tag' | 'topic' | 'collection' | 'correction' | 'synonym'
export type SearchDiscoverySource = 'remote' | 'local' | 'fallback' | 'demo'
export type SearchReviewStatus = 'SAFE' | 'REVIEW_REQUIRED' | 'REJECTED'

export interface SearchSuggestionItem {
  text: string
  suggestionType: SearchSuggestionType
  source: SearchDiscoverySource
  reasonText?: string
  targetHref?: string
  persistable: boolean
  reviewStatus: SearchReviewStatus
}

export type ZeroResultActionType =
  | 'relax_filter'
  | 'try_keyword'
  | 'open_topic'
  | 'open_tag'
  | 'create_gap'
  | 'open_editor'

export interface ZeroResultAction {
  actionType: ZeroResultActionType
  label: string
  targetHref?: string
  payload?: Record<string, unknown>
  requiresLogin: boolean
  requiresReview: boolean
  source: SearchDiscoverySource
}

export const searchApi = {
  searchPosts: async (params: SearchParams): Promise<Result<PaginatedResponse<Post>>> => {
    const publicParams = { ...(params || {}) }
    delete publicParams.includeTestData
    const res = await client.get('/api/v1/search/posts', { params: publicParams }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptPost) : null }
  },

  suggest: async (q: string): Promise<Result<SearchSuggestionItem[]>> => {
    const res = await client.get('/api/v1/search/suggest', { params: { prefix: q } }) as Result<unknown>
    return {
      ...res,
      data: adaptSearchSuggestionItems(res.data, { source: 'remote', reviewStatus: 'SAFE' }),
    }
  },

  hotSearches: async (): Promise<Result<SearchSuggestionItem[]>> => {
    const res = await client.get('/api/v1/search/hot') as Result<unknown>
    return {
      ...res,
      data: adaptSearchSuggestionItems(res.data, {
        suggestionType: 'keyword',
        source: 'remote',
        reviewStatus: 'SAFE',
        reasonText: 'hot',
      }),
    }
  },

  rebuildIndex: (remark?: string): Promise<Result<SearchIndexTask>> =>
    client.post('/api/v1/search/admin/rebuild', riskConfirmPayload(remark)),

  getRebuildTask: (taskId: string): Promise<Result<SearchIndexTask>> =>
    client.get(`/api/v1/search/admin/tasks/${taskId}`),

  listRebuildTasks: (limit = 10): Promise<Result<SearchIndexTask[]>> =>
    client.get('/api/v1/search/admin/tasks', { params: { limit } }),

  trackAnalytics: (data: SearchAnalyticsTrackReq): Promise<Result<{ tracked: boolean }>> =>
    client.post('/api/v1/search/analytics/track', data),
}

export {
  adaptSearchSuggestionItems,
  buildZeroResultActions,
  isDownstreamSearchDiscoveryItem,
  isDownstreamZeroResultAction,
  isFormalZeroResultAction,
  isPersistableSearchDiscoveryItem,
  normalizeSearchSuggestionItem,
}
