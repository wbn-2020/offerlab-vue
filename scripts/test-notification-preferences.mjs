import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const notificationApi = readFileSync(new URL('../src/api/notification.ts', import.meta.url), 'utf8')
const apiTypes = readFileSync(new URL('../src/api/types.ts', import.meta.url), 'utf8')
const userApi = readFileSync(new URL('../src/api/user.ts', import.meta.url), 'utf8')
const router = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
const settings = readFileSync(new URL('../src/views/SettingsView.vue', import.meta.url), 'utf8')
const notificationsView = readFileSync(new URL('../src/views/NotificationsView.vue', import.meta.url), 'utf8')

const granularFields = [
  'likeNotification',
  'commentNotification',
  'followNotification',
  'favoriteNotification',
  'mentionNotification',
]

for (const field of granularFields) {
  assert.match(userApi, new RegExp(`${field}: boolean`), `PrivacySetting must expose ${field}`)
  assert.match(apiTypes, new RegExp(`${field}: boolean`), `NotificationPreference must expose ${field}`)
  assert.match(settings, new RegExp(`${field}: true`), `settings defaults must enable ${field}`)
}

assert.match(apiTypes, /export interface NotificationPreference/, 'frontend API types must expose a notification-scoped preference contract')
assert.match(notificationApi, /getPreferences: \(\): Promise<Result<NotificationPreference>> =>/, 'notification api must expose notification-scoped preference query')
assert.match(notificationApi, /client\.get\('\/api\/v1\/notifications\/preferences'\)/, 'notification api must query the notification-scoped preference endpoint')
assert.match(notificationApi, /updatePreferences: \(req: NotificationPreference\): Promise<Result<NotificationPreference>> =>/, 'notification api must expose notification-scoped preference update')
assert.match(notificationApi, /client\.put\('\/api\/v1\/notifications\/preferences', req\)/, 'notification api must update the notification-scoped preference endpoint')
assert.doesNotMatch(notificationApi, /PrivacySetting/, 'notification api must not reuse the full privacy setting contract')

assert.match(settings, /type InteractionNotificationKey = 'likeNotification' \| 'commentNotification' \| 'followNotification' \| 'favoriteNotification' \| 'mentionNotification'/, 'settings must keep a typed granular notification key union')
assert.match(settings, /defaultPrivacySetting = \(\): PrivacySetting/, 'settings must provide complete defaults for old responses')
assert.match(settings, /privacyForm\.value = \{ \.\.\.defaultPrivacySetting\(\), \.\.\.res\.data \}/, 'loading privacy settings must merge backend response with defaults')
assert.match(settings, /defaultNotificationPreference = \(\): NotificationPreference/, 'settings must provide notification-scoped preference defaults')
assert.match(settings, /\{ value: 'notifications', label: '通知偏好' \}/, 'settings must expose a dedicated notification preferences tab')
assert.match(settings, /notificationPreferenceOptions/, 'settings must define granular notification options')
assert.match(settings, /v-for="option in notificationPreferenceOptions"/, 'settings must render all granular notification options')
assert.match(settings, /v-model="notificationForm\[option\.key\]"/, 'settings must bind each granular switch to the notification form')
assert.match(settings, /:disabled="!notificationForm\.interactionNotification"/, 'granular switches must be disabled when the master interaction switch is off')
assert.match(settings, /notification-grid-disabled/, 'settings must expose a disabled state for the granular group')
assert.match(settings, /notification-toggle-disabled/, 'settings must expose disabled styling for granular toggles')
assert.match(settings, /await userApi\.getPrivacySettings\(\)/, 'settings must load full privacy settings from userApi')
assert.match(settings, /await userApi\.updatePrivacySettings\(privacyForm\.value\)/, 'settings must save full privacy settings through userApi')
assert.match(settings, /await notificationApi\.getPreferences\(\)/, 'settings notification tab must load notification preferences from notificationApi')
assert.match(settings, /await notificationApi\.updatePreferences\(notificationForm\.value\)/, 'settings notification tab must save notification preferences through notificationApi')
assert.match(settings, /保存通知偏好/, 'settings notification tab must not save notifications under privacy wording')
assert.match(settings, /事件仍会发生，只是不再提醒/, 'settings must explain that disabled notification types do not stop the underlying event')

for (const label of ['点赞', '评论', '关注', '收藏', '提及']) {
  assert.match(settings, new RegExp(`label: '${label}'`), `settings must label granular option ${label}`)
}

for (const cssClass of ['.notification-grid', '.notification-toggle', '.notification-title', '.notification-desc']) {
  assert.match(settings, new RegExp(cssClass.replace('.', '\\.')), `settings must style ${cssClass}`)
}

assert.match(settings, /\.dark \.notification-toggle/, 'granular toggles must support dark mode')
assert.match(settings, /@media \(max-width: 640px\)[\s\S]*\.notification-grid[\s\S]*grid-template-columns: 1fr/, 'granular grid must collapse on small screens')
assert.match(router, /path:\s*'\/me\/settings'/, 'router must expose the notification preferences settings route')
assert.match(notificationsView, /to="\/me\/settings"/, 'notifications page must link to the real notification preferences route')

console.log('notification preferences guard passed')
