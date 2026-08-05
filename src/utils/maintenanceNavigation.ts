import type { ProjectionIssue } from '@/api/projectionHealth'
import type { ChannelHealthReviewCandidate } from '@/api/channelHealthCandidates'
import type {
  ContentMaintenanceTaskCreateCmd,
  MaintenanceSourceType,
} from '@/api/contentMaintenance'

export interface MaintenanceNavigationTarget {
  path: string
  query: Record<string, string>
}

export interface MaintenancePermissionScope {
  canCreateGlobally: boolean
  moderatedDomains: readonly number[]
}

export interface MaintenanceTaskFormDraft {
  domain: number | ''
  sourceType: MaintenanceSourceType
  assigneeUid: string
  sourcePostId: string
  sourceRefId: string
  title: string
  detail: string
}

export interface MaintenanceTaskPrefill {
  domain: number | ''
  sourceType: MaintenanceSourceType
  sourcePostId: string
  sourceRefId: string
  title: string
  detail: string
}

export const MAINTENANCE_SOURCE_TYPES: readonly MaintenanceSourceType[] = Object.freeze([
    'CHANNEL_HEALTH',
    'SEARCH_GAP',
  'SUGGESTION',
  'FRESHNESS',
  'PROFILE_CONFIRMATION',
  'QUESTION',
    'MANUAL',
])

export const MANUAL_MAINTENANCE_SOURCE_TYPES: readonly Exclude<MaintenanceSourceType, 'CHANNEL_HEALTH'>[] =
  Object.freeze([
    'SEARCH_GAP',
    'SUGGESTION',
    'FRESHNESS',
    'PROFILE_CONFIRMATION',
    'QUESTION',
    'MANUAL',
  ])

export const DIAGNOSIS_SOURCE_TYPE_BY_ISSUE_TYPE: Readonly<Record<string, MaintenanceSourceType>> = Object.freeze({
  CONTENT_SUGGESTION_PENDING: 'SUGGESTION',
  POST_FRESHNESS_POSSIBLY_STALE: 'FRESHNESS',
  POST_FRESHNESS_AWAITING_CONFIRMATION: 'FRESHNESS',
  POST_REFERENCE_BROKEN: 'MANUAL',
  KNOWLEDGE_RELATION_PENDING: 'MANUAL',
  KNOWLEDGE_RELATION_TARGET_NOT_PUBLIC: 'MANUAL',
  POST_OUTCOME_REVISIT_DUE: 'MANUAL',
})

const DIAGNOSIS_TITLE_BY_ISSUE_TYPE: Readonly<Record<string, string>> = Object.freeze({
  CONTENT_SUGGESTION_PENDING: '处理待定内容建议',
  POST_FRESHNESS_POSSIBLY_STALE: '确认文章新鲜度',
  POST_FRESHNESS_AWAITING_CONFIRMATION: '确认文章新鲜度',
  POST_REFERENCE_BROKEN: '修复失效引用',
  KNOWLEDGE_RELATION_PENDING: '审核知识关系',
  KNOWLEDGE_RELATION_TARGET_NOT_PUBLIC: '修复知识关系目标',
  POST_OUTCOME_REVISIT_DUE: '跟进实践结果',
})

const cleanText = (value: unknown, maxLength: number) => (
  String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLength)
)

const MAX_SIGNED_LONG = 9_223_372_036_854_775_807n

export const normalizePositiveLongId = (value: unknown) => {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return ''
  if (typeof value !== 'number' && typeof value !== 'string') return ''
  const text = String(value).trim()
  if (!/^[1-9][0-9]*$/.test(text)) return ''
  try {
    return BigInt(text) <= MAX_SIGNED_LONG ? text : ''
  } catch {
    return ''
  }
}

export const isMaintenanceDomain = (value: unknown): value is number => (
  typeof value === 'number'
  && Number.isInteger(value)
  && value >= 1
  && value <= 5
)

export const normalizeMaintenanceTitle = (value: string) => (
  value.replace(/\s+/g, ' ').trim()
)

export const normalizeMaintenanceDetail = (value: string) => (
  value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
)

const queryText = (value: unknown) => typeof value === 'string' ? value : ''

const hasOwn = <T>(record: Readonly<Record<string, T>>, key: string) => (
  Object.prototype.hasOwnProperty.call(record, key)
)

const sourceTypeFor = (issueType: string): MaintenanceSourceType => (
  hasOwn(DIAGNOSIS_SOURCE_TYPE_BY_ISSUE_TYPE, issueType)
    ? DIAGNOSIS_SOURCE_TYPE_BY_ISSUE_TYPE[issueType]
    : 'MANUAL'
)

const titleFor = (issueType: string) => (
  hasOwn(DIAGNOSIS_TITLE_BY_ISSUE_TYPE, issueType)
    ? DIAGNOSIS_TITLE_BY_ISSUE_TYPE[issueType]
    : '处理知识生命周期诊断问题'
)

export const canCreateMaintenanceFromProjectionIssue = (
  issue: ProjectionIssue,
  scope: MaintenancePermissionScope,
) => (
  issue.projectionType === 'KNOWLEDGE_LIFECYCLE'
  && (
    scope.canCreateGlobally
    || (
      isMaintenanceDomain(issue.domain)
      && scope.moderatedDomains.includes(issue.domain)
    )
  )
)

export const normalizeMaintenanceTaskPrefill = (
  query: Record<string, unknown>,
): MaintenanceTaskPrefill => {
  const domainText = queryText(query.domain)
  const domain = /^[1-5]$/.test(domainText) ? Number(domainText) : ''
  const sourceTypeText = queryText(query.sourceType)
  const sourceType = MANUAL_MAINTENANCE_SOURCE_TYPES.includes(
    sourceTypeText as Exclude<MaintenanceSourceType, 'CHANNEL_HEALTH'>,
  )
    ? sourceTypeText as Exclude<MaintenanceSourceType, 'CHANNEL_HEALTH'>
    : 'MANUAL'
  return {
    domain,
    sourceType,
    sourcePostId: domain === '' ? '' : normalizePositiveLongId(queryText(query.sourcePostId)),
    sourceRefId: normalizePositiveLongId(queryText(query.sourceRefId)),
    title: normalizeMaintenanceTitle(queryText(query.title)).slice(0, 160),
    detail: normalizeMaintenanceDetail(queryText(query.detail)).slice(0, 2000),
  }
}

export const buildMaintenanceCreateCommand = (
  draft: MaintenanceTaskFormDraft,
): ContentMaintenanceTaskCreateCmd | null => {
  if (!isMaintenanceDomain(draft.domain)
    || !MANUAL_MAINTENANCE_SOURCE_TYPES.includes(
      draft.sourceType as Exclude<MaintenanceSourceType, 'CHANNEL_HEALTH'>,
    )) return null
  const assigneeUid = normalizePositiveLongId(draft.assigneeUid)
  const sourcePostId = normalizePositiveLongId(draft.sourcePostId)
  const sourceRefId = normalizePositiveLongId(draft.sourceRefId)
  const title = normalizeMaintenanceTitle(draft.title)
  const detail = normalizeMaintenanceDetail(draft.detail)
  if (!assigneeUid
    || (draft.sourcePostId.trim() && !sourcePostId)
    || (draft.sourceRefId.trim() && !sourceRefId)
    || title.length < 2
    || title.length > 160
    || detail.length < 5
    || detail.length > 2000) return null
  return {
    domain: draft.domain,
    sourceType: draft.sourceType,
    assigneeUid,
    sourcePostId: sourcePostId || undefined,
    sourceRefId: sourceRefId || undefined,
    title,
    detail,
  }
}

export const buildMaintenanceTaskFromIssueTarget = (
  issue: ProjectionIssue,
): MaintenanceNavigationTarget => {
  const issueType = cleanText(issue.issueType, 80)
  const query: Record<string, string> = {
    sourceType: sourceTypeFor(issueType),
    title: normalizeMaintenanceTitle(titleFor(issueType)).slice(0, 160),
  }
  const domain = isMaintenanceDomain(issue.domain) ? issue.domain : null
  const relatedPostId = normalizePositiveLongId(issue.relatedPostId)
  const sourceRefId = normalizePositiveLongId(issue.issueId)

  if (domain != null) query.domain = String(domain)
  if (domain != null && relatedPostId) query.sourcePostId = relatedPostId
  if (sourceRefId) query.sourceRefId = sourceRefId

  const summary = cleanText(issue.summary, 1400)
  const subjectType = cleanText(issue.subjectType, 80)
  const subjectId = cleanText(issue.subjectId, 80)
  const detectedAt = cleanText(issue.detectedAt, 80)
  query.detail = normalizeMaintenanceDetail([
    summary,
    `诊断类型：${issueType || 'UNKNOWN'}`,
    subjectType || subjectId ? `诊断对象：${subjectType} ${subjectId}`.trim() : '',
    detectedAt ? `检测时间：${detectedAt}` : '',
  ].filter(Boolean).join('\n')).slice(0, 2000)

  return {
    path: '/admin/content-maintenance',
    query,
  }
}

export const buildMaintenanceTaskFromChannelHealthCandidateTarget = (
  candidate: ChannelHealthReviewCandidate,
): MaintenanceNavigationTarget | null => {
  if (
    !isMaintenanceDomain(candidate.domain)
    || candidate.sourceType !== 'CHANNEL_HEALTH'
    || candidate.lifecycleState !== 'READY'
    || candidate.actionable !== true
  ) return null
  const sourcePostId = normalizePositiveLongId(candidate.sourcePostId)
  const sourceRefId = normalizePositiveLongId(candidate.sourceRefId)
  const title = normalizeMaintenanceTitle(candidate.title).slice(0, 160)
  const detail = normalizeMaintenanceDetail(candidate.detail).slice(0, 2000)
  if (!sourcePostId || !sourceRefId || title.length < 2 || detail.length < 5) return null
  return null
}
