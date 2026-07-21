import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const search = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')

assert.match(search, /searchResultMeta\.degraded/, 'search result metadata must expose degraded state')
assert.match(search, /meta\.source === 'mysql' && meta\.degraded/, 'MySQL fallback must be identified from server metadata')
assert.match(search, /本次使用数据库兜底搜索/, 'MySQL fallback must have explicit user-facing source copy')
assert.match(search, /结果可能不完整，排序能力受限/, 'degraded search must explain completeness and ranking limits')
assert.match(search, /fallbackReasonText\(meta\.fallbackReason\)/, 'fallback reasons must be translated into user-facing explanations')
assert.match(search, /searchHitReasons\(post\)/, 'search results must expose per-hit explanations')
assert.match(search, /aria-label="命中解释"/, 'hit explanations must be labeled for assistive technology')

console.log('V9 search fallback guard passed.')
