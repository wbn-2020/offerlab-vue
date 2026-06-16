import axios from 'axios'
import client, { apiBaseURL, BizException, Result } from './client'
import type { SearchStatus } from './search'
import type { ApiId, PaginatedResponse } from './types'
import type { Question } from './question'

export const OPS_BATCH_RETRY_LIMIT = 50

const rawClient = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000,
  withCredentials: true,
})

const cleanRemark = (remark?: string | null) => {
  const value = remark?.trim()
  return value || undefined
}

const withRemark = <T extends Record<string, unknown>>(data: T, remark?: string | null) => {
  const value = cleanRemark(remark)
  return value ? { ...data, remark: value } : data
}

const withRiskConfirm = <T extends Record<string, unknown>>(data: T, remark?: string | null) => ({
  ...withRemark(data, remark),
  confirmationPhrase: 'CONFIRM',
})

const batchIdempotencyKey = (operation: string, ids: ApiId[]) => {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${operation}:${ids.length}:${random}`.slice(0, 80)
}

const withBatchRiskConfirm = <T extends { ids: ApiId[] }>(
  operation: string,
  data: T,
  remark?: string | null,
  previewNonce?: string | null,
) => ({
  ...withRiskConfirm(data, remark),
  idempotencyKey: batchIdempotencyKey(operation, data.ids),
  ...(previewNonce ? { previewNonce } : {}),
})

type RiskRemark = { remark: string }

const actionRemarkPayload = (reason?: string | null) => {
  const value = cleanRemark(reason)
  return value ? { remark: value, reason: value } : undefined
}

export interface HealthComponentStatus {
  status?: string
  enabled?: boolean
  configured?: boolean
  reachable?: boolean
  available?: boolean
  mode?: string
  message?: string
  bootstrapServers?: string
  brokerCount?: number
  [key: string]: unknown
}

export interface ReadinessStatus {
  status: string
  components: Record<string, HealthComponentStatus>
}

export interface KafkaPathStatus {
  path: string
  exists: boolean
  directory: boolean
  readable: boolean
  writable: boolean
}

export interface KafkaLocalCheck {
  mode: 'read-only' | string
  bootstrapServers: string
  topic: string
  consumerGroup: string
  configPath: string
  configExists: boolean
  storage: {
    logDir: KafkaPathStatus
    metadataDir: KafkaPathStatus
  }
  tcpReachable: boolean
  endpoint?: string | null
  adminProbe: {
    attempted: boolean
    topicExists: boolean
    consumerGroupSeen: boolean
    topicCount?: number
    consumerGroupCount?: number
    message?: string
    error?: string
    [key: string]: unknown
  }
  readyForOutboxReplay: boolean
  safeGuide: string[]
  blockedOperations: string[]
}

export interface OutboxStatus {
  status?: string
  available?: boolean
  attentionRequired?: boolean
  message?: string
  action?: string
  byStatus: {
    pending: number
    sent: number
    failed: number
    unknown?: number
  }
  duePending: number
}

export interface OpsStatus {
  adminWhitelistEnabled: boolean
  adminRoleEnabled: boolean
  adminMode: 'RBAC' | 'WHITELIST' | 'LOCAL_OPEN' | 'RBAC_EMPTY' | 'LOCKED'
  search: SearchStatus
  searchIndexRetry: SearchIndexRetryStatus
  notificationRetry: NotificationRetryStatus
  outbox: OutboxStatus
  opsWindow?: OpsWindowStatus
}

export interface OpsWindowStatus {
  windowMinutes: number
  thresholdBreached: boolean
  failedTotal: number
  dueTotal: number
  pendingTotal: number
  impact?: string
  suggestedAction?: string
  thresholds?: {
    failedTotalWarn?: number
    dueTotalWarn?: number
    pendingQueueWarn?: number
  }
}

export interface SearchIndexRetryStatus {
  status?: string
  available?: boolean
  attentionRequired?: boolean
  message?: string
  action?: string
  byStatus: {
    pending: number
    done: number
    failed: number
    running: number
    unknown?: number
  }
  duePending: number
}

export interface NotificationRetryStatus {
  status?: string
  available?: boolean
  attentionRequired?: boolean
  message?: string
  action?: string
  byStatus: {
    pending: number
    done: number
    failed: number
    running: number
    unknown?: number
  }
  duePending: number
}

export interface MyAdminPermissions {
  uid: ApiId
  adminMode: 'RBAC' | 'WHITELIST' | 'LOCAL_OPEN' | 'RBAC_EMPTY' | 'LOCKED'
  admin: boolean
  ops: boolean
  contentModerator: boolean
  questionOperator: boolean
  localOpen: boolean
}

export interface AdminUserRole {
  uid: ApiId
  roleCode: string
  enabled: number | boolean
  remark?: string
  operatorUid?: ApiId
  createTime?: string
  updateTime?: string
}

export interface OutboxMessage {
  id: ApiId
  aggregateType: string
  aggregateId: ApiId
  topic: string
  payload: string
  msgStatus: number
  retryCount: number
  nextRetryTime?: string
  createTime?: string
  updateTime?: string
}

export interface OutboxRetryBatchResp {
  requested: number
  retried: number
}

export interface BatchActionPreviewItem {
  id: ApiId
  eligible: boolean
  reason?: string
  reasonText?: string
  status?: number
  statusText?: string
  objectLabel?: string
  retryCount?: number
  [key: string]: unknown
}

export interface BatchActionPreview {
  operation: string
  previewNonce?: string
  requested: number
  eligible: number
  skipped: number
  estimatedImpact?: number
  maxBatchSize?: number
  previewExpiresInSeconds?: number
  requiresAuditReason?: boolean
  confirmationPhrase?: string
  riskReason?: string
  items: BatchActionPreviewItem[]
}

export interface AdminAuditLog {
  id: ApiId
  operatorUid?: ApiId
  action: string
  resourceType: string
  resourceId?: string
  beforeJson?: string
  afterJson?: string
  remark?: string
  createTime?: string
}

export interface MigrationStatus {
  ready: boolean
  tables: Record<string, boolean>
  indexes: Record<string, boolean>
}

export interface SearchAnalyticsItem {
  keyword?: string
  company?: string
  target?: string
  count: number
  noResultCount?: number
  lastResultCount?: number
  lastSearchedAt?: string
}

export interface SearchAnalytics {
  hotKeywords: SearchAnalyticsItem[]
  noResultKeywords: SearchAnalyticsItem[]
  prepClicks: SearchAnalyticsItem[]
  recommendClicks: SearchAnalyticsItem[]
}

export interface PostSearchDiagnostics {
  post?: {
    id: ApiId
    found: boolean
    publiclyVisible?: boolean
    visibleWithTestData?: boolean
    synthetic?: boolean
    postType?: number
    title?: string
    createTime?: string
    [key: string]: unknown
  }
  elasticsearch?: Record<string, unknown>
  applicationSearch?: Record<string, unknown>
  latestRetryTask?: Record<string, unknown> | null
  recommendation?: string
}

export interface ModerationKeyword {
  id: ApiId
  keyword: string
  matchType: string
  action: string
  scope: string
  enabled: number
  remark?: string
  operatorUid?: ApiId
}

export interface ModerationKeywordHit {
  id: ApiId
  scope: string
  uid?: ApiId
  keywordId?: ApiId
  keyword: string
  action: string
  contentSummary: string
  createTime?: string
}

export interface UserModerationState {
  uid: ApiId
  nickname?: string
  avatarUrl?: string
  mutedUntil?: string
  bannedUntil?: string
  reason?: string
  operatorUid?: ApiId
  recentViolationKeyword?: string
  recentViolationAction?: string
  recentViolationSummary?: string
  recentViolationTime?: string
}

export interface AiExtractTask {
  id: ApiId
  postId: ApiId
  taskType: string
  taskStatus: number
  retryCount: number
  questionCount: number
  provider?: string
  fallbackUsed?: boolean
  durationMs?: number
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  estimatedCostMicros?: number
  errorCode?: string
  errorMessage?: string
  createTime?: string
  updateTime?: string
}

export interface AiTaskMetricBucket {
  name: string
  count: number
  fallbackCount: number
  avgDurationMs: number
  totalTokens: number
  estimatedCostMicros: number
}

export interface AiTaskMetrics {
  totalTasks: number
  successCount: number
  failedCount: number
  runningCount: number
  fallbackCount: number
  fallbackRate: number
  avgDurationMs: number
  p95DurationMs: number
  totalPromptTokens: number
  totalCompletionTokens: number
  totalTokens: number
  estimatedCostMicros: number
  providerStats: AiTaskMetricBucket[]
  errorStats: AiTaskMetricBucket[]
}

export type ReviewQueueRiskLevel = 'critical' | 'high' | 'medium' | 'low'
export type ReviewQueueStatus = 'pending' | 'claimed' | 'approved' | 'rejected' | 'closed'

export interface ReviewQueueItem {
  id: ApiId
  sourceType: string
  sourceId?: ApiId
  title: string
  summary?: string
  riskLevel: ReviewQueueRiskLevel
  queueStatus: ReviewQueueStatus
  assigneeUid?: ApiId
  creatorUid?: ApiId
  priority?: number
  dueTime?: string
  handledTime?: string
  handleResult?: string
  handleNote?: string
  extJson?: string
  createTime?: string
  updateTime?: string
}

export interface ReviewQueueCreateReq {
  sourceType: string
  sourceId?: ApiId
  title: string
  summary?: string
  riskLevel?: ReviewQueueRiskLevel
  priority?: number
  extJson?: string
  note?: string
}

export interface ReviewQueueActionReq {
  note?: string
  confirmationPhrase?: string
}

export interface ReviewQueueStatusResp {
  available: boolean
  status: string
  byStatus: Record<string, number>
}

export interface AiExtractTaskDetail {
  task: AiExtractTask
  sourcePostId: ApiId
  sourcePostTitle?: string
  sourcePostSummary?: string
  retryRecords: AiExtractTask[]
}

export interface QuestionIndexTask {
  taskId: string
  type: string
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | string
  operatorUid?: ApiId
  accepted: boolean
  indexed: number
  failed: number
  total: number
  indexName?: string
  message?: string
  retryable?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface SearchIndexRetryTask {
  id: ApiId
  dedupKey: string
  postId: ApiId
  operation: 'INDEX' | 'DELETE' | string
  taskStatus: number
  retryCount: number
  nextRetryTime?: string
  lockOwner?: string
  lockUntil?: string
  lastError?: string
  createTime?: string
  updateTime?: string
}

export interface NotificationRetryTask {
  id: ApiId
  dedupKey: string
  scene?: string
  receiverUid: ApiId
  senderUid: ApiId
  notifType?: number
  targetType?: number
  targetId?: ApiId
  contentJson?: string
  taskStatus: number
  retryCount: number
  nextRetryTime?: string
  lockOwner?: string
  lockUntil?: string
  lastError?: string
  createTime?: string
  updateTime?: string
}

export interface CompanyAlias {
  id: ApiId
  canonicalCompany: string
  alias: string
  status: number
  createTime?: string
  updateTime?: string
}

export interface CompanyAliasCandidate {
  canonicalCompany: string
  alias: string
  canonicalSampleCount?: number
  aliasSampleCount?: number
  questionSampleCount?: number
  postSampleCount?: number
  totalSampleCount?: number
  reason?: string
  sampleCompanies?: string[]
}

export interface QuestionDuplicateGroup {
  questionId: ApiId
  canonicalId?: ApiId
  normalizedHash?: string
  sourcePostCount: number
  questionCount: number
  questions: Question[]
  semanticCandidates?: Array<{
    question: Question
    similarityScore: number
    reason?: string
  }>
}

const okResult = <T>(data: T): Result<T> => ({ code: 0, message: 'degraded empty state', data })

const normalizePage = <T>(raw: any, itemAdapter: (item: any) => T = (item) => item as T): PaginatedResponse<T> => {
  const items = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : []
  return {
    items: items.map(itemAdapter),
    nextCursor: raw?.nextCursor ? String(raw.nextCursor) : undefined,
    hasMore: Boolean(raw?.hasMore),
    total: Number(raw?.total ?? items.length),
  }
}

const arrayFallbackPage = <T>(items: T[]): PaginatedResponse<T> => ({
  items,
  hasMore: false,
  total: items.length,
})

const optionalPanelUnavailable = (error: unknown) => {
  if (error instanceof BizException) {
    return error.code === 10404
  }
  const status = (error as any)?.response?.status
  return status === 404 || status === 405
}

const emptySearchAnalytics = (): SearchAnalytics => ({
  hotKeywords: [],
  noResultKeywords: [],
  prepClicks: [],
  recommendClicks: [],
})

export const opsApi = {
  status: (): Promise<Result<OpsStatus>> =>
    client.get('/api/v1/ops/status'),

  readiness: async (): Promise<ReadinessStatus> => {
    const res = await rawClient.get('/api/v1/health/readiness')
    return res.data as ReadinessStatus
  },

  getKafkaLocalCheck: (): Promise<Result<KafkaLocalCheck>> =>
    client.get('/api/v1/ops/kafka/local-check'),

  myPermissions: (options?: { skipAuthRedirect?: boolean }): Promise<Result<MyAdminPermissions>> =>
    client.get('/api/v1/ops/me/permissions', { skipAuthRedirect: options?.skipAuthRedirect }),

  listOutbox: (params?: { status?: number; limit?: number }): Promise<Result<OutboxMessage[]>> =>
    client.get('/api/v1/ops/outbox', { params }),

  pageOutbox: async (params?: { status?: number; page?: number; pageSize?: number; limit?: number }): Promise<Result<PaginatedResponse<OutboxMessage>>> => {
    try {
      const res = await client.get('/api/v1/ops/outbox/page', { params }) as Result<any>
      return { ...res, data: normalizePage<OutboxMessage>(res.data) }
    } catch (error) {
      if (!optionalPanelUnavailable(error)) throw error
      const fallback = await client.get('/api/v1/ops/outbox', {
        params: { status: params?.status, limit: params?.pageSize || params?.limit || 20 },
      }) as Result<OutboxMessage[]>
      return okResult(arrayFallbackPage(fallback.data || []))
    }
  },

  getOutbox: (id: ApiId): Promise<Result<OutboxMessage>> =>
    client.get(`/api/v1/ops/outbox/${id}`),

  retryOutbox: (id: ApiId, remark?: string): Promise<Result<{ id: ApiId; retried: boolean }>> =>
    client.post(`/api/v1/ops/outbox/${id}/retry`, withRemark({}, remark)),

  retryOutboxBatch: (ids: ApiId[], remark?: string, previewNonce?: string): Promise<Result<OutboxRetryBatchResp>> =>
    client.post('/api/v1/ops/outbox/retry-batch', withBatchRiskConfirm('outbox-retry', { ids }, remark, previewNonce)),

  previewOutboxRetryBatch: (ids: ApiId[]): Promise<Result<BatchActionPreview>> =>
    client.post('/api/v1/ops/outbox/retry-batch/preview', { ids }),

  listAdmins: (params?: { limit?: number }): Promise<Result<AdminUserRole[]>> =>
    client.get('/api/v1/ops/admins', { params }),

  addAdmin: (data: { uid: ApiId; roleCode?: string; remark?: string; auditRemark?: string }): Promise<Result<{ uid: ApiId; roleCode: string; enabled: boolean; updated: boolean }>> =>
    client.post('/api/v1/ops/admins', { ...data, confirmationPhrase: 'CONFIRM' }),

  updateAdminStatus: (
    uid: ApiId,
    data: { enabled: boolean; roleCode?: string; remark?: string; auditRemark?: string },
  ): Promise<Result<{ uid: ApiId; roleCode: string; enabled: boolean; updated: boolean }>> =>
    client.post(`/api/v1/ops/admins/${uid}/status`, { ...data, confirmationPhrase: 'CONFIRM' }),

  listAuditLogs: (params?: { action?: string; resourceType?: string; limit?: number }): Promise<Result<AdminAuditLog[]>> =>
    client.get('/api/v1/ops/audit-logs', { params }),

  pageAuditLogs: async (params?: {
    action?: string
    resourceType?: string
    operatorUid?: ApiId
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  }): Promise<Result<PaginatedResponse<AdminAuditLog>>> => {
    try {
      return await client.get('/api/v1/ops/audit-logs/page', { params })
    } catch (error) {
      if (!optionalPanelUnavailable(error)) throw error
      const fallback = await client.get('/api/v1/ops/audit-logs', {
        params: {
          action: params?.action,
          resourceType: params?.resourceType,
          limit: params?.pageSize || 20,
        },
      }) as Result<AdminAuditLog[]>
      return okResult({
        items: fallback.data || [],
        hasMore: false,
        total: fallback.data?.length || 0,
      })
    }
  },

  migrationStatus: (): Promise<Result<MigrationStatus>> =>
    client.get('/api/v1/ops/migration/status'),


  searchAnalytics: async (params?: { days?: number; limit?: number; includeTestData?: boolean }): Promise<Result<SearchAnalytics>> => {
    try {
      return await client.get('/api/v1/ops/search/analytics', { params })
    } catch (error) {
      if (!optionalPanelUnavailable(error)) throw error
      return okResult(emptySearchAnalytics())
    }
  },

  getPostSearchDiagnostics: (postId: ApiId): Promise<Result<PostSearchDiagnostics>> =>
    client.get(`/api/v1/ops/search/post-diagnostics/${postId}`),

  listModerationKeywords: async (params?: { keyword?: string; scope?: string; limit?: number }): Promise<Result<ModerationKeyword[]>> => {
    try {
      return await client.get('/api/v1/ops/moderation/keywords', { params })
    } catch (error) {
      if (!optionalPanelUnavailable(error)) throw error
      return okResult([])
    }
  },

  listModerationHits: async (params?: { scope?: string; action?: string; uid?: ApiId; keyword?: string; limit?: number }): Promise<Result<ModerationKeywordHit[]>> => {
    try {
      return await client.get('/api/v1/ops/moderation/hits', { params })
    } catch (error) {
      if (!optionalPanelUnavailable(error)) throw error
      return okResult([])
    }
  },

  createModerationKeyword: (data: Partial<ModerationKeyword>): Promise<Result<ModerationKeyword>> =>
    client.post('/api/v1/ops/moderation/keywords', data),

  updateModerationKeyword: (id: ApiId, data: Partial<ModerationKeyword>): Promise<Result<ModerationKeyword>> =>
    client.post(`/api/v1/ops/moderation/keywords/${id}`, data),

  updateModerationKeywordStatus: (id: ApiId, enabled: number, remark?: string): Promise<Result<{ id: ApiId; enabled: number }>> =>
    client.post(`/api/v1/ops/moderation/keywords/${id}/status`, withRemark({}, remark), { params: { enabled } }),

  listModerationUsers: async (limit = 50): Promise<Result<UserModerationState[]>> => {
    try {
      return await client.get('/api/v1/ops/moderation/users', { params: { limit } })
    } catch (error) {
      if (!optionalPanelUnavailable(error)) throw error
      return okResult([])
    }
  },

  saveModerationUser: (data: { uid: ApiId; muteHours?: number; banHours?: number; reason?: string; auditRemark?: string }): Promise<Result<UserModerationState>> =>
    client.post('/api/v1/ops/moderation/users', data),

  clearModerationMute: (uid: ApiId, reason?: string): Promise<Result<UserModerationState>> =>
    client.post(`/api/v1/ops/moderation/users/${uid}/clear-mute`, actionRemarkPayload(reason)),

  clearModerationBan: (uid: ApiId, reason?: string): Promise<Result<UserModerationState>> =>
    client.post(`/api/v1/ops/moderation/users/${uid}/clear-ban`, actionRemarkPayload(reason)),

  listAiTasks: (params?: { status?: number; limit?: number }): Promise<Result<AiExtractTask[]>> =>
    client.get('/api/v1/admin/ai-tasks', { params }),

  listReviewQueue: (params?: { status?: ReviewQueueStatus | ''; sourceType?: string; riskLevel?: ReviewQueueRiskLevel | ''; limit?: number }): Promise<Result<ReviewQueueItem[]>> =>
    client.get('/api/v1/admin/review-queue', { params }),

  reviewQueueStatus: (): Promise<Result<ReviewQueueStatusResp>> =>
    client.get('/api/v1/admin/review-queue/status'),

  createReviewQueueItem: (data: ReviewQueueCreateReq): Promise<Result<ReviewQueueItem>> =>
    client.post('/api/v1/admin/review-queue', data),

  claimReviewQueueItem: (id: ApiId): Promise<Result<ReviewQueueItem>> =>
    client.post(`/api/v1/admin/review-queue/${id}/claim`),

  releaseReviewQueueItem: (id: ApiId, note?: string): Promise<Result<ReviewQueueItem>> =>
    client.post(`/api/v1/admin/review-queue/${id}/release`, { note }),

  approveReviewQueueItem: (id: ApiId, note?: string): Promise<Result<ReviewQueueItem>> =>
    client.post(`/api/v1/admin/review-queue/${id}/approve`, { note, confirmationPhrase: 'CONFIRM' }),

  rejectReviewQueueItem: (id: ApiId, note: string): Promise<Result<ReviewQueueItem>> =>
    client.post(`/api/v1/admin/review-queue/${id}/reject`, { note, confirmationPhrase: 'CONFIRM' }),

  closeReviewQueueItem: (id: ApiId, note: string): Promise<Result<ReviewQueueItem>> =>
    client.post(`/api/v1/admin/review-queue/${id}/close`, { note, confirmationPhrase: 'CONFIRM' }),

  getAiTaskMetrics: (limit = 100): Promise<Result<AiTaskMetrics>> =>
    client.get('/api/v1/admin/ai-tasks/metrics', { params: { limit } }),

  getAiTaskDetail: (id: ApiId): Promise<Result<AiExtractTaskDetail>> =>
    client.get(`/api/v1/admin/ai-tasks/${id}`),

  retryAiTask: (id: ApiId, remark?: string): Promise<Result<AiExtractTask>> =>
    client.post(`/api/v1/admin/ai-tasks/${id}/retry`, withRemark({}, remark)),

  rebuildQuestions: (limit = 100, remark?: string): Promise<Result<{ requested: number; submitted: number }>> =>
    client.post('/api/v1/admin/questions/rebuild', withRiskConfirm({}, remark), { params: { limit } }),

  rebuildQuestionIndex: (remark?: string): Promise<Result<{ accepted: boolean; indexed: number; failed: number; total?: number; indexName: string }>> =>
    client.post('/api/v1/admin/questions/rebuild-index', withRiskConfirm({}, remark)),

  rebuildQuestionIndexTask: (remark?: string): Promise<Result<QuestionIndexTask>> =>
    client.post('/api/v1/admin/questions/rebuild-index-task', withRiskConfirm({}, remark)),

  getQuestionIndexTask: (taskId: string): Promise<Result<QuestionIndexTask>> =>
    client.get(`/api/v1/admin/questions/index-tasks/${taskId}`),

  listQuestionIndexTasks: (limit = 10): Promise<Result<QuestionIndexTask[]>> =>
    client.get('/api/v1/admin/questions/index-tasks', { params: { limit } }),

  retryQuestionIndexTask: (taskId: string, remark?: string): Promise<Result<QuestionIndexTask>> =>
    client.post(`/api/v1/admin/questions/index-tasks/${taskId}/retry`, withRemark({}, remark)),

  listSearchIndexRetryTasks: (params?: { status?: number; limit?: number }): Promise<Result<SearchIndexRetryTask[]>> =>
    client.get('/api/v1/ops/search-index-retry-tasks', { params }),

  pageSearchIndexRetryTasks: async (params?: { status?: number; page?: number; pageSize?: number; limit?: number }): Promise<Result<PaginatedResponse<SearchIndexRetryTask>>> => {
    try {
      const res = await client.get('/api/v1/ops/search-index-retry-tasks/page', { params }) as Result<any>
      return { ...res, data: normalizePage<SearchIndexRetryTask>(res.data) }
    } catch (error) {
      if (!optionalPanelUnavailable(error)) throw error
      const fallback = await client.get('/api/v1/ops/search-index-retry-tasks', {
        params: { status: params?.status, limit: params?.pageSize || params?.limit || 20 },
      }) as Result<SearchIndexRetryTask[]>
      return okResult(arrayFallbackPage(fallback.data || []))
    }
  },

  getSearchIndexRetryTask: (id: ApiId): Promise<Result<SearchIndexRetryTask>> =>
    client.get(`/api/v1/ops/search-index-retry-tasks/${id}`),

  replaySearchIndexRetryTask: (id: ApiId, remark?: string): Promise<Result<{ id: ApiId; replayed: boolean }>> =>
    client.post(`/api/v1/ops/search-index-retry-tasks/${id}/replay`, withRemark({}, remark)),

  replaySearchIndexRetryTasks: (ids: ApiId[], remark?: string, previewNonce?: string): Promise<Result<{ requested: number; replayed: number }>> =>
    client.post('/api/v1/ops/search-index-retry-tasks/replay-batch', withBatchRiskConfirm('search-replay', { ids }, remark, previewNonce)),

  previewSearchIndexRetryTasks: (ids: ApiId[]): Promise<Result<BatchActionPreview>> =>
    client.post('/api/v1/ops/search-index-retry-tasks/replay-batch/preview', { ids }),

  listNotificationRetryTasks: (params?: { status?: number; limit?: number }): Promise<Result<NotificationRetryTask[]>> =>
    client.get('/api/v1/ops/notification-retry-tasks', { params }),

  pageNotificationRetryTasks: async (params?: { status?: number; page?: number; pageSize?: number; limit?: number }): Promise<Result<PaginatedResponse<NotificationRetryTask>>> => {
    try {
      const res = await client.get('/api/v1/ops/notification-retry-tasks/page', { params }) as Result<any>
      return { ...res, data: normalizePage<NotificationRetryTask>(res.data) }
    } catch (error) {
      if (!optionalPanelUnavailable(error)) throw error
      const fallback = await client.get('/api/v1/ops/notification-retry-tasks', {
        params: { status: params?.status, limit: params?.pageSize || params?.limit || 20 },
      }) as Result<NotificationRetryTask[]>
      return okResult(arrayFallbackPage(fallback.data || []))
    }
  },

  getNotificationRetryTask: (id: ApiId): Promise<Result<NotificationRetryTask>> =>
    client.get(`/api/v1/ops/notification-retry-tasks/${id}`),

  replayNotificationRetryTask: (id: ApiId, remark?: string): Promise<Result<{ id: ApiId; replayed: boolean }>> =>
    client.post(`/api/v1/ops/notification-retry-tasks/${id}/replay`, withRemark({}, remark)),

  replayNotificationRetryTasks: (ids: ApiId[], remark?: string, previewNonce?: string): Promise<Result<{ requested: number; replayed: number }>> =>
    client.post('/api/v1/ops/notification-retry-tasks/replay-batch', withBatchRiskConfirm('notif-replay', { ids }, remark, previewNonce)),

  previewNotificationRetryTasks: (ids: ApiId[]): Promise<Result<BatchActionPreview>> =>
    client.post('/api/v1/ops/notification-retry-tasks/replay-batch/preview', { ids }),

  reviewQuestion: (id: ApiId, status: number, remark?: string): Promise<Result<{ questionId: ApiId; status: number }>> =>
    client.post(`/api/v1/admin/questions/${id}/review`, withRemark({}, remark), { params: { status } }),

  batchReviewQuestions: (ids: ApiId[], status: number, remark?: string): Promise<Result<{ requested: number; reviewed: number; status: number }>> =>
    client.post('/api/v1/admin/questions/batch-review', withRiskConfirm({ ids, status }, remark)),

  listQuestions: (params?: { status?: number; limit?: number }): Promise<Result<Question[]>> =>
    client.get('/api/v1/admin/questions', { params }),

  pageQuestions: (params?: {
    status?: number
    keyword?: string
    company?: string
    position?: string
    minQualityScore?: number
    maxQualityScore?: number
    sourcePostId?: ApiId
    taskStatus?: number
    page?: number
    pageSize?: number
  }): Promise<Result<PaginatedResponse<Question>>> =>
    client.get('/api/v1/admin/questions/page', { params }),

  questionSummary: (): Promise<Result<{ pending: number; approved: number; hidden: number; total: number }>> =>
    client.get('/api/v1/admin/questions/summary'),

  updateQuestion: (id: ApiId, data: Partial<Question> & { status?: number } & RiskRemark): Promise<Result<Question>> =>
    client.post(`/api/v1/admin/questions/${id}`, data),

  getQuestionDuplicateGroup: (id: ApiId): Promise<Result<QuestionDuplicateGroup>> =>
    client.get(`/api/v1/admin/questions/${id}/duplicates`),

  setQuestionDuplicateCanonical: (id: ApiId, canonicalQuestionId: ApiId, remark?: string): Promise<Result<QuestionDuplicateGroup>> =>
    client.post(`/api/v1/admin/questions/${id}/duplicates/canonical`, withRiskConfirm({ canonicalQuestionId }, remark)),

  mergeQuestionDuplicateCandidate: (id: ApiId, candidateQuestionId: ApiId, remark?: string): Promise<Result<QuestionDuplicateGroup>> =>
    client.post(`/api/v1/admin/questions/${id}/duplicates/merge-candidate`, withRiskConfirm({ candidateQuestionId }, remark)),

  hideQuestionDuplicates: (id: ApiId, ids: ApiId[], remark?: string): Promise<Result<QuestionDuplicateGroup>> =>
    client.post(`/api/v1/admin/questions/${id}/duplicates/hide`, withRiskConfirm({ ids }, remark)),

  listCompanyAliases: (params?: { keyword?: string; limit?: number }): Promise<Result<CompanyAlias[]>> =>
    client.get('/api/v1/admin/company-aliases', { params }),

  listCompanyAliasCandidates: (params?: { limit?: number }): Promise<Result<CompanyAliasCandidate[]>> =>
    client.get('/api/v1/admin/company-aliases/candidates', { params }),

  createCompanyAlias: (data: { canonicalCompany: string; alias: string; status?: number } & RiskRemark): Promise<Result<CompanyAlias>> =>
    client.post('/api/v1/admin/company-aliases', data),

  updateCompanyAlias: (id: ApiId, data: { canonicalCompany: string; alias: string; status?: number } & RiskRemark): Promise<Result<CompanyAlias>> =>
    client.post(`/api/v1/admin/company-aliases/${id}`, data),

  updateCompanyAliasStatus: (id: ApiId, status: number, remark?: string): Promise<Result<{ id: ApiId; status: number }>> =>
    client.post(`/api/v1/admin/company-aliases/${id}/status`, withRemark({}, remark), { params: { status } }),
}
