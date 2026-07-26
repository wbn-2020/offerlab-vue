import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const readVue = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const readRepo = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const packageJson = JSON.parse(readVue('package.json'))
const searchView = readVue('src/views/SearchView.vue')
const searchApi = readVue('src/api/search.ts')
const recommendationGovernance = readVue('src/utils/recommendationGovernance.ts')
const searchController = readRepo('offerlab-java/community-domain-search/src/main/java/com/offerlab/community/search/controller/SearchController.java')
const analyticsTrackCmd = readRepo('offerlab-java/community-domain-search/src/main/java/com/offerlab/community/search/api/dto/SearchAnalyticsTrackCmd.java')
const analyticsDto = readRepo('offerlab-java/community-domain-search/src/main/java/com/offerlab/community/search/api/dto/SearchAnalyticsDTO.java')
const analyticsItemDto = readRepo('offerlab-java/community-domain-search/src/main/java/com/offerlab/community/search/api/dto/SearchAnalyticsItemDTO.java')
const gapDto = readRepo('offerlab-java/community-domain-search/src/main/java/com/offerlab/community/search/api/dto/SearchContentGapDTO.java')
const trackCommunityRecommendationClickBlock = searchView.slice(
  searchView.indexOf('const trackCommunityRecommendationClick'),
  searchView.indexOf('const runRecommendationAction'),
)
const analyticsTrackReqBlock = searchApi.slice(
  searchApi.indexOf('export interface SearchAnalyticsTrackReq'),
  searchApi.indexOf('export type SearchSuggestionType'),
)

const publicSearchSurfaces = [searchView, searchApi]
const forbiddenCopy = [
  '广告',
  '竞价',
  '付费置顶',
  '保证曝光',
  '保证精选',
  '收益',
  '官方背书',
  '私人 AI 教练',
  '私人AI教练',
]
const privacyFields = [
  'uid',
  'userId',
  'ipAddress',
  'clientIp',
  'deviceId',
  'fingerprint',
  'rawSession',
  'rawQuery',
  'singleSearchTime',
  'singleSearchAt',
  'searchDuration',
]

assert.equal(
  existsSync(new URL('test-v4-search-discovery-guards.mjs', import.meta.url)),
  true,
  'V4 search discovery guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:v4-search-discovery-guards'],
  'node scripts/test-v4-search-discovery-guards.mjs',
  'package.json must expose the V4 search discovery guard without starting services.',
)
missing(
  packageJson.scripts['test:v4-search-discovery-guards'],
  /\b(vite|preview|playwright|cypress|docker|redis|kafka|elastic|serve|dev)\b/i,
  'V4 search discovery guard script must not start a service, browser, Docker, DB, Redis, Kafka, or Elasticsearch.',
)

has(searchView, /type RecommendationSource = 'remote' \| 'local' \| 'fallback' \| 'demo'/, 'Zero-result actions must carry an explicit source bucket.')
has(searchView, /type RecommendationAction = \{[\s\S]*key: string[\s\S]*label: string[\s\S]*source: RecommendationSource[\s\S]*action: \(\) => void \| Promise<void>[\s\S]*\}/, 'ZeroResultAction structure must include key, label, source, and action.')
has(searchView, /type KeywordRecommendation = \{[\s\S]*label: string[\s\S]*source: RecommendationSource[\s\S]*\}/, 'SearchSuggestionItem-style keyword recommendations must include visible label and source.')
has(searchView, /const suggestions = ref<string\[\]>\(\[\]\)/, 'Search suggestions must stay label-only in public UI state.')
has(searchView, /const suggestionSource = ref<RecommendationSource>\('fallback'\)/, 'Search suggestions must keep a source marker for fallback/demo isolation.')
has(searchView, /const hotWordsSource = ref<RecommendationSource>\('fallback'\)/, 'Hot words must keep a source marker for fallback/demo isolation.')
has(searchView, /filterVisibleSearchTerms[\s\S]*filterSearchSuggestionTerms/, 'Search suggestions and hot words must pass shared governance filtering.')
has(searchView, /suggestions\.value = filterVisibleSearchTerms\(res\.data\)[\s\S]*suggestionSource\.value = suggestions\.value\.length \? 'remote' : 'fallback'/, 'Remote suggestions must be marked remote only after visible filtering.')
has(searchView, /hotWords\.value = filterVisibleSearchTerms\(res\.data\)[\s\S]*hotWordsSource\.value = hotWords\.value\.length \? 'remote' : 'fallback'/, 'Remote hot words must be marked remote only after visible filtering.')

has(searchView, /const shouldTrackPublicRecommendation = \(source: RecommendationSource\) => source === 'remote'/, 'Only remote public recommendation actions may enter analytics.')
has(searchView, /const trackCommunityRecommendationClick = \(target: string, source: RecommendationSource = 'remote'\) => \{[\s\S]*if \(!shouldTrackPublicRecommendation\(source\)\) return[\s\S]*searchApi\.trackAnalytics/, 'Fallback, demo, and local zero-result actions must be blocked before analytics.')
for (const marker of [
  /trackCommunityRecommendationClick\(`channel:\$\{channel\.key\}`, 'fallback'\)/,
  /trackCommunityRecommendationClick\(`topic:\$\{topic\}`, 'fallback'\)/,
  /trackCommunityRecommendationClick\(`tag:\$\{tag\}`, 'fallback'\)/,
  /trackCommunityRecommendationClick\('error:hot-content', 'local'\)/,
  /trackCommunityRecommendationClick\('error:user-search', 'local'\)/,
]) {
  has(searchView, marker, 'Fallback/demo/local zero-result actions must pass their source into the analytics guard.')
}
has(searchView, /trackCommunityRecommendationClick\(`relax:\$\{item\.key\}`, item\.source\)/, 'Relax zero-result actions must pass source through the analytics guard.')
has(searchView, /trackCommunityRecommendationClick\(`keyword:\$\{item\.label\}`, item\.source\)/, 'Keyword zero-result actions must pass source through the analytics guard.')

has(searchApi, /const publicParams: SearchParams = \{[\s\S]*q: params\.q,[\s\S]*company: params\.company,[\s\S]*position: params\.position,[\s\S]*type: params\.type,[\s\S]*domain: params\.domain,[\s\S]*sort: params\.sort,[\s\S]*cursor: params\.cursor,[\s\S]*size: params\.size,[\s\S]*\}[\s\S]*client\.get\('\/api\/v1\/search\/posts', \{ params: publicParams \}\)/, 'Frontend public search must whitelist backend-supported query parameters, including domain.')
missing(searchApi, /includeTestData|yearsOfExp/, 'Frontend public search contract must not expose unsupported diagnostic parameters.')
has(searchController, /facade\.searchPosts\(keyword, company, position, type, domain, sort, cursor, size, false,[\s\S]*trustFilter\)\.publicView\(\)/, 'Public backend search endpoint must pass domain and trust filters, force includeTestData=false, and return publicView.')
has(searchView, /搜索建议来自公开内容和近期公共搜索趋势[\s\S]*最近搜索和保存搜索只保存在本机，不进入公共趋势或创作者建议/, 'Search copy must explain public suggestions and local-only snapshots.')
has(searchView, /const RECENT_SEARCH_KEY = 'recent-searches'[\s\S]*const SAVED_SEARCH_KEY = 'saved-searches'/, 'Recent searches and saved searches must use separate storage keys.')
has(searchView, /const storageKey = \(name: string\) => `offerlab:\$\{storageOwner\.value\}:\$\{name\}`/, 'Recent and saved searches must be scoped by viewer/guest owner.')
has(searchView, /recentSearches\.value = readSnapshots\(RECENT_SEARCH_KEY\)[\s\S]*savedSearches\.value = readSnapshots\(SAVED_SEARCH_KEY\)/, 'Recent and saved searches must be loaded independently.')
has(searchView, /writeSnapshots\(RECENT_SEARCH_KEY, next\)/, 'Recent searches must write only the recent-search storage key.')
has(searchView, /writeSnapshots\(SAVED_SEARCH_KEY, next\)/, 'Saved searches must write only the saved-search storage key.')
missing(trackCommunityRecommendationClickBlock, /recentSearches|savedSearches|writeSnapshots|safeStorage/, 'Local recent/saved search storage must not feed analytics.')

for (const source of publicSearchSurfaces) {
  for (const forbidden of forbiddenCopy) {
    missing(source, new RegExp(forbidden.replace(/ /g, '\\s*')), `Public V4 search/discovery copy must not contain red-line wording: ${forbidden}.`)
  }
}
for (const [label, pattern] of [
  ['广告投放', /广告投放|\\u5e7f\\u544a\\u6295\\u653e/],
  ['付费曝光', /付费曝光|\\u4ed8\\u8d39\\u66dd\\u5149/],
  ['付费置顶', /付费置顶/],
  ['搜索词竞价', /搜索词竞价/],
  ['收益分成', /收益分成|\\u6536\\u76ca\\u5206\\u6210/],
  ['官方背书', /官方背书/],
]) {
  has(recommendationGovernance, pattern, `Shared search governance must continue blocking red-line term: ${label}.`)
}

const publicAnalyticsSurface = [searchApi, analyticsTrackCmd, analyticsDto, analyticsItemDto, gapDto].join('\n')
for (const field of privacyFields) {
  missing(publicAnalyticsSurface, new RegExp(`\\b${field}\\b`, 'i'), `Public analytics/content-gap contracts must not expose privacy field: ${field}.`)
}
has(analyticsTrackReqBlock, /eventType[\s\S]*keyword\?[\s\S]*company\?[\s\S]*target\?/, 'Frontend analytics tracking request must stay aggregate/event oriented.')
missing(analyticsTrackReqBlock, /\b(source|fallback|demo|recent|saved)\b/, 'Frontend analytics tracking request must not carry fallback/demo/local snapshot source fields.')
has(analyticsTrackCmd, /private String eventType;[\s\S]*private String keyword;[\s\S]*private String company;[\s\S]*private String target;/, 'Backend analytics tracking command must stay limited to aggregate event fields.')

console.log('V4 search discovery guards passed.')
