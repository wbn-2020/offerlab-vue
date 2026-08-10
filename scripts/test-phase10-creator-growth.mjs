import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const hasText = (source, text, message) => assert.ok(source.includes(text), message)
const missingText = (source, text, message) => assert.ok(!source.includes(text), message)
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)
const section = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end))

const packageJson = JSON.parse(read('package.json'))
const apiTypes = read('src/api/types.ts')
const creatorFeedbackApi = read('src/api/creatorFeedback.ts')
const creatorSignals = read('src/utils/creatorSignals.ts')
const demoSeeds = read('src/data/demoSeeds.ts')
const phase10DemoSeeds = section(demoSeeds, 'export const demoCreatorFeedbackSummary', 'export const demoProfileContribution')
const meProfile = read('src/views/MeProfileView.vue')
const userProfile = read('src/views/UserProfileView.vue')
const growthProfile = read('src/views/GrowthProfileView.vue')
const growthReport = read('src/views/GrowthReportView.vue')
const notifications = read('src/views/NotificationsView.vue')
const explore = read('src/views/ExploreView.vue')
const home = read('src/views/HomeView.vue')

assert.equal(
  existsSync(new URL('test-phase10-creator-growth.mjs', import.meta.url)),
  true,
  'Phase 10 creator growth guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:phase10-creator-growth'],
  'node scripts/test-phase10-creator-growth.mjs',
  'package.json must expose the Phase 10 creator growth guard.',
)
hasText(packageJson.scripts['test:stage-release-guards'], 'test:phase10-creator-growth', 'Stage release guards must include the Phase 10 creator growth guard.')
hasText(packageJson.scripts['test:guards'], 'test:stage-release-guards', 'Full guard suite must keep stage release checks in the guard chain.')

for (const typeName of [
  'CreatorFeedbackSummary',
  'CreatorTopPost',
  'CreatorReplyOpportunity',
  'CreatorRepresentativePost',
  'CreatorTopicIdea',
  'CreatorIncentiveCopy',
  'CreatorGrowthWorkspace',
]) {
  has(apiTypes, new RegExp(`export interface ${typeName}`), `API types must expose ${typeName}.`)
}

for (const contractName of [
  'feedbackSummary',
  'topPosts',
  'replyOpportunities',
  'representativePosts',
  'topicIdeas',
  'incentiveCopy',
]) {
  has(apiTypes, new RegExp(`${contractName}:`), `CreatorGrowthWorkspace must include ${contractName}.`)
}

for (const adapterName of [
  'adaptCreatorFeedbackSummary',
  'adaptCreatorTopPost',
  'adaptCreatorReplyOpportunity',
  'adaptCreatorRepresentativePost',
  'adaptCreatorTopicIdea',
  'adaptCreatorIncentiveCopy',
  'adaptCreatorGrowthWorkspace',
]) {
  hasText(creatorFeedbackApi, `export const ${adapterName}`, `creator feedback API must export ${adapterName}.`)
}
for (const endpoint of [
  '/api/v1/creator-growth/feedback-summary',
  '/api/v1/creator-growth/workspace',
  '/api/v1/creator-growth/topic-ideas',
]) {
  hasText(creatorFeedbackApi, endpoint, `creator feedback API must call ${endpoint}.`)
}
for (const backendField of [
  'creatorFeedbackSummary',
  'creatorTopPosts',
  'creatorReplyOpportunities',
  'creatorRepresentativePosts',
  'creatorTopicIdeas',
  'nonPaymentIncentiveCopy',
]) {
  hasText(creatorFeedbackApi, backendField, `workspace adapter must accept backend field ${backendField}.`)
}
hasText(creatorFeedbackApi, 'export const shouldUseDemoFallback', 'creator feedback API fallback policy must be exported for reviewable contract checks.')
hasText(creatorFeedbackApi, 'error.code === 10401 || error.code === 10403', 'creator feedback API fallback must not mask auth or permission BizException errors.')
hasText(creatorFeedbackApi, 'status === 401 || status === 403', 'creator feedback API fallback must not mask auth or permission HTTP errors.')
hasText(creatorFeedbackApi, 'status === 404', 'creator feedback API demo fallback must be limited to missing endpoint/resource responses.')
missing(creatorFeedbackApi, /catch\s*\{\s*return localDemoResult/, 'creator feedback API must not convert every thrown error into demo data.')
missingText(creatorFeedbackApi, 'commenterUid', 'creator reply opportunity adapter must not expose anonymous commenter uid data.')

for (const demoName of [
  'demoCreatorFeedbackSummary',
  'demoCreatorTopPosts',
  'demoCreatorReplyOpportunities',
  'demoCreatorRepresentativePosts',
  'demoCreatorTopicIdeas',
  'demoCreatorIncentiveCopy',
  'demoCreatorGrowthWorkspace',
]) {
  hasText(phase10DemoSeeds, `export const ${demoName}`, `demo seeds must expose ${demoName}.`)
}
for (const requiredCopy of [
  '近 7 天',
  '近 30 天',
  '代表作',
  '公开合集',
  '选题灵感',
  '非支付激励',
  '不涉及支付',
  '不承诺收益',
  '不代表平台专业背书',
]) {
  hasText(phase10DemoSeeds, requiredCopy, `creator demo seed must include ${requiredCopy}.`)
}

for (const helperName of [
  'CREATOR_NON_PAYMENT_INCENTIVE_COPY',
  'buildCreatorFeedbackWindowCopy',
  'buildCreatorTopicIdeaCopy',
  'isPhase10P0CreatorSignal',
  'pickRepresentativePosts',
  'publicAuthorPosts',
  'latestPublicPosts',
  'creatorFocusLabels',
  'buildFollowReasons',
  'buildCreatorActions',
  'safeCreatorBio',
]) {
  hasText(creatorSignals, helperName, `creatorSignals must expose ${helperName}.`)
}
for (const signal of [
  'feedback_summary',
  'top_posts',
  'reply_opportunities',
  'representative_posts',
  'public_collections',
  'topic_ideas',
  'non_payment_incentive',
]) {
  hasText(creatorSignals, signal, `creatorSignals must keep ${signal} inside the Phase 10 P0 signal list.`)
}
hasText(creatorSignals, '近 7 天', 'creator signal copy must include the 7-day feedback window.')
hasText(creatorSignals, '近 30 天', 'creator signal copy must include the 30-day feedback window.')
hasText(creatorSignals, '非支付激励：不涉及支付，不承诺收益，不代表平台专业背书。', 'creator signal helpers must preserve the non-payment incentive boundary.')
missingText(creatorSignals, '/certification/apply', 'Phase 10 P0 creator action helper must not route creator incentives through certification.')
missing(creatorSignals, /认证作者|ExpertCertification|UserTaskApplicationService/, 'Phase 10 P0 creator signal helpers must not reuse certification or task systems as incentives.')

const creatorWorkbenchSurface = `${meProfile}\n${growthProfile}\n${growthReport}\n${notifications}`
for (const requiredCopy of [
  '创作者工作台',
  '近期反馈',
  '继续回应',
  '近 7 天/30 天',
  '选题灵感',
  '不承诺曝光效果',
  '创作者轻反馈',
]) {
  hasText(creatorWorkbenchSurface, requiredCopy, `Creator workbench surfaces must keep ${requiredCopy}.`)
}
has(creatorWorkbenchSurface, /grid-cols-1|sm:grid-cols|md:grid-cols|lg:grid-cols|flex-col/i, 'Creator workbench must keep responsive mobile layout classes.')

const authorProfileSurface = `${meProfile}\n${userProfile}\n${explore}\n${home}`
for (const requiredCopy of [
  '代表作',
  '代表内容',
  '公开合集',
]) {
  hasText(authorProfileSurface, requiredCopy, `Author profile and discovery surfaces must keep ${requiredCopy}.`)
}
has(creatorWorkbenchSurface, /representativePosts|representative-grid/, 'Creator workbench must keep representative post data/layout hooks.')
has(authorProfileSurface, /representativePosts|pickRepresentativePosts/, 'Author profile surfaces must keep representative post data hooks.')
has(authorProfileSurface, /publicCollections|公开合集/, 'Author profile surfaces must keep public collection data hooks.')
has(authorProfileSurface, /grid-cols-1|sm:grid-cols|md:grid-cols|lg:grid-cols|flex-col/i, 'Author profile surfaces must keep responsive mobile layout classes.')

const p0Sources = [
  ['creatorFeedback.ts', creatorFeedbackApi],
  ['creatorSignals.ts', creatorSignals],
  ['Phase 10 demoSeeds.ts section', phase10DemoSeeds],
  [
    'MeProfileView.vue',
    meProfile
      .replace(/^\s*<CreatorChallengeWorkspace\b[^>]*\/>\s*$/m, '')
      .replace(/^\s*import CreatorChallengeWorkspace from ['"][^'"]+['"]\s*$/m, ''),
  ],
  ['UserProfileView.vue', userProfile],
  ['GrowthProfileView.vue', growthProfile],
  ['GrowthReportView.vue', growthReport],
  ['NotificationsView.vue', notifications],
].filter(Boolean)

for (const [name, source] of p0Sources) {
  missing(source, /徽章挑战|挑战徽章|创作者徽章|创作挑战|badgeChallenge|challengeBadge|creatorBadge|creatorChallenge/i, `${name} must not introduce badges or challenges into Phase 10 P0.`)
  missing(source, /真实支付|支付成功|会员开通|订阅开通|真实订阅|打赏|提现|收益结算|revenue|settlement/i, `${name} must stay inside the non-payment incentive boundary.`)
  missing(source, /专业投资建议|专业医疗建议|专业法律建议|官方诊断|收益保证|平台背书|保证曝光/i, `${name} must not endorse high-risk channels or promised outcomes.`)
  missing(source, /加入训练任务|待训练|投递进度|模拟面试提醒|AI 教练任务|AI 教练建议|刷题计划|私人训练计划/i, `${name} must not reintroduce old job-training copy.`)
}

console.log('phase10 creator growth guard passed')
