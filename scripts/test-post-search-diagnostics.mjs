import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const searchView = read('../src/views/SearchView.vue')
const postCard = read('../src/components/post/PostCard.vue')
const postDetail = read('../src/views/PostDetailView.vue')
const opsApi = read('../src/api/ops.ts')
const postApi = read('../src/api/post.ts')
const types = read('../src/api/types.ts')
const backendSearchController = read('../../offerlab-java/community-domain-search/src/main/java/com/offerlab/community/search/controller/SearchController.java')

const publishStatusStart = postApi.indexOf('getPublishStatus:')
const publishStatusEnd = postApi.indexOf('getInterviewMaterials:', publishStatusStart)
const publishStatusApi = postApi.slice(publishStatusStart, publishStatusEnd)

assert.match(types, /diagnostics\?: Record<string, unknown>/, 'PaginatedResponse must expose backend diagnostics')
assert.match(searchView, /includeTestData\s*=\s*ref\(false\)/, 'SearchView must keep a test-data mode flag')
assert.match(searchView, /includeTestData: includeTestData\.value/, 'SearchView must send includeTestData to backend search')
assert.match(searchView, /searchDiagnosticText\s*=\s*computed/, 'SearchView must derive a visible diagnostic summary')
assert.match(searchView, /emptyReason === 'test_data_filtered_unless_includeTestData'/, 'SearchView must explain test-data filtering in empty states')
assert.match(searchView, /:detail-query="postDetailQuery"/, 'Search results must pass whitelisted diagnostics into post detail links')
assert.match(searchView, /includeTestData\.value \? \(page\?\.items \|\| \[\]\) : filterPublicContent/, 'SearchView test-data mode must not be re-filtered by frontend synthetic filters')

assert.match(postCard, /detailQuery\?: Record<string, string \| number \| boolean \| undefined>/, 'PostCard must accept a detail query prop')
assert.match(postCard, /const detailTo = computed/, 'PostCard must build detail routes from the query prop')

assert.match(postDetail, /searchEntryNotice\s*=\s*computed/, 'PostDetailView must render a search-entry diagnostic strip')
assert.match(postDetail, /safeSearchFallbackReason/, 'PostDetailView must whitelist fallback reason display')
assert.match(postDetail, /publishStatusItems\s*=\s*computed/, 'PostDetailView must render publish pipeline status items')
assert.doesNotMatch(postDetail, /retryTask\?\.lastError/, 'PostDetailView public publish status must not render internal retry errors')
assert.match(postDetail, /已落库/, 'PostDetailView publish status must explain database landing')
assert.match(postDetail, /搜索可见/, 'PostDetailView publish status must explain search visibility')
assert.match(postDetail, /Outbox/, 'PostDetailView publish status must expose Outbox state')
assert.doesNotMatch(postDetail, /parts\.push\(`原因：\$\{fallbackReason\}`\)/, 'PostDetailView must not render raw fallbackReason query text')

assert.match(types, /export interface PostPublishStatus/, 'API types must expose post publish status')
assert.match(types, /export interface PostPublishStatus[\s\S]*postId:\s*ApiId/, 'PostPublishStatus must carry the diagnosed post id')
assert.match(types, /export interface PostPublishStatus[\s\S]*ready\?:\s*boolean/, 'PostPublishStatus must carry the publish ready flag')
assert.match(types, /search\?:\s*\{[\s\S]*visible\?:\s*boolean[\s\S]*source\?:\s*string[\s\S]*degraded\?:\s*boolean[\s\S]*fallbackReason\?:\s*string[\s\S]*diagnostics\?:\s*Record<string, unknown>/, 'PostPublishStatus.search must type visibility source fallbackReason and diagnostics')
assert.doesNotMatch(types, /export interface PostPublishStatus[\s\S]*lastError/, 'PostPublishStatus must keep internal retry errors out of the public detail contract')
assert.match(postApi, /getPublishStatus/, 'post API must expose publish status endpoint')
assert.match(postApi, /\/api\/v1\/search\/posts\/\$\{postId\}\/publish-status/, 'post API must call publish status diagnostics endpoint')
assert.doesNotMatch(publishStatusApi, /Result<any>/, 'post API must not consume publish status diagnostics through Result<any>')
assert.match(backendSearchController, /data\.put\("postId",\s*postId\)/, 'publish-status backend response must expose postId')
assert.match(backendSearchController, /data\.put\("ready",\s*dbVisible && Boolean\.TRUE\.equals\(search\.get\("visible"\)\)\)/, 'publish-status backend response must expose ready')
assert.match(backendSearchController, /search\.put\("source",\s*recall\.getSource\(\)\)/, 'publish-status backend response must expose search source')
assert.match(backendSearchController, /search\.put\("fallbackReason",\s*recall\.getFallbackReason\(\)\)/, 'publish-status backend response must expose fallbackReason')
assert.match(backendSearchController, /search\.put\("diagnostics",\s*recall\.getDiagnostics\(\)\)/, 'publish-status backend response must expose diagnostics')
assert.match(opsApi, /export interface PostSearchDiagnostics/, 'Ops API must type post-level search diagnostics')
assert.match(opsApi, /getPostSearchDiagnostics/, 'Ops API must expose post-level search diagnostics endpoint')

console.log('post search diagnostics guard passed')
