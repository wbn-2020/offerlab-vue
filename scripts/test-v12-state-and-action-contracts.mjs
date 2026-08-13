import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const notifications = read('src/views/NotificationsView.vue')
const collaborationList = read('src/components/collaboration/CollaborationActionList.vue')
const knowledgeApi = read('src/api/knowledgeMaintenance.ts')
const knowledgeView = read('src/views/KnowledgeMaintenanceView.vue')
const maintenanceView = read('src/views/MaintenanceTasksView.vue')
const reportsView = read('src/views/MyReportsView.vue')
const profile = read('src/views/MeProfileView.vue')
const relationshipWorkspace = read('src/composables/useRelationshipWorkspace.ts')
const accessibleDialog = read('src/composables/useAccessibleDialog.ts')

assert.match(notifications, /const clearNotificationListState = \(\) => \{[\s\S]*notifications\.value = \[\][\s\S]*nextCursor\.value = undefined[\s\S]*hasMore\.value = false[\s\S]*loadErrorText\.value = ''/)
assert.match(notifications, /const invalidateNotificationList = \(\) => \{[\s\S]*notificationLoadGeneration \+= 1[\s\S]*clearNotificationListState\(\)/)
const notificationRouteWatcher = notifications.slice(
  notifications.indexOf('let notificationViewInitialized = false'),
  notifications.indexOf('onBeforeUnmount(() =>'),
)
assert.match(notificationRouteWatcher, /resetNotificationAccountState\(\)|invalidateNotificationList\(\)/)
assert.ok(
  notificationRouteWatcher.indexOf("activeType.value = notificationTypes.has(normalizedType) ? normalizedType : 'all'")
    < notificationRouteWatcher.indexOf('void loadNotifications()'),
  'view/type changes must normalize the new filter before starting its initial notification request',
)
assert.match(
  notifications,
  /catch \(error\) \{[\s\S]*?clearNotificationListState\(\)[\s\S]*?loadErrorText\.value = '通知暂时无法读取，请稍后重试。'/,
  'initial notification failures must clear the previous filter list and use stable user-facing copy',
)
assert.match(
  notifications,
  /const loadMore = async \(\) => \{[\s\S]*?catch \(error\) \{[\s\S]*?toast\.error[\s\S]*?finally/,
  'append failures must remain an append-only error path',
)

assert.match(collaborationList, /v-if="item\.canAct && targetPath\(item\)"/)
assert.match(collaborationList, /v-else-if="targetPath\(item\)"/)
assert.match(collaborationList, /data-read-only-context/)
assert.match(collaborationList, /查看上下文/)
assert.match(collaborationList, /<span v-else class="read-only-label">等待来源更新<\/span>/)

assert.match(knowledgeApi, /export type KnowledgeActionItemType = KnowledgeActionType \| 'UNKNOWN'/)
assert.match(knowledgeApi, /const adaptActionType = \(value: unknown\): KnowledgeActionItemType/)
assert.match(knowledgeApi, /: 'UNKNOWN'/)
assert.doesNotMatch(knowledgeApi, /: 'MAINTENANCE_TASK'/)
assert.match(knowledgeApi, /const actionTypes: readonly KnowledgeActionType\[] = \[[\s\S]*'MAINTENANCE_TASK'[\s\S]*\]/)
assert.doesNotMatch(
  knowledgeApi.match(/const actionTypes: readonly KnowledgeActionType\[] = \[([\s\S]*?)\]/)?.[1] || '',
  /UNKNOWN/,
  'UNKNOWN must stay out of filters and summary counts',
)
assert.match(knowledgeView, /type === 'UNKNOWN' \? '未知行动'/)
assert.match(knowledgeView, /type === 'UNKNOWN' \? FileQuestion/)
assert.match(knowledgeView, /item\.type === 'UNKNOWN' \? '查看上下文' : '前往处理'/)
assert.match(knowledgeView, /v-if="item\.canonicalRoute"/)

assert.match(maintenanceView, /let maintenanceLoadRequestId = 0/)
assert.match(
  maintenanceView,
  /const requestedStatus = status\.value[\s\S]*?const accountKey = currentMaintenanceAccountKey\(\)[\s\S]*?const accountGeneration = maintenanceAccountGeneration[\s\S]*?const requestId = \+\+maintenanceLoadRequestId/,
  'maintenance list requests must capture their filter and account generation',
)
assert.match(
  maintenanceView,
  /maintenanceRequestIsCurrent\(requestId, requestedStatus, accountKey, accountGeneration\)/,
  'maintenance route filters must reject stale list and account responses',
)
assert.match(
  maintenanceView,
  /watch\(\s*\(\) => firstQueryValue\(route\.query\.status\),[\s\S]*?status\.value = nextStatus[\s\S]*?void load\(\)/,
  'maintenance route status changes must refresh the matching list',
)
assert.match(
  maintenanceView,
  /watch\(\s*\[\(\) => authStore\.user\?\.uid, \(\) => authStore\.token\],[\s\S]*?maintenanceAccountGeneration \+= 1[\s\S]*?clearMaintenanceState\(\)/,
  'maintenance state must reset when the authenticated account changes',
)

assert.match(reportsView, /let reportListRequestId = 0/)
assert.match(reportsView, /let reportAccountGeneration = 0/)
assert.match(
  reportsView,
  /watch\(\s*\(\) => firstQueryValue\(route\.query\.filter\),[\s\S]*?activeFilter\.value = readRouteFilter\(\)[\s\S]*?invalidateReportList\(\)[\s\S]*?void loadReports\(false\)/,
  'report receipt filters must react to same-route navigation',
)
assert.match(
  reportsView,
  /const requestedFilter = activeFilter\.value[\s\S]*?const accountKey = currentReportAccountKey\(\)[\s\S]*?const accountGeneration = reportAccountGeneration[\s\S]*?const requestId = \+\+reportListRequestId/,
  'report receipt lists must capture their filter and account generation',
)
assert.match(
  reportsView,
  /!reportAccountIsCurrent\(accountKey, accountGeneration\)/,
  'report receipt filters must reject stale list and account responses',
)
assert.match(
  reportsView,
  /watch\(\s*\[\(\) => authStore\.user\?\.uid, \(\) => authStore\.token\],[\s\S]*?resetReportAccountState\(\)/,
  'report receipt state must reset when the authenticated account changes',
)
assert.match(
  reportsView,
  /let reportDetailRequestId = 0[\s\S]*?requestId !== reportDetailRequestId[\s\S]*?!reportAccountIsCurrent\(accountKey, accountGeneration\)/,
  'report detail responses must not cross account generations',
)

assert.match(
  notifications,
  /let notificationAccountGeneration = 0[\s\S]*?const resetNotificationAccountState = \(\) => \{[\s\S]*?realtimeStore\.reset\(\)/,
  'notification account changes must clear account-scoped list, preferences, and unread state',
)
assert.match(
  notifications,
  /notificationAccountIsCurrent\(accountKey, accountGeneration\)/,
  'notification list requests must reject stale account responses',
)
assert.match(
  notifications,
  /\(\) => \[[\s\S]*?authStore\.user\?\.uid,[\s\S]*?authStore\.token,[\s\S]*?\] as const/,
  'notification state must react to account changes',
)

assert.match(profile, /const favoriteFolderActionContext = \(\) => \(/)
assert.match(
  profile,
  /const handleBatchMoveFavorites = async \(\) => \{[\s\S]*?favoriteFolderActionIsCurrent\(context\)/,
  'favorite folder writes must reject stale account follow-up state',
)
assert.match(
  profile,
  /const handleDeleteFavoriteFolder = async \(\) => \{[\s\S]*?favoriteFolderActionIsCurrent\(context\)/,
  'favorite folder deletion must reject stale account follow-up state',
)

assert.match(
  relationshipWorkspace,
  /let preferenceRequestId = 0[\s\S]*?const requestId = \+\+preferenceRequestId[\s\S]*?requestId !== preferenceRequestId/,
  'relationship preference reads must reject stale requests',
)
assert.match(
  accessibleDialog,
  /!elements\.includes\(active as HTMLElement\)[\s\S]*?event\.shiftKey \? last : first/,
  'dialog focus traps must contain title or dialog-root initial focus',
)

console.log('V12 state and action contract guard passed.')
