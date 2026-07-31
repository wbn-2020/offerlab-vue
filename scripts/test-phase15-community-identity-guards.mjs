import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const source = (path) => {
  const url = new URL(path, import.meta.url)
  return existsSync(url) ? readFileSync(url, 'utf8') : ''
}

const sourceRegion = (content, startMarker, endMarker) => {
  const start = content.indexOf(startMarker)
  assert.notEqual(start, -1, `marker not found: ${startMarker}`)
  const end = content.indexOf(endMarker, start + startMarker.length)
  assert.notEqual(end, -1, `marker not found: ${endMarker}`)
  return content.slice(start, end)
}

const packageJson = source('../package.json')
const communityIdentity = source('../src/utils/communityIdentity.ts')
const contentSuggestions = source('../src/api/contentSuggestions.ts')
const trustedContentApi = source('../src/api/trustedContent.ts')
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
for (const type of ['SUPPLEMENT', 'BROKEN_LINK', 'CLARIFICATION', 'RELATED_CONTENT']) {
  assert.doesNotMatch(contentSuggestions, new RegExp(`'${type}'`), `legacy content suggestion type ${type} must be removed.`)
}
for (const type of ['CORRECTION', 'FRESHNESS_UPDATE', 'CONDITIONS', 'COUNTEREXAMPLE', 'SOURCE', 'FOLLOW_UP_RESULT']) {
  assert.match(contentSuggestions, new RegExp(`'${type}'`), `content suggestion type ${type} must be supported.`)
}
for (const decision of ['ACCEPTED', 'PARTIAL_ACCEPTED', 'REJECTED', 'MERGED']) {
  assert.match(contentSuggestions, new RegExp(`'${decision}'`), `content suggestion decision ${decision} must be supported.`)
}
assert.doesNotMatch(contentSuggestions, /'HIDDEN'/, 'frontend suggestion statuses must match the backend PENDING/DECIDED contract.')
assert.match(contentSuggestions, /authorReply\?:\s*string/, 'author decision requests must use the backend authorReply field.')
assert.doesNotMatch(contentSuggestions, /\breason\?:\s*string/, 'author decision requests must not send the unsupported reason field.')
assert.match(contentSuggestions, /Math\.min\(limit,\s*50\)/, 'author suggestion list requests must respect the backend limit of 50.')
assert.match(contentSuggestions, /allowPublicAttribution:\s*false/, 'submitter attribution must default to private.')
assert.match(contentSuggestions, /buildContentSuggestionDuplicateKey/, 'content suggestions must expose a duplicate-submission guard.')
assert.match(contentSuggestions, /canSubmitContentSuggestion/, 'content suggestions must expose author-close and governance submit guards.')
assert.match(contentSuggestions, /suggestionsOpen\s*===\s*false/, 'closed suggestion entry must block new submissions.')
assert.match(contentSuggestions, /blockedByAuthor|governanceRestricted/, 'blocked or governance-restricted users must be rejected before submit.')
assert.match(contentSuggestions, /interface ContentSuggestionRequestOptions[\s\S]*signal\?:\s*AbortSignal/, 'content suggestion requests must support route-scoped cancellation.')
assert.doesNotMatch(contentSuggestions, /CONTENT_SUGGESTION_DAILY_LIMIT|dailySubmissionCount|RATE_LIMITED/, 'the client must not invent a UTC-day rate limit that conflicts with the server hourly limit.')
assert.doesNotMatch(contentSuggestions, /slice\(0,\s*160\)/, 'pending duplicate matching must not truncate suggestion content before comparing it.')
assert.match(contentSuggestions, /\/api\/v1\/posts\/\$\{postId\}\/content-suggestions/, 'suggestions must call the stable post suggestion endpoint.')
assert.match(contentSuggestions, /\/api\/v1\/content-suggestions\/\$\{suggestionId\}\/decision/, 'author decisions must call the stable suggestion endpoint.')
assert.match(contentSuggestions, /getById:\s*async\s*\(/, 'notification routes must be able to resolve one existing suggestion by id.')
const getContentSuggestionByIdRegion = sourceRegion(
  contentSuggestions,
  '  getById: async (',
  '  listMineForPost: async (',
)
assert.match(getContentSuggestionByIdRegion, /\/api\/v1\/content-suggestions\/\$\{suggestionId\}/, 'precise suggestion reads must call the stable suggestion resource endpoint.')
assert.match(getContentSuggestionByIdRegion, /signal:\s*options\.signal/, 'precise suggestion reads must support route-scoped cancellation.')
assert.match(getContentSuggestionByIdRegion, /adaptSuggestionResult\(res\)/, 'precise suggestion reads must use the shared suggestion adapter.')
assert.doesNotMatch(contentSuggestions, /CONTENT_SUGGESTIONS_ENABLED\s*=\s*false|ContentSuggestionsUnavailableError|content_suggestions_disabled/, 'content suggestion API must no longer be a disabled placeholder.')
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
assert.match(postDetail, /data-my-content-suggestions/, 'logged-in submitters must be able to review their private suggestion history.')
assert.match(postDetail, /item\.authorReply/, 'submitter history must expose the author reply returned by the backend.')
assert.match(postDetail, /item\.decision/, 'submitter history must expose the persisted decision state.')
assert.match(postDetail, /item\.decidedAt/, 'submitter history must expose when the author handled the suggestion.')
assert.match(postDetail, /contentSuggestionApi/, 'post detail must use the independent content suggestion API.')
assert.match(postDetail, /allowPublicAttribution:\s*false/, 'post detail form must default submitter identity to private.')
assert.match(postDetail, /contentSuggestionVisibilityNote/, 'post detail must show neutral visibility guidance.')
assert.match(postDetail, /highRiskSuggestionGuidance/, 'high-risk correction guidance must be neutral.')
assert.match(postDetail, /publicSuggestionRecords[\s\S]*trustedContentState\.value\?\.publicSuggestionRecords/, 'public suggestion records must come from the sanitized trusted-content projection.')
assert.match(postDetail, /publicSuggestionRecords[\s\S]*contentSuggestionTypeText\(item\.type\)/, 'public suggestion records must preserve the sanitized suggestion type.')
assert.match(postDetail, /publicSuggestionRecords[\s\S]*contentSuggestionDecisionText\(item\.decision\)/, 'public suggestion records must preserve accepted, partial, and merged decision semantics.')
assert.match(postDetail, /publicSuggestionRecords[\s\S]*item\.decidedAt[\s\S]*formatTime\(item\.decidedAt\)/, 'public suggestion records must show the bounded decision time when available.')
assert.match(postDetail, /publicSuggestionRecords[\s\S]*item\.submitterNickname/, 'public suggestion records must show only the backend-authorized public nickname when available.')
assert.doesNotMatch(postDetail, /publicSuggestionRecords[\s\S]{0,700}extension\?\.(acceptedSuggestionNotes|publicAcceptedSuggestionNotes|publicAcceptedSuggestions)/, 'public suggestion records must not trust arbitrary post extension fields.')
assert.doesNotMatch(postDetail, /<article v-for="item in acceptedContentSuggestions"[\s\S]{0,240}submitterNickname|acceptedContentSuggestions\s*=\s*computed/, 'private suggestion lists must not be reused as public trust signals.')
assert.match(postDetail, /readPostSuggestionEntryOpen[\s\S]*postSuggestionEntryOpen\.value\s*=\s*readPostSuggestionEntryOpen/, 'post detail must hydrate the author-closed suggestion entry state from persisted detail data.')
assert.doesNotMatch(postDetail, /comments\.value\s*=\s*\[.*suggestion|post\.value\.counter\.comment\s*\+\+[\s\S]{0,120}suggestion|interactionApi\.comment[\s\S]{0,120}suggestion/i, 'suggestions must not be inserted into comments or comment counters.')
assert.match(postDetail, /loadTrustedContent/, 'post detail must load persisted suggestion, freshness, and useful-feedback state.')
assert.match(postDetail, /submitContentSuggestion/, 'post detail must submit real private suggestions.')
assert.match(postDetail, /decideContentSuggestion/, 'post authors must process suggestions through the backend.')
assert.match(postDetail, /authorReply:\s*note/, 'post detail must send author decision explanations through authorReply.')
assert.match(postDetail, /公开处理说明/, 'author decisions must support a bounded public explanation.')
assert.doesNotMatch(postDetail, /contentSuggestionStoragePrefix|loadLocalContentSuggestionGuards|rememberLocalContentSuggestionGuard|contentSuggestionDailyCount|contentSuggestionLocalKeys/, 'post detail must not hard-block submissions with stale local storage counters or hashes.')

const loadContentSuggestionsRegion = sourceRegion(
  postDetail,
  'const loadContentSuggestions',
  'const submitContentSuggestion',
)
assert.match(loadContentSuggestionsRegion, /capturePostRouteContext/, 'suggestion lists must capture the active post route.')
assert.match(loadContentSuggestionsRegion, /signal:\s*context\.signal/, 'suggestion list requests must abort on route changes.')
assert.match(loadContentSuggestionsRegion, /isCanceledRequest\(error\)|!isActiveLoadedPostContext\(context\)/, 'stale suggestion list failures must stay silent.')
assert.match(postDetail, /let contentSuggestionLoadGeneration = 0/, 'suggestion lists must track same-route request generations.')
assert.match(loadContentSuggestionsRegion, /const loadGeneration = \+\+contentSuggestionLoadGeneration/, 'each suggestion list request must claim a new generation.')
assert.match(loadContentSuggestionsRegion, /loadGeneration !== contentSuggestionLoadGeneration/, 'stale suggestion list responses must not overwrite newer local state.')
assert.match(loadContentSuggestionsRegion, /loadGeneration === contentSuggestionLoadGeneration[\s\S]*isLoadingContentSuggestions\.value = false/, 'only the latest suggestion list may settle loading state.')

const contentSuggestionMutationRegions = [
  ['submitContentSuggestion', 'decideContentSuggestion'],
  ['decideContentSuggestion', 'openSuggestionInEditor'],
  ['togglePostSuggestionEntry', 'handleDeletePost'],
]

for (const [name, nextName] of contentSuggestionMutationRegions) {
  const region = sourceRegion(postDetail, `const ${name}`, `const ${nextName}`)
  assert.match(region, /capturePostRouteContext/, `${name} must capture post id and route generation.`)
  assert.match(region, /signal:\s*context\.signal/, `${name} must abort with the active post route.`)
  assert.match(region, /if \(!isActiveLoadedPostContext\(context\)\) return/, `${name} must reject stale success responses after await.`)
  assert.match(region, /catch[\s\S]*isCanceledRequest\(error\)[\s\S]*!isActiveLoadedPostContext\(context\)/, `${name} must reject stale errors after await.`)
  assert.match(region, /finally[\s\S]*isActiveLoadedPostContext\(context\)/, `${name} must not settle pending state for another route.`)
  assert.match(region, /invalidateContentSuggestionLoads\(\)/, `${name} must invalidate an older list GET before mutating suggestion state.`)
}

const contentSuggestionResetRegion = sourceRegion(
  postDetail,
  'const resetContentSuggestionState',
  'const handleDetailImageError',
)
for (const reset of [
  'contentSuggestions.value = []',
  'isLoadingContentSuggestions.value = false',
  'isSubmittingContentSuggestion.value = false',
  'isHandlingContentSuggestion.value = false',
  "contentSuggestionError.value = ''",
  "contentSuggestionFeedback.value = ''",
  'contentSuggestionReplyDrafts.value = {}',
  'contentSuggestionForm.value = createContentSuggestionForm()',
]) {
  assert.ok(contentSuggestionResetRegion.includes(reset), `content suggestion route reset must include: ${reset}`)
}
assert.match(contentSuggestionResetRegion, /invalidateContentSuggestionLoads\(\)/, 'suggestion route reset must invalidate same-route list requests.')
assert.match(postDetail, /watch\(postId,[\s\S]{0,320}beginPostRouteGeneration\(\)[\s\S]{0,320}resetContentSuggestionState\(\)/, 'post route changes must invalidate requests before resetting all suggestion state.')

assert.match(postDetail, /type TrustedContentLoadState = 'loading' \| 'loaded' \| 'error'/, 'trusted content must model loading, loaded, and error explicitly.')
assert.match(postDetail, /trustedContentLoadState = ref<TrustedContentLoadState>\('loading'\)/, 'trusted content must begin in an unknown loading state.')
assert.match(postDetail, /isTrustedContentLoaded = computed/, 'trusted content must expose a successful-load guard.')
assert.match(postDetail, /canMutateTrustedContent = computed/, 'trusted content mutations must share a successful-load availability guard.')
assert.match(postDetail, /:data-trusted-content-state="trustedContentLoadState"/, 'trusted content UI must expose its current load state.')
assert.match(postDetail, /重试读取/, 'trusted content load errors must offer an explicit retry.')
assert.match(postDetail, /可信内容状态未知|可信内容状态暂不可用/, 'trusted content must show unknown or unavailable copy before a successful load.')
assert.match(postDetail, /questionStatusDraft = ref<QuestionStatus \| ''>\(''\)/, 'question status drafts must not default to OPEN before trusted content loads.')
assert.match(postDetail, /freshnessStatusDraft = ref<FreshnessStatus \| ''>\(''\)/, 'freshness drafts must not default to CURRENT before trusted content loads.')
assert.match(trustedContentApi, /allowedQuestionStatuses:\s*QuestionStatus\[\]/, 'trusted-content state must carry the server-authoritative question transition list.')
assert.match(trustedContentApi, /adaptAllowedQuestionStatuses/, 'trusted-content adaptation must validate the server transition list.')
assert.match(postDetail, /const questionStatusOptions = computed/, 'question status controls must derive options from live trusted-content state.')
assert.match(postDetail, /trustedContentState\.value\?\.allowedQuestionStatuses/, 'question status options must use the server-authoritative transition list.')
assert.match(postDetail, /const canSaveQuestionState = computed/, 'question state saving must have an allowed-transition guard.')
assert.match(postDetail, /:disabled="!canSaveQuestionState"/, 'question state saving must stay disabled for unsupported targets.')
assert.match(postDetail, /questionStatusDraft && !allowedQuestionStatuses\.includes\(questionStatusDraft\)/, 'unsupported current states such as ACCEPTED must render as a disabled placeholder, not a submittable option.')

const trustedContentComputedRegion = sourceRegion(
  postDetail,
  'const questionStatus = computed',
  'const questionStatusOptions',
)
assert.match(trustedContentComputedRegion, /isTrustedContentLoaded\.value/, 'trusted status conclusions must be gated by a successful load.')
assert.match(trustedContentComputedRegion, /trustedContentAvailabilityText/, 'trusted status labels must fall back to unknown or unavailable copy.')

assert.match(postDetail, /v-model="questionStatusDraft"[\s\S]{0,180}:disabled="!canMutateTrustedContent"/, 'question status controls must stay disabled until trusted content loads.')
assert.match(postDetail, /v-model="freshnessStatusDraft"[\s\S]{0,180}:disabled="!canMutateTrustedContent"/, 'freshness controls must stay disabled until trusted content loads.')
assert.match(postDetail, /:disabled="!canMutateTrustedContent \|\| isOwnPost"/, 'useful-feedback controls must stay disabled until trusted content loads.')
assert.match(postDetail, /:can-accept-answer="canAcceptAnswer"/, 'answer adoption must use the status-aware server contract guard.')
assert.match(postDetail, /const canAcceptAnswer = computed[\s\S]*\['OPEN', 'ANSWERED', 'ACCEPTED'\]\.includes\(questionStatus\.value\)/, 'terminal question states must hide answer adoption until the author reopens the question.')

const applyTrustedContentRegion = sourceRegion(
  postDetail,
  'const applyTrustedContentState',
  'const loadTrustedContent',
)
assert.match(applyTrustedContentRegion, /trustedContentLoadState\.value = 'loaded'/, 'trusted content may become loaded only after applying a real response.')

const loadTrustedContentRegion = sourceRegion(
  postDetail,
  'const loadTrustedContent',
  'const saveUsefulFeedback',
)
assert.match(loadTrustedContentRegion, /capturePostRouteContext/, 'trusted content loads must capture post id and route generation.')
assert.match(loadTrustedContentRegion, /signal:\s*context\.signal/, 'trusted content loads must be abortable on route change.')
assert.match(loadTrustedContentRegion, /if \(!isActiveLoadedPostContext\(context\)\) return/, 'trusted content loads must reject stale responses after await.')
assert.match(loadTrustedContentRegion, /trustedContentLoadState\.value = 'error'/, 'trusted content GET failures must enter an explicit error state.')
assert.doesNotMatch(loadTrustedContentRegion, /applyTrustedContentState\(null\)/, 'trusted content GET failures must not synthesize trusted defaults from null.')

const trustedContentMutationRegions = [
  ['saveUsefulFeedback', 'clearUsefulFeedback'],
  ['clearUsefulFeedback', 'saveQuestionState'],
  ['saveQuestionState', 'acceptAnswer'],
  ['acceptAnswer', 'clearAcceptedAnswer'],
  ['clearAcceptedAnswer', 'saveFreshness'],
  ['saveFreshness', 'publicUpdateImpactText'],
]

for (const [name, nextName] of trustedContentMutationRegions) {
  const region = sourceRegion(postDetail, `const ${name}`, `const ${nextName}`)
  assert.match(region, /!canMutateTrustedContent\.value/, `${name} must reject mutation before a successful trusted-content load.`)
  assert.match(region, /capturePostRouteContext/, `${name} must capture post id and route generation.`)
  assert.match(region, /signal:\s*context\.signal/, `${name} must abort with the active post route.`)
  assert.match(region, /if \(!isActiveLoadedPostContext\(context\)\) return/, `${name} must reject stale success responses after await.`)
  assert.match(region, /catch[\s\S]*isCanceledRequest\(error\)[\s\S]*!isActiveLoadedPostContext\(context\)/, `${name} must reject stale errors after await.`)
  assert.match(region, /finally[\s\S]*isActiveLoadedPostContext\(context\)/, `${name} must not settle pending state for another route.`)
}

const saveQuestionStateRegion = sourceRegion(
  postDetail,
  'const saveQuestionState',
  'const acceptAnswer',
)
assert.match(saveQuestionStateRegion, /allowedQuestionStatuses\.value\.includes\(status\)/, 'question state requests must reject targets absent from the server transition list.')

const acceptAnswerRegion = sourceRegion(
  postDetail,
  'const acceptAnswer',
  'const clearAcceptedAnswer',
)
assert.match(acceptAnswerRegion, /!canAcceptAnswer\.value/, 'answer adoption methods must reject terminal question states before requesting the backend.')

const trustedContentResetRegion = sourceRegion(
  postDetail,
  'const resetTrustedContentState',
  'const applyTrustedContentState',
)
for (const reset of [
  "trustedContentLoadState.value = 'loading'",
  "questionStatusDraft.value = ''",
  "freshnessStatusDraft.value = ''",
  'isSavingUsefulFeedback.value = false',
  'isSavingQuestionState.value = false',
  'isAcceptingAnswer.value = false',
  'isSavingFreshness.value = false',
  "trustedContentFeedback.value = ''",
]) {
  assert.ok(trustedContentResetRegion.includes(reset), `trusted content route reset must include: ${reset}`)
}
assert.match(postDetail, /watch\(postId,[\s\S]{0,240}beginPostRouteGeneration\(\)[\s\S]{0,240}resetTrustedContentState\(\)/, 'post route changes must invalidate requests before resetting all trusted-content state.')

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
