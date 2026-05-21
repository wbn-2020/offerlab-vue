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
  parentId?: ApiId
  likeCount: number
  myLiked?: boolean
  createdAt: number
  replies?: Comment[]
}

export interface Notification {
  notificationId: ApiId
  type: string
  title: string
  content: string
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
