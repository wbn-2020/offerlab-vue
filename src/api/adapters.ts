import type { Comment, CommentReport, Notification, PaginatedResponse, Post, PostReport, Tag, User, UserIntent } from './types'

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
    expectedCity: raw?.expectedCity ?? raw?.targetCity ?? raw?.city,
    targetCity: raw?.targetCity ?? raw?.expectedCity ?? raw?.city,
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
    count: Number(raw?.count ?? raw?.postCount ?? raw?.useCount ?? 0),
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
  const source = raw?.post
    ? {
        ...raw.post,
        author: raw.author ?? raw.post.author,
        counter: raw.counter ?? raw.post.counter,
        myInteraction: raw.myInteraction ?? raw.post.myInteraction,
      }
    : raw
  const counter = source?.counter ?? {}
  const authorId = source?.authorId ?? source?.uid
  const myInteraction = source?.myInteraction ?? {}
  return {
    postId: adaptId(source?.postId ?? source?.id),
    postType: Number(source?.postType ?? 0),
    title: source?.title ?? '',
    content: source?.content ?? source?.summary ?? '',
    summary: source?.summary,
    coverUrl: source?.coverUrl,
    tags: Array.isArray(source?.tags) ? source.tags.map(adaptTag) : [],
    author: source?.author ? adaptUser(source.author) : emptyAuthor(authorId),
    counter: {
      view: Number(counter.view ?? counter.viewCount ?? source?.viewCount ?? 0),
      like: Number(counter.like ?? counter.likeCount ?? source?.likeCount ?? 0),
      comment: Number(counter.comment ?? counter.commentCount ?? source?.commentCount ?? 0),
      favorite: Number(counter.favorite ?? counter.favoriteCount ?? source?.favoriteCount ?? 0),
    },
    extension: parseExtension(source),
    recommendationReasons: Array.isArray(raw?.recommendationReasons)
      ? raw.recommendationReasons.map(String).filter(Boolean)
      : Array.isArray(source?.recommendationReasons)
        ? source.recommendationReasons.map(String).filter(Boolean)
        : undefined,
    myInteraction: {
      liked: Boolean(myInteraction.liked ?? source?.liked ?? false),
      favorited: Boolean(myInteraction.favorited ?? source?.favorited ?? false),
    },
    createdAt: adaptTime(source?.createdAt ?? source?.createTime),
    updatedAt: adaptTime(source?.updatedAt ?? source?.updateTime ?? source?.createTime),
  }
}

export function adaptComment(raw: any): Comment {
  return {
    commentId: adaptId(raw?.commentId ?? raw?.id),
    postId: adaptId(raw?.postId),
    content: raw?.content ?? '',
    author: raw?.author ? adaptUser(raw.author) : emptyAuthor(raw?.authorId),
    rootId: raw?.rootId ? adaptId(raw.rootId) : undefined,
    parentId: raw?.parentId ? adaptId(raw.parentId) : undefined,
    replyToUid: raw?.replyToUid ? adaptId(raw.replyToUid) : undefined,
    replyToUser: raw?.replyToUser ? adaptUser(raw.replyToUser) : undefined,
    likeCount: Number(raw?.likeCount ?? 0),
    myLiked: Boolean(raw?.myLiked ?? raw?.liked ?? false),
    canDelete: Boolean(raw?.canDelete ?? false),
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

export function adaptCommentReport(raw: any): CommentReport {
  return {
    reportId: adaptId(raw?.reportId ?? raw?.id),
    commentId: adaptId(raw?.commentId),
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
  const sender = raw?.sender ? adaptUser(raw.sender) : undefined
  return {
    notificationId: adaptId(raw?.notificationId ?? raw?.id),
    type,
    title: notificationTitle(type, sender?.nickname),
    content: notificationText(type, content, sender?.nickname),
    sender,
    senderUid: raw?.senderUid ? adaptId(raw.senderUid) : undefined,
    relatedId: targetId ? adaptId(targetId) : undefined,
    targetPath: userId ? `/u/${adaptId(userId)}` : postId ? `/post/${adaptId(postId)}` : undefined,
    read: Boolean(raw?.read ?? raw?.isRead ?? false),
    createdAt: adaptTime(raw?.createdAt ?? raw?.createTime),
  }
}

function displayName(name?: string): string {
  return name?.trim() || '有人'
}

function notificationTitle(type: string, senderName?: string): string {
  const name = displayName(senderName)
  switch (type) {
    case 'like':
      return `${name}点赞了你`
    case 'comment':
      return `${name}评论了你`
    case 'favorite':
      return `${name}收藏了你`
    case 'follower':
      return `${name}关注了你`
    case 'mention':
      return `${name}提到了你`
    default:
      return '系统通知'
  }
}

function notificationText(type: string, content: Record<string, any>, senderName?: string): string {
  const name = displayName(senderName)
  switch (type) {
    case 'like':
      return content.targetType === 2 ? `${name}点赞了你的评论` : `${name}点赞了你的帖子`
    case 'comment':
      return content.commentId ? `${name}评论了你的帖子，点击查看上下文` : `${name}评论了你的帖子`
    case 'favorite':
      return `${name}收藏了你的帖子`
    case 'follower':
      return '可以进入对方主页查看资料，也可以回关建立联系。'
    case 'mention':
      return content.commentId ? `${name}在评论中提到了你` : `${name}在帖子中提到了你`
    default:
      return '你有一条新通知'
  }
}
