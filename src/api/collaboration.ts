import client, { type Result } from './client'
import type { ApiId, ApiLong } from './types'

const BASE_PATH = '/api/v1/collaboration'

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

export interface CollaborationListQuery {
  domain?: number
  status?: string
  cursor?: string | number
  size?: number
}

export type NeedStatus = 'OPEN' | 'CLAIMED' | 'COMPLETED' | 'CLOSED' | 'MERGED'
export type NeedSourceType = 'COMMUNITY' | 'POST' | 'TOPIC' | 'ACTIVITY' | 'EXTERNAL'
export type NeedContentFormat = 'ARTICLE' | 'QUESTION' | 'GUIDE' | 'CHECKLIST' | 'RESOURCE'
export type NeedResolutionType = 'POST' | 'QUESTION' | 'SERIES'

export interface CollaborationNeed {
  id: ApiId
  creatorUid: ApiId
  domain: number
  sourceType: NeedSourceType
  sourceRefId?: ApiId | null
  contentFormat: NeedContentFormat
  title: string
  description: string
  acceptanceCriteria?: string | null
  status: NeedStatus
  claimedByUid?: ApiId | null
  mergedIntoNeedId?: ApiId | null
  resolutionType?: NeedResolutionType | null
  resolutionId?: ApiId | null
  resolutionPostId?: ApiId | null
  closedReason?: string | null
  followerCount: number
  followed: boolean
  canManage: boolean
  createTime: string
  updateTime: string
}

export interface NeedCreateCmd {
  domain: number
  sourceType: NeedSourceType
  sourceRefId?: ApiId
  contentFormat: NeedContentFormat
  title: string
  description: string
  acceptanceCriteria?: string
  riskAcknowledged?: boolean
}

export interface NeedClaimCmd {
  riskAcknowledged?: boolean
}

export interface NeedMergeCmd {
  targetNeedId: ApiId
  note?: string
}

export interface NeedCompleteCmd {
  resolutionType: NeedResolutionType
  resolutionId: ApiId
  /** Compatibility field accepted by the backend for POST deliveries. */
  resolutionPostId?: ApiId
  note?: string
}

export interface CloseCmd {
  note?: string
}

export type CollaborationSeriesStatus = 'OPEN' | 'CLOSED'
export type SeriesMemberRole = 'OWNER' | 'EDITOR' | 'CONTRIBUTOR'
export type SeriesMemberStatus = 'ACTIVE' | 'EXITED' | 'REVOKED'

export interface CollaborationSeries {
  id: ApiId
  ownerUid: ApiId
  domain: number
  title: string
  description: string
  submissionInstructions?: string | null
  status: CollaborationSeriesStatus
  memberCount: number
  postCount: number
  currentUserRole?: SeriesMemberRole | null
  canManage: boolean
  createTime: string
  updateTime: string
}

export interface SeriesCreateCmd {
  domain: number
  title: string
  description: string
  submissionInstructions?: string
  riskAcknowledged?: boolean
}

export interface SeriesMemberCmd {
  uid: ApiId
  role: Exclude<SeriesMemberRole, 'OWNER'>
}

export interface SeriesMember {
  id: ApiId
  uid: ApiId
  role: SeriesMemberRole
  status: SeriesMemberStatus
  addedBy: ApiId
  exitedAt?: string | null
  revokedAt?: string | null
  revokedBy?: ApiId | null
  createTime: string
}

export type SubmissionReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface CollaborationSubmission {
  id: ApiId
  parentId: ApiId
  postId: ApiId
  submitterUid: ApiId
  note?: string | null
  reviewStatus: SubmissionReviewStatus
  reviewerUid?: ApiId | null
  reviewNote?: string | null
  reviewedAt?: string | null
  createTime: string
  updateTime: string
}

export interface PostSubmissionCmd {
  postId: ApiId
  note?: string
  riskAcknowledged?: boolean
}

export type ReviewDecision = 'APPROVED' | 'REJECTED'

export interface ReviewCmd {
  decision: ReviewDecision
  note?: string
}

export type CollaborationActivityStatus = 'DRAFT' | 'OPEN' | 'REVIEWING' | 'SUMMARIZED' | 'ARCHIVED'
export type CollaborationActivityType = 'OPEN_CALL' | 'SPRINT' | 'CHALLENGE' | 'RESEARCH' | 'CURATION'

export interface CollaborationActivity {
  id: ApiId
  ownerUid: ApiId
  domain: number
  activityType: CollaborationActivityType
  title: string
  description: string
  submissionRule?: string | null
  status: CollaborationActivityStatus
  resultSummary?: string | null
  startsAt?: string | null
  endsAt?: string | null
  submissionCount: number
  canManage: boolean
  createTime: string
  updateTime: string
}

export interface ActivityCreateCmd {
  domain: number
  activityType: CollaborationActivityType
  title: string
  description: string
  submissionRule?: string
  startsAt?: string
  endsAt?: string
  riskAcknowledged?: boolean
}

export interface ActivityStatusCmd {
  status: Extract<CollaborationActivityStatus, 'OPEN' | 'REVIEWING' | 'ARCHIVED'>
  note?: string
}

export interface ActivitySummaryCmd {
  resultSummary: string
}

export type CurationSuggestionType = 'CONTENT' | 'TOPIC' | 'RESOURCE' | 'FRESHNESS' | 'QUESTION'

export interface CurationSuggestion {
  id: ApiId
  topicId: ApiId
  topicName?: string | null
  postId: ApiId
  submitterUid: ApiId
  domain: number
  suggestionType: CurationSuggestionType
  rationale: string
  reviewStatus: SubmissionReviewStatus
  reviewerUid?: ApiId | null
  reviewNote?: string | null
  reviewedAt?: string | null
  resultType?: string | null
  resultId?: ApiId | null
  resultStatus?: string | null
  createTime: string
  updateTime: string
}

export interface CurationSuggestionCreateCmd {
  topicId: ApiId
  postId: ApiId
  suggestionType: CurationSuggestionType
  rationale: string
  riskAcknowledged?: boolean
}

export interface CurationReviewQuery extends CollaborationListQuery {
  domain?: number
}

export type OfficeHourStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED'
export type OfficeHourReservationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
export type OfficeHourReservationDecision = 'ACCEPTED' | 'REJECTED'

export interface OfficeHour {
  id: ApiId
  hostUid: ApiId
  domain: number
  title: string
  description: string
  topicGuidance?: string | null
  startsAt: string
  endsAt: string
  capacity: number
  reservedCount: number
  availableCount: number
  status: OfficeHourStatus
  canManage: boolean
  createTime: string
  updateTime: string
}

export interface OfficeHourCreateCmd {
  domain: number
  title: string
  description: string
  topicGuidance?: string
  startsAt: string
  endsAt: string
  capacity: number
  riskAcknowledged?: boolean
}

export interface OfficeHourStatusCmd {
  status: Extract<OfficeHourStatus, 'OPEN' | 'CLOSED' | 'CANCELLED'>
  note?: string
}

export interface OfficeHourReservation {
  id: ApiId
  officeHourId: ApiId
  hostUid: ApiId
  attendeeUid: ApiId
  topic: string
  contextDetail?: string | null
  status: OfficeHourReservationStatus
  responseNote?: string | null
  decidedBy?: ApiId | null
  decidedAt?: string | null
  hostConfirmedAt?: string | null
  attendeeConfirmedAt?: string | null
  completedAt?: string | null
  cancelledBy?: ApiId | null
  cancelledAt?: string | null
  canManage: boolean
  createTime: string
  updateTime: string
}

export interface OfficeHourReservationCreateCmd {
  topic: string
  contextDetail?: string
  riskAcknowledged?: boolean
}

export interface OfficeHourReservationDecisionCmd {
  decision: OfficeHourReservationDecision
  note?: string
}

export interface OfficeHourFeedback {
  id: ApiId
  reservationId: ApiId
  officeHourId: ApiId
  authorUid: ApiId
  targetUid: ApiId
  rating: number
  feedback?: string | null
  createTime: string
  updateTime: string
}

export interface OfficeHourFeedbackCreateCmd {
  rating: number
  feedback?: string
}

export type StructuredDiscussionStatus = 'OPEN' | 'SUMMARIZED' | 'CLOSED'
export type DiscussionConsensusState = 'REACHED' | 'PARTIAL' | 'NOT_REACHED'

export interface DiscussionOption {
  id: ApiId
  text: string
  sortOrder: number
  voteCount: number
  selected: boolean
}

export interface StructuredDiscussion {
  id: ApiId
  creatorUid: ApiId
  sourcePostId: ApiId
  domain: number
  title: string
  prompt: string
  status: StructuredDiscussionStatus
  summary?: string | null
  consensusState?: DiscussionConsensusState | null
  authorFollowUp?: string | null
  followedUpBy?: ApiId | null
  followedUpAt?: string | null
  summarizedBy?: ApiId | null
  summarizedAt?: string | null
  voteCount: number
  selectedOptionId?: ApiId | null
  canManage: boolean
  options: DiscussionOption[]
  createTime: string
  updateTime: string
}

export interface DiscussionListQuery extends CollaborationListQuery {
  postId?: ApiId
}

export interface DiscussionCreateCmd {
  sourcePostId: ApiId
  title: string
  prompt: string
  options: string[]
  riskAcknowledged?: boolean
}

export interface VoteCmd {
  optionId: ApiId
  riskAcknowledged?: boolean
}

export interface DiscussionSummaryCmd {
  summary: string
  consensusState: DiscussionConsensusState
  authorFollowUp?: string
  closeAfterSummary?: boolean
}

export type GovernanceCaseType = 'REPORT' | 'APPEAL'
export type GovernanceTargetType =
  | 'NEED'
  | 'SERIES'
  | 'ACTIVITY'
  | 'CURATION'
  | 'DISCUSSION'
  | 'OFFICE_HOUR'
  | 'RESERVATION'
  | 'FEEDBACK'
export type GovernanceReasonCode = 'ABUSE' | 'SPAM' | 'MISLEADING' | 'COPYRIGHT' | 'PRIVACY' | 'CONFLICT' | 'OTHER'
export type GovernanceCaseStatus = 'PENDING' | 'UPHELD' | 'REJECTED' | 'CLOSED'
export type GovernanceDecision = Exclude<GovernanceCaseStatus, 'PENDING'>

export interface GovernanceCase {
  id: ApiId
  caseType: GovernanceCaseType
  targetType: GovernanceTargetType
  targetId: ApiId
  submitterUid: ApiId
  parentCaseId?: ApiId | null
  reasonCode: GovernanceReasonCode
  detail: string
  status: GovernanceCaseStatus
  reviewerUid?: ApiId | null
  reviewNote?: string | null
  reviewedAt?: string | null
  createTime: string
  updateTime: string
}

export interface GovernanceCaseCreateCmd {
  caseType: GovernanceCaseType
  targetType: GovernanceTargetType
  targetId: ApiId
  parentCaseId?: ApiId
  reasonCode: GovernanceReasonCode
  detail: string
}

export interface GovernanceReviewCmd {
  decision: GovernanceDecision
  note?: string
}

const requestResult = <T>(request: Promise<unknown>) => request as Promise<Result<T>>
const resourceId = (id: ApiId) => encodeURIComponent(String(id))

export const collaborationApi = {
  needs: {
    list: (query: CollaborationListQuery = {}) =>
      requestResult<PageResult<CollaborationNeed>>(client.get(`${BASE_PATH}/needs`, { params: query })),
    detail: (needId: ApiId) =>
      requestResult<CollaborationNeed>(client.get(`${BASE_PATH}/needs/${resourceId(needId)}`)),
    create: (cmd: NeedCreateCmd) =>
      requestResult<CollaborationNeed>(client.post(`${BASE_PATH}/needs`, cmd)),
    follow: (needId: ApiId) =>
      requestResult<CollaborationNeed>(client.post(`${BASE_PATH}/needs/${resourceId(needId)}/follow`)),
    unfollow: (needId: ApiId) =>
      requestResult<CollaborationNeed>(client.delete(`${BASE_PATH}/needs/${resourceId(needId)}/follow`)),
    claim: (needId: ApiId, cmd: NeedClaimCmd = {}) =>
      requestResult<CollaborationNeed>(client.post(`${BASE_PATH}/needs/${resourceId(needId)}/claim`, cmd)),
    merge: (needId: ApiId, cmd: NeedMergeCmd) =>
      requestResult<CollaborationNeed>(client.post(`${BASE_PATH}/needs/${resourceId(needId)}/merge`, cmd)),
    fulfill: (needId: ApiId, cmd: NeedCompleteCmd) =>
      requestResult<CollaborationNeed>(client.post(`${BASE_PATH}/needs/${resourceId(needId)}/fulfill`, cmd)),
    close: (needId: ApiId, cmd: CloseCmd) =>
      requestResult<CollaborationNeed>(client.post(`${BASE_PATH}/needs/${resourceId(needId)}/close`, cmd)),
  },

  series: {
    list: (query: CollaborationListQuery = {}) =>
      requestResult<PageResult<CollaborationSeries>>(client.get(`${BASE_PATH}/series`, { params: query })),
    detail: (seriesId: ApiId) =>
      requestResult<CollaborationSeries>(client.get(`${BASE_PATH}/series/${resourceId(seriesId)}`)),
    create: (cmd: SeriesCreateCmd) =>
      requestResult<CollaborationSeries>(client.post(`${BASE_PATH}/series`, cmd)),
    close: (seriesId: ApiId) =>
      requestResult<CollaborationSeries>(client.post(`${BASE_PATH}/series/${resourceId(seriesId)}/close`)),
    members: {
      list: (seriesId: ApiId, query: Pick<CollaborationListQuery, 'cursor' | 'size'> = {}) =>
        requestResult<PageResult<SeriesMember>>(
          client.get(`${BASE_PATH}/series/${resourceId(seriesId)}/members`, { params: query }),
        ),
      add: (seriesId: ApiId, cmd: SeriesMemberCmd) =>
        requestResult<CollaborationSeries>(
          client.post(`${BASE_PATH}/series/${resourceId(seriesId)}/members`, cmd),
        ),
      remove: (seriesId: ApiId, memberUid: ApiId) =>
        requestResult<CollaborationSeries>(
          client.delete(`${BASE_PATH}/series/${resourceId(seriesId)}/members/${resourceId(memberUid)}`),
        ),
      exit: (seriesId: ApiId) =>
        requestResult<CollaborationSeries>(
          client.delete(`${BASE_PATH}/series/${resourceId(seriesId)}/members/me`),
        ),
    },
    submissions: {
      list: (seriesId: ApiId, query: CollaborationListQuery = {}) =>
        requestResult<PageResult<CollaborationSubmission>>(
          client.get(`${BASE_PATH}/series/${resourceId(seriesId)}/submissions`, { params: query }),
        ),
      create: (seriesId: ApiId, cmd: PostSubmissionCmd) =>
        requestResult<CollaborationSubmission>(
          client.post(`${BASE_PATH}/series/${resourceId(seriesId)}/submissions`, cmd),
        ),
      decide: (seriesId: ApiId, submissionId: ApiId, cmd: ReviewCmd) =>
        requestResult<CollaborationSubmission>(
          client.post(
            `${BASE_PATH}/series/${resourceId(seriesId)}/submissions/${resourceId(submissionId)}/decide`,
            cmd,
          ),
        ),
    },
  },

  activities: {
    list: (query: CollaborationListQuery = {}) =>
      requestResult<PageResult<CollaborationActivity>>(client.get(`${BASE_PATH}/activities`, { params: query })),
    detail: (activityId: ApiId) =>
      requestResult<CollaborationActivity>(client.get(`${BASE_PATH}/activities/${resourceId(activityId)}`)),
    create: (cmd: ActivityCreateCmd) =>
      requestResult<CollaborationActivity>(client.post(`${BASE_PATH}/activities`, cmd)),
    updateStatus: (activityId: ApiId, cmd: ActivityStatusCmd) =>
      requestResult<CollaborationActivity>(
        client.put(`${BASE_PATH}/activities/${resourceId(activityId)}/status`, cmd),
      ),
    updateSummary: (activityId: ApiId, cmd: ActivitySummaryCmd) =>
      requestResult<CollaborationActivity>(
        client.put(`${BASE_PATH}/activities/${resourceId(activityId)}/summary`, cmd),
      ),
    submissions: {
      list: (activityId: ApiId, query: CollaborationListQuery = {}) =>
        requestResult<PageResult<CollaborationSubmission>>(
          client.get(`${BASE_PATH}/activities/${resourceId(activityId)}/submissions`, { params: query }),
        ),
      create: (activityId: ApiId, cmd: PostSubmissionCmd) =>
        requestResult<CollaborationSubmission>(
          client.post(`${BASE_PATH}/activities/${resourceId(activityId)}/submissions`, cmd),
        ),
      decide: (activityId: ApiId, submissionId: ApiId, cmd: ReviewCmd) =>
        requestResult<CollaborationSubmission>(
          client.post(
            `${BASE_PATH}/activities/${resourceId(activityId)}/submissions/${resourceId(submissionId)}/decide`,
            cmd,
          ),
        ),
    },
  },

  curation: {
    create: (cmd: CurationSuggestionCreateCmd) =>
      requestResult<CurationSuggestion>(client.post(`${BASE_PATH}/curation`, cmd)),
    mine: (query: CollaborationListQuery = {}) =>
      requestResult<PageResult<CurationSuggestion>>(
        client.get(`${BASE_PATH}/curation/mine`, { params: query }),
      ),
    reviewQueue: (query: CurationReviewQuery = {}) =>
      requestResult<PageResult<CurationSuggestion>>(
        client.get(`${BASE_PATH}/curation/review-queue`, { params: query }),
      ),
    decide: (suggestionId: ApiId, cmd: ReviewCmd) =>
      requestResult<CurationSuggestion>(
        client.post(`${BASE_PATH}/curation/${resourceId(suggestionId)}/decide`, cmd),
      ),
  },

  officeHours: {
    list: (query: CollaborationListQuery = {}) =>
      requestResult<PageResult<OfficeHour>>(client.get(`${BASE_PATH}/office-hours`, { params: query })),
    detail: (officeHourId: ApiId) =>
      requestResult<OfficeHour>(client.get(`${BASE_PATH}/office-hours/${resourceId(officeHourId)}`)),
    create: (cmd: OfficeHourCreateCmd) =>
      requestResult<OfficeHour>(client.post(`${BASE_PATH}/office-hours`, cmd)),
    updateStatus: (officeHourId: ApiId, cmd: OfficeHourStatusCmd) =>
      requestResult<OfficeHour>(
        client.put(`${BASE_PATH}/office-hours/${resourceId(officeHourId)}/status`, cmd),
      ),
    reservations: {
      create: (officeHourId: ApiId, cmd: OfficeHourReservationCreateCmd) =>
        requestResult<OfficeHourReservation>(
          client.post(`${BASE_PATH}/office-hours/${resourceId(officeHourId)}/reservations`, cmd),
        ),
      list: (
        officeHourId: ApiId,
        query: Pick<CollaborationListQuery, 'status' | 'cursor' | 'size'> = {},
      ) =>
        requestResult<PageResult<OfficeHourReservation>>(
          client.get(`${BASE_PATH}/office-hours/${resourceId(officeHourId)}/reservations`, {
            params: query,
          }),
        ),
      mine: (query: Pick<CollaborationListQuery, 'status' | 'cursor' | 'size'> = {}) =>
        requestResult<PageResult<OfficeHourReservation>>(
          client.get(`${BASE_PATH}/office-hour-reservations/mine`, { params: query }),
        ),
      decide: (
        officeHourId: ApiId,
        reservationId: ApiId,
        cmd: OfficeHourReservationDecisionCmd,
      ) =>
        requestResult<OfficeHourReservation>(
          client.post(
            `${BASE_PATH}/office-hours/${resourceId(officeHourId)}/reservations/${resourceId(reservationId)}/decide`,
            cmd,
          ),
        ),
      cancel: (officeHourId: ApiId, reservationId: ApiId) =>
        requestResult<OfficeHourReservation>(
          client.post(
            `${BASE_PATH}/office-hours/${resourceId(officeHourId)}/reservations/${resourceId(reservationId)}/cancel`,
          ),
        ),
      confirmComplete: (officeHourId: ApiId, reservationId: ApiId) =>
        requestResult<OfficeHourReservation>(
          client.post(
            `${BASE_PATH}/office-hours/${resourceId(officeHourId)}/reservations/${resourceId(reservationId)}/complete`,
          ),
        ),
      feedback: {
        list: (officeHourId: ApiId, reservationId: ApiId) =>
          requestResult<OfficeHourFeedback[]>(
            client.get(
              `${BASE_PATH}/office-hours/${resourceId(officeHourId)}/reservations/${resourceId(reservationId)}/feedback`,
            ),
          ),
        create: (
          officeHourId: ApiId,
          reservationId: ApiId,
          cmd: OfficeHourFeedbackCreateCmd,
        ) =>
          requestResult<OfficeHourFeedback>(
            client.post(
              `${BASE_PATH}/office-hours/${resourceId(officeHourId)}/reservations/${resourceId(reservationId)}/feedback`,
              cmd,
            ),
          ),
      },
    },
  },

  discussions: {
    list: (query: DiscussionListQuery = {}) =>
      requestResult<PageResult<StructuredDiscussion>>(
        client.get(`${BASE_PATH}/discussions`, { params: query }),
      ),
    detail: (discussionId: ApiId) =>
      requestResult<StructuredDiscussion>(
        client.get(`${BASE_PATH}/discussions/${resourceId(discussionId)}`),
      ),
    create: (cmd: DiscussionCreateCmd) =>
      requestResult<StructuredDiscussion>(client.post(`${BASE_PATH}/discussions`, cmd)),
    vote: (discussionId: ApiId, cmd: VoteCmd) =>
      requestResult<StructuredDiscussion>(
        client.post(`${BASE_PATH}/discussions/${resourceId(discussionId)}/vote`, cmd),
      ),
    updateSummary: (discussionId: ApiId, cmd: DiscussionSummaryCmd) =>
      requestResult<StructuredDiscussion>(
        client.put(`${BASE_PATH}/discussions/${resourceId(discussionId)}/summary`, cmd),
      ),
  },

  governance: {
    createCase: (cmd: GovernanceCaseCreateCmd) =>
      requestResult<GovernanceCase>(client.post(`${BASE_PATH}/governance/cases`, cmd)),
    mine: (query: CollaborationListQuery = {}) =>
      requestResult<PageResult<GovernanceCase>>(
        client.get(`${BASE_PATH}/governance/cases/mine`, { params: query }),
      ),
    reviewQueue: (query: CollaborationListQuery = {}) =>
      requestResult<PageResult<GovernanceCase>>(
        client.get(`${BASE_PATH}/governance/cases/review-queue`, { params: query }),
      ),
    decide: (caseId: ApiId, cmd: GovernanceReviewCmd) =>
      requestResult<GovernanceCase>(
        client.post(`${BASE_PATH}/governance/cases/${resourceId(caseId)}/decide`, cmd),
      ),
  },
}
