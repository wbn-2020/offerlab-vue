import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const vueRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const javaRoot = path.resolve(vueRoot, '..', 'offerlab-java')
const readVue = (relative) => fs.readFileSync(path.join(vueRoot, relative), 'utf8')
const readJava = (relative) => fs.readFileSync(path.join(javaRoot, relative), 'utf8')
const expect = (value, message) => assert.ok(value, message)

const readJavaSources = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const entryPath = path.join(directory, entry.name)
  if (entry.isDirectory()) return readJavaSources(entryPath)
  return entry.isFile() && entry.name.endsWith('.java')
    ? [{ path: entryPath, source: fs.readFileSync(entryPath, 'utf8') }]
    : []
})

const analyticsSourceRoot = path.join(
  javaRoot,
  'community-domain-analytics',
  'src',
  'main',
  'java',
)
const analyticsSources = readJavaSources(analyticsSourceRoot)
const analyticsText = analyticsSources.map(({ source }) => source).join('\n')
const v42TodoSources = analyticsSources.filter(({ source }) => (
  source.includes('ChannelQualityGovernanceTodo')
  || source.includes('t_channel_quality_governance_todo')
))

const packageJson = JSON.parse(readVue('package.json'))
const migration = readJava('db/migration/20260807_channel_quality_governance_todo.sql')
const controller = readJava(
  'community-domain-analytics/src/main/java/com/offerlab/community/analytics/controller/ChannelHealthController.java',
)
const reminderEvent = readJava(
  'community-domain-analytics/src/main/java/com/offerlab/community/analytics/api/GovernanceReminderRequestedEvent.java',
)
const eventTopicResolver = readJava(
  'community-infrastructure/src/main/java/com/offerlab/community/infra/mq/producer/EventTopicResolver.java',
)
const todosApi = readVue('src/api/channelQualityGovernanceTodos.ts')
const todosView = readVue('src/views/me/MyGovernanceTodosView.vue')
const router = readVue('src/router/index.ts')

const guardName = 'test:v42-channel-quality-governance-todos'
expect(
  packageJson.scripts[guardName] === 'node scripts/test-v42-channel-quality-governance-todos.mjs',
  'V42 governance todo guard must have a package script.',
)
expect(
  packageJson.scripts['pretest:guards'].includes(guardName),
  'V42 governance todo guard must run before the full guard suite.',
)

for (const tableName of [
  't_channel_quality_governance_todo',
  't_channel_quality_governance_todo_event',
  't_channel_quality_governance_reminder_intent',
  't_channel_quality_governance_reminder_attempt',
  't_channel_quality_governance_todo_checkpoint',
]) {
  expect(
    migration.includes(`CREATE TABLE ${tableName} (`),
    `V42 migration must create ${tableName}.`,
  )
}

for (const preferenceColumn of [
  'governance_reminder_notification',
  'governance_reminder_quiet_start_minute',
  'governance_reminder_quiet_end_minute',
  'governance_reminder_time_zone',
]) {
  expect(
    migration.includes(`'${preferenceColumn}'`),
    `V42 migration must add the ${preferenceColumn} preference column.`,
  )
}

expect(
  !analyticsText.includes('NotificationFacade'),
  'Analytics must not reference NotificationFacade; reminder delivery crosses the outbox event boundary.',
)

expect(
  v42TodoSources.length > 0,
  'V42 must provide an Analytics todo projection/persistence source.',
)
const v42TodoText = v42TodoSources.map(({ source }) => source).join('\n')
for (const policyKey of [
  'ACK_CASE_4H',
  'RECORD_PLAN_24H',
  'COMPLETE_RETROSPECTIVE_72H',
]) {
  expect(
    v42TodoText.includes(policyKey),
    `V42 todo projection must retain immutable SLA policy key ${policyKey}.`,
  )
}
expect(
  /static\s+final\s+[\w<>?, ]+\s+(ACK_CASE_4H|ACK_CASE_SLA|ACK_CASE_POLICY)/.test(v42TodoText),
  'V42 todo projection must define the acknowledgement SLA policy as an immutable constant.',
)
expect(
  /static\s+final\s+[\w<>?, ]+\s+(RECORD_PLAN_24H|RECORD_PLAN_SLA|RECORD_PLAN_POLICY)/.test(v42TodoText),
  'V42 todo projection must define the plan SLA policy as an immutable constant.',
)
expect(
  /static\s+final\s+[\w<>?, ]+\s+(COMPLETE_RETROSPECTIVE_72H|COMPLETE_RETROSPECTIVE_SLA|COMPLETE_RETROSPECTIVE_POLICY)/.test(v42TodoText),
  'V42 todo projection must define the retrospective SLA policy as an immutable constant.',
)
for (const token of [
  'responsibilityEpoch',
  'OWNER_ASSIGNED',
  'OWNER_ACKNOWLEDGED',
  'PLAN_RECORDED',
  'RETROSPECTIVE_OWNER_ASSIGNED',
  'RETROSPECTIVE_COMPLETED',
]) {
  expect(
    v42TodoText.includes(token),
    `V42 todo projection must map ${token}.`,
  )
}

expect(
  reminderEvent.includes('class GovernanceReminderRequestedEvent'),
  'V42 must define GovernanceReminderRequestedEvent.',
)
expect(
  reminderEvent.includes('private String scheduleVersion;'),
  'V42 reminder scheduleVersion must remain the V42 string contract rather than a numeric field.',
)
expect(
  analyticsText.includes('EventPublisher'),
  'V42 reminder projection must depend on EventPublisher for the outbox boundary.',
)
expect(
  analyticsText.includes('eventPublisher.publish('),
  'V42 reminder projection must publish its reminder request through EventPublisher.',
)
expect(
  analyticsText.includes('GovernanceReminderRequestedEvent'),
  'V42 reminder projection must publish GovernanceReminderRequestedEvent.',
)
for (const token of [
  'if ("GovernanceReminderRequestedEvent".equals(className))',
  '"community.governance-reminder.requested"',
  '"GOVERNANCE_REMINDER_REQUESTED"',
]) {
  expect(
    eventTopicResolver.includes(token),
    `EventTopicResolver must explicitly map GovernanceReminderRequestedEvent with ${token}.`,
  )
}

expect(
  controller.includes('@GetMapping("/me/governance-todos")'),
  'V42 must expose the personal governance todo GET endpoint.',
)
expect(
  controller.includes('@GetMapping("/governance-todos")'),
  'V42 must expose the governance queue GET endpoint.',
)
expect(
  !/@(?:Post|Put|Patch|Delete)Mapping\("\/?(?:[^"]*\/)?governance-todos(?:\/[^"]*)?"\)/.test(controller),
  'V42 must not expose manual governance todo write mappings.',
)

expect(
  todosApi.includes("const BASE_PATH = '/api/v1/community-health/me/governance-todos'"),
  'V42 Vue API must target only the personal governance todo endpoint.',
)
expect(
  todosApi.includes('client.get(BASE_PATH, {'),
  'V42 Vue API must read governance todos with GET.',
)
expect(
  !/\b(?:post|put|patch|delete)\s*\(/i.test(todosApi),
  'V42 Vue API must not issue governance todo write requests.',
)
expect(
  !todosApi.includes("'/api/v1/community-health/governance-todos'"),
  'V42 Vue API must not call the governance queue endpoint from the personal surface.',
)
expect(
  todosView.includes('channelQualityGovernanceTodosApi.mineForDisplay('),
  'V42 personal view must load governance todos through the tolerant personal display API.',
)
expect(
  todosApi.includes('mineForDisplay: async'),
  'V42 Vue API must expose a display-safe read that lets the view normalize compatible remote records.',
)
expect(
  todosApi.includes('requireReadableRemoteResult'),
  'V42 display reads must still reject failed or non-remote envelopes before tolerant record normalization.',
)
expect(
  todosView.includes('normalizeGovernancePage'),
  'V42 personal view must defensively normalize governance todo pages.',
)
expect(
  todosView.includes('normalizeGovernanceTodo'),
  'V42 personal view must defensively normalize governance todo records.',
)
expect(
  !todosView.includes('getErrorMessage'),
  'V42 personal view must not expose raw remote contract errors.',
)
expect(
  todosView.includes('治理待办暂时无法读取，请稍后重试。'),
  'V42 personal view must show a stable actionable read error.',
)
expect(
  !/quality-review-risk-cases|\/admin\/community-health\/risk-cases/.test(todosView),
  'V42 personal view must not create an unsafe risk-case deep link.',
)
expect(
  router.includes("path: '/me/governance-todos'"),
  'V42 Vue router must register /me/governance-todos.',
)
expect(
  !router.includes("path: '/admin/community-health/risk-cases/:caseId'"),
  'V42 must not register an unsupported risk-case deep-link route.',
)

console.log('V42 channel quality governance todos guard passed.')
