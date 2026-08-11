import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const vueRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const javaRoot = path.resolve(vueRoot, '..', 'offerlab-java')
const readVue = (relative) => fs.readFileSync(path.join(vueRoot, relative), 'utf8')
const readJava = (relative) => fs.readFileSync(path.join(javaRoot, relative), 'utf8')
const expect = (value, message) => assert.ok(value, message)

const packageJson = JSON.parse(readVue('package.json'))
const governanceService = readJava(
  'community-domain-analytics/src/main/java/com/offerlab/community/analytics/application/ChannelQualityGovernanceTodoService.java',
)
const postFacade = readJava(
  'community-domain-post/src/main/java/com/offerlab/community/post/application/PostFacadeImpl.java',
)
const growthInsightService = readJava(
  'community-domain-analytics/src/main/java/com/offerlab/community/analytics/application/GrowthInsightService.java',
)
const acceptanceProfile = readJava('community-bootstrap/src/main/resources/application-acceptance.yml')
const collaborationSeed = readJava(
  'community-bootstrap/src/main/resources/db/flyway/demo/V20260811.01__demo_collaboration_seed.sql',
)
const publicDomainNameMigration = readJava(
  'community-bootstrap/src/main/resources/db/flyway/core/V20260811.02__align_public_domain_names.sql',
)
const tagDetail = readVue('src/views/TagDetailView.vue')
const textQuality = readVue('src/utils/textQuality.ts')
const governanceTodos = readVue('src/views/me/MyGovernanceTodosView.vue')
const commentTree = readVue('src/components/post/CommentTree.vue')
const postDetail = readVue('src/views/PostDetailView.vue')
const certificationApply = readVue('src/views/CertificationApplyView.vue')
const loginView = readVue('src/views/LoginView.vue')
const meProfile = readVue('src/views/MeProfileView.vue')
const operationSlotCard = readVue('src/components/operations/OperationSlotCard.vue')
const operationsService = readJava(
  'community-domain-post/src/main/java/com/offerlab/community/post/application/OperationCurationService.java',
)
const healthController = readJava(
  'community-bootstrap/src/main/java/com/offerlab/community/HealthController.java',
)
const commentMapper = readJava(
  'community-domain-interaction/src/main/java/com/offerlab/community/interaction/infrastructure/persistence/mapper/CommentMapper.java',
)
const interactionFacade = readJava(
  'community-domain-interaction/src/main/java/com/offerlab/community/interaction/application/InteractionFacadeImpl.java',
)
const editorView = readVue('src/views/EditorView.vue')
const appHeader = readVue('src/components/layout/AppHeader.vue')
const searchView = readVue('src/views/SearchView.vue')
const exploreView = readVue('src/views/ExploreView.vue')
const homeView = readVue('src/views/HomeView.vue')
const publicActorLink = readVue('src/components/user/PublicActorLink.vue')
const userAvatar = readVue('src/components/user/UserAvatar.vue')
const avatarRequestState = readVue('src/components/user/useAvatarRequestState.ts')
const demoCommentCounterMigration = readJava(
  'community-bootstrap/src/main/resources/db/flyway/demo/V20260811.03__reconcile_demo_comment_counters.sql',
)

assert.equal(
  packageJson.scripts['test:acceptance-experience-recovery'],
  'node scripts/test-acceptance-experience-recovery.mjs',
  'The acceptance recovery guard must be runnable directly.',
)
expect(
  governanceService.includes('.freshThrough(query.evaluationTime().atZone(ZoneOffset.UTC).toInstant())'),
  'Governance todo pages must expose a non-null freshness watermark.',
)
expect(
  governanceService.includes(': "NOT_APPLICABLE";'),
  'Completed or closed governance todos must expose an explicit due state.',
)
expect(
  governanceTodos.includes('to="/me"'),
  'The governance read error must provide a route back to the personal space.',
)
expect(
  postFacade.includes('return "tag-" + id;'),
  'Public tag slugs must be globally unique and based on the stable tag ID.',
)
expect(
  tagDetail.includes('const resolveTag ='),
  'Legacy tag-name routes must resolve deterministically.',
)
expect(
  tagDetail.includes('Number(Boolean(right.official)) - Number(Boolean(left.official))'),
  'Legacy duplicate tag names must prefer the official tag before usage ordering.',
)
expect(
  tagDetail.includes('tag.name.trim().toLocaleLowerCase() === normalizedValue'),
  'Legacy tag-name routes must resolve case-insensitively.',
)
expect(
  !textQuality.includes('OfferLab\\s+demo'),
  'Public demo content must not be hidden solely because it is labeled as a demo.',
)
expect(
  commentTree.includes(':expected-count="Number(post.counter.comment || 0)"')
    || postDetail.includes(':expected-count="Number(post.counter.comment || 0)"'),
  'Comment UI must receive the server discussion count.',
)
expect(
  commentTree.includes('!errorMessage && expectedCount > 0'),
  'A failed comment request must not degrade into an empty-state prompt.',
)
expect(
  acceptanceProfile.includes('classpath:db/flyway/core,classpath:db/flyway/demo'),
  'Acceptance must opt into non-production demo migrations.',
)
for (const tableName of [
  't_collab_content_need',
  't_collab_series',
  't_collab_activity',
  't_collab_discussion',
  't_collab_office_hour',
]) {
  expect(
    collaborationSeed.includes(`INSERT INTO ${tableName}`),
    `Acceptance collaboration seed must provide ${tableName} samples.`,
  )
}
expect(
  collaborationSeed.includes("email = 'user001@qq.com'"),
  'Acceptance samples must grant the validation account contributor access to series.',
)
expect(
  growthInsightService.includes('先发布一篇结构化内容，让成长雷达和报告积累可用信号。'),
  'Growth empty states must remain Chinese.',
)
for (const name of ['科技数码', '职场经验', '学习成长', '生活方式', '投资理财']) {
  expect(
    publicDomainNameMigration.includes(`THEN '${name}'`),
    `The public domain-name migration must include ${name}.`,
  )
}
expect(
  certificationApply.includes("String(check.detail || '').match(/(\\d+)\\s*\\/\\s*(\\d+)/)"),
  'Certification eligibility gaps must parse the structured current/required counts.',
)
expect(
  loginView.includes("loginFeedbackState.value = 'waiting'"),
  'Login must explain the wait before a timeout is returned.',
)
expect(
  meProfile.includes('v-if="hasPublishedContent" class="profile-actions"')
    && meProfile.includes('v-if="hasPublishedContent" to="/editor" class="secondary-button"')
    && !meProfile.includes('empty-action-text="去发布"'),
  'Profiles without public posts must expose only the focused primary publishing action.',
)
expect(
  commentMapper.includes('long countVisibleComments')
    && interactionFacade.includes('page.setTotal(total)')
    && interactionFacade.includes('评论数据暂时无法读取，请稍后重试'),
  'Comment pages must expose the real total and reject a contradictory non-zero empty first page.',
)
expect(
  demoCommentCounterMigration.includes('SELECT COUNT(*)')
    && demoCommentCounterMigration.includes('t_int_comment')
    && !demoCommentCounterMigration.includes('INSERT INTO t_int_comment'),
  'Demo comment counters must be reconciled from real comments without inventing discussion rows.',
)
expect(
  operationsService.includes('.status("EMPTY")')
    && operationSlotCard.includes('isSuccessfulEmpty')
    && operationSlotCard.includes('当前暂无运营精选'),
  'HOME_FEATURED must distinguish a successful empty configuration from an API failure.',
)
expect(
  healthController.includes('SERVICE_COMPONENTS')
    && healthController.includes('coreSchemaHealth()')
    && healthController.includes('publicReadinessIssues'),
  'Public readiness must use core dependencies and return safe diagnostic codes.',
)
expect(
  editorView.includes('maxlength="200"')
    && editorView.includes('标题最多 200 个字符')
    && editorView.includes('封面链接必须是完整的 http 或 https 地址')
    && editorView.includes('最多添加 5 个标签'),
  'Editor validation must cover title, link, content and tag boundaries before publish.',
)
expect(
  appHeader.includes('community-skip-link')
    && appHeader.includes('切换亮色模式')
    && searchView.includes('aria-label="搜索内容、话题、作者或标签"'),
  'Global navigation and search must expose visible keyboard focus and stable Chinese accessible names.',
)
expect(
  exploreView.includes('error && !hasItems')
    && exploreView.includes('个别入口会在对应区域提示状态'),
  'Explore must localize partial failures instead of showing a global unavailable state beside successful content.',
)
expect(
  homeView.includes('@media (min-width: 1440px)')
    && homeView.includes('max-width: 96rem')
    && homeView.includes('grid-template-columns: 224px minmax(0, 1fr) 304px'),
  'Home must expand its information density on 1440-1920px viewports.',
)
expect(
  publicActorLink.includes('userApi.getProfile')
    && publicActorLink.includes('社区成员'),
  'Public collaboration pages must resolve public actor identity without exposing raw UIDs.',
)
expect(
  userAvatar.includes(':style="fallbackStyle"')
    && avatarRequestState.includes('export const resolveAvatarTone'),
  'Fallback avatars must remain stable and visually distinguishable by display name.',
)

console.log('Acceptance experience recovery guard passed.')
