import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const api = read('../src/api/collaboration.ts')
const myWorkspace = read('../src/components/collaboration/MyCollaborationsWorkspace.vue')
const managementWorkspace = read('../src/components/collaboration/CollaborationManagementWorkspace.vue')
const adminView = read('../src/views/AdminCollaborationView.vue')
const packageJson = read('../package.json')

assert.match(
  api,
  /createdMine:\s*\(query: CollaborationListQuery = \{\}\)[\s\S]*client\.get\(`\$\{BASE_PATH\}\/needs\/mine\/created`, \{ params: query \}\)/,
  'the API must expose the creator-owned needs list through requestResult.',
)
assert.match(
  api,
  /reviewQueue:[\s\S]*client\.get\(`\$\{BASE_PATH\}\/needs\/review-queue`, \{ params: query \}\)/,
  'the API must expose the server-side need review queue through requestResult.',
)

assert.match(myWorkspace, /data-my-created-needs/, 'the personal workspace must expose a real creator scope.')
assert.match(myWorkspace, /type WorkspaceScope = 'claimed' \| 'created'/, 'the workspace must model both personal scopes.')
assert.match(myWorkspace, /activeScope\.value === 'created'[\s\S]*collaborationApi\.needs\.createdMine\(query\)/, 'creator scope must use the creator-owned endpoint.')
assert.match(myWorkspace, /activeScope\.value === 'claimed'[\s\S]*collaborationApi\.needs\.mine\(query\)/, 'claimed scope must keep using the claimed-needs endpoint.')
assert.match(myWorkspace, /String\(need\.creatorUid \?\? ''\) === currentUid\(\)/, 'creator ownership must be derived from creatorUid and the logged-in uid.')
assert.match(myWorkspace, /collaborationApi\.needs\.accept\(need\.id\)/, 'creators must be able to accept a submitted delivery.')
assert.match(myWorkspace, /collaborationApi\.needs\.reject\(need\.id, \{ reason \}\)/, 'creator rejection must send a required reason.')
assert.match(myWorkspace, /watch\([\s\S]*authStore\.user\?\.uid[\s\S]*clearState\(\)/, 'switching personal accounts must invalidate the previous list state.')

assert.doesNotMatch(
  managementWorkspace,
  /collaborationApi\.needs\.list\(/,
  'the management needs workflow must not scan the public needs endpoint.',
)
assert.match(
  managementWorkspace,
  /const loadNeeds = \(\) =>[\s\S]*collaborationApi\.needs\.createdMine\(/,
  'the management needs workflow must load creator-owned needs from the server.',
)
assert.match(managementWorkspace, /data-need-acceptance-queue/, 'the management workspace must expose a pending acceptance queue.')
assert.match(managementWorkspace, /submittedNeeds[\s\S]*item\.status === 'SUBMITTED'/, 'management acceptance actions must remain limited to submitted needs.')

assert.match(adminView, /data-need-review-queue/, 'admin collaboration must expose the need review queue.')
assert.match(
  adminView,
  /collaborationApi\.needs\.reviewQueue\(\{[\s\S]*domain:[\s\S]*cursor:[\s\S]*size:\s*QUEUE_PAGE_SIZE/,
  'admin collaboration must use the paged server-side review queue.',
)
assert.match(adminView, /needState\.nextCursor[\s\S]*needState\.hasMore/, 'the admin queue must preserve keyset pagination state.')
assert.match(adminView, /if \(!append\) \{[\s\S]*needItems\.value = \[\][\s\S]*needState\.nextCursor = ''[\s\S]*needState\.hasMore = false/, 'a failed first review-queue page must invalidate stale pagination.')
assert.match(adminView, /collaborationApi\.needs\.accept\(id\)/, 'admin collaboration must support acceptance.')
assert.match(adminView, /collaborationApi\.needs\.reject\(id, \{ reason: reviewNote\.value \}\)/, 'admin rejection must send the review reason.')
assert.match(adminView, /isDomainOnlyModerator/, 'domain-only moderator scope must be represented in the queue controls.')

assert.match(
  packageJson,
  /"test:need-creator-workbench":\s*"node scripts\/test-need-creator-workbench\.mjs"/,
  'package scripts must expose the creator-workbench guard.',
)
assert.match(
  packageJson,
  /"test:stage-release-guards":\s*"[^"]*npm run test:need-creator-workbench/,
  'the creator-workbench guard must run through the stage release chain.',
)
assert.match(
  packageJson,
  /"test:guards":\s*"[^"]*npm run test:stage-release-guards/,
  'test:guards must include the stage release chain.',
)

console.log('need creator workbench guard passed')
