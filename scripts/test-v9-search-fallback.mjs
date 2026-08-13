import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const search = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')

assert.match(search, /searchResultMeta\.degraded/, 'search result metadata must expose degraded state')
assert.match(search, /source:\s*page\.source/, 'search result source must be preserved from server metadata')
assert.match(search, /degraded:\s*page\.degraded/, 'search result degraded state must be preserved from server metadata')
assert.match(search, /当前使用备用搜索方式/, 'degraded search must have user-facing fallback copy')
assert.match(search, /结果完整度和排序能力可能暂时受限/, 'degraded search must explain completeness and ranking limits')
assert.match(search, /fallbackReasonText\(meta\.fallbackReason\)/, 'fallback reasons must be translated into user-facing explanations')
assert.match(search, /searchHitReasons\(post\)/, 'search results must expose per-hit explanations')
assert.match(search, /aria-label="命中解释"/, 'hit explanations must be labeled for assistive technology')

console.log('V9 search fallback guard passed.')
