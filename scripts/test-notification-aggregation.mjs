import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const types = readFileSync(new URL('../src/api/types.ts', import.meta.url), 'utf8')
const adapters = readFileSync(new URL('../src/api/adapters.ts', import.meta.url), 'utf8')
const notificationsView = readFileSync(new URL('../src/views/NotificationsView.vue', import.meta.url), 'utf8')

assert.match(types, /notificationIds\?: ApiId\[\]/, 'notification type must expose grouped notification ids')
assert.match(types, /aggregateCount\?: number/, 'notification type must expose aggregate count')
assert.match(types, /unreadCount\?: number/, 'notification type must expose unread count for grouped cards')

assert.match(adapters, /raw\?\.notificationIds/, 'notification adapter must preserve grouped notification ids')
assert.match(adapters, /raw\?\.aggregateCount/, 'notification adapter must preserve grouped aggregate count')
assert.match(adapters, /raw\?\.unreadCount/, 'notification adapter must preserve grouped unread count')

assert.match(notificationsView, /notif\.notificationIds \?\? \[notif\.notificationId\]/, 'notification view must mark grouped cards as read in batch')
assert.match(notificationsView, /original\.unreadCount \|\| 1/, 'local unread sync must respect grouped unread counts')

console.log('notification aggregation guard passed')
