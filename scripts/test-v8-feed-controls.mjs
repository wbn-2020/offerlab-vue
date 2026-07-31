import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const feedApi = read('src/api/feed.ts')
const feedTabs = read('src/components/feed/FeedTabs.vue')
const feedList = read('src/components/feed/FeedList.vue')
const postCard = read('src/components/post/PostCard.vue')
const home = read('src/views/HomeView.vue')
const explore = read('src/views/ExploreView.vue')

for (const field of ['sourceType', 'sourceLabel', 'reasonCode', 'reasonText']) {
  has(feedApi, new RegExp(`${field}\\?:\\s*string`), `Feed API must preserve server ${field}.`)
}
has(feedApi, /adaptFeedPost[\s\S]*adaptPost\(raw\)/, 'V8 Feed items must remain compatible with the legacy Feed DTO adapter.')
for (const action of ['HIDE', 'LESS_LIKE_THIS', 'RESTORE']) {
  has(feedApi, new RegExp(`'${action}'`), `Feed API must expose ${action}.`)
}
has(feedApi, /\/api\/v1\/feeds\/feedback\/preferences'/, 'Feed preferences must be loaded from the dedicated server endpoint.')
has(feedApi, /\/api\/v1\/feeds\/feedback\/preferences\/\$\{encodeURIComponent/, 'Per-post preferences must use the dedicated server endpoint.')
has(feedApi, /restoreFeedback[\s\S]*action:\s*'RESTORE'/, 'Undo must persist RESTORE on the server.')

has(postCard, /feedReasonText/, 'PostCard must render the server reason text.')
missing(postCard, /feedReasonCode/, 'PostCard must not expose the internal server reason code.')
missing(postCard, /原因码：/, 'PostCard must not visibly identify an internal reason code.')
has(postCard, /feedFeedbackPending[\s\S]*Loader2/, 'PostCard must expose a pending state for Feed controls.')
has(postCard, /feedFeedbackError/, 'PostCard must expose a per-item error state.')
has(postCard, /showFeedControls \|\| props\.showRecommendFeedback/, 'PostCard must expose Feed controls beyond the legacy recommendation-only entry.')
for (const label of ['暂时隐藏', '减少同类', '恢复默认']) {
  has(postCard, new RegExp(label), `PostCard must expose ${label}.`)
}

has(feedList, /@feed-feedback=/, 'FeedList must forward Feed control actions.')
has(feedList, /feedFeedbackPendingIds/, 'FeedList must forward per-item pending state.')
has(feedTabs, /feed-tabs-status[\s\S]*正在同步你的信息流设置/, 'FeedTabs must expose preference loading state.')
has(feedTabs, /feed-tabs-status-error[\s\S]*\$emit\('retry'\)/, 'FeedTabs must expose retryable preference errors.')

has(home, /feedApi\.listFeedbackPreferences/, 'Home must load the signed-in account preference snapshot from the server.')
has(home, /feedPreferenceRequestGeneration/, 'Home must ignore stale preference responses.')
has(home, /feedControlRevision/, 'Home must keep an in-flight preference snapshot from overwriting newer controls.')
has(home, /currentFeedAccountKey[\s\S]*authStore\.user\?\.uid[\s\S]*authStore\.token/, 'Feed control state must be isolated by uid and token.')
has(home, /watch\([\s\S]*authStore\.user\?\.uid[\s\S]*authStore\.token[\s\S]*resetFeedControlState/, 'Account changes must clear local Feed control state.')
has(home, /handleFeedControl[\s\S]*feedApi\.recordFeedback/, 'Home must persist Feed controls through the server API.')
has(home, /restoreFeedControl[\s\S]*'RESTORE'/, 'Home must provide an undo path.')
has(home, /feed-undo-banner/, 'Home must keep undo visible after a card is hidden.')
has(home, /:show-feed-controls="true"/, 'Home must expose Feed controls across Feed sorting views.')
has(home, /feedFeedbackErrors/, 'Home must retain per-item Feed control errors.')

missing(home, /feedApi\.(getLatest|getHot|getRecommend|getFollowing)\([^)]*\)[\s\S]{0,300}feedback\/preferences/, 'Home must not scan a public Feed to reconstruct preferences.')
missing(explore, /listFeedbackPreferences|feedPreferences|locallyHiddenPostIds/, 'Explore must not reconstruct private Feed controls from public discovery lists.')

console.log('V8 Feed controls guard passed.')
