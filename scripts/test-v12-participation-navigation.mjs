import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const typescript = require('typescript')
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const navigationSource = read('src/utils/participationNavigation.ts')
const profile = read('src/views/MeProfileView.vue')
const hub = read('src/components/me/ParticipationHub.vue')
const collaborationCenter = read('src/components/collaboration/CollaborationActionCenter.vue')
const knowledgeView = read('src/views/KnowledgeMaintenanceView.vue')
const maintenanceView = read('src/views/MaintenanceTasksView.vue')
const notificationsView = read('src/views/NotificationsView.vue')
const relationshipsView = read('src/views/RelationshipWorkspaceView.vue')
const reportsView = read('src/views/MyReportsView.vue')
const updateDigestPanel = read('src/components/retention/UpdateDigestPanel.vue')

const transpiled = typescript.transpileModule(navigationSource, {
  compilerOptions: {
    module: typescript.ModuleKind.ESNext,
    target: typescript.ScriptTarget.ES2022,
  },
}).outputText
const navigation = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`)

assert.deepEqual(
  navigation.ME_PROFILE_TABS,
  ['posts', 'favorites', 'liked', 'following', 'topics', 'discussion-follows', 'followers'],
  'V12 must keep the existing /me tab set',
)
assert.equal(navigation.normalizeMeTab(undefined), 'posts')
assert.equal(navigation.normalizeMeTab('FOLLOWING'), 'following')
assert.equal(navigation.normalizeMeTab(['discussion-follows', 'posts']), 'discussion-follows')
assert.equal(navigation.normalizeMeTab('unknown'), 'posts')
assert.equal(navigation.nextRovingTabValue(['a', 'b', 'c'], 'a', 'ArrowLeft'), 'c')
assert.equal(navigation.nextRovingTabValue(['a', 'b', 'c'], 'b', 'ArrowRight'), 'c')
assert.equal(navigation.nextRovingTabValue(['a', 'b', 'c'], 'b', 'Home'), 'a')
assert.equal(navigation.nextRovingTabValue(['a', 'b', 'c'], 'b', 'End'), 'c')
assert.equal(navigation.nextRovingTabValue(['a', 'b', 'c'], 'b', 'Tab'), null)

assert.equal(
  navigation.selectCollaborationActionType({ NEED_SUBMIT: '1', NEED_REVISE: '1' }),
  'NEED_REVISE',
  'collaboration deep links must use the frozen action order',
)
assert.equal(
  navigation.selectKnowledgeActionType({ FRESHNESS_CONFIRMATION: '1', SUGGESTION_RESPONSE: '1' }),
  'SUGGESTION_RESPONSE',
  'knowledge deep links must follow the workspace order',
)
assert.equal(
  navigation.selectMaintenanceStatus([{ status: 'OPEN' }, { status: 'CLAIMED' }]),
  'CLAIMED',
  'maintenance deep links must prefer the frozen status order',
)
assert.equal(
  navigation.selectNotificationType({ like: 2, comment: 2, mention: 1 }),
  'like',
  'notification ties must follow the frozen notification tab order',
)
assert.deepEqual(
  navigation.buildCollaborationTarget('NEED_SUBMIT'),
  { path: '/me/collaboration', query: { actionType: 'NEED_SUBMIT' } },
)
assert.deepEqual(
  navigation.buildKnowledgeTarget('REFERENCE_REVIEW'),
  { path: '/me/knowledge', query: { tab: 'queue', type: 'REFERENCE_REVIEW' } },
)
assert.deepEqual(
  navigation.buildMaintenanceTarget('CLAIMED'),
  { path: '/me/maintenance', query: { status: 'CLAIMED' } },
)
assert.deepEqual(
  navigation.buildNotificationTarget('mention'),
  { path: '/me/notifications', query: { type: 'mention' } },
)
assert.deepEqual(
  navigation.buildUpdateDigestTarget({ sourceType: 'POST', sourceId: '123' }),
  { path: '/me/notifications', query: { view: 'updates', sourceType: 'POST', sourceId: '123' } },
)
assert.deepEqual(
  navigation.buildRevisitTarget('OPEN'),
  { path: '/me/notifications', query: { view: 'revisits', status: 'OPEN' } },
)
assert.deepEqual(
  navigation.buildRelationshipTarget('MUTED'),
  { path: '/me/relationships', query: { mode: 'MUTED' } },
)
assert.deepEqual(
  navigation.buildReportsTarget('processed'),
  { path: '/me/reports', query: { filter: 'processed' } },
)
assert.equal(navigation.selectReportFilter([{ userStatus: 'CLOSED' }]), undefined)
assert.equal(navigation.selectUpdateDigestFocus([{ sourceType: 'POST', sourceId: 'not allowed value' }]), undefined)
assert.equal(navigation.selectUpdateDigestFocus([{ sourceType: 'POST', sourceId: 'post?unexpected=1' }]), undefined)
assert.deepEqual(
  navigation.selectUpdateDigestFocus([{ sourceType: 'POST', sourceId: 'post:123' }]),
  { sourceType: 'POST', sourceId: 'post:123' },
)

const participationNavigationImport = profile.match(
  /import\s*\{([\s\S]*?)\}\s*from '@\/utils\/participationNavigation'/,
)?.[1] || ''
assert.match(participationNavigationImport, /\bnormalizeMeTab\b/)
assert.match(participationNavigationImport, /\bnextRovingTabValue\b/)
assert.match(profile, /loaded: false/)
assert.match(profile, /let profileGeneration = 0/)
assert.match(profile, /watch\(\s*\[\(\) => authStore\.user\?\.uid, \(\) => authStore\.token\]/)
assert.match(profile, /resetProfileAccountState\(\)/)
assert.match(profile, /const loadInitialTab = \(tab: TabValue\)/)
assert.match(profile, /loadFavoriteFolders\(\),\s*loadFavorites\(\)/)
assert.match(profile, /profileMetricText/)
assert.match(profile, /favoriteAssetCountText/)
assert.match(profile, /representativePostsPending/)
assert.match(profile, /props\.state\.loaded\s*\?\s*h\(EmptyPanel/)
assert.doesNotMatch(profile, /RevisitSummaryPanel/)

const mountedBlock = profile.match(/onMounted\(\(\) => \{([\s\S]*?)\n\}\)/)?.[1] || ''
for (const eagerLoader of [
  'loadFavorites(',
  'loadFavoriteFolders(',
  'loadLikedPosts(',
  'loadFollowing(',
  'loadFollowingTopics(',
  'loadDiscussionFollows(',
  'loadFollowers(',
]) {
  assert.doesNotMatch(mountedBlock, new RegExp(eagerLoader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `/me mount must not eagerly call ${eagerLoader}`)
}
assert.match(mountedBlock, /void initializeProfile\(\)/)

for (const source of [
  'buildCollaborationTarget',
  'buildKnowledgeTarget',
  'buildMaintenanceTarget',
  'buildNotificationTarget',
  'buildUpdateDigestTarget',
  'buildRevisitTarget',
  'buildRelationshipTarget',
  'buildReportsTarget',
]) {
  assert.match(hub, new RegExp(source), `Participation Hub must use ${source}`)
}
assert.match(hub, /actionLabel/)
assert.match(hub, /width: 2\.75rem/)

assert.match(collaborationCenter, /route\.query\.actionType/)
assert.match(knowledgeView, /route\.query\.type/)
assert.match(knowledgeView, /route\.query\.tab/)
assert.match(maintenanceView, /route\.query\.status/)
assert.match(notificationsView, /route\.query\.view/)
assert.match(notificationsView, /route\.query\.type/)
assert.match(relationshipsView, /route\.query\.mode/)
assert.match(reportsView, /route\.query\.filter/)
assert.match(updateDigestPanel, /\^\[1-9\]\[0-9\]\{0,79\}\$/, 'update digest route IDs must use the canonical numeric identifier contract')

console.log('V12 participation navigation guard passed.')
