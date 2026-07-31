import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const packageJson = JSON.parse(read('package.json'))
const opsGuard = read('src/utils/opsOrchestrationGuard.ts')
const recommendationGovernance = read('src/utils/recommendationGovernance.ts')
const demoSeeds = read('src/data/demoSeeds.ts')
const router = read('src/router/index.ts')
const routerGuards = read('src/router/guards.ts')
const operationsApi = read('src/api/operations.ts')
const operationSlotCard = read('src/components/operations/OperationSlotCard.vue')
const appHeader = read('src/components/layout/AppHeader.vue')
const adminOperationsView = read('src/views/AdminOperationsView.vue')
const homeView = read('src/views/HomeView.vue')

const forbiddenCopy = [
  '限时购买',
  '会员专享',
  '官方背书',
  '平台担保',
  '赞助推荐',
  '付费置顶',
  '权威认证',
  '保证有效',
  '商业合作',
]
const forbiddenCapabilities = [
  '广告位',
  '赞助位',
  '付费置顶',
  '商业推荐',
  '会员权益',
  '收益分成',
]

assert.equal(
  existsSync(new URL('test-phase16-ops-orchestration-guards.mjs', import.meta.url)),
  true,
  'Phase 16 ops orchestration guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:phase16-ops-orchestration'],
  'node scripts/test-phase16-ops-orchestration-guards.mjs',
  'package.json must expose the Phase 16 ops orchestration guard.',
)
has(packageJson.scripts['test:guards'], /test:phase16-ops-orchestration/, 'Full guard suite must include Phase 16 ops orchestration guard.')

for (const exportName of [
  'canAccessOpsOrchestrationAdmin',
  'canMutateOpsOrchestration',
  'isOpsOrchestrationDisplayEligible',
  'filterOpsOrchestrationDisplayItems',
  'isBlockedByViewerFeedback',
  'isDemoFallbackMarkedExample',
  'isOpsOrchestrationCopyAllowed',
  'markOpsOrchestrationExample',
]) {
  has(opsGuard, new RegExp(`export const ${exportName}`), `opsOrchestrationGuard must export ${exportName}.`)
}

const accessGuardBody = opsGuard.slice(
  opsGuard.indexOf('export const canAccessOpsOrchestrationAdmin'),
  opsGuard.indexOf('export const canMutateOpsOrchestration'),
)
has(accessGuardBody, /Boolean\(permissions\?\.admin\)/, 'Ops orchestration admin entry must require an administrator.')
missing(accessGuardBody, /permissions\?\.ops|contentModerator|questionOperator/, 'Ops, moderator, and question-operator roles must not open the orchestration admin.')
has(opsGuard, /if \(!permissions\?\.ops\) return false/, 'Administrators without ops permission must not mutate orchestration state.')
has(opsGuard, /if \(!permissions\.opsOrchestration\) return true/, 'RBAC ops administrators can mutate until finer orchestration scopes are returned.')
for (const action of ['publish', 'offline', 'rollback']) {
  has(opsGuard, new RegExp(`action === '${action}'|opsOrchestration\\.${action}`), `Ops orchestration must explicitly guard ${action}.`)
}

has(opsGuard, /isPublicPostVisible/, 'Ops orchestration display must reuse shared public post visibility filtering.')
has(recommendationGovernance, /deleted|isDeleted|restricted|isRestricted|private|hidden|reviewing|pending_review|under_review|illegal|violation|confirmed_violation/i, 'Shared visibility guard must cover private, deleted, restricted, reviewing, and violation states.')
has(opsGuard, /isBlockedByViewerFeedback\(item, viewerSignals\)/, 'Ops orchestration display must not bypass user feedback suppression.')
for (const feedbackField of [
  'notInterestedPostIds',
  'hiddenPostIds',
  'blockedAuthorIds',
  'hiddenAuthorIds',
  'suppressedTopicIds',
  'negativeFeedbackKeys',
]) {
  has(opsGuard, new RegExp(feedbackField), `Viewer feedback signal ${feedbackField} must be honored by ops display filtering.`)
}

has(opsGuard, /isDemoFallbackMarkedExample\(item\)/, 'Demo and fallback entries must be checked before entering ops display.')
has(opsGuard, /exampleLabel[\s\S]*示例|示例[\s\S]*exampleLabel/, 'Demo and fallback entries must carry visible example labeling.')
has(demoSeeds, /source:\s*'local_demo_seed'[\s\S]*example:\s*true/, 'Demo posts must mark local demo data as examples.')
has(demoSeeds, /exampleLabel:/, 'Demo fallback pages must carry example labels.')

for (const forbidden of [...forbiddenCopy, ...forbiddenCapabilities]) {
  has(opsGuard, new RegExp(forbidden), `Ops orchestration guard must explicitly block forbidden copy or capability: ${forbidden}.`)
}
has(opsGuard, /forbiddenOpsCopyPattern[\s\S]*isOpsOrchestrationCopyAllowed/, 'Forbidden copy must be enforced through a shared pattern.')
has(opsGuard, /title[\s\S]*summary[\s\S]*recommendationReason[\s\S]*recommendationReasons/, 'Ops display filtering must scan visible recommendation copy before display.')

const publicOpsSurfaces = [
  ['src/router/index.ts', router],
  ['src/router/guards.ts', routerGuards],
  ['src/api/operations.ts', operationsApi],
  ['src/components/layout/AppHeader.vue', appHeader],
  ['src/components/operations/OperationSlotCard.vue', operationSlotCard],
  ['src/views/AdminOperationsView.vue', adminOperationsView],
  ['src/views/HomeView.vue', homeView],
]

for (const [name, source] of publicOpsSurfaces) {
  for (const forbidden of forbiddenCopy) {
    missing(source, new RegExp(forbidden), `${name} must not contain prohibited copy: ${forbidden}.`)
  }
  for (const forbidden of forbiddenCapabilities) {
    missing(source, new RegExp(forbidden), `${name} must not expose prohibited capability: ${forbidden}.`)
  }
}

has(router, /path:\s*'\/admin\/operations'[\s\S]*adminPermission:\s*'admin'/, 'Ops orchestration admin route must be admin-only.')
has(routerGuards, /hasAdminPermission\(permissions, adminPermission\)/, 'Router guard must enforce admin route metadata before entering admin pages.')
has(appHeader, /if \(value\.admin\) links\.push\(\{ to: '\/admin\/operations'/, 'Ops orchestration navigation must only be shown to administrators.')
missing(appHeader, /value\.ops \|\| value\.contentModerator \|\| value\.admin\) links\.push\(\{ to: '\/admin\/operations'/, 'Ops orchestration navigation must not be shown to scoped non-admin operators.')
has(homeView, /OperationSlotCard[\s\S]*slot-code="HOME_FEATURED"|slot-code="HOME_FEATURED"[\s\S]*OperationSlotCard/, 'Home must consume the public operations slot.')
has(operationsApi, /canMutateOpsOrchestration/, 'Operations lifecycle API must use the explicit orchestration mutation guard.')
has(operationsApi, /action !== 'preview'[\s\S]*canMutateOpsOrchestration\(permissions, action as OpsOrchestrationAction\)/, 'Publish, offline, and rollback must reject calls without explicit orchestration action permission.')
has(operationsApi, /BizException\(10403,\s*'operation orchestration permission required'\)/, 'Unauthorized orchestration mutations must fail closed with a permission error.')
missing(operationsApi, /return status === 403|error\.code === 10403 \|\| error\.code === 10404|error\.code === 10404 \|\| error\.code === 10403/, 'Operations admin APIs must not turn permission failures into fallback data.')
has(operationsApi, /filterOpsOrchestrationDisplayItems/, 'Operations API fallback candidates and slots must use the Phase 16 display filter.')
has(operationsApi, /markOpsOrchestrationExample/, 'Operations API fallback data must be explicitly marked as examples.')
has(operationsApi, /isOpsOrchestrationCopyAllowed/, 'Operations API must filter forbidden operation copy before public fallback display.')
has(operationsApi, /confirmationPhrase:\s*action === 'preview' \? undefined : 'CONFIRM'/, 'Critical lifecycle actions must pass the backend confirmation phrase.')
has(operationSlotCard, /isOpsOrchestrationCopyAllowed/, 'Public operation slot component must filter forbidden copy before rendering.')
missing(operationSlotCard, /示例\/fallback|fallback demo|demo\/fallback/i, 'V3 public operation slot empty state must not expose fallback/demo wording.')
has(adminOperationsView, /canAccessOpsOrchestrationAdmin/, 'Ops orchestration admin page must gate local actions by admin access.')
has(adminOperationsView, /canMutateOpsOrchestration\(opsPermissions\.value, action as OpsOrchestrationAction\)/, 'Ops orchestration admin page must block publish/offline/rollback before confirmation when action permission is absent.')
has(
  adminOperationsView,
  /operationsApi\.runLifecycleAction\(\s*resourceKind,\s*resourceId,\s*action,\s*note,\s*opsPermissions\.value,\s*expectedDraftRevision,\s*\)/,
  'Ops orchestration admin page must pass permissions and the expected draft revision into the lifecycle API guard.',
)

console.log('Phase 16 ops orchestration guards passed.')
