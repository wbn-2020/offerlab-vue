import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const api = read('src/api/collaboration.ts')
const detail = read('src/views/CollaborationNeedDetailView.vue')

has(api, /interface NeedClaimCycle[\s\S]*cycleNo[\s\S]*claimantUid[\s\S]*revisions/, 'Claim-cycle DTO must preserve cycle identity and revisions.')
has(api, /interface NeedRevision[\s\S]*revisionNo[\s\S]*resolutionType[\s\S]*status[\s\S]*visibilityScope/, 'Revision DTO must preserve structured submission facts.')
has(api, /CollaborationNeed[\s\S]*currentClaimCycleNo[\s\S]*currentRevisionNo[\s\S]*claimCycles/, 'Need detail must expose current cycle and revision metadata.')

has(detail, /data-need-claim-cycles/, 'Need detail must expose a stable claim-cycle integration marker.')
has(detail, /data-need-revision/, 'Need detail must render structured submission revisions.')
has(detail, /canViewParticipantDetails && need\.claimCycles\?\.length/, 'Cycle history must remain behind the participant/manager visibility projection.')
has(detail, /revisionPath\(revision\)/, 'Revision output links must be derived from typed resolution data.')
missing(detail, /claimCycles\s*=\s*reactive|revisions\s*=\s*reactive|collaborationApi\.needs\.(accept|reject|release)\([^)]*revision/, 'The frontend must not reconstruct lifecycle history or mutate revisions directly.')

console.log('V7 need revision guard passed')
