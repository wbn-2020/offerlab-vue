import client, { Result } from './client'
import type { SearchStatus } from './search'
import type { ApiId } from './types'

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

  addAdmin: (data: { uid: ApiId; remark?: string }): Promise<Result<{ uid: ApiId; enabled: boolean; updated: boolean }>> =>
    client.post('/api/v1/ops/admins', data),

  updateAdminStatus: (
    uid: ApiId,
    data: { enabled: boolean; remark?: string },
  ): Promise<Result<{ uid: ApiId; enabled: boolean; updated: boolean }>> =>
    client.post(`/api/v1/ops/admins/${uid}/status`, data),
}
