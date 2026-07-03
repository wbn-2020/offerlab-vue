import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const packageJson = JSON.parse(read('package.json'))
const postCard = read('src/components/post/PostCard.vue')
const homeView = read('src/views/HomeView.vue')
const exploreView = read('src/views/ExploreView.vue')
const searchView = read('src/views/SearchView.vue')
const trendDashboardView = read('src/views/TrendDashboardView.vue')
const feedApi = read('src/api/feed.ts')
const searchApi = read('src/api/search.ts')
const opsApi = read('src/api/ops.ts')
const adapters = read('src/api/adapters.ts')
const recommendationGovernance = read('src/utils/recommendationGovernance.ts')

assert.equal(
  existsSync(new URL('test-phase12-recommendation-ops-guards.mjs', import.meta.url)),
  true,
  'Phase 12 recommendation and curation guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:phase12-recommendation-ops'],
  'node scripts/test-phase12-recommendation-ops-guards.mjs',
  'package.json must expose the Phase 12 recommendation and curation guard.',
)
has(packageJson.scripts['test:guards'], /test:phase12-recommendation-ops/, 'Full guard suite must include Phase 12 recommendation and curation guard.')

for (const [name, source] of [
  ['PostCard.vue', postCard],
  ['HomeView.vue', homeView],
  ['ExploreView.vue', exploreView],
  ['SearchView.vue', searchView],
  ['TrendDashboardView.vue', trendDashboardView],
  ['feed.ts', feedApi],
  ['search.ts', searchApi],
  ['ops.ts', opsApi],
  ['adapters.ts', adapters],
]) {
  missing(source, /AI\s*精准推荐|隐私画像|平台判断你需要|权威推荐|专家建议|高收益内容|付费优先展示/, `${name} must not contain forbidden recommendation copy.`)
  missing(source, /advertis(e|ing|ement)|adSlot|paidExposure|sponsor|membershipRecommendation|privacyProfile|mlFeature/i, `${name} must not add ad, paid exposure, membership, privacy-profile, or ML feature surfaces.`)
}

missing(recommendationGovernance, /advertis(e|ing|ement)|adSlot|paidExposure|sponsor|membershipRecommendation|privacyProfile|mlFeature/i, 'recommendationGovernance.ts must not add ad, paid exposure, membership, privacy-profile, or ML feature surfaces.')

has(postCard, /displayRecommendationReasons/, 'PostCard must render explainable recommendation reasons.')
has(postCard, /normalizeRecommendationReason/, 'PostCard recommendation reasons must pass through the shared neutral reason normalizer.')
has(postCard, /feedbackActions/, 'PostCard must expose recommendation feedback actions.')
for (const action of ['not_interested', 'less_like_this', 'hide_author', 'more_like_this']) {
  has(postCard, new RegExp(action), `PostCard feedback menu must include ${action}.`)
}
has(postCard, /recommendationFeedbackSubmittedLabel|feedback-submitted-note/, 'PostCard must show a minimal local response after recommendation feedback.')

has(feedApi, /recordFeedback/, 'Feed API must expose recommendation feedback recording.')
has(feedApi, /action[^=]*=\s*'not_interested'/, 'Feed feedback must default to not_interested.')
has(feedApi, /less_like_this[\s\S]*hide_author[\s\S]*more_like_this|more_like_this[\s\S]*hide_author[\s\S]*less_like_this/, 'Feed API contract must explicitly allow lightweight Phase 12 feedback actions without implying personalization is live.')

has(homeView, /locallyHiddenPostIds/, 'Home feed must hide current cards after negative recommendation feedback.')
has(homeView, /handleRecommendFeedback/, 'Home feed must wire recommendation feedback handling.')
has(homeView, /filterVisiblePosts/, 'Home feed and curation surfaces must pass through governance filtering.')
has(homeView, /featuredPreview\s*=\s*computed\(\(\)\s*=>\s*cleanPosts\.value\.filter\(isFeaturedPost\)/, 'Home featured pool must derive from governed public posts.')

has(exploreView, /filterVisiblePosts/, 'Explore recommendations, rankings, and featured surfaces must pass through governance filtering.')
has(exploreView, /crossDomainRecommendations[\s\S]*filterVisiblePosts/, 'Explore cross-domain recommendations must be filtered before display.')

has(searchView, /filterVisibleSearchTerms/, 'Search suggestions and hot terms must use visible-term filtering.')
has(searchView, /hotWords\.value\s*=\s*filterVisibleSearchTerms/, 'Search hot words must be filtered before display.')
has(searchView, /suggestions\.value\s*=\s*filterVisibleSearchTerms/, 'Search suggestions must be filtered before display.')
missing(searchView, /personal search history|privateSearchHistory|userSearchHistory/i, 'Search suggestions must not expose personal search history.')

has(trendDashboardView, /COMMUNITY_RECOMMEND_CLICK|recommendClicks|hotSearch|searchTrend|trend/i, 'Trend dashboard must expose a lightweight recommendation/search trend ops summary.')
has(opsApi, /recommendClicks|searchTrends|hotSearch|topRecommendationClicks|recommendation/, 'Ops API must expose lightweight recommendation/search trend operations data.')

has(recommendationGovernance, /filterVisiblePosts/, 'Recommendation governance must export public post filtering.')
has(recommendationGovernance, /filterStrongExposurePosts/, 'Recommendation governance must export strong exposure filtering for rankings and curation.')
has(recommendationGovernance, /normalizeRecommendationReason/, 'Recommendation governance must normalize recommendation reason copy.')
has(recommendationGovernance, /isUntreatedHighRiskContent/, 'Recommendation governance must block untreated high-risk content from distribution.')

console.log('Phase 12 recommendation and curation frontend guards passed.')
