import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const exploreView = readFileSync(new URL('../src/views/ExploreView.vue', import.meta.url), 'utf8')
const domainsApiPath = new URL('../src/api/domains.ts', import.meta.url)

assert.equal(existsSync(domainsApiPath), true, 'src/api/domains.ts must exist for stage-2 explore entry fallback handling')

const domainsApi = readFileSync(domainsApiPath, 'utf8')

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
  /from\s+['"]@\/api\/domains['"]/,
  'ExploreView must import the domains API adapter',
)
assert.match(
  exploreView,
  /DOMAIN_OPTIONS/,
  'ExploreView must still keep the local domain constant fallback available',
)
assert.match(
  exploreView,
  /阅读专题/,
  'ExploreView must explicitly expose a reading topic pilot entry',
)
assert.match(
  exploreView,
  /阅读试点|阅读策展|书单|读书/,
  'ExploreView must strengthen reading-domain discovery copy',
)
assert.match(
  exploreView,
  /domain:\s*String\(.*READING|domain:\s*String\(DOMAIN\.READING\)|domain:\s*DOMAIN\.READING/,
  'ExploreView must route at least one entry into the reading domain',
)
assert.match(
  exploreView,
  /useRoute|route\.query\.domain/,
  'ExploreView must read the active domain from route query for stage-2 domain discovery',
)
assert.match(
  exploreView,
  /postApi\.list\(\{\s*size:\s*8,\s*domain:\s*activeDomain\.value|postApi\.list\(\{[\s\S]*domain:\s*activeDomain\.value[\s\S]*size:\s*8/,
  'ExploreView must request latest posts with the active domain filter',
)
assert.match(
  exploreView,
  /dashboardApi\.getTrendDashboard\(\s*['"]30d['"]\s*,\s*activeDomain\.value\s*\)/,
  'ExploreView must request trend data with the active domain filter',
)

console.log('stage2 explore entry guard passed')
