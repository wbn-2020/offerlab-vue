import client, { type Result } from './client'
import type { ApiId } from './types'

export interface ContentAssistEnhancedException {
  requestId: ApiId
  usageId?: ApiId | null
  issueType: string
  recoverable: boolean
  requestStatus: string
  usageStatus?: string | null
  fingerprintPrefix?: string | null
  errorCode?: string | null
  provider?: string | null
  promptTokens?: number | null
  completionTokens?: number | null
  estimatedCostMicros?: ApiId | null
  ageSeconds?: ApiId | null
  createTime?: string | null
  updateTime?: string | null
}

export interface ContentAssistEnhancedReconcileCommand {
  dryRun: boolean
  limit: number
  idempotencyKey: string
  reason: string
}

export interface ContentAssistEnhancedReconcileResult {
  dryRun: boolean
  scanned: number
  eligible: number
  recovered: number
  skipped: number
  replayed: boolean
  issues: ContentAssistEnhancedException[]
}

export const contentAssistOperationsApi = {
  listEnhancedExceptions: (limit = 20): Promise<Result<ContentAssistEnhancedException[]>> =>
    client.get('/api/v1/content-assist/admin/enhanced/exceptions', {
      params: { limit: Math.max(1, Math.min(Math.trunc(limit) || 20, 100)) },
    }),

  reconcileEnhanced: (
    command: ContentAssistEnhancedReconcileCommand,
  ): Promise<Result<ContentAssistEnhancedReconcileResult>> =>
    client.post('/api/v1/content-assist/admin/enhanced/reconcile', command),
}
