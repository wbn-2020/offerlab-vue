import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const searchView = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')
const growthProfileView = readFileSync(new URL('../src/views/GrowthProfileView.vue', import.meta.url), 'utf8')
const growthReportView = readFileSync(new URL('../src/views/GrowthReportView.vue', import.meta.url), 'utf8')

assert.match(searchView, /domain\?:\s*number/, 'SearchView must keep an optional domain in the public search contract')
assert.match(searchView, /filters\s*=\s*reactive<\{[\s\S]*q:\s*string[\s\S]*domain\?:\s*number/, 'SearchView must keep domain filter state for post search')
assert.doesNotMatch(searchView, /const activeDomainLabel\s*=\s*computed/, 'SearchView must not derive a fake visible active domain label')
assert.match(searchView, /const clearDomainFilter\s*=\s*\(\)\s*=>\s*\{\s*filters\.domain = undefined\s*runSearch\(false\)\s*\}/s, 'SearchView must provide a working clear-domain action')
assert.match(searchView, /v-model\.number="filters\.domain"[\s\S]*v-for="item in domainOptions"/, 'SearchView must render the shared domain catalog as a post-search filter')
assert.doesNotMatch(searchView, /activeDomainLabel/, 'SearchView must not show activeDomainLabel in the template or script')
assert.match(searchView, /const syncFromRoute\s*=\s*\(\)\s*=>\s*\{[\s\S]*const routeChannel = nextMode === 'posts' \? getCommunityChannel\(channelKey\) : undefined[\s\S]*const domain = resolveDomainValue\(route\.query\.domain\) \?\? routeChannel\?\.domain[\s\S]*filters\.domain = nextMode === 'posts'[\s\S]*domain !== undefined[\s\S]*domainOptions\.value\.some\(\(item\) => Number\(item\.domain\) === domain\)[\s\S]*\? domain[\s\S]*: undefined/s, 'SearchView must restore only enabled shared-catalog domains, including channel-derived domains, for post search')
assert.match(searchView, /const queryToRouteQuery\s*=\s*\(query:\s*SearchQueryState\)\s*=>\s*\(\{[\s\S]*\.\.\.\(query\.q \? \{ q: query\.q \} : \{\}\)[\s\S]*\.\.\.\(query\.mode === 'posts' && query\.domain \? \{ domain: String\(query\.domain\) \} : \{\}\)[\s\S]*\.\.\.\(query\.company \? \{ company: query\.company \} : \{\}\)[\s\S]*\.\.\.\(query\.position \? \{ position: query\.position \} : \{\}\)[\s\S]*\.\.\.\(query\.type \? \{ type: String\(query\.type\) \} : \{\}\)[\s\S]*\.\.\.\(query\.mode === 'posts' \? \{ sort: query\.sort \} : \{\}\)[\s\S]*\.\.\.\(query\.mode === 'posts' && query\.trustProfile \? \{ trustProfile: query\.trustProfile \} : \{\}\)[\s\S]*\.\.\.\(query\.mode === 'posts' && query\.freshnessStatus \? \{ freshnessStatus: query\.freshnessStatus \} : \{\}\)[\s\S]*\.\.\.\(query\.mode === 'posts' && query\.resolved \? \{ resolved: query\.resolved \} : \{\}\)[\s\S]*\.\.\.\(query\.mode === 'posts' && query\.sourceComplete \? \{ sourceComplete: query\.sourceComplete \} : \{\}\)[\s\S]*\.\.\.\(query\.mode !== 'posts' \? \{ mode: query\.mode \} : \{\}\)[\s\S]*\}\)/s, 'SearchView canonical query must preserve the complete applied search snapshot')
assert.match(searchView, /const pushQuery\s*=\s*\(query = captureQueryState\(\)\)\s*=>\s*\{[\s\S]*router\.replace\(\{\s*path:\s*'\/search',\s*query:\s*queryToRouteQuery\(query\),/s, 'SearchView must route from an explicit search snapshot')
assert.match(searchView, /const runSearch\s*=\s*async\s*\(append = false,\s*syncRoute = true\)\s*=>\s*\{[\s\S]*const query = append && appliedQuery\.value \? appliedQuery\.value : captureQueryState\(\)[\s\S]*if \(!append && syncRoute\) await pushQuery\(query\)/s, 'SearchView must capture the query before awaiting route replacement')
assert.doesNotMatch(searchView, /includeTestData|yearsOfExp/, 'SearchView canonical URL must not preserve unsupported public filters')
assert.match(searchView, /const hasQuery\s*=\s*computed\(\(\) => \{[\s\S]*return Boolean\([\s\S]*filters\.domain[\s\S]*\)[\s\S]*\}\)/, 'SearchView query state must treat domain as a real post-search filter')
assert.match(searchView, /key: 'domain'[\s\S]*action: clearDomainFilter/, 'SearchView empty-state relax actions must allow clearing domain')
assert.match(searchView, /const currentSnapshot\s*=\s*\(query = captureQueryState\(\)\): SearchSnapshot => \{[\s\S]*const mode = query\.mode[\s\S]*const domain = query\.domain[\s\S]*const snapshot = \{\s*mode,\s*q: query\.q,\s*domain,[\s\S]*\}/s, 'SearchView current snapshots must derive labels and filters from one immutable query snapshot')
assert.match(searchView, /const applySearchSnapshot\s*=\s*async\s*\(snapshot: SearchSnapshot\) => \{[\s\S]*filters\.domain = snapshot\.domain/s, 'SearchView restored post-search snapshots must restore domain')
assert.match(searchView, /const snapshotLabel\s*=\s*\(snapshot:[\s\S]*const domainLabel = isKnownDomain\(snapshot\.domain\) \? getDomainLabelSafe\(snapshot\.domain\) : ''[\s\S]*return \[snapshot\.q,\s*domainLabel,\s*snapshot\.company,\s*snapshot\.position,\s*snapshot\.type \? postTypeText\(snapshot\.type\) : ''\]/s, 'SearchView saved search labels must surface shared-catalog domain context')
assert.match(searchView, /const params = \{[\s\S]*domain:\s*query\.domain,/, 'SearchView post search request params must include the applied domain snapshot')
assert.match(searchView, /const setMode\s*=\s*async\s*\(mode: SearchMode\)\s*=>\s*\{[\s\S]*if \(mode !== 'posts'\) \{[\s\S]*filters\.domain = undefined/s, 'Switching away from post search must clear domain state')
assert.match(searchView, /const switchToUserSearchFromError\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*filters\.domain = undefined/s, 'SearchView error fallback to user search must clear domain state')
assert.match(searchView, /const resetFilters\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*filters\.domain = undefined/s, 'SearchView reset must clear domain state')

for (const [name, source] of [
  ['GrowthProfileView', growthProfileView],
  ['GrowthReportView', growthReportView],
]) {
  assert.match(source, /useRoute/, `${name} must read the current route for login redirect preservation`)
  assert.match(source, /const loginRedirectHref = computed\(\(\) => `\/login\?redirect=\$\{encodeURIComponent\(route\.fullPath\)\}`\)/, `${name} must preserve the current fullPath in the login redirect`)
  assert.match(source, /:action-href="loginRedirectHref"/, `${name} anonymous login CTA must use the preserved redirect href`)
  assert.doesNotMatch(source, /action-href="\/login"/, `${name} must not fall back to a bare /login CTA for the anonymous growth gate`)
}

console.log('search growth route contract guard passed')
