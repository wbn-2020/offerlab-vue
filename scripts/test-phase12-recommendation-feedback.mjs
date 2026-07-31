import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const packageJson = JSON.parse(read('package.json'))
const feedApi = read('src/api/feed.ts')
const home = read('src/views/HomeView.vue')
const explore = read('src/views/ExploreView.vue')
const feedList = read('src/components/feed/FeedList.vue')
const postCard = read('src/components/post/PostCard.vue')
const recommendationGovernance = read('src/utils/recommendationGovernance.ts')

assert.equal(
  existsSync(new URL('test-phase12-recommendation-feedback.mjs', import.meta.url)),
  true,
  'Phase 12 recommendation feedback guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:phase12-recommendation-feedback'],
  'node scripts/test-phase12-recommendation-feedback.mjs',
  'package.json must expose the Phase 12 recommendation feedback guard.',
)
has(packageJson.scripts['test:stage-release-guards'], /test:phase12-recommendation-feedback/, 'Stage release guards must include recommendation feedback checks.')

has(feedApi, /FeedFeedbackAction/, 'Feed feedback API must expose a typed action contract.')
has(feedApi, /not_interested/, 'Feed feedback API must keep not_interested support.')
has(feedApi, /less_like_this/, 'Feed feedback API must expose less_like_this as an explicit lightweight action.')
has(feedApi, /hide_author/, 'Feed feedback API must expose hide_author as an explicit lightweight action.')
has(feedApi, /more_like_this/, 'Feed feedback API must expose more_like_this as an explicit lightweight action.')
has(feedApi, /feedbackPayload/, 'Feed feedback API must map UI feedback actions through a backend-safe payload.')
has(feedApi, /action:\s*action as BackendFeedFeedbackAction/, 'Feed feedback must preserve the backend-supported action contract.')
has(feedApi, /reason:\s*action === 'not_interested' \? normalizedReason : `\$\{action\}:\$\{normalizedReason\}`/, 'Non-default feedback must preserve its action in the backend reason trace.')
has(feedApi, /client\.post\('\/api\/v1\/feeds\/feedback'/, 'All supported feedback actions must be recorded by the backend.')
missing(feedApi, /recorded locally/, 'Feed feedback must not pretend a backend-supported action is local-only.')

has(postCard, /feedbackActions/, 'PostCard must define explicit recommendation feedback actions.')
for (const label of ['不感兴趣', '少看此类', '少看作者', '更多类似']) {
  has(postCard, new RegExp(label), `PostCard feedback menu must expose ${label}.`)
}
has(postCard, /暂不表示已改变后续推荐|不会立即改变当前列表/, 'Unsupported feedback entries must avoid pretending to affect recommendation immediately.')
has(postCard, /displayRecommendationReasons[\s\S]*normalizeRecommendationReason/, 'PostCard recommendation reasons must use the shared neutral normalizer.')
has(postCard, /recommendationFeedbackSubmittedLabel|feedback-submitted-note/, 'PostCard must show a minimal local response after a feedback click.')

has(home, /handleRecommendFeedback[\s\S]*FeedFeedbackAction/, 'Home recommendation feedback handler must receive the explicit feedback action.')
has(home, /action === 'more_like_this'/, 'Home must avoid hiding cards for the reserved more_like_this entry.')
has(home, /locallyHiddenPostIds/, 'Home must keep the minimal hide response for supported negative feedback.')
has(home, /已记录反馈|已记录这次反馈/, 'Home must use neutral feedback success copy.')

has(feedList, /showRecommendFeedback/, 'FeedList must be able to pass recommendation feedback affordances into PostCard.')
has(feedList, /@not-interested="\([^)]*\) => \$emit\('not-interested'/, 'FeedList must forward recommendation feedback events.')

has(explore, /normalizeRecommendationReason/, 'Explore recommendation reasons must use the shared neutral normalizer.')
has(recommendationGovernance, /AI 精准推荐|精准推荐|隐私画像|平台判断你需要|系统认为你必须看|猜你喜欢/, 'Recommendation normalizer must explicitly cover forbidden explanation copy.')

for (const [name, source] of [
  ['HomeView.vue', home],
  ['ExploreView.vue', explore],
  ['FeedList.vue', feedList],
  ['PostCard.vue', postCard],
]) {
  missing(source, /AI 精准推荐|隐私画像|平台判断你需要|你一定会喜欢|权威推荐|专家建议|付费优先|广告投放/, `${name} must not contain exaggerated, private-profile, paid, or endorsement recommendation copy.`)
}

console.log('Phase 12 recommendation reason and feedback guards passed.')
