import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const packageJson = JSON.parse(read('package.json'))
const adminGovernance = read('src/views/AdminGovernanceView.vue')
const opsView = read('src/views/OpsView.vue')
const opsApi = read('src/api/ops.ts')
const adminPermissions = read('src/utils/adminPermissions.ts')

assert.equal(
  existsSync(new URL('test-phase11-admin-governance-guards.mjs', import.meta.url)),
  true,
  'Phase 11 admin governance guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:phase11-admin-governance-guards'],
  'node scripts/test-phase11-admin-governance-guards.mjs',
  'package.json must expose the Phase 11 admin governance guard.',
)
has(packageJson.scripts['test:guards'], /test:phase11-admin-governance-guards/, 'Full guard suite must include Phase 11 admin governance guards.')

for (const label of ['待处理举报', '审核队列', '敏感词命中', '高风险']) {
  has(adminGovernance, new RegExp(label), `Governance center must clearly surface ${label}.`)
}

for (const field of ['sourceType', 'riskLevel', 'queueStatus', 'domain', 'createTime']) {
  has(opsApi, new RegExp(field), `Review queue API DTO must preserve ${field}.`)
}

for (const filterName of ['sourceType', 'riskLevel', 'queueStatus', 'domain', 'startDate', 'endDate']) {
  has(adminGovernance, new RegExp(`queueFilters[\\s\\S]*${filterName}|${filterName}[\\s\\S]*queueFilters`), `Admin queue must support or display ${filterName} filtering.`)
}

has(adminGovernance, /后端统一审核队列暂不可用[\s\S]*前端聚合预览|前端聚合预览[\s\S]*后端统一审核队列暂不可用/, 'Unavailable backend review queue must show a stable degraded preview warning.')
has(adminGovernance, /不在这里承诺直接下架或隐藏/, 'Unified queue copy must not promise actions that backend queue cannot really execute.')
has(adminGovernance, /requireRiskConfirm[\s\S]*审核队列项/, 'Review queue high-risk actions must use the risk confirmation dialog.')
has(adminGovernance, /canQueueAction[\s\S]*backendItem[\s\S]*reviewQueueSource[\s\S]*backend/s, 'Review queue actions must be disabled for frontend fallback preview items.')

has(adminPermissions, /canAccessAdminCapability/, 'Admin permissions utility must expose a single guard for backend capabilities.')
has(adminPermissions, /contentModerator|domainModerator|ops|admin/, 'Admin permission guard must cover governance and ops roles.')

has(opsView, /统一审核队列暂不可用|治理中心.*审核队列|审核队列.*治理中心/s, 'Ops review pane must point moderators to the governance queue and degraded state.')
has(opsView, /v-if="canOps"|v-if="canModerate"|v-if="canAdmin"/, 'Ops backend abilities must remain permission gated.')

for (const [name, source] of [
  ['AdminGovernanceView.vue', adminGovernance],
  ['OpsView.vue', opsView],
]) {
  missing(source, /普通用户.*后台|公开.*审核人|公开.*举报人|一定下架|一定隐藏/, `${name} must not expose internal moderation details or over-promise outcomes.`)
  missing(source, /收益处置|广告审核|支付风控|提现|付费专栏/, `${name} must not drift into monetization or ad-risk governance.`)
}

console.log('Phase 11 admin governance guards passed.')
