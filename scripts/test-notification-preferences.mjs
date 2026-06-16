import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const userApi = readFileSync(new URL('../src/api/user.ts', import.meta.url), 'utf8')
const settings = readFileSync(new URL('../src/views/SettingsView.vue', import.meta.url), 'utf8')

const granularFields = [
  'likeNotification',
  'commentNotification',
  'followNotification',
  'favoriteNotification',
  'mentionNotification',
]

for (const field of granularFields) {
  assert.match(userApi, new RegExp(`${field}: boolean`), `PrivacySetting must expose ${field}`)
  assert.match(settings, new RegExp(`${field}: true`), `settings defaults must enable ${field}`)
}

assert.match(settings, /type InteractionNotificationKey = 'likeNotification' \| 'commentNotification' \| 'followNotification' \| 'favoriteNotification' \| 'mentionNotification'/, 'settings must keep a typed granular notification key union')
assert.match(settings, /defaultPrivacySetting = \(\): PrivacySetting/, 'settings must provide complete defaults for old responses')
assert.match(settings, /privacyForm\.value = \{ \.\.\.defaultPrivacySetting\(\), \.\.\.res\.data \}/, 'loading privacy settings must merge backend response with defaults')
assert.match(settings, /notificationPreferenceOptions/, 'settings must define granular notification options')
assert.match(settings, /v-for="option in notificationPreferenceOptions"/, 'settings must render all granular notification options')
assert.match(settings, /v-model="privacyForm\[option\.key\]"/, 'settings must bind each granular switch to the form')
assert.match(settings, /:disabled="!privacyForm\.interactionNotification"/, 'granular switches must be disabled when the master interaction switch is off')
assert.match(settings, /notification-grid-disabled/, 'settings must expose a disabled state for the granular group')
assert.match(settings, /notification-toggle-disabled/, 'settings must expose disabled styling for granular toggles')

for (const label of ['点赞', '评论', '关注', '收藏', '提及']) {
  assert.match(settings, new RegExp(`label: '${label}'`), `settings must label granular option ${label}`)
}

for (const cssClass of ['.notification-grid', '.notification-toggle', '.notification-title', '.notification-desc']) {
  assert.match(settings, new RegExp(cssClass.replace('.', '\\.')), `settings must style ${cssClass}`)
}

assert.match(settings, /\.dark \.notification-toggle/, 'granular toggles must support dark mode')
assert.match(settings, /@media \(max-width: 640px\)[\s\S]*\.notification-grid[\s\S]*grid-template-columns: 1fr/, 'granular grid must collapse on small screens')

console.log('notification preferences guard passed')
