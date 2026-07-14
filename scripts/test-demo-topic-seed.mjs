import { existsSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const governanceView = readFileSync(new URL('../src/views/AdminGovernanceView.vue', import.meta.url), 'utf8')
const initTopicSchema = readFileSync(new URL('../../offerlab-java/db/init/12_community_topics.sql', import.meta.url), 'utf8')
const initSeed = readFileSync(new URL('../../offerlab-java/db/init/99_seed.sql', import.meta.url), 'utf8')
const migrationSeed = readFileSync(new URL('../../offerlab-java/db/migration/20260614_demo_topic_seed.sql', import.meta.url), 'utf8')
const communityMigrationUrl = new URL(
  '../../offerlab-java/db/migration/20260712_demo_community_seed.sql',
  import.meta.url,
)
assert.ok(existsSync(communityMigrationUrl), 'comprehensive community topics need an existing-DB migration')
const communityMigration = readFileSync(communityMigrationUrl, 'utf8')

for (const source of [initTopicSchema, initSeed, migrationSeed, communityMigration]) {
  assert.doesNotMatch(source, /\bDROP\s+TABLE\b|\bTRUNCATE\b|\bDELETE\s+FROM\b/i, 'demo topic seed assets must be non-destructive')
}

assert.match(initTopicSchema, /CREATE TABLE IF NOT EXISTS t_community_topic/, 'fresh init must create community topic table')
assert.match(initSeed, /java-backend-roadmap/, 'fresh init seed must include Java backend demo topic')
assert.match(initSeed, /kafka-reliability/, 'fresh init seed must include Kafka demo topic')
assert.match(migrationSeed, /ON DUPLICATE KEY UPDATE/, 'existing DB seed migration must use upsert')
assert.match(migrationSeed, /elasticsearch-search-index/, 'existing DB seed migration must include search/index diagnostic topic')

for (const source of [initSeed, communityMigration]) {
  for (const slug of [
    'digital-life-open-tools',
    'career-transition-field-notes',
    'personal-finance-risk-basics',
    'learning-systems',
    'everyday-life-practice',
  ]) {
    assert.match(source, new RegExp(slug), `community seed must include topic ${slug}`)
  }
  for (const tag of ['开源工具', '职业成长', '财务安全', '风险教育', '学习方法', '生活经验']) {
    assert.match(source, new RegExp(tag), `community seed must include tag ${tag}`)
  }
  assert.match(source, /ON DUPLICATE KEY UPDATE/, 'community seed must be repeatable')
}

assert.match(governanceView, /fillDemoTopicTemplate/, 'governance page must expose a demo topic template action')
assert.match(governanceView, /createDemoTopic/, 'governance page must expose one-click demo topic creation')
assert.match(governanceView, /includeTestData: '1'/, 'governance page must link to Ops test-data mode')
assert.match(governanceView, /postApi\.createTopic\(payload\)/, 'demo topic creation must reuse the normal topic API and risk confirmation')

console.log('demo topic seed guard passed')
