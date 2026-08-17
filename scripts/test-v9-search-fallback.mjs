import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const search = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')

assert.doesNotMatch(search, /searchResultMeta/, 'search results must not retain request-level infrastructure metadata')
assert.doesNotMatch(search, /page\.(?:source|degraded|fallbackReason|diagnostics|scanLimit)/, 'search results must ignore infrastructure diagnostics returned by a page response')
assert.doesNotMatch(search, /Elasticsearch|MySQL|当前使用备用搜索方式|结果完整度和排序能力可能暂时受限/, 'search results must not expose search infrastructure or fallback implementation details')
assert.match(search, /const postDetailQuery = computed<Record<string, string>>/, 'search results must define product-semantic detail entry context')
assert.match(search, /if \(appliedQuery\.value\) query\.from = 'search'/, 'search detail links must only retain the product-semantic search entry context')
assert.match(search, /const searchStatusBadge = computed/, 'search results must expose a generic availability status')
assert.match(search, /searchStatus\.value\?\.available === false/, 'search availability must distinguish an unavailable public search service')
assert.match(search, /暂时无法读取搜索状态，仍可浏览热门内容、作者和发现页。/, 'search status failures must retain user-facing alternatives')
assert.match(search, /searchHitReasons\(post\)/, 'search results must expose per-hit explanations')
assert.match(search, /aria-label="命中解释"/, 'hit explanations must be labeled for assistive technology')

console.log('V9 search fallback guard passed.')
