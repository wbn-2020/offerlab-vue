import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const searchView = read('../src/views/SearchView.vue')
const searchApi = read('../src/api/search.ts')
const postCard = read('../src/components/post/PostCard.vue')
const postDetail = read('../src/views/PostDetailView.vue')
const opsApi = read('../src/api/ops.ts')
const postApi = read('../src/api/post.ts')
const types = read('../src/api/types.ts')
const backendSearchController = read('../../offerlab-java/community-domain-search/src/main/java/com/offerlab/community/search/controller/SearchController.java')
const postDetailQueryBlock = searchView.match(
  /const postDetailQuery = computed<Record<string, string>>\(\(\) => \{[\s\S]*?\n\}\)/,
)?.[0] || ''
const postPublishStatusType = types.slice(
  types.indexOf('export interface PostPublishStatus'),
  types.indexOf('export interface PostVersionHistory'),
)
const backendPublishStatus = backendSearchController.slice(
  backendSearchController.indexOf('public Result<Map<String, Object>> publishStatus'),
  backendSearchController.indexOf('private static boolean containsPost'),
)

const publishStatusStart = postApi.indexOf('getPublishStatus:')
const publishStatusEnd = postApi.indexOf('getInterviewMaterials:', publishStatusStart)
const publishStatusApi = postApi.slice(publishStatusStart, publishStatusEnd)

assert.match(types, /diagnostics\?: Record<string, unknown>/, 'PaginatedResponse must expose backend diagnostics')
assert.doesNotMatch(searchApi, /includeTestData|yearsOfExp/, 'Public search API types must not expose unsupported diagnostic filters')
assert.doesNotMatch(searchView, /includeTestData|yearsOfExp/, 'SearchView must not preserve or send unsupported public search filters')
assert.match(searchView, /:detail-query="postDetailQuery"/, 'Search results must pass product-semantic entry context into post detail links')
assert.match(postDetailQueryBlock, /if \(appliedQuery\.value\) query\.from = 'search'/, 'Search detail links must only expose the product-semantic from=search query')
assert.doesNotMatch(postDetailQueryBlock, /postDetailSearchSources|query\.source|query\.degraded|query\.fallbackReason/, 'Search detail links must not expose infrastructure source or fallback state')
assert.doesNotMatch(searchView, /query\.search(?:Source|Degraded|FallbackReason|ScanLimit)|query\.scanLimit/, 'Search detail links must not use stale query names or expose scan limits')
assert.match(searchView, /filterVisiblePosts\(filterPublicContent\(page\?\.items \|\| \[\]\)\)/, 'SearchView must always apply public visibility filtering')

assert.match(postCard, /detailQuery\?: Record<string, string \| number \| boolean \| undefined>/, 'PostCard must accept a detail query prop')
assert.match(postCard, /const detailTo = computed/, 'PostCard must build detail routes from the query prop')

assert.match(postDetail, /searchEntryNotice\s*=\s*computed/, 'PostDetailView must render a search-entry diagnostic strip')
assert.match(postDetail, /if \(route\.query\.from !== 'search'\) return ''[\s\S]*return '来自搜索结果'/, 'PostDetailView must only consume the product-semantic search entry marker')
assert.doesNotMatch(postDetail, /readQuery\('source'\)|readQuery\('degraded'\)|readQuery\('fallbackReason'\)|safeSearchFallbackReason/, 'PostDetailView must ignore legacy infrastructure diagnostics in public URLs')
assert.match(postDetail, /publishStatusItems\s*=\s*computed/, 'PostDetailView must render publish pipeline status items')
assert.doesNotMatch(postDetail, /retryTask\?\.lastError/, 'PostDetailView public publish status must not render internal retry errors')
assert.match(postDetail, /已落库/, 'PostDetailView publish status must explain database landing')
assert.match(postDetail, /搜索可见/, 'PostDetailView publish status must explain search visibility')
assert.match(postDetail, /Outbox/, 'PostDetailView publish status must expose Outbox state')
assert.doesNotMatch(postDetail, /parts\.push\(`原因：\$\{fallbackReason\}`\)/, 'PostDetailView must not render raw fallbackReason query text')

assert.match(types, /export interface PostPublishStatus/, 'API types must expose post publish status')
assert.match(postPublishStatusType, /postId:\s*ApiId/, 'PostPublishStatus must carry the diagnosed post id')
assert.match(postPublishStatusType, /ready\?:\s*boolean/, 'PostPublishStatus must carry the publish ready flag')
assert.match(postPublishStatusType, /search\?:\s*\{[\s\S]*visible\?:\s*boolean/, 'PostPublishStatus.search must type public search visibility')
assert.doesNotMatch(postPublishStatusType, /\bsource\?:|\bdegraded\?:|\bfallbackReason\?:|\bdiagnostics\?:|\blastError/, 'PostPublishStatus must keep infrastructure diagnostics and retry errors out of the public detail contract')
assert.match(postApi, /getPublishStatus/, 'post API must expose publish status endpoint')
assert.match(postApi, /\/api\/v1\/search\/posts\/\$\{postId\}\/publish-status/, 'post API must call publish status diagnostics endpoint')
assert.doesNotMatch(publishStatusApi, /Result<any>/, 'post API must not consume publish status diagnostics through Result<any>')
assert.match(backendPublishStatus, /data\.put\("postId",\s*postId\)/, 'publish-status backend response must expose postId')
assert.match(backendPublishStatus, /data\.put\("ready",\s*dbVisible && Boolean\.TRUE\.equals\(search\.get\("visible"\)\)\)/, 'publish-status backend response must expose ready')
assert.doesNotMatch(backendPublishStatus, /search\.put\("(?:source|degraded|fallbackReason|diagnostics)"/, 'publish-status backend response must not expose infrastructure diagnostics')
assert.match(opsApi, /export interface PostSearchDiagnostics/, 'Ops API must type post-level search diagnostics')
assert.match(opsApi, /getPostSearchDiagnostics/, 'Ops API must expose post-level search diagnostics endpoint')

console.log('post search diagnostics guard passed')
