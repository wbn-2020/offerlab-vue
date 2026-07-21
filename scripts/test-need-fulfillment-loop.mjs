import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const api = read('../src/api/collaboration.ts')
const claimantWorkspace = read('../src/components/collaboration/MyCollaborationsWorkspace.vue')
const managementWorkspace = read('../src/components/collaboration/CollaborationManagementWorkspace.vue')
const packageJson = read('../package.json')

assert.match(api, /NeedStatus = [^\n]*'SUBMITTED'/, 'need status types must include the pending acceptance state.')
for (const field of [
  'submittedByUid',
  'submittedAt',
  'submissionResolutionType',
  'submissionResolutionId',
  'submissionNote',
  'rejectReason',
]) {
  assert.match(api, new RegExp(`${field}\\?`), `CollaborationNeed must expose ${field}.`)
}
for (const action of ['submit', 'accept', 'reject', 'withdraw']) {
  assert.match(
    api,
    new RegExp(`${action}:\\s*\\([^)]*\\)[\\s\\S]*?requestResult<CollaborationNeed>`),
    `collaborationApi.needs.${action} must use requestResult.`,
  )
  assert.match(api, new RegExp(`/needs/\\$\\{resourceId\\(needId\\)\\}/${action}`), `${action} must call the matching need endpoint.`)
}

assert.match(claimantWorkspace, /need\.status === 'CLAIMED'[\s\S]*startSubmission\(need\)/, 'claimants must be able to open the submission form.')
assert.match(claimantWorkspace, /submissionResolutionType \|\| 'POST'/, 'returned submissions must prefill the previous target type.')
assert.match(claimantWorkspace, /submissionResolutionId[\s\S]*String\(need\.submissionResolutionId\)/, 'returned submissions must prefill the previous target id.')
assert.match(claimantWorkspace, /submissionNote \|\| ''/, 'returned submissions must prefill the previous note.')
assert.match(claimantWorkspace, /collaborationApi\.needs\.submit\(need\.id/, 'claimant submission must use the typed API.')
assert.match(claimantWorkspace, /need\.status === 'SUBMITTED'[\s\S]*withdrawNeed\(need\)/, 'pending submissions must expose claimant withdrawal.')
assert.match(claimantWorkspace, /collaborationApi\.needs\.withdraw\(need\.id\)/, 'withdrawal must use the typed API.')
assert.match(claimantWorkspace, /创建者已退回[\s\S]*need\.rejectReason/, 'returned submissions must show the rejection reason.')
assert.match(claimantWorkspace, /已提交，等待创建者验收/, 'submitted needs must communicate the acceptance state.')

assert.match(managementWorkspace, /data-need-acceptance-queue/, 'management must expose a stable pending acceptance queue.')
assert.match(managementWorkspace, /submittedNeeds[\s\S]*item\.status === 'SUBMITTED'/, 'the review queue must only contain submitted needs.')
assert.match(managementWorkspace, /collaborationApi\.needs\.accept\(needId\)/, 'creator acceptance must use the typed API.')
assert.match(managementWorkspace, /collaborationApi\.needs\.reject\(needId, \{ reason \}\)/, 'creator rejection must send a required reason.')
assert.match(managementWorkspace, /\['OPEN', 'CLAIMED'\]\.includes\(item\.status\)/, 'direct fulfillment must remain limited to the legacy states.')
assert.match(managementWorkspace, /\['OPEN', 'CLAIMED', 'SUBMITTED'\]\.includes\(item\.status\)/, 'closing must include submitted needs.')
assert.match(managementWorkspace, /window\.confirm\('该需求有认领者提交的产出待处理，确认关闭？'\)/, 'closing a submitted need must require explicit confirmation.')

assert.match(packageJson, /"test:need-fulfillment-loop":\s*"node scripts\/test-need-fulfillment-loop\.mjs"/, 'package scripts must expose the fulfillment-loop guard.')
assert.match(packageJson, /"test:stage-release-guards":\s*"[^"]*npm run test:need-fulfillment-loop/, 'the fulfillment-loop guard must run through test:guards.')

console.log('need fulfillment loop guard passed')
