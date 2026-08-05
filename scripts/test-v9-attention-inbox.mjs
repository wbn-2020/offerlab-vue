import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const notifications = read('src/views/NotificationsView.vue')
const digest = read('src/components/retention/UpdateDigestPanel.vue')
const revisits = read('src/components/retention/RevisitSummaryPanel.vue')
const relationships = read('src/views/RelationshipWorkspaceView.vue')
const actions = read('src/components/collaboration/CollaborationActionCenter.vue')
const mine = read('src/components/collaboration/MyCollaborationsWorkspace.vue')
const maintenance = read('src/views/MaintenanceTasksView.vue')
const realtime = read('src/stores/realtime.ts')

for (const view of ['notifications', 'updates', 'revisits']) {
  has(notifications, new RegExp(`'${view}'`), `notification center must expose the ${view} view`)
}
has(notifications, /route\.query\.view/, 'notification view must be restored from the URL')
has(notifications, /UpdateDigestPanel[\s\S]*route-state/, 'updates must reuse the dedicated digest panel')
has(notifications, /RevisitSummaryPanel[\s\S]*route-state/, 'revisits must reuse the dedicated revisit panel')
has(notifications, /route\.query\.type/, 'notification subtype must be URL-driven')

has(digest, /routeState\?: boolean/, 'digest panel must opt into route state without changing detail-page embeds')
has(digest, /routeSubscriptionSourceType[\s\S]*routeSubscriptionSourceId/, 'digest subscription source filters must be restorable')
has(digest, /routeResourceType[\s\S]*routeResourceId/, 'digest resource filters must be restorable')
for (const state of ['loading', 'error', 'empty']) {
  has(digest, new RegExp(`data-update-digest-state="${state}"`), `digest must expose ${state}`)
  has(revisits, new RegExp(`data-revisit-state="${state}"`), `revisit must expose ${state}`)
}
has(revisits, /route\.query\.status/, 'revisit status must be restorable')

missing(relationships, /['"]ACTIVITY['"]/, 'relationship UI must not offer the unsupported activity relationship')
has(relationships, /supportedSourceTypeValues[\s\S]*'SERIES'/, 'relationship UI must keep only fact-backed source types')

has(actions, /route\.query\.actionType/, 'collaboration action filters must be URL-driven')
has(mine, /route\.query\.scope[\s\S]*route\.query\.status/, 'my-collaboration scope and status must be URL-driven')
has(maintenance, /route\.query\.status/, 'maintenance status must be URL-driven')
has(mine, /CollaborationDeliverySelector/, 'collaboration delivery must prefer the existing candidate selector')
has(mine, /manual-delivery-fallback/, 'manual collaboration delivery IDs must remain an explicit fallback')
has(maintenance, /CollaborationDeliverySelector/, 'maintenance delivery must reuse the existing delivery candidate selector')
has(maintenance, /preferred-candidate-id="suggestedDelivery\(task\)\?\.deliveryRefId"/, 'maintenance delivery must rank the associated resource as the preferred candidate')
has(maintenance, /deliveryCandidates\(task\)[\s\S]*manual-delivery-fallback/, 'maintenance delivery must keep candidate selection ahead of the manual fallback')
has(maintenance, /<details class="manual-delivery-fallback"/, 'maintenance manual delivery IDs must remain an explicit details fallback')
has(realtime, /recentNotificationIds/, 'realtime unread updates must remember stable notification ids')
has(realtime, /rememberNotificationId\(notification\.notificationId\)/, 'realtime unread updates must deduplicate by notification id before incrementing')
has(realtime, /recentNotificationIds\.clear\(\)/, 'realtime notification dedupe state must reset with the session')

console.log('V9 attention inbox guard passed.')
