import type { MyAdminPermissions } from '@/api/ops'
import { isPublicPostVisible } from '@/utils/recommendationGovernance'

export type OpsOrchestrationAction = 'publish' | 'offline' | 'rollback'

export interface OpsOrchestrationActionPermissions {
  publish?: boolean
  offline?: boolean
  rollback?: boolean
}

export type OpsOrchestrationPermissions = MyAdminPermissions & {
  opsOrchestration?: OpsOrchestrationActionPermissions
  opsOrchestrationPublisher?: boolean
  opsOrchestrationOffline?: boolean
  opsOrchestrationRollback?: boolean
}

export interface ViewerFeedbackSignals {
  notInterestedPostIds?: Array<string | number>
  hiddenPostIds?: Array<string | number>
  blockedAuthorIds?: Array<string | number>
  hiddenAuthorIds?: Array<string | number>
  suppressedTopicIds?: Array<string | number>
  negativeFeedbackKeys?: string[]
}

export const FORBIDDEN_OPS_ORCHESTRATION_COPY = [
  '限时购买',
  '会员专享',
  '官方背书',
  '平台担保',
  '赞助推荐',
  '付费置顶',
  '权威认证',
  '保证有效',
  '商业合作',
] as const

export const FORBIDDEN_OPS_ORCHESTRATION_CAPABILITIES = [
  '广告位',
  '赞助位',
  '付费置顶',
  '商业推荐',
  '会员权益',
  '收益分成',
] as const

const forbiddenOpsCopyPattern = new RegExp([
  ...FORBIDDEN_OPS_ORCHESTRATION_COPY,
  ...FORBIDDEN_OPS_ORCHESTRATION_CAPABILITIES,
].join('|'), 'i')

const truthyFlag = (value: unknown) => value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true'
const normalizedKey = (value: unknown) => String(value ?? '').trim().toLowerCase()
const idSet = (values?: Array<string | number>) => new Set((values || []).map((value) => String(value)))

export const canAccessOpsOrchestrationAdmin = (permissions: MyAdminPermissions | null | undefined) => (
  Boolean(permissions?.admin)
)

export const canMutateOpsOrchestration = (
  permissions: OpsOrchestrationPermissions | null | undefined,
  action: OpsOrchestrationAction,
) => {
  if (!canAccessOpsOrchestrationAdmin(permissions)) return false
  if (!permissions?.ops) return false
  if (!permissions.opsOrchestration) return true
  if (action === 'publish') return Boolean(permissions.opsOrchestration?.publish || permissions.opsOrchestrationPublisher)
  if (action === 'offline') return Boolean(permissions.opsOrchestration?.offline || permissions.opsOrchestrationOffline)
  if (action === 'rollback') return Boolean(permissions.opsOrchestration.rollback || permissions.opsOrchestrationRollback)
  return false
}

export const isOpsOrchestrationCopyAllowed = (value: unknown) => (
  !forbiddenOpsCopyPattern.test(String(value ?? ''))
)

export const assertOpsOrchestrationCopyAllowed = (value: unknown) => {
  if (isOpsOrchestrationCopyAllowed(value)) return String(value ?? '')
  return ''
}

export const isDemoFallbackMarkedExample = (item: any) => {
  if (!item || typeof item !== 'object') return false
  const values = [
    item.source,
    item.provider,
    item.fallbackReason,
    item.message,
    item.extension?.source,
    item.extension?.fallbackReason,
  ].map(normalizedKey)
  const isDemoOrFallback = truthyFlag(item.degraded)
    || truthyFlag(item.fallback)
    || truthyFlag(item.fallbackUsed)
    || truthyFlag(item.localOnly)
    || values.some((value) => value.includes('demo') || value.includes('fallback') || value.includes('local_demo'))
  if (!isDemoOrFallback) return true
  return truthyFlag(item.example)
    || truthyFlag(item.isExample)
    || truthyFlag(item.extension?.example)
    || String(item.exampleLabel || item.extension?.exampleLabel || '').includes('示例')
}

export const markOpsOrchestrationExample = <T extends Record<string, any>>(item: T, label = '示例数据'): T => ({
  ...item,
  example: true,
  exampleLabel: label,
})

export const isBlockedByViewerFeedback = (item: any, viewerSignals: ViewerFeedbackSignals = {}) => {
  if (!item || typeof item !== 'object') return false
  const postId = String(item.postId ?? item.id ?? item.itemId ?? item.sourceId ?? '')
  const authorId = String(item.author?.uid ?? item.authorId ?? item.uid ?? '')
  const topicId = String(item.topicId ?? item.topic?.id ?? item.domain ?? '')
  if (postId && (idSet(viewerSignals.notInterestedPostIds).has(postId) || idSet(viewerSignals.hiddenPostIds).has(postId))) return true
  if (authorId && (idSet(viewerSignals.blockedAuthorIds).has(authorId) || idSet(viewerSignals.hiddenAuthorIds).has(authorId))) return true
  if (topicId && idSet(viewerSignals.suppressedTopicIds).has(topicId)) return true
  const feedbackKeys = new Set((viewerSignals.negativeFeedbackKeys || []).map(normalizedKey))
  const itemFeedbackKeys = [
    item.feedbackKey,
    item.recommendationKey,
    item.recommendationReason,
    ...(Array.isArray(item.recommendationReasons) ? item.recommendationReasons : []),
  ].map(normalizedKey)
  return itemFeedbackKeys.some((key) => key && feedbackKeys.has(key))
}

export const isOpsOrchestrationDisplayEligible = (item: any, viewerSignals: ViewerFeedbackSignals = {}) => {
  if (!isPublicPostVisible(item)) return false
  if (isBlockedByViewerFeedback(item, viewerSignals)) return false
  if (!isDemoFallbackMarkedExample(item)) return false
  const copy = [
    item.title,
    item.summary,
    item.recommendationReason,
    ...(Array.isArray(item.recommendationReasons) ? item.recommendationReasons : []),
  ].join(' ')
  return isOpsOrchestrationCopyAllowed(copy)
}

export const filterOpsOrchestrationDisplayItems = <T>(
  items: T[] | undefined | null,
  viewerSignals: ViewerFeedbackSignals = {},
  limit?: number,
) => {
  const filtered = (items || []).filter((item) => isOpsOrchestrationDisplayEligible(item, viewerSignals))
  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered
}
