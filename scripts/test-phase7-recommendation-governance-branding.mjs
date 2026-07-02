import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const readSource = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const brandPath = new URL('../src/utils/brand.ts', import.meta.url)
const governancePath = new URL('../src/utils/recommendationGovernance.ts', import.meta.url)

assert.equal(existsSync(brandPath), true, 'Phase 7 must expose a single frontend brand source at src/utils/brand.ts.')
assert.equal(existsSync(governancePath), true, 'Phase 7 must expose recommendation governance helpers.')

const brand = readSource('src/utils/brand.ts')
const governance = readSource('src/utils/recommendationGovernance.ts')
const indexHtml = readSource('index.html')
const seo = readSource('src/utils/seo.ts')
const header = readSource('src/components/layout/AppHeader.vue')
const login = readSource('src/views/LoginView.vue')
const register = readSource('src/views/RegisterView.vue')
const about = readSource('src/views/AboutView.vue')
const demoSeeds = readSource('src/data/demoSeeds.ts')
const postCard = readSource('src/components/post/PostCard.vue')
const home = readSource('src/views/HomeView.vue')
const explore = readSource('src/views/ExploreView.vue')
const search = readSource('src/views/SearchView.vue')
const topic = readSource('src/views/TopicDetailView.vue')
const tag = readSource('src/views/TagDetailView.vue')
const postDetail = readSource('src/views/PostDetailView.vue')
const adminGovernance = readSource('src/views/AdminGovernanceView.vue')
const ops = readSource('src/views/OpsView.vue')
const textQuality = readSource('src/utils/textQuality.ts')
const adapters = readSource('src/api/adapters.ts')
const types = readSource('src/api/types.ts')
const packageJson = JSON.parse(readSource('package.json'))

assert.match(brand, /export\s+const\s+siteBrand/, 'Brand source must export siteBrand.')
assert.match(brand, /displayName:\s*'闻野'/, 'Visible displayName must be 闻野.')
assert.match(brand, /shortName:\s*'闻野'/, 'Visible shortName must be 闻野.')
assert.match(brand, /legacyName:\s*'OfferLab'/, 'Legacy project code must remain OfferLab in brand config.')
assert.match(brand, /tagline:\s*'真实经验和有用见闻的综合社区'/, 'Brand tagline must keep the Phase 7 positioning.')
assert.match(brand, /description:\s*'发现真实经验、讨论生活问题、收藏有用参考。'/, 'Brand description must be stable and concise.')

assert.equal(packageJson.name, 'offerlab-vue', 'Package name must keep the legacy repository/package identity.')
assert.equal(
  packageJson.scripts['test:phase7-recommendation-governance-branding'],
  'node scripts/test-phase7-recommendation-governance-branding.mjs',
  'package.json must expose the Phase 7 branding/governance guard.',
)
assert.equal(
  packageJson.scripts['test:phase7-operations-dashboard'],
  'node scripts/test-phase7-operations-dashboard.mjs',
  'package.json must expose the Phase 7 operations dashboard guard.',
)
assert.match(packageJson.scripts['test:stage-release-guards'], /test:phase7-operations-dashboard/, 'Stage release guards must run the Phase 7 operations guard.')
assert.match(packageJson.scripts['test:stage-release-guards'], /test:phase7-recommendation-governance-branding/, 'Stage release guards must run the Phase 7 branding/governance guard.')

for (const [name, source] of [
  ['index.html', indexHtml],
  ['src/utils/seo.ts', seo],
  ['AppHeader.vue', header],
  ['LoginView.vue', login],
  ['RegisterView.vue', register],
  ['AboutView.vue', about],
  ['demoSeeds.ts', demoSeeds],
]) {
  assert.match(source, /闻野|siteBrand/, `${name} must expose the new visible brand.`)
  assert.doesNotMatch(source, /OfferLab/, `${name} must not hard-code OfferLab in user-visible brand surfaces.`)
}

assert.match(indexHtml, /<title>闻野<\/title>/, 'Initial HTML title must use 闻野.')
assert.match(indexHtml, /真实经验和有用见闻的综合社区/, 'Initial HTML description must use the new brand positioning.')
assert.match(seo, /siteBrand/, 'SEO utilities must derive title and description from siteBrand.')
assert.match(header, /siteBrand/, 'Header brand must derive visible labels from siteBrand.')
assert.match(login, /siteBrand/, 'Login page must derive visible brand from siteBrand.')
assert.match(register, /siteBrand/, 'Register page must derive visible brand from siteBrand.')

for (const field of [
  'visibility?:',
  'postStatus?:',
  'status?:',
  'deleted?:',
  'restricted?:',
  'riskLevel?:',
  'moderationStatus?:',
]) {
  assert.match(types, new RegExp(field.replace('?', '\\?')), `Post type must preserve governance field ${field}`)
}

for (const field of [
  'visibility: source?.visibility',
  'postStatus: source?.postStatus',
  'status: source?.status',
  'deleted: Boolean',
  'restricted: Boolean',
  'riskLevel: source?.riskLevel',
  'moderationStatus: source?.moderationStatus',
]) {
  assert.match(adapters, new RegExp(field.replace(/[?.]/g, '\\$&')), `adaptPost must preserve ${field}`)
}

assert.match(governance, /export\s+const\s+normalizeRecommendationReason/, 'Recommendation reason normalizer must be shared.')
assert.match(governance, /export\s+const\s+isPublicPostVisible/, 'Public visibility guard must be shared.')
assert.match(governance, /export\s+const\s+filterVisiblePosts/, 'Visible post filter must be shared.')
assert.match(governance, /HIGH_RISK_CONTENT_WARNINGS/, 'High-risk warning catalog must be centralized.')
assert.match(governance, /findHighRiskContentWarning/, 'High-risk keyword matching must be shared.')

for (const forbidden of [
  'AI 精准推荐',
  '猜你喜欢',
  '系统认为你必须看',
  '根据你的隐私画像',
  '浏览记录',
  '私密互动',
  '目标公司',
  '岗位偏好',
]) {
  assert.match(governance, new RegExp(forbidden), `Normalizer must explicitly guard ${forbidden}.`)
}

for (const warning of [
  '投资理财',
  '医疗健康',
  '情绪心理',
  '法律纠纷',
  '未成年人',
  '隐私暴露',
  '人肉搜索',
  '招聘求职欺诈',
]) {
  assert.match(governance, new RegExp(warning), `High-risk warnings must cover ${warning}.`)
}

assert.match(postCard, /normalizeRecommendationReason/, 'PostCard must use the shared recommendation reason normalizer.')
assert.doesNotMatch(postCard, /const\s+normalizeRecommendationReason\s*=/, 'PostCard must not keep a local recommendation reason normalizer.')
assert.match(explore, /normalizeRecommendationReason/, 'Explore cross-domain recommendations must normalize reasons.')
assert.match(explore, /filterVisiblePosts/, 'Explore cross-domain recommendations must filter invisible posts.')
assert.match(home, /filterVisiblePosts/, 'Home feed must use the shared visible post filter.')
assert.match(search, /filterVisiblePosts/, 'Search results must use the shared visible post filter.')
assert.match(topic, /filterVisiblePosts/, 'Topic posts must use the shared visible post filter.')
assert.match(tag, /filterVisiblePosts/, 'Tag posts must use the shared visible post filter.')
assert.match(textQuality, /isPublicPostVisible/, 'Legacy public content filter must reuse the new visibility guard.')

for (const source of [postCard, home, explore, search]) {
  assert.doesNotMatch(
    source,
    /AI 精准推荐|猜你喜欢|系统认为你必须看|根据你的隐私画像/,
    'User-facing recommendation surfaces must avoid exaggerated or privacy-invasive copy.',
  )
}

assert.match(home, /兴趣设置、内容标签、近期热度和新内容信号/, 'Home recommendation copy must explain public, non-sensitive signals.')
assert.match(explore, /公共内容信号/, 'Explore recommendation copy must avoid private-behavior explanations.')
assert.match(search, /谨慎参考/, 'Search must surface high-risk keyword caution copy.')
assert.match(postDetail, /感谢反馈，我们会根据社区规则处理/, 'Report success copy must avoid promising a fixed moderation outcome.')
assert.match(postDetail, /投资误导|未成年人风险|诈骗或违法诱导/, 'Report dialog must include high-risk report reasons.')
assert.match(adminGovernance, /统一队列仅承载认领、定位和审计状态/, 'Admin governance must explain queue/report capability boundaries.')
assert.match(ops, /确认通过\$\{targetType\}举报/, 'Ops report approvals must go through the shared high-risk confirmation flow.')
assert.match(ops, /通过后会隐藏评论或整段回复/, 'Comment report approval confirmation must state the moderation impact.')
assert.match(ops, /通过后会下架帖子/, 'Post report approval confirmation must state the moderation impact.')
assert.match(
  adminGovernance,
  /POST_REPORT' \|\| item\.sourceType === 'COMMENT_REPORT'[\s\S]*action === 'approve'[\s\S]*action === 'reject'/,
  'Report queue items must not expose direct approve/reject actions as if they processed the source report.',
)

console.log('Phase 7 recommendation governance and branding guard passed.')
