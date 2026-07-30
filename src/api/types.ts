export type ApiId = string | number
export type ApiLong = string | number

export interface User {
  uid: ApiId
  email?: string
  nickname: string
  avatar: string
  signature: string
  createdAt: number
  followerCount?: number
  followingCount?: number
  postCount?: number
  isFollowing?: boolean
  isBigV?: boolean
  profileVisible?: boolean
  intentVisible?: boolean
  privacyReason?: string
  acceptContactRequest?: boolean
  contactRequestPolicy?: 'all' | 'following' | 'mutual' | 'off' | string
  canStartContactRequest?: boolean
  contactRequestReasonCode?: string
  contactRequestReasonMessage?: string
}

export type UserBrief = User

export interface UserIntent {
  targetCompanies?: string[]
  targetPositions?: string[]
  targetPosition?: string
  expectedCity?: string
  targetCity?: string
  yearsOfExp?: number
  techStack?: string[]
  interestTopics?: string[]
  interestTags?: string[]
  contentPreferences?: string[]
}

export interface PostTrustSignals {
  profileAvailable: boolean
  completenessScore: number
  lastConfirmedAt?: number
  freshnessStatus?: string
  hasAcceptedAnswer: boolean
  acceptedSuggestionCount: number
  publicCorrectionCount: number
  sourceComplete: boolean
  resolved: boolean
}

export interface Post {
  postId: ApiId
  postType: number
  title: string
  content: string
  summary?: string
  highlightTitle?: string
  highlightSummary?: string
  coverUrl?: string
  tags: Tag[]
  author: User

  counter: {
    view: number
    like: number
    comment: number
    favorite: number
  }
  extension?: Record<string, any>
  domain?: number
  anonymous?: boolean
  visibility?: number | string
  postStatus?: number | string
  status?: number | string
  deleted?: boolean
  restricted?: boolean
  riskLevel?: string | number
  moderationStatus?: string | number
  recommendationReasons?: string[]
  rankingReasons?: string[]
  trustSignals?: PostTrustSignals
  myInteraction?: {
    liked: boolean
    favorited: boolean
  }
  createdAt: number
  updatedAt: number
}

export type FavoriteFolderVisibility = 'public' | 'private'

export interface FavoriteFolder {
  id: ApiId
  name: string
  description?: string
  visibility: FavoriteFolderVisibility
  userId?: ApiId
  ownerId?: ApiId
  sortOrder?: number
  isDefault?: boolean
  defaultFolder?: boolean
  privateFolder?: boolean
  postCount: number
  createdAt: number
  updatedAt: number
}

export interface FavoriteFolderCreateReq {
  name: string
  description?: string
  visibility?: FavoriteFolderVisibility | 1 | 2
  isPublic?: boolean
  privateFolder?: boolean
}

export interface FavoriteFolderUpdateReq {
  name?: string
  description?: string
  visibility?: FavoriteFolderVisibility | 1 | 2
  isPublic?: boolean
  privateFolder?: boolean
}

export interface FavoriteFolderSortReq {
  sortOrder: number
}

export interface FavoriteMoveReq {
  postId: ApiId
  folderId?: ApiId | null
}

export interface FavoriteBatchMoveReq {
  postIds: ApiId[]
  folderId?: ApiId | null
}

export interface PostPublishStatus {
  postId: ApiId
  ready?: boolean
  database?: {
    publiclyVisible?: boolean
  }
  search?: {
    visible?: boolean
    source?: string
    degraded?: boolean
    fallbackReason?: string
    diagnostics?: Record<string, unknown>
  }
}

export interface PostVersionHistory {
  id: ApiId
  postId: ApiId
  authorId?: ApiId
  editorUid?: ApiId
  baseVersion?: number
  resultVersion?: number
  title: string
  content: string
  contentSummary?: string
  coverUrl?: string
  visibility?: number
  postStatus?: number
  extension?: Record<string, any>
  tags: Tag[]
  changeSummary?: string
  publicUpdateSummary?: string
  impactScope?: string
  createdAt: number
}

export interface PublicPostUpdate {
  resultVersion: number
  publicUpdateSummary: string
  impactScope?: string
  createdAt: number
}

export interface Tag {
  id: ApiId
  name: string
  slug: string
  category?: string
  count?: number
  tagType?: number
  status?: number
  recommended?: boolean
  official?: boolean
  mergeTargetId?: ApiId
  synonyms?: string[]
}

export interface ContentTypeOption {
  value: number
  code: string
  label: string
  shortLabel: string
  description: string
  placeholder: string
  minContentLength: number
  legacy?: boolean
}

export interface CommunityTopic {
  id: ApiId
  slug: string
  name: string
  description?: string
  topicType?: string
  coverUrl?: string
  sortOrder?: number
  featured?: boolean
  status?: number
  postCount?: number
  followerCount?: number
  followed?: boolean
  virtualTopic?: boolean
  tags: Tag[]
  createdAt?: number
  updatedAt?: number
}

export interface Comment {
  commentId: ApiId
  postId: ApiId
  content: string
  author: User
  rootId?: ApiId
  parentId?: ApiId
  replyToUid?: ApiId
  replyToUser?: User
  likeCount: number
  myLiked?: boolean
  authorReply?: boolean
  authorPinned?: boolean
  featured?: boolean
  helpfulCount?: number
  myHelpful?: boolean
  hotScore?: number
  folded?: boolean
  foldReason?: string
  qualityBadges?: string[]
  canDelete?: boolean
  replyCount?: number
  hasMoreReplies?: boolean
  repliesNextCursor?: string
  createdAt: number
  replies?: Comment[]
}

export type CommentSort = 'latest' | 'quality'

export interface PostReportReq {
  reason?: string
  detail?: string
}

export interface PostReportReviewReq {
  approved?: boolean
  action?: string
  status?: number
  note?: string
}

export interface PostReport {
  reportId: ApiId
  postId: ApiId
  postTitle?: string
  postSummary?: string
  reporterUid?: ApiId
  reason: string
  detail?: string
  reportStatus?: number
  userStatus?: UserReportStatus
  reporterNotified?: boolean
  reporterReceiptText?: string
  reviewerUid?: ApiId
  reviewNote?: string
  createTime?: string
  reviewTime?: string
}

export interface CommentReport {
  reportId: ApiId
  commentId: ApiId
  postId: ApiId
  postTitle?: string
  commentSummary?: string
  reporterUid?: ApiId
  reason: string
  detail?: string
  reportStatus?: number
  userStatus?: UserReportStatus
  reporterNotified?: boolean
  reporterReceiptText?: string
  reviewerUid?: ApiId
  reviewNote?: string
  createTime?: string
  reviewTime?: string
}

export type UserReportStatus = 'PROCESSING' | 'ACTION_TAKEN' | 'NOT_ACCEPTED' | 'CLOSED'

export type UserReportSourceType = 'POST_REPORT' | 'COMMENT_REPORT' | 'CONTACT_REQUEST_REPORT'

export interface UserReportReceipt {
  reportId: ApiId
  sourceType: UserReportSourceType
  targetId: ApiId
  postId?: ApiId
  targetTitle?: string
  targetSummary?: string
  reason: string
  detail?: string
  userStatus: UserReportStatus
  resultText: string
  targetPath?: string
  createTime?: string
  reviewTime?: string
  createdAt: number
  reviewedAt?: number
  targetAvailable: boolean
}

export type ContactRequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'IGNORED'
  | 'REPORTED'
  | 'CANCELLED'
  | 'EXPIRED'

export type ContactRequestScene = 'ask' | 'supplement' | 'feedback' | 'collaboration'

export type ContactRequestSourceType = 'profile' | 'post' | 'comment'

export interface ContactRequest {
  requestId: ApiId
  requesterUid: ApiId
  requesterName?: string
  requester?: UserBrief
  receiverUid: ApiId
  receiverName?: string
  receiver?: UserBrief
  sourceType: ContactRequestSourceType | string
  sourceId?: ApiId
  scene: ContactRequestScene | string
  messagePreview: string
  requestStatus: ContactRequestStatus | string
  createTime?: string
  updateTime?: string
  receiverActionTime?: string
  expireTime?: string
  createdAt: number
  updatedAt: number
}

export interface ContactRequestStats {
  inboxTotal: number
  inboxPending: number
  inboxAccepted: number
  inboxRejected: number
  inboxIgnored: number
  inboxReported: number
  inboxCancelled: number
  inboxExpired: number
  outboxTotal: number
  outboxPending: number
  outboxAccepted: number
  outboxRejected: number
  outboxIgnored: number
  outboxReported: number
  outboxCancelled: number
  outboxExpired: number
}

export interface ContactRequestSettings {
  acceptContactRequest: boolean
  contactRequestPolicy: 'all' | 'following' | 'mutual' | 'off' | string
  dailyLimit: number
  contactRequestDailyLimit?: number
}

export interface ContactRequestCreateReq {
  receiverUid: ApiId
  sourceType: ContactRequestSourceType | string
  sourceId?: ApiId | null
  scene: ContactRequestScene | string
  message: string
}

export interface Notification {
  notificationId: ApiId
  notificationIds?: ApiId[]
  type: string
  action?: string
  title: string
  content: string
  curationFeedback?: CreatorCurationFeedback
  sender?: User
  relatedId?: ApiId
  targetPath?: string
  read: boolean
  aggregateCount?: number
  unreadCount?: number
  createdAt: number
}

export interface NotificationPreference {
  interactionNotification: boolean
  systemNotification: boolean
  likeNotification: boolean
  commentNotification: boolean
  followNotification: boolean
  favoriteNotification: boolean
  mentionNotification: boolean
}

export interface NotificationUnreadCount {
  total: number
  like: number
  comment: number
  favorite: number
  follower: number
  mention: number
  system: number
}

export interface NotificationRealtimeStatus {
  unread: NotificationUnreadCount
  latestUnreadId?: ApiId
  latestUnreadAt?: number
  serverTime: number
  pollIntervalSeconds: number
  websocketEnabled: boolean
}

export interface DiscussionFollowStatus {
  postId: ApiId
  followed: boolean
  lastReadCommentId?: ApiId
  lastNotifiedCommentId?: ApiId
  source?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  nextCursor?: string
  hasMore: boolean
  total?: number
  source?: string
  degraded?: boolean
  fallbackReason?: string
  scanLimit?: number
  diagnostics?: Record<string, unknown>
}

export type ContentAssistSuggestionType = 'tag' | 'topic'

export type ContentAssistSource = 'remote' | 'fallback' | 'demo'

export interface ContentAssistSuggestion {
  id: string
  label: string
  type: ContentAssistSuggestionType
  detail?: string
  reason?: string
  confidence?: number
  adopted?: boolean
}

export interface ContentAssistSeriesHint {
  id?: ApiId
  title: string
  progressText?: string
}

export interface ContentAssistQualityMetric {
  label: string
  score: number
  detail: string
}

export interface ContentAssistTopicCandidateHint {
  topicId?: ApiId
  title: string
  href?: string
  reasonText: string
  status: 'candidate'
}

export interface ContentAssistResult {
  status: 'ready' | 'disabled' | 'degraded' | 'failed'
  source: ContentAssistSource
  sourceLabel?: string
  sourceMessage?: string
  summary: string
  qualityScore: number
  qualityLabel: string
  qualityReason?: string
  qualityMetrics: ContentAssistQualityMetric[]
  actionItems: string[]
  tagSuggestions: ContentAssistSuggestion[]
  topicSuggestions: ContentAssistSuggestion[]
  seriesHints: ContentAssistSeriesHint[]
  topicCandidateHints?: ContentAssistTopicCandidateHint[]
  fallbackReason?: string
}

export type OperationTopicLifecycleStatus =
  | 'DRAFT'
  | 'PREVIEW'
  | 'PUBLISHED'
  | 'OFFLINE'
  | 'ARCHIVED'

export type OperationTopicDisplayStatus = OperationTopicLifecycleStatus | 'DEGRADED'

export interface OperationTopicContentItem {
  id: ApiId
  sourceType: 'POST' | string
  sourceId: ApiId
  status: 'ACTIVE' | 'PAUSED' | string
  sortOrder: number
  reasonText: string
}

export interface OperationTopicSectionContract {
  id?: ApiId
  key: string
  title: string
  status: 'ACTIVE' | 'PAUSED' | string
  sortOrder: number
  reasonText?: string
  items: OperationTopicContentItem[]
}

export interface OperationTopicPublishCheckContract {
  topicId: ApiId
  draftRevision: number
  canPublish: boolean
  source: string
  degraded: boolean
  checkedAt?: string
  items: Array<{
    code: string
    label: string
    passed: boolean
    detail: string
  }>
}

export type EditorAssistContextSource =
  | 'creator_workbench'
  | 'post_detail'
  | 'series_entry'
  | 'topic_candidate'
  | 'content_type_template'
  | 'collaboration_need'
  | 'manual_publish'

export type EditorAssistAction =
  | 'update'
  | 'reply'
  | 'continue'
  | 'series'
  | 'topic'
  | 'template'
  | 'fulfill'

export type EditorAssistContextType =
  | 'post'
  | 'reply'
  | 'idea'
  | 'series'
  | 'topic'
  | 'template'
  | 'need'

export interface EditorAssistContext {
  source: EditorAssistContextSource
  action: EditorAssistAction
  contextType: EditorAssistContextType
  postId?: string
  commentId?: string
  ideaId?: string
  seriesId?: string
  needId?: string
  topicId?: string
  templateCode?: string
  returnHref?: string
  title?: string
  postType?: string
  topic?: string
  reasonText?: string
  contextSource?: string
  legacySource?: string
  degraded?: boolean
  degradedReason?: string
}

export interface EditorSearchGapContext {
  source: 'search_gap' | 'search_discovery'
  keyword: string
  clusterId?: string
  reasonText: string
  templateCode?: string
  topicId?: string
  topicSlug?: string
  returnHref?: string
}

export type EditorAssistSource = EditorAssistContextSource

export type EditorAssistFallbackReason =
  | 'missing_source'
  | 'invalid_source'
  | 'context_only_source'
  | 'missing_action'
  | 'invalid_action'
  | 'missing_context_type'
  | 'invalid_context_type'
  | 'missing_context_id'

export interface EditorAssistSourceHint {
  title: string
  detail: string
  returnHref?: string
}

export interface EditorAssistContextParseResult {
  context: EditorAssistContext | null
  source?: EditorAssistSource
  degraded: boolean
  fallbackReason?: EditorAssistFallbackReason
  canShowSourceHint: boolean
  sourceHint?: EditorAssistSourceHint | null
}

export interface ContentSeriesItem {
  id: string
  postId?: ApiId
  draftId?: ApiId
  title: string
  summary?: string
  domain?: number
  status: 'draft' | 'published'
  updatedAt: number
}

export interface ContentSeriesProgress {
  publishedCount: number
  draftCount: number
  totalCount: number
  goalCount: number
  completionRate: number
  label: string
}

export interface CrossDomainRecommendation {
  item: {
    post: Post | null
  }
  sourceDomain?: number
  sourceDomainName?: string
  targetDomain?: number
  targetDomainName?: string
  recommendationReason: string
  degraded: boolean
}

export interface GrowthProfile {
  days: number
  degraded: boolean
  degradationReasons: string[]
  strongestDomain?: string
  emergingDomain?: string
  nextFocus?: string
  domains: GrowthProfileDomain[]
}

export interface GrowthProfileDomain {
  domain: number
  domainName: string
  postCount: number
  seriesCount: number
  activeDays: number
  interactionCount: number
  viewCount: number
  dimensions: GrowthProfileDimension[]
  representativePosts: GrowthProfileReferencePost[]
}

export interface GrowthProfileDimension {
  key: string
  label: string
  score: number
  explanation: string
}

export interface GrowthProfileReferencePost {
  postId: ApiId
  title: string
  domain?: number
  heat: number
  featured: boolean
}

export interface GrowthReport {
  period: 'weekly' | 'monthly' | string
  days: number
  degraded: boolean
  degradationReasons: string[]
  publishedPostCount: number
  interactionCount: number
  featuredPostCount: number
  seriesContributionCount: number
  domainChanges: GrowthReportDomainChange[]
  highlightPosts: GrowthReportHighlightPost[]
  nextActions: string[]
}

export interface GrowthReportDomainChange {
  domain: number
  domainName: string
  currentPostCount: number
  previousPostCount: number
  trend: string
  reason: string
}

export interface GrowthReportHighlightPost {
  postId: ApiId
  title: string
  domain?: number
  domainName?: string
  interactionCount: number
  featured: boolean
}

export interface EffectiveReadSession {
  sessionToken: string
  postId?: ApiId
  minimumActiveSeconds: number
  minimumScrollPercent?: number
  heartbeatIntervalSeconds: number
  heartbeatTimeoutSeconds: number
  nextHeartbeatSeq: number
  activeSeconds: number
  maxScrollPercent: number
  qualified: boolean
  completed: boolean
  expiresAt?: number
}

export type EffectiveReadActivityState = 'ACTIVE' | 'PAUSED'

export interface EffectiveReadHeartbeatReq {
  sessionToken: string
  heartbeatSeq: number
  activityState: EffectiveReadActivityState
  scrollPercent: number
}

export interface EffectiveReadHeartbeatResult {
  accepted: boolean
  countingActive: boolean
  nextHeartbeatSeq: number
  activeSeconds: number
  maxScrollPercent: number
  qualified: boolean
  completed: boolean
  expiresAt?: number
}

export interface EffectiveReadCompleteReq {
  sessionToken: string
}

export interface EffectiveReadAbandonReq {
  sessionToken: string
}

export interface EffectiveReadAbandonResult {
  abandoned: boolean
}

export interface EffectiveReadCompleteResult {
  recorded?: boolean
  completed?: boolean
  activeSeconds?: number
  maxScrollPercent?: number
}

export interface CreatorFeedbackWindow {
  days: 7 | 30 | number
  label: string
  postCount: number
  viewCount: number
  likeCount: number
  favoriteCount: number
  commentCount: number
  followerCount?: number
  replyCount: number
  feedbackCopy: string
}

export type CreatorWorkspaceSource = 'remote' | 'empty' | 'demo' | 'fallback'

export interface CreatorFeedbackSummary {
  source: CreatorWorkspaceSource
  updatedAt: number
  degraded: boolean
  fallbackReason?: string
  degradationReasons: string[]
  windows: CreatorFeedbackWindow[]
  responseRate: number
  unreadCommentCount: number
  topFeedbackSignals: string[]
}

export type CurationFeedbackSource =
  | 'operation-curation'
  | 'topic-detail'
  | 'home-featured'
  | 'discovery-topic'
  | 'manual-curation'
  | 'fallback-demo'
  | 'unavailable'
  | string

export type DisplayableCurationFeedbackSource =
  | 'operation-curation'
  | 'topic-detail'
  | 'home-featured'
  | 'discovery-topic'
  | 'manual-curation'
  | 'remote'

export type CreatorCurationFeedbackStatus = 'active' | 'archived' | 'offline' | 'degraded'

export interface CreatorCurationMetrics {
  viewCount: number
  likeCount: number
  favoriteCount: number
  commentCount: number
}

export interface CreatorCurationFeedback {
  eventId: ApiId
  contentId: ApiId
  contentTitle: string
  placementType?: string
  placementId?: ApiId
  placementLabel: string
  topicSlug?: string
  topicTitle?: string
  sectionKey?: string
  sectionTitle?: string
  reasonText: string
  href?: string
  triggeredAt: number
  includedAt?: number
  status: CreatorCurationFeedbackStatus
  source: CurationFeedbackSource
  displayableSource?: DisplayableCurationFeedbackSource
  publicMetrics?: CreatorCurationMetrics
}

export interface CreatorCurationFeedbackSummary {
  source: CreatorWorkspaceSource
  updatedAt: number
  degraded: boolean
  fallbackReason?: string
  total: number
  items: CreatorCurationFeedback[]
  recentItems: CreatorCurationFeedback[]
}

export interface CreatorWorkspaceSummary {
  periodDays: number
  publicPostCount: number
  totalFeedbackCount: number
  viewCount: number
  likeCount: number
  favoriteCount: number
  commentCount: number
  curationCount: number
  replyOpportunityCount: number
  representativeCount: number
  updatedAt: number
  copy: string
}

export interface CreatorTopPost {
  postId: ApiId
  title: string
  summary?: string
  domain?: number
  domainName?: string
  viewCount: number
  likeCount: number
  favoriteCount: number
  commentCount: number
  feedbackScore: number
  reason: string
  href?: string
}

export interface CreatorMaintainablePost extends CreatorTopPost {
  actionHint?: string
  editorQuery?: CreatorTopicEditorQuery
}

export interface CreatorReplyOpportunity {
  id: ApiId
  postId: ApiId
  postTitle: string
  commentId?: ApiId
  commenterName?: string
  excerpt: string
  reason: string
  priority: 'high' | 'medium' | 'low' | string
  suggestedReplyTone: string
  href?: string
  createdAt?: number
}

export interface CreatorRepresentativePost {
  postId: ApiId
  title: string
  summary?: string
  domain?: number
  domainName?: string
  heat: number
  featured: boolean
  publicCollectionCount: number
  reason: string
  source?: 'manual_profile_display' | 'auto_profile_candidate' | 'neutral_profile_candidate' | string
  publicVisible?: boolean
  boundaryCopy?: string
  href?: string
}

export interface CreatorTopicEditorQuery {
  source: 'creator_workbench'
  action?: EditorAssistAction
  contextType?: EditorAssistContextType
  title?: string
  postType?: string
  topic?: string
  seriesId?: string
  needId?: string
  postId?: string
  commentId?: string
  ideaId?: string
  topicId?: string
  templateCode?: string
  returnHref?: string
  contextSource?: string
  reasonText?: string
}

export interface CreatorTopicIdea {
  id: ApiId
  title: string
  prompt: string
  reason: string
  sourceType?: 'hot_topic' | 'search_term' | 'comment_question' | 'own_post_feedback' | 'series_gap' | 'content_type_template' | string
  sourceSignals: string[]
  targetDomain?: number
  targetDomainName?: string
  suggestedFormat?: string
  editorQuery: CreatorTopicEditorQuery
  editorHref: string
}

export interface CreatorSearchGap {
  id: ApiId
  keyword: string
  title: string
  reasonText: string
  demandLabel?: string
  clusterId?: string
  topicId?: ApiId
  topicSlug?: string
  templateCode?: string
  editorContext: EditorSearchGapContext
  editorHref: string
}

export interface CreatorIncentiveCopy {
  title: string
  description: string
  boundary: string
  ctaLabel?: string
}

export interface CreatorWorkspaceAction {
  id: ApiId
  label: string
  href?: string
  kind: 'open_editor' | 'open_posts' | 'open_series' | 'view_feedback' | string
  type?: 'open_post' | 'reply' | 'edit' | 'topic' | 'series' | string
  description?: string
  postId?: ApiId
  commentId?: ApiId
  query?: CreatorTopicEditorQuery
  editorQuery?: CreatorTopicEditorQuery
  reason?: string
  disabled?: boolean
}

export interface CreatorTrustedContentMetrics {
  degraded?: boolean
  fallbackReason?: string
  pendingSuggestions: number
  freshnessAwaitingConfirmation: number
  profileConfirmationDue: number
  unresolvedQuestions: number
  usefulFeedback7Days: number
  usefulFeedback30Days: number
  effectiveReads7Days: number
  effectiveReads30Days: number
  pendingSuggestionItems?: CreatorTrustedContentTaskItem[]
  freshnessItems?: CreatorTrustedContentTaskItem[]
  profileConfirmationItems?: CreatorTrustedContentTaskItem[]
  pendingQuestionItems?: CreatorTrustedContentTaskItem[]
}

export interface CreatorTrustedContentTaskItem {
  id: ApiId
  postId: ApiId
  postTitle: string
  status?: string
  statusLabel?: string
  type?: string
  href?: string
  suggestionId?: ApiId
  createdAt?: number
  updatedAt?: number
  submittedAt?: number
}

export interface CreatorGrowthWorkspace {
  source: CreatorWorkspaceSource
  updatedAt: number
  periodDays: number
  degraded: boolean
  fallbackReason?: string
  degradationReasons: string[]
  summary: CreatorWorkspaceSummary
  maintainablePosts: CreatorMaintainablePost[]
  curationFeedback: CreatorCurationFeedback[]
  actions: CreatorWorkspaceAction[]
  feedbackSummary: CreatorFeedbackSummary
  topPosts: CreatorTopPost[]
  replyOpportunities: CreatorReplyOpportunity[]
  representativePosts: CreatorRepresentativePost[]
  topicIdeas: CreatorTopicIdea[]
  searchGaps: CreatorSearchGap[]
  trustedContent?: CreatorTrustedContentMetrics
  incentiveCopy: CreatorIncentiveCopy
}

export interface ExpertCertificationCheckItem {
  code: string
  label: string
  passed: boolean
  detail: string
}

export interface ExpertCertificationEligibility {
  domain: number
  domainName: string
  eligible: boolean
  riskAcknowledgementRequired: boolean
  manualReviewOnly: boolean
  riskWarning?: string
  explanation: string
  checks: ExpertCertificationCheckItem[]
}

export interface ExpertCertificationApplication {
  id: ApiId
  applicantUid?: ApiId
  domain: number
  domainName: string
  status: number
  statusLabel: string
  evidenceSummary: string
  evidenceLinks: string[]
  eligibilityPassed: boolean
  eligibilitySummary?: string
  riskAcknowledged: boolean
  riskWarning?: string
  autoCertified: boolean
  reviewerUid?: ApiId
  reviewNote?: string
  revokedBy?: ApiId
  revokeNote?: string
  createTime: number
  updateTime: number
  reviewTime?: number
  revokedTime?: number
}

export interface ExpertCertificationApplyPayload {
  domain: number
  evidenceSummary: string
  evidenceLinks: string[]
  riskAcknowledged?: boolean
}

export interface ExpertCertificationReviewPayload {
  approved: boolean
  note?: string
}

export interface KnowledgeRelationGraph {
  limit: number
  nodes: KnowledgeRelationNode[]
  edges: KnowledgeRelationEdge[]
}

export interface KnowledgeRelationNode {
  key: string
  type: string
  label: string
  domain?: number
}

export interface KnowledgeRelationEdge {
  source: string
  target: string
  relation: string
  weight: number
}
