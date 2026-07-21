import client, { type Result } from './client'
import type { ApiId, ApiLong } from './types'

const ME_BASE_PATH = '/api/v1/incentives/me'
const ADMIN_BASE_PATH = '/api/v1/incentives/admin'
const MAINTENANCE_BASE_PATH = '/api/v1/content-maintenance/tasks'

export interface CursorPage<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
  total: ApiLong
}

export interface CommunityRoleDefinition {
  id: ApiId
  roleCode: string
  roleName: string
  description?: string | null
  domainCode: string
  minAccountAgeDays: number
  minDomainReputation: ApiLong
  minActivityCount: number
  maxViolationCount: number
  minCurationAccuracyBps: number
  requiresNoRiskFreeze: boolean
  enabled: boolean
  updateTime?: string | null
}

export interface CommunityRoleEvidenceItem {
  evidenceCode: string
  label: string
  currentValue: string
  requiredValue: string
  passed: boolean
}

export interface CommunityRoleEvidence {
  roleCode: string
  roleName: string
  domainCode: string
  eligible: boolean
  failedChecks: string[]
  evidence: CommunityRoleEvidenceItem[]
  manualApprovalRequired: boolean
  riskFrozen: boolean
  applicationStatus?: string | null
  grantStatus?: string | null
  expiresAt?: string | null
  canApply: boolean
  canUseMaintenanceWorkspace: boolean
  availableActions: string[]
}

export interface CommunityRoleApplication {
  id: ApiId
  applicantUid: ApiId
  roleCode: string
  domainCode: string
  statement: string
  eligibilitySnapshotJson?: string | null
  status: string
  reviewerUid?: ApiId | null
  reviewReason?: string | null
  createTime?: string | null
  updateTime?: string | null
}

export interface CommunityRoleGrant {
  id: ApiId
  userId: ApiId
  roleCode: string
  domainCode: string
  status: string
  grantedBy?: ApiId | null
  grantReason?: string | null
  actionBy?: ApiId | null
  actionReason?: string | null
  grantedAt?: string | null
  expiresAt?: string | null
  updateTime?: string | null
}

export interface CommunityRoleWorkspaceCard {
  definition: CommunityRoleDefinition
  evidence: CommunityRoleEvidence
  application?: CommunityRoleApplication | null
  grant?: CommunityRoleGrant | null
}

export interface CommunityRoleWorkspace {
  generatedAt: string
  roles: CommunityRoleWorkspaceCard[]
}

export interface CommunityRoleGrantHistory {
  id: ApiId
  grantId: ApiId
  fromStatus?: string | null
  toStatus: string
  operatorUid: ApiId
  actionReason: string
  createTime: string
}

export interface CommunityRoleReviewContext {
  application: CommunityRoleApplication
  definition: CommunityRoleDefinition
  evidence: CommunityRoleEvidence
  currentGrant?: CommunityRoleGrant | null
  recentTrustedContributionCount: ApiLong
  completedMaintenanceTaskCount: ApiLong
  returnedMaintenanceTaskCount: ApiLong
  activeViolationCount: ApiLong
  riskFrozen: boolean
  grantHistory: CommunityRoleGrantHistory[]
}

export interface MaintenanceTaskCandidate {
  id: ApiId
  domain: number
  sourceType: string
  sourceRefId?: ApiId | null
  sourcePostId?: ApiId | null
  sourcePostType?: number | null
  title: string
  status: string
  assignmentStatus: string
  canClaim: boolean
  createTime: string
  updateTime: string
}

export interface MaintenanceCandidateQuery {
  domain?: number
  sourceType?: string
  contentType?: number
  cursor?: string | number
  size?: number
}

const requestResult = <T>(request: Promise<unknown>) => request as Promise<Result<T>>
const pathSegment = (value: ApiId | string) => encodeURIComponent(String(value))

export const communityRolesApi = {
  workspace: () =>
    requestResult<CommunityRoleWorkspace>(
      client.get(`${ME_BASE_PATH}/roles/workspace`),
    ),
  evidence: (roleCode: string, domainCode: string) =>
    requestResult<CommunityRoleEvidence>(
      client.get(`${ME_BASE_PATH}/roles/${pathSegment(roleCode)}/evidence`, {
        params: { domainCode },
      }),
    ),
  maintenanceCandidates: (query: MaintenanceCandidateQuery = {}) =>
    requestResult<CursorPage<MaintenanceTaskCandidate>>(
      client.get(`${MAINTENANCE_BASE_PATH}/candidates`, { params: query }),
    ),
  reviewContext: (applicationId: ApiId, reason: string) =>
    requestResult<CommunityRoleReviewContext>(
      client.get(`${ADMIN_BASE_PATH}/roles/review-context/${pathSegment(applicationId)}`, {
        params: { reason },
      }),
    ),
}
