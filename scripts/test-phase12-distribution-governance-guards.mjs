import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const packageJson = JSON.parse(read('package.json'))
const recommendationGovernance = read('src/utils/recommendationGovernance.ts')
const adapters = read('src/api/adapters.ts')
const recommendationsApi = read('src/api/recommendations.ts')
const searchView = read('src/views/SearchView.vue')
const exploreView = read('src/views/ExploreView.vue')
const homeView = read('src/views/HomeView.vue')
const postCard = read('src/components/post/PostCard.vue')
const publicDistributionSurfaces = [
  recommendationsApi,
  searchView,
  exploreView,
  homeView,
  postCard,
].join('\n')

assert.equal(
  existsSync(new URL('test-phase12-distribution-governance-guards.mjs', import.meta.url)),
  true,
  'Phase 12 distribution governance guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:phase12-distribution-governance-guards'],
  'node scripts/test-phase12-distribution-governance-guards.mjs',
  'package.json must expose the Phase 12 distribution governance guard.',
)
has(packageJson.scripts['test:guards'], /test:phase12-distribution-governance-guards/, 'Full guard suite must include Phase 12 distribution governance.')

for (const exportName of [
  'filterDistributionPosts',
  'filterStrongExposurePosts',
  'filterSearchSuggestionTerms',
  'normalizeRecommendationReason',
  'neutralizeHighRiskRecommendationReason',
]) {
  has(recommendationGovernance, new RegExp(`export const ${exportName}`), `recommendationGovernance must export ${exportName}.`)
}

has(recommendationGovernance, /deleted|isDeleted|restricted|isRestricted|private|hidden|reviewing|pending_review|under_review|confirmed_violation|illegal|violation/i, 'Distribution filtering must cover deleted, restricted, private, reviewing, and violation states.')
has(recommendationGovernance, /isUntreatedHighRiskContent/, 'Distribution filtering must recognize untreated high-risk content.')
has(recommendationGovernance, /filterDistributionPosts[\s\S]*filterStrongExposurePosts|filterStrongExposurePosts[\s\S]*filterDistributionPosts/, 'Shared distribution filtering must be the basis for strong-exposure pools.')
has(recommendationGovernance, /filterSearchSuggestionTerms[\s\S]*sensitiveSuggestionPatterns|sensitiveSuggestionPatterns[\s\S]*filterSearchSuggestionTerms/, 'Search suggestions must run through a shared sensitive-term filter.')
has(recommendationGovernance, /广告|支付|会员|隐私画像|AI 精准|精准推荐|付费|收益|提现|专家建议|权威推荐|专业背书/i, 'Shared guards must explicitly block commercial, private-profile, AI-precision, and endorsement wording.')
has(recommendationGovernance, /neutralizeHighRiskRecommendationReason[\s\S]*同频道近期讨论较多|近期社区互动热度较高|频道编辑整理/, 'High-risk recommendation reasons must fall back to neutral wording.')

has(adapters, /normalizeRecommendationReason/, 'Post adapter must normalize recommendationReasons before public rendering.')
has(adapters, /neutralizeHighRiskRecommendationReason/, 'Post adapter must neutralize recommendationReasons for high-risk content.')
has(adapters, /filterDistributionPosts/, 'Adapter layer must expose governed page adaptation for distribution entries.')
has(adapters, /adaptDistributionPage/, 'Adapter layer must provide a governed distribution page adapter.')
missing(adapters, /recommendationReasons:\s*Array\.isArray\([^?]+?\)\s*\?\s*[^:]+?\.map\(\(item: unknown\) => sanitizeVisibleText\(item\)\)/s, 'Post adapter must not pass raw recommendation reasons through only text sanitization.')

has(recommendationsApi, /adaptDistributionPage/, 'Cross-domain recommendation API must use governed distribution page adaptation.')
has(recommendationsApi, /normalizeRecommendationReason|neutralizeHighRiskRecommendationReason/, 'Cross-domain recommendation reasons must be normalized before rendering.')
has(recommendationsApi, /filterDistributionPosts\(raw\?\.item\?\.post/, 'Cross-domain recommendations must drop unavailable, private, reviewing, violating, or untreated high-risk posts.')

has(searchView, /filterSearchSuggestionTerms/, 'Search suggestions must use the shared suggestion safety filter.')
has(searchView, /filterVisibleSearchTerms[\s\S]*filterSearchSuggestionTerms/, 'Search suggestions must filter unsafe suggestions before rendering.')

has(homeView, /<PostCard\b/, 'HomeView must render feed entries through the governed PostCard component.')

for (const [name, source] of [
  ['ExploreView.vue', exploreView],
  ['PostCard.vue', postCard],
]) {
  has(source, /normalizeRecommendationReason|neutralizeHighRiskRecommendationReason/, `${name} must normalize recommendation reason copy before display.`)
}

for (const [name, source] of [
  ['HomeView.vue', homeView],
  ['ExploreView.vue', exploreView],
  ['PostCard.vue', postCard],
]) {
  missing(source, /AI 精准推荐|隐私画像|付费优先|广告投放|专家建议|权威推荐|专业背书/i, `${name} must not render prohibited recommendation or endorsement copy.`)
}

missing(
  publicDistributionSurfaces,
  /广告投放|付费曝光|会员专属推荐|收益分成|提现|隐私画像推荐|AI 精准推荐|大模型个性化推荐|专家背书|权威推荐/i,
  'Distribution surfaces must stay non-ad, non-payment, non-membership, non-private-profile, and non-endorsement focused.',
)

console.log('Phase 12 distribution governance guards passed.')
