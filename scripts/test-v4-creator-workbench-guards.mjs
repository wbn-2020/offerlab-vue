import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')

const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
}
const hasText = (source, text, message) => check(source.includes(text), message)
const has = (source, pattern, message) => check(pattern.test(source), message)
const missing = (source, pattern, message) => check(!pattern.test(source), message)
const between = (source, start, end, name) => {
  const startIndex = source.indexOf(start)
  const endIndex = end ? source.indexOf(end, startIndex + start.length) : source.length
  check(startIndex !== -1, `${name} missing section start: ${start}`)
  check(endIndex !== -1, `${name} missing section end: ${end}`)
  return startIndex !== -1 && endIndex !== -1 ? source.slice(startIndex, endIndex) : source
}

const packageJson = JSON.parse(read('package.json'))
const v4Plan = read('../文档/V4/OfferLab-V4-社区拓展总体方案-2026-07-06.md')
const v4StagePlan = read('../文档/V4/第一阶段-创作者公共成长工作台详细方案-2026-07-06.md')
const apiTypes = read('src/api/types.ts')
const creatorFeedbackApi = read('src/api/creatorFeedback.ts')
const creatorSignals = read('src/utils/creatorSignals.ts')
const demoSeeds = read('src/data/demoSeeds.ts')
const meProfile = read('src/views/MeProfileView.vue')
const growthProfile = read('src/views/GrowthProfileView.vue')
const postDetail = read('src/views/PostDetailView.vue')
const editor = read('src/views/EditorView.vue')

const meCreatorSurface = between(meProfile, 'id="creator-workbench"', '<RevisitSummaryPanel', 'MeProfile creator workbench surface')
const growthCurationSurface = between(growthProfile, '最近入选反馈', '<section class="grid gap-4', 'GrowthProfile curation feedback surface')
const postDetailCreatorSurface = between(postDetail, '<div v-if="isOwnPost" class="creator-feedback-box">', '<section class="rounded-xl', 'PostDetail creator feedback surface')
const demoCreatorSurface = between(demoSeeds, 'export const demoCreatorFeedbackSummary', 'export const demoProfileContribution', 'creator demo seed surface')
const topPostAdapter = between(creatorFeedbackApi, 'export const adaptCreatorTopPost', 'export const adaptCreatorReplyOpportunity', 'adaptCreatorTopPost')
const replyOpportunityAdapter = between(creatorFeedbackApi, 'export const adaptCreatorReplyOpportunity', 'export const adaptCreatorRepresentativePost', 'adaptCreatorReplyOpportunity')
const representativeAdapter = between(creatorFeedbackApi, 'export const adaptCreatorRepresentativePost', 'const adaptCreatorTopicEditorQuery', 'adaptCreatorRepresentativePost')
const searchGapAdapter = between(creatorFeedbackApi, 'export const adaptCreatorSearchGap', 'export const adaptCreatorIncentiveCopy', 'adaptCreatorSearchGap')
const editorTopicIdeaSurface = between(editor, 'const applyTopicIdeaQuery', 'watch(draftOwner', 'Editor topic idea query surface')

const v4VisibleSurface = [
  meCreatorSurface,
  growthCurationSurface,
  postDetailCreatorSurface,
  demoCreatorSurface,
].join('\n')
const v4RenderedSurface = [
  meCreatorSurface,
  growthCurationSurface,
  postDetailCreatorSurface,
].join('\n')

check(
  existsSync(new URL('test-v4-creator-workbench-guards.mjs', import.meta.url)),
  'V4 creator workbench guard must be runnable directly with node.',
)
check(
  packageJson.scripts['test:v4-creator-workbench-guards'] === 'node scripts/test-v4-creator-workbench-guards.mjs',
  'package.json must expose test:v4-creator-workbench-guards.',
)

for (const requiredDocText of [
  '创作者公共成长工作台',
  '私人求职训练',
  '官方背书',
  '匿名',
  'demo/fallback',
]) {
  hasText(v4Plan + v4StagePlan, requiredDocText, `V4 docs must preserve boundary text: ${requiredDocText}.`)
}

for (const requiredCopy of [
  '创作者工作台',
  '只聚合公开内容信号',
  '不承诺曝光效果',
  '发布公开内容后',
  '示例反馈',
  '回到创作者工作台',
]) {
  hasText(v4VisibleSurface, requiredCopy, `V4 creator workbench surface must keep safe public-feedback copy: ${requiredCopy}.`)
}

for (const typeName of [
  'CreatorGrowthWorkspace',
  'CreatorFeedbackSummary',
  'CreatorTopPost',
  'CreatorReplyOpportunity',
  'CreatorRepresentativePost',
  'CreatorTopicIdea',
  'CreatorWorkspaceSummary',
  'CreatorMaintainablePost',
  'CreatorWorkspaceAction',
  'CreatorSearchGap',
  'EditorSearchGapContext',
]) {
  has(apiTypes, new RegExp(`export interface ${typeName}`), `API types must expose ${typeName}.`)
}

for (const contractName of [
  'source',
  'periodDays',
  'fallbackReason',
  'summary',
  'maintainablePosts',
  'curationFeedback',
  'actions',
  'feedbackSummary',
  'topPosts',
  'replyOpportunities',
  'representativePosts',
  'topicIdeas',
  'searchGaps',
]) {
  has(apiTypes, new RegExp(`${contractName}\\??:`), `CreatorGrowthWorkspace must include ${contractName}.`)
}

for (const helperName of [
  'filterVisiblePosts(filterPublicContent(page.items))',
  'publicAuthorPosts(filterVisiblePosts(posts.items))',
  'filterVisibleCollections',
]) {
  hasText(meProfile, helperName, `MeProfile creator workbench must keep public visibility filtering: ${helperName}.`)
}
has(creatorSignals, /!post\.anonymous/, 'creatorSignals publicAuthorPosts must exclude anonymous posts.')
has(creatorSignals, /profileVisible\s*!==\s*false/, 'creatorSignals publicAuthorPosts must preserve author profile visibility checks.')
hasText(creatorFeedbackApi, 'isSafeCurationFeedbackHref', 'creator curation feedback hrefs must keep same-site href guard.')
hasText(creatorFeedbackApi, "!path.startsWith('/api/')", 'creator curation feedback href guard must reject backend API paths.')
hasText(creatorFeedbackApi, 'workspaceSources', 'creator workspace adapter must keep an explicit source whitelist.')
hasText(creatorFeedbackApi, 'isDisplayableWorkspaceItem', 'creator workspace adapter must filter non-public workspace items.')
hasText(creatorFeedbackApi, 'adaptCreatorSearchGap', 'creator workspace adapter must expose an aggregated search gap adapter.')
hasText(creatorFeedbackApi, 'buildSearchGapEditorHref', 'creator workspace adapter must build editor handoff hrefs for search gaps.')
for (const boundaryText of ['private', 'deleted', 'reviewing', 'violating', 'anonymous']) {
  hasText(creatorFeedbackApi, boundaryText, `creator workspace adapter must recognize ${boundaryText} boundary metadata.`)
}

has(topPostAdapter, /href:\s*safeSameSitePath\(/, 'CreatorTopPost href must be normalized with safeSameSitePath before RouterLink use.')
has(replyOpportunityAdapter, /href:\s*safeSameSitePath\(/, 'CreatorReplyOpportunity href must be normalized with safeSameSitePath before RouterLink use.')
has(representativeAdapter, /href:\s*safeSameSitePath\(/, 'CreatorRepresentativePost href must be normalized with safeSameSitePath before RouterLink use.')
has(searchGapAdapter, /source:\s*'search_gap'|source:\s*'search_discovery'/, 'CreatorSearchGap editor context must use dedicated search gap sources.')
has(searchGapAdapter, /keyword:\s*safeQueryText\(/, 'CreatorSearchGap keyword must be sanitized and bounded.')
has(searchGapAdapter, /returnHref:\s*safeSameSitePath\(/, 'CreatorSearchGap returnHref must use same-site path guard.')
missing(searchGapAdapter, /userSearch|queryLog|searchRecord|rawQuery|uid|userId/i, 'CreatorSearchGap must not adapt private user search records.')
has(creatorFeedbackApi, /source:\s*CREATOR_WORKBENCH_EDITOR_SOURCE/, 'creator workspace adapter must build editor handoff query with source=creator_workbench.')

hasText(editorTopicIdeaSurface, 'creator_workbench', 'Editor must keep creator_workbench as an allowed source for V4 workbench handoff.')
hasText(meCreatorSurface, 'searchGaps', 'MeProfile creator workbench must render aggregated search gaps.')
hasText(meCreatorSurface, 'EditorSearchGapContext', 'MeProfile creator workbench must label search gap handoff context.')
hasText(meCreatorSurface, '聚合需求', 'MeProfile creator workbench must explain search gaps as aggregated demand.')
missing(meCreatorSurface, /用户搜索记录|userSearch|queryLog|searchRecord|rawQuery|uid|userId/i, 'MeProfile search gap surface must not expose user search records.')
has(editorTopicIdeaSurface, /topicIdeaQueryText\(topicIdeaQueryValue\('title'\),\s*96\)/, 'Editor must bound title query length for creator workbench handoff.')
has(editorTopicIdeaSurface, /topicIdeaQueryText\(topicIdeaQueryValue\('topic'\),\s*32\)/, 'Editor must bound topic query length for creator workbench handoff.')
has(editorTopicIdeaSurface, /topicIdeaQueryValue\('postId'\)/, 'Editor must accept postId context from creator workbench handoff.')
has(editorTopicIdeaSurface, /topicIdeaQueryValue\('ideaId'\)/, 'Editor must accept ideaId context from creator workbench handoff.')

for (const forbiddenPattern of [
  /\/certification\/apply|社区身份申请|认证作者|权威认证|官方背书|平台担保/,
  /新增关注者|涨粉|粉丝任务/,
  /创作者收益|付费分成|打赏提现|会员权益|付费曝光|变现机会|保证曝光|限时奖励/,
  /冲榜|排名下降|任务未完成|连续打卡|每日任务/,
  /私人求职训练|训练计划|AI 教练|简历优化|JD 分析|投递管理|模拟面试/,
]) {
  missing(v4VisibleSurface, forbiddenPattern, `V4 creator workbench visible surface must not contain forbidden boundary copy: ${forbiddenPattern}.`)
}
missing(
  v4RenderedSurface,
  /followerCount/,
  'V4 creator workbench rendered surfaces must not expose followerCount as a growth target.',
)

for (const privateRoutePattern of [
  /\/me\/prep/,
  /\/mock-interview/,
  /\/company-prep/,
  /source:\s*'mock_interview'/,
]) {
  missing(meCreatorSurface + editorTopicIdeaSurface, privateRoutePattern, `V4 creator workbench must not route into private training surfaces: ${privateRoutePattern}.`)
}
missing(meCreatorSurface + postDetailCreatorSurface, /\/me\/creator/, 'V4 creator workbench should use /me#creator-workbench until a dedicated route exists.')

has(demoCreatorSurface, /degraded:\s*true/, 'V4 creator demo workspace must remain explicitly degraded.')
has(demoCreatorSurface, /source:\s*'demo'/, 'V4 creator demo workspace must expose source=demo.')
has(demoCreatorSurface, /fallbackReason:\s*'local_demo_seed'/, 'V4 creator demo workspace must expose fallbackReason=local_demo_seed.')
hasText(demoCreatorSurface, 'local_demo_seed', 'V4 creator demo workspace must keep a local_demo_seed marker.')
missing(
  creatorFeedbackApi,
  /catch\s*\{\s*return localDemoResult/,
  'creator feedback API must not convert every thrown error into demo data.',
)

if (failures.length) {
  console.error('V4 creator workbench guard failed:')
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`))
  process.exit(1)
}

console.log('V4 creator workbench guards passed.')
