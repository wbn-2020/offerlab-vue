import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const api = read('src/api/collaboration.ts')
const workspace = read('src/components/collaboration/OfficeHoursWorkspace.vue')
const detail = read('src/views/CollaborationOfficeHourDetailView.vue')
const identity = read('src/components/user/PublicActorIdentity.vue')

const officeContract = api.slice(
  api.indexOf('export interface PublicActor'),
  api.indexOf('export type StructuredDiscussionStatus'),
)

assert.match(officeContract, /export interface PublicActor[\s\S]*displayName:[\s\S]*avatarUrl\?:[\s\S]*badges\?:[\s\S]*self:/, 'office-hour actors must use a display-only public projection')
assert.match(officeContract, /export interface OfficeHour[\s\S]*host: PublicActor/, 'office hours must expose a public host projection')
assert.match(officeContract, /export interface OfficeHourReservation[\s\S]*host: PublicActor[\s\S]*attendee: PublicActor[\s\S]*viewerRole:/, 'reservations must expose actor projections and an explicit viewer role')
assert.match(officeContract, /export interface OfficeHourFeedback[\s\S]*author: PublicActor/, 'feedback must expose a public author projection')
assert.doesNotMatch(officeContract, /\b(hostUid|attendeeUid|authorUid|targetUid|decidedBy|cancelledBy)\b/, 'office-hour public API types must not expose database identity fields')

for (const [name, source] of [['workspace', workspace], ['detail', detail]]) {
  assert.doesNotMatch(source, /\b(hostUid|attendeeUid|authorUid|targetUid|decidedBy|cancelledBy)\b/, `${name} must not read database identity fields`)
  assert.doesNotMatch(source, /UID\s*\{\{/, `${name} must not render raw UID labels`)
}

assert.match(workspace, /reservation\.viewerRole === 'HOST'/, 'confirmation state must use the server-projected viewer role')
assert.match(workspace, /PublicActorIdentity/, 'the office-hour workspace must use the no-ID actor presentation')
assert.match(detail, /PublicActorIdentity :actor="officeHour\.host"/, 'the detail page must use the no-ID host presentation')
assert.doesNotMatch(identity, /RouterLink|\/u\/|uid/, 'public office-hour identity must not create profile links or accept UIDs')

console.log('office-hour identity privacy guard passed')
