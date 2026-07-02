import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const adapters = read('src/api/adapters.ts')
const notificationsView = read('src/views/NotificationsView.vue')
const composable = read('src/composables/useRealtime.ts')

assert.match(adapters, /function safeSameSitePath/, 'notification adapter must validate same-site target paths')
assert.match(adapters, /path\.startsWith\('\/'\)/, 'notification target paths must be same-site absolute paths')
assert.match(adapters, /path\.startsWith\('\/\/'\)/, 'notification target paths must reject protocol-relative URLs')
assert.match(adapters, /targetPath[\s\S]*jumpPath[\s\S]*content\.targetPath[\s\S]*content\.jumpPath/, 'notification adapter must preserve targetPath and jumpPath priority')
assert.match(adapters, /userId \? `\/u\/\$\{adaptId\(userId\)\}` : postId \? `\/post\/\$\{adaptId\(postId\)\}`/, 'notification adapter must fallback to author or post routes')
assert.match(adapters, /content\.action === 'topic_post_published'/, 'topic notifications must be recognized by action')

assert.match(notificationsView, /@click\.stop="markAsRead\(notif\.notificationId, notif\.notificationIds \?\? \[notif\.notificationId\]\)"/, 'mark-read button must not trigger notification navigation')
assert.match(notificationsView, /if \(!notif\.read\) void markAsRead\(notif\.notificationId, notif\.notificationIds \?\? \[notif\.notificationId\], \{ background: true \}\)/, 'clicking a notification must mark read locally before navigation')
assert.match(notificationsView, /router\.push\(notif\.targetPath\)/, 'clicking a notification must route to its target path')
assert.match(notificationsView, /notif\.notificationIds \?\? \[notif\.notificationId\]/, 'grouped notifications must mark all grouped ids as read')
assert.match(notificationsView, /nextStepText\(notif\)/, 'notification cards must name the next step')

assert.match(composable, /import \{ adaptNotification \} from '@\/api\/adapters'/, 'websocket notification pushes must use the API adapter')
assert.match(composable, /realtimeStore\.pushNotification\(adaptNotification\(packet\.body\)\)/, 'websocket payloads must be adapted before entering realtime store')

console.log('phase6 notification route contract guard passed')
