import type { Comment, PaginatedResponse, Post, Tag, User } from './types'

export function adaptId(value: any): string {
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

export function adaptTime(value: any): number {
  if (!value) return Date.now()
  if (typeof value === 'number') return value
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? Date.now() : parsed
}

export function adaptPage<T>(raw: any, itemAdapter: (item: any) => T): PaginatedResponse<T> {
  const items = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : []
  return {
    items: items.map(itemAdapter),
    nextCursor: raw?.nextCursor ? String(raw.nextCursor) : undefined,
    hasMore: Boolean(raw?.hasMore),
  }
}

export function adaptUser(raw: any): User {
  return {
    uid: adaptId(raw?.uid ?? raw?.id),
    email: raw?.email,
    nickname: raw?.nickname ?? '',
    avatar: raw?.avatar ?? raw?.avatarUrl ?? '',
    signature: raw?.signature ?? raw?.bio ?? '',
    createdAt: adaptTime(raw?.createdAt ?? raw?.createTime),
    isFollowing: raw?.isFollowing ?? false,
    isBigV: raw?.isBigV ?? false,
    followerCount: Number(raw?.followerCount ?? 0),
    followingCount: Number(raw?.followingCount ?? 0),
    postCount: Number(raw?.postCount ?? 0),
  }
}

export function adaptTag(raw: any): Tag {
  const name = raw?.name ?? raw?.tagName ?? ''
  return {
    id: adaptId(raw?.id ?? raw?.tagId ?? raw?.slug ?? name),
    name,
    slug: raw?.slug ?? raw?.code ?? String(name).toLowerCase(),
    category: raw?.category,
    count: Number(raw?.count ?? raw?.postCount ?? 0),
  }
}

function parseExtension(raw: any): Record<string, any> | undefined {
  const source = raw?.extension ?? raw?.ext ?? raw?.extJson
  if (!source) return raw?.extension
  if (typeof source === 'object') return source
  try {
    return JSON.parse(source)
  } catch {
    return undefined
  }
}

function emptyAuthor(authorId: any): User {
  return {
    uid: adaptId(authorId),
    nickname: '未知用户',
    avatar: '',
    signature: '',
    createdAt: Date.now(),
  }
}

export function adaptPost(raw: any): Post {
  const counter = raw?.counter ?? {}
  return {
    postId: adaptId(raw?.postId ?? raw?.id),
    postType: Number(raw?.postType ?? 0),
    title: raw?.title ?? '',
    content: raw?.content ?? raw?.summary ?? '',
    summary: raw?.summary,
    coverUrl: raw?.coverUrl,
    tags: Array.isArray(raw?.tags) ? raw.tags.map(adaptTag) : [],
    author: raw?.author ? adaptUser(raw.author) : emptyAuthor(raw?.authorId),
    counter: {
      view: Number(counter.view ?? raw?.viewCount ?? 0),
      like: Number(counter.like ?? raw?.likeCount ?? 0),
      comment: Number(counter.comment ?? raw?.commentCount ?? 0),
      favorite: Number(counter.favorite ?? raw?.favoriteCount ?? 0),
    },
    extension: parseExtension(raw),
    myInteraction: {
      liked: Boolean(raw?.myInteraction?.liked ?? raw?.liked ?? false),
      favorited: Boolean(raw?.myInteraction?.favorited ?? raw?.favorited ?? false),
    },
    createdAt: adaptTime(raw?.createdAt ?? raw?.createTime),
    updatedAt: adaptTime(raw?.updatedAt ?? raw?.updateTime ?? raw?.createTime),
  }
}

export function adaptComment(raw: any): Comment {
  return {
    commentId: adaptId(raw?.commentId ?? raw?.id),
    postId: adaptId(raw?.postId),
    content: raw?.content ?? '',
    author: raw?.author ? adaptUser(raw.author) : emptyAuthor(raw?.authorId),
    parentId: raw?.parentId ? adaptId(raw.parentId) : undefined,
    likeCount: Number(raw?.likeCount ?? 0),
    myLiked: Boolean(raw?.myLiked ?? raw?.liked ?? false),
    createdAt: adaptTime(raw?.createdAt ?? raw?.createTime),
    replies: Array.isArray(raw?.replies) ? raw.replies.map(adaptComment) : undefined,
  }
}
