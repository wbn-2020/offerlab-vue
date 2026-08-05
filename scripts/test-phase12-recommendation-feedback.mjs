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
has(feedApi, /more_like_this/, 'Feed feedback API must expose more_like_this as an explicit lightweight action.')
has(feedApi, /feedbackPayload/, 'Feed feedback API must map UI feedback actions through a backend-safe payload.')
has(feedApi, /action:\s*action as BackendFeedFeedbackAction/, 'Feed feedback must preserve the backend-supported action contract.')
has(feedApi, /reason:\s*action === 'not_interested' \? normalizedReason : `\$\{action\}:\$\{normalizedReason\}`/, 'Non-default feedback must preserve its action in the backend reason trace.')
has(feedApi, /client\.post\('\/api\/v1\/feeds\/feedback'/, 'All supported feedback actions must be recorded by the backend.')
missing(feedApi, /recorded locally/, 'Feed feedback must not pretend a backend-supported action is local-only.')
missing(feedApi, /hide_author/, 'Author controls must use the dedicated V29 API instead of the legacy hide_author action.')

has(postCard, /feedbackActions/, 'PostCard must define explicit recommendation feedback actions.')
for (const label of ['暂时隐藏', '减少同类', '恢复默认', '屏蔽作者']) {
  has(postCard, new RegExp(label), `PostCard feedback menu must expose ${label}.`)
}
has(postCard, /仅从你的信息流中隐藏该作者|不会通知对方/, 'Author controls must explain their private feed-only scope.')
has(postCard, /feedExplanationDetails[\s\S]*recommendationReasonDetails/, 'PostCard must render the server-provided explanation details.')
missing(postCard, /props\.post\.recommendationReasons/, 'PostCard must not render legacy recommendation reasons as visible explanation copy.')
has(postCard, /recommendationFeedbackSubmittedLabel|feedback-submitted-note/, 'PostCard must show a minimal local response after a feedback click.')
missing(postCard, /hide_author/, 'PostCard must not send the legacy hide_author action.')

has(home, /handleFeedControl[\s\S]*FeedbackReasonCode/, 'Home feed controls must receive the V30 typed feedback reason code.')
has(home, /reasonCode/, 'Home must forward a selected V30 feedback reason code to the Feed API.')
missing(home, /handleRecommendFeedback/, 'Home must not retain the legacy recommendation-feedback handler.')
missing(home, /more_like_this/, 'Home must not expose the legacy restore-only more_like_this action.')
has(home, /locallyHiddenPostIds/, 'Home must keep the minimal hide response for supported negative feedback.')
has(home, /当前内容已暂时隐藏|已减少同类内容/, 'Home must use accurate feed-control success copy.')
has(home, /handleAuthorBlock[\s\S]*feedApi\.blockAuthor/, 'Home must use the dedicated author-control endpoint.')

has(feedList, /showRecommendFeedback/, 'FeedList must be able to pass recommendation feedback affordances into PostCard.')
has(feedList, /reasonCode\) => \$emit\('feed-feedback'/, 'FeedList must forward bounded feedback reason codes.')
missing(feedList, /not-interested/, 'FeedList must not retain the legacy recommendation-feedback event.')

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
