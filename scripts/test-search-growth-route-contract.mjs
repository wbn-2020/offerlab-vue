import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const searchView = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')
const growthProfileView = readFileSync(new URL('../src/views/GrowthProfileView.vue', import.meta.url), 'utf8')
const growthReportView = readFileSync(new URL('../src/views/GrowthReportView.vue', import.meta.url), 'utf8')

assert.match(searchView, /domain\?:\s*number/, 'SearchView may keep optional domain only for legacy snapshot compatibility')
assert.match(searchView, /filters\s*=\s*reactive<\{ q: string; domain\?: number;/, 'SearchView may keep domain state only long enough to clear legacy inputs')
assert.doesNotMatch(searchView, /const activeDomainLabel\s*=\s*computed/, 'SearchView must not derive a fake visible active domain label')
assert.doesNotMatch(searchView, /clearDomainFilter/, 'SearchView must not expose a fake clear-domain filter action')
assert.doesNotMatch(searchView, /v-if="[^"]*filters\.domain[^"]*"/, 'SearchView must not render route-driven domain landing UI')
assert.doesNotMatch(searchView, /activeDomainLabel/, 'SearchView must not show activeDomainLabel in the template or script')
assert.match(searchView, /const syncFromRoute\s*=\s*\(\)\s*=>\s*\{[\s\S]*const domain = Number\(route\.query\.domain\)[\s\S]*filters\.domain = nextMode === 'posts' && isKnownDomain\(domain\) \? domain : undefined[\s\S]*if \(filters\.domain\) \{\s*filters\.domain = undefined\s*\}/s, 'SearchView must read legacy domain query values and immediately clear them')
assert.match(searchView, /const pushQuery\s*=\s*\(\)\s*=>\s*\{[\s\S]*query:\s*\{[\s\S]*\.\.\.\(filters\.q \? \{ q: filters\.q \} : \{\}\)[\s\S]*\.\.\.\(filters\.company \? \{ company: filters\.company \} : \{\}\)[\s\S]*\.\.\.\(filters\.position \? \{ position: filters\.position \} : \{\}\)[\s\S]*\.\.\.\(filters\.type \? \{ type: String\(filters\.type\) \} : \{\}\)[\s\S]*\.\.\.\(searchMode\.value === 'posts' \? \{ sort: filters\.sort \} : \{\}\)[\s\S]*\.\.\.\(searchMode\.value === 'users' \? \{ mode: 'users' \} : \{\}\)[\s\S]*\.\.\.\(includeTestData\.value \? \{ includeTestData: '1' \} : \{\}\)[\s\S]*\},/s, 'SearchView canonical query must be composed without domain')
assert.doesNotMatch(searchView, /domain:\s*String\(filters\.domain\)/, 'SearchView canonical URL must not preserve domain')
assert.match(searchView, /return Boolean\(filters\.q \|\| filters\.company \|\| filters\.position \|\| filters\.type\)/, 'SearchView query state must not treat domain as a real search filter')
assert.doesNotMatch(searchView, /key: 'domain'/, 'SearchView empty-state relax actions must not include clearing domain')
assert.match(searchView, /const currentSnapshot\s*=\s*\(\): SearchSnapshot => \{[\s\S]*const domain = undefined[\s\S]*domain,[\s\S]*\}/s, 'SearchView current snapshots must clear domain instead of persisting it')
assert.match(searchView, /const applySearchSnapshot\s*=\s*async\s*\(snapshot: SearchSnapshot\) => \{[\s\S]*filters\.domain = undefined/s, 'SearchView restored snapshots must ignore legacy domain values')
assert.doesNotMatch(searchView, /getDomainLabel\(snapshot\.domain\)/, 'SearchView saved search meta must not surface legacy domain context')
assert.doesNotMatch(searchView, /domain:\s*filters\.domain,/, 'SearchView post search request params must not include the domain filter')
assert.match(searchView, /const setMode\s*=\s*async\s*\(mode: SearchMode\)\s*=>\s*\{[\s\S]*filters\.domain = undefined/s, 'Switching SearchView modes must clear legacy domain state')
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
