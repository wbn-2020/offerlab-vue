import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const readVue = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const readRepo = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const packageJson = JSON.parse(readVue('package.json'))
const searchView = readVue('src/views/SearchView.vue')
const exploreView = readVue('src/views/ExploreView.vue')
const knowledgeExploreView = readVue('src/views/KnowledgeExploreView.vue')
const postCard = readVue('src/components/post/PostCard.vue')
const searchApi = readVue('src/api/search.ts')
const discoveryApi = readVue('src/api/discovery.ts')
const discoveryComposable = readVue('src/composables/useDiscoveryMap.ts')
const recommendationGovernance = readVue('src/utils/recommendationGovernance.ts')
const searchFacade = readRepo('offerlab-java/community-domain-search/src/main/java/com/offerlab/community/search/application/SearchFacadeImpl.java')
const postBriefDto = readRepo('offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/api/dto/PostBriefDTO.java')

const forbiddenSearchDiscoveryCopy = [
  '官方背书',
  '平台担保',
  '权威认证',
  '限时购买',
  '会员专享',
  '赞助推荐',
  '付费置顶',
  '广告搜索',
  '搜索词竞价',
  '付费曝光',
]

assert.equal(
  existsSync(new URL('test-phase17-search-discovery-guards.mjs', import.meta.url)),
  true,
  'Phase 17 search discovery guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:phase17-search-discovery'],
  'node scripts/test-phase17-search-discovery-guards.mjs',
  'package.json must expose the Phase 17 search discovery guard.',
)
has(packageJson.scripts['test:guards'], /test:phase17-search-discovery/, 'Full guard suite must include Phase 17 search discovery guard.')

has(searchApi, /PaginatedResponse<Post>/, 'Search API must keep returning a paginated post response with metadata.')
has(searchView, /搜索建议来自公开内容和近期公共搜索趋势/, 'SearchView must explain suggestions as public discovery signals.')
has(searchView, /searchResultMeta[\s\S]*source[\s\S]*degraded[\s\S]*fallbackReason[\s\S]*scanLimit[\s\S]*diagnostics/, 'SearchView must surface backend source, degraded state, fallback reason, scan limit, and diagnostics.')
has(searchView, /filters\.domain = undefined/, 'SearchView must not expose domain/channel as a fake backend-supported search filter.')
has(searchView, /show-reason-panel/, 'Search results must expose per-item explanations without opening recommendation feedback controls.')
has(searchView, /const searchHitReasons\s*=\s*\(post: Post\)/, 'SearchView may derive fallback hit explanations only from visible post fields.')
has(searchView, /post\.highlightTitle[\s\S]*post\.highlightSummary/, 'Fallback hit explanations must use backend highlights when available.')
has(searchView, /containsTerm\(post\.title[\s\S]*containsTerm\(post\.summary/, 'Fallback hit explanations must use visible title and summary matches.')
has(searchView, /post\.tags\.map[\s\S]*标签匹配/, 'Fallback hit explanations must use real tag fields.')
has(searchView, /postTopicNames\(post\)[\s\S]*话题匹配/, 'Fallback hit explanations must use real topic fields.')
has(searchView, /<details class="filter-details" open>/, 'Mobile filters must be collapsible without overlaying results.')
has(searchView, /v-if="includeTestData"[\s\S]*包含测试数据/, 'Test-data mode must not be a normal public filter control.')
has(postCard, /showReasonPanel[\s\S]*showRecommendFeedback/, 'PostCard must separate reason display from recommendation feedback controls.')
has(postCard, /reasonPanelTitle[\s\S]*命中说明/, 'PostCard must label search result reasons as hit explanations, not recommendations.')
has(postCard, /isSearchContext[\s\S]*from.*search/, 'PostCard must detect search context from route detail query metadata.')
has(postCard, /const hotReasonLabel[\s\S]*if \(isSearchContext\.value\) return normalizedReason/, 'Search-context cards must not show hot/recommendation interaction reasons as search explanations.')
has(searchFacade, /setRecommendationReasons|recommendationReasons/, 'Backend search results must attach verifiable per-item hit reasons.')
has(searchFacade, /标题高亮命中|摘要高亮命中|标签匹配搜索词|结构化字段匹配/, 'Backend hit reasons must come from highlight, title, summary, tags, or structured fields.')
missing(searchFacade, /FALLBACK_HOT/, 'Backend hot searches must not expose static fallback seeds as real trends.')
has(searchFacade, /emptyHints/, 'Backend search metadata must include no-result repair hints.')
has(postBriefDto, /List<String> recommendationReasons/, 'PostBriefDTO must carry verifiable search hit reasons for the frontend.')

has(exploreView, /useDiscoveryMap/, 'ExploreView must read the bounded DiscoveryMap contract instead of rebuilding discovery locally.')
has(discoveryComposable, /discoveryApi\.getDiscoveryMap/, 'ExploreView must load discovery modules through the DiscoveryMap composable.')
has(discoveryApi, /featuredTopics\s*=\s*adaptItems\(raw\.featuredTopics,\s*5\)/, 'Explore featured topics must stay bounded.')
has(discoveryApi, /channels\s*=\s*adaptItems\(raw\.channels,\s*8\)/, 'Explore channel entries must stay bounded.')
has(discoveryApi, /activeTopics\s*=\s*adaptItems\(raw\.activeTopics,\s*8\)/, 'Explore active topics must stay bounded.')
has(discoveryApi, /searchEntrypoints\s*=\s*adaptItems\(raw\.searchEntrypoints,\s*6\)/, 'Explore search entries must stay bounded.')
has(discoveryApi, /DisplayableDiscoverySource\s*=\s*Exclude<DiscoverySource,\s*'fallback-demo'\s*\|\s*'unavailable'>/, 'Fallback or unavailable sources must not be displayable discovery items.')
has(discoveryApi, /slug\?: string/, 'Discovery items must expose a stable slug when a topic href is available.')
has(discoveryApi, /reasonText\?: string/, 'Discovery items must expose a stable reasonText field for curation explanations.')
has(discoveryApi, /deriveTopicSlug/, 'Discovery adapter must derive a stable topic slug from safe topic hrefs.')
has(discoveryApi, /reasonText:\s*safeReasonText/, 'Discovery adapter must normalize reasonText from remote curation reasons.')
missing(discoveryApi.slice(discoveryApi.indexOf('const adaptItem'), discoveryApi.indexOf('const adaptItems')), /fallback-demo|unavailable/, 'Fallback/demo/unavailable must not be allowed inside real discovery item arrays.')
has(exploreView, /\/search/, 'ExploreView must keep search as a first-class discovery entry.')
missing(exploreView, /postApi|domainApi|userApi|searchApi|operationsApi/, 'ExploreView must not stitch discovery modules from page-level fallback calls.')
has(exploreView, /degraded/, 'ExploreView must visibly degrade module sources instead of pretending fallback data is real.')
has(knowledgeExploreView, /轻量查看|不是做重型知识图谱/, 'KnowledgeExploreView must keep the knowledge entry lightweight and non-authoritative.')
has(knowledgeExploreView, /const nodeRoute\s*=\s*\(node: KnowledgeRelationNode\)/, 'KnowledgeExploreView must route known node types.')
has(knowledgeExploreView, /node\.type === 'tag'[\s\S]*\/tag\//, 'KnowledgeExploreView must connect tag nodes to tag pages.')
has(knowledgeExploreView, /node\.type === 'topic'[\s\S]*\/topics\//, 'KnowledgeExploreView must connect topic nodes to topic pages.')
missing(knowledgeExploreView, /\bseriesId\b/, 'KnowledgeExploreView must not advertise unsupported series filters.')

has(recommendationGovernance, /filterSearchSuggestionTerms/, 'Search suggestions and hot words must use the shared governance filter.')
has(recommendationGovernance, /sensitiveSuggestionPatterns[\s\S]*限时购买[\s\S]*赞助推荐[\s\S]*付费置顶[\s\S]*官方背书[\s\S]*平台担保[\s\S]*权威认证/, 'Shared search term guard must block prohibited non-commercial copy.')
has(recommendationGovernance, /blockedReasonPatterns[\s\S]*限时购买[\s\S]*搜索词竞价[\s\S]*官方背书[\s\S]*平台担保[\s\S]*权威认证/, 'Shared recommendation reason guard must neutralize prohibited non-commercial copy.')

for (const source of [searchView, exploreView, knowledgeExploreView, postCard]) {
  for (const forbidden of forbiddenSearchDiscoveryCopy) {
    missing(source, new RegExp(forbidden), `Public search/discovery surfaces must not contain prohibited copy: ${forbidden}.`)
  }
}

console.log('Phase 17 search discovery guards passed.')
