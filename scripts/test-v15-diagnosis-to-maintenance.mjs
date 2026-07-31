import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const typescript = require('typescript')
const scriptDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptDir, '..')

const read = (relativePath) => readFile(resolve(root, relativePath), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const includes = (text, fragment, label) => {
  assert(text.includes(fragment), `${label} must contain ${fragment}`)
}
const excludes = (text, fragment, label) => {
  assert(!text.includes(fragment), `${label} must not contain ${fragment}`)
}

const [api, component, navigation, maintenanceView, healthView, packageJson] = await Promise.all([
  read('src/api/projectionHealth.ts'),
  read('src/components/health/ProjectionHealthTable.vue'),
  read('src/utils/maintenanceNavigation.ts'),
  read('src/views/AdminMaintenanceTasksView.vue'),
  read('src/views/AdminChannelHealthView.vue'),
  read('package.json'),
])
const pkg = JSON.parse(packageJson)

includes(api, 'relatedPostId?: ApiId | null', 'projection issue API type')
includes(api, 'domain?: number | null', 'projection issue API type')

includes(component, 'buildMaintenanceTaskFromIssueTarget', 'projection issue navigation')
includes(component, 'canCreateMaintenanceFromProjectionIssue', 'projection issue action scope')
includes(component, 'router.push(', 'projection issue navigation')
excludes(component, 'contentMaintenanceApi.create', 'diagnostic issue component')
includes(component, 'Wrench', 'projection issue action affordance')
includes(component, 'canCreateMaintenanceGlobally', 'maintenance permission scope')
includes(component, 'moderatedDomains: props.moderatedDomains', 'maintenance domain scope')
includes(component, ':aria-label="`将诊断问题', 'maintenance action accessibility')

includes(navigation, "path: '/admin/content-maintenance'", 'maintenance navigation target')
includes(navigation, 'DIAGNOSIS_SOURCE_TYPE_BY_ISSUE_TYPE', 'issue type mapping')
includes(navigation, 'Object.freeze', 'issue type mapping')
includes(navigation, 'Object.prototype.hasOwnProperty.call', 'prototype-safe issue mapping')
for (const mapping of [
  "CONTENT_SUGGESTION_PENDING: 'SUGGESTION'",
  "POST_FRESHNESS_POSSIBLY_STALE: 'FRESHNESS'",
  "POST_FRESHNESS_AWAITING_CONFIRMATION: 'FRESHNESS'",
  "POST_REFERENCE_BROKEN: 'MANUAL'",
  "KNOWLEDGE_RELATION_PENDING: 'MANUAL'",
  "KNOWLEDGE_RELATION_TARGET_NOT_PUBLIC: 'MANUAL'",
  "POST_OUTCOME_REVISIT_DUE: 'MANUAL'",
]) {
  includes(navigation, mapping, 'issue type mapping')
}
includes(navigation, 'sourceTypeFor(issueType)', 'issue type mapping')
includes(navigation, 'normalizePositiveLongId(issue.relatedPostId)', 'related post validation')
includes(navigation, 'normalizePositiveLongId(issue.issueId)', 'source reference validation')
includes(navigation, 'MAX_SIGNED_LONG', 'signed 64-bit ID validation')
includes(navigation, 'if (domain != null && relatedPostId)', 'domain-bound related post validation')
includes(navigation, 'canCreateMaintenanceFromProjectionIssue', 'executable maintenance permission scope')
includes(navigation, 'normalizeMaintenanceTaskPrefill', 'executable maintenance prefill')
includes(navigation, 'buildMaintenanceCreateCommand', 'executable maintenance payload')
includes(navigation, 'query:', 'maintenance navigation target')

includes(maintenanceView, '请选择领域', 'maintenance form domain state')
includes(maintenanceView, 'normalizeMaintenanceTaskPrefill(route.query', 'maintenance query validation')
includes(maintenanceView, 'buildMaintenanceCreateCommand(form)', 'maintenance create validation')
includes(maintenanceView, 'contentMaintenanceApi.create(command)', 'maintenance normalized payload')
includes(maintenanceView, '() => form.domain', 'maintenance domain binding')
includes(maintenanceView, "form.sourcePostId = ''", 'maintenance source post reset')
includes(maintenanceView, 'for="maintenance-domain"', 'maintenance form labels')
excludes(maintenanceView, 'const form = reactive({ domain: 1,', 'maintenance form default')

includes(healthView, ':can-create-maintenance-globally="canCreateMaintenanceGlobally"', 'maintenance permission propagation')
includes(healthView, 'const canCreateMaintenanceGlobally = computed', 'maintenance permission calculation')
includes(healthView, 'const moderatedMaintenanceDomains = computed', 'maintenance domain scope calculation')

const transpiled = typescript.transpileModule(navigation, {
  compilerOptions: {
    module: typescript.ModuleKind.ESNext,
    target: typescript.ScriptTarget.ES2022,
  },
}).outputText
const navigationModule = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`,
)
const issue = (overrides = {}) => ({
  issueId: '123',
  projectionType: 'KNOWLEDGE_LIFECYCLE',
  issueType: 'CONTENT_SUGGESTION_PENDING',
  severity: 'MEDIUM',
  subjectType: 'CONTENT_SUGGESTION',
  subjectId: '123',
  summary: 'summary',
  detectedAt: '2026-07-23T20:00:00',
  relatedPostId: '456',
  domain: 2,
  ...overrides,
})

for (const [issueType, sourceType] of [
  ['CONTENT_SUGGESTION_PENDING', 'SUGGESTION'],
  ['POST_FRESHNESS_POSSIBLY_STALE', 'FRESHNESS'],
  ['POST_FRESHNESS_AWAITING_CONFIRMATION', 'FRESHNESS'],
  ['POST_REFERENCE_BROKEN', 'MANUAL'],
  ['KNOWLEDGE_RELATION_PENDING', 'MANUAL'],
  ['KNOWLEDGE_RELATION_TARGET_NOT_PUBLIC', 'MANUAL'],
  ['POST_OUTCOME_REVISIT_DUE', 'MANUAL'],
]) {
  const target = navigationModule.buildMaintenanceTaskFromIssueTarget(issue({ issueType }))
  assert(target.query.sourceType === sourceType, `${issueType} must map to ${sourceType}`)
}
for (const issueType of ['constructor', 'toString', '__proto__', 'unknown']) {
  const target = navigationModule.buildMaintenanceTaskFromIssueTarget(issue({ issueType }))
  assert(target.query.sourceType === 'MANUAL', `${issueType} must safely fall back to MANUAL`)
  assert(target.query.title === '处理知识生命周期诊断问题', `${issueType} must use the fallback title`)
}
const noDomainTarget = navigationModule.buildMaintenanceTaskFromIssueTarget(
  issue({ domain: null, relatedPostId: '456' }),
)
assert(!('domain' in noDomainTarget.query), 'missing domain must not enter the deep link')
assert(!('sourcePostId' in noDomainTarget.query), 'source post must require a valid domain')
const validLongTarget = navigationModule.buildMaintenanceTaskFromIssueTarget(
  issue({ issueId: '9223372036854775807', relatedPostId: '9223372036854775807' }),
)
assert(validLongTarget.query.sourceRefId === '9223372036854775807', 'Long.MAX_VALUE must be accepted')
assert(validLongTarget.query.sourcePostId === '9223372036854775807', 'valid host IDs must be preserved')
const oversizedTarget = navigationModule.buildMaintenanceTaskFromIssueTarget(
  issue({ issueId: '9223372036854775808', relatedPostId: '9223372036854775808' }),
)
assert(!('sourceRefId' in oversizedTarget.query), 'overflowing source IDs must be omitted')
assert(!('sourcePostId' in oversizedTarget.query), 'overflowing host IDs must be omitted')
assert(!('assigneeUid' in validLongTarget.query), 'navigation must never prefill assigneeUid')

assert(navigationModule.canCreateMaintenanceFromProjectionIssue(
  issue(),
  { canCreateGlobally: true, moderatedDomains: [] },
), 'global moderators must see the action')
assert(navigationModule.canCreateMaintenanceFromProjectionIssue(
  issue({ domain: 2 }),
  { canCreateGlobally: false, moderatedDomains: [2] },
), 'domain moderators must see in-scope actions')
assert(!navigationModule.canCreateMaintenanceFromProjectionIssue(
  issue({ domain: 2 }),
  { canCreateGlobally: false, moderatedDomains: [3] },
), 'domain moderators must not see out-of-scope actions')
assert(!navigationModule.canCreateMaintenanceFromProjectionIssue(
  issue({ domain: 2 }),
  { canCreateGlobally: false, moderatedDomains: [] },
), 'pure OPS users must not see the action')
assert(!navigationModule.canCreateMaintenanceFromProjectionIssue(
  issue({ projectionType: 'OUTBOX_DELIVERY' }),
  { canCreateGlobally: true, moderatedDomains: [2] },
), 'non-knowledge projections must not expose the action')

const validPrefill = navigationModule.normalizeMaintenanceTaskPrefill({
  domain: '2',
  sourceType: 'SUGGESTION',
  sourcePostId: '456',
  sourceRefId: '123',
  title: '  修复   内容  ',
  detail: ' 第一行  \r\n\r\n\r\n 第二行 ',
})
assert(validPrefill.domain === 2, 'valid domains must be prefilled')
assert(validPrefill.sourcePostId === '456', 'source posts must be preserved with a valid domain')
assert(validPrefill.sourceRefId === '123', 'valid source references must be prefilled')
assert(validPrefill.title === '修复 内容', 'prefill titles must normalize whitespace')
assert(validPrefill.detail === '第一行\n\n第二行', 'prefill details must normalize whitespace')
const invalidDomainPrefill = navigationModule.normalizeMaintenanceTaskPrefill({
  domain: '9',
  sourcePostId: '456',
  sourceRefId: '123',
})
assert(invalidDomainPrefill.domain === '', 'invalid domains must remain unselected')
assert(invalidDomainPrefill.sourcePostId === '', 'source posts must be cleared without a valid domain')
assert(invalidDomainPrefill.sourceRefId === '123', 'source references do not depend on domain')

const validCommand = navigationModule.buildMaintenanceCreateCommand({
  domain: 2,
  sourceType: 'SUGGESTION',
  assigneeUid: '789',
  sourcePostId: '456',
  sourceRefId: '123',
  title: '  修复   内容  ',
  detail: ' 第一行  \r\n\r\n\r\n 第二行 ',
})
assert(validCommand?.domain === 2, 'valid commands must preserve domain')
assert(validCommand?.assigneeUid === '789', 'valid commands must preserve assignee')
assert(validCommand?.sourcePostId === '456', 'valid commands must preserve source post')
assert(validCommand?.sourceRefId === '123', 'valid commands must preserve source reference')
assert(validCommand?.title === '修复 内容', 'create payload titles must be normalized')
assert(validCommand?.detail === '第一行\n\n第二行', 'create payload details must be normalized')
assert(navigationModule.buildMaintenanceCreateCommand({
  domain: 2,
  sourceType: 'SUGGESTION',
  assigneeUid: '789',
  sourcePostId: '9223372036854775808',
  sourceRefId: '',
  title: '有效标题',
  detail: '有效任务说明',
}) === null, 'overflowing optional IDs must block submission instead of being dropped')

assert(
  pkg.scripts?.['test:v15'] === 'node scripts/test-v15-diagnosis-to-maintenance.mjs',
  'package.json must expose test:v15',
)
includes(pkg.scripts?.['pretest:guards'] || '', 'npm run test:v15', 'pretest:guards')
includes(pkg.scripts?.verify || '', 'npm run test:guards', 'verify')

console.log('V15 diagnosis-to-maintenance guard passed')
