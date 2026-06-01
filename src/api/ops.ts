import client, { BizException, Result } from './client'
import type { SearchStatus } from './search'
import type { ApiId, PaginatedResponse } from './types'
import type { Question } from './question'

export interface OutboxStatus {
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
}

export interface SearchIndexRetryStatus {
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
  count: number
  noResultCount?: number
  lastResultCount?: number
  lastSearchedAt?: string
}

export interface SearchAnalytics {
  hotKeywords: SearchAnalyticsItem[]
  noResultKeywords: SearchAnalyticsItem[]
  prepClicks: SearchAnalyticsItem[]
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
  errorMessage?: string
  createTime?: string
  updateTime?: string
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
})

export const opsApi = {
  status: (): Promise<Result<OpsStatus>> =>
    client.get('/api/v1/ops/status'),

  myPermissions: (options?: { skipAuthRedirect?: boolean }): Promise<Result<MyAdminPermissions>> =>
    client.get('/api/v1/ops/me/permissions', { skipAuthRedirect: options?.skipAuthRedirect }),

  listOutbox: (params?: { status?: number; limit?: number }): Promise<Result<OutboxMessage[]>> =>
    client.get('/api/v1/ops/outbox', { params }),

  getOutbox: (id: ApiId): Promise<Result<OutboxMessage>> =>
    client.get(`/api/v1/ops/outbox/${id}`),

  retryOutbox: (id: ApiId): Promise<Result<{ id: ApiId; retried: boolean }>> =>
    client.post(`/api/v1/ops/outbox/${id}/retry`),

  retryOutboxBatch: (ids: ApiId[]): Promise<Result<OutboxRetryBatchResp>> =>
    client.post('/api/v1/ops/outbox/retry-batch', { ids }),

  listAdmins: (params?: { limit?: number }): Promise<Result<AdminUserRole[]>> =>
    client.get('/api/v1/ops/admins', { params }),

  addAdmin: (data: { uid: ApiId; roleCode?: string; remark?: string }): Promise<Result<{ uid: ApiId; roleCode: string; enabled: boolean; updated: boolean }>> =>
    client.post('/api/v1/ops/admins', data),

  updateAdminStatus: (
    uid: ApiId,
    data: { enabled: boolean; roleCode?: string; remark?: string },
  ): Promise<Result<{ uid: ApiId; roleCode: string; enabled: boolean; updated: boolean }>> =>
    client.post(`/api/v1/ops/admins/${uid}/status`, data),

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


  searchAnalytics: async (params?: { days?: number; limit?: number }): Promise<Result<SearchAnalytics>> => {
    try {
      return await client.get('/api/v1/ops/search/analytics', { params })
    } catch (error) {
      if (!optionalPanelUnavailable(error)) throw error
      return okResult(emptySearchAnalytics())
    }
  },
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

  updateModerationKeywordStatus: (id: ApiId, enabled: number): Promise<Result<{ id: ApiId; enabled: number }>> =>
    client.post(`/api/v1/ops/moderation/keywords/${id}/status`, null, { params: { enabled } }),

  listModerationUsers: async (limit = 50): Promise<Result<UserModerationState[]>> => {
    try {
      return await client.get('/api/v1/ops/moderation/users', { params: { limit } })
    } catch (error) {
      if (!optionalPanelUnavailable(error)) throw error
      return okResult([])
    }
  },

  saveModerationUser: (data: { uid: ApiId; muteHours?: number; banHours?: number; reason?: string }): Promise<Result<UserModerationState>> =>
    client.post('/api/v1/ops/moderation/users', data),

  clearModerationMute: (uid: ApiId): Promise<Result<UserModerationState>> =>
    client.post(`/api/v1/ops/moderation/users/${uid}/clear-mute`),

  clearModerationBan: (uid: ApiId): Promise<Result<UserModerationState>> =>
    client.post(`/api/v1/ops/moderation/users/${uid}/clear-ban`),

  listAiTasks: (params?: { status?: number; limit?: number }): Promise<Result<AiExtractTask[]>> =>
    client.get('/api/v1/admin/ai-tasks', { params }),

  getAiTaskDetail: (id: ApiId): Promise<Result<AiExtractTaskDetail>> =>
    client.get(`/api/v1/admin/ai-tasks/${id}`),

  retryAiTask: (id: ApiId): Promise<Result<AiExtractTask>> =>
    client.post(`/api/v1/admin/ai-tasks/${id}/retry`),

  rebuildQuestions: (limit = 100): Promise<Result<{ requested: number; submitted: number }>> =>
    client.post('/api/v1/admin/questions/rebuild', null, { params: { limit } }),

  rebuildQuestionIndex: (): Promise<Result<{ accepted: boolean; indexed: number; failed: number; total?: number; indexName: string }>> =>
    client.post('/api/v1/admin/questions/rebuild-index'),

  rebuildQuestionIndexTask: (): Promise<Result<QuestionIndexTask>> =>
    client.post('/api/v1/admin/questions/rebuild-index-task'),

  getQuestionIndexTask: (taskId: string): Promise<Result<QuestionIndexTask>> =>
    client.get(`/api/v1/admin/questions/index-tasks/${taskId}`),

  listQuestionIndexTasks: (limit = 10): Promise<Result<QuestionIndexTask[]>> =>
    client.get('/api/v1/admin/questions/index-tasks', { params: { limit } }),

  retryQuestionIndexTask: (taskId: string): Promise<Result<QuestionIndexTask>> =>
    client.post(`/api/v1/admin/questions/index-tasks/${taskId}/retry`),

  listSearchIndexRetryTasks: (params?: { status?: number; limit?: number }): Promise<Result<SearchIndexRetryTask[]>> =>
    client.get('/api/v1/ops/search-index-retry-tasks', { params }),

  getSearchIndexRetryTask: (id: ApiId): Promise<Result<SearchIndexRetryTask>> =>
    client.get(`/api/v1/ops/search-index-retry-tasks/${id}`),

  replaySearchIndexRetryTask: (id: ApiId): Promise<Result<{ id: ApiId; replayed: boolean }>> =>
    client.post(`/api/v1/ops/search-index-retry-tasks/${id}/replay`),

  replaySearchIndexRetryTasks: (ids: ApiId[]): Promise<Result<{ requested: number; replayed: number }>> =>
    client.post('/api/v1/ops/search-index-retry-tasks/replay-batch', { ids }),

  listNotificationRetryTasks: (params?: { status?: number; limit?: number }): Promise<Result<NotificationRetryTask[]>> =>
    client.get('/api/v1/ops/notification-retry-tasks', { params }),

  getNotificationRetryTask: (id: ApiId): Promise<Result<NotificationRetryTask>> =>
    client.get(`/api/v1/ops/notification-retry-tasks/${id}`),

  replayNotificationRetryTask: (id: ApiId): Promise<Result<{ id: ApiId; replayed: boolean }>> =>
    client.post(`/api/v1/ops/notification-retry-tasks/${id}/replay`),

  replayNotificationRetryTasks: (ids: ApiId[]): Promise<Result<{ requested: number; replayed: number }>> =>
    client.post('/api/v1/ops/notification-retry-tasks/replay-batch', { ids }),

  reviewQuestion: (id: ApiId, status: number): Promise<Result<{ questionId: ApiId; status: number }>> =>
    client.post(`/api/v1/admin/questions/${id}/review`, null, { params: { status } }),

  batchReviewQuestions: (ids: ApiId[], status: number): Promise<Result<{ requested: number; reviewed: number; status: number }>> =>
    client.post('/api/v1/admin/questions/batch-review', { ids, status }),

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

  updateQuestion: (id: ApiId, data: Partial<Question> & { status?: number }): Promise<Result<Question>> =>
    client.post(`/api/v1/admin/questions/${id}`, data),

  getQuestionDuplicateGroup: (id: ApiId): Promise<Result<QuestionDuplicateGroup>> =>
    client.get(`/api/v1/admin/questions/${id}/duplicates`),

  setQuestionDuplicateCanonical: (id: ApiId, canonicalQuestionId: ApiId): Promise<Result<QuestionDuplicateGroup>> =>
    client.post(`/api/v1/admin/questions/${id}/duplicates/canonical`, { canonicalQuestionId }),

  mergeQuestionDuplicateCandidate: (id: ApiId, candidateQuestionId: ApiId): Promise<Result<QuestionDuplicateGroup>> =>
    client.post(`/api/v1/admin/questions/${id}/duplicates/merge-candidate`, { candidateQuestionId }),

  hideQuestionDuplicates: (id: ApiId, ids: ApiId[]): Promise<Result<QuestionDuplicateGroup>> =>
    client.post(`/api/v1/admin/questions/${id}/duplicates/hide`, { ids }),

  listCompanyAliases: (params?: { keyword?: string; limit?: number }): Promise<Result<CompanyAlias[]>> =>
    client.get('/api/v1/admin/company-aliases', { params }),

  listCompanyAliasCandidates: (params?: { limit?: number }): Promise<Result<CompanyAliasCandidate[]>> =>
    client.get('/api/v1/admin/company-aliases/candidates', { params }),

  createCompanyAlias: (data: { canonicalCompany: string; alias: string; status?: number }): Promise<Result<CompanyAlias>> =>
    client.post('/api/v1/admin/company-aliases', data),

  updateCompanyAlias: (id: ApiId, data: { canonicalCompany: string; alias: string; status?: number }): Promise<Result<CompanyAlias>> =>
    client.post(`/api/v1/admin/company-aliases/${id}`, data),

  updateCompanyAliasStatus: (id: ApiId, status: number): Promise<Result<{ id: ApiId; status: number }>> =>
    client.post(`/api/v1/admin/company-aliases/${id}/status`, null, { params: { status } }),
}
