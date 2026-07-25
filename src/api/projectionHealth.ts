import client, { type Result } from './client'
import type { ApiId } from './types'

const BASE_PATH = '/api/v1/admin/community-health/projections'

export interface ProjectionHealth {
  projectionType: string
  displayName: string
  healthStatus: string
  issueCount: number
  issueCountCapped: boolean
  available: boolean
  reconciliationSupported: boolean
  slaMinutes?: number | null
  watermark?: ApiId | null
  backlogCount?: number | null
  overdueCount?: number | null
  backlogAgeSeconds?: number | null
  oldestBacklogAt?: string | null
  lastSuccessAt?: string | null
  lastFailureAt?: string | null
  repairMode?: string | null
  latestRunId?: ApiId | null
  checkedAt: string
  attentionReasons: string[]
}

export interface ProjectionIssue {
  issueId: ApiId
  projectionType: string
  issueType: string
  severity: string
  subjectType: string
  subjectId: string
  summary: string
  detectedAt: string
  relatedPostId?: ApiId | null
  domain?: number | null
}

export interface ProjectionIssuePage {
  items: ProjectionIssue[]
  nextCursor: string | null
  hasMore: boolean
  total: string | number
  degraded?: boolean | null
  fallbackReason?: string | null
  diagnostics?: ProjectionIssueDiagnostics | null
}

export interface ProjectionIssueDiagnostics {
  sourceErrors?: Record<string, string>
  [key: string]: unknown
}

export interface ProjectionReconcileCommand {
  dryRun: boolean
  limit: number
  reason: string
  idempotencyKey: string
}

export interface ProjectionReconcileResult {
  projectionType: string
  status: string
  dryRun: boolean
  replayed: boolean
  idempotencyKey: string
  requestFingerprint: string
  delegatedRunId?: ApiId | null
  slaMinutes?: number | null
  processedCount: number
  issueCount: number
  changedCount: number
  appliedCount?: number | null
  rejectedCount?: number | null
  coverageComplete: boolean
  operatorUid: ApiId
  reason: string
  completedAt: string
}

export interface ProjectionIssueQuery {
  cursor?: string | number
  size?: number
}

export interface ProjectionIssueRequestOptions {
  signal?: AbortSignal
}

const requestResult = <T>(request: Promise<unknown>) => request as Promise<Result<T>>
const projectionPath = (projectionType: string) => encodeURIComponent(projectionType)

export const projectionHealthApi = {
  summary: () =>
    requestResult<ProjectionHealth[]>(client.get(BASE_PATH)),
  issues: (
    projectionType: string,
    query: ProjectionIssueQuery = {},
    options: ProjectionIssueRequestOptions = {},
  ) =>
    requestResult<ProjectionIssuePage>(
      client.get(`${BASE_PATH}/${projectionPath(projectionType)}/issues`, {
        params: query,
        signal: options.signal,
      }),
    ),
  reconcile: (projectionType: string, command: ProjectionReconcileCommand) =>
    requestResult<ProjectionReconcileResult>(
      client.post(`${BASE_PATH}/${projectionPath(projectionType)}/reconcile`, command),
    ),
}
