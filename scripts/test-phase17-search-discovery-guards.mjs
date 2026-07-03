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
has(searchFacade, /setRecommendationReasons|recommendationReasons/, 'Backend search results must attach verifiable per-item hit reasons.')
has(searchFacade, /标题高亮命中|摘要高亮命中|标签匹配搜索词|结构化字段匹配/, 'Backend hit reasons must come from highlight, title, summary, tags, or structured fields.')
missing(searchFacade, /FALLBACK_HOT/, 'Backend hot searches must not expose static fallback seeds as real trends.')
has(searchFacade, /emptyHints/, 'Backend search metadata must include no-result repair hints.')
has(postBriefDto, /List<String> recommendationReasons/, 'PostBriefDTO must carry verifiable search hit reasons for the frontend.')

has(exploreView, /quickFilters\.slice\(0,\s*6\)/, 'Explore quick filters must stay bounded.')
has(exploreView, /primaryChannelCards\.slice\(0,\s*6\)/, 'Explore channel section must stay within 3-6 stable entries.')
has(exploreView, /topicItems\.slice\(0,\s*6\)/, 'Explore topic section must stay within 3-6 stable entries.')
has(exploreView, /displayTags\.slice\(0,\s*6\)/, 'Explore tag section must stay within 3-6 stable entries.')
has(exploreView, /visibleLatestPosts\.slice\(0,\s*6\)/, 'Explore latest section must stay within 3-6 stable entries.')
has(exploreView, /const ENABLE_CROSS_DOMAIN_DISCOVERY = false/, 'Unstable cross-domain discovery must be hidden and not requested.')
has(exploreView, /SHOW_CONTENT_TYPE_DISCOVERY = false[\s\S]*SHOW_COMMUNITY_QUESTION_ENTRY = false/, 'Unstable extra discovery sections must stay behind explicit flags.')
has(exploreView, /\/search/, 'ExploreView must keep search as a first-class discovery entry.')
has(exploreView, /\/knowledge\/explore/, 'ExploreView must keep the knowledge entry linked from discovery.')
has(exploreView, /topicSourceMode[\s\S]*fallback|loadFallbackNotes/, 'ExploreView must visibly degrade topic/fallback sources instead of pretending they are trends.')
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
