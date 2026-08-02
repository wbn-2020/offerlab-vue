import client, { type Result, withRemoteResultProvenance } from './client'
import type { ApiId, ApiLong } from './types'

export type { ApiLong } from './types'

export interface PageResult<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
  total: ApiLong
  source?: string | null
  degraded?: boolean | null
  fallbackReason?: string | null
  scanLimit?: number | null
  diagnostics?: Record<string, unknown> | null
}

export interface PageQuery {
  page?: number
  size?: number
}

export type IncentiveAccountType = 'REPUTATION' | 'POINT'
export type IncentiveAccountStatus = 'ACTIVE' | 'FROZEN' | 'RECOVERY_DUE'
export type LedgerEntryType =
  | 'EARN'
  | 'REWARD'
  | 'PLATFORM_GRANT'
  | 'SPEND'
  | 'REFUND'
  | 'FREEZE'
  | 'RELEASE'
  | 'RECOVERY'
  | 'REVERSAL'
  | 'REVERSE'
  | 'RESTORE'
  | 'DEBT_RECOVERY'
  | 'RECOVERY_RELEASE'
export type BenefitOrderStatus = 'CREATED' | 'RESERVED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
export type BenefitEntitlementStatus = 'ACTIVE' | 'CONSUMED' | 'REVOKED'
export type EntitlementUsageStatus = 'RESERVED' | 'CONFIRMED' | 'RELEASED'
export type ThankTargetType = 'POST' | 'COMMENT'
export type BountyRequestType = 'PUBLIC_CONTRIBUTION' | 'CURATION' | 'COLLABORATION'
export type BountyRiskCategory = 'LOW'
export type BountyStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED'
export type BountySubmissionStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED'
export type AppealStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED'
export type RoleApplicationStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED'
export type RoleGrantStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED'

export interface IncentiveAccount {
  id: ApiId
  userId: ApiId
  accountType: IncentiveAccountType
  domainCode?: string | null
  totalBalance: ApiLong
  availableBalance: ApiLong
  frozenBalance: ApiLong
  recoveryDebt?: ApiLong
  status: IncentiveAccountStatus
  version: ApiLong
  updateTime?: string | null
}

export interface LedgerEntry {
  id: ApiId
  accountId: ApiId
  userId: ApiId
  accountType: IncentiveAccountType
  domainCode?: string | null
  entryType: LedgerEntryType
  deltaTotal: ApiLong
  deltaAvailable: ApiLong
  deltaFrozen: ApiLong
  totalAfter: ApiLong
  availableAfter: ApiLong
  frozenAfter: ApiLong
  idempotencyKey?: string | null
  referenceType?: string | null
  referenceId?: string | null
  ruleCode?: string | null
  ruleVersion?: number | null
  batchId?: ApiId | null
  reversedEntryId?: ApiId | null
  reason?: string | null
  operatorUid?: ApiId | null
  createTime?: string | null
}

export interface Benefit {
  id: ApiId
  benefitCode: string
  name: string
  description?: string | null
  category: string
  deliveryType: string
  pointCost: ApiLong
  totalStock: number | null
  availableStock: number | null
  enabled: boolean
  updateTime?: string | null
}

export interface BenefitOrder {
  id: ApiId
  orderNo: string
  userId: ApiId
  benefitId: ApiId
  benefitCode: string
  benefitName: string
  quantity: number
  unitPointCost: ApiLong
  totalPointCost: ApiLong
  status: BenefitOrderStatus
  deliveryReference?: string | null
  actionReason?: string | null
  operatorUid?: ApiId | null
  createTime?: string | null
  updateTime?: string | null
}

export interface BenefitEntitlement {
  id: ApiId
  orderId: ApiId
  userId: ApiId
  benefitCode: string
  entitlementType: string
  entitlementKey: string
  quantityTotal: ApiLong
  quantityRemaining: ApiLong
  status: BenefitEntitlementStatus
  reversible: boolean
  payloadJson?: string | null
  grantedAt?: string | null
  revokedAt?: string | null
  updateTime?: string | null
}

export interface BenefitEntitlementUsage {
  usageId: ApiId
  entitlementId: ApiId
  uid: ApiId
  benefitCode: string
  consumerCode: string
  status: EntitlementUsageStatus
  amount: ApiLong
  idempotencyKey: string
  requestFingerprint: string
  failureCode?: string | null
  expiresAt?: string | null
  confirmedAt?: string | null
  releasedAt?: string | null
}

export interface ThankTicket {
  ticketDate: string
  grantedCount: number
  usedCount: number
  remainingCount: number
  purchasable: boolean
  transferable: boolean
  creditsReceiverBalance: boolean
}

export interface ThankRecord {
  id: ApiId
  senderUid: ApiId
  receiverUid: ApiId
  targetType: ThankTargetType
  targetId: string
  thankDate: string
  note?: string | null
  createTime?: string | null
  [key: string]: unknown
}

export interface ThankWorkspace {
  ticket: ThankTicket
  sent: PageResult<ThankRecord>
  received: PageResult<ThankRecord>
  receivedTotal: ApiLong
  receivedByTargetType: Record<string, ApiLong>
  receivedByDomain: Record<string, ApiLong>
}

export interface Bounty {
  id: ApiId
  title: string
  description: string
  domainCode: string
  requestType: BountyRequestType
  riskCategory: BountyRiskCategory
  quota: number
  awardedCount: number
  pointReward: ApiLong
  totalBudget: ApiLong
  budgetPeriod: string
  reservedBudget: ApiLong
  consumedBudget: ApiLong
  status: BountyStatus
  createdBy: ApiId
  createTime?: string | null
  updateTime?: string | null
}

export interface BountySubmission {
  id: ApiId
  bountyId: ApiId
  applicantUid: ApiId
  publicPostId: ApiId
  requestType: BountyRequestType
  riskCategory: BountyRiskCategory
  evidence: string
  status: BountySubmissionStatus
  reviewerUid?: ApiId | null
  reviewReason?: string | null
  rewardEntryId?: ApiId | null
  createTime?: string | null
  updateTime?: string | null
}

export interface BountyWorkspace {
  available: PageResult<Bounty>
  submissions: PageResult<BountySubmission>
}

export interface IncentiveAppeal {
  id: ApiId
  appellantUid: ApiId
  targetType: string
  targetId: ApiId
  relatedLedgerId?: ApiId | null
  relatedRecoveryDebtId?: ApiId | null
  status: AppealStatus
  appealReason: string
  reviewerUid?: ApiId | null
  reviewReason?: string | null
  restoreEntryId?: ApiId | null
  createTime?: string | null
  updateTime?: string | null
}

export interface BountyAppeal {
  id: ApiId
  submissionId: ApiId
  applicantUid: ApiId
  originalStatus: BountySubmissionStatus
  originalReviewerUid?: ApiId | null
  appealReason: string
  status: AppealStatus
  reviewerUid?: ApiId | null
  reviewReason?: string | null
  compensationEntryId?: ApiId | null
  createTime?: string | null
  updateTime?: string | null
}

export interface RoleDefinition {
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

export interface RoleEligibility {
  roleCode: string
  domainCode: string
  eligible: boolean
  accountAgeDays: number
  domainReputation: ApiLong
  activityCount: number
  violationCount: number
  curationAccuracyBps: number
  riskFrozen: boolean
  failedChecks: string[]
  manualApprovalRequired: boolean
  automaticallyGrantsAuthority: boolean
}

export interface RoleApplication {
  id: ApiId
  applicantUid: ApiId
  roleCode: string
  domainCode: string
  statement: string
  eligibilitySnapshotJson?: string | null
  status: RoleApplicationStatus
  reviewerUid?: ApiId | null
  reviewReason?: string | null
  createTime?: string | null
  updateTime?: string | null
}

export interface RoleGrant {
  id: ApiId
  userId: ApiId
  roleCode: string
  domainCode: string
  status: RoleGrantStatus
  grantedBy?: ApiId | null
  grantReason?: string | null
  actionBy?: ApiId | null
  actionReason?: string | null
  grantedAt?: string | null
  expiresAt?: string | null
  updateTime?: string | null
}

export interface RoleWorkspace {
  definitions: RoleDefinition[]
  applications: PageResult<RoleApplication>
  grants: PageResult<RoleGrant>
}

export interface ReconciliationRun {
  runId: ApiId
  status: string
  scannedCount: number
  mismatchCount: number
  totalAbsoluteDifference: ApiLong
  cycleNo?: ApiLong | null
  cursorStartAccountId?: ApiId | null
  cursorEndAccountId?: ApiId | null
  nextCursorAccountId?: ApiId | null
  coverageComplete?: boolean | null
  operatorUid: ApiId
  reason: string
  createTime?: string
  finishTime?: string | null
}

export interface RewardInboxRecord {
  id: ApiId
  stableKey: string
  eventType: string
  recipientUid: ApiId
  domainCode?: string | null
  eventDomainCode?: string | null
  sourceReferenceType?: string | null
  sourceReferenceId?: string | null
  parentReferenceType?: string | null
  parentReferenceId?: string | null
  ruleCode: string
  ruleVersion: number
  payloadJson?: string | null
  receivedBy: ApiId
  receiveReason: string
  inboxStatus: string
  batchId?: ApiId | null
  attemptCount: number
  processedEntryId?: ApiId | null
  errorMessage?: string | null
  createTime?: string | null
  updateTime?: string | null
  processedTime?: string | null
}

export interface RewardRuleRecord {
  id: ApiId
  ruleCode: string
  ruleVersion: number
  accountType: IncentiveAccountType
  domainCode?: string | null
  rewardAmount: ApiLong
  dailyUserCap?: ApiLong
  lifetimeUserCap?: ApiLong
  enabled: number | boolean
  validFrom?: string | null
  validUntil?: string | null
  createdBy: ApiId
  changeReason: string
  createTime?: string | null
}

export interface RewardBatchRecord {
  id: ApiId
  batchKey: string
  ruleCode: string
  ruleVersion: number
  batchStatus: string
  requestedCount: number
  appliedCount: number
  rejectedCount: number
  failedCount: number
  createdBy: ApiId
  actionReason: string
  createTime?: string
  finishTime?: string | null
}

export interface ThankCommand {
  receiverUid: ApiId
  targetType: ThankTargetType
  targetId: string
  note?: string
}

export interface BountySubmissionCommand {
  publicPostId: ApiId
  requestType: BountyRequestType
  riskCategory: BountyRiskCategory
  evidence: string
}

export interface RoleApplicationCommand {
  roleCode: string
  domainCode: string
  statement: string
}

export interface BenefitOrderCommand {
  benefitId: ApiId
  quantity?: number
  idempotencyKey: string
}

export interface OrderActionCommand {
  reason: string
  deliveryReference?: string
}

export interface RewardInboxCommand {
  stableKey: string
  eventType: string
  recipientUid: ApiId
  domainCode?: string
  eventDomainCode?: string
  sourceReferenceType?: string
  sourceReferenceId?: string
  parentReferenceType?: string
  parentReferenceId?: string
  ruleCode: string
  ruleVersion: number
  payloadJson?: string
  reason: string
}

export interface RewardRuleCommand {
  ruleCode: string
  ruleVersion: number
  accountType: IncentiveAccountType
  domainCode?: string
  amount: number
  dailyUserCap?: number
  lifetimeUserCap?: number
  enabled?: boolean
  validFrom?: string
  validUntil?: string
  reason: string
}

export interface RewardBatchCommand {
  batchKey: string
  ruleCode: string
  ruleVersion: number
  reason: string
  limit?: number
}

export interface FreezeCommand {
  accountType: IncentiveAccountType
  domainCode?: string
  amount: number
  blockSpending?: boolean
  idempotencyKey: string
  reason: string
}

export interface ReversalCommand {
  idempotencyKey: string
  reason: string
}

export interface TrustedRewardInvalidationCommand {
  referenceType: string
  referenceId: string
  reason: string
  cursor?: ApiId
  limit?: number
}

export interface TrustedRewardInvalidationResult {
  referenceType: string
  referenceId: string
  cursor?: ApiId | null
  nextCursor?: ApiId | null
  coverageComplete: boolean
  processedCount: number
  reversals: LedgerEntry[]
}

export interface BenefitCatalogCommand {
  benefitCode: string
  name: string
  description?: string
  category: string
  deliveryType: string
  pointCost: number
  totalStock?: number | null
  enabled?: boolean
  reason: string
}

export interface BountyCommand {
  title: string
  description: string
  domainCode: string
  requestType: BountyRequestType
  riskCategory: BountyRiskCategory
  quota: number
  pointReward: number
  reason: string
}

export interface IncentiveAppealCommand {
  targetType: string
  targetId: ApiId
  reason: string
}

export interface AppealReviewCommand {
  approved: boolean
  reason: string
}

export interface BountyAppealCommand {
  reason: string
}

export interface RiskScanCommand {
  scanType: string
  limit?: number
  reason: string
}

export interface RiskFinding {
  id: ApiId
  findingType: string
  subjectType: string
  subjectId: string
  domainCode?: string | null
  severity: string
  evaluationStatus: string
  findingStatus: string
  metricValue: ApiLong
  thresholdValue: ApiLong
  evidenceJson?: string | null
  scanRunId: ApiId
  resolvedBy?: ApiId | null
  resolutionReason?: string | null
  createTime?: string | null
  updateTime?: string | null
}

export interface RiskScanResult {
  runId: ApiId
  scanType: string
  cycleNo: ApiLong
  cursorStart?: ApiId | null
  cursorEnd?: ApiId | null
  nextCursor?: ApiId | null
  coverageComplete: boolean
  scannedCount: number
  findingCount: number
}

export interface RiskFindingActionCommand {
  reason: string
}

export interface BountyStatusCommand {
  status: BountyStatus
  reason: string
}

export interface ReviewCommand {
  approved: boolean
  reason: string
  expiresAt?: string
}

export interface RoleDefinitionCommand {
  roleCode: string
  roleName: string
  description?: string
  domainCode: string
  minAccountAgeDays?: number
  minDomainReputation?: number
  minActivityCount?: number
  maxViolationCount?: number
  minCurationAccuracyBps?: number
  requiresNoRiskFreeze?: boolean
  enabled?: boolean
  reason: string
}

export interface RoleMetricCommand {
  domainCode: string
  curationCorrectCount?: number
  curationReviewedCount?: number
  reason: string
}

export interface RoleActionCommand {
  reason: string
  expiresAt?: string
}

export interface AdminListQuery extends PageQuery {
  status?: string
}

const meBase = '/api/v1/incentives/me'
const benefitBase = '/api/v1/benefits'
const adminBase = '/api/v1/incentives/admin'
const pathId = (value: ApiId) => encodeURIComponent(String(value))
const remoteResult = async <T>(request: Promise<unknown>): Promise<Result<T>> => (
  withRemoteResultProvenance(await request as Result<T>)
)

export const incentiveApi = {
  getMySummary: (): Promise<Result<IncentiveAccount[]>> =>
    remoteResult(client.get(`${meBase}/summary`)),

  getMyLedger: (params: PageQuery = {}): Promise<Result<PageResult<LedgerEntry>>> =>
    remoteResult(client.get(`${meBase}/ledger`, { params })),

  getMyOrders: (params: PageQuery = {}): Promise<Result<PageResult<BenefitOrder>>> =>
    client.get(`${meBase}/orders`, { params }),

  getMyEntitlements: (params: PageQuery = {}): Promise<Result<PageResult<BenefitEntitlement>>> =>
    remoteResult(client.get(`${meBase}/entitlements`, { params })),

  getMyEntitlementUsages: (params: PageQuery = {}): Promise<Result<PageResult<BenefitEntitlementUsage>>> =>
    remoteResult(client.get(`${meBase}/entitlement-usages`, { params })),

  getMyAppeals: (params: PageQuery = {}): Promise<Result<PageResult<IncentiveAppeal>>> =>
    client.get(`${meBase}/appeals`, { params }),

  submitAppeal: (command: IncentiveAppealCommand): Promise<Result<IncentiveAppeal>> =>
    client.post(`${meBase}/appeals`, command),

  getMyThanks: (params: PageQuery = {}): Promise<Result<ThankWorkspace>> =>
    remoteResult(client.get(`${meBase}/thanks`, { params })),

  sendThank: (command: ThankCommand): Promise<Result<ThankTicket>> =>
    client.post(`${meBase}/thanks`, command),

  getMyBounties: (params: PageQuery = {}): Promise<Result<BountyWorkspace>> =>
    remoteResult(client.get(`${meBase}/bounties`, { params })),

  submitBounty: (
    bountyId: ApiId,
    command: BountySubmissionCommand,
  ): Promise<Result<BountySubmission>> =>
    client.post(`${meBase}/bounties/${pathId(bountyId)}/submissions`, command),

  getMyBountyAppeals: (params: PageQuery = {}): Promise<Result<PageResult<BountyAppeal>>> =>
    client.get(`${meBase}/bounties/appeals`, { params }),

  submitBountyAppeal: (
    submissionId: ApiId,
    command: BountyAppealCommand,
  ): Promise<Result<BountyAppeal>> =>
    client.post(`${meBase}/bounties/submissions/${pathId(submissionId)}/appeals`, command),

  getMyRoles: (params: PageQuery = {}): Promise<Result<RoleWorkspace>> =>
    remoteResult(client.get(`${meBase}/roles`, { params })),

  getRoleEligibility: (
    roleCode: string,
    domainCode: string,
  ): Promise<Result<RoleEligibility>> =>
    client.get(`${meBase}/roles/eligibility`, { params: { roleCode, domainCode } }),

  applyRole: (command: RoleApplicationCommand): Promise<Result<RoleApplication>> =>
    client.post(`${meBase}/roles/applications`, command),

  getBenefitCatalog: (params: PageQuery = {}): Promise<Result<PageResult<Benefit>>> =>
    client.get(`${benefitBase}/catalog`, { params }),

  placeBenefitOrder: (command: BenefitOrderCommand): Promise<Result<BenefitOrder>> =>
    client.post(`${benefitBase}/orders`, command),

  getBenefitOrderStatus: (idempotencyKey: string): Promise<Result<BenefitOrder>> =>
    client.get(`${benefitBase}/orders/status`, { params: { idempotencyKey } }),

  cancelBenefitOrder: (
    orderId: ApiId,
    command: OrderActionCommand,
  ): Promise<Result<BenefitOrder>> =>
    client.post(`${benefitBase}/orders/${pathId(orderId)}/cancel`, command),
}

export const incentiveAdminApi = {
  receiveReward: (command: RewardInboxCommand): Promise<Result<RewardInboxRecord>> =>
    client.post(`${adminBase}/rewards/inbox`, command),

  createRewardRule: (command: RewardRuleCommand): Promise<Result<RewardRuleRecord>> =>
    client.post(`${adminBase}/rewards/rules`, command),

  processRewardBatch: (command: RewardBatchCommand): Promise<Result<RewardBatchRecord>> =>
    client.post(`${adminBase}/rewards/batches`, command),

  freezeAccount: (
    userId: ApiId,
    command: FreezeCommand,
  ): Promise<Result<LedgerEntry>> =>
    client.post(`${adminBase}/accounts/${pathId(userId)}/freeze`, command),

  releaseFreeze: (
    freezeId: ApiId,
    command: ReversalCommand,
  ): Promise<Result<LedgerEntry>> =>
    client.post(`${adminBase}/freezes/${pathId(freezeId)}/release`, command),

  reverseLedger: (
    ledgerId: ApiId,
    command: ReversalCommand,
  ): Promise<Result<LedgerEntry>> =>
    client.post(`${adminBase}/ledger/${pathId(ledgerId)}/reverse`, command),

  invalidateTrustedReward: (
    command: TrustedRewardInvalidationCommand,
  ): Promise<Result<TrustedRewardInvalidationResult>> =>
    client.post(`${adminBase}/rewards/invalidate`, command),

  runReconciliation: (
    limit: number,
    reason: string,
  ): Promise<Result<ReconciliationRun>> =>
    client.post(`${adminBase}/reconciliation`, undefined, { params: { limit, reason } }),

  listReconciliationRuns: (limit = 20): Promise<Result<ReconciliationRun[]>> =>
    client.get(`${adminBase}/reconciliation`, { params: { limit } }),

  listAppeals: (params: AdminListQuery = {}): Promise<Result<PageResult<IncentiveAppeal>>> =>
    client.get(`${adminBase}/appeals`, { params }),

  reviewAppeal: (
    appealId: ApiId,
    command: AppealReviewCommand,
  ): Promise<Result<IncentiveAppeal>> =>
    client.post(`${adminBase}/appeals/${pathId(appealId)}/review`, command),

  scanRisk: (command: RiskScanCommand): Promise<Result<RiskScanResult>> =>
    client.post(`${adminBase}/risk/scans`, command),

  listRiskFindings: (params: AdminListQuery = {}): Promise<Result<PageResult<RiskFinding>>> =>
    client.get(`${adminBase}/risk/findings`, { params }),

  resolveRiskFinding: (
    findingId: ApiId,
    command: RiskFindingActionCommand,
  ): Promise<Result<RiskFinding>> =>
    client.post(`${adminBase}/risk/findings/${pathId(findingId)}/resolve`, command),

  ignoreRiskFinding: (
    findingId: ApiId,
    command: RiskFindingActionCommand,
  ): Promise<Result<RiskFinding>> =>
    client.post(`${adminBase}/risk/findings/${pathId(findingId)}/ignore`, command),

  listBenefitCatalog: (params: PageQuery = {}): Promise<Result<PageResult<Benefit>>> =>
    client.get(`${adminBase}/benefits/catalog`, { params }),

  upsertBenefitCatalog: (command: BenefitCatalogCommand): Promise<Result<Benefit>> =>
    client.post(`${adminBase}/benefits/catalog`, command),

  listBenefitOrders: (params: AdminListQuery = {}): Promise<Result<PageResult<BenefitOrder>>> =>
    client.get(`${adminBase}/benefits/orders`, { params }),

  deliverBenefitOrder: (
    orderId: ApiId,
    command: OrderActionCommand,
  ): Promise<Result<BenefitOrder>> =>
    client.post(`${adminBase}/benefits/orders/${pathId(orderId)}/deliver`, command),

  cancelBenefitOrder: (
    orderId: ApiId,
    command: OrderActionCommand,
  ): Promise<Result<BenefitOrder>> =>
    client.post(`${adminBase}/benefits/orders/${pathId(orderId)}/cancel`, command),

  refundBenefitOrder: (
    orderId: ApiId,
    command: OrderActionCommand,
  ): Promise<Result<BenefitOrder>> =>
    client.post(`${adminBase}/benefits/orders/${pathId(orderId)}/refund`, command),

  createBounty: (command: BountyCommand): Promise<Result<Bounty>> =>
    client.post(`${adminBase}/bounties`, command),

  updateBountyStatus: (
    bountyId: ApiId,
    command: BountyStatusCommand,
  ): Promise<Result<Bounty>> =>
    client.post(`${adminBase}/bounties/${pathId(bountyId)}/status`, command),

  listBountySubmissions: (
    params: AdminListQuery = {},
  ): Promise<Result<PageResult<BountySubmission>>> =>
    client.get(`${adminBase}/bounties/submissions`, { params }),

  reviewBountySubmission: (
    submissionId: ApiId,
    command: ReviewCommand,
  ): Promise<Result<BountySubmission>> =>
    client.post(`${adminBase}/bounties/submissions/${pathId(submissionId)}/review`, command),

  listBountyAppeals: (params: AdminListQuery = {}): Promise<Result<PageResult<BountyAppeal>>> =>
    client.get(`${adminBase}/bounties/appeals`, { params }),

  reviewBountyAppeal: (
    appealId: ApiId,
    command: ReviewCommand,
  ): Promise<Result<BountyAppeal>> =>
    client.post(`${adminBase}/bounties/appeals/${pathId(appealId)}/review`, command),

  upsertRoleDefinition: (
    command: RoleDefinitionCommand,
  ): Promise<Result<RoleDefinition>> =>
    client.post(`${adminBase}/roles/definitions`, command),

  updateRoleMetric: (
    userId: ApiId,
    command: RoleMetricCommand,
  ): Promise<Result<void>> =>
    client.post(`${adminBase}/roles/metrics/${pathId(userId)}`, command),

  listRoleApplications: (
    params: AdminListQuery = {},
  ): Promise<Result<PageResult<RoleApplication>>> =>
    client.get(`${adminBase}/roles/applications`, { params }),

  reviewRoleApplication: (
    applicationId: ApiId,
    command: ReviewCommand,
  ): Promise<Result<RoleApplication>> =>
    client.post(`${adminBase}/roles/applications/${pathId(applicationId)}/review`, command),

  listRoleGrants: (params: AdminListQuery = {}): Promise<Result<PageResult<RoleGrant>>> =>
    client.get(`${adminBase}/roles/grants`, { params }),

  suspendRoleGrant: (
    grantId: ApiId,
    command: RoleActionCommand,
  ): Promise<Result<RoleGrant>> =>
    client.post(`${adminBase}/roles/grants/${pathId(grantId)}/suspend`, command),

  revokeRoleGrant: (
    grantId: ApiId,
    command: RoleActionCommand,
  ): Promise<Result<RoleGrant>> =>
    client.post(`${adminBase}/roles/grants/${pathId(grantId)}/revoke`, command),

  expireRoleGrant: (
    grantId: ApiId,
    command: RoleActionCommand,
  ): Promise<Result<RoleGrant>> =>
    client.post(`${adminBase}/roles/grants/${pathId(grantId)}/expire`, command),

  expireDueRoleGrants: (limit: number, reason: string): Promise<Result<number>> =>
    client.post(`${adminBase}/roles/grants/expire-due`, undefined, { params: { limit, reason } }),
}
