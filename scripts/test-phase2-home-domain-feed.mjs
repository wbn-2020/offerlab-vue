import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const homeView = readFileSync(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')
const feedApi = readFileSync(new URL('../src/api/feed.ts', import.meta.url), 'utf8')
const infiniteFeed = readFileSync(new URL('../src/composables/useInfiniteFeed.ts', import.meta.url), 'utf8')
const domains = readFileSync(new URL('../src/utils/domains.ts', import.meta.url), 'utf8')
const adapters = readFileSync(new URL('../src/api/adapters.ts', import.meta.url), 'utf8')

assert.match(homeView, />\s*综合\s*</, 'HomeView must expose a 综合 entry')
assert.match(
  homeView,
  /<router-link[\s\S]*?to="\/"[\s\S]*?>[\s\S]*?综合[\s\S]*?<\/router-link>/,
  'The 综合 entry must route to / without a domain query',
)
assert.match(homeView, /v-for="d in DOMAIN_OPTIONS"/, 'Domain entries must still be rendered from DOMAIN_OPTIONS')
assert.match(
  homeView,
  /const\s+legalDomainValues\s*=\s*new\s+Set/,
  'HomeView must build a legal domain set from DOMAIN_OPTIONS',
)
assert.match(
  homeView,
  /DOMAIN_OPTIONS\.map\(\([^)]*\)\s*=>\s*[^)]*\.value\)/,
  'HomeView legal domain set must derive values from DOMAIN_OPTIONS',
)
assert.match(
  homeView,
  /legalDomainValues\.has\(q\)\s*\?\s*q\s*:\s*undefined/,
  'activeDomain must reject query values outside DOMAIN_OPTIONS before API calls',
)
assert.match(
  infiniteFeed,
  /apiMap\[currentFeed\.value\]\(pageParam,\s*pageSize,\s*currentDomain\.value\)/,
  'useInfiniteFeed must pass currentDomain.value into the selected feed API call, including featured',
)
assert.match(
  feedApi,
  /getFeatured:\s*async\s*\(cursor\?:\s*string,\s*size\s*=\s*20,\s*domain\?:\s*number\)/,
  'feedApi.getFeatured must accept domain?: number',
)
assert.match(
  feedApi,
  /if\s*\(domain\s*!=\s*null\)\s*params\.domain\s*=\s*domain/,
  'feedApi.getFeatured must send domain in request params only when present',
)
assert.match(domains, /export\s+const\s+normalizeDomain\s*=/, 'domains.ts must expose a shared normalizeDomain helper')
assert.match(
  adapters,
  /import\s+\{\s*normalizeDomain[\s\S]*?\}\s+from\s+['"]@\/utils\/domains['"]/,
  'adaptPost must import normalizeDomain from the shared domain helper',
)
assert.match(
  adapters,
  /normalizeDomain\(\s*source\?\.domain\s*\?\?\s*extension\?\.domain\s*\)/,
  'adaptPost must normalize source.domain with extension.domain fallback',
)

console.log('phase2 home domain feed guard passed')
