import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8')
const api = readFileSync(new URL('../src/api/notification.ts', import.meta.url), 'utf8')
const types = readFileSync(new URL('../src/api/types.ts', import.meta.url), 'utf8')
const store = readFileSync(new URL('../src/stores/realtime.ts', import.meta.url), 'utf8')
const composable = readFileSync(new URL('../src/composables/useRealtime.ts', import.meta.url), 'utf8')
const header = readFileSync(new URL('../src/components/layout/AppHeader.vue', import.meta.url), 'utf8')

assert.match(types, /interface NotificationUnreadCount/, 'notification types must expose typed unread counters')
assert.match(types, /interface NotificationRealtimeStatus/, 'notification types must expose realtime status')
assert.match(types, /latestUnreadId\?: ApiId/, 'realtime status must expose latest unread id')
assert.match(types, /pollIntervalSeconds: number/, 'realtime status must expose poll interval')

assert.match(api, /getRealtimeStatus/, 'notification API must expose realtime status')
assert.match(api, /\/api\/v1\/notifications\/realtime-status/, 'notification API must call the backend realtime status endpoint')
assert.match(api, /skipAuthRedirect: true/, 'background realtime polling must not redirect on expired auth')
assert.match(api, /adaptRealtimeStatus/, 'notification API must adapt realtime status response')
assert.match(api, /Math\.max\(10, Number\(raw\?\.pollIntervalSeconds \|\| 20\)\)/, 'poll interval must have a safe lower bound')

assert.match(store, /emptyUnreadCount/, 'realtime store must expose an empty unread-count factory')
assert.match(store, /setRealtimeStatus/, 'realtime store must consume realtime status payloads')
assert.match(store, /latestUnreadId/, 'realtime store must keep latest unread marker')
assert.match(store, /lastSyncedAt/, 'realtime store must track the last sync time')
assert.match(store, /pollIntervalSeconds/, 'realtime store must keep backend-controlled polling interval')
assert.match(store, /reset/, 'realtime store must reset private notification state on logout')

assert.match(composable, /notificationApi\.getRealtimeStatus\(\)/, 'useRealtime must poll the realtime status endpoint')
assert.match(composable, /schedulePolling/, 'useRealtime must schedule repeated polling')
assert.match(composable, /MIN_POLL_INTERVAL_MS/, 'useRealtime must enforce a minimum polling interval')
assert.match(composable, /pollInFlight/, 'useRealtime must prevent overlapping polls')
assert.match(composable, /VITE_WS_URL/, 'useRealtime may still attach to WebSocket when configured')
assert.match(composable, /ws\.value\.binaryType = 'arraybuffer'/, 'WebSocket packets must be decoded as ArrayBuffer')
assert.match(composable, /watch\(\(\) => authStore\.token/, 'useRealtime must restart when auth changes')

assert.match(app, /useRealtime\(\)/, 'App must start global realtime notification refresh')
assert.match(header, /const unreadCount = computed\(\(\) => realtimeStore\.unreadCount\.total\)/, 'AppHeader must consume realtime unread state')
assert.doesNotMatch(header, /notificationApi\.getUnreadCount/, 'AppHeader must not own duplicate unread polling')

console.log('realtime notification guard passed')
