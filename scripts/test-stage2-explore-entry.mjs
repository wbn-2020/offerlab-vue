import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const exploreView = readFileSync(new URL('../src/views/ExploreView.vue', import.meta.url), 'utf8')
const domainsApiPath = new URL('../src/api/domains.ts', import.meta.url)
const domainCatalogPath = new URL('../src/composables/useDomainCatalog.ts', import.meta.url)

assert.equal(existsSync(domainsApiPath), true, 'src/api/domains.ts must exist for stage-2 explore entry fallback handling')
assert.equal(existsSync(domainCatalogPath), true, 'shared domain catalog must exist')

const domainsApi = readFileSync(domainsApiPath, 'utf8')
const domainCatalog = readFileSync(domainCatalogPath, 'utf8')

assert.match(
  domainsApi,
  /client\.get\(\s*['"]\/api\/v1\/domains['"]/,
  'domains API must read the public /api/v1/domains endpoint',
)
assert.match(
  domainsApi,
  /DOMAIN_OPTIONS/,
  'domains API must keep a local DOMAIN_OPTIONS fallback path',
)
assert.match(
  exploreView,
  /useDomainCatalog/,
  'ExploreView must consume the shared domain catalog',
)
assert.match(
  domainCatalog,
  /localDomainConfigs/,
  'shared domain catalog must keep the local domain fallback available',
)
assert.match(
  exploreView,
  /学习话题|阅读清单共读|学习方法复盘/,
  'ExploreView must explicitly expose a learning/reading topic entry',
)
assert.match(
  exploreView,
  /阅读|读书|书单|学习方法/,
  'ExploreView must strengthen reading-domain discovery copy',
)
assert.match(
  exploreView,
  /channel:\s*['"]learning-growth['"]/,
  'ExploreView must route at least one entry into the learning-growth channel',
)
assert.match(
  exploreView,
  /useRoute|route\.query\.domain/,
  'ExploreView must read the active domain from route query for stage-2 domain discovery',
)
assert.match(
  exploreView,
  /const loadChannelLatestPosts[\s\S]*Promise\.allSettled\(activeEntryPostTypes\.value\.map[\s\S]*discoveryApi\.listPublicChannelPosts\(\{[\s\S]*type/,
  'ExploreView must fetch each active channel or content-form post type through the discovery adapter before merging latest posts',
)
assert.match(
  exploreView,
  /discoveryApi\.listPublicChannelPosts\(\{[\s\S]*type,[\s\S]*size:\s*6[\s\S]*domain:\s*activeChannelDomain\.value/,
  'ExploreView must read channel latest posts through the discovery adapter with effective channel-domain filters',
)
assert.match(
  exploreView,
  /channelLatestPosts\.value\s*=\s*filterVisiblePosts\(filterPublicContent\(\s*settled[\s\S]*\.flatMap\(/,
  'ExploreView must merge the public results returned for the active channel or content-form entry',
)

console.log('stage2 explore entry guard passed')
