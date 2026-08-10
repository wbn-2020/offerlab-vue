import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const profile = read('src/views/MeProfileView.vue')
const notifications = read('src/views/NotificationsView.vue')
const relationships = read('src/views/RelationshipWorkspaceView.vue')

assert.match(profile, /role="tablist" aria-label="个人内容与关系"/)
assert.match(profile, /role="tab"[\s\S]*:aria-selected="activeTab === tab\.value"[\s\S]*:tabindex="activeTab === tab\.value \? 0 : -1"/)
assert.match(profile, /@keydown="handleProfileTabKeydown\(\$event, index\)"/)
assert.match(profile, /role="tabpanel"[\s\S]*:aria-labelledby="profileTabId\(activeTab\)"/)
assert.match(profile, /nextRovingTabValue\(ME_PROFILE_TABS/)

assert.match(notifications, /aria-label="通知收件箱"/)
assert.doesNotMatch(notifications, /class="inbox-view-tabs"/)
assert.match(notifications, /class="related-inbox-groups" aria-label="与当前通知相关的个人分组"/)
assert.match(notifications, /role="tablist" aria-label="通知类型"/)
assert.match(notifications, /@keydown="handleNotificationTypeKeydown\(\$event, index\)"/)
assert.match(notifications, /const rovingTabIndex = \(key: string/)
assert.match(notifications, /min-height: 44px/)

assert.match(relationships, /useAccessibleDialog/)
assert.match(relationships, /ref="preferenceDialog"/)
assert.match(relationships, /aria-describedby="relationship-preference-description"/)
assert.match(relationships, /tabindex="-1"/)
assert.match(relationships, /lastPreferenceTriggerId/)
assert.match(relationships, /const handleModeTabKeydown =/)
assert.match(relationships, /role="tabpanel"/)
assert.match(relationships, /min-height: 2\.75rem/)
assert.match(relationships, /min-width: 2\.75rem/)

console.log('V12 workspace accessibility guard passed.')
