import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const packageJson = JSON.parse(read('package.json'))
const governanceView = read('src/views/AdminGovernanceView.vue')
const domains = read('src/utils/domains.ts')
const postDetail = read('src/views/PostDetailView.vue')
const postApi = read('src/api/post.ts')
const interactionApi = read('src/api/interaction.ts')
const clientApi = read('src/api/client.ts')
const home = read('src/views/HomeView.vue')
const explore = read('src/views/ExploreView.vue')
const notifications = read('src/views/NotificationsView.vue')
const profile = read('src/views/MeProfileView.vue')
const recommendationGovernance = read('src/utils/recommendationGovernance.ts')

assert.equal(
  existsSync(new URL('test-phase8-governance-guards.mjs', import.meta.url)),
  true,
  'Phase 8 governance guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:phase8-governance-guards'],
  'node scripts/test-phase8-governance-guards.mjs',
  'package.json must expose the Phase 8 governance guard.',
)
assert.equal(
  packageJson.scripts['test:phase8-feed-discovery-entry'],
  'node scripts/test-phase8-feed-discovery-entry.mjs',
  'package.json must expose the Phase 8 feed discovery guard.',
)
assert.equal(
  packageJson.scripts['test:phase8-post-detail-discussion-loop'],
  'node scripts/test-phase8-post-detail-discussion-loop.mjs',
  'package.json must expose the Phase 8 post detail discussion guard.',
)
assert.equal(
  packageJson.scripts['test:phase8-notification-creator-loop'],
  'node scripts/test-phase8-notification-creator-loop.mjs',
  'package.json must expose the Phase 8 notification and creator feedback guard.',
)
has(packageJson.scripts['test:phase8-community-activity-loop'], /test:phase8-feed-discovery-entry/, 'Phase 8 aggregate guard must include feed discovery checks.')
has(packageJson.scripts['test:phase8-community-activity-loop'], /test:phase8-post-detail-discussion-loop/, 'Phase 8 aggregate guard must include post detail discussion checks.')
has(packageJson.scripts['test:phase8-community-activity-loop'], /test:phase8-notification-creator-loop/, 'Phase 8 aggregate guard must include notification and creator feedback checks.')
has(packageJson.scripts['test:phase8-community-activity-loop'], /test:phase8-governance-guards/, 'Phase 8 aggregate guard must include governance checks.')
has(packageJson.scripts['test:stage-release-guards'], /test:phase8-community-activity-loop/, 'Stage release guards must include the Phase 8 aggregate checks.')
has(packageJson.scripts['test:guards'], /test:stage-release-guards/, 'Full guard suite must include stage release checks, including Phase 8 aggregate checks.')

const discoverySurface = `${home}\n${explore}`
has(discoverySurface, /热榜|热门讨论|近期上升|hotRising|trending|rising/i, 'Discovery surfaces must keep a hot discussion or rising-content surface.')
has(discoverySurface, /频道精选|精选/, 'Discovery surfaces must keep a channel featured surface.')
has(discoverySurface, /正在讨论|参与讨论|讨论/, 'Discovery surfaces must keep discussion participation copy.')

has(notifications, /关注讨论|新回复|回到讨论|讨论/, 'Notifications must preserve follow-discussion comeback copy.')
has(profile, /创作者|回应|评论|收藏|关注/, 'Creator feedback surfaces must mention lightweight response signals.')

has(postApi, /report:\s*\(postId[\s\S]*\/api\/v1\/posts\/\$\{postId\}\/reports/, 'Post reporting must call the real post report API.')
has(interactionApi, /reportComment:\s*\(commentId[\s\S]*\/api\/v1\/comments\/\$\{commentId\}\/reports/, 'Comment reporting must call the real comment report API.')
has(postDetail, /感谢反馈，我们会根据社区规则处理/, 'Report success copy must avoid promising a fixed moderation outcome.')
has(postDetail, /重复举报已收到|已有待处理举报|请勿重复提交/, 'Duplicate report errors must be understandable as duplicate report feedback.')
has(postDetail, /举报太频繁|稍后再提交|频率限制/, 'Rate-limited report errors must be understandable as report rate feedback.')
has(postDetail, /举报提交失败|暂时无法提交举报/, 'Report failure copy must be explicit and non-successful.')
has(clientApi, /30001:\s*'请勿重复操作'/, 'Client API must still map duplicate operations.')
has(clientApi, /10429:\s*'操作太频繁，请稍后再试'/, 'Client API must still map rate limiting.')

has(governanceView, /举报能力真实承接/, 'Governance page must state whether report submission is truly backed.')
has(governanceView, /不(?:在这里)?承诺直接下架或隐藏/, 'Governance queue must avoid overpromising moderation outcomes.')
has(governanceView, /重复举报|频率限制/, 'Governance page must expose duplicate and rate-limit failure states.')
has(governanceView, /内容不可见|已删除|已下架|受限/, 'Governance page must describe content unavailable states.')
has(governanceView, /高风险内容不提供专业建议背书/, 'Governance page must explicitly avoid professional advice endorsement.')

has(domains, /HIGH_RISK_DOMAIN_NOTES/, 'Domain utility must centralize high-risk domain notes.')
has(domains, /getDomainRiskNote/, 'Domain utility must expose a reusable risk-note getter.')
has(domains, /不构成投资建议/, 'Investment risk note must avoid professional advice framing.')
has(domains, /医疗健康[\s\S]*不构成医疗建议/, 'High-risk notes must cover medical health without professional advice.')
has(domains, /法律[\s\S]*不构成法律意见/, 'High-risk notes must cover legal content without professional advice.')
has(recommendationGovernance, /不构成投资建议/, 'Existing recommendation governance must keep high-risk disclaimers.')

for (const [name, source] of [
  ['HomeView.vue', home],
  ['ExploreView.vue', explore],
  ['PostDetailView.vue', postDetail],
  ['AdminGovernanceView.vue', governanceView],
  ['domains.ts', domains],
]) {
  missing(source, /专业投资建议|专业医疗建议|专业法律建议|官方诊断|收益保证/, `${name} must not package high-risk content as professional advice.`)
}

const forbiddenCommunityCopy = [
  '加入训练任务',
  '待训练',
  '投递进度',
  '模拟面试提醒',
  'AI 教练任务',
  'AI 教练建议',
  '刷题计划',
  '私人训练计划',
]

for (const forbidden of forbiddenCommunityCopy) {
  for (const [name, source] of [
    ['HomeView.vue', home],
    ['ExploreView.vue', explore],
    ['PostDetailView.vue', postDetail],
    ['NotificationsView.vue', notifications],
    ['AdminGovernanceView.vue', governanceView],
  ]) {
    missing(source, new RegExp(forbidden), `${name} must not reintroduce old training/coaching copy: ${forbidden}`)
  }
}

const paymentForbidden = [
  '真实支付',
  '支付成功',
  '会员开通',
  '订阅开通',
  '真实订阅',
  '打赏',
  '提现',
  '收益结算',
]

for (const forbidden of paymentForbidden) {
  for (const [name, source] of [
    ['HomeView.vue', home],
    ['ExploreView.vue', explore],
    ['PostDetailView.vue', postDetail],
    ['AdminGovernanceView.vue', governanceView],
    ['domains.ts', domains],
  ]) {
    missing(source, new RegExp(forbidden), `${name} must stay out of Phase 8 payment/commercialization forbidden zone: ${forbidden}`)
  }
}

console.log('Phase 8 governance, risk, failure-state, and guard checks passed.')
