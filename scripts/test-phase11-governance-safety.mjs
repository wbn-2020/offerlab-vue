import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const packageJson = JSON.parse(read('package.json'))
const adminGovernance = read('src/views/AdminGovernanceView.vue')
const riskConfirmDialog = read('src/components/admin/RiskConfirmDialog.vue')
const adminPermissions = read('src/utils/adminPermissions.ts')
const recommendationGovernance = read('src/utils/recommendationGovernance.ts')
const governanceDisplay = read('src/utils/governanceDisplay.ts')
const publicSurfaces = new Map([
  ['PostDetailView.vue', read('src/views/PostDetailView.vue')],
  ['PostCard.vue', read('src/components/post/PostCard.vue')],
  ['HomeView.vue', read('src/views/HomeView.vue')],
  ['ExploreView.vue', read('src/views/ExploreView.vue')],
  ['SearchView.vue', read('src/views/SearchView.vue')],
  ['UserProfileView.vue', read('src/views/UserProfileView.vue')],
  ['CollectionDetailView.vue', read('src/views/CollectionDetailView.vue')],
  ['NotificationsView.vue', read('src/views/NotificationsView.vue')],
  ['TopicDetailView.vue', read('src/views/TopicDetailView.vue')],
  ['TagDetailView.vue', read('src/views/TagDetailView.vue')],
])
const phase11Surfaces = [
  adminGovernance,
  riskConfirmDialog,
  adminPermissions,
  recommendationGovernance,
  governanceDisplay,
  ...publicSurfaces.values(),
].join('\n')

assert.equal(
  existsSync(new URL('test-phase11-governance-safety.mjs', import.meta.url)),
  true,
  'Phase 11 governance safety guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:phase11-governance-safety'],
  'node scripts/test-phase11-governance-safety.mjs',
  'package.json must expose the Phase 11 governance safety guard.',
)
assert.equal(
  packageJson.scripts['test:phase11-governance'],
  'npm run test:phase11-user-reporting-guards && npm run test:phase11-admin-governance-guards && npm run test:phase11-governance-filter-guards && npm run test:phase11-governance-safety',
  'package.json must expose one aggregate Phase 11 governance guard.',
)
has(packageJson.scripts['test:stage-release-guards'], /test:phase11-governance/, 'Stage release guards must include the aggregate Phase 11 guard.')
has(packageJson.scripts['test:guards'], /test:phase11-governance/, 'Full guard suite must include the aggregate Phase 11 guard.')

has(adminGovernance, /const canOps = computed\(\(\) => Boolean\(permissions\.value\?\.ops \|\| permissions\.value\?\.admin\)\)/, 'Ops-only governance data must be gated by ops/admin permission.')
has(adminGovernance, /const canGlobalModerate = computed\(\(\) => Boolean\(permissions\.value\?\.contentModerator \|\| permissions\.value\?\.admin\)\)/, 'Global moderation must be gated by content moderator/admin permission.')
has(adminGovernance, /const canModerate = computed\(\(\) => canGlobalModerate\.value \|\| canDomainModerate\.value\)/, 'Domain moderators must get only moderated-domain governance access.')
has(adminGovernance, /\{ label: [^}]*value: 'audit', scope: 'ops' \}/, 'Audit tab must be visible only to ops-capable users.')
has(adminGovernance, /visibleTabs[\s\S]*tab\.scope === 'ops'[\s\S]*canOps\.value/, 'Visible tabs must enforce ops scope before audit rendering.')
has(adminGovernance, /loadAuditLogs[\s\S]*if \(!canOps\.value\) return/, 'Audit log loading must be guarded by ops permission.')
has(adminGovernance, /opsApi\.pageAuditLogs|opsApi\.listAuditLogs/, 'Audit logs must come through ops API, not ordinary public APIs.')
has(adminGovernance, /reviewQueueLoadWarnings/, 'Governance center must render degraded review-queue warnings.')
has(adminGovernance, /reviewQueueSource = ref<'backend' \| 'frontend-fallback'>\('frontend-fallback'\)/, 'Review queue must explicitly track backend versus fallback preview source.')
has(adminGovernance, /canQueueAction[\s\S]*reviewQueueSource\.value === 'backend'/, 'Fallback review queue items must not expose executable moderation actions.')
has(adminGovernance, /requireRiskConfirm/, 'High-risk admin governance operations must go through the confirmation dialog.')
has(adminGovernance, /RiskConfirmDialog/, 'Governance center must mount the shared risk confirmation dialog.')

has(riskConfirmDialog, /confirmationPhrase/, 'Risk confirmation dialog must require an explicit confirmation phrase.')
has(riskConfirmDialog, /CONFIRM/, 'Risk confirmation dialog must expose a stable confirmation phrase.')
has(riskConfirmDialog, /requiresNote/, 'Risk confirmation dialog must support required audit notes.')
has(riskConfirmDialog, /@media \(max-width: 640px\)/, 'Risk confirmation dialog must have mobile layout safeguards.')

has(adminPermissions, /hasAdminPermission/, 'Frontend admin operations must use the shared admin permission guard.')
has(adminPermissions, /isPermissionDeniedError/, 'Frontend admin operations must recognize permission-denied responses.')
has(adminPermissions, /403|10403/, 'Permission denied responses must invalidate stale admin permission assumptions.')

for (const [name, source] of publicSurfaces) {
  missing(source, /(?<![A-Za-z0-9_])(reporterUid|reviewerUid|reviewNote|auditLogs|auditRemark|internalRule|riskScore|realAuthor|originalAuthor|blockedUsers|blockedBy|mutedBy)(?![A-Za-z0-9_])/i, `${name} must not expose reporter, reviewer, audit, block relation, or real-author internals.`)
}

has(recommendationGovernance, /isPublicPostVisible/, 'Shared recommendation governance must decide public post visibility.')
has(recommendationGovernance, /filterVisiblePosts/, 'Public recommendation surfaces must reuse a shared post filter.')
has(recommendationGovernance, /deleted|restricted|private|hidden|reviewing|pending_review|confirmed_violation|illegal|rejected/i, 'Shared recommendation filter must cover unavailable, private, reviewing, and confirmed-violation states.')
has(recommendationGovernance, /isStrongExposurePostVisible[\s\S]*high|high[\s\S]*isStrongExposurePostVisible/i, 'Strong exposure recommendation surfaces must filter untreated high-risk content.')

for (const [name, source] of publicSurfaces) {
  if (/(HomeView|ExploreView|SearchView|UserProfileView|CollectionDetailView|TopicDetailView|TagDetailView)\.vue/.test(name)) {
    has(source, /filterVisiblePosts|filterStrongExposurePosts|filterVisibleCollections/, `${name} must use shared governance filtering before public exposure.`)
  }
}

has(governanceDisplay, /mapReportErrorToFeedback/, 'Report failure states must be mapped through shared user-facing feedback.')
has(governanceDisplay, /getUnavailableContentCopy/, 'Unavailable content state must be centralized for public surfaces.')
has(governanceDisplay, /normalizeRiskNoticeForUsers/, 'Public high-risk hints must be normalized through a shared helper.')
missing(governanceDisplay, /reporterUid|reviewerUid|reviewNote|internalRule|riskScore|realAuthor|originalAuthor/i, 'User-facing governance display helpers must not mention internal identities or scoring.')

missing(
  phase11Surfaces,
  /payment risk|revenue penalty|ad review|expert endorsement|CodeCoachAI private training|paywall|withdrawal|settlement|monetization governance|广告审核|支付风控|收益处罚|提现|结算|付费专栏|专家背书|私人训练治理/i,
  'Phase 11 governance surfaces must stay non-payment, non-commercial, and non-endorsement focused.',
)

console.log('Phase 11 governance permission, privacy, non-commercial, and mobile safety guards passed.')
