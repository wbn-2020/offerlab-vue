import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const has = (source, pattern, message) => assert.match(source, pattern, message)

const hub = read('src/views/CollaborationHubView.vue')
const mine = read('src/components/collaboration/MyCollaborationsWorkspace.vue')
const actions = read('src/components/collaboration/CollaborationActionCenter.vue')
const digest = read('src/components/retention/UpdateDigestPanel.vue')
const revisits = read('src/components/retention/RevisitSummaryPanel.vue')

for (const section of ['needs', 'series', 'activities', 'discussions']) {
  has(hub, new RegExp(`data-community-public-section="${section}"`), `${section} must expose an independent public-section state`)
}
has(hub, /data-community-participation-section="my-collaborations"/, 'my collaborations must be a distinct participation section')
has(hub, /data-community-participation-section="curation"/, 'curation must be a distinct participation section')
has(hub, /collectionDisplayState[\s\S]*'loading'[\s\S]*'error'[\s\S]*'empty'/, 'public and participation collections must distinguish loading, error, and empty')

has(mine, /data-participation-state="workspaceState"/, 'my-collaboration workspace must expose its own state')
for (const state of ['loading', 'error', 'empty']) {
  has(mine, new RegExp(`workspaceState[\\s\\S]*'${state}'`), `my-collaboration state must expose ${state}`)
}
has(actions, /summaryLoading[\s\S]*listLoading/, 'action summary and list must retain independent loading state')
has(actions, /summaryError[\s\S]*listError/, 'action summary and list must retain independent error state')

has(digest, /data-update-digest-state/, 'digest must expose an isolated state contract')
has(revisits, /data-revisit-state/, 'revisit must expose an isolated state contract')

console.log('V9 community-space states guard passed.')
