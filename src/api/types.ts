export type ApiId = string | number

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
  recommendationReasons?: string[]
  myInteraction?: {
    liked: boolean
    favorited: boolean
  }
  createdAt: number
  updatedAt: number
}

export interface PostPublishStatus {
  postId: ApiId
  ready?: boolean
  database?: {
    landed?: boolean
    publiclyVisible?: boolean
    visibleWithTestData?: boolean
    postType?: number
    title?: string
  }
  index?: {
    documentFound?: boolean
    status?: Record<string, unknown>
    retryTask?: {
      id?: ApiId
      operation?: string
      status?: number
      statusText?: string
      retryCount?: number
      updateTime?: string
    } | null
  }
  search?: {
    visible?: boolean
    source?: string
    degraded?: boolean
    fallbackReason?: string
    diagnostics?: Record<string, unknown>
  }
  outbox?: {
    latest?: {
      id?: ApiId
      topic?: string
      status?: number
      statusText?: string
      retryCount?: number
      nextRetryTime?: string
      updateTime?: string
    } | null
  }
}

export interface PostVersionHistory {
  id: ApiId
  postId: ApiId
  authorId?: ApiId
  editorUid?: ApiId
  baseVersion?: number
  title: string
  content: string
  contentSummary?: string
  coverUrl?: string
  visibility?: number
  postStatus?: number
  extension?: Record<string, any>
  tags: Tag[]
  changeSummary?: string
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
  canDelete?: boolean
  createdAt: number
  replies?: Comment[]
}

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
  reviewerUid?: ApiId
  reviewNote?: string
  createTime?: string
  reviewTime?: string
}

export interface Notification {
  notificationId: ApiId
  notificationIds?: ApiId[]
  type: string
  title: string
  content: string
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

export interface ContentAssistSuggestion {
  id: string
  label: string
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

export interface ContentAssistResult {
  status: 'ready' | 'disabled' | 'degraded' | 'failed'
  source: 'remote' | 'fallback'
  summary: string
  qualityScore: number
  qualityLabel: string
  qualityReason?: string
  qualityMetrics: ContentAssistQualityMetric[]
  actionItems: string[]
  tagSuggestions: ContentAssistSuggestion[]
  topicSuggestions: ContentAssistSuggestion[]
  seriesHints: ContentAssistSeriesHint[]
  fallbackReason?: string
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
