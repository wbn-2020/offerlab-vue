import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const opsApi = readFileSync(new URL('../src/api/ops.ts', import.meta.url), 'utf8')
const view = readFileSync(new URL('../src/views/OpsView.vue', import.meta.url), 'utf8')
const backendOps = readFileSync(new URL('../../offerlab-java/community-domain-search/src/main/java/com/offerlab/community/search/controller/OpsController.java', import.meta.url), 'utf8')
const notificationOps = readFileSync(new URL('../../offerlab-java/community-domain-notification/src/main/java/com/offerlab/community/notification/controller/NotificationOpsController.java', import.meta.url), 'utf8')

assert.match(opsApi, /export interface NotificationRetryStatus/, 'ops API must expose notification retry status')
assert.match(opsApi, /notificationRetry:\s*NotificationRetryStatus/, 'ops status must carry notification retry summary')
assert.match(opsApi, /export interface NotificationRetryTask/, 'ops API must expose notification retry task type')
assert.match(opsApi, /listNotificationRetryTasks/, 'ops API must list notification retry tasks')
assert.match(opsApi, /getNotificationRetryTask/, 'ops API must fetch a notification retry task by id')
assert.match(opsApi, /replayNotificationRetryTask/, 'ops API must replay a single notification retry task')
assert.match(opsApi, /replayNotificationRetryTasks/, 'ops API must replay a batch of notification retry tasks')

assert.match(view, /notificationRetryTasks = ref<NotificationRetryTask\[\]>\(\[\]\)/, 'OpsView must keep notification retry history')
assert.match(view, /isNotificationRetryTasksLoading/, 'OpsView must track notification retry loading state')
assert.match(view, /loadNotificationRetryTasks/, 'OpsView must load notification retry tasks')
assert.match(view, /opsApi\.listNotificationRetryTasks\(\{ limit: 20 \}\)/, 'OpsView must call the notification retry list API')
assert.match(view, /replayNotificationRetryTask\(item\)/, 'OpsView must expose a retry button for failed notification tasks')
assert.match(view, /opsApi\.replayNotificationRetryTask\(task\.id\)/, 'OpsView replay must call the single notification replay API')
assert.match(view, /opsApi\.replayNotificationRetryTasks\(ids\)/, 'OpsView must expose batch notification replay')
assert.match(view, /status\?\.(?:notificationRetry\?\.|notificationRetry\.)byStatus\.failed/, 'OpsView must surface failed notification retry counts')
assert.match(view, /status\?\.(?:notificationRetry\?\.|notificationRetry\.)duePending/, 'OpsView must surface due notification retry counts')

assert.match(backendOps, /notificationRetryService\.status\(\)/, 'ops status endpoint must include notification retry summary')
assert.match(notificationOps, /\/notification-retry-tasks\/replay-batch/, 'notification ops API must expose batch replay')

console.log('notification retry ops guard passed')
