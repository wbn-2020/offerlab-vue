import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const userProfile = read('src/views/UserProfileView.vue')
const meProfile = read('src/views/MeProfileView.vue')
const certification = read('src/views/CertificationApplyView.vue')
const header = read('src/components/layout/AppHeader.vue')
const router = read('src/router/index.ts')
const knowledgeExplore = read('src/views/KnowledgeExploreView.vue')
const growthReport = read('src/views/GrowthReportView.vue')
const search = read('src/views/SearchView.vue')
const explore = read('src/views/ExploreView.vue')
const postDetail = read('src/views/PostDetailView.vue')
const creatorSignals = read('src/utils/creatorSignals.ts')
const certificationCopy = read('src/utils/certificationCopy.ts')
const userContributionService = readFileSync(
  new URL('../../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/application/UserContributionService.java', import.meta.url),
  'utf8',
)

const assertIncludes = (source, text, message) => assert.ok(source.includes(text), message)
const assertNotIncludes = (source, text, message) => assert.ok(!source.includes(text), message)

for (const [name, source] of [
  ['UserProfileView', userProfile],
  ['MeProfileView', meProfile],
  ['CertificationApplyView', certification],
  ['SearchView', search],
  ['ExploreView', explore],
  ['PostDetailView', postDetail],
]) {
  assert.doesNotMatch(source, /\uFFFD|锟|�/, `${name} must not contain visible replacement mojibake markers`)
}

assertIncludes(creatorSignals, 'isPublicAuthor', 'creatorSignals must expose public author predicate')
assertIncludes(creatorSignals, 'publicAuthorPosts', 'creatorSignals must expose public post filtering')
assertIncludes(creatorSignals, '!post.anonymous', 'creatorSignals must exclude anonymous posts from author assets')
assertIncludes(creatorSignals, 'buildFollowReasons', 'creatorSignals must build follow reasons')

assertIncludes(userProfile, '为什么值得关注', 'public author profile must explain why to follow')
assertIncludes(userProfile, '代表内容', 'public author profile must show representative content')
assertIncludes(userProfile, '最新内容', 'public author profile must show latest content')
assertIncludes(userProfile, '公开合集', 'public author profile must show public collections')
assertIncludes(userProfile, 'contentSeriesApi.listPublicByUser', 'public author profile must use public collection API')
assertIncludes(userProfile, 'publicAuthorPosts', 'public author profile must filter anonymous/private author posts')
assertIncludes(userProfile, 'pickRepresentativePosts', 'public author profile must use representative post ranking')
assertIncludes(userProfile, 'buildFollowReasons', 'public author profile must use follow reasons')

assertIncludes(meProfile, '创作者中心', 'my profile must expose creator center')
assertIncludes(meProfile, '下一步行动', 'my profile must expose next actions')
assertIncludes(meProfile, '代表内容', 'my profile must surface representative content')
assertIncludes(meProfile, '认证作者', 'my profile must expose certification entry')
assertIncludes(meProfile, 'contentSeriesApi.listMine', 'my profile must reuse existing collection API')
assertIncludes(meProfile, 'buildCreatorActions', 'my profile must use creator action helper')
assertIncludes(meProfile, '/series/workbench', 'my profile must link to collection workbench')
assertIncludes(meProfile, '/certification/apply', 'my profile must link to certification application')

assertIncludes(certificationCopy, 'certificationStatusText', 'certification copy helper must provide status mapping')
assertIncludes(certificationCopy, 'safeCertificationCheck', 'certification copy helper must provide check mapping')
assertIncludes(certificationCopy, 'safeCertificationRiskWarning', 'certification copy helper must provide risk warning mapping')
assertIncludes(certification, '认证作者申请', 'certification page must use creator certification wording')
assertIncludes(certification, 'safeCertificationExplanation', 'certification page must use safe explanation copy')
assertIncludes(certification, 'safeCertificationCheck', 'certification page must use safe check copy')
assertIncludes(certification, 'safeCertificationRiskWarning', 'certification page must use safe risk warning copy')
assertIncludes(certification, 'safeCertificationSummary', 'certification page must use safe summary copy')
assertIncludes(certification, 'certificationStatusText', 'certification page must use local status text')
assertIncludes(certification, 'certificationStatusTone', 'certification page must use local status tone')
assertNotIncludes(certification, '可信专家体系', 'certification page must not keep old expert-system positioning')
assertNotIncludes(certification, '专家认证申请', 'certification page must not keep old expert application wording')
assertNotIncludes(certification, 'item.statusLabel ||', 'certification page must not directly render backend statusLabel')
assertNotIncludes(certification, '{{ item.statusLabel', 'certification page must not directly render backend statusLabel')
assertNotIncludes(certification, "item.autoCertified ? '自动认证'", 'certification page must not show auto certification branch')
assertNotIncludes(certification, 'eligibility.explanation', 'certification page must not directly render backend explanation')
assertNotIncludes(certification, 'check.label', 'certification page must not directly render backend check label')
assertNotIncludes(certification, 'check.detail', 'certification page must not directly render backend check detail')
assertNotIncludes(certification, 'eligibility.riskWarning }}</p>', 'certification page must not directly render backend risk warning')
assertNotIncludes(certification, 'item.eligibilitySummary }}</p>', 'certification page must not directly render backend eligibility summary')

assertIncludes(header, '认证作者申请', 'header certification entry must use creator wording')
assertNotIncludes(header, '专家认证申请', 'header must not expose old expert application wording')
assertIncludes(router, "meta: { title: '认证作者申请' }", 'router title must use creator certification wording')
assertIncludes(knowledgeExplore, '认证作者', 'knowledge explore entry must use creator certification wording')
assertNotIncludes(knowledgeExplore, '专家认证', 'knowledge explore entry must not expose old expert certification wording')
assertIncludes(growthReport, '认证作者', 'growth report entry must use creator certification wording')
assertNotIncludes(growthReport, '专家认证', 'growth report entry must not expose old expert certification wording')
assertIncludes(userContributionService, 'L5 领域作者', 'backend contribution level must use creator wording')
assertNotIncludes(userContributionService, 'L5 社区专家', 'backend contribution level must not return old expert wording')
assertNotIncludes(userContributionService, '专家认证', 'backend contribution service must not expose old expert certification wording')

assertIncludes(search, 'buildFollowReasons', 'search user results must show follow reasons')
assertIncludes(search, '.filter(isPublicAuthor)', 'search user results must filter public authors')
assertIncludes(explore, 'buildFollowReasons', 'explore recommended users must show follow reasons')
assertIncludes(explore, '.filter(isPublicAuthor)', 'explore recommended users must filter public authors')

assertIncludes(postDetail, '作者名片', 'post detail must expose author card')
assertIncludes(postDetail, '推荐关注理由', 'post detail must show author follow reason')
assertIncludes(postDetail, 'Boolean(post.value?.anonymous)', 'post detail must block author profile for anonymous posts')
assertIncludes(postDetail, 'isPublicAuthor(post.value?.author)', 'post detail must use public author predicate')

console.log('stage5 creator system guard passed')
