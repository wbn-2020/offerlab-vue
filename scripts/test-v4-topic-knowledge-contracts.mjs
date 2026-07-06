import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')

const topicDetailApi = read('src/api/topicDetail.ts')
const operationsApi = read('src/api/operations.ts')
const packageJson = JSON.parse(read('package.json'))

assert.equal(
  packageJson.scripts['test:v4-topic-knowledge-contracts'],
  'node scripts/test-v4-topic-knowledge-contracts.mjs',
  'package.json must expose the V4 topic/knowledge contract guard without starting services.',
)

for (const contract of [
  'PublishedTopicIndex',
  'ArchivedTopicAsset',
  'toPublishedTopicIndex',
  'isTopicIncludedInOrdinarySearch',
]) {
  assert.match(topicDetailApi, new RegExp(`export\\s+(?:type|interface|const|function)\\s+${contract}\\b`),
    `topic detail API must export ${contract}`)
}

assert.match(topicDetailApi, /PublishedTopicIndex[\s\S]*status:\s*'PUBLISHED'\s*\|\s*'ARCHIVED'/,
  'PublishedTopicIndex must model searchable PUBLISHED and ARCHIVED topics only')
assert.match(topicDetailApi, /ArchivedTopicAsset[\s\S]*status:\s*'ARCHIVED'[\s\S]*displayState:\s*'archived'/,
  'ArchivedTopicAsset must make archived display state explicit')
assert.match(topicDetailApi, /isTopicIncludedInOrdinarySearch[\s\S]*status === 'OFFLINE'[\s\S]*return false/,
  'OFFLINE topics must be excluded from ordinary search')
assert.match(topicDetailApi, /toPublishedTopicIndex[\s\S]*status === 'ARCHIVED'[\s\S]*displayState:\s*'archived'/,
  'ARCHIVED topics must remain searchable with archived display metadata')
assert.doesNotMatch(topicDetailApi, /toPublishedTopicIndex[\s\S]*fallback-demo[\s\S]*candidate/i,
  'fallback/demo topic assets must not become topic candidates')

for (const contract of [
  'TopicContentGap',
  'SearchTopicGap',
  'SearchContentGap',
  'MergedContentGap',
  'KnowledgeEntryQuery',
  'SearchAssetMapping',
  'mergeContentGaps',
  'canDispatchMergedContentGap',
  'toSearchAssetMapping',
  'createKnowledgeEntryQuery',
]) {
  assert.match(operationsApi, new RegExp(`export\\s+(?:type|interface|const|function)\\s+${contract}\\b`),
    `operations API must export ${contract}`)
}

assert.match(operationsApi, /MergedContentGap[\s\S]*readonly sourceRefs/,
  'MergedContentGap must be read-only and preserve sourceRefs')
assert.match(operationsApi, /mergeContentGaps[\s\S]*sourceRefs:\s*\[[\s\S]*\.sourceRef[\s\S]*\]/,
  'mergeContentGaps must keep every source reference instead of overwriting origin state')
assert.match(operationsApi, /canDispatchMergedContentGap[\s\S]*fallback-demo[\s\S]*return false/,
  'fallback/demo merged gaps must be read-only and blocked from dispatch')
assert.match(operationsApi, /canDispatchMergedContentGap[\s\S]*unavailable[\s\S]*return false/,
  'unavailable merged gaps must be blocked from workbench/editor/topic-candidate dispatch')
assert.match(operationsApi, /SearchAssetMapping[\s\S]*ordinarySearchIncluded:\s*boolean/,
  'SearchAssetMapping must carry ordinary-search inclusion explicitly')
assert.match(operationsApi, /toSearchAssetMapping[\s\S]*status === 'OFFLINE'[\s\S]*ordinarySearchIncluded:\s*false/,
  'SearchAssetMapping must exclude OFFLINE assets from ordinary search')
assert.match(operationsApi, /toSearchAssetMapping[\s\S]*status === 'ARCHIVED'[\s\S]*displayState:\s*'archived'/,
  'SearchAssetMapping must keep ARCHIVED assets searchable but display archived')
assert.match(operationsApi, /KnowledgeEntryQuery[\s\S]*readonly phase:\s*'phase-5-reserved'/,
  'KnowledgeEntryQuery must be a clean phase-5 reserved object')
assert.doesNotMatch(operationsApi, /createKnowledgeEntryQuery[\s\S]*client\.(get|post|put|delete)/,
  'phase-5 knowledge entry reservation must not implement full path orchestration')

console.log('V4 topic knowledge contracts passed.')
