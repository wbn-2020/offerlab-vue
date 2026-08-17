import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const corpusUrl = new URL('./fixtures/search-evaluation-corpus-v1.json', import.meta.url)
const corpus = JSON.parse(readFileSync(corpusUrl, 'utf8'))
const groups = new Map(corpus.caseGroups.map((group) => [group.category, group.cases]))

const requireCases = (category, minimum) => {
  const cases = groups.get(category)
  assert.ok(Array.isArray(cases), `${category} case group is required`)
  assert.ok(cases.length >= minimum, `${category} requires at least ${minimum} cases`)
  return cases
}

const positive = requireCases('positive', 15)
const negative = requireCases('negative', 15)
const longTail = requireCases('chinese_long_tail', 10)
requireCases('weak_or_stop_word', 5)
requireCases('special_character', 5)
requireCases('typo', 5)
const contract = requireCases('contract_and_fallback', 10)
const allCases = [...groups.values()].flat()

assert.equal(corpus.status, 'PREPARED_NOT_EXECUTED', 'static validation must not claim controlled-environment metrics were executed')
assert.equal(corpus.qualityGates.negativeFalseRecallRate, 0)
assert.equal(corpus.qualityGates.precisionAt5, 0.8)
assert.equal(corpus.qualityGates.mustHitRecallAt10, 0.95)
assert.equal(corpus.qualityGates.esMysqlEligibilityDifferenceRate, 0.1)
assert.equal(allCases.length, 65, 'corpus must retain all required evaluation cases')
assert.equal(new Set(allCases.map((testCase) => testCase.id)).size, allCases.length, 'every corpus case needs a unique ID')

for (const testCase of [...positive, ...longTail]) {
  assert.ok(testCase.mustHitDocumentKeys?.length, `${testCase.id} needs at least one reviewed must-hit document key`)
}
for (const testCase of negative) {
  assert.equal(testCase.expectedVisibleResultCount, 0, `${testCase.id} must be an exact zero-result negative case`)
}

const mustHitDocumentKeys = new Set(allCases.flatMap((testCase) => testCase.mustHitDocumentKeys ?? []))
const anchorsByKey = new Map(corpus.documentAnchors.map((document) => [document.key, document]))
assert.equal(anchorsByKey.size, corpus.documentAnchors.length, 'every document anchor key must be unique')
assert.deepEqual(
  [...anchorsByKey.keys()].sort(),
  [...mustHitDocumentKeys].sort(),
  'every must-hit document key must have exactly one auditable anchor',
)
for (const [key, document] of anchorsByKey) {
  assert.equal(document.contentEnvironment, 'COMMUNITY', `${key} must be a COMMUNITY document`)
  assert.equal(document.resolvedPostId, null, `${key} must remain unresolved until authorized controlled-environment lookup`)
  assert.equal(document.resolutionStatus, 'PENDING_CONTROLLED_ENVIRONMENT_LOOKUP', `${key} must state its unresolved status`)
}

assert.ok(
  anchorsByKey.get('community-es-query-guide')?.contentEnvironment === 'COMMUNITY',
  'corpus must retain a legitimate COMMUNITY Elasticsearch technical document',
)
assert.ok(
  anchorsByKey.get('community-mysql-fallback-guide')?.contentEnvironment === 'COMMUNITY',
  'corpus must retain a legitimate COMMUNITY MySQL technical document',
)

const nonexistent = contract.find((testCase) => testCase.query === 'OfferLab不存在关键词xyz20260814')
assert.deepEqual(nonexistent?.executionModes, ['es', 'mysql_fallback'])
assert.equal(nonexistent?.expectedVisibleResultCount, 0)

console.log(`search evaluation corpus validated: ${allCases.length} cases, ${anchorsByKey.size} unresolved COMMUNITY anchors`)
