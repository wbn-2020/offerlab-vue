export interface User {
  uid: number
  nickname: string
  avatar: string
  signature: string
  createdAt: number
  isFollowing?: boolean
  isBigV?: boolean
}

export interface Post {
  postId: number
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
  id: number
  name: string
  slug: string
  category?: string
}

export interface Comment {
  commentId: number
  postId: number
  content: string
  author: User
  parentId?: number
  likeCount: number
  createdAt: number
}

export interface Notification {
  notificationId: number
  type: string
  title: string
  content: string
  relatedId?: number
  read: boolean
  createdAt: number
}

export interface PaginatedResponse<T> {
  items: T[]
  nextCursor?: string
  hasMore: boolean
}
