import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const api = read('../src/api/collaboration.ts')
const hub = read('../src/views/CollaborationHubView.vue')
const workspace = read('../src/components/collaboration/MyCollaborationsWorkspace.vue')
const packageJson = read('../package.json')

assert.match(
  api,
  /needs:\s*\{[\s\S]*mine:\s*\(query: CollaborationListQuery = \{\}\)[\s\S]*client\.get\(`\$\{BASE_PATH\}\/needs\/mine`, \{ params: query \}\)/,
  'collaboration API must expose the authenticated claimed-needs endpoint through requestResult.',
)
assert.doesNotMatch(api, /claimedByMe/, 'the current slice must keep using claimedByUid instead of expanding the backend DTO.')

assert.match(hub, /const publicTabs = \[[\s\S]*\{ key: 'needs', label: '需求'/, 'public collaboration tabs must expose the needs entry.')
assert.match(hub, /const personalWorkspaceDefinitions[\s\S]*'my-collaborations': \{[\s\S]*label: '我的共建'/, 'the personal collaboration workspace must expose claimed needs.')
assert.match(hub, /activeTab === 'my-collaborations'[\s\S]*<MyCollaborationsWorkspace/, 'the hub must render the claimed-needs workspace.')
assert.match(hub, /tab === 'my-collaborations' && !await ensureLoggedIn\(\)/, 'entering my collaborations must reuse the existing action-level login gate.')
assert.match(hub, /myCollaborationsRef\.value\?\.refresh\(\)/, 'the hub refresh action must reach the claimed-needs workspace.')

assert.match(workspace, /data-my-claimed-needs/, 'the workspace must expose a stable claimed-needs surface.')
assert.match(
  workspace,
  /const query = \{[\s\S]*status:[\s\S]*cursor:[\s\S]*size:\s*20[\s\S]*collaborationApi\.needs\.mine\(query\)/,
  'the workspace must load filtered keyset pages from needs.mine.',
)
assert.match(workspace, /String\(need\.claimedByUid \?\? ''\) === currentUid\(\)/, 'claim ownership must compare claimedByUid with the current authenticated uid.')
for (const status of ['CLAIMED', 'SUBMITTED', 'COMPLETED', 'CLOSED', 'MERGED', 'OPEN']) {
  assert.match(workspace, new RegExp(`value: '${status}'`), `the claimed-needs filter must include ${status}.`)
}
assert.match(workspace, /state\.nextCursor = res\.data\?\.nextCursor/, 'the workspace must preserve the server next cursor.')
assert.match(workspace, /state\.hasMore = Boolean\(res\.data\?\.hasMore && state\.nextCursor\)/, 'the workspace must require both hasMore and nextCursor before loading another page.')
assert.match(workspace, /还没有认领的需求/, 'the workspace must provide a first-use empty state.')
assert.match(workspace, /浏览公开需求/, 'the empty state must route users back to public needs.')
assert.match(workspace, /公开交付已完成/, 'completed needs must expose their delivery state.')
assert.match(workspace, /resolutionPostId/, 'the workspace must expose available public delivery links.')

assert.match(packageJson, /"test:my-claimed-needs":\s*"node scripts\/test-my-claimed-needs\.mjs"/, 'package scripts must expose the claimed-needs guard.')
assert.match(packageJson, /"test:stage-release-guards":\s*"[^"]*npm run test:my-claimed-needs/, 'the stage release chain must include the claimed-needs guard.')
assert.match(packageJson, /"test:guards":\s*"[^"]*npm run test:stage-release-guards/, 'test:guards must include the stage release chain.')

console.log('my claimed needs guard passed')
