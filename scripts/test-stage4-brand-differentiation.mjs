import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const router = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
const header = readFileSync(new URL('../src/components/layout/AppHeader.vue', import.meta.url), 'utf8')
const explore = readFileSync(new URL('../src/views/ExploreView.vue', import.meta.url), 'utf8')
const growthProfile = readFileSync(new URL('../src/views/GrowthProfileView.vue', import.meta.url), 'utf8')
const growthReport = readFileSync(new URL('../src/views/GrowthReportView.vue', import.meta.url), 'utf8')
const certification = readFileSync(new URL('../src/views/CertificationApplyView.vue', import.meta.url), 'utf8')
const knowledge = readFileSync(new URL('../src/views/KnowledgeExploreView.vue', import.meta.url), 'utf8')
const recommendationsApi = readFileSync(new URL('../src/api/recommendations.ts', import.meta.url), 'utf8')
const growthApi = readFileSync(new URL('../src/api/growth.ts', import.meta.url), 'utf8')
const certificationApi = readFileSync(new URL('../src/api/expertCertification.ts', import.meta.url), 'utf8')
const knowledgeApi = readFileSync(new URL('../src/api/knowledge.ts', import.meta.url), 'utf8')
const types = readFileSync(new URL('../src/api/types.ts', import.meta.url), 'utf8')

for (const viewPath of [
  '../src/views/GrowthProfileView.vue',
  '../src/views/GrowthReportView.vue',
  '../src/views/KnowledgeExploreView.vue',
  '../src/views/CertificationApplyView.vue',
]) {
  assert.equal(existsSync(new URL(viewPath, import.meta.url)), true, `${viewPath} must exist`)
}

assert.match(recommendationsApi, /\/api\/v1\/recommendations\/cross-domain/, 'recommendations API must call the stage4 cross-domain endpoint')
assert.match(recommendationsApi, /export const recommendationsApi/, 'recommendations API must export recommendationsApi')
assert.match(recommendationsApi, /adaptCrossDomainRecommendation/, 'recommendations API must adapt cross-domain payloads')

assert.match(growthApi, /\/api\/v1\/growth\/profile/, 'growth API must call the profile endpoint')
assert.match(growthApi, /\/api\/v1\/growth\/report/, 'growth API must call the report endpoint')
assert.match(growthApi, /export const growthApi/, 'growth API must export growthApi')

assert.match(certificationApi, /\/api\/v1\/expert-certifications\/eligibility/, 'certification API must call the eligibility endpoint')
assert.match(certificationApi, /\/api\/v1\/expert-certifications\/applications\/me/, 'certification API must call the current-user application endpoint')
assert.match(certificationApi, /\/api\/v1\/expert-certifications\/applications/, 'certification API must call the application create endpoint')
assert.match(certificationApi, /\/revoke/, 'certification API must expose revoke support')

assert.match(knowledgeApi, /\/api\/v1\/knowledge\/relations/, 'knowledge API must call the relations endpoint')
assert.match(knowledgeApi, /export interface KnowledgeExploreQuery/, 'knowledge API must define the query contract')
assert.doesNotMatch(knowledgeApi, /\bseriesId\b/, 'knowledge API public contract must not advertise a seriesId seed')

for (const contract of [
  'CrossDomainRecommendation',
  'GrowthProfile',
  'GrowthReport',
  'ExpertCertificationEligibility',
  'ExpertCertificationApplication',
  'KnowledgeRelationGraph',
]) {
  assert.match(types, new RegExp(`export interface ${contract}\\b`), `shared types must define ${contract}`)
}

for (const [path, viewFile] of [
  ['/growth/profile', 'GrowthProfileView.vue'],
  ['/growth/report', 'GrowthReportView.vue'],
  ['/knowledge/explore', 'KnowledgeExploreView.vue'],
  ['/certification/apply', 'CertificationApplyView.vue'],
]) {
  assert.match(router, new RegExp(`path:\\s*'${path.replace(/\//g, '\\/')}'`), `router must expose ${path}`)
  assert.match(router, new RegExp(viewFile.replace('.', '\\.')), `router must lazy-load ${viewFile}`)
}

assert.match(header, /to="\/growth\/profile"/, 'AppHeader must expose the growth profile entry')
assert.match(header, /to="\/growth\/report"/, 'AppHeader must expose the growth report entry')
assert.match(header, /to="\/knowledge\/explore"/, 'AppHeader must expose the knowledge explore entry')
assert.match(header, /to="\/certification\/apply"/, 'AppHeader must expose the certification entry')
assert.match(header, /to="\/series\/workbench"/, 'AppHeader must keep the series workbench entry')

assert.match(explore, /recommendationsApi/, 'ExploreView must import the cross-domain recommendation API')
assert.match(explore, /stage4-cross-domain-panel/, 'ExploreView must render the stage4 recommendation panel')
assert.match(explore, /crossDomainStatus/, 'ExploreView must track cross-domain loading states')
assert.match(explore, /crossDomainStatus === 'unauthenticated'/, 'ExploreView must handle unauthenticated recommendation state')
assert.match(explore, /crossDomainStatus === 'failed'/, 'ExploreView must handle failed recommendation state')
assert.match(explore, /crossDomainStatus === 'degraded'/, 'ExploreView must surface degraded recommendation state')

for (const [source, apiName] of [
  [growthProfile, 'growthApi'],
  [growthReport, 'growthApi'],
  [knowledge, 'knowledgeApi'],
  [certification, 'expertCertificationApi'],
]) {
  assert.match(source, new RegExp(apiName), `view must use ${apiName}`)
  assert.match(source, /LoadingSkeleton/, 'stage4 view must handle loading state')
  assert.match(source, /EmptyState/, 'stage4 view must handle empty state')
}

assert.doesNotMatch(knowledge, /\bseriesId\b/, 'knowledge explore page must not keep a public seriesId filter')
assert.doesNotMatch(knowledge, /series_post/, 'knowledge explore page must not promise a public series_post relation')

assert.match(growthProfile, /authStore\.isLoggedIn/, 'GrowthProfileView must guard unauthenticated users')
assert.match(growthReport, /authStore\.isLoggedIn/, 'GrowthReportView must guard unauthenticated users')
assert.match(certification, /authStore\.isLoggedIn/, 'CertificationApplyView must guard unauthenticated users')

console.log('stage4 brand differentiation guard passed')
