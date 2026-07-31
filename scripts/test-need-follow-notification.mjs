import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const api = read('../src/api/collaboration.ts')
const adapters = read('../src/api/adapters.ts')
const workspace = read('../src/components/collaboration/MyCollaborationsWorkspace.vue')
const notifications = read('../src/views/NotificationsView.vue')
const packageJson = read('../package.json')

assert.match(api, /followed:\s*\([\s\S]*\/needs\/mine\/followed/, 'needs.followed must call the authenticated server endpoint.')
assert.match(workspace, /type WorkspaceScope = 'claimed' \| 'created' \| 'followed'/, 'my collaborations must expose three scopes.')
assert.match(workspace, /activeScope === 'followed'/, 'the followed scope must have a real view state.')
assert.match(workspace, /collaborationApi\.needs\.followed\(query\)/, 'the followed scope must query the server.')
assert.match(workspace, /requestId \+= 1[\s\S]*state\.items = \[\][\s\S]*state\.nextCursor = ''/, 'scope and account changes must invalidate requests and clear list pagination.')
assert.match(workspace, /statusFilter\.value = ''[\s\S]*clearState\(\)/, 'scope or account changes must clear the status filter and drafts.')
assert.match(workspace, /type WorkspaceActionContext = \{[\s\S]*generation: number[\s\S]*uid: string[\s\S]*scope: WorkspaceScope/, 'workspace actions must carry account, scope, and generation context.')
assert.match(workspace, /const isActionContextCurrent[\s\S]*context\.generation === actionGeneration[\s\S]*context\.uid === currentUid\(\)[\s\S]*context\.scope === activeScope\.value/, 'workspace callbacks must reject stale account or scope contexts.')
assert.match(workspace, /const action = `submit:\$\{need\.id\}`[\s\S]*beginActionContext\(action\)/, 'submit must capture a workspace action context.')
for (const action of ['withdraw', 'release', 'accept', 'reject']) {
  assert.match(workspace, new RegExp(`beginActionContext\\(\\\`${action}:`), `${action} must capture a workspace action context.`)
}
assert.match(workspace, /const finishActionContext[\s\S]*isActionContextCurrent\(context\)/, 'workspace callbacks must not release a newer action busy state.')
assert.match(workspace, /watch\([\s\S]*flush:\s*'sync'/, 'account changes must synchronously invalidate workspace actions.')
assert.match(workspace, /initialError: ''[\s\S]*loadMoreError: ''/, 'workspace state must separate initial and append errors.')
assert.match(workspace, /if \(append\) \{[\s\S]*state\.loadMoreError = message[\s\S]*\} else \{[\s\S]*state\.initialError = message[\s\S]*state\.items = \[\]/, 'append list failures must retain loaded items.')
assert.match(workspace, /state\.initialError = message[\s\S]*state\.items = \[\][\s\S]*state\.nextCursor = ''[\s\S]*state\.hasMore = false/, 'a failed first page must invalidate stale workspace pagination.')
assert.match(workspace, /state\.loadMoreError[\s\S]*loadNeeds\(true\)/, 'workspace append failures must offer an in-place retry.')

const detail = read('../src/views/CollaborationNeedDetailView.vue')
assert.match(detail, /const canToggleFollow = computed\([\s\S]*need\.value\.followed \|\| \['OPEN', 'CLAIMED'\]\.includes\(need\.value\.status\)/, 'new follows must only be offered while participation is open, while existing follows remain removable.')
assert.match(detail, /!canToggleFollow\.value/, 'the follow handler must enforce the same state gate as the button.')

assert.match(adapters, /collaboration_need_state_changed/, 'notification adapter must recognize collaboration need state changes.')
assert.match(adapters, /collaborationNeedStateHeadings/, 'notification adapter must provide Chinese state headings.')
assert.match(adapters, /collaborationNeedStateContents/, 'notification adapter must provide Chinese state descriptions.')
assert.match(adapters, /safeSameSitePath\(preferredPath\)/, 'notification target paths must remain same-site sanitized.')
assert.match(adapters, /if \(suppliedPath\) return suppliedPath/, 'a safe backend targetPath must take priority.')
assert.match(adapters, /eventType === 'MERGED'[\s\S]*content\.targetNeedId/, 'MERGED notifications must fall back to the target need.')
assert.match(adapters, /const reasonText = sanitizeVisibleText\(content\.reasonText\)/, 'direct-recipient reason text must be appended safely when present.')
assert.match(notifications, /router\.push\(notif\.targetPath\)/, 'notification clicks must use the adapted target path.')

assert.match(packageJson, /"test:need-follow-notification":\s*"node scripts\/test-need-follow-notification\.mjs"/, 'package scripts must expose the follow notification guard.')
assert.match(packageJson, /"test:guards":\s*"[^"]*npm run test:need-follow-notification/, 'test:guards must include the follow notification guard.')

console.log('need follow notification guard passed')
