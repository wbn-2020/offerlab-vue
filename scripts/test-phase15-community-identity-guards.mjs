import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const source = (path) => {
  const url = new URL(path, import.meta.url)
  return existsSync(url) ? readFileSync(url, 'utf8') : ''
}

const packageJson = source('../package.json')
const communityIdentity = source('../src/utils/communityIdentity.ts')
const contentSuggestions = source('../src/api/contentSuggestions.ts')
const userProfile = source('../src/views/UserProfileView.vue')
const postDetail = source('../src/views/PostDetailView.vue')
const settingsView = source('../src/views/SettingsView.vue')
const notificationApi = source('../src/api/notification.ts')
const types = source('../src/api/types.ts')

assert.ok(communityIdentity, 'phase 15 must add a community identity utility.')
assert.match(communityIdentity, /buildPublicIdentitySummary/, 'public identity summary must be built through one adapter.')
assert.match(communityIdentity, /buildContentTrustSignals/, 'content trust signals must be explainable and centralized.')
assert.match(communityIdentity, /buildRelationshipContext/, 'relationship context must be a separate private adapter.')
assert.match(communityIdentity, /filterVisiblePosts/, 'identity signals must reuse public post governance filtering.')
assert.match(communityIdentity, /filterVisibleCollections/, 'identity signals must reuse public collection governance filtering.')
assert.match(communityIdentity, /publicAuthorPosts/, 'identity signals must exclude anonymous and non-public authors.')
assert.doesNotMatch(communityIdentity, /\b(score|level|badge)\b/i, 'public identity utility must not consume score, level, or badge as trust signals.')

assert.ok(contentSuggestions, 'phase 15 must add an independent content suggestion API contract.')
for (const type of ['SUPPLEMENT', 'CORRECTION', 'BROKEN_LINK', 'CLARIFICATION', 'RELATED_CONTENT']) {
  assert.match(contentSuggestions, new RegExp(`'${type}'`), `content suggestion type ${type} must be supported.`)
}
for (const status of ['PENDING', 'ACCEPTED', 'REPLIED', 'IGNORED', 'CLOSED', 'HIDDEN']) {
  assert.match(contentSuggestions, new RegExp(`'${status}'`), `content suggestion status ${status} must be supported.`)
}
assert.match(contentSuggestions, /allowPublicAttribution:\s*false/, 'submitter attribution must default to private.')
assert.match(contentSuggestions, /CONTENT_SUGGESTION_DAILY_LIMIT/, 'content suggestions must have a daily rate limit guard.')
assert.match(contentSuggestions, /buildContentSuggestionDuplicateKey/, 'content suggestions must expose a duplicate-submission guard.')
assert.match(contentSuggestions, /canSubmitContentSuggestion/, 'content suggestions must expose author-close and governance submit guards.')
assert.match(contentSuggestions, /suggestionsOpen\s*===\s*false/, 'closed suggestion entry must block new submissions.')
assert.match(contentSuggestions, /blockedByAuthor|governanceRestricted/, 'blocked or governance-restricted users must be rejected before submit.')
assert.doesNotMatch(contentSuggestions, /interactionApi|commentApi|\/comments|comment_count|commentCount\s*\+/, 'content suggestions must not be wired into the public comment flow.')

assert.match(userProfile, /data-phase15-public-identity/, 'author profile must expose the phase 15 public identity surface.')
assert.match(userProfile, /data-public-governance-filtered/, 'author profile must mark that identity sources are governance filtered.')
assert.match(userProfile, /data-explainable-trust-signals/, 'author profile trust signals must be explainable.')
assert.match(userProfile, /data-relationship-context-private/, 'relationship context must be explicitly private.')
assert.match(userProfile, /authStore\.isLoggedIn[\s\S]*relationshipContext|relationshipContext[\s\S]*authStore\.isLoggedIn/, 'relationship context must be gated by login state.')
assert.match(userProfile, /user\.profileVisible === false/, 'private profiles must stop identity-summary rendering.')
assert.doesNotMatch(userProfile, /contribution\.(score|level|badge)|\bscore\b[\s\S]{0,80}(trust|identity)|\blevel\b[\s\S]{0,80}(trust|identity)|\bbadge\b[\s\S]{0,80}(trust|identity)/i, 'author profile must not expose score, level, or badge as public trust identity.')

assert.match(postDetail, /data-phase15-content-trust/, 'post detail must expose content trust signals.')
assert.match(postDetail, /data-phase15-content-suggestion/, 'post detail must expose the content suggestion entry.')
assert.match(postDetail, /data-suggestions-private/, 'post detail must disclose suggestions are private by default.')
assert.match(postDetail, /data-not-comment-flow/, 'post detail must disclose suggestions do not enter comments.')
assert.match(postDetail, /data-author-suggestion-actions/, 'author must have suggestion actions.')
assert.match(postDetail, /data-author-close-suggestion-entry/, 'author must be able to close the suggestion entry.')
assert.match(postDetail, /contentSuggestionApi/, 'post detail must use the independent content suggestion API.')
assert.match(postDetail, /allowPublicAttribution:\s*false/, 'post detail form must default submitter identity to private.')
assert.match(postDetail, /contentSuggestionVisibilityNote/, 'post detail must show neutral visibility guidance.')
assert.match(postDetail, /highRiskSuggestionGuidance/, 'high-risk correction guidance must be neutral.')
assert.match(postDetail, /publicAcceptedSuggestionNotes[\s\S]*acceptedSuggestionNotes[\s\S]*publicAcceptedSuggestionNotes[\s\S]*publicAcceptedSuggestions/, 'public accepted suggestion notes must come from post detail public fields, not the private suggestion list.')
assert.doesNotMatch(postDetail, /<article v-for="item in acceptedContentSuggestions"[\s\S]{0,240}submitterNickname|acceptedContentSuggestions\s*=\s*computed/, 'private suggestion lists must not be reused as public trust signals.')
assert.match(postDetail, /readPostSuggestionEntryOpen[\s\S]*postSuggestionEntryOpen\.value\s*=\s*readPostSuggestionEntryOpen/, 'post detail must hydrate the author-closed suggestion entry state from persisted detail data.')
assert.doesNotMatch(postDetail, /comments\.value\s*=\s*\[.*suggestion|post\.value\.counter\.comment\s*\+\+[\s\S]{0,120}suggestion|interactionApi\.comment[\s\S]{0,120}suggestion/i, 'suggestions must not be inserted into comments or comment counters.')

assert.match(settingsView, /data-phase15-suggestion-preference-note/, 'settings must explain suggestion notification preference linkage.')
assert.match(settingsView, /data-existing-notification-preferences/, 'settings must reuse existing notification preferences.')
assert.doesNotMatch(settingsView, /suggestionNotification|contentSuggestionNotification|v-model="[^"]*Suggestion/i, 'settings must not expose an unpersisted suggestion notification switch.')
assert.doesNotMatch(types, /suggestionNotification|contentSuggestionNotification/, 'notification preference type must not invent an unsupported suggestion field.')
assert.match(notificationApi, /interactionPreferenceMuted|systemNotification/, 'suggestion notifications must align with existing preference primitives.')

const phase15Sources = [
  ['communityIdentity', communityIdentity],
  ['contentSuggestions', contentSuggestions],
  ['userProfile', userProfile],
  ['postDetail', postDetail],
  ['settingsView', settingsView],
]

const forbiddenCopy = [
  /绝对可信/,
  /平台担保/,
  /权威专家/,
  /认证资质/,
  /已通过平台审核/,
  /平台认可内容/,
  /官方认证专家/,
  /信用分/,
  /付费认证/,
  /会员专属/,
  /付费曝光/,
  /商业排名/,
  /广告投放/,
  /真实支付|提现|打赏/,
]

for (const [name, content] of phase15Sources) {
  for (const pattern of forbiddenCopy) {
    assert.doesNotMatch(content, pattern, `${name} must avoid certification, endorsement, payment, ad, and commercial-ranking copy.`)
  }
}

assert.match(packageJson, /"test:phase15-community-identity":\s*"node scripts\/test-phase15-community-identity-guards\.mjs"/, 'package scripts must expose phase 15 community identity guard.')
assert.match(packageJson, /npm run test:phase15-community-identity/, 'test:guards must include phase 15 community identity guard.')

console.log('phase15 community identity guards passed')
