import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const packageJson = JSON.parse(read('package.json'))
const operationsApi = read('src/api/operations.ts')
const operationSlotCard = read('src/components/operations/OperationSlotCard.vue')
const adminOperationsView = read('src/views/AdminOperationsView.vue')
const homeView = read('src/views/HomeView.vue')

assert.equal(
  packageJson.scripts['test:v3-curation-guards'],
  'node scripts/test-v3-curation-guards.mjs',
  'package.json must expose the V3 curation guard.',
)

has(homeView, /slot-code="HOME_FEATURED"/, 'Home must keep HOME_FEATURED as the only P0 public operations slot.')

for (const field of ['source', 'degraded', 'fallbackReason']) {
  has(operationsApi, new RegExp(`${field}\\??:`), `OperationSlot must expose ${field}.`)
}
for (const field of ['contentId', 'contentType', 'reasonText', 'rank', 'source', 'blocked', 'blockReasons']) {
  has(operationsApi, new RegExp(`${field}\\??:`), `OperationSlotItem must expose ${field}.`)
}

has(operationsApi, /const HOME_FEATURED_SLOT_CODE = 'HOME_FEATURED'/, 'Operations API must centralize the HOME_FEATURED slot code.')
has(operationsApi, /const emptyPublicOperationSlot/, 'Public operation slot fallback must be an empty degraded slot.')
missing(
  operationsApi,
  /const emptyPublicOperationSlot[\s\S]*fallback:\s*true/,
  'Public HOME_FEATURED empty state must not mark itself as fallback/demo content.',
)
missing(
  operationsApi,
  /return publicFallbackSlot\(slotCode\)/,
  'HOME_FEATURED public read must not return fallback items when the backend is unavailable.',
)
missing(
  operationsApi,
  /getPublicOperationSlot[\s\S]*postApi\.listTopics\(\{ featured: true[\s\S]*postApi\.list\(\{ featured: true/,
  'HOME_FEATURED public read must not assemble local/public-content fallback items.',
)

has(operationSlotCard, /isRenderableSlot/, 'OperationSlotCard must gate rendering through isRenderableSlot.')
has(operationSlotCard, /visibleItems/, 'OperationSlotCard must render only visible V3 curation items.')
has(
  operationSlotCard,
  /slot\.value\?\.source === 'remote'[\s\S]*slot\.value\?\.status === 'PUBLISHED'[\s\S]*!slot\.value\?\.degraded/,
  'OperationSlotCard must render only remote published non-degraded HOME_FEATURED slots.',
)
missing(
  operationSlotCard,
  /v-else-if="items\.length"/,
  'OperationSlotCard must not render arbitrary fallback items.',
)
missing(
  operationSlotCard,
  /示例\/fallback|fallback demo|demo\/fallback/i,
  'Public OperationSlotCard must not expose fallback/demo wording.',
)

for (const functionName of [
  'addSlotItemToHomeFeatured',
  'removeSlotItemFromHomeFeatured',
  'updateHomeFeaturedItemReason',
  'moveHomeFeaturedItem',
  'publishHomeFeaturedSlot',
  'offlineHomeFeaturedSlot',
  'rollbackHomeFeaturedSlot',
]) {
  has(adminOperationsView, new RegExp(functionName), `AdminOperationsView must expose ${functionName}.`)
}
has(
  adminOperationsView,
  /const canAddCandidateToHomeFeatured[\s\S]*slots\.value\.available[\s\S]*!slots\.value\.degraded[\s\S]*homeFeaturedSlot\.value\?\.source === 'remote'/,
  'Admin candidate add action must require a remote non-degraded HOME_FEATURED slot.',
)

missing(
  adminOperationsView,
  /前台展示约束[\s\S]{0,500}示例\/fallback/i,
  'Admin HOME_FEATURED display constraints must describe degraded empty state, not public fallback/demo display.',
)

for (const forbidden of [
  'privateGoal',
  'resumeMatch',
  'interviewPlan',
  'applicationTask',
  'mockInterview',
  '私人训练',
  '训练计划',
  '模拟面试',
  '投递任务',
  '简历匹配',
  'JD 分析',
]) {
  missing(`${operationsApi}\n${operationSlotCard}\n${adminOperationsView}\n${homeView}`, new RegExp(forbidden, 'i'), `V3 HOME_FEATURED path must not contain private training term: ${forbidden}`)
}

console.log('V3 curation guards passed.')
