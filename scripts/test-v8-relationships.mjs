import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const api = read('src/api/relationships.ts')
const composable = read('src/composables/useRelationshipWorkspace.ts')
const view = read('src/views/RelationshipWorkspaceView.vue')
const router = read('src/router/index.ts')

assert.match(api, /\/api\/v1\/users\/me\/relationships/, 'relationship API must use the authenticated current-user endpoint')
assert.match(api, /relationship-summary/, 'relationship API must expose the summary endpoint')
assert.match(api, /requestResult/, 'relationship API must follow the requestResult contract')
assert.match(api, /adaptPage/, 'relationship list must adapt paginated responses')
assert.match(api, /updatePreference/, 'relationship API must support preference updates')
assert.match(api, /deletePreference/, 'relationship API must support restoring the default preference')
assert.match(api, /encodeURIComponent/, 'relationship source ids must be URL encoded')

assert.match(composable, /generation/, 'relationship workspace must reject stale requests after account changes')
assert.match(composable, /accountUid/, 'relationship workspace must be scoped to the current account')
assert.match(composable, /items\.value = \[\]/, 'relationship workspace must clear list state on reset')
assert.match(composable, /nextCursor\.value = undefined/, 'relationship workspace must clear cursor state on reset')
assert.match(composable, /summary\.value = null/, 'relationship workspace must clear summary state on reset')
assert.match(composable, /watch\(accountUid/, 'relationship workspace must react to account changes')
assert.match(composable, /entry\.sourceType === item\.sourceType/, 'relationship updates must use source type and source id as a composite identity')
assert.match(composable, /loadMore/, 'relationship workspace must expose keyset pagination')
assert.match(composable, /MAX_FOCUS_PAGES/, 'relationship deep links must perform bounded pagination to locate later items')
assert.match(composable, /focusNotice/, 'relationship deep links must expose an unavailable target state')
assert.match(composable, /mode\.value === 'MUTED'/, 'preference changes must immediately respect the active relationship mode')
assert.match(
  composable,
  /const updateItemsForPreference[\s\S]*mode\.value === 'ALL'[\s\S]*mode\.value === 'MUTED' \? entry\.deliveryMode === 'MUTED' : entry\.deliveryMode !== 'MUTED'/,
  'a shared preference update helper must re-apply the active relationship mode',
)
assert.match(
  composable,
  /const savePreference[\s\S]*updateItemsForPreference\(item, preference\)/,
  'saving a preference must re-apply the active relationship mode',
)
assert.match(
  composable,
  /const clearPreference[\s\S]*updateItemsForPreference\(item, \{/,
  'clearing a preference must re-apply the active relationship mode',
)

assert.match(view, /data-relationship-state="loading"/, 'relationship view must expose loading state')
assert.match(view, /data-relationship-state="error"/, 'relationship view must expose error state')
assert.match(view, /data-relationship-state="empty"/, 'relationship view must expose empty state')
assert.match(view, /sourceType/, 'relationship view must support source type filtering')
assert.match(view, /query\.sourceId/, 'relationship view must preserve deep-link focus state')
assert.match(view, /toLocalDateTimeInput/, 'datetime-local values must preserve the user local timezone')
assert.match(view, /getTimezoneOffset\(\)/, 'datetime-local display must account for the browser timezone offset')
assert.match(view, /toUtcIso[\s\S]*toISOString\(\)/, 'datetime-local saves must convert local input back to UTC')
assert.match(view, /订阅设置/, 'relationship view must expose preference controls')
assert.match(view, /targetPath/, 'relationship view must use server-provided canonical target paths')
assert.match(view, /不\.?会替代原资源页面上的关注/, 'relationship view must not replace domain-specific follow actions')
assert.match(view, /filterChanged[\s\S]*void reload\(\)/, 'same-filter deep-link changes must retry bounded pagination')
assert.match(view, /isSameRelationship/, 'relationship focus must use composite source identity')
assert.match(view, /hasRelationshipFilters/, 'relationship empty states must distinguish filters from an empty account')
assert.match(view, /clearRelationshipFilters/, 'filtered empty states must expose a clear action')
assert.match(view, /relationshipErrorKind/, 'permission failures must stay distinct from ordinary read failures')
assert.match(view, /visibleSummaryStats[\s\S]*stat\.key === 'total' \|\| Number\(stat\.value\) > 0/, 'relationship summary must hide zero-only secondary metrics')
assert.match(view, /还没有可管理的关系/, 'an account with no relationships must receive an actionable empty state')

const routeStart = router.indexOf("path: '/me/relationships'")
assert.notEqual(routeStart, -1, 'relationship workspace route must be registered')
const routeBlock = router.slice(routeStart, router.indexOf('\n  {', routeStart + 10))
assert.match(routeBlock, /RelationshipWorkspaceView\.vue/, 'relationship route must load the workspace view')
assert.match(routeBlock, /requiresAuth:\s*true/, 'relationship workspace must require authentication')

console.log('V8 relationships guard passed')
