import type { Comment, Notification, PaginatedResponse, Post, PostReport, Tag, User, UserIntent } from './types'

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
    profileVisible: raw?.profileVisible ?? true,
    intentVisible: raw?.intentVisible ?? true,
    privacyReason: raw?.privacyReason,
  }
}

function toStringArray(value: any): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string') {
    return value
      .split(/[,，、]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export function adaptUserIntent(raw: any): UserIntent | null {
  if (!raw) return null

  const targetPositions = toStringArray(raw?.targetPositions ?? raw?.targetPosition)

  return {
    targetCompanies: toStringArray(raw?.targetCompanies ?? raw?.targetCompany),
    targetPositions,
    targetPosition: raw?.targetPosition ?? targetPositions[0],
    targetCity: raw?.targetCity ?? raw?.city,
    yearsOfExp: Number(raw?.yearsOfExp ?? raw?.experienceYears ?? 0),
    techStack: toStringArray(raw?.techStack ?? raw?.skills),
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

export function adaptPostReport(raw: any): PostReport {
  return {
    reportId: adaptId(raw?.reportId ?? raw?.id),
    postId: adaptId(raw?.postId),
    reporterUid: raw?.reporterUid ? adaptId(raw.reporterUid) : undefined,
    reason: raw?.reason ?? raw?.reasonType ?? '',
    detail: raw?.detail ?? raw?.reasonText ?? '',
    reportStatus: raw?.reportStatus ?? raw?.status,
    reviewerUid: raw?.reviewerUid ? adaptId(raw.reviewerUid) : undefined,
    reviewNote: raw?.reviewNote ?? raw?.reviewRemark ?? raw?.remark,
    createTime: raw?.createTime ?? raw?.createdAt,
    reviewTime: raw?.reviewTime ?? raw?.updatedAt,
  }
}

export function adaptNotification(raw: any): Notification {
  const content = typeof raw?.content === 'object' && raw.content ? raw.content : {}
  const type = raw?.type ?? 'system'
  const targetId = raw?.targetId ?? content.postId ?? content.commentId ?? content.userId
  const postId = content.postId ?? (['like', 'favorite', 'mention'].includes(type) && raw?.targetType === 1 ? raw?.targetId : undefined)
  const userId = type === 'follower' ? content.userId ?? raw?.senderUid ?? raw?.targetId : undefined
  return {
    notificationId: adaptId(raw?.notificationId ?? raw?.id),
    type,
    title: notificationTitle(type),
    content: notificationText(type, content),
    relatedId: targetId ? adaptId(targetId) : undefined,
    targetPath: userId ? `/u/${adaptId(userId)}` : postId ? `/post/${adaptId(postId)}` : undefined,
    read: Boolean(raw?.read ?? raw?.isRead ?? false),
    createdAt: adaptTime(raw?.createdAt ?? raw?.createTime),
  }
}

function notificationTitle(type: string): string {
  switch (type) {
    case 'like':
      return '收到点赞'
    case 'comment':
      return '收到评论'
    case 'favorite':
      return '收到收藏'
    case 'follower':
      return '新的关注'
    case 'mention':
      return '提到了你'
    default:
      return '系统通知'
  }
}

function notificationText(type: string, content: Record<string, any>): string {
  switch (type) {
    case 'like':
      return content.targetType === 2 ? '有人点赞了你的评论' : '有人点赞了你的帖子'
    case 'comment':
      return '有人评论了你的帖子'
    case 'favorite':
      return '有人收藏了你的帖子'
    case 'follower':
      return '有人关注了你'
    case 'mention':
      return content.commentId ? '有人在评论中提到了你' : '有人在帖子中提到了你'
    default:
      return '你有一条新通知'
  }
}
