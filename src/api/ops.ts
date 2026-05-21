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
  search: SearchStatus
  outbox: OutboxStatus
}

export const opsApi = {
  status: (): Promise<Result<OpsStatus>> =>
    client.get('/api/v1/ops/status'),
}
