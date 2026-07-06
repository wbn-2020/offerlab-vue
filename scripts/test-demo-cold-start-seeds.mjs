import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const demoSeeds = readFileSync(new URL('../src/data/demoSeeds.ts', import.meta.url), 'utf8')
const questionApi = readFileSync(new URL('../src/api/question.ts', import.meta.url), 'utf8')
const growthApi = readFileSync(new URL('../src/api/growth.ts', import.meta.url), 'utf8')
const questionsView = readFileSync(new URL('../src/views/QuestionsView.vue', import.meta.url), 'utf8')
const prepView = readFileSync(new URL('../src/views/MePrepView.vue', import.meta.url), 'utf8')
const profileView = readFileSync(new URL('../src/views/MeProfileView.vue', import.meta.url), 'utf8')

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
