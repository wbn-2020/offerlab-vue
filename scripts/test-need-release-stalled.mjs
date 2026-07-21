import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const api = read('../src/api/collaboration.ts')
const workspace = read('../src/components/collaboration/MyCollaborationsWorkspace.vue')
const packageJson = read('../package.json')

assert.match(api, /lastProgressAt\?: string \| null/, 'need DTO must expose the last real progress time.')
assert.match(api, /stalled\?: boolean \| null/, 'stalled must remain optional and compatible with null or old mocks.')
assert.match(api, /export interface NeedReleaseCmd[\s\S]*note\?: string/, 'release command must accept an optional note.')
assert.match(api, /release:\s*\(needId: ApiId, cmd: NeedReleaseCmd = \{\}\)[\s\S]*\/needs\/\$\{resourceId\(needId\)\}\/release/, 'release API must call the typed endpoint.')

assert.match(workspace, /data-need-release-confirmation/, 'release must use an explicit confirmation surface.')
assert.match(workspace, /need\.status === 'CLAIMED'[\s\S]*isClaimedByCurrentUser\(need\)[\s\S]*startRelease\(need\)/, 'only the current claimant may start release for a claimed need.')
assert.match(workspace, /const note = releaseNote\.value\.trim\(\)[\s\S]*collaborationApi\.needs\.release\(need\.id, \{[\s\S]*note: note \|\| undefined/, 'release must send the optional note through the API.')
assert.match(workspace, /const context = beginActionContext\(`release:\$\{need\.id\}`\)[\s\S]*collaborationApi\.needs\.release\(need\.id, \{[\s\S]*note: note \|\| undefined[\s\S]*refreshForAction\(context\)[\s\S]*toast\.success\('认领已释放/, 'release must refresh and report success only in the current action context.')
assert.match(workspace, /catch \(error\)[\s\S]*释放认领失败/, 'release failures must remain visible without local success fabrication.')
assert.match(workspace, /const invalidateActionContext[\s\S]*actionGeneration \+= 1[\s\S]*pendingAction\.value = ''/, 'scope or account changes must invalidate release busy state.')
assert.match(workspace, /need\.status === 'SUBMITTED'[\s\S]*withdrawNeed\(need\)/, 'submitted needs must retain withdrawal.')
assert.doesNotMatch(workspace, /need\.status === 'SUBMITTED'[\s\S]{0,240}startRelease\(need\)/, 'submitted needs must not expose direct release.')
assert.match(workspace, /need\.lastProgressAt \|\| need\.claimedAt/, 'creator view must show the latest available progress time.')
assert.match(workspace, /v-if="need\.stalled"[\s\S]*暂时没有新的公开进展/, 'stalled state must use restrained copy.')
assert.match(workspace, /const beginActionContext[\s\S]*uid: currentUid\(\)[\s\S]*scope: activeScope\.value/, 'release must be bound to the account and workspace scope.')
assert.match(workspace, /const finishActionContext[\s\S]*isActionContextCurrent\(context\)/, 'stale release callbacks must not clear a newer busy action.')

assert.match(packageJson, /"test:need-release-stalled":\s*"node scripts\/test-need-release-stalled\.mjs"/, 'package scripts must expose the release stalled guard.')
assert.match(packageJson, /"test:guards":\s*"[^"]*npm run test:need-release-stalled/, 'test:guards must include the release stalled guard.')

console.log('need release stalled guard passed')
