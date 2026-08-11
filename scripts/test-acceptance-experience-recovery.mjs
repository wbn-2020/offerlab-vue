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

console.log('Acceptance experience recovery guard passed.')
