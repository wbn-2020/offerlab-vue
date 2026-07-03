import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const packageJson = source('../package.json')
const retentionApi = source('../src/api/retention.ts')
const revisitPanel = source('../src/components/retention/RevisitSummaryPanel.vue')
const homeView = source('../src/views/HomeView.vue')
const meProfile = source('../src/views/MeProfileView.vue')
const settingsView = source('../src/views/SettingsView.vue')
const notificationsView = source('../src/views/NotificationsView.vue')
const types = source('../src/api/types.ts')

assert.match(retentionApi, /RETENTION_BLOCK_DEFAULT_LIMIT\s*=\s*3/, 'retention summary blocks must default to 3 items.')
assert.match(retentionApi, /RETENTION_BLOCK_MAX_LIMIT\s*=\s*5/, 'retention summary blocks must cap at 5 items.')
assert.match(retentionApi, /RETENTION_SAME_SOURCE_DEFAULT_LIMIT\s*=\s*1/, 'same-source retention summaries must default to one item.')
assert.match(retentionApi, /RETENTION_SOURCE_WHITELIST/, 'retention sources must be explicitly whitelisted.')
for (const sourceName of ['favorite', 'unorganized_favorite', 'discussion_revisit', 'following_author_update', 'following_topic_update']) {
  assert.match(retentionApi, new RegExp(`'${sourceName}'`), `retention source whitelist must include ${sourceName}.`)
}
assert.match(retentionApi, /RETENTION_TOPIC_UPDATES_ENABLED\s*=\s*false/, 'topic revisit summaries must stay disabled until topic follow/update filtering is stable.')
assert.match(retentionApi, /isPublicPostVisible/, 'retention API must filter items through current post visibility.')
assert.match(retentionApi, /filterVisiblePosts/, 'retention fallback sources must reuse governance visibility filtering.')
assert.match(retentionApi, /postApi\.getMyUnorganizedFavorites/, 'continue reading must fall back to unorganized favorites/read-later source.')
assert.match(retentionApi, /feedApi\.getFollowing/, 'following author updates must reuse the following feed.')
assert.match(retentionApi, /notificationApi\.getList\('comment'/, 'discussion revisits must be sourced from in-site comment notifications for P0 fallback.')
assert.match(retentionApi, /externalPush:\s*false/, 'retention summary must not model external push.')
assert.match(retentionApi, /advertising:\s*false/, 'retention summary must not model advertising.')
assert.match(retentionApi, /payment:\s*false/, 'retention summary must not model payment.')

assert.match(revisitPanel, /data-phase14-retention-summary/, 'revisit panel must expose the phase 14 retention surface.')
assert.match(revisitPanel, /data-non-external-push/, 'revisit panel must mark that it is not an external push surface.')
assert.match(revisitPanel, /data-existing-notification-preferences/, 'revisit panel must disclose reuse of existing notification preferences.')
assert.match(revisitPanel, /authStore\.isLoggedIn/, 'revisit panel must guard unauthenticated users.')
assert.match(revisitPanel, /items\.slice\(0,\s*5\)/, 'revisit panel must enforce the 5 item display cap.')
assert.doesNotMatch(revisitPanel, /fixed\s+inset-0|modal|fullscreen|red-dot|force-remind|badge-danger/, 'revisit panel must not use forced modal/red-dot reminder patterns.')

assert.match(homeView, /RevisitSummaryPanel[\s\S]*compact|compact[\s\S]*RevisitSummaryPanel/, 'home page must include a compact revisit entry.')
assert.match(meProfile, /RevisitSummaryPanel/, 'my profile page must include the full revisit summary.')
assert.match(settingsView, /data-phase14-retention-preference-note/, 'settings must explain retention preference linkage.')
assert.match(settingsView, /data-existing-notification-preferences/, 'settings must reuse existing notification preferences instead of a fake switch.')
assert.doesNotMatch(settingsView, /v-model="[^"]*retentionNotification|retentionNotification|revisitNotification|复访提醒开关/, 'settings must not expose an unpersisted retention notification switch.')
assert.doesNotMatch(types, /retentionNotification|revisitNotification/, 'frontend notification preference type must not invent an unsupported retention field.')
assert.match(notificationsView, /preferenceOffText|interactionPreferenceMuted/, 'notification center must respect existing notification preference state.')

const guardedSources = [
  ['revisitPanel', revisitPanel],
  ['homeView', homeView],
  ['meProfile', meProfile],
  ['settingsView', settingsView],
  ['notificationsView', notificationsView],
]

const forbiddenCopy = [
  /你错过了很多/,
  /再不看就晚了/,
  /连续第\s*\d+\s*天/,
  /大家都在看但你没看/,
  /限时回归/,
  /短信|邮件|设备\s*token|外部推送服务/i,
  /广告召回|付费曝光|商业推荐/,
  /真实支付|会员|订阅|提现|打赏/,
]

for (const [name, content] of guardedSources) {
  for (const pattern of forbiddenCopy) {
    assert.doesNotMatch(content, pattern, `${name} must avoid anxiety, external push, ad, or payment recall copy.`)
  }
}

assert.match(packageJson, /"test:phase14-retention-revisit":\s*"node scripts\/test-phase14-retention-revisit-guards\.mjs"/, 'package scripts must expose phase 14 retention guard.')
assert.match(packageJson, /npm run test:phase14-retention-revisit/, 'test:guards must include phase 14 retention guard.')

console.log('phase14 retention revisit guards passed')
