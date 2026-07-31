import type {
  CollaborationActionItem,
  CollaborationActionType,
  NeedContentFormat,
  NeedResolutionType,
  NeedSourceType,
  NeedStatus,
} from '@/api/collaboration'
import type { ApiId } from '@/api/types'

const statusLabels: Record<NeedStatus, string> = {
  OPEN: '待认领',
  CLAIMED: '进行中',
  SUBMITTED: '待验收',
  COMPLETED: '已完成',
  CLOSED: '已关闭',
  MERGED: '已合并',
}

const contentFormatLabels: Record<NeedContentFormat, string> = {
  ARTICLE: '文章',
  QUESTION: '问题',
  GUIDE: '指南',
  CHECKLIST: '清单',
  RESOURCE: '资源',
}

const sourceTypeLabels: Record<NeedSourceType, string> = {
  COMMUNITY: '社区需求',
  POST: '帖子',
  TOPIC: '专题',
  ACTIVITY: '活动',
  EXTERNAL: '外部来源',
  SEARCH_GAP: '搜索缺口',
}

const resolutionTypeLabels: Record<NeedResolutionType, string> = {
  POST: '帖子',
  QUESTION: '问题',
  SERIES: '合集',
}

const actionTypeLabels: Record<CollaborationActionType, string> = {
  NEED_SUBMIT: '待提交',
  NEED_REVISE: '待修改',
  NEED_REVIEW: '待验收',
  NEED_STALLED: '停滞处理',
  OFFICE_HOUR_REVIEW: 'Office Hour 待处理',
  CURATION_REVIEW: '策展审核',
  GOVERNANCE_REVIEW: '治理审核',
}

const actionTypeReasons: Record<CollaborationActionType, string> = {
  NEED_SUBMIT: '你认领的需求还没有提交公开交付。',
  NEED_REVISE: '最近一次交付被退回，需要修改后重新提交。',
  NEED_REVIEW: '你发起的需求有一份公开交付等待验收。',
  NEED_STALLED: '这项认领需求超过停滞阈值，建议确认是否继续推进。',
  OFFICE_HOUR_REVIEW: '你主持的 Office Hour 有待处理预约。',
  CURATION_REVIEW: '授权策展队列中有待处理建议。',
  GOVERNANCE_REVIEW: '授权治理队列中有待处理案件。',
}

const actionReasonCodeLabels: Record<string, string> = {
  NEED_READY_FOR_SUBMISSION: actionTypeReasons.NEED_SUBMIT,
  NEED_SUBMISSION_RETURNED_FOR_REVISION: actionTypeReasons.NEED_REVISE,
  NEED_SUBMISSION_AWAITS_REVIEW: actionTypeReasons.NEED_REVIEW,
  NEED_CLAIM_HAS_NO_RECENT_PROGRESS: actionTypeReasons.NEED_STALLED,
  OFFICE_HOUR_RESERVATION_AWAITS_REVIEW: actionTypeReasons.OFFICE_HOUR_REVIEW,
}

const actionSourceStatusLabels: Record<string, string> = {
  ...statusLabels,
  PENDING: '待处理',
  ACCEPTED: '已接受',
  REJECTED: '已拒绝',
  CANCELLED: '已取消',
  EXPIRED: '已过期',
}

const needMatchReasonLabels: Record<string, string> = {
  FILTER_DOMAIN_MATCH: '符合当前领域筛选',
  FILTER_CONTENT_FORMAT_MATCH: '符合当前内容形式筛选',
  FILTER_SOURCE_TYPE_MATCH: '符合当前来源筛选',
  PUBLIC_DOMAIN_CONTRIBUTION_MATCH: '与你公开贡献过的领域相关',
  PUBLIC_CONTENT_FORMAT_CONTRIBUTION_MATCH: '与你公开贡献过的内容形式相关',
}

export const labelNeedStatus = (value?: NeedStatus | string | null) => (
  value && value in statusLabels ? statusLabels[value as NeedStatus] : value || '状态待定'
)

export const labelNeedContentFormat = (value?: NeedContentFormat | string | null) => (
  value && value in contentFormatLabels
    ? contentFormatLabels[value as NeedContentFormat]
    : value || '形式待定'
)

export const labelNeedSourceType = (value?: NeedSourceType | string | null) => (
  value && value in sourceTypeLabels ? sourceTypeLabels[value as NeedSourceType] : value || '来源待定'
)

export const labelNeedResolutionType = (value?: NeedResolutionType | string | null) => (
  value && value in resolutionTypeLabels
    ? resolutionTypeLabels[value as NeedResolutionType]
    : value || '交付资源'
)

export const labelCollaborationActionType = (value?: CollaborationActionType | string | null) => (
  value && value in actionTypeLabels
    ? actionTypeLabels[value as CollaborationActionType]
    : value || '协作事项'
)

export const defaultCollaborationActionReason = (value?: CollaborationActionType | string | null) => (
  value && value in actionTypeReasons
    ? actionTypeReasons[value as CollaborationActionType]
    : '这项协作事项需要你确认下一步处理。'
)

export const collaborationActionReason = (
  item: Pick<CollaborationActionItem, 'actionType' | 'reason'>,
) => {
  const reason = String(item.reason || '').trim()
  if (!reason) return defaultCollaborationActionReason(item.actionType)
  if (reason in actionReasonCodeLabels) return actionReasonCodeLabels[reason]
  if (/^[A-Z][A-Z0-9_]+$/.test(reason)) return defaultCollaborationActionReason(item.actionType)
  return reason
}

export const labelCollaborationActionSourceStatus = (value?: string | null) => {
  const status = String(value || '').trim().toUpperCase()
  if (!status) return '状态待定'
  if (status in actionSourceStatusLabels) return actionSourceStatusLabels[status]
  return /^[A-Z][A-Z0-9_]+$/.test(status) ? '状态待确认' : String(value)
}

export const labelNeedMatchReason = (value?: string | null) => {
  const reason = String(value || '').trim()
  if (!reason) return '符合当前匹配条件'
  if (reason in needMatchReasonLabels) return needMatchReasonLabels[reason]
  return /^[A-Z][A-Z0-9_]+$/.test(reason) ? '符合当前匹配条件' : reason
}

export const collaborationActionKey = (
  item: Pick<CollaborationActionItem, 'actionType' | 'sourceType' | 'sourceId'>,
) => `${item.actionType}:${item.sourceType}:${item.sourceId}`

export const formatCollaborationDate = (value?: string | number | null) => {
  if (!value) return '时间待定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export const domainLabel = (domain: number | null | undefined, labels: Map<number, string> | Record<number, string> = {}) => {
  if (domain == null) return '领域待定'
  if (labels instanceof Map) return labels.get(Number(domain)) || `领域 ${domain}`
  return labels[Number(domain)] || `领域 ${domain}`
}

export const isSafeCollaborationPath = (value?: string | null) => {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return false
  if (/\s/.test(value) || /^\/(?:login|register)(?:[/?#]|$)/.test(value)) return false
  try {
    const url = new URL(value, 'https://wenye.local')
    return url.origin === 'https://wenye.local'
  } catch {
    return false
  }
}

export const isSafeCollaborationReturnPath = (value?: string | null) => (
  isSafeCollaborationPath(value)
  && (
    value === '/collaboration'
    || value?.startsWith('/collaboration/')
    || value?.startsWith('/me/collaboration')
  )
)

export const needDetailPath = (needId: ApiId) => `/collaboration/needs/${encodeURIComponent(String(needId))}`

export const deliveryPath = (resolutionType?: NeedResolutionType | string | null, resolutionId?: ApiId | null) => {
  if (resolutionId == null || resolutionId === '') return null
  const id = encodeURIComponent(String(resolutionId))
  if (resolutionType === 'QUESTION') return `/questions/${id}`
  if (resolutionType === 'SERIES') return `/collaboration/series/${id}`
  return `/post/${id}`
}

export const actionTargetPath = (item: Pick<CollaborationActionItem, 'targetPath' | 'sourceType' | 'sourceId'>) => {
  if (isSafeCollaborationPath(item.targetPath)) return item.targetPath as string
  if (String(item.sourceType).toUpperCase() === 'NEED') return needDetailPath(item.sourceId)
  return null
}
