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
  adminMode: 'RBAC' | 'WHITELIST' | 'LOCAL_OPEN'
  search: SearchStatus
  outbox: OutboxStatus
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
}
