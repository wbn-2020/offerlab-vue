export const ME_PROFILE_TABS = [
  'posts',
  'favorites',
  'liked',
  'following',
  'topics',
  'discussion-follows',
  'followers',
] as const

export type MeProfileTab = typeof ME_PROFILE_TABS[number]

export const COLLABORATION_ACTION_ORDER = [
  'NEED_REVISE',
  'NEED_SUBMIT',
  'NEED_REVIEW',
  'NEED_STALLED',
  'OFFICE_HOUR_REVIEW',
  'CURATION_REVIEW',
  'GOVERNANCE_REVIEW',
] as const

export type ParticipationCollaborationActionType = typeof COLLABORATION_ACTION_ORDER[number]

export const KNOWLEDGE_ACTION_ORDER = [
  'SUGGESTION_RESPONSE',
  'STALE_SUGGESTION',
  'FRESHNESS_CONFIRMATION',
  'REFERENCE_REVIEW',
  'RELATION_REVIEW',
  'OUTCOME_REVISIT',
  'MAINTENANCE_TASK',
] as const

export type ParticipationKnowledgeActionType = typeof KNOWLEDGE_ACTION_ORDER[number]

export const MAINTENANCE_STATUS_ORDER = [
  'CLAIMED',
  'SUBMITTED',
  'OPEN',
  'COMPLETED',
  'CLOSED',
] as const

export type ParticipationMaintenanceStatus = typeof MAINTENANCE_STATUS_ORDER[number]

export const NOTIFICATION_TYPE_ORDER = [
  'like',
  'comment',
  'favorite',
  'follower',
  'mention',
  'system',
] as const

export type ParticipationNotificationType = typeof NOTIFICATION_TYPE_ORDER[number]

export const UPDATE_DIGEST_SOURCE_TYPES = [
  'POST',
  'TOPIC',
  'NEED',
  'COLLECTION',
  'SERIES',
] as const

export type ParticipationUpdateDigestSourceType = typeof UPDATE_DIGEST_SOURCE_TYPES[number]
export type ParticipationRevisitStatus = 'OPEN'
export type ParticipationRelationshipMode = 'ACTIVE' | 'MUTED'
export type ParticipationReportFilter = 'pending' | 'processed' | 'unaccepted'

export const REPORT_FILTER_BY_STATUS = {
  PROCESSING: 'pending',
  ACTION_TAKEN: 'processed',
  NOT_ACCEPTED: 'unaccepted',
} as const satisfies Record<string, ParticipationReportFilter>

export interface ParticipationNavigationTarget {
  path: string
  query?: Record<string, string>
}

export interface UpdateDigestFocus {
  sourceType: ParticipationUpdateDigestSourceType
  sourceId: string
}

type CountRecord<Key extends string> = Partial<Record<Key, unknown>>
type PreviewItem = { status?: unknown }
type UpdateDigestPreviewItem = { sourceType?: unknown; sourceId?: unknown }
type RelationshipSummaryLike = { active?: unknown; muted?: unknown }
type ReportPreviewItem = { userStatus?: unknown }

const meProfileTabSet = new Set<string>(ME_PROFILE_TABS)
const collaborationActionSet = new Set<string>(COLLABORATION_ACTION_ORDER)
const knowledgeActionSet = new Set<string>(KNOWLEDGE_ACTION_ORDER)
const maintenanceStatusSet = new Set<string>(MAINTENANCE_STATUS_ORDER)
const notificationTypeSet = new Set<string>(NOTIFICATION_TYPE_ORDER)
const updateDigestSourceTypeSet = new Set<string>(UPDATE_DIGEST_SOURCE_TYPES)
const relationshipModeSet = new Set<string>(['ACTIVE', 'MUTED'])
const reportFilterSet = new Set<string>(['pending', 'processed', 'unaccepted'])

const firstValue = (value: unknown) => Array.isArray(value) ? value[0] : value

const normalizedString = (value: unknown) => String(firstValue(value) ?? '').trim()

const positiveCount = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : 0
  }
  if (typeof value === 'bigint') {
    return value > 0n ? Number(value) : 0
  }
  const text = String(value ?? '').trim()
  if (!/^\d+$/.test(text)) return 0
  const parsed = Number(text)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

const safeUpdateDigestSourceId = (value: unknown) => {
  const text = String(value ?? '').trim()
  return /^[A-Za-z0-9._:-]{1,80}$/.test(text) ? text : ''
}

const selectFirstPositiveCount = <Value extends string>(
  order: readonly Value[],
  counts?: CountRecord<Value> | null,
) => order.find((value) => positiveCount(counts?.[value]) > 0)

export const normalizeMeTab = (value: unknown): MeProfileTab => {
  const normalized = normalizedString(value).toLowerCase()
  return meProfileTabSet.has(normalized) ? normalized as MeProfileTab : 'posts'
}

export const nextRovingTabValue = <Value extends string>(
  values: readonly Value[],
  currentValue: Value | string,
  key: string,
): Value | null => {
  if (values.length === 0) return null

  const currentIndex = values.indexOf(currentValue as Value)
  const resolvedIndex = currentIndex >= 0 ? currentIndex : 0
  if (key === 'ArrowLeft') return values[(resolvedIndex - 1 + values.length) % values.length] ?? null
  if (key === 'ArrowRight') return values[(resolvedIndex + 1) % values.length] ?? null
  if (key === 'Home') return values[0] ?? null
  if (key === 'End') return values[values.length - 1] ?? null
  return null
}

export const selectCollaborationActionType = (
  counts?: CountRecord<ParticipationCollaborationActionType> | null,
) => selectFirstPositiveCount(COLLABORATION_ACTION_ORDER, counts)

export const buildCollaborationTarget = (
  actionType?: ParticipationCollaborationActionType | string | null,
): ParticipationNavigationTarget => {
  const normalized = normalizedString(actionType).toUpperCase()
  return collaborationActionSet.has(normalized)
    ? { path: '/me/collaboration', query: { actionType: normalized } }
    : { path: '/me/collaboration' }
}

export const collaborationActionLabel = (
  actionType?: ParticipationCollaborationActionType | null,
) => {
  const labels: Record<ParticipationCollaborationActionType, string> = {
    NEED_REVISE: '处理待修改',
    NEED_SUBMIT: '处理待提交',
    NEED_REVIEW: '处理待验收',
    NEED_STALLED: '处理停滞事项',
    OFFICE_HOUR_REVIEW: '处理 Office Hour 预约',
    CURATION_REVIEW: '处理策展审核',
    GOVERNANCE_REVIEW: '处理治理审核',
  }
  return actionType ? labels[actionType] : '查看协作行动'
}

export const selectKnowledgeActionType = (
  counts?: CountRecord<ParticipationKnowledgeActionType> | null,
) => selectFirstPositiveCount(KNOWLEDGE_ACTION_ORDER, counts)

export const buildKnowledgeTarget = (
  actionType?: ParticipationKnowledgeActionType | string | null,
): ParticipationNavigationTarget => {
  const normalized = normalizedString(actionType).toUpperCase()
  return knowledgeActionSet.has(normalized)
    ? { path: '/me/knowledge', query: { tab: 'queue', type: normalized } }
    : { path: '/me/knowledge' }
}

export const knowledgeActionLabel = (
  actionType?: ParticipationKnowledgeActionType | null,
) => {
  const labels: Record<ParticipationKnowledgeActionType, string> = {
    SUGGESTION_RESPONSE: '回应内容建议',
    STALE_SUGGESTION: '复核旧版本建议',
    FRESHNESS_CONFIRMATION: '确认内容时效',
    REFERENCE_REVIEW: '复核内容来源',
    RELATION_REVIEW: '审核知识关系',
    OUTCOME_REVISIT: '处理实践回访',
    MAINTENANCE_TASK: '处理维护任务',
  }
  return actionType ? labels[actionType] : '查看知识维护'
}

export const selectMaintenanceStatus = (
  items?: readonly PreviewItem[] | null,
): ParticipationMaintenanceStatus | undefined => MAINTENANCE_STATUS_ORDER.find((status) => (
  items?.some((item) => normalizedString(item.status).toUpperCase() === status)
))

export const buildMaintenanceTarget = (
  status?: ParticipationMaintenanceStatus | string | null,
): ParticipationNavigationTarget => {
  const normalized = normalizedString(status).toUpperCase()
  return maintenanceStatusSet.has(normalized)
    ? { path: '/me/maintenance', query: { status: normalized } }
    : { path: '/me/maintenance' }
}

export const maintenanceActionLabel = (
  status?: ParticipationMaintenanceStatus | null,
) => {
  const labels: Record<ParticipationMaintenanceStatus, string> = {
    CLAIMED: '继续处理任务',
    SUBMITTED: '查看待审核任务',
    OPEN: '查看待领取任务',
    COMPLETED: '查看已完成任务',
    CLOSED: '查看已关闭任务',
  }
  return status ? labels[status] : '查看维护任务'
}

export const selectNotificationType = (
  counts?: CountRecord<ParticipationNotificationType> | null,
): ParticipationNotificationType | undefined => {
  let selected: ParticipationNotificationType | undefined
  let selectedCount = 0

  for (const type of NOTIFICATION_TYPE_ORDER) {
    const count = positiveCount(counts?.[type])
    if (count > selectedCount) {
      selected = type
      selectedCount = count
    }
  }

  return selected
}

export const buildNotificationTarget = (
  type?: ParticipationNotificationType | string | null,
): ParticipationNavigationTarget => {
  const normalized = normalizedString(type).toLowerCase()
  return notificationTypeSet.has(normalized)
    ? { path: '/me/notifications', query: { type: normalized } }
    : { path: '/me/notifications', query: { view: 'notifications' } }
}

export const notificationActionLabel = (
  type?: ParticipationNotificationType | null,
) => {
  const labels: Record<ParticipationNotificationType, string> = {
    like: '查看点赞通知',
    comment: '查看评论通知',
    favorite: '查看收藏通知',
    follower: '查看新增关注',
    mention: '查看提及通知',
    system: '查看系统通知',
  }
  return type ? labels[type] : '查看通知'
}

export const selectUpdateDigestFocus = (
  items?: readonly UpdateDigestPreviewItem[] | null,
): UpdateDigestFocus | undefined => {
  const first = items?.[0]
  if (!first) return undefined

  const sourceType = normalizedString(first.sourceType).toUpperCase()
  const sourceId = safeUpdateDigestSourceId(first.sourceId)
  if (!updateDigestSourceTypeSet.has(sourceType) || !sourceId) return undefined

  return {
    sourceType: sourceType as ParticipationUpdateDigestSourceType,
    sourceId,
  }
}

export const buildUpdateDigestTarget = (
  focus?: UpdateDigestFocus | null,
): ParticipationNavigationTarget => {
  const sourceType = normalizedString(focus?.sourceType).toUpperCase()
  const sourceId = safeUpdateDigestSourceId(focus?.sourceId)
  return updateDigestSourceTypeSet.has(sourceType) && sourceId
    ? {
        path: '/me/notifications',
        query: { view: 'updates', sourceType, sourceId },
      }
    : { path: '/me/notifications', query: { view: 'updates' } }
}

export const updateDigestActionLabel = (focus?: UpdateDigestFocus | null) => (
  focus ? '查看更新来源' : '查看更新摘要'
)

export const selectRevisitStatus = (
  items?: readonly PreviewItem[] | null,
): ParticipationRevisitStatus | undefined => items?.length ? 'OPEN' : undefined

export const buildRevisitTarget = (
  status?: ParticipationRevisitStatus | string | null,
): ParticipationNavigationTarget => (
  normalizedString(status).toUpperCase() === 'OPEN'
    ? { path: '/me/notifications', query: { view: 'revisits', status: 'OPEN' } }
    : { path: '/me/notifications', query: { view: 'revisits' } }
)

export const revisitActionLabel = (status?: ParticipationRevisitStatus | null) => (
  status === 'OPEN' ? '查看待回访事项' : '查看回访'
)

export const selectRelationshipMode = (
  summary?: RelationshipSummaryLike | null,
): ParticipationRelationshipMode | undefined => {
  if (positiveCount(summary?.active) > 0) return 'ACTIVE'
  if (positiveCount(summary?.muted) > 0) return 'MUTED'
  return undefined
}

export const buildRelationshipTarget = (
  mode?: ParticipationRelationshipMode | string | null,
): ParticipationNavigationTarget => {
  const normalized = normalizedString(mode).toUpperCase()
  return relationshipModeSet.has(normalized)
    ? { path: '/me/relationships', query: { mode: normalized } }
    : { path: '/me/relationships' }
}

export const relationshipActionLabel = (
  mode?: ParticipationRelationshipMode | null,
) => {
  const labels: Record<ParticipationRelationshipMode, string> = {
    ACTIVE: '查看活跃订阅',
    MUTED: '查看静音关系',
  }
  return mode ? labels[mode] : '查看关系与订阅'
}

export const selectReportFilter = (
  items?: readonly ReportPreviewItem[] | null,
): ParticipationReportFilter | undefined => {
  const userStatus = normalizedString(items?.[0]?.userStatus).toUpperCase()
  return REPORT_FILTER_BY_STATUS[userStatus as keyof typeof REPORT_FILTER_BY_STATUS]
}

export const buildReportsTarget = (
  filter?: ParticipationReportFilter | string | null,
): ParticipationNavigationTarget => {
  const normalized = normalizedString(filter).toLowerCase()
  return reportFilterSet.has(normalized)
    ? { path: '/me/reports', query: { filter: normalized } }
    : { path: '/me/reports' }
}

export const reportActionLabel = (
  filter?: ParticipationReportFilter | null,
) => {
  const labels: Record<ParticipationReportFilter, string> = {
    pending: '查看处理中回执',
    processed: '查看已处理回执',
    unaccepted: '查看未采纳回执',
  }
  return filter ? labels[filter] : '查看举报回执'
}
