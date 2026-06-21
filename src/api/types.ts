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
  type: string
  title: string
  content: string
  sender?: User
  senderUid?: ApiId
  relatedId?: ApiId
  targetPath?: string
  read: boolean
  createdAt: number
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
