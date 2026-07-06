import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const packageJson = JSON.parse(read('package.json'))
const recommendationGovernance = read('src/utils/recommendationGovernance.ts')
const exploreView = read('src/views/ExploreView.vue')
const searchView = read('src/views/SearchView.vue')
const searchApi = read('src/api/search.ts')
const knowledgeExploreView = read('src/views/KnowledgeExploreView.vue')
const adapters = read('src/api/adapters.ts')
const contentSeries = read('src/api/contentSeries.ts')
const operationsApi = read('src/api/operations.ts')
const opsGuard = read('src/utils/opsOrchestrationGuard.ts')
const operationSlotCard = existsSync(new URL('../src/components/operations/OperationSlotCard.vue', import.meta.url))
  ? read('src/components/operations/OperationSlotCard.vue')
  : ''

assert.equal(
  existsSync(new URL('test-phase17-search-discovery-privacy-guards.mjs', import.meta.url)),
  true,
  'Phase 17 search/discovery/privacy guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:phase17-search-discovery-privacy'],
  'node scripts/test-phase17-search-discovery-privacy-guards.mjs',
  'package.json must expose the Phase 17 search/discovery/privacy guard.',
)
has(packageJson.scripts['test:guards'], /test:phase17-search-discovery-privacy/, 'Full guard suite must include Phase 17 search/discovery/privacy guard.')

for (const exportName of [
  'ViewerDiscoverySuppressions',
  'isBlockedByDiscoverySuppression',
  'filterDiscoverySuppressedItems',
]) {
  has(recommendationGovernance, new RegExp(`export (interface|const) ${exportName}`), `recommendationGovernance must export ${exportName}.`)
}
for (const suppressionField of [
  'blockedAuthorIds',
  'hiddenAuthorIds',
  'suppressedTopicIds',
  'suppressedTagIds',
  'blockedKeywords',
  'negativeFeedbackKeys',
]) {
  has(recommendationGovernance, new RegExp(suppressionField), `Discovery suppression must honor ${suppressionField}.`)
}
has(recommendationGovernance, /item\?\.post \|\| item\?\.item\?\.post/, 'Discovery suppression must inspect wrapped recommendation posts.')
has(recommendationGovernance, /itemAuthorIds[\s\S]*itemTopicIds[\s\S]*itemTagIds[\s\S]*blockedKeywords[\s\S]*negativeFeedbackKeys/, 'Discovery suppression must cover authors, topics, tags, keywords, and negative feedback keys.')

has(exploreView, /filterDiscoverySuppressedItems/, 'ExploreView must use shared discovery suppression filtering.')
has(exploreView, /viewerDiscoverySuppressions = computed<ViewerDiscoverySuppressions>/, 'ExploreView must keep an explicit viewer suppression signal entrypoint.')
for (const cleanList of ['cleanTags', 'cleanTopics', 'cleanRecommendedUsers', 'cleanLatestPosts', 'crossDomainRecommendations']) {
  const block = new RegExp(`const ${cleanList} =[\\s\\S]*?filterDiscoverySuppressedItems`)
  has(exploreView, block, `ExploreView ${cleanList} must be filtered by viewer discovery suppressions.`)
}
has(exploreView, /latestPosts\.value = filterVisiblePosts\(filterPublicContent\(postRes\.value\.data\?\.items \|\| \[\]\)\)/, 'Explore latest posts must remove private, restricted, reviewing, deleted, and violation posts at load time.')
has(exploreView, /const cleanLatestPosts = computed\(\(\) => filterVisiblePosts\([\s\S]*filterDiscoverySuppressedItems\(filterPublicContent\(latestPosts\.value\)/, 'Explore latest posts must keep public visibility and viewer suppression filtering in derived discovery lists.')
has(exploreView, /filterVisiblePosts\(item\.item\.post \? \[item\.item\.post\] : \[\]\)/, 'Cross-domain discovery must gate wrapped posts through public visibility.')

has(searchView, /filterSearchSuggestionTerms/, 'SearchView must use the shared suggestion term filter.')
has(searchView, /const filterVisibleSearchTerms = \(values: unknown\) =>[\s\S]*filterSearchSuggestionTerms/, 'SearchView must centralize visible search-term filtering.')
has(searchView, /suggestions\.value = filterVisibleSearchTerms\(res\.data\)/, 'Search suggestions must be filtered before display.')
has(searchView, /hotWords\.value = filterVisibleSearchTerms\(res\.data\)/, 'Hot words must be filtered before display.')
has(searchView, /safeStorage\.set\(storageKey\(key\), JSON\.stringify\(snapshots\)\)/, 'Personal search snapshots must remain local storage, not public analytics output.')
missing(searchView, /涓汉鎼滅储鍘嗗彶|浣犵殑鎼滅储鍘嗗彶|闅愮鐢诲儚|璁惧鎸囩汗/, 'Search suggestions and hot words must not claim to use personal history, private profiles, or device fingerprints.')

has(searchApi, /SearchAnalyticsTrackReq[\s\S]*eventType[\s\S]*keyword[\s\S]*company[\s\S]*target/, 'Search analytics tracking type must stay event aggregate oriented.')
missing(searchApi, /session|ipAddress|clientIp|deviceId|fingerprint|rawSession|rawQuery|userId/, 'Search analytics API must not send raw session, IP, device fingerprint, user id, or raw query identifiers.')

has(knowledgeExploreView, /knowledgeApi\.explore/, 'Knowledge explore page must use the backend knowledge entry API.')
missing(knowledgeExploreView, /瀹樻柟鑳屼功|骞冲彴鎷呬繚|鏉冨▉璁よ瘉|闄愭椂璐拱|浼氬憳涓撲韩|璧炲姪鎺ㄨ崘|浠樿垂缃《/, 'Knowledge entry copy must not imply endorsement, guarantee, authority certification, purchase urgency, membership, sponsorship, or paid pinning.')

has(adapters, /discoverable:\s*visibility === 'public' && isPublicContentListVisible\(assetForGovernance\) && !localOnly/, 'Public content lists must only be discoverable when public, visible, and not local-only.')
has(adapters, /searchable:\s*visibility === 'public' && isPublicContentListVisible\(assetForGovernance\) && !localOnly/, 'Public content lists must only be searchable when public, visible, and not local-only.')
has(adapters, /items:\s*items\.filter\(isPublicAssetPostVisible\)/, 'Content list items must filter private, deleted, restricted, reviewing, and violation posts.')
has(contentSeries, /isPublicContentSeriesAssetVisible[\s\S]*record\.visibility === 'public' && isPublicCollectionVisible\(record\)/, 'Content series assets must only be public when collection visibility allows it.')
has(contentSeries, /isPublicContentSeriesPostVisible[\s\S]*isPublicPostVisible\(post\)/, 'Content series posts must reuse public post visibility.')
has(contentSeries, /assertPublicContentSeriesAssetVisible/, 'Public content series reads must fail closed when a series is private or hidden.')

has(operationsApi, /displayLabel:\s*'示例\/fallback'/, 'Operations fallback must visibly label demo/fallback data instead of fake trends.')
has(operationsApi, /filterOpsOrchestrationDisplayItems/, 'Operations fallback pools must use display governance filtering.')
has(operationsApi, /markOpsOrchestrationExample/, 'Operations fallback data must be marked as example data.')
has(opsGuard, /isDemoFallbackMarkedExample/, 'Ops guard must reject unmarked demo/fallback entries.')
has(operationSlotCard, /示例\/fallback/, 'Public operation slot fallback must be visibly labeled as example/fallback.')
missing(operationsApi, /自然搜索排名|natural search rank|organic rank|付费置顶|浠樿垂缃《/, 'Operational topics must not masquerade as natural search ranking or paid pinning.')

for (const [name, source] of [
  ['ExploreView', exploreView],
  ['SearchView', searchView],
  ['KnowledgeExploreView', knowledgeExploreView],
  ['Operations API', operationsApi],
]) {
  missing(source, /瀹樻柟鑳屴功|瀹樻柟鑳屼功|骞冲彴鎷呬繚|鏉冨▉璁よ瘉|闄愭椂璐拱|浼氬憳涓撲韩|璧炲姪鎺ㄨ崘|浠樿垂缃《/, `${name} must not contain prohibited commercial or endorsement copy.`)
}

console.log('Phase 17 search/discovery/privacy guards passed.')
