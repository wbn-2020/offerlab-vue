import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const packageJson = JSON.parse(read('package.json'))
const recommendationGovernance = read('src/utils/recommendationGovernance.ts')
const homeView = read('src/views/HomeView.vue')
const exploreView = read('src/views/ExploreView.vue')
const topicDetail = read('src/views/TopicDetailView.vue')
const searchView = read('src/views/SearchView.vue')
const userProfile = read('src/views/UserProfileView.vue')
const meProfile = read('src/views/MeProfileView.vue')
const collectionDetail = read('src/views/CollectionDetailView.vue')
const contentSeriesApi = read('src/api/contentSeries.ts')
const publicPostVisibleBody = recommendationGovernance.slice(
  recommendationGovernance.indexOf('export const isPublicPostVisible'),
  recommendationGovernance.indexOf('export const filterVisiblePosts'),
)
const publicCollectionVisibleBody = recommendationGovernance.slice(
  recommendationGovernance.indexOf('export const isPublicCollectionVisible'),
  recommendationGovernance.indexOf('export const filterVisibleCollections'),
)

assert.equal(
  existsSync(new URL('test-phase11-governance-filter-guards.mjs', import.meta.url)),
  true,
  'Phase 11 governance filter guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:phase11-governance-filter-guards'],
  'node scripts/test-phase11-governance-filter-guards.mjs',
  'package.json must expose the Phase 11 governance filter guard.',
)
has(packageJson.scripts['test:guards'], /test:phase11-governance-filter-guards/, 'Full guard suite must include Phase 11 public-entry governance filters.')

for (const exportName of [
  'isConfirmedGovernanceViolation',
  'isPublicPostVisible',
  'filterVisiblePosts',
  'isStrongExposurePostVisible',
  'filterStrongExposurePosts',
  'isPublicCollectionVisible',
  'filterVisibleCollections',
]) {
  has(recommendationGovernance, new RegExp(`export const ${exportName}`), `recommendationGovernance must export ${exportName}.`)
}

has(recommendationGovernance, /reported|reportStatus|reportCount|pending_report/i, 'Reported content must be handled as a demotion signal.')
has(recommendationGovernance, /reported[\s\S]*false|return\s+false[\s\S]*reported/i, 'Reported-only content must not be treated as a confirmed violation.')
has(recommendationGovernance, /violation|illegal|rejected|confirmed_violation|confirmedViolation/i, 'Confirmed violations must be blocked by the shared guard.')
has(recommendationGovernance, /reviewing|pending_review|under_review|audit|moderating/i, 'Reviewing or audit-pending content must be blocked by the shared guard.')
has(recommendationGovernance, /high|severe|critical/i, 'High-risk content must be recognized by the shared guard.')
has(publicPostVisibleBody, /isUntreatedHighRiskContent\(post\)/, 'Default public post filtering must exclude untreated high-risk content before public entry reuse.')
has(recommendationGovernance, /isStrongExposurePostVisible[\s\S]*isUntreatedHighRiskContent|isUntreatedHighRiskContent[\s\S]*isStrongExposurePostVisible/, 'Strong exposure surfaces must exclude untreated high-risk content.')
has(publicCollectionVisibleBody, /isUntreatedHighRiskContent\(collection\)/, 'Public collection filtering must not package untreated high-risk collections.')

has(homeView, /filterVisiblePosts/, 'Home recommendation, hot, and featured feeds must reuse the shared public post governance filter.')
has(homeView, /cleanPosts\s*=\s*computed\(\(\)\s*=>\s*filterVisiblePosts/, 'Home feed rendering must be based on governed public posts.')
has(homeView, /const hotItems\s*=\s*hotRes\.status\s*===\s*'fulfilled'[\s\S]*?\?\s*filterVisiblePosts\(filterPublicContent\(/, 'Home hot preview sampling must be filtered before it affects feed state.')
has(homeView, /recommendPreviewPosts\.value\s*=\s*\[latestItems,\s*hotItems,\s*recommendRes\.status\s*===\s*'fulfilled'[\s\S]*?\?\s*filterVisiblePosts\(filterPublicContent\(/, 'Home recommendation preview must be filtered before entering the strong exposure card.')
has(homeView, /const continuedReadingPosts\s*=\s*computed\(\(\)\s*=>\s*\{[\s\S]*return recommendPreviewPosts\.value[\s\S]*\.slice\(0,\s*3\)/, 'Home continued-reading preview must derive from the governed recommendation preview pool.')

has(exploreView, /filterVisiblePosts/, 'Explore recommendations and featured content must reuse the shared public post governance filter.')
has(exploreView, /cleanLatestPosts\s*=\s*computed\(\(\)\s*=>\s*filterVisiblePosts/, 'Explore featured content must derive from governed public posts.')
has(exploreView, /crossDomainRecommendations[\s\S]*filterVisiblePosts/, 'Explore cross-domain recommendations must filter unavailable or risky posts.')
has(exploreView, /featuredPosts\s*=\s*computed\(\(\)\s*=>\s*cleanLatestPosts\.value\.filter\(isFeaturedPost\)/, 'Explore featured cards must derive from governed public posts.')

has(topicDetail, /filterVisiblePosts/, 'Topic featured and filtered post lists must reuse the shared public post governance filter.')
has(topicDetail, /filterVisiblePosts\(filterPublicContent\(page\?\.items/, 'Topic detail must filter loaded posts before rendering featured views.')

has(searchView, /filterVisiblePosts/, 'Search results must reuse the shared public post governance filter.')
has(searchView, /filterVisibleSearchTerms/, 'Search suggestions must keep a visible-text filter.')
missing(searchView, /confirmedViolation|reviewerUid|reviewNote/i, 'Search surfaces must not expose internal moderation or author-violation markers.')

has(userProfile, /filterVisiblePosts/, 'Public author profile posts must reuse the shared governance post filter.')
has(userProfile, /filterVisibleCollections/, 'Public author profile collections must reuse the shared governance collection filter.')
has(userProfile, /filterVisiblePosts\([^)]*\)[\s\S]*publicAuthorPosts|publicAuthorPosts\(\s*filterVisiblePosts/, 'Representative posts must be picked only after governance filtering.')
has(userProfile, /filterVisibleCollections\(res\.data/, 'Public author profile collections must be filtered after loading.')

has(meProfile, /filterVisiblePosts/, 'Creator workbench content lists must reuse the shared governance post filter.')
has(meProfile, /filterVisibleCollections/, 'Creator workbench collections must reuse the shared governance collection filter.')
has(meProfile, /authorPublicPosts[\s\S]*filterVisiblePosts|filterVisiblePosts[\s\S]*authorPublicPosts/, 'Creator workbench top posts and representative posts must be governance-filtered.')
has(meProfile, /topFeedbackPosts[\s\S]*authorPublicPosts|replyOpportunityPosts[\s\S]*authorPublicPosts/, 'Creator incentives must be based on the governed author-public post pool.')
has(meProfile, /myCollections\.value\s*=\s*filterVisibleCollections/, 'Creator workbench public collection signals must be governance-filtered.')

has(collectionDetail, /filterVisiblePosts/, 'Public collection detail posts must reuse the shared governance post filter.')
has(collectionDetail, /filterVisiblePosts\(page\?\.items/, 'Public collection detail must filter loaded posts before rendering.')

has(contentSeriesApi, /moderationStatus|reviewStatus|riskLevel|restricted|deleted/, 'Content series API records must preserve minimal governance fields for frontend filtering.')

for (const [name, source] of [
  ['SearchView.vue', searchView],
  ['UserProfileView.vue', userProfile],
  ['MeProfileView.vue', meProfile],
  ['CollectionDetailView.vue', collectionDetail],
]) {
  missing(source, /作者违规|违规作者|violationAuthor|authorViolation/i, `${name} must not publicly mark an author as violating rules.`)
  missing(source, /专业背书|专家背书|authority|certifiedExpert/i, `${name} must not package high-risk content as professional endorsement.`)
}

console.log('Phase 11 public-entry governance filter guards passed.')
