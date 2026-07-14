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
assert.match(
  homeView,
  /v-for="d in homeDomainOptions"/,
  'Domain/channel entries must be rendered from the shared enabled domain catalog',
)
assert.match(homeView, /useDomainCatalog/, 'HomeView must consume the shared domain catalog')
assert.match(
  homeView,
  /const activeDomain = computed\(\(\) => \{[\s\S]*homeDomainOptions\.value\.some\(\(item\) => Number\(item\.domain\) === q\) \? q : undefined[\s\S]*\}\)/,
  'activeDomain must reject query values outside the enabled shared domain catalog before API calls',
)
assert.match(
  infiniteFeed,
  /apiMap\[currentFeed\.value\]\(pageParam,\s*pageSize,\s*currentDomain\.value\)/,
  'useInfiniteFeed must pass currentDomain.value into the selected feed API call, including featured',
)
assert.match(
  infiniteFeed,
  /const\s+maxPages\s*=\s*6/,
  'useInfiniteFeed must cap retained pages to avoid unbounded feed memory growth',
)
assert.match(
  infiniteFeed,
  /getNextPageParam:[\s\S]*?\n\s*maxPages,/,
  'useInfiniteFeed must pass maxPages to TanStack Query so cached pages are actually evicted',
)
assert.match(
  infiniteFeed,
  /data\.value\?\.pages\.slice\(-maxPages\)\.flatMap/,
  'useInfiniteFeed must render only the capped recent pages instead of flattening every loaded page',
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
  /import\s+\{[\s\S]*isKnownDomain[\s\S]*normalizeDomain[\s\S]*\}\s+from\s+['"]@\/utils\/domains['"]/,
  'adaptPost must import optional validation and normalization from the shared domain helper',
)
assert.match(
  adapters,
  /const rawDomain = source\?\.domain \?\? extension\?\.domain[\s\S]*const domain = isKnownDomain\(rawDomain\) \? normalizeDomain\(rawDomain\) : undefined/,
  'adaptPost must preserve missing or invalid domains as unclassified instead of normalizing them to TECH',
)

console.log('phase2 home domain feed guard passed')
