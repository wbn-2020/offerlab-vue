import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const packageJson = JSON.parse(read('package.json'))
const searchSafety = read('src/utils/searchCurationSafety.ts')
const searchView = read('src/views/SearchView.vue')
const trendDashboard = read('src/views/TrendDashboardView.vue')
const searchApi = read('src/api/search.ts')
const opsApi = read('src/api/ops.ts')

assert.equal(
  existsSync(new URL('test-phase12-search-curation-guards.mjs', import.meta.url)),
  true,
  'Phase 12 search and curation guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:phase12-search-curation'],
  'node scripts/test-phase12-search-curation-guards.mjs',
  'package.json must expose the Phase 12 search and curation guard.',
)
has(packageJson.scripts['test:guards'], /test:phase12-search-curation/, 'Full guard suite must include Phase 12 search and curation checks.')

for (const exportName of [
  'filterSearchDiscoveryTerms',
  'isUnsafeDiscoveryTerm',
  'buildBasicRankingItems',
  'buildCurationSlots',
]) {
  has(searchSafety, new RegExp(`export const ${exportName}`), `searchCurationSafety must export ${exportName}.`)
}

has(searchSafety, /违法|骚扰|隐私|低质|人肉|开盒|手机号|身份证|转账|付费曝光|广告投放/i, 'Search discovery safety must explicitly filter illegal, harassment, privacy, low-quality and commercialization terms.')
has(searchSafety, /filterVisibleTexts/, 'Search discovery terms must reuse visible-text sanitization.')
has(searchSafety, /isSyntheticVisibleText/, 'Search discovery terms must filter test and synthetic terms.')
has(searchSafety, /filterVisiblePosts/, 'Curation and ranking pools must reuse shared post governance filtering.')
has(searchSafety, /filterStrongExposurePosts/, 'Curation slots must use strong-exposure governance filtering.')
has(searchSafety, /频道编辑整理|本周精选|近 7 天收藏较多|近 30 天互动较多|内容组织，不是广告位/, 'Ranking and curation reasons must be explainable and non-advertising.')
missing(searchSafety, /AI 精准推荐|隐私画像|猜你喜欢|系统认为你必须看|付费优先|付费置顶|专家建议|权威推荐/, 'Search and curation helpers must not contain exaggerated recommendation, privacy, paid exposure or endorsement copy.')

has(searchView, /filterSearchDiscoveryTerms/, 'SearchView must use the shared Phase 12 discovery-term filter.')
has(searchView, /hotWords\.value = filterVisibleSearchTerms\(res\.data\)/, 'Hot search terms must pass through the shared search term filter.')
has(searchView, /suggestions\.value = filterVisibleSearchTerms\(res\.data\)/, 'Search suggestions must pass through the shared search term filter.')
has(searchView, /搜索建议来自公开内容和近期公共搜索趋势/, 'SearchView must explain that suggestions are public discovery signals, not personal history.')
missing(searchView, /个人搜索历史|你的搜索历史|根据你的浏览|隐私画像/, 'SearchView must not expose or imply personal search history in suggestions.')

has(trendDashboard, /buildBasicRankingItems/, 'TrendDashboard must build explainable basic ranking items.')
has(trendDashboard, /buildCurationSlots/, 'TrendDashboard must build minimal curation slots.')
has(trendDashboard, /运营组织入口/, 'TrendDashboard must expose an operations organization entry.')
has(trendDashboard, /内容组织，不是广告位/, 'Curation slot copy must clearly avoid advertising semantics.')
has(trendDashboard, /治理过滤|公开内容信号/, 'Ranking and curation modules must mention governance filtering and public signals.')
missing(trendDashboard, /广告投放|付费曝光|商业化推荐|专家背书|权威榜/, 'TrendDashboard must not turn curation or ranking into ads, paid exposure, commercial recommendation, or authority ranking.')

has(searchApi, /SearchDiscoveryTerm|SearchSuggestResponse/, 'Search API types must describe search suggestions and hot terms without personal history.')
has(opsApi, /RecommendationOpsSummary|curation|ranking|hotSearch/, 'Ops API must expose a lightweight recommendation operations summary contract.')

console.log('Phase 12 search and curation guards passed.')
