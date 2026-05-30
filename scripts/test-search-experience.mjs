import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const source = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')

assert.match(source, /const SEARCH_DEBOUNCE_MS\s*=\s*450/, 'SearchView must define a main search debounce interval')
assert.match(source, /let searchDebounceTimer/, 'SearchView must keep a main search debounce timer')
assert.match(source, /const handleSearchInput\s*=\s*\(\)\s*=>\s*\{[\s\S]*loadSuggestions\(\)[\s\S]*scheduleDebouncedSearch\(\)/, 'typing in the main search box must load suggestions and schedule debounced search')
assert.match(source, /const scheduleDebouncedSearch\s*=\s*\(\)\s*=>\s*\{[\s\S]*setTimeout\(\(\)\s*=>\s*\{[\s\S]*runSearch\(false\)/, 'SearchView must debounce non-append searches')
assert.match(source, /if \(!append\) clearSearchDebounce\(\)/, 'manual search must cancel pending debounce before running immediately')
assert.match(source, /onBeforeUnmount\(\(\)\s*=>\s*\{[\s\S]*clearSearchDebounce\(\)/, 'SearchView must clear pending debounce on unmount')
assert.match(source, /noResultWords\s*=\s*computed/, 'SearchView must compute fallback no-result keyword recommendations')
assert.match(source, /relaxActions\s*=\s*computed/, 'SearchView must compute filter relaxation actions for no-result states')
assert.match(source, /class="no-result-recommendations"/, 'SearchView must render concrete no-result recommendations')
assert.match(source, /放宽筛选/, 'SearchView no-result state must offer filter relaxation')
assert.match(source, /换个关键词/, 'SearchView no-result state must offer alternate keywords')
assert.match(source, /准备包/, 'SearchView no-result state must route company searches to the prep pack')

console.log('search experience guard passed')
