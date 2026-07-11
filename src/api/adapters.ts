import type { ApiId, Comment, CommentReport, CommunityTopic, ContactRequest, ContactRequestSettings, ContactRequestStats, CreatorCurationFeedback, DisplayableCurationFeedbackSource, FavoriteFolder, FavoriteFolderVisibility, Notification, PaginatedResponse, Post, PostReport, PostVersionHistory, Tag, User, UserIntent, UserReportReceipt, UserReportSourceType, UserReportStatus } from './types'
import { normalizeDomain } from '@/utils/domains'
import { filterDistributionPosts, isPublicCollectionVisible, isPublicPostVisible, neutralizeHighRiskRecommendationReason, normalizeRecommendationReason } from '@/utils/recommendationGovernance'
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

export function adaptDistributionPage<T>(raw: any, itemAdapter: (item: any) => T): PaginatedResponse<T> {
  const rawItems = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : []
  const items = rawItems.filter((item: any) => filterDistributionPosts(item?.item?.post ? [item.item.post] : [item]).length > 0)
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

export type ContentListVisibility = 'public' | 'private'

export interface ContentListItem {
  id: string
  postId: ApiId
  post?: Post
  sortOrder: number
  addedAt: number
}

export interface ContentListSummary {
  id: string
  title: string
  description?: string
  visibility: ContentListVisibility
  ownerId?: ApiId
  itemCount: number
  items: ContentListItem[]
  updatedAt: number
  source: 'remote' | 'local_demo_only'
  localOnly: boolean
  ownerVisible: boolean
  discoverable: boolean
  searchable: boolean
  recommendable: boolean
  rankable: boolean
  operable: boolean
}

export type ContentListAsset = ContentListSummary

const normalizeContentListVisibility = (value: unknown): ContentListVisibility => {
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === 'public' || normalized === '1' ? 'public' : 'private'
}

export const normalizeFavoriteFolderVisibility = (value: unknown): FavoriteFolderVisibility => {
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === 'public' || normalized === '1' ? 'public' : 'private'
}

const normalizeFavoriteFolderRawVisibility = (raw: any): FavoriteFolderVisibility => {
  if (raw?.visibility !== undefined && raw?.visibility !== null) {
    return normalizeFavoriteFolderVisibility(raw.visibility)
  }
  if (raw?.privateFolder !== undefined && raw?.privateFolder !== null) {
    return raw.privateFolder === false ? 'public' : 'private'
  }
  if (raw?.isPublic !== undefined && raw?.isPublic !== null) {
    return raw.isPublic ? 'public' : 'private'
  }
  return 'private'
}

export const isPublicAssetPostVisible = (entry: unknown) => (
  isPublicPostVisible((entry as { post?: unknown })?.post ?? entry)
)

export const isPublicContentListVisible = (asset: unknown) => isPublicCollectionVisible(asset)

const ASSET_ENTRY_BLOCKED_COPY_PATTERNS = [
  /权威/g,
  /专家/g,
  /专业建议/g,
  /认证资料库/g,
  /支付/g,
  /会员/g,
  /订阅/g,
  /课程/g,
  /广告/g,
  /收益/g,
  /CodeCoachAI/gi,
]

export const neutralizeHighRiskAssetEntryCopy = (value: unknown) => {
  let text = sanitizeVisibleText(value)
  for (const pattern of ASSET_ENTRY_BLOCKED_COPY_PATTERNS) {
    text = text.replace(pattern, '社区整理')
  }
  return text
}

const adaptContentListItem = (raw: any, index: number): ContentListItem => {
  const post = raw?.post ? adaptPost(raw.post) : undefined
  return {
    id: adaptId(raw?.id ?? raw?.itemId ?? raw?.postId ?? post?.postId ?? `content-list-item-${index}`),
    postId: adaptId(raw?.postId ?? post?.postId),
    post,
    sortOrder: Number(raw?.sortOrder ?? raw?.order ?? index),
    addedAt: adaptTime(raw?.addedAt ?? raw?.createdAt ?? raw?.createTime),
  }
}

export function adaptContentList(raw: any): ContentListSummary {
  const visibility = normalizeContentListVisibility(raw?.visibility)
  const rawItems: any[] = Array.isArray(raw?.items) ? raw.items : []
  const items: ContentListItem[] = rawItems
    .map(adaptContentListItem)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const localOnly = Boolean(raw?.localOnly) || raw?.source === 'local_demo_only'
  const title = safeVisibleText(
    neutralizeHighRiskAssetEntryCopy(raw?.title),
    visibility === 'public' ? '公开清单' : '稍后读',
  )
  const assetForGovernance = {
    ...raw,
    title,
    visibility,
    deleted: raw?.deleted ?? raw?.isDeleted,
    restricted: raw?.restricted ?? raw?.isRestricted,
  }
  return {
    id: adaptId(raw?.id),
    title,
    description: neutralizeHighRiskAssetEntryCopy(raw?.description) || undefined,
    visibility,
    ownerId: raw?.ownerId == null ? undefined : adaptId(raw.ownerId),
    itemCount: Number(raw?.itemCount ?? items.length),
    items: items.filter(isPublicAssetPostVisible),
    updatedAt: adaptTime(raw?.updatedAt ?? raw?.updateTime),
    source: localOnly ? 'local_demo_only' : 'remote',
    localOnly,
    ownerVisible: visibility === 'private' || visibility === 'public',
    discoverable: visibility === 'public' && isPublicContentListVisible(assetForGovernance) && !localOnly,
    searchable: visibility === 'public' && isPublicContentListVisible(assetForGovernance) && !localOnly,
    recommendable: visibility === 'public' && isPublicContentListVisible(assetForGovernance) && !localOnly,
    rankable: visibility === 'public' && isPublicContentListVisible(assetForGovernance) && !localOnly,
    operable: visibility === 'public' && isPublicContentListVisible(assetForGovernance) && !localOnly,
  }
}

export function adaptFavoriteFolder(raw: any): FavoriteFolder {
  const visibility = normalizeFavoriteFolderRawVisibility(raw)
  const defaultFolder = Boolean(raw?.defaultFolder ?? raw?.isDefault ?? raw?.default)
  return {
    id: adaptId(raw?.id ?? raw?.folderId),
    name: safeVisibleText(raw?.name ?? raw?.title, '默认收藏夹'),
    description: sanitizeVisibleText(raw?.description) || undefined,
    visibility,
    userId: raw?.userId == null && raw?.uid == null ? undefined : adaptId(raw?.userId ?? raw?.uid),
    ownerId: raw?.ownerId == null && raw?.userId == null && raw?.uid == null ? undefined : adaptId(raw?.ownerId ?? raw?.userId ?? raw?.uid),
    sortOrder: Number(raw?.sortOrder ?? raw?.sort_order ?? 0),
    isDefault: defaultFolder,
    defaultFolder,
    privateFolder: visibility !== 'public',
    postCount: Number(raw?.postCount ?? raw?.itemCount ?? raw?.count ?? 0),
    createdAt: adaptTime(raw?.createdAt ?? raw?.createTime),
    updatedAt: adaptTime(raw?.updatedAt ?? raw?.updateTime ?? raw?.createdAt ?? raw?.createTime),
  }
}

function safeSameSitePath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const path = value.trim()
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/api/') || /\s/.test(path)) return undefined
  return path
}

const displayableCurationFeedbackSources: ReadonlySet<DisplayableCurationFeedbackSource> = new Set([
  'operation-curation',
  'topic-detail',
  'home-featured',
  'discovery-topic',
  'manual-curation',
  'remote',
])

const curationFeedbackTextBlockers = [
  'fallback-demo',
  'demo seed',
  'fixture',
  'local_demo',
  'Code' + 'CoachAI',
  'mock' + 'Interview',
  'resume' + 'Match',
  'private' + 'Goal',
  'application' + 'Task',
  'AI ' + '教练',
  '私人' + '训练',
  '训练' + '计划',
  '模拟' + '面试',
  '简历' + '匹配',
  '简历' + '/JD',
  'JD ' + '分析',
  '投递' + '任务',
]

const safeCurationFeedbackText = (value: unknown, fallback = '') => {
  const text = safeVisibleText(value, fallback)
  const normalized = text.toLowerCase()
  return curationFeedbackTextBlockers.some((blocker) => normalized.includes(blocker.toLowerCase())) ? fallback : text
}

const isDisplayableCurationFeedbackSource = (value: unknown): value is DisplayableCurationFeedbackSource => {
  const source = sanitizeVisibleText(value).toLowerCase()
  return displayableCurationFeedbackSources.has(source as DisplayableCurationFeedbackSource)
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
    acceptContactRequest: raw?.acceptContactRequest ?? raw?.contactRequestSettings?.acceptContactRequest ?? raw?.contactRequestOpen ?? raw?.contactRequestsOpen,
    contactRequestPolicy: raw?.contactRequestPolicy ?? raw?.contactRequestSettings?.contactRequestPolicy,
    canStartContactRequest: raw?.canStartContactRequest,
    contactRequestReasonCode: raw?.contactRequestReasonCode,
    contactRequestReasonMessage: raw?.contactRequestReasonMessage,
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
    visibility: source?.visibility,
    postStatus: source?.postStatus,
    status: source?.status,
    deleted: Boolean(source?.deleted ?? source?.isDeleted ?? false),
    restricted: Boolean(source?.restricted ?? source?.isRestricted ?? false),
    riskLevel: source?.riskLevel,
    moderationStatus: source?.moderationStatus,
    recommendationReasons: (Array.isArray(raw?.recommendationReasons)
      ? raw.recommendationReasons
      : Array.isArray(source?.recommendationReasons)
        ? source.recommendationReasons
        : [])
      .map((item: unknown) => neutralizeHighRiskRecommendationReason(normalizeRecommendationReason(sanitizeVisibleText(item)), source))
      .filter(Boolean),
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
  const qualityBadges = Array.isArray(raw?.qualityBadges)
    ? raw.qualityBadges.map((item: unknown) => sanitizeVisibleText(item)).filter(Boolean)
    : []
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
    authorReply: Boolean(raw?.authorReply ?? false),
    authorPinned: Boolean(raw?.authorPinned ?? false),
    featured: Boolean(raw?.featured ?? false),
    helpfulCount: Number(raw?.helpfulCount ?? 0),
    myHelpful: Boolean(raw?.myHelpful ?? false),
    hotScore: Number(raw?.hotScore ?? 0),
    folded: Boolean(raw?.folded ?? false),
    foldReason: sanitizeVisibleText(raw?.foldReason) || undefined,
    qualityBadges,
    canDelete: Boolean(raw?.canDelete ?? false),
    replyCount: Number(raw?.replyCount ?? raw?.replies?.length ?? 0),
    hasMoreReplies: Boolean(raw?.hasMoreReplies ?? false),
    repliesNextCursor: raw?.repliesNextCursor == null ? undefined : String(raw.repliesNextCursor),
    createdAt: adaptTime(raw?.createdAt ?? raw?.createTime),
    replies: Array.isArray(raw?.replies) ? raw.replies.map(adaptComment) : undefined,
  }
}

function normalizeOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'y'].includes(text)) return true
    if (['false', '0', 'no', 'n'].includes(text)) return false
  }
  return Boolean(value)
}

function adaptReportReceiptFields(raw: any, fallbackStatus: unknown) {
  const userStatus = normalizeUserReportStatus(
    raw?.userStatus
      ?? raw?.reportUserStatus
      ?? raw?.receiptStatus
      ?? raw?.reportStatus
      ?? raw?.status
      ?? fallbackStatus,
  )
  return {
    userStatus,
    reporterNotified: normalizeOptionalBoolean(
      raw?.reporterNotified
        ?? raw?.reporterNotificationSent
        ?? raw?.notificationSent
        ?? raw?.receiptNotified
        ?? raw?.notified,
    ),
    reporterReceiptText: safeVisibleText(
      raw?.reporterReceiptText
        ?? raw?.userReceiptText
        ?? raw?.resultText
        ?? raw?.userResultText,
      userReportStatusText[userStatus],
    ),
  }
}

export function adaptPostReport(raw: any): PostReport {
  const receiptFields = adaptReportReceiptFields(raw, raw?.reportStatus ?? raw?.status)
  return {
    reportId: adaptId(raw?.reportId ?? raw?.id),
    postId: adaptId(raw?.postId),
    postTitle: sanitizeVisibleText(raw?.postTitle) || undefined,
    postSummary: sanitizeVisibleText(raw?.postSummary) || undefined,
    reporterUid: raw?.reporterUid ? adaptId(raw.reporterUid) : undefined,
    reason: safeVisibleText(raw?.reason ?? raw?.reasonType, '举报原因编码异常'),
    detail: sanitizeVisibleText(raw?.detail ?? raw?.reasonText),
    reportStatus: raw?.reportStatus ?? raw?.status,
    userStatus: receiptFields.userStatus,
    reporterNotified: receiptFields.reporterNotified,
    reporterReceiptText: receiptFields.reporterReceiptText,
    reviewerUid: raw?.reviewerUid ? adaptId(raw.reviewerUid) : undefined,
    reviewNote: sanitizeVisibleText(raw?.reviewNote ?? raw?.reviewRemark ?? raw?.remark),
    createTime: raw?.createTime ?? raw?.createdAt,
    reviewTime: raw?.reviewTime ?? raw?.updatedAt,
  }
}

export function adaptCommentReport(raw: any): CommentReport {
  const receiptFields = adaptReportReceiptFields(raw, raw?.reportStatus ?? raw?.status)
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
    userStatus: receiptFields.userStatus,
    reporterNotified: receiptFields.reporterNotified,
    reporterReceiptText: receiptFields.reporterReceiptText,
    reviewerUid: raw?.reviewerUid ? adaptId(raw.reviewerUid) : undefined,
    reviewNote: sanitizeVisibleText(raw?.reviewNote ?? raw?.reviewRemark ?? raw?.remark),
    createTime: raw?.createTime ?? raw?.createdAt,
    reviewTime: raw?.reviewTime ?? raw?.updatedAt,
  }
}

const userReportStatuses: ReadonlySet<UserReportStatus> = new Set([
  'PROCESSING',
  'ACTION_TAKEN',
  'NOT_ACCEPTED',
  'CLOSED',
])

const userReportStatusText: Record<UserReportStatus, string> = {
  PROCESSING: '平台已收到，正在处理。',
  ACTION_TAKEN: '平台已处理该内容。',
  NOT_ACCEPTED: '经复核，暂未发现明确违规。',
  CLOSED: '举报已处理完成。',
}

function normalizeUserReportStatus(value: unknown): UserReportStatus {
  const text = sanitizeVisibleText(value).toUpperCase()
  if (userReportStatuses.has(text as UserReportStatus)) return text as UserReportStatus
  const numeric = Number(value)
  if (numeric === 1) return 'ACTION_TAKEN'
  if (numeric === 2) return 'NOT_ACCEPTED'
  if (numeric === 3) return 'CLOSED'
  return 'PROCESSING'
}

function normalizeUserReportSourceType(value: unknown): UserReportSourceType {
  const text = sanitizeVisibleText(value).toUpperCase()
  if (text === 'COMMENT_REPORT' || text === 'COMMENT') return 'COMMENT_REPORT'
  if (text === 'CONTACT_REQUEST_REPORT' || text === 'CONTACT_REQUEST' || text === 'CONTACT') {
    return 'CONTACT_REQUEST_REPORT'
  }
  return 'POST_REPORT'
}

export function adaptUserReportReceipt(raw: any): UserReportReceipt {
  const sourceType = normalizeUserReportSourceType(raw?.sourceType ?? raw?.reportType ?? raw?.type)
  const userStatus = normalizeUserReportStatus(raw?.userStatus ?? raw?.reportStatus ?? raw?.status)
  const reportId = adaptId(raw?.reportId ?? raw?.id)
  const postId = raw?.postId == null ? undefined : adaptId(raw.postId)
  const targetId = adaptId(raw?.targetId ?? (sourceType === 'COMMENT_REPORT' ? raw?.commentId : raw?.postId) ?? reportId)
  const targetAvailable = raw?.targetAvailable === undefined || raw?.targetAvailable === null
    ? true
    : Boolean(raw.targetAvailable)
  const targetPath = safeSameSitePath(raw?.targetPath)
    ?? safeSameSitePath(raw?.jumpPath)
    ?? (targetAvailable && postId ? `/post/${postId}` : undefined)
  const reviewTime = raw?.reviewTime ?? raw?.reviewedAt ?? raw?.updatedAt
  return {
    reportId,
    sourceType,
    targetId,
    postId,
    targetTitle: sanitizeVisibleText(raw?.targetTitle ?? raw?.postTitle ?? raw?.title) || undefined,
    targetSummary: sanitizeVisibleText(raw?.targetSummary ?? raw?.postSummary ?? raw?.commentSummary ?? raw?.summary) || undefined,
    reason: safeVisibleText(raw?.reason ?? raw?.reasonType, '举报原因已记录'),
    detail: sanitizeVisibleText(raw?.detail ?? raw?.reasonText) || undefined,
    userStatus,
    resultText: safeVisibleText(raw?.resultText ?? raw?.userResultText, userReportStatusText[userStatus]),
    targetPath,
    createTime: raw?.createTime ?? raw?.createdAt,
    reviewTime,
    createdAt: adaptTime(raw?.createdAt ?? raw?.createTime),
    reviewedAt: reviewTime ? adaptTime(reviewTime) : undefined,
    targetAvailable,
  }
}

function adaptOptionalUser(raw: any, fallbackUid: any, fallbackName: any): User | undefined {
  if (raw && typeof raw === 'object') return adaptUser(raw)
  const uid = fallbackUid ?? raw
  if (uid === undefined || uid === null || uid === '') return undefined
  return {
    uid: adaptId(uid),
    nickname: safeVisibleText(fallbackName, '未知用户'),
    avatar: '',
    signature: '',
    createdAt: Date.now(),
  }
}

function contactRequestUserId(user: any, fallback: any): ApiId {
  if (fallback !== undefined && fallback !== null && fallback !== '') return adaptId(fallback)
  if (user && typeof user === 'object') return adaptId(user.uid ?? user.id)
  return adaptId(user)
}

function normalizeContactRequestStatus(value: unknown): string {
  const status = sanitizeVisibleText(value).toUpperCase()
  return status || 'PENDING'
}

function normalizeContactRequestPolicy(value: unknown, enabled: boolean): string {
  if (!enabled) return 'off'
  const policy = sanitizeVisibleText(value).toLowerCase()
  if (['all', 'following', 'mutual', 'off'].includes(policy)) return policy
  return 'following'
}

export function adaptContactRequest(raw: any): ContactRequest {
  const requesterUid = contactRequestUserId(raw?.requester, raw?.requesterUid)
  const receiverUid = contactRequestUserId(raw?.receiver, raw?.receiverUid)
  const requester = adaptOptionalUser(raw?.requester, requesterUid, raw?.requesterName ?? raw?.requesterNickname)
  const receiver = adaptOptionalUser(raw?.receiver, receiverUid, raw?.receiverName ?? raw?.receiverNickname)
  const createTime = raw?.createTime ?? raw?.createdAt
  const updateTime = raw?.updateTime ?? raw?.updatedAt
  return {
    requestId: adaptId(raw?.requestId ?? raw?.id),
    requesterUid,
    requesterName: sanitizeVisibleText(raw?.requesterName ?? raw?.requesterNickname ?? requester?.nickname) || undefined,
    requester,
    receiverUid,
    receiverName: sanitizeVisibleText(raw?.receiverName ?? raw?.receiverNickname ?? receiver?.nickname) || undefined,
    receiver,
    sourceType: sanitizeVisibleText(raw?.sourceType ?? raw?.source_type ?? 'profile').toLowerCase() || 'profile',
    sourceId: raw?.sourceId === undefined && raw?.source_id === undefined ? undefined : adaptId(raw?.sourceId ?? raw?.source_id),
    scene: sanitizeVisibleText(raw?.scene).toLowerCase() || 'ask',
    messagePreview: safeVisibleText(raw?.messagePreview ?? raw?.message ?? raw?.content, ''),
    requestStatus: normalizeContactRequestStatus(raw?.requestStatus ?? raw?.status),
    createTime,
    updateTime,
    receiverActionTime: raw?.receiverActionTime ?? raw?.actionTime,
    expireTime: raw?.expireTime ?? raw?.expiredAt,
    createdAt: adaptTime(createTime),
    updatedAt: adaptTime(updateTime ?? createTime),
  }
}

export function adaptContactRequestSettings(raw: any): ContactRequestSettings {
  const acceptContactRequest = raw?.acceptContactRequest !== undefined && raw?.acceptContactRequest !== null
    ? Boolean(raw.acceptContactRequest)
    : sanitizeVisibleText(raw?.contactRequestPolicy).toLowerCase() !== 'off'
  return {
    acceptContactRequest,
    contactRequestPolicy: normalizeContactRequestPolicy(raw?.contactRequestPolicy ?? raw?.policy, acceptContactRequest),
    dailyLimit: Number(raw?.dailyLimit ?? raw?.contactRequestDailyLimit ?? 0),
  }
}

export function adaptContactRequestStats(raw: any): ContactRequestStats {
  return {
    inboxTotal: Number(raw?.inboxTotal ?? 0),
    inboxPending: Number(raw?.inboxPending ?? 0),
    inboxAccepted: Number(raw?.inboxAccepted ?? 0),
    inboxRejected: Number(raw?.inboxRejected ?? 0),
    inboxIgnored: Number(raw?.inboxIgnored ?? 0),
    inboxReported: Number(raw?.inboxReported ?? 0),
    inboxCancelled: Number(raw?.inboxCancelled ?? 0),
    inboxExpired: Number(raw?.inboxExpired ?? 0),
    outboxTotal: Number(raw?.outboxTotal ?? 0),
    outboxPending: Number(raw?.outboxPending ?? 0),
    outboxAccepted: Number(raw?.outboxAccepted ?? 0),
    outboxRejected: Number(raw?.outboxRejected ?? 0),
    outboxIgnored: Number(raw?.outboxIgnored ?? 0),
    outboxReported: Number(raw?.outboxReported ?? 0),
    outboxCancelled: Number(raw?.outboxCancelled ?? 0),
    outboxExpired: Number(raw?.outboxExpired ?? 0),
  }
}

export function adaptNotification(raw: any): Notification {
  const content = typeof raw?.content === 'object' && raw.content ? { ...raw.content } : {}
  const type = raw?.type ?? 'system'
  const action = String(content.action || raw?.action || '')
  if (action && !content.action) content.action = action
  if (action === 'report_receipt') {
    for (const key of ['sourceType', 'reportId', 'userStatus', 'reportStatus', 'status', 'resultText', 'userResultText']) {
      if (content[key] === undefined && raw?.[key] !== undefined) content[key] = raw[key]
    }
  }
  if (isContactRequestAction(action)) {
    for (const key of ['requestId', 'contactRequestId', 'id', 'requester', 'requesterUid', 'receiver', 'receiverUid', 'status', 'requestStatus']) {
      if (content[key] === undefined && raw?.[key] !== undefined) content[key] = raw[key]
    }
  }
  const discussionFollowAction = isDiscussionFollowAction(action)
  const reportReceiptAction = action === 'report_receipt'
  const contactRequestAction = isContactRequestAction(action)
  const curationFeedback = adaptNotificationCurationFeedback(content)
  const aggregateCount = Number((raw?.aggregateCount ?? content.aggregateCount) || 0)
  const unreadCount = Number(raw?.unreadCount ?? content.unreadCount ?? ((raw?.read ?? raw?.isRead) ? 0 : 1))
  const targetId = contactRequestAction
    ? content.requestId ?? content.contactRequestId ?? content.id
    : reportReceiptAction
    ? content.reportId ?? content.targetId
    : content.postId ?? content.commentId ?? content.userId ?? content.targetId
  const targetType = Number(content.targetType)
  const postId = content.postId ?? (
    discussionFollowAction
      ? content.targetPostId ?? content.targetId
      : undefined
  ) ?? (
    (type === 'system' && action === 'topic_post_published')
      || (['like', 'favorite', 'mention'].includes(type) && targetType === 1)
      ? content.targetId
      : undefined
  )
  const userId = type === 'follower' ? content.userId ?? senderUserId(raw?.sender) : undefined
  const targetPath = safeSameSitePath(raw?.targetPath)
    ?? safeSameSitePath(raw?.jumpPath)
    ?? curationFeedback?.href
    ?? safeSameSitePath(content.targetPath)
    ?? safeSameSitePath(content.jumpPath)
  const reportReceiptPath = reportReceiptAction ? reportReceiptNotificationPath(content) : undefined
  const contactRequestPath = contactRequestAction ? contactRequestNotificationPath(action) : undefined
  const sender = raw?.sender ? adaptUser(raw.sender) : undefined
  return {
    notificationId: adaptId(raw?.notificationId ?? raw?.id),
    notificationIds: Array.isArray(raw?.notificationIds) ? raw.notificationIds.map(adaptId) : undefined,
    type,
    action,
    title: notificationHeading(type, content, sender?.nickname, aggregateCount),
    content: notificationContent(type, content, sender?.nickname, aggregateCount),
    curationFeedback,
    sender,
    relatedId: targetId ? adaptId(targetId) : undefined,
    targetPath: reportReceiptPath ?? contactRequestPath ?? targetPath ?? (userId ? `/u/${adaptId(userId)}` : postId ? `/post/${adaptId(postId)}` : undefined),
    read: Boolean(raw?.read ?? raw?.isRead ?? false),
    aggregateCount: aggregateCount > 1 ? aggregateCount : undefined,
    unreadCount,
    createdAt: adaptTime(raw?.createdAt ?? raw?.createTime),
  }
}

const isCurationFeedbackPayload = (content: Record<string, any>) => {
  return ['creator_curation_feedback', 'curation_feedback', 'content_curation_feedback'].includes(String(content.action || ''))
}

function adaptNotificationCurationFeedback(content: Record<string, any>): CreatorCurationFeedback | undefined {
  if (!isCurationFeedbackPayload(content)) return undefined
  const contentId = adaptId(content.contentId ?? content.postId ?? content.targetId)
  const source = sanitizeVisibleText(content.source || 'operation-curation') || 'operation-curation'
  const displayableSource = isDisplayableCurationFeedbackSource(source) ? source : undefined
  if (!displayableSource) return undefined
  const href = safeSameSitePath(content.href)
    ?? safeSameSitePath(content.targetPath)
    ?? safeSameSitePath(content.jumpPath)
    ?? (contentId ? `/post/${contentId}` : undefined)
  return {
    eventId: adaptId(content.eventId ?? content.id ?? `${contentId}:${content.triggeredAt ?? content.createdAt ?? ''}`),
    contentId,
    contentTitle: safeCurationFeedbackText(content.contentTitle ?? content.postTitle ?? content.title, '公开内容标题暂未返回'),
    placementType: sanitizeVisibleText(content.placementType) || undefined,
    placementId: content.placementId == null ? undefined : adaptId(content.placementId),
    placementLabel: safeCurationFeedbackText(content.placementLabel ?? content.topicTitle ?? content.sectionTitle ?? content.slotName, '公开内容收录'),
    topicSlug: sanitizeVisibleText(content.topicSlug) || undefined,
    topicTitle: sanitizeVisibleText(content.topicTitle ?? content.topicName) || undefined,
    sectionKey: sanitizeVisibleText(content.sectionKey) || undefined,
    sectionTitle: sanitizeVisibleText(content.sectionTitle ?? content.sectionName) || undefined,
    reasonText: safeCurationFeedbackText(content.reasonText ?? content.curationReason ?? content.reason, '运营收录理由暂未返回'),
    href,
    triggeredAt: adaptTime(content.triggeredAt ?? content.createdAt ?? content.createTime),
    includedAt: adaptTime(content.triggeredAt ?? content.createdAt ?? content.createTime),
    status: 'active',
    source,
    displayableSource,
    publicMetrics: content.publicMetrics || content.metrics ? {
      viewCount: Number((content.publicMetrics ?? content.metrics)?.viewCount ?? 0),
      likeCount: Number((content.publicMetrics ?? content.metrics)?.likeCount ?? 0),
      favoriteCount: Number((content.publicMetrics ?? content.metrics)?.favoriteCount ?? 0),
      commentCount: Number((content.publicMetrics ?? content.metrics)?.commentCount ?? 0),
    } : undefined,
  }
}

function displayName(name?: string): string {
  return sanitizeVisibleText(name, '有人')
}

function senderUserId(sender?: any): string | undefined {
  if (!sender || typeof sender !== 'object') return undefined
  const rawId = sender.uid ?? sender.id
  return rawId == null ? undefined : adaptId(rawId)
}

const discussionFollowActionHeadings: Record<string, string> = {
  discussion_follow_comment: '你关注的讨论有新回复',
  discussion_follow_featured_reply: '你关注的讨论有精选回复',
  discussion_follow_author_pinned: '作者置顶了关键回应',
  discussion_follow_author_reply: '作者补充了新的回应',
}

const discussionFollowActionContents: Record<string, string> = {
  discussion_follow_comment: '你关注的讨论有了新的公开回复，点击回到原帖继续查看。',
  discussion_follow_featured_reply: '你关注的讨论有一条精选回复。',
  discussion_follow_author_pinned: '作者置顶了一条关键回应。',
  discussion_follow_author_reply: '作者补充了新的回应。',
}

const contactRequestActionHeadings: Record<string, string> = {
  contact_request_received: '收到联系请求',
  contact_request_accepted: '联系请求已被接受',
  contact_request_rejected: '联系请求已被拒绝',
}

const contactRequestActionContents: Record<string, string> = {
  contact_request_received: '有人发来了联系请求。',
  contact_request_accepted: '你的联系请求已被接受。',
  contact_request_rejected: '你的联系请求已被拒绝。',
}

function isDiscussionFollowAction(action: string): boolean {
  return Object.prototype.hasOwnProperty.call(discussionFollowActionHeadings, action)
}

function isContactRequestAction(action: string): boolean {
  return Object.prototype.hasOwnProperty.call(contactRequestActionHeadings, action)
}

function contactRequestNotificationPath(action: string): string {
  return action === 'contact_request_received'
    ? '/me/contact-requests?tab=inbox'
    : '/me/contact-requests?tab=outbox'
}

function reportReceiptNotificationPath(content: Record<string, any>): string {
  const reportId = content.reportId ?? content.targetId ?? content.id
  if (reportId === undefined || reportId === null || reportId === '') return '/me/reports'
  const sourceType = normalizeUserReportSourceType(content.sourceType ?? content.reportType ?? content.type)
  return `/me/reports/${encodeURIComponent(sourceType)}/${encodeURIComponent(String(adaptId(reportId)))}`
}

function notificationHeading(type: string, content: Record<string, any>, senderName?: string, aggregateCount = 0): string {
  const contactRequestHeading = contactRequestActionHeadings[String(content.action || '')]
  if (contactRequestHeading) return contactRequestHeading
  const discussionHeading = discussionFollowActionHeadings[String(content.action || '')]
  if (discussionHeading) return discussionHeading
  if (type === 'system' && content.action === 'report_receipt') return '举报处理结果'
  if (type === 'system' && isCurationFeedbackPayload(content)) return '公开内容入选反馈'
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
  const contactRequestContent = contactRequestActionContents[String(content.action || '')]
  if (contactRequestContent) return contactRequestContent
  const discussionContent = discussionFollowActionContents[String(content.action || '')]
  if (discussionContent) return discussionContent
  if (type === 'system' && content.action === 'report_receipt') {
    const userStatus = normalizeUserReportStatus(content.userStatus ?? content.reportStatus ?? content.status)
    return safeVisibleText(content.resultText ?? content.userResultText, userReportStatusText[userStatus])
  }
  if (type === 'system' && isCurationFeedbackPayload(content)) {
    const contentTitle = safeCurationFeedbackText(content.contentTitle ?? content.postTitle ?? content.title, '公开内容标题暂未返回')
    const placementLabel = safeCurationFeedbackText(content.placementLabel ?? content.topicTitle ?? content.sectionTitle ?? content.slotName, '公开内容收录')
    return contentTitle && placementLabel
      ? `《${contentTitle}》已收录到 ${placementLabel}。`
      : '你的公开内容有新的收录反馈。'
  }
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
