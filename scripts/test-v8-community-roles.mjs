import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const api = read('src/api/communityRoles.ts')
const workspace = read('src/components/incentive/CommunityRoleWorkspace.vue')
const evidence = read('src/components/incentive/RoleEligibilityPanel.vue')
const candidates = read('src/components/incentive/MaintenanceTaskCandidateList.vue')
const reviewContext = read('src/components/incentive/AdminRoleReviewContext.vue')
const growthView = read('src/views/CommunityGrowthView.vue')
const adminGrowthView = read('src/views/AdminCommunityGrowthView.vue')

has(api, /\/api\/v1\/incentives\/me/, 'community role API must use the authenticated incentive endpoint')
has(api, /roles\/workspace/, 'community role API must expose the V8 workspace endpoint')
has(api, /roles\/\$\{pathSegment\(roleCode\)\}\/evidence/, 'role evidence path must encode the role code')
has(api, /\/api\/v1\/content-maintenance\/tasks/, 'maintenance candidates must use the current controller base path')
has(api, /\/candidates/, 'community role API must expose maintenance candidates')
has(api, /roles\/review-context\/\$\{pathSegment\(applicationId\)\}/, 'admin review context must use the current endpoint')
has(api, /params:\s*\{\s*reason\s*\}/, 'review context reads must carry an auditable reason')
has(api, /requestResult/, 'community role calls must preserve the Result contract')

for (const field of ['canApply', 'canUseMaintenanceWorkspace', 'availableActions', 'canClaim']) {
  has(api, new RegExp(`${field}:\\s*boolean|${field}:\\s*string\\[\\]`), `community role DTO must preserve server ${field}`)
}

has(workspace, /communityRolesApi\.workspace/, 'community role workspace must load the server workspace')
has(workspace, /communityRolesApi\.evidence/, 'role selection must refresh server evidence')
has(workspace, /selectedEvidence\?\.canUseMaintenanceWorkspace/, 'maintenance candidates must be displayed from the server capability flag')
has(workspace, /RoleEligibilityPanel/, 'community role workspace must use the focused evidence panel')
has(workspace, /MaintenanceTaskCandidateList/, 'community role workspace must expose server-filtered maintenance candidates')
missing(workspace, /useAuthStore|roleCode\s*===\s*['"]ADMIN/, 'community role workspace must not derive authority from the client account')

has(evidence, /evidence\.canApply/, 'eligibility panel must display the server canApply decision')
has(evidence, /evidence\.canUseMaintenanceWorkspace/, 'eligibility panel must display the server maintenance decision')
has(evidence, /availableActions/, 'eligibility panel must display server-provided actions')

has(candidates, /communityRolesApi\.maintenanceCandidates/, 'maintenance candidates must come from the dedicated server read side')
has(candidates, /item\.canClaim/, 'candidate claimability must be displayed from the server')
has(candidates, /let requestGeneration = 0/, 'maintenance candidates must track request generations')
has(candidates, /const generation = append \? requestGeneration : \+\+requestGeneration/, 'new candidate loads must advance the request generation')
has(candidates, /generation !== requestGeneration/, 'stale candidate responses must be ignored')
has(candidates, /const query = \{/, 'candidate requests must capture an immutable query snapshot')
has(candidates, /items\.value = \[\]/, 'new candidate loads must clear the previous result set')
missing(candidates, /filterSnapshot !== JSON\.stringify/, 'candidate freshness must not compare against mutable draft filters')
missing(candidates, /contentMaintenanceApi\.claim|\.post\(/, 'candidate rows must not invent a write action that the candidate DTO cannot execute')

has(reviewContext, /communityRolesApi\.reviewContext/, 'admin role review context must use the audited read endpoint')
has(reviewContext, /reason\.value\.trim\(\)\.length/, 'review context must require an explicit reason')
has(reviewContext, /canInspect/, 'review context must expose its permission state')
has(reviewContext, /RoleEligibilityPanel/, 'admin review context must show the server evidence snapshot')

has(growthView, /<CommunityRoleWorkspace/, 'community growth view must mount the V8 role workspace')
has(adminGrowthView, /<AdminRoleReviewContext/, 'admin community growth view must mount the review context')
has(adminGrowthView, /:can-inspect="canWrite"/, 'admin review context must inherit the existing admin permission state')

console.log('V8 community roles guard passed.')
