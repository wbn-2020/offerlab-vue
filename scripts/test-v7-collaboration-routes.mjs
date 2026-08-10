import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const router = read('src/router/index.ts')
const routes = read('src/utils/collaborationRoutes.ts')
const hubQuery = read('src/composables/useCollaborationHubQuery.ts')
const hub = read('src/views/CollaborationHubView.vue')
const packageJson = JSON.parse(read('package.json'))

const detailRoutes = [
  ['series', 'seriesId', 'CollaborationSeriesDetail', 'CollaborationSeriesDetailView.vue'],
  ['activities', 'activityId', 'CollaborationActivityDetail', 'CollaborationActivityDetailView.vue'],
  ['discussions', 'discussionId', 'CollaborationDiscussionDetail', 'CollaborationDiscussionDetailView.vue'],
  ['office-hours', 'officeHourId', 'CollaborationOfficeHourDetail', 'CollaborationOfficeHourDetailView.vue'],
]

for (const [segment, param, name, component] of detailRoutes) {
  has(router, new RegExp(`path:\\s*['"]\\/collaboration\\/${segment}\\/:${param}['"]`), `${name} must expose its canonical path.`)
  has(router, new RegExp(`name:\\s*['"]${name}['"]`), `${name} must have a stable route name.`)
  has(router, new RegExp(`import\\(['"]@\\/views\\/${component}['"]\\)`), `${name} must load its dedicated detail view.`)
}

has(router, /path:\s*['"]\/collaboration\/needs\/:needId['"]/, 'the existing need detail route must remain available.')
has(router, /path:\s*['"]\/collaboration\/office-hours\/:officeHourId\/reservations\/:reservationId['"][\s\S]*CollaborationOfficeHourReservation/, 'Office-hour actions must have a route that resolves pending reservations.')
has(router, /reservationId:[\s\S]*to\.params\.reservationId/, 'Office-hour reservation actions must preserve the reservation id during redirect.')
has(router, /path:\s*['"]\/u\/:uid\/contributions['"][\s\S]*PublicCollaborationContributions/, 'Public contribution profiles must have a stable user route.')
has(router, /path:\s*['"]\/me\/collaboration\/contributions['"][\s\S]*MyCollaborationContributions/, 'The current user contribution route must be available.')
has(router, /legacyCollaborationDetailPath\(to\.query\)/, 'the Hub must retain the legacy query entry guard.')

has(routes, /export const isPositiveCollaborationId/, 'resource IDs must have a shared positive-integer validator.')
has(routes, /export const normalizeCollaborationId/, 'resource IDs must be normalized before routing or requesting.')
has(routes, /encodeURIComponent\(normalizedId\)/, 'resource paths must encode the validated resource ID.')
for (const segment of ['needs', 'series', 'activities', 'discussions', 'office-hours']) {
  has(routes, new RegExp(`['"]${segment}['"]`), `the shared route utility must know the ${segment} segment.`)
}
for (const key of ['tab', 'domain', 'status', 'sort', 'seriesId', 'activityId', 'discussionId', 'officeHourId', 'reservationId']) {
  has(routes, new RegExp(`query\\.${key}|query\\[['"]${key}['"]\\]|\\b${key}\\b`), `Hub query state must include ${key}.`)
}
has(routes, /legacyCollaborationDetailPath/, 'legacy collaboration query links must be resolvable.')

has(hubQuery, /useRoute\(\)/, 'the Hub query composable must read the current route.')
has(hubQuery, /useRouter\(\)/, 'the Hub query composable must own URL writes.')
has(hubQuery, /watch\(\(\) => route\.query/, 'the Hub query composable must restore state on back/forward or refresh.')
has(hubQuery, /router\.replace\(\{[\s\S]*path:\s*['"]\/collaboration['"]/, 'Hub state changes must use canonical query replacement.')
has(hubQuery, /parseCollaborationHubQuery\(route\.query\)/, 'Hub state must be hydrated from query values.')

has(hub, /useCollaborationHubQuery/, 'the Hub view must use the shared query composable.')
has(hub, /focus-office-hour-id[\s\S]*focus-reservation-id/, 'The Office Hour workspace must receive action focus ids from URL state.')
has(hub, /replaceHubQuery/, 'the Hub view must write tab and filter changes to the URL.')
has(hub, /const publicTabs = \[[\s\S]*key: 'needs'[\s\S]*key: 'series'[\s\S]*key: 'activities'[\s\S]*key: 'discussions'[\s\S]*\] as const/, 'Public Hub navigation must focus on needs, series, activities, and discussions.')
missing(hub.match(/const publicTabs = \[([\s\S]*?)\] as const/)?.[1] || '', /my-collaborations|curation|office-hours|manage|cases/, 'Personal workspaces must not remain in the public tab list.')
has(hub, /role="tablist"[\s\S]*aria-label="公共共建浏览"/, 'Public collaboration resources must expose a named tablist.')
has(hub, /:tabindex="activeTab === tab\.key \? 0 : -1"/, 'Public collaboration tabs must use a roving tabindex.')
has(hub, /@keydown="handlePublicTabKeydown\(\$event, index\)"/, 'Public collaboration tabs must support keyboard navigation.')
has(hub, /nextRovingTabValue\(publicTabKeys, currentTab, event\.key\)/, 'Arrow, Home, and End behavior must use the shared tab navigation contract.')
has(hub, /:aria-controls="`collaboration-panel-\$\{tab\.key\}`"/, 'Each public tab must retain an explicit tabpanel relationship.')
has(hub, /personalWorkspaceDefinitions[\s\S]*'my-collaborations'[\s\S]*curation[\s\S]*'office-hours'[\s\S]*manage[\s\S]*cases/, 'Personal collaboration capabilities must remain available behind the action-center hierarchy.')
has(hub, /aria-labelledby="collaboration-personal-workspace-title"/, 'Legacy personal workspace panels must have a valid accessible label outside the public tablist.')
missing(hub.match(/<template>([\s\S]*?)<\/template>/)?.[1] || '', /hub-participation-guide|找到你现在能参与的一步/, 'The duplicated five-step guide must not remain in the Hub template.')
assert.equal((hub.match(/<fieldset class="workspace-form-fields" :disabled="!authStore\.isLoggedIn">/g) || []).length, 4, 'All four inline authoring forms must block anonymous input before content can be entered.')
for (const mode of ['need', 'series', 'activity']) {
  has(hub, new RegExp(`<aside v-if="contributionMode === '${mode}'"`), `The ${mode} authoring form must stay out of the default public browse surface.`)
}
has(hub, /const startNeedCreation = async[\s\S]*ensureLoggedIn\(\)[\s\S]*router\.push\('\/me\/collaboration'\)/, 'The public creation CTA must authenticate and hand off to the personal action center.')
has(hub, /name:\s*'CollaborationSeriesSubmission'/, 'Series submission actions must move into the protected personal contribution route.')
has(hub, /name:\s*'CollaborationActivitySubmission'/, 'Activity submission actions must move into the protected personal contribution route.')
for (const emptyAction of ['clearNeedFilters', 'clearSeriesFilters', 'clearActivityFilters', 'clearDiscussionFilters']) {
  has(hub, new RegExp(`@click="${emptyAction}"[\\s\\S]*const ${emptyAction}\\s*=`), `${emptyAction} must provide an actionable public empty state.`)
}
for (const handler of ['changeNeedFilters', 'changeSeriesFilters', 'changeActivityFilters', 'changeCurationFilters', 'changeDiscussionFilters', 'changeSort']) {
  has(hub, new RegExp(`const ${handler}\\s*=`), `${handler} must be present for bidirectional URL state.`)
}
for (const pathSegment of ['need', 'series', 'activity', 'discussion']) {
  has(hub, new RegExp(`collaborationResourcePath\\(['"]${pathSegment}['"]`), `Hub links must use the shared ${pathSegment} path builder.`)
}

const detailContracts = [
  ['src/views/CollaborationSeriesDetailView.vue', 'seriesId', 'collaborationApi.series.detail'],
  ['src/views/CollaborationActivityDetailView.vue', 'activityId', 'collaborationApi.activities.detail'],
  ['src/views/CollaborationDiscussionDetailView.vue', 'discussionId', 'collaborationApi.discussions.detail'],
  ['src/views/CollaborationOfficeHourDetailView.vue', 'officeHourId', 'collaborationApi.officeHours.detail'],
]

for (const [relativePath, param, detailCall] of detailContracts) {
  assert.ok(existsSync(join(root, relativePath)), `${relativePath} must exist.`)
  const source = read(relativePath)
  has(source, new RegExp(`normalizeCollaborationId\\(route\\.params\\.${param}\\)`), `${relativePath} must normalize its route ID.`)
  has(source, /if \(!id\) \{[\s\S]*return/, `${relativePath} must return before requesting an invalid ID.`)
  has(source, new RegExp(detailCall.replaceAll('.', '\\.')), `${relativePath} must use its existing read-only detail API.`)
  has(source, /RouterLink/, `${relativePath} must expose a safe navigation/action entry.`)
  has(source, /applyPageSeo/, `${relativePath} must publish a stable canonical detail path.`)
  missing(source, /\.(vote|create|updateStatus|updateSummary|decide|cancel|confirmComplete|put|post|delete)\(/, `${relativePath} must not add write actions in V7 phase one.`)
}

assert.equal(
  packageJson.scripts['test:v7-collaboration-routes'],
  'node scripts/test-v7-collaboration-routes.mjs',
  'package.json must expose the V7 collaboration route guard.',
)

console.log('V7 collaboration route guards passed.')
