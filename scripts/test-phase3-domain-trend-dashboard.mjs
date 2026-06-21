import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')

const readSource = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8')

const dashboardSource = readSource('src/api/dashboard.ts')
const trendViewSource = readSource('src/views/TrendDashboardView.vue')

const assertIncludes = (source, needle, message) => {
  if (!source.includes(needle)) {
    throw new Error(message)
  }
}

const assertMatches = (source, pattern, message) => {
  if (!pattern.test(source)) {
    throw new Error(message)
  }
}

assertIncludes(
  dashboardSource,
  'activeDomain',
  'TrendDashboard should include activeDomain so the UI can reflect the selected domain.',
)
assertIncludes(
  dashboardSource,
  'domainDistribution',
  'TrendDashboard should include domainDistribution for the domain distribution panel.',
)
assertIncludes(
  dashboardSource,
  'domainHotContent',
  'TrendDashboard should include domainHotContent for domain hot content.',
)
assertMatches(
  dashboardSource,
  /getTrendDashboard:\s*\(\s*range\?\s*:\s*TrendRange\s*,\s*domain\?\s*:\s*number\s*\)/,
  'getTrendDashboard should accept domain?: number as the second argument.',
)
assertMatches(
  dashboardSource,
  /const\s+params[^=]*=\s*\{\s*range\s*\}/,
  'getTrendDashboard should start with params containing range.',
)
assertMatches(
  dashboardSource,
  /if\s*\(\s*domain\s*!=\s*null\s*\)\s*\{[^}]*params\.domain\s*=\s*domain[^}]*\}/s,
  'getTrendDashboard should only send params.domain when a domain is present.',
)

assertMatches(
  trendViewSource,
  /import\s+\{[^}]*DOMAIN_OPTIONS[^}]*\}\s+from\s+['"]@\/utils\/domains['"]/,
  'TrendDashboardView should import DOMAIN_OPTIONS from the domain utility.',
)
assertIncludes(
  trendViewSource,
  '综合',
  'TrendDashboardView should expose a 综合 control for all-domain trends.',
)
assertMatches(
  trendViewSource,
  /v-for\s*=\s*["']domain\s+in\s+DOMAIN_OPTIONS["']/,
  'TrendDashboardView should render domain controls from DOMAIN_OPTIONS.',
)
assertIncludes(
  trendViewSource,
  'dashboardApi.getTrendDashboard(activeRange.value, activeDomain.value)',
  'loadDashboard should call getTrendDashboard with activeRange and activeDomain.',
)
assertIncludes(
  trendViewSource,
  'dashboard?.domainDistribution',
  'TrendDashboardView should render dashboard?.domainDistribution.',
)
assertIncludes(
  trendViewSource,
  'dashboard?.domainHotContent',
  'TrendDashboardView should render dashboard?.domainHotContent.',
)
assertIncludes(
  trendViewSource,
  'getDomainLabel',
  'TrendDashboardView should label domain hot content with the selected domain.',
)
assertIncludes(
  trendViewSource,
  'domainHotContentTitle',
  'TrendDashboardView should compute a domain-aware hot content title.',
)

console.log('Phase 3 domain trend dashboard guard passed.')
