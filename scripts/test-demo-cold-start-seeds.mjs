import { existsSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const demoSeeds = readFileSync(new URL('../src/data/demoSeeds.ts', import.meta.url), 'utf8')
const initSeed = readFileSync(new URL('../../offerlab-java/db/init/99_seed.sql', import.meta.url), 'utf8')
const communityMigrationUrl = new URL(
  '../../offerlab-java/db/migration/20260712_demo_community_seed.sql',
  import.meta.url,
)
assert.ok(
  existsSync(communityMigrationUrl),
  'existing databases must have a dedicated comprehensive community demo migration',
)
const communityMigration = readFileSync(communityMigrationUrl, 'utf8')
const questionApi = readFileSync(new URL('../src/api/question.ts', import.meta.url), 'utf8')
const growthApi = readFileSync(new URL('../src/api/growth.ts', import.meta.url), 'utf8')
const questionsView = readFileSync(new URL('../src/views/QuestionsView.vue', import.meta.url), 'utf8')
const prepView = readFileSync(new URL('../src/views/MePrepView.vue', import.meta.url), 'utf8')
const profileView = readFileSync(new URL('../src/views/MeProfileView.vue', import.meta.url), 'utf8')

const expectedDomains = new Map([
  [1, 'TECH'],
  [2, 'CAREER'],
  [3, 'LEARNING'],
  [4, 'LIFESTYLE'],
  [5, 'FINANCE'],
])
const expectedPostTypes = new Set([11, 13, 14, 15, 16])

const readSqlSeedRecords = (source, label) => {
  const records = [...source.matchAll(
    /-- COMMUNITY_DEMO_POST id=(9911\d{14}) domain=(\d) type=(1[1-6])/g,
  )].map((match) => ({
    id: match[1],
    domain: Number(match[2]),
    postType: Number(match[3]),
  }))

  assert.equal(records.length, 15, `${label} must declare exactly 15 comprehensive community posts`)
  assert.equal(new Set(records.map(({ id }) => id)).size, records.length, `${label} post IDs must be unique`)

  for (const [domain, domainName] of expectedDomains) {
    assert.ok(
      records.filter((record) => record.domain === domain).length >= 3,
      `${label} must include at least three ${domainName} posts`,
    )
  }
  assert.deepEqual(
    new Set(records.map(({ postType }) => postType)),
    expectedPostTypes,
    `${label} must cover discussion, review, question, resource, and experience`,
  )

  for (const { id, domain, postType } of records) {
    assert.match(
      source,
      new RegExp(`\\(${id},\\s*[^,]+,\\s*${postType},[\\s\\S]*?NULL,\\s*1,\\s*1,`),
      `${label} post ${id} must be public and published`,
    )
    assert.match(
      source,
      new RegExp(
        `\\(${id},\\s*${postType},\\s*JSON_OBJECT\\('domain',\\s*${domain},\\s*'seed',\\s*'community_seed'`,
      ),
      `${label} post ${id} must persist its explicit domain`,
    )
  }

  return records
}

const initRecords = readSqlSeedRecords(initSeed, 'fresh init seed')
const migrationRecords = readSqlSeedRecords(communityMigration, 'existing DB migration')
assert.deepEqual(migrationRecords, initRecords, 'fresh and migrated databases must receive the same community pack')

for (const source of [initSeed, communityMigration]) {
  assert.doesNotMatch(source, /'seed',\s*'community_demo'/, 'public starter content must not trigger demo filtering')
  assert.match(source, /不构成投资建议/, 'finance content must carry an investment-risk boundary')
  assert.match(source, /本金损失/, 'finance content must explain possible principal loss')
  assert.match(source, /风险承受能力/, 'finance content must emphasize personal risk tolerance')
  assert.doesNotMatch(
    source,
    /稳赚|必涨|翻倍|保本|推荐买入|建议买入|买入信号|卖出信号/,
    'finance demo content must not contain return promises or trading calls',
  )
}

const frontendRecords = [...demoSeeds.matchAll(
  /post\(\s*'demo-community-[^']+',\s*(1[1-6]),\s*([1-5]),/g,
)].map((match) => ({ postType: Number(match[1]), domain: Number(match[2]) }))
assert.equal(frontendRecords.length, 15, 'frontend fallback must include 15 comprehensive community posts')
for (const [domain, domainName] of expectedDomains) {
  assert.ok(
    frontendRecords.filter((record) => record.domain === domain).length >= 3,
    `frontend fallback must include at least three ${domainName} posts`,
  )
}
assert.deepEqual(
  new Set(frontendRecords.map(({ postType }) => postType)),
  expectedPostTypes,
  'frontend fallback must cover all five community post types',
)
assert.match(demoSeeds, /const communityDomainName =/, 'derived demo data must resolve names from post domains')
assert.doesNotMatch(
  demoSeeds,
  /domainName:\s*'科技数码'/,
  'multi-domain demo posts must not be relabeled as technology content',
)
assert.doesNotMatch(
  demoSeeds,
  /itemCount:\s*2,\s*items:\s*demoPosts\.map/,
  'demo collection counts must match their expanded items',
)
assert.match(
  demoSeeds,
  /publishedPostCount:\s*demoPosts\.length/,
  'growth report post counts must follow the expanded seed pack',
)

for (const phrase of [
  '应急包清单',
  '职业空窗期',
  '指数基金',
  '学习系统',
  '合租公共空间',
]) {
  assert.match(demoSeeds, new RegExp(phrase), `frontend community seeds must include ${phrase}`)
}

for (const phrase of [
  '高并发优惠券库存扣减复盘',
  'Kafka 消息堆积面试复盘',
  '为学习成长频道补 3 条资源',
  'Redis 热 key 如何治理',
  '作者主页 demo',
]) {
  assert.match(demoSeeds, new RegExp(phrase), `demo seeds must include ${phrase}`)
}

assert.match(questionApi, /demoQuestionPage/, 'question list must have a local demo fallback page')
assert.match(questionApi, /canUseQuestionListDemo\(data,\s*params\)/, 'question list must gate empty-page demo data through filter-aware policy')
assert.match(questionApi, /hasActiveQuestionFilters/, 'question list must keep filtered empty results as empty results')
assert.doesNotMatch(demoSeeds, /items\.length \? items : demoQuestions/, 'filtered demo question pages must not refill with unrelated demo questions')
assert.match(questionApi, /demoUserPrepOverview/, 'prep overview must have a local demo fallback')
assert.match(questionApi, /demoUserKnowledge/, 'knowledge workbench must have a local demo fallback')
assert.match(questionApi, /demoCompanyPrep/, 'company prep pack must have a local demo fallback')
assert.match(growthApi, /demoGrowthProfile/, 'growth profile must have a local demo fallback')
assert.match(growthApi, /demoGrowthReport/, 'growth report must have a local demo fallback')
assert.match(questionApi, /shouldUseDemoFallback/, 'question API demo fallback must be gated by an explicit error policy')
assert.match(growthApi, /shouldUseDemoFallback/, 'growth API demo fallback must be gated by an explicit error policy')
assert.doesNotMatch(questionApi, /catch\s*\{\s*return localDemoResult/, 'question API must not convert every thrown error into demo data')
assert.doesNotMatch(growthApi, /catch\s*\{\s*return localDemoResult/, 'growth API must not convert every thrown error into demo data')
assert.match(questionApi, /error instanceof BizException[\s\S]*error\.code === 10404/, 'question demo fallback may handle missing optional resources')
assert.match(questionApi, /status === 401 \|\| status === 403/, 'question demo fallback must not mask auth or permission errors')
assert.match(growthApi, /status === 401 \|\| status === 403/, 'growth demo fallback must not mask auth or permission errors')
assert.doesNotMatch(questionApi, /favoriteCount === 0[\s\S]*return localDemoResult\(demoUserPrepOverview\)/, 'prep overview must not turn successful empty personal data into demo metrics')
assert.doesNotMatch(growthApi, /data\.domains\.length === 0[\s\S]*return localDemoResult/, 'growth profile must not turn successful empty personal data into demo metrics')

assert.match(questionsView, /demoSeedNotice/, 'questions page must label local demo content')
assert.match(prepView, /prepDemoNotice/, 'prep page must label local demo content')
assert.match(profileView, /demoProfileContribution/, 'profile page must avoid a bare zero-growth cold start')

console.log('demo cold-start seed guard passed')
