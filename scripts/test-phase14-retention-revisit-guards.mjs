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
for (const sourceName of ['FAVORITE', 'DISCUSSION_FOLLOW', 'FOLLOWING_AUTHOR']) {
  assert.match(retentionApi, new RegExp(`'${sourceName}'`), `retention source whitelist must include ${sourceName}.`)
}
assert.match(retentionApi, /RETENTION_TOPIC_UPDATES_ENABLED\s*=\s*false/, 'topic revisit summaries must stay disabled until topic filtering is stable.')
assert.match(retentionApi, /safeSameSitePath/, 'retention targets must be restricted to safe same-site paths.')
assert.match(retentionApi, /revisitSources\.has\(sourceType\)/, 'retention API must reject unrecognized source types.')
assert.match(retentionApi, /client\.get\('\/api\/v1\/users\/me\/revisits'/, 'retention list must use the durable revisit endpoint.')
for (const action of ['completeRevisit', 'snoozeRevisit', 'ignoreRevisit']) {
  assert.match(retentionApi, new RegExp(action), `retention API must expose ${action}.`)
}
assert.match(retentionApi, /externalPush:\s*false/, 'retention summary must not model external push.')
assert.match(retentionApi, /advertising:\s*false/, 'retention summary must not model advertising.')
assert.match(retentionApi, /payment:\s*false/, 'retention summary must not model payment.')

assert.match(revisitPanel, /data-stage6-server-revisits/, 'revisit panel must expose the durable server revisit surface.')
assert.match(revisitPanel, /data-on-site-only/, 'revisit panel must mark that it is an on-site-only surface.')
assert.match(revisitPanel, /retentionApi\.listRevisits/, 'revisit panel must load durable revisit items.')
assert.match(revisitPanel, /回访项由服务端保留并按当前状态更新/, 'revisit panel must disclose durable server-side state.')
assert.match(revisitPanel, /authStore\.isLoggedIn/, 'revisit panel must guard unauthenticated users.')
assert.match(revisitPanel, /group\.items\.slice\(0,\s*5\)/, 'revisit panel must enforce the 5 item per-group cap.')
assert.match(revisitPanel, /if \(source === 'FAVORITE'\)/, 'favorite revisits must be classified explicitly.')
assert.match(revisitPanel, /key: 'other', title: '其他站内回访'/, 'unknown revisit sources must use a generic group instead of being mislabeled as favorites.')
assert.doesNotMatch(revisitPanel, /fixed\s+inset-0|modal|fullscreen|red-dot|force-remind|badge-danger/, 'revisit panel must avoid forced reminder patterns.')

assert.match(meProfile, /ParticipationHub/, 'my profile page must include the participation overview entry.')
assert.doesNotMatch(meProfile, /RevisitSummaryPanel/, 'my profile page must not duplicate the participation hub revisit request.')
assert.match(notificationsView, /社区回访中心/, 'notification center must keep a revisit entry.')
assert.match(notificationsView, /<RevisitSummaryPanel route-state \/>/, 'notification center must retain the full revisit workspace.')
assert.match(settingsView, /data-phase14-retention-preference-note/, 'settings must explain retention preference linkage.')
assert.match(settingsView, /data-existing-notification-preferences/, 'settings must reuse persisted notification preferences.')
assert.doesNotMatch(settingsView, /v-model="[^"]*retentionNotification|retentionNotification|revisitNotification/, 'settings must not expose an unsupported retention switch.')
assert.doesNotMatch(types, /retentionNotification|revisitNotification/, 'notification preference types must not invent a retention field.')
assert.match(notificationsView, /preferenceOffText|interactionPreferenceMuted/, 'notification center must respect existing preference state.')
assert.doesNotMatch(notificationsView, /class="inbox-view-tabs"/, 'notification center must default to one inbox instead of parallel top-level inbox tabs.')
assert.doesNotMatch(notificationsView, /class="notification-counts"/, 'notification center must not repeat zero-count summary blocks.')
assert.match(notificationsView, /v-else class="notification-list"[\s\S]*class="related-inbox-groups"/, 'related update and revisit groups must only appear when notification content exists.')

const guardedSources = [revisitPanel, homeView, meProfile, settingsView, notificationsView]
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
for (const content of guardedSources) {
  for (const pattern of forbiddenCopy) {
    assert.doesNotMatch(content, pattern, 'retention surfaces must avoid anxiety, external push, ad, or payment copy.')
  }
}

assert.match(packageJson, /"test:phase14-retention-revisit":\s*"node scripts\/test-phase14-retention-revisit-guards\.mjs"/, 'package scripts must expose the retention guard.')
assert.match(packageJson, /npm run test:phase14-retention-revisit/, 'test:guards must include the retention guard.')

console.log('phase14 retention revisit guards passed')
