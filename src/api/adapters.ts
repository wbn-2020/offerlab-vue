import type { Comment, CommentReport, CommunityTopic, Notification, PaginatedResponse, Post, PostReport, PostVersionHistory, Tag, User, UserIntent } from './types'
import { normalizeDomain } from '@/utils/domains'
import { safeVisibleText, sanitizeVisibleText } from '@/utils/textQuality'

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
    total: Number(raw?.total ?? items.length),
    source: raw?.source ? String(raw.source) : undefined,
    degraded: raw?.degraded === undefined || raw?.degraded === null ? undefined : Boolean(raw.degraded),
    fallbackReason: raw?.fallbackReason ? String(raw.fallbackReason) : undefined,
    scanLimit: raw?.scanLimit === undefined || raw?.scanLimit === null ? undefined : Number(raw.scanLimit),
    diagnostics: raw?.diagnostics && typeof raw.diagnostics === 'object' ? raw.diagnostics : undefined,
  }
}

function safeSameSitePath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const path = value.trim()
  if (!path || !path.startsWith('/') || path.startsWith('//') || /\s/.test(path)) return undefined
  return path
}

export function adaptUser(raw: any): User {
  return {
    uid: adaptId(raw?.uid ?? raw?.id),
    email: raw?.email,
    nickname: safeVisibleText(raw?.nickname, '未知用户'),
    avatar: raw?.avatar ?? raw?.avatarUrl ?? '',
    signature: sanitizeVisibleText(raw?.signature ?? raw?.bio),
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
  if (Array.isArray(value)) return value.map((item) => sanitizeVisibleText(item)).filter(Boolean)
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
    interestTopics: toStringArray(raw?.interestTopics),
    interestTags: toStringArray(raw?.interestTags),
    contentPreferences: toStringArray(raw?.contentPreferences),
  }
}

export function adaptTag(raw: any): Tag {
  const name = safeVisibleText(raw?.name ?? raw?.tagName, '未归类主题')
  return {
    id: adaptId(raw?.id ?? raw?.tagId ?? raw?.slug ?? name),
    name,
    slug: raw?.slug ?? raw?.code ?? String(name).toLowerCase(),
    category: sanitizeVisibleText(raw?.category) || undefined,
    count: Number(raw?.count ?? raw?.postCount ?? raw?.useCount ?? 0),
    tagType: raw?.tagType === undefined ? undefined : Number(raw.tagType),
    status: raw?.status ?? raw?.tagStatus,
    recommended: raw?.recommended === undefined ? undefined : Boolean(raw.recommended),
    official: raw?.official === undefined ? undefined : Boolean(raw.official),
    mergeTargetId: raw?.mergeTargetId === undefined || raw?.mergeTargetId === null ? undefined : adaptId(raw.mergeTargetId),
    synonyms: Array.isArray(raw?.synonyms) ? raw.synonyms.map((item: unknown) => sanitizeVisibleText(item)).filter(Boolean) : [],
  }
}

export function adaptCommunityTopic(raw: any): CommunityTopic {
  return {
    id: adaptId(raw?.id ?? raw?.topicId),
    slug: raw?.slug ?? adaptId(raw?.id ?? raw?.topicId),
    name: safeVisibleText(raw?.name ?? raw?.topicName, '待整理专题'),
    description: sanitizeVisibleText(raw?.description) || undefined,
    topicType: sanitizeVisibleText(raw?.topicType || raw?.type) || undefined,
    coverUrl: raw?.coverUrl || undefined,
    sortOrder: Number(raw?.sortOrder ?? 0),
    featured: Boolean(raw?.featured),
    status: raw?.status ?? raw?.topicStatus,
    postCount: Number(raw?.postCount ?? raw?.count ?? 0),
    followerCount: Number(raw?.followerCount ?? 0),
    followed: Boolean(raw?.followed),
    virtualTopic: Boolean(raw?.virtualTopic),
    tags: Array.isArray(raw?.tags) ? raw.tags.map(adaptTag) : [],
    createdAt: raw?.createdAt || raw?.createTime ? adaptTime(raw?.createdAt ?? raw?.createTime) : undefined,
    updatedAt: raw?.updatedAt || raw?.updateTime ? adaptTime(raw?.updatedAt ?? raw?.updateTime) : undefined,
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

function anonymousAuthor(): User {
  return {
    uid: '0',
    nickname: '匿名用户',
    avatar: '',
    signature: '',
    createdAt: Date.now(),
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    profileVisible: false,
    intentVisible: false,
    privacyReason: '匿名发布',
  }
}

function hasSearchHighlight(value: unknown) {
  return typeof value === 'string' && /<\/?em>/i.test(value)
}

function stripSearchHighlight(value: unknown) {
  return typeof value === 'string' ? value.replace(/<\/?em>/gi, '') : ''
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
  const rawTitle = source?.title ?? ''
  const rawSummary = source?.summary
  const rawContent = source?.content ?? source?.summary ?? ''
  const extension = parseExtension(source)
  const domain = normalizeDomain(source?.domain ?? extension?.domain)
  const anonymous = Boolean(source?.anonymous ?? extension?.anonymous ?? false)
  const adaptedAuthor = source?.author ? adaptUser(source.author) : emptyAuthor(authorId)
  const author = anonymous
    && (adaptedAuthor.uid === '' || String(adaptedAuthor.uid) === '0' || adaptedAuthor.profileVisible === false)
    ? anonymousAuthor()
    : adaptedAuthor
  return {
    postId: adaptId(source?.postId ?? source?.id),
    postType: Number(source?.postType ?? 0),
    domain,
    anonymous,
    title: safeVisibleText(stripSearchHighlight(rawTitle), '内容编码异常，已隐藏标题'),
    content: safeVisibleText(stripSearchHighlight(rawContent), '内容编码异常，已隐藏原文'),
    summary: rawSummary ? sanitizeVisibleText(stripSearchHighlight(rawSummary), '内容编码异常，已隐藏摘要') : undefined,
    highlightTitle: source?.highlightTitle ?? (hasSearchHighlight(rawTitle) ? rawTitle : undefined),
    highlightSummary: source?.highlightSummary ?? (hasSearchHighlight(rawSummary) ? rawSummary : undefined),
    coverUrl: source?.coverUrl,
    tags: Array.isArray(source?.tags) ? source.tags.map(adaptTag) : [],
    author,
    counter: {
      view: Number(counter.view ?? counter.viewCount ?? source?.viewCount ?? 0),
      like: Number(counter.like ?? counter.likeCount ?? source?.likeCount ?? 0),
      comment: Number(counter.comment ?? counter.commentCount ?? source?.commentCount ?? 0),
      favorite: Number(counter.favorite ?? counter.favoriteCount ?? source?.favoriteCount ?? 0),
    },
    extension,
    recommendationReasons: Array.isArray(raw?.recommendationReasons)
      ? raw.recommendationReasons.map((item: unknown) => sanitizeVisibleText(item)).filter(Boolean)
      : Array.isArray(source?.recommendationReasons)
        ? source.recommendationReasons.map((item: unknown) => sanitizeVisibleText(item)).filter(Boolean)
        : undefined,
    myInteraction: {
      liked: Boolean(myInteraction.liked ?? source?.liked ?? false),
      favorited: Boolean(myInteraction.favorited ?? source?.favorited ?? false),
    },
    createdAt: adaptTime(source?.createdAt ?? source?.createTime),
    updatedAt: adaptTime(source?.updatedAt ?? source?.updateTime ?? source?.createTime),
  }
}

export function adaptPostVersionHistory(raw: any): PostVersionHistory {
  return {
    id: adaptId(raw?.id),
    postId: adaptId(raw?.postId),
    authorId: raw?.authorId ? adaptId(raw.authorId) : undefined,
    editorUid: raw?.editorUid ? adaptId(raw.editorUid) : undefined,
    baseVersion: Number(raw?.baseVersion ?? 0),
    title: safeVisibleText(raw?.title, '内容编码异常，已隐藏标题'),
    content: safeVisibleText(raw?.content, '内容编码异常，已隐藏原文'),
    contentSummary: sanitizeVisibleText(raw?.contentSummary ?? raw?.summary, '内容编码异常，已隐藏摘要'),
    coverUrl: raw?.coverUrl || undefined,
    visibility: raw?.visibility,
    postStatus: raw?.postStatus,
    extension: parseExtension(raw),
    tags: Array.isArray(raw?.tags) ? raw.tags.map(adaptTag) : [],
    changeSummary: sanitizeVisibleText(raw?.changeSummary) || undefined,
    createdAt: adaptTime(raw?.createdAt ?? raw?.createTime),
  }
}

export function adaptComment(raw: any): Comment {
  return {
    commentId: adaptId(raw?.commentId ?? raw?.id),
    postId: adaptId(raw?.postId),
    content: safeVisibleText(raw?.content, '评论编码异常，已隐藏原文'),
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
    postTitle: sanitizeVisibleText(raw?.postTitle) || undefined,
    postSummary: sanitizeVisibleText(raw?.postSummary) || undefined,
    reporterUid: raw?.reporterUid ? adaptId(raw.reporterUid) : undefined,
    reason: safeVisibleText(raw?.reason ?? raw?.reasonType, '举报原因编码异常'),
    detail: sanitizeVisibleText(raw?.detail ?? raw?.reasonText),
    reportStatus: raw?.reportStatus ?? raw?.status,
    reviewerUid: raw?.reviewerUid ? adaptId(raw.reviewerUid) : undefined,
    reviewNote: sanitizeVisibleText(raw?.reviewNote ?? raw?.reviewRemark ?? raw?.remark),
    createTime: raw?.createTime ?? raw?.createdAt,
    reviewTime: raw?.reviewTime ?? raw?.updatedAt,
  }
}

export function adaptCommentReport(raw: any): CommentReport {
  return {
    reportId: adaptId(raw?.reportId ?? raw?.id),
    commentId: adaptId(raw?.commentId),
    postId: adaptId(raw?.postId),
    postTitle: sanitizeVisibleText(raw?.postTitle) || undefined,
    commentSummary: sanitizeVisibleText(raw?.commentSummary) || undefined,
    reporterUid: raw?.reporterUid ? adaptId(raw.reporterUid) : undefined,
    reason: safeVisibleText(raw?.reason ?? raw?.reasonType, '举报原因编码异常'),
    detail: sanitizeVisibleText(raw?.detail ?? raw?.reasonText),
    reportStatus: raw?.reportStatus ?? raw?.status,
    reviewerUid: raw?.reviewerUid ? adaptId(raw.reviewerUid) : undefined,
    reviewNote: sanitizeVisibleText(raw?.reviewNote ?? raw?.reviewRemark ?? raw?.remark),
    createTime: raw?.createTime ?? raw?.createdAt,
    reviewTime: raw?.reviewTime ?? raw?.updatedAt,
  }
}

export function adaptNotification(raw: any): Notification {
  const content = typeof raw?.content === 'object' && raw.content ? raw.content : {}
  const type = raw?.type ?? 'system'
  const aggregateCount = Number((raw?.aggregateCount ?? content.aggregateCount) || 0)
  const unreadCount = Number(raw?.unreadCount ?? content.unreadCount ?? ((raw?.read ?? raw?.isRead) ? 0 : 1))
  const targetId = raw?.targetId ?? content.postId ?? content.commentId ?? content.userId
  const postId = content.postId ?? (
    (type === 'system' && content.action === 'topic_post_published')
      || (['like', 'favorite', 'mention'].includes(type) && raw?.targetType === 1)
      ? raw?.targetId
      : undefined
  )
  const userId = type === 'follower' ? content.userId ?? raw?.senderUid ?? raw?.targetId : undefined
  const targetPath = safeSameSitePath(raw?.targetPath)
    ?? safeSameSitePath(raw?.jumpPath)
    ?? safeSameSitePath(content.targetPath)
    ?? safeSameSitePath(content.jumpPath)
  const sender = raw?.sender ? adaptUser(raw.sender) : undefined
  return {
    notificationId: adaptId(raw?.notificationId ?? raw?.id),
    notificationIds: Array.isArray(raw?.notificationIds) ? raw.notificationIds.map(adaptId) : undefined,
    type,
    title: notificationHeading(type, content, sender?.nickname, aggregateCount),
    content: notificationContent(type, content, sender?.nickname, aggregateCount),
    sender,
    senderUid: raw?.senderUid ? adaptId(raw.senderUid) : undefined,
    relatedId: targetId ? adaptId(targetId) : undefined,
    targetPath: targetPath ?? (userId ? `/u/${adaptId(userId)}` : postId ? `/post/${adaptId(postId)}` : undefined),
    read: Boolean(raw?.read ?? raw?.isRead ?? false),
    aggregateCount: aggregateCount > 1 ? aggregateCount : undefined,
    unreadCount,
    createdAt: adaptTime(raw?.createdAt ?? raw?.createTime),
  }
}

function displayName(name?: string): string {
  return sanitizeVisibleText(name, '有人')
}

function notificationHeading(type: string, content: Record<string, any>, senderName?: string, aggregateCount = 0): string {
  if (type === 'system' && content.action === 'question_extract_succeeded') return '题目已整理完成'
  if (type === 'system' && content.action === 'question_extract_failed') return '题目整理失败'
  if (type === 'system' && content.action === 'topic_post_published') return '关注专题有新内容'
  return notificationTitle(type, senderName, aggregateCount)
}

function notificationTitle(type: string, senderName?: string, aggregateCount = 0): string {
  const name = displayName(senderName)
  if (aggregateCount > 1 && type === 'like') return `${name}等 ${aggregateCount} 人点赞了你`
  if (aggregateCount > 1 && type === 'favorite') return `${name}等 ${aggregateCount} 人收藏了你`
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

function notificationContent(type: string, content: Record<string, any>, senderName?: string, aggregateCount = 0): string {
  if (type === 'system' && content.action === 'question_extract_succeeded') {
    const count = Number(content.questionCount || 0)
    const postTitle = sanitizeVisibleText(content.postTitle)
    const title = postTitle ? `《${postTitle}》` : '这篇内容'
    return count > 0 ? `${title}已整理出 ${count} 张知识卡，点击查看来源内容。` : `${title}已完成整理，但暂未提取到可用知识卡。`
  }
  if (type === 'system' && content.action === 'question_extract_failed') {
    const postTitle = sanitizeVisibleText(content.postTitle)
    const title = postTitle ? `《${postTitle}》` : '这篇内容'
    return `${title}知识卡整理失败，请稍后重试或联系运营。`
  }
  if (type === 'system' && content.action === 'topic_post_published') {
    const rawTopicName = sanitizeVisibleText(content.topicName)
    const rawPostTitle = sanitizeVisibleText(content.postTitle)
    const topicName = rawTopicName ? `「${rawTopicName}」` : '你关注的专题'
    const title = rawPostTitle ? `《${rawPostTitle}》` : '一篇新内容'
    return `${topicName}更新了：${title}`
  }
  return notificationText(type, content, senderName, aggregateCount)
}

function notificationText(type: string, content: Record<string, any>, senderName?: string, aggregateCount = 0): string {
  const name = displayName(senderName)
  if (aggregateCount > 1 && type === 'like') {
    return content.targetType === 2
      ? `最近 30 分钟内有 ${aggregateCount} 次点赞落在你的评论上`
      : `最近 30 分钟内有 ${aggregateCount} 次点赞落在你的帖子上`
  }
  if (aggregateCount > 1 && type === 'favorite') {
    return `最近 30 分钟内有 ${aggregateCount} 次收藏落在你的帖子上`
  }
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
