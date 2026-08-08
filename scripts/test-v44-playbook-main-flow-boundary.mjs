import fs from 'node:fs'
import path from 'node:path'

const repo = path.resolve(import.meta.dirname, '..', '..')
const javaRoot = path.join(repo, 'offerlab-java', 'community-domain-analytics', 'src', 'main', 'java', 'com', 'offerlab', 'community', 'analytics')
const vueRoot = path.join(repo, 'offerlab-vue', 'src')
const files = [
  path.join(javaRoot, 'application', 'ChannelQualityGovernancePlaybookService.java'),
  path.join(javaRoot, 'application', 'ChannelQualityPlaybookCloseCheckContributor.java'),
  path.join(javaRoot, 'controller', 'ChannelQualityGovernancePlaybookController.java'),
  path.join(javaRoot, 'api', 'dto', 'ChannelQualityGovernancePlaybookCommands.java'),
  path.join(javaRoot, 'infrastructure', 'persistence', 'ChannelQualityGovernancePlaybookMapper.java'),
  path.join(javaRoot, 'api', 'ChannelQualityGovernancePlaybookInputQueryFacade.java'),
  path.join(javaRoot, 'api', 'ChannelQualityRiskCasePlaybookInputQueryFacade.java'),
  path.join(vueRoot, 'api', 'channelQualityGovernancePlaybooks.ts'),
  path.join(vueRoot, 'views', 'admin', 'ChannelQualityGovernancePlaybooksView.vue'),
]
const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n')
for (const required of [
  'ChannelQualityRiskGovernanceSnapshotQueryFacade',
  'V44_PLAYBOOK_INPUT_V1',
  'V44_CASE_PLAYBOOK_INPUT_V1',
  'requireWritable',
  'recordRequired',
  'idempotencyKey',
  'expectedGovernanceSnapshotEtag',
  'ChannelQualityRiskCaseCloseCheckProvider',
]) {
  if (!source.includes(required)) throw new Error(`missing V44 invariant: ${required}`)
}
for (const forbidden of [
  'closeCaseWithSnapshot',
  'ContentMaintenanceTaskCommandFacade',
  'extendDeadline(',
  'reassignActiveTasks(',
  'withdrawOpenTasks(',
  'addRiskNote(',
  'ChannelQualityGovernanceAutomationCommandFacade',
  't_channel_quality_review_risk_case ',
  't_channel_quality_review_risk_case_governance',
]) {
  if (source.includes(forbidden)) throw new Error(`forbidden V44 boundary dependency: ${forbidden}`)
}
console.log('V44 playbook main-flow boundary: PASS')
