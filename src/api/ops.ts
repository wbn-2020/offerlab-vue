import client, { Result } from './client'
import type { SearchStatus } from './search'

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
  adminMode: 'RBAC' | 'WHITELIST' | 'LOCAL_OPEN' | 'RBAC_EMPTY'
  search: SearchStatus
  outbox: OutboxStatus
}

export interface AdminUserRole {
  uid: number
  roleCode: string
  enabled: number | boolean
  remark?: string
  operatorUid?: number
  createTime?: string
  updateTime?: string
}

export interface OutboxMessage {
  id: number
  aggregateType: string
  aggregateId: number
  topic: string
  payload: string
  msgStatus: number
  retryCount: number
  nextRetryTime?: string
  createTime?: string
  updateTime?: string
}

export const opsApi = {
  status: (): Promise<Result<OpsStatus>> =>
    client.get('/api/v1/ops/status'),

  listOutbox: (params?: { status?: number; limit?: number }): Promise<Result<OutboxMessage[]>> =>
    client.get('/api/v1/ops/outbox', { params }),

  getOutbox: (id: number): Promise<Result<OutboxMessage>> =>
    client.get(`/api/v1/ops/outbox/${id}`),

  retryOutbox: (id: number): Promise<Result<{ id: number; retried: boolean }>> =>
    client.post(`/api/v1/ops/outbox/${id}/retry`),

  listAdmins: (params?: { limit?: number }): Promise<Result<AdminUserRole[]>> =>
    client.get('/api/v1/ops/admins', { params }),

  addAdmin: (data: { uid: number; remark?: string }): Promise<Result<{ uid: number; enabled: boolean; updated: boolean }>> =>
    client.post('/api/v1/ops/admins', data),

  updateAdminStatus: (
    uid: number,
    data: { enabled: boolean; remark?: string },
  ): Promise<Result<{ uid: number; enabled: boolean; updated: boolean }>> =>
    client.post(`/api/v1/ops/admins/${uid}/status`, data),
}
