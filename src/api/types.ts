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
  targetCity?: string
  yearsOfExp?: number
  techStack?: string[]
}

export interface Post {
  postId: ApiId
  postType: number
  title: string
  content: string
  summary?: string
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
  myInteraction?: {
    liked: boolean
    favorited: boolean
  }
  createdAt: number
  updatedAt: number
}

export interface Tag {
  id: ApiId
  name: string
  slug: string
  category?: string
  count?: number
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

export interface PaginatedResponse<T> {
  items: T[]
  nextCursor?: string
  hasMore: boolean
}
