import client, { Result } from './client'
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
  outbox: OutboxStatus
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
}

export interface MigrationStatus {
  ready: boolean
  tables: Record<string, boolean>
  indexes: Record<string, boolean>
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

export interface UserModerationState {
  uid: ApiId
  mutedUntil?: string
  bannedUntil?: string
  reason?: string
  operatorUid?: ApiId
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
  createdAt?: string
  updatedAt?: string
}

export interface CompanyAlias {
  id: ApiId
  canonicalCompany: string
  alias: string
  status: number
  createTime?: string
  updateTime?: string
}

export const opsApi = {
  status: (): Promise<Result<OpsStatus>> =>
    client.get('/api/v1/ops/status'),

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

  migrationStatus: (): Promise<Result<MigrationStatus>> =>
    client.get('/api/v1/ops/migration/status'),

  listModerationKeywords: (params?: { keyword?: string; scope?: string; limit?: number }): Promise<Result<ModerationKeyword[]>> =>
    client.get('/api/v1/ops/moderation/keywords', { params }),

  createModerationKeyword: (data: Partial<ModerationKeyword>): Promise<Result<ModerationKeyword>> =>
    client.post('/api/v1/ops/moderation/keywords', data),

  updateModerationKeyword: (id: ApiId, data: Partial<ModerationKeyword>): Promise<Result<ModerationKeyword>> =>
    client.post(`/api/v1/ops/moderation/keywords/${id}`, data),

  updateModerationKeywordStatus: (id: ApiId, enabled: number): Promise<Result<{ id: ApiId; enabled: number }>> =>
    client.post(`/api/v1/ops/moderation/keywords/${id}/status`, null, { params: { enabled } }),

  listModerationUsers: (limit = 50): Promise<Result<UserModerationState[]>> =>
    client.get('/api/v1/ops/moderation/users', { params: { limit } }),

  saveModerationUser: (data: { uid: ApiId; muteHours?: number; banHours?: number; reason?: string }): Promise<Result<UserModerationState>> =>
    client.post('/api/v1/ops/moderation/users', data),

  listAiTasks: (params?: { status?: number; limit?: number }): Promise<Result<AiExtractTask[]>> =>
    client.get('/api/v1/admin/ai-tasks', { params }),

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

  reviewQuestion: (id: ApiId, status: number): Promise<Result<{ questionId: ApiId; status: number }>> =>
    client.post(`/api/v1/admin/questions/${id}/review`, null, { params: { status } }),

  listQuestions: (params?: { status?: number; limit?: number }): Promise<Result<Question[]>> =>
    client.get('/api/v1/admin/questions', { params }),

  pageQuestions: (params?: { status?: number; page?: number; pageSize?: number }): Promise<Result<PaginatedResponse<Question>>> =>
    client.get('/api/v1/admin/questions/page', { params }),

  questionSummary: (): Promise<Result<{ pending: number; approved: number; hidden: number; total: number }>> =>
    client.get('/api/v1/admin/questions/summary'),

  updateQuestion: (id: ApiId, data: Partial<Question> & { status?: number }): Promise<Result<Question>> =>
    client.post(`/api/v1/admin/questions/${id}`, data),

  listCompanyAliases: (params?: { keyword?: string; limit?: number }): Promise<Result<CompanyAlias[]>> =>
    client.get('/api/v1/admin/company-aliases', { params }),

  createCompanyAlias: (data: { canonicalCompany: string; alias: string; status?: number }): Promise<Result<CompanyAlias>> =>
    client.post('/api/v1/admin/company-aliases', data),

  updateCompanyAlias: (id: ApiId, data: { canonicalCompany: string; alias: string; status?: number }): Promise<Result<CompanyAlias>> =>
    client.post(`/api/v1/admin/company-aliases/${id}`, data),

  updateCompanyAliasStatus: (id: ApiId, status: number): Promise<Result<{ id: ApiId; status: number }>> =>
    client.post(`/api/v1/admin/company-aliases/${id}/status`, null, { params: { status } }),
}
