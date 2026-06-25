import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const readSource = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const dashboardApi = readSource('src/api/dashboard.ts')
const trendView = readSource('src/views/TrendDashboardView.vue')

assert.match(
  dashboardApi,
  /getTrendDashboard:\s*\(\s*range\?\s*:\s*TrendRange\s*,\s*domain\?\s*:\s*number\s*\)/,
  'dashboard API must keep the range/domain trend query contract.',
)
assert.match(
  dashboardApi,
  /if\s*\(\s*domain\s*!=\s*null\s*\)\s*\{[^}]*params\.domain\s*=\s*domain[^}]*\}/s,
  'dashboard API must only send a domain query parameter when a domain is selected.',
)
assert.match(
  dashboardApi,
  /export\s+interface\s+DomainComparisonMetric/,
  'dashboard API must type the backend domainComparison operation metrics.',
)
assert.match(
  dashboardApi,
  /domainComparison\?\s*:\s*DomainComparisonMetric\[\]/,
  'TrendDashboard must expose domainComparison from the backend payload.',
)

assert.match(
  trendView,
  /v-for\s*=\s*["']period\s+in\s+periods["']/,
  'TrendDashboardView must keep the range selector.',
)
assert.match(
  trendView,
  /v-for\s*=\s*["']domain\s+in\s+DOMAIN_OPTIONS["']/,
  'TrendDashboardView must keep domain selector controls sourced from DOMAIN_OPTIONS.',
)
assert.match(
  trendView,
  /const\s+domainComparisonRows\s*=\s*computed/,
  'TrendDashboardView must derive domainComparisonRows for the operations board.',
)
assert.match(
  trendView,
  /comparisonDashboard\.value\?\.domainComparison/,
  'TrendDashboardView must prefer backend domainComparison data for the operations board.',
)
assert.match(
  trendView,
  /comparisonDashboard\s*=\s*ref<TrendDashboard\s*\|\s*null>\(null\)/,
  'TrendDashboardView must keep all-domain comparison data separate from the selected-domain dashboard.',
)
assert.match(
  trendView,
  /dashboardApi\.getTrendDashboard\(activeRange\.value\)/,
  'TrendDashboardView must load an all-domain trend dashboard for side-by-side comparison.',
)
assert.match(
  trendView,
  /interface\s+DomainComparisonRow/,
  'TrendDashboardView must type the domain comparison row model.',
)
assert.match(
  trendView,
  /class="domain-comparison-board/,
  'TrendDashboardView must render a dedicated domain comparison board section.',
)
assert.match(
  trendView,
  /v-for\s*=\s*["']row\s+in\s+domainComparisonRows["']/,
  'TrendDashboardView must render side-by-side domain comparison rows.',
)
assert.match(
  trendView,
  /domain-comparison-row--active/,
  'TrendDashboardView must visually mark the selected domain in the comparison board.',
)
assert.match(
  trendView,
  /row\.shareLabel/,
  'Comparison rows must expose a share label for quick operations scanning.',
)
assert.match(
  trendView,
  /row\.topContent/,
  'Comparison rows must expose representative hot content.',
)
assert.match(
  trendView,
  /row\.statusTone/,
  'Comparison rows must expose an operations status tone.',
)
assert.match(
  trendView,
  /@click="setDomain\(row\.value\)"/,
  'Comparison rows must let operators switch the active domain from the board.',
)
assert.match(
  trendView,
  /\.domain-comparison-grid/,
  'TrendDashboardView must include responsive styling for the comparison grid.',
)
assert.match(
  trendView,
  /\.domain-comparison-row/,
  'TrendDashboardView must include row styling for mobile and desktop readability.',
)

console.log('Phase 7 operations dashboard guard passed.')
